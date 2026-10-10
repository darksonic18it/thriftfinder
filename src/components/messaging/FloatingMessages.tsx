
import {
  ChevronLeft,
  Image as ImageIcon,
  Maximize2,
  Mic,
  Minimize2,
  MoreHorizontal,
  Send,
  SendHorizontal,
  Smile,
  SquarePen,
  Trash2,
  X,
} from 'lucide-react'
import type { FC } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'

import {
  MESSAGE_MAX_LENGTH,
  messageService,
  OPEN_MESSAGES_EVENT,
  openMessagesWidget,
  type OpenMessagesDetail,
} from '../../services/messageService'

import type { MessageRow, MyConversationRow } from '../../types/database'
import './FloatingMessages.css'
import type { ChatMessage, Conversation, ConversationId } from './types'

type View = 'closed' | 'list' | 'chat'
type DeleteMode = 'me' | 'everyone'

type DeletionConfirmation = {
  message: ChatMessage
  mode: DeleteMode
}

type ChatMessageWithRead = ChatMessage & {
  isRead?: boolean
}

const SHOW_ON_ROUTES = ['/dashboard']
const POLL_MS = 30_000

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'

  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : ''

  return (first + last).toUpperCase()
}

function toConversation(row: MyConversationRow): Conversation {
  return {
    id: row.conversation_id,
    userId: row.other_user_id,
    fullName: row.other_user_name?.trim() || 'ThriftFinder user',
    avatarUrl: null,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    lastMessage: row.last_message,
    unreadCount: row.unread_count,
  }
}

function toChatMessage(row: MessageRow, myId: string): ChatMessage {
  return {
    id: row.id,
    from: row.sender_id === myId ? 'me' : 'them',
    text: row.content,
    sentAt: Date.parse(row.created_at),
    isRead: row.is_read,
  } as ChatMessage
}

const Avatar: FC<{
  name: string
  url?: string | null
  className?: string
}> = ({ name, url, className = '' }) => (
  <span className={`fm-avatar ${className}`} aria-hidden="true">
    {url ? <img src={url} alt="" /> : <span>{initialsOf(name)}</span>}
  </span>
)

const FloatingMessages: FC = () => {
  const { isAuthenticated, loading, displayName, user } = useAuth()
  const userId = user?.id ?? null

  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const [view, setView] = useState<View>('closed')
  const [expanded, setExpanded] = useState(false)
  const [activeId, setActiveId] = useState<ConversationId | null>(null)
  const [draft, setDraft] = useState('')
  const [threads, setThreads] = useState<
    Record<ConversationId, ChatMessage[]>
  >({})
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [forced, setForced] = useState(false)

  const [messageMenuId, setMessageMenuId] = useState<string | null>(null)
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(
    null
  )
  const [deleteConfirmation, setDeleteConfirmation] =
    useState<DeletionConfirmation | null>(null)

  const pillRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)
  const activeIdRef = useRef<ConversationId | null>(null)

  activeIdRef.current = activeId

  const active = conversations.find((c) => c.id === activeId) ?? null
  const thread = activeId ? threads[activeId] ?? [] : []
  const unreadTotal = conversations.reduce((n, c) => n + c.unreadCount, 0)

  const loadConversations = useCallback(async () => {
    const { data, error } = await messageService.getMyConversations()

    if (data) {
      setConversations(data.map(toConversation))
    } else if (error) {
      console.error('[FloatingMessages.loadConversations]', error.message)
    }

    setListLoading(false)
  }, [])

  const loadThread = useCallback(
    async (id: ConversationId, showSpinner: boolean) => {
      if (!userId) return

      if (showSpinner) setThreadLoading(true)

      const { data, error } = await messageService.getMessages(id)

      if (showSpinner) setThreadLoading(false)

      if (error || !data) {
        if (error && showSpinner) setSendError(error.message)
        return
      }

      setThreads((prev) => ({
        ...prev,
        [id]: data.map((message) => toChatMessage(message, userId)),
      }))

      // Opening a thread marks incoming messages as read.
      if (data.some((message) => message.sender_id !== userId && !message.is_read)) {
        await messageService.markConversationRead(id)
        void loadConversations()
      }
    },
    [userId, loadConversations]
  )

  // Load conversations and keep them updated through realtime + polling.
  useEffect(() => {
    if (loading || !isAuthenticated || !userId) return

    void loadConversations()

    let timer: number | null = null

    const refresh = () => {
      if (timer !== null) window.clearTimeout(timer)

      timer = window.setTimeout(() => {
        timer = null
        void loadConversations()

        const openId = activeIdRef.current
        if (openId) void loadThread(openId, false)
      }, 250)
    }

    const unsubscribe = messageService.subscribeToMessages(refresh)

    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, POLL_MS)

    return () => {
      window.clearInterval(poll)
      if (timer !== null) window.clearTimeout(timer)
      unsubscribe()
    }
  }, [loading, isAuthenticated, userId, loadConversations, loadThread])

  // Allow other pages to open a specific conversation.
  useEffect(() => {
    const onOpen = (event: Event) => {
      const id = (event as CustomEvent<OpenMessagesDetail>).detail
        ?.conversationId

      if (!id) return

      void (async () => {
        await loadConversations()
        setForced(true)
        setExpanded(false)
        setDraft('')
        setSendError(null)
        setDeleteConfirmation(null)
        setMessageMenuId(null)
        setActiveId(id)
        setView('chat')
        void loadThread(id, true)
      })()
    }

    window.addEventListener(OPEN_MESSAGES_EVENT, onOpen)

    return () => window.removeEventListener(OPEN_MESSAGES_EVENT, onOpen)
  }, [loadConversations, loadThread])

  // Open a conversation requested by a notification link.
