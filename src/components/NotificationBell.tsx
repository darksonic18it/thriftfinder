import {
  Archive,
  ArchiveRestore,
  Bell,
  CircleCheck,
  Info,
  TriangleAlert,
  UserPlus,
} from 'lucide-react'
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

import { useNotifications, type NotificationItem } from '../hooks/useNotifications'
import type { NotificationType } from '../services/notificationService'
import './NotificationBell.css'

type Tab = 'all' | 'unread' | 'archived'

const ICONS: Record<NotificationType, React.ElementType> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: TriangleAlert,
  user: UserPlus,
}

const PANEL_MAX_WIDTH = 384
const COLLAPSED_COUNT = 6
const EXPANDED_COUNT = 50

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} min${min === 1 ? '' : 's'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hr${hr === 1 ? '' : 's'} ago`
  const day = Math.floor(hr / 24)
  if (day === 1) return 'Yesterday'
  if (day < 7) return `${day} days ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const NotificationBell: React.FC = () => {
  const navigate = useNavigate()
  const {
    items,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
    archive,
    unarchive,
  } = useNotifications()

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('all')
  const [expanded, setExpanded] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const visible = useMemo(() => {
    const list = items.filter((n) => {
      if (tab === 'archived') return n.isArchived
      if (n.isArchived) return false
      return tab === 'all' ? true : n.isUnread
    })
    return list.slice(0, expanded ? EXPANDED_COUNT : COLLAPSED_COUNT)
  }, [items, tab, expanded])

  const totalInTab = useMemo(
    () =>
      items.filter((n) =>
        tab === 'archived' ? n.isArchived : !n.isArchived && (tab === 'all' || n.isUnread)
      ).length,
    [items, tab]
  )

  // The navbar uses transform/backdrop-filter, which would trap a fixed
  // child, so the panel is portalled to <body> and positioned by hand.
  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.min(PANEL_MAX_WIDTH, window.innerWidth - 24)
    const centered = rect.left + rect.width / 2 - width / 2
    const left = Math.min(Math.max(12, centered), window.innerWidth - width - 12)
    setPos({ top: rect.bottom + 10, left, width })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open, place])

  // Close on outside click, Escape, or page scroll (navbar hides on scroll).
  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target)) return
      if (buttonRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const onScroll = () => setOpen(false)

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [open])




const toggle = () => {
  const next = !open
  setOpen(next)

  if (next) {
    void refresh()
    void markAllRead()
  }
}




  const openItem = (n: NotificationItem) => {
    markRead(n.id)
    setOpen(false)
    // Keep the dashboard navbar on the listing page (see AppShell in App.tsx).
    navigate(n.href, { state: { from: '/dashboard' } })
  }

  const emptyText =
    tab === 'unread'
      ? 'No unread notifications'
      : tab === 'archived'
        ? 'Your archive is empty'
        : 'No activity yet'

  const badge = unreadCount > 9 ? '9+' : String(unreadCount)

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`app-navbar-icon-btn app-navbar-icon-btn--bell ${open ? 'app-navbar-icon-btn--active' : ''}`}
        onClick={toggle}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif-badge" aria-hidden="true">
            {badge}
          </span>
        )}
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              className="notif-panel"
              role="dialog"
              aria-label="Activity feed"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              <div className="notif-header">
                <h2 className="notif-title">Activity Feed</h2>
                <button
                  type="button"
                  className="notif-btn notif-btn--secondary"
                  onClick={() => setExpanded((v) => !v)}
                  disabled={totalInTab <= COLLAPSED_COUNT && !expanded}
                >
                  {expanded ? 'Show less' : 'See All'}
                </button>
              </div>

              <div className="notif-tabs-wrap">
                <div className="notif-tabs" role="tablist">
                  {(['all', 'unread', 'archived'] as Tab[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      aria-selected={tab === t}
                      data-active={tab === t}
                      className="notif-tab"
                      onClick={() => setTab(t)}
                    >
                      {t === 'all' ? 'All' : t === 'unread' ? 'Unread' : 'Archived'}
                      {t === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`notif-scroll ${expanded ? 'notif-scroll--expanded' : ''}`}>
                {error && items.length === 0 ? (
                  <div className="notif-empty">
                    <TriangleAlert size={40} aria-hidden="true" />
                    <p>{error}</p>
                    <button
                      type="button"
                      className="notif-btn notif-btn--secondary"
                      onClick={() => void refresh()}
                    >
                      Try again
                    </button>
                  </div>
                ) : visible.length === 0 ? (
                  <div className="notif-empty">
                    {tab === 'archived' ? (
                      <Archive size={40} aria-hidden="true" />
                    ) : (
                      <Bell size={40} aria-hidden="true" />
                    )}
                    <p>{loading ? 'Loading…' : emptyText}</p>
                  </div>
                ) : (
                  <ul className="notif-list">
                    {visible.map((n) => {
                      const Icon = ICONS[n.type]
                      return (
                        <li key={n.id} className="notif-row">
                          <button
                            type="button"
                            className="notif-row-main"
                            onClick={() => openItem(n)}
                          >
                            <span className="notif-icon-wrap">
                              <span className={`notif-icon notif-icon--${n.type}`}>
                                <Icon size={20} aria-hidden="true" />
                              </span>
                              {n.isUnread && <span className="notif-unread-dot" aria-label="Unread" />}
                            </span>
                            <span className="notif-body">
                              <span className="notif-body-top">
                                <span
                                  className={`notif-row-title ${n.isUnread ? 'notif-row-title--unread' : ''}`}
                                >
                                  {n.title}
                                </span>
                                <span className="notif-time">{timeAgo(n.createdAt)}</span>
                              </span>
                              <span className="notif-desc">{n.description}</span>
                            </span>
                          </button>

                          <button
                            type="button"
                            className="notif-row-action"
                            aria-label={n.isArchived ? 'Restore notification' : 'Archive notification'}
                            title={n.isArchived ? 'Restore' : 'Archive'}
                            onClick={() => (n.isArchived ? unarchive(n.id) : archive(n.id))}
                          >
                            {n.isArchived ? (
                              <ArchiveRestore size={16} aria-hidden="true" />
                            ) : (
                              <Archive size={16} aria-hidden="true" />
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className="notif-footer">
                <button
                  type="button"
                  className="notif-btn notif-btn--ghost"
                  onClick={markAllRead}
                  disabled={unreadCount === 0}
                >
                  Mark all as read
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}

export default NotificationBell