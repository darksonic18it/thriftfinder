import { useEffect, useRef, useState } from 'react'
import type { FC } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import {
  ChevronLeft,
  Image as ImageIcon,
  Maximize2,
  Mic,
  Minimize2,
  Send,
  SendHorizontal,
  Smile,
  Sticker,
  SquarePen,
  X,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { MOCK_CONVERSATIONS } from './mockConversations'
import type { ChatMessage, Conversation, ConversationId } from './types'
import './FloatingMessages.css'

type View = 'closed' | 'list' | 'chat'

/** Routes where the floating widget should not appear. */

const SHOW_ON_ROUTES = ['/dashboard', '/saved-items', '/my-listings']


function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : ''
  return (first + last).toUpperCase()
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
  const { isAuthenticated, loading, displayName } = useAuth()
  const { pathname } = useLocation()

  const [view, setView] = useState<View>('closed')
  const [expanded, setExpanded] = useState(false)
  const [activeId, setActiveId] = useState<ConversationId | null>(null)
  const [draft, setDraft] = useState('')
  const [threads, setThreads] = useState<Record<ConversationId, ChatMessage[]>>({})

  const pillRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)

  const conversations: Conversation[] = MOCK_CONVERSATIONS
  const active = conversations.find((c) => c.id === activeId) ?? null
  const thread = activeId ? threads[activeId] ?? [] : []

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

  if (loading || !isAuthenticated || !SHOW_ON_ROUTES.includes(pathname)) return null

  function closeAll() {
    setView('closed')
    setActiveId(null)
    setDraft('')
    setExpanded(false)
  }

  function openChat(id: ConversationId) {
    setActiveId(id)
    setDraft('')
    setView('chat')
  }

  function backToList() {
    setActiveId(null)
    setDraft('')
    setView('list')
  }

  function sendMessage() {
    const text = draft.trim()
    if (!text || !activeId) return
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      from: 'me',
      text,
      sentAt: Date.now(),
    }
    setThreads((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), message],
    }))
    setDraft('')
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
                  <ChevronLeft size={26} />
                </button>
                <Avatar
                  name={active.fullName}
                  url={active.avatarUrl}
                  className="fm-avatar--header"
                />
                <div className="fm-header__who">
                  <p className="fm-header__name">{active.fullName}</p>
                  <p className="fm-header__sub">{active.lastActive}</p>
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
                {expanded ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
              </button>
              <button
                type="button"
                className="fm-icon-btn"
                onClick={closeAll}
                aria-label="Close messages"
              >
                <X size={28} />
              </button>
            </div>
          </header>

          {/* ---------- Conversation list ---------- */}
          {view === 'list' && (
            <div className="fm-list-wrap">
              {conversations.length === 0 ? (
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
                          <span className="fm-list__name">{c.fullName}</span>
                          <span className="fm-list__sub">{c.lastActive}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Phase 2: opens a "new message" picker */}
              <button
                type="button"
                className="fm-fab"
                aria-label="New message"
                title="New message"
              >
                <SquarePen size={26} />
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
                  <p className="fm-intro__sub">@{active.username} · ThriftFinder</p>
                  <Link
                    to={`/profile/${active.userId}`}
                    className="fm-intro__btn"
                    onClick={closeAll}
                  >
                    View profile
                  </Link>
                </div>

                {thread.length === 0 ? (
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

              <div className="fm-composer">
                {/* Phase 3+: emoji picker, voice notes, photo + sticker sending */}
                <button type="button" className="fm-icon-btn" aria-label="Emoji">
                  <Smile size={28} />
                </button>
                <input
                  className="fm-composer__input"
                  type="text"
                  placeholder="Message..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  aria-label={`Message ${active.fullName}`}
                />
                {draft.trim() ? (
                  <button
                    type="button"
                    className="fm-send"
                    onClick={sendMessage}
                    aria-label="Send message"
                  >
                    <SendHorizontal size={22} />
                  </button>
                ) : (
                  <>
                    <button type="button" className="fm-icon-btn" aria-label="Voice message">
                      <Mic size={26} />
                    </button>
                    <button type="button" className="fm-icon-btn" aria-label="Send a photo">
                      <ImageIcon size={26} />
                    </button>
                    <button type="button" className="fm-icon-btn" aria-label="Stickers">
                      <Sticker size={26} />
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