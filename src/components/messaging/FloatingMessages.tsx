import {
  ChevronLeft,
  Image as ImageIcon,
  Maximize2,
  Mic,
  Minimize2,
  Send,
  SendHorizontal,
  Smile,
  SquarePen,
  X,
} from 'lucide-react'
import type { FC } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import {
  MESSAGE_MAX_LENGTH,
  messageService,
  OPEN_MESSAGES_EVENT,
  type OpenMessagesDetail,
} from '../../services/messageService'
import type { MessageRow, MyConversationRow } from '../../types/database'
import './FloatingMessages.css'
import type { ChatMessage, Conversation, ConversationId } from './types'

type View = 'closed' | 'list' | 'chat'

/**
 * The only routes where the floating widget appears.
 * To show it on more pages, add them here, e.g. '/saved-items', '/my-listings'.
 */
const SHOW_ON_ROUTES = ['/dashboard']

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
  }
}

/** How often to re-check for new messages if realtime is unavailable. */
const POLL_MS = 30_000

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
  const { pathname } = useLocation()

  const [view, setView] = useState<View>('closed')
  const [expanded, setExpanded] = useState(false)
  const [activeId, setActiveId] = useState<ConversationId | null>(null)
  const [draft, setDraft] = useState('')
  const [threads, setThreads] = useState<Record<ConversationId, ChatMessage[]>>({})
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  // Set when another page asks to open a chat ("Message seller"), so the
  // widget shows up there even though it is not on SHOW_ON_ROUTES.
  const [forced, setForced] = useState(false)

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
    const { data } = await messageService.getMyConversations()
    if (data) setConversations(data.map(toConversation))
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
      setThreads((prev) => ({ ...prev, [id]: data.map((m) => toChatMessage(m, userId)) }))

      // Opening a thread marks the other person's messages as read.
      if (data.some((m) => m.sender_id !== userId && !m.is_read)) {
        await messageService.markConversationRead(id)
        void loadConversations()
      }
    },
    [userId, loadConversations]
  )

  // Load the inbox, then keep it fresh: realtime inserts + a slow poll fallback.
  useEffect(() => {
    if (loading || !isAuthenticated || !userId) return
    void loadConversations()

    let timer: number | null = null
    const refresh = () => {
      if (timer) window.clearTimeout(timer)
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
      if (timer) window.clearTimeout(timer)
      unsubscribe()
    }
  }, [loading, isAuthenticated, userId, loadConversations, loadThread])

  // Other pages (listing details, profile) ask us to open a specific thread.
  useEffect(() => {
    const onOpen = (event: Event) => {
      const id = (event as CustomEvent<OpenMessagesDetail>).detail?.conversationId
      if (!id) return
      void (async () => {
        await loadConversations()
        setForced(true)
        setExpanded(false)
        setDraft('')
        setSendError(null)
        setActiveId(id)
        setView('chat')
        void loadThread(id, true)
      })()
    }
    window.addEventListener(OPEN_MESSAGES_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_MESSAGES_EVENT, onOpen)
  }, [loadConversations, loadThread])

  // Esc closes the whole widget.
  useEffect(() => {
    if (view === 'closed') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  // Move focus into the panel when it opens, back to the pill when it closes.
  useEffect(() => {
    if (view !== 'closed' && !wasOpen.current) panelRef.current?.focus()
    if (view === 'closed' && wasOpen.current) pillRef.current?.focus()
    wasOpen.current = view !== 'closed'
  }, [view])

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [thread.length, view])

  if (loading || !isAuthenticated || (!SHOW_ON_ROUTES.includes(pathname) && !forced)) return null

  function closeAll() {
    setView('closed')
    setActiveId(null)
    setDraft('')
    setExpanded(false)
    setSendError(null)
    setForced(false)
  }

  function openChat(id: ConversationId) {
    setActiveId(id)
    setDraft('')
    setSendError(null)
    setView('chat')
    void loadThread(id, true)
  }

  function backToList() {
    setActiveId(null)
    setDraft('')
    setSendError(null)
    setView('list')
    void loadConversations()
  }

  async function sendMessage() {
    const text = draft.trim()
    if (!text || !activeId || !userId || sending) return
    const threadId = activeId
    setSending(true)
    setSendError(null)

    const { data, error } = await messageService.sendMessage(threadId, text)
    setSending(false)

    if (error || !data) {
      setSendError(error?.message ?? 'Could not send your message.')
      return
    }

    // The realtime echo may refresh the thread too, so skip duplicates by id.
    setThreads((prev) => {
      const current = prev[threadId] ?? []
      if (current.some((m) => m.id === data.id)) return prev
      return { ...prev, [threadId]: [...current, toChatMessage(data, userId)] }
    })
    setDraft('')
    void loadConversations()
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
          {unreadTotal > 0 ? (
            <span className="fm-badge" aria-label={`${unreadTotal} unread`}>
              {unreadTotal > 99 ? '99+' : unreadTotal}
            </span>
          ) : null}
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
          {/* ---------- Header ---------- */}
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
                onClick={() => setExpanded((v) => !v)}
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

          {/* ---------- Conversation list ---------- */}
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
                  {conversations.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="fm-list__item"
                        onClick={() => openChat(c.id)}
                      >
                        <Avatar
                          name={c.fullName}
                          url={c.avatarUrl}
                          className="fm-avatar--list"
                        />
                        <span className="fm-list__text">
                          <span
                            className={`fm-list__name${c.unreadCount > 0 ? ' fm-list__name--unread' : ''}`}
                          >
                            {c.fullName}
                          </span>
                          <span className="fm-list__listing">Re: {c.listingTitle}</span>
                          <span className="fm-list__sub fm-list__preview">
                            {c.lastMessage ?? 'No messages yet'}
                          </span>
                        </span>
                        {c.unreadCount > 0 ? (
                          <span className="fm-badge fm-badge--list" aria-label={`${c.unreadCount} unread`}>
                            {c.unreadCount > 99 ? '99+' : c.unreadCount}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Threads start from a listing ("Message seller"), so there is no
                  free-form "new message" picker. Kept as a disabled placeholder. */}
              <button
                type="button"
                className="fm-fab"
                aria-label="New message"
                title="Open a listing and tap “Message seller” to start a chat"
                disabled
              >
                <SquarePen size={22} />
              </button>
            </div>
          )}

          {/* ---------- Chat thread ---------- */}
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
                  <p className="fm-intro__sub">About “{active.listingTitle}” · ThriftFinder</p>
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
                  <p className="fm-hint">Say hi! Ask about an item or set up a meetup.</p>
                ) : (
                  <ul className="fm-messages">
                    {thread.map((m) => (
                      <li
                        key={m.id}
                        className={`fm-bubble ${
                          m.from === 'me' ? 'fm-bubble--me' : 'fm-bubble--them'
                        }`}
                      >
                        {m.text}
                      </li>
                    ))}
                  </ul>
                )}
                <div ref={bottomRef} />
              </div>

              {sendError ? (
                <p className="fm-error" role="alert">
                  {sendError}
                </p>
              ) : null}

              <div className="fm-composer">
                {/* Phase 3+: emoji picker, voice notes, photo sending */}
                <button type="button" className="fm-icon-btn" aria-label="Emoji">
                  <Smile size={24} />
                </button>
                <input
                  className="fm-composer__input"
                  type="text"
                  placeholder="Message..."
                  value={draft}
                  maxLength={MESSAGE_MAX_LENGTH}
                  disabled={sending}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
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
                    <button type="button" className="fm-icon-btn" aria-label="Voice message">
                      <Mic size={22} />
                    </button>
                    <button type="button" className="fm-icon-btn" aria-label="Send a photo">
                      <ImageIcon size={22} />
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )

  // Portal to <body> so no ancestor (transform, overflow, filter) can break
  // position: fixed. This is what keeps it pinned while the page scrolls.
  return createPortal(widget, document.body)
}

export default FloatingMessages