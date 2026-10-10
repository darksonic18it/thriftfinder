import { describeError } from '../lib/listingMappers'
import { supabase } from '../lib/supabaseClient'
import type {
    MessageRow,
    MyConversationRow,
    ServiceResult,
    UUID,
} from '../types/database'

/**
 * Messaging service — conversations (one thread per listing/buyer/seller)
 * and the messages inside them.
 *
 * What the DATABASE owns (see 2026-10-10_messaging.sql) and this file
 * therefore does NOT try to enforce:
 *   * threads are only created by start_conversation()
 *   * only the two participants can read or send
 *   * "email must be verified" (RLS + RPC)
 *    *   * message deletion is controlled by RLS:
 *       - delete for me uses message_hidden_for
 *       - delete for everyone is restricted to the sender
 *   * new messages start unread; read status changes via mark_conversation_read()
 */

/** Window event other components dispatch to open the floating Messages widget. */
export const OPEN_MESSAGES_EVENT = 'thriftfinder:open-messages'

export interface OpenMessagesDetail {
  conversationId: UUID
}

/** Ask the floating Messages widget to open a specific thread. */
export function openMessagesWidget(conversationId: UUID): void {
  window.dispatchEvent(
    new CustomEvent<OpenMessagesDetail>(OPEN_MESSAGES_EVENT, { detail: { conversationId } })
  )
}

const MESSAGE_COLUMNS =
  'id, conversation_id, sender_id, content, is_read, created_at, updated_at'

export const MESSAGE_MAX_LENGTH = 2000

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function isMissingRelation(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42883' ||
    error.code === '42P01' ||
    /does not exist|could not find the function|relation .* does not exist/i.test(
      error.message ?? ''
    )
  )
}

/** Messages raised by our own SQL rules are already written for humans. */
function translateError(
  error: { code?: string; message?: string },
  fallback: string
): { message: string; code?: string } {
  const raw = error.message ?? ''
  if (
    error.code === 'P0001' &&
    /sign in|verify your email|no longer available|only message buyers|choose a buyer|not part of/i.test(raw)
  ) {
    return { message: raw, code: error.code }
  }
  if (/messages_content_length/i.test(raw)) {
    return {
      message: `Messages must be 1 to ${MESSAGE_MAX_LENGTH} characters.`,
      code: error.code,
    }
  }
  if (isMissingRelation(error)) {
    return { message: 'Messaging is not available yet.', code: error.code }
  }
  return describeError(error, fallback)
}