useEffect(() => {
  const params = new URLSearchParams(search)
  const conversationId = params.get('conversationId')

  if (!conversationId) return

  // The existing widget listener opens the requested conversation.
  openMessagesWidget(conversationId)

  // Remove the query parameter so the same notification can be
  // clicked again later to reopen the conversation.
  navigate('/dashboard', {
    replace: true,
    state: { from: '/dashboard' },
  })
}, [search, navigate])

  // Escape dismisses the confirmation first, instead of closing the widget.
  useEffect(() => {
    if (view === 'closed') return

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return

      if (deleteConfirmation) {
        setDeleteConfirmation(null)
        return
      }

      if (messageMenuId) {
        setMessageMenuId(null)
        return
      }

      closeAll()
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [view, deleteConfirmation, messageMenuId])

  // Move focus into the panel when it opens, and back to the pill when it closes.
  useEffect(() => {
    if (view !== 'closed' && !wasOpen.current) panelRef.current?.focus()
    if (view === 'closed' && wasOpen.current) pillRef.current?.focus()

    wasOpen.current = view !== 'closed'
  }, [view])

  // Keep the newest message visible.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [thread.length, view])

  function closeAll() {
    setView('closed')
    setActiveId(null)
    setDraft('')
    setExpanded(false)
    setSendError(null)
    setMessageMenuId(null)
    setDeleteConfirmation(null)
    setForced(false)
  }

  function openChat(id: ConversationId) {
    setActiveId(id)
    setDraft('')
    setSendError(null)
    setMessageMenuId(null)
    setDeleteConfirmation(null)
    setView('chat')
    void loadThread(id, true)
  }

  function backToList() {
    setActiveId(null)
    setDraft('')
    setSendError(null)
    setMessageMenuId(null)
    setDeleteConfirmation(null)
    setView('list')
    void loadConversations()
  }

  async function sendMessage() {
    const text = draft.trim()

    if (!text || !activeId || !userId || sending) return

    const conversationId = activeId

    setSending(true)
    setSendError(null)

    try {
      const { data, error } = await messageService.sendMessage(
        conversationId,
        text
      )

      if (error || !data) {
        setSendError(error?.message ?? 'Could not send your message.')
        return
      }

      // Avoid duplicates if realtime refresh already added this message.
      setThreads((prev) => {
        const current = prev[conversationId] ?? []

        if (current.some((message) => message.id === data.id)) return prev

        return {
          ...prev,
          [conversationId]: [
            ...current,
            toChatMessage(data, userId),
          ],
        }
      })

      setDraft('')
      void loadConversations()
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : 'Could not send your message.'
      )
    } finally {
      setSending(false)
    }
  }

  // First click opens our custom confirmation modal. No browser confirm popup.
  async function deleteMessage(
    message: ChatMessage,
    mode: DeleteMode,
    confirmed = false
  ) {
    if (!activeId || !userId || message.from !== 'me') return
    if (deletingMessageId) return

    if (!confirmed) {
      setMessageMenuId(null)
      setDeleteConfirmation({ message, mode })
      return
    }

    const conversationId = activeId

    setDeleteConfirmation(null)
    setMessageMenuId(null)
    setDeletingMessageId(message.id)
    setSendError(null)

    try {
      const result =
        mode === 'me'
          ? await messageService.deleteMessageForMe(message.id)
          : await messageService.deleteMessageForEveryone(message.id)

      if (result.error) {
        setSendError(result.error.message)
        return
      }

      setThreads((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] ?? []).filter(
          (item) => item.id !== message.id
        ),
      }))

      await loadThread(conversationId, false)
      await loadConversations()
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : 'Could not delete this message.'
      )
    } finally {
      setDeletingMessageId(null)
    }
  }

  if (
    loading ||
    !isAuthenticated ||
    (!SHOW_ON_ROUTES.includes(pathname) && !forced)
  ) {
    return null
  }

  const widget = (
    <div className="fm-root">
      {view === 'closed' ? (
        <button
          ref={pillRef}
          type="button"
          className="fm-pill"
          onClick={() => setView('list')}
          aria-haspopup="dialog"
          aria-expanded="false"
        >
          <Send className="fm-pill__icon" aria-hidden="true" />
          <span className="fm-pill__label">Messages</span>

          {unreadTotal > 0 && (
            <span className="fm-badge" aria-label={`${unreadTotal} unread`}>
              {unreadTotal > 99 ? '99+' : unreadTotal}
            </span>
          )}

          <Avatar name={displayName} className="fm-avatar--pill" />
        </button>
      ) : (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Messages"
          className={`fm-panel${expanded ? ' fm-panel--expanded' : ''}`}
        >
          <header className="fm-header">
            {view === 'chat' && active ? (
              <>
                <button
                  type="button"
                  className="fm-icon-btn"
                  onClick={backToList}
                  aria-label="Back to messages"
                >
                  <ChevronLeft size={22} />
                </button>

                <Avatar
                  name={active.fullName}
                  url={active.avatarUrl}
                  className="fm-avatar--header"
                />

                <div className="fm-header__who">
                  <p className="fm-header__name">{active.fullName}</p>
                  <p className="fm-header__sub">Re: {active.listingTitle}</p>
                </div>
              </>
            ) : (
              <h2 className="fm-header__title">Messages</h2>
            )}

            <div className="fm-header__actions">
              <button
                type="button"
                className="fm-icon-btn"
                onClick={() => setExpanded((value) => !value)}
                aria-label={expanded ? 'Shrink messages' : 'Expand messages'}
              >
                {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>

              <button
                type="button"
                className="fm-icon-btn"
                onClick={closeAll}
                aria-label="Close messages"
              >
                <X size={22} />
              </button>
            </div>
          </header>

          {/* Conversation list */}
          {view === 'list' && (
            <div className="fm-list-wrap">
              {listLoading ? (
                <p className="fm-empty">Loading messages…</p>
              ) : conversations.length === 0 ? (
                <p className="fm-empty">
                  No messages yet. Open a listing and message the seller to start.
                </p>
              ) : (
                <ul className="fm-list">
                  {conversations.map((conversation) => (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        className="fm-list__item"
                        onClick={() => openChat(conversation.id)}
                      >
                        <Avatar
                          name={conversation.fullName}
                          url={conversation.avatarUrl}
                          className="fm-avatar--list"
                        />

                        <span className="fm-list__text">
                          <span
                            className={`fm-list__name${
                              conversation.unreadCount > 0
                                ? ' fm-list__name--unread'
                                : ''
                            }`}
                          >
                            {conversation.fullName}
                          </span>

                          <span className="fm-list__listing">
                            Re: {conversation.listingTitle}
                          </span>

                          <span className="fm-list__sub fm-list__preview">
                            {conversation.lastMessage ?? 'No messages yet'}
                          </span>
                        </span>

                        {conversation.unreadCount > 0 && (
                          <span
                            className="fm-badge fm-badge--list"
                            aria-label={`${conversation.unreadCount} unread`}
                          >
                            {conversation.unreadCount > 99
                              ? '99+'
                              : conversation.unreadCount}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                className="fm-fab"
                aria-label="New message"
                title="Open a listing and tap Message seller to start a chat"
                disabled
              >
                <SquarePen size={22} />
              </button>
            </div>
          )}

          {/* Active conversation */}
          {view === 'chat' && active && (
            <>
              <div className="fm-thread">
                <div className="fm-intro">
                  <Avatar
                    name={active.fullName}
                    url={active.avatarUrl}
                    className="fm-avatar--intro"
                  />

                  <p className="fm-intro__name">{active.fullName}</p>

                  <p className="fm-intro__sub">
                    About “{active.listingTitle}” · ThriftFinder
                  </p>

                  <Link
                    to={`/profile/${active.userId}`}
                    className="fm-intro__btn"
                    onClick={closeAll}
                  >
                    View profile
                  </Link>

                  <Link
                    to={`/listing/${active.listingId}`}
                    className="fm-intro__btn"
                    onClick={closeAll}
                  >
                    View listing
                  </Link>
                </div>

                {threadLoading && thread.length === 0 ? (
                  <p className="fm-hint">Loading conversation…</p>
                ) : thread.length === 0 ? (
                  <p className="fm-hint">
                    Say hi! Ask about an item or set up a meetup.
                  </p>
                ) : (
                  <ul className="fm-messages">
                    {thread.map((message) => {
                      const ownMessage = message.from === 'me'
                      const messageWithRead = message as ChatMessageWithRead
                      const isDeleting = deletingMessageId === message.id

                      return (
                        <li
                          key={message.id}
                          className={`fm-message-row ${
                            ownMessage
                              ? 'fm-message-row--me'
                              : 'fm-message-row--them'
                          }`}
                        >
                          <div className="fm-bubble-wrap">
                            <div
                              className={`fm-bubble ${
                                ownMessage
                                  ? 'fm-bubble--me'
                                  : 'fm-bubble--them'
                              }`}
                            >
                              {message.text}
                            </div>

                            {ownMessage && (
                              <div className="fm-message-actions">
                                <button
                                  type="button"
                                  className="fm-message-menu-trigger"
                                  aria-label="Message actions"
                                  aria-haspopup="menu"
                                  aria-expanded={messageMenuId === message.id}
                                  onClick={() =>
                                    setMessageMenuId((current) =>
                                      current === message.id ? null : message.id
                                    )
                                  }
                                  disabled={isDeleting}
                                >
                                  <MoreHorizontal size={17} />
                                </button>

                                {messageMenuId === message.id && (
                                  <div className="fm-message-menu" role="menu">
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() =>
                                        void deleteMessage(message, 'me')
                                      }
                                    >
                                      <Trash2 size={15} />
                                      Delete for me
                                    </button>

                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() =>
                                        void deleteMessage(message, 'everyone')
                                      }
                                    >
                                      <Trash2 size={15} />
                                      Delete for everyone
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {ownMessage && (
                            <span className="fm-message-status">
                              {isDeleting
                                ? 'Deleting…'
                                : messageWithRead.isRead
                                  ? 'Seen'
                                  : 'Sent'}
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}

                <div ref={bottomRef} />
              </div>

              {sendError && (
                <p className="fm-error" role="alert">
                  {sendError}
                </p>
              )}

              <div className="fm-composer">
                <button
                  type="button"
                  className="fm-icon-btn"
                  aria-label="Emoji"
                >
                  <Smile size={24} />
                </button>

                <input
                  className="fm-composer__input"
                  type="text"
                  placeholder="Message..."
                  value={draft}
                  maxLength={MESSAGE_MAX_LENGTH}
                  disabled={sending}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void sendMessage()
                    }
                  }}
                  aria-label={`Message ${active.fullName}`}
                />

                {draft.trim() ? (
                  <button
                    type="button"
                    className="fm-send"
                    onClick={() => void sendMessage()}
                    disabled={sending}
                    aria-label="Send message"
                  >
                    <SendHorizontal size={18} />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="fm-icon-btn"
                      aria-label="Voice message"
                    >
                      <Mic size={22} />
                    </button>

                    <button
                      type="button"
                      className="fm-icon-btn"
                      aria-label="Send a photo"
                    >
                      <ImageIcon size={22} />
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {/* Custom delete confirmation modal INSIDE the floating chat panel */}
          {deleteConfirmation && (
            <div
              className="fm-delete-overlay"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setDeleteConfirmation(null)
                }
              }}
            >
              <section
                className="fm-delete-modal"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="fm-delete-title"
                aria-describedby="fm-delete-description"
              >
                <div className="fm-delete-modal__icon">
                  <Trash2 size={23} />
                </div>

                <h3 id="fm-delete-title">
                  {deleteConfirmation.mode === 'everyone'
                    ? 'Delete for everyone?'
                    : 'Delete for me?'}
                </h3>

                <p id="fm-delete-description">
                  {deleteConfirmation.mode === 'everyone'
                    ? 'This message will be removed from the conversation for everyone. This action cannot be undone.'
                    : 'This message will be hidden from your chat only. The other person may still see it.'}
                </p>

                <div className="fm-delete-modal__preview">
                  “{deleteConfirmation.message.text}”
                </div>

                <div className="fm-delete-modal__actions">
                  <button
                    type="button"
                    className="fm-delete-modal__cancel"
                    onClick={() => setDeleteConfirmation(null)}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="fm-delete-modal__confirm"
                    disabled={deletingMessageId !== null}
                    onClick={() =>
                      void deleteMessage(
                        deleteConfirmation.message,
                        deleteConfirmation.mode,
                        true
                      )
                    }
                  >
                    <Trash2 size={16} />
                    Delete message
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  )

  // Keep the floating widget pinned to the viewport.
  return createPortal(widget, document.body)
}

export default FloatingMessages