export const messageService = {
  // -------------------------------------------------------------------
  // THREADS
  // -------------------------------------------------------------------
  /**
   * Find or create the thread for a listing and return its id.
   * Buyers call it with just the listing id. A seller passes the buyer id
   * (the buyer must have reserved that listing).
   */
  async startConversation(listingId: UUID, buyerId?: UUID): Promise<ServiceResult<UUID>> {
    const { data, error } = await supabase.rpc('start_conversation', {
      p_listing_id: listingId,
      p_buyer_id: buyerId ?? null,
    })

    if (error) {
      console.error('[messageService.startConversation]', error)
      return { data: null, error: translateError(error, 'Could not start the conversation.') }
    }
    if (typeof data !== 'string') {
      return { data: null, error: { message: 'Could not start the conversation.' } }
    }
    return { data, error: null }
  },

  /**
   * The signed-in buyer's most recent existing thread with this seller, or
   * null. Used by the profile "Message" button when the seller currently has
   * no active listing to start a new thread about.
   */
  async findThreadWithSeller(sellerId: UUID): Promise<ServiceResult<UUID | null>> {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return { data: null, error: { message: 'Sign in to send messages.' } }

    const { data, error } = await supabase
      .from('conversations')
      .select('id')
      .eq('buyer_id', auth.user.id)
      .eq('seller_id', sellerId)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (error) {
      if (isMissingRelation(error)) return { data: null, error: translateError(error, '') }
      console.error('[messageService.findThreadWithSeller]', error)
      return { data: null, error: describeError(error, 'Could not check your messages.') }
    }
    return { data: ((data ?? [])[0]?.id as UUID | undefined) ?? null, error: null }
  },

  /** The signed-in user's inbox, newest activity first. */
  async getMyConversations(): Promise<ServiceResult<MyConversationRow[]>> {
    const { data, error } = await supabase.rpc('get_my_conversations')

    if (error) {
      // Pre-migration database: show an empty inbox instead of an error.
      if (isMissingRelation(error)) return { data: [], error: null }
      console.error('[messageService.getMyConversations]', error)
      return { data: null, error: describeError(error, 'Could not load your messages.') }
    }

    const rows = ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      ...(r as unknown as MyConversationRow),
      unread_count: toNumber(r.unread_count),
    }))
    return { data: rows, error: null }
  },

  // -------------------------------------------------------------------
  // MESSAGES
  // -------------------------------------------------------------------
  /** Latest `limit` messages of a thread, returned oldest-first for display. */
  async getMessages(
    conversationId: UUID,
    options: { limit?: number } = {}
  ): Promise<ServiceResult<MessageRow[]>> {
    const { data, error } = await supabase
      .from('messages')
      .select(MESSAGE_COLUMNS)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(options.limit ?? 100)

    if (error) {
      console.error('[messageService.getMessages]', error)
      return { data: null, error: describeError(error, 'Could not load this conversation.') }
    }
    return { data: ((data ?? []) as MessageRow[]).reverse(), error: null }
  },

    /**
   * Hide a message only for the signed-in user.
   * Duplicate hides are treated as success.
   */
  async deleteMessageForMe(
    messageId: UUID
  ): Promise<ServiceResult<null>> {
    const { data: auth } = await supabase.auth.getUser()

    if (!auth.user) {
      return {
        data: null,
        error: { message: 'Sign in to delete messages.' },
      }
    }

    const { error } = await supabase
      .from('message_hidden_for')
      .insert({
        message_id: messageId,
        user_id: auth.user.id,
      })

    // The message was already hidden for this user.
    if (error?.code === '23505') {
      return { data: null, error: null }
    }

    if (error) {
      console.error('[messageService.deleteMessageForMe]', error)
      return {
        data: null,
        error: {
          message: 'Could not delete this message for you.',
          code: error.code,
        },
      }
    }

    return { data: null, error: null }
  },

  /**
   * Permanently delete a message.
   * Supabase RLS must restrict this operation to the sender.
   */
  async deleteMessageForEveryone(
    messageId: UUID
  ): Promise<ServiceResult<null>> {
    const { data: auth } = await supabase.auth.getUser()

    if (!auth.user) {
      return {
        data: null,
        error: { message: 'Sign in to delete messages.' },
      }
    }

    const { data, error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', auth.user.id)
      .select('id')

    if (error) {
      console.error('[messageService.deleteMessageForEveryone]', error)
      return {
        data: null,
        error: {
          message: 'Could not delete this message for everyone.',
          code: error.code,
        },
      }
    }

    // RLS can make a forbidden delete affect zero rows without an error.
    if (!data || data.length === 0) {
      return {
        data: null,
        error: {
          message: 'Message not found or you are not allowed to delete it.',
        },
      }
    }

    return { data: null, error: null }
  },

  async sendMessage(conversationId: UUID, content: string): Promise<ServiceResult<MessageRow>> {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) {
      return { data: null, error: { message: 'Sign in to send messages.' } }
    }

    const text = content.trim()
    if (text.length === 0) {
      return { data: null, error: { message: 'Write a message first.' } }
    }
    if (text.length > MESSAGE_MAX_LENGTH) {
      return {
        data: null,
        error: { message: `Messages must be ${MESSAGE_MAX_LENGTH} characters or fewer.` },
      }
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: auth.user.id,
        content: text,
      })
      .select(MESSAGE_COLUMNS)
      .single()

    if (error) {
      console.error('[messageService.sendMessage]', error)
      return { data: null, error: translateError(error, 'Could not send your message.') }
    }
    return { data: data as MessageRow, error: null }
  },

  /** Mark everything the other person sent in this thread as read. */
  async markConversationRead(conversationId: UUID): Promise<void> {
    const { error } = await supabase.rpc('mark_conversation_read', {
      p_conversation_id: conversationId,
    })
    if (error && !isMissingRelation(error)) {
      console.error('[messageService.markConversationRead]', error)
    }
  },

  /** Unread messages across all threads (0 when signed out or pre-migration). */
  async getUnreadCount(): Promise<number> {
    const { data, error } = await supabase.rpc('get_unread_message_count')
    if (error) {
      if (!isMissingRelation(error)) console.error('[messageService.getUnreadCount]', error)
      return 0
    }
    return toNumber(data)
  },

  // -------------------------------------------------------------------
  // REALTIME
  // -------------------------------------------------------------------
  /**
   * Call `onInsert` for every new message the signed-in user may read.
   * Needs the `messages` table in the supabase_realtime publication (the
   * migration adds it). RLS applies, so we only hear about our own threads.
   * Returns an unsubscribe function.
   */
  subscribeToMessages(onInsert: (message: MessageRow) => void): () => void {
    const channel = supabase
      .channel(`messages:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => onInsert(payload.new as MessageRow)
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  },
}