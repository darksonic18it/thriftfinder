import type { LucideIcon } from 'lucide-react'
import {
    AlertTriangle,
    ArrowLeft,
    ArrowUp,
    Bell,
    CalendarCheck,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Flag,
    Info,
    LayoutDashboard,
    ListChecks,
    LogOut,
    Menu,
    ScrollText,
    Search,
    ShieldCheck,
    ShoppingBag,
    Tag,
    User,
    Users,
    X,
} from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { formatTimeAgo, numberFormat, pesoFormat } from '../components/admin/adminFormat'
import {
    AdminActivityView,
    AdminListingsView,
    AdminReportsView,
    AdminReservationsView,
    AdminUsersView,
} from '../components/admin/AdminSections'
import BrandMark from '../components/BrandMark'
import ThemeToggle from '../components/ThemeToggle'
import { useAuth } from '../context/AuthContext'
import type {
    AdminActivityPoint,
    AdminAlertTone,
    AdminDashboardData,
    AdminListingStatus,
    AdminStat,
} from '../hooks/useAdminDashboard'
import { useAdminDashboard } from '../hooks/useAdminDashboard'

import './AdminDashboard.css'

/* ==========================================================================
   Views (which screen is showing) — kept in the URL as ?view=...
   so the browser back button and page refresh both work.
   ========================================================================== */

const VIEWS = ['overview', 'listings', 'reports', 'reservations', 'users', 'activity'] as const
type AdminView = (typeof VIEWS)[number]

function parseView(raw: string | null): AdminView {
  return (VIEWS as readonly string[]).includes(raw ?? '') ? (raw as AdminView) : 'overview'
}

interface NavItem {
  label: string
  view: AdminView
  icon: LucideIcon
}

const NAV_SECTIONS: { title: string | null; items: NavItem[] }[] = [
  { title: null, items: [{ label: 'Overview', view: 'overview', icon: LayoutDashboard }] },
  {
    title: 'Marketplace',
    items: [
      { label: 'Listings', view: 'listings', icon: Tag },
      { label: 'Reports', view: 'reports', icon: Flag },
      { label: 'Reservations', view: 'reservations', icon: CalendarCheck },
    ],
  },
  { title: 'Users', items: [{ label: 'User Management', view: 'users', icon: Users }] },
  { title: 'System', items: [{ label: 'Activity Log', view: 'activity', icon: ScrollText }] },
]

const QUICK_ACTIONS: { label: string; hint: string; view: AdminView; icon: LucideIcon }[] = [
  { label: 'Manage Listings', hint: 'Review, edit, or remove listings', view: 'listings', icon: Tag },
  { label: 'Manage Users', hint: 'View and manage user accounts', view: 'users', icon: Users },
  { label: 'Review Reports', hint: 'Check reported content', view: 'reports', icon: ListChecks },
  {
    label: 'View Reservations',
    hint: 'Monitor booking activity',
    view: 'reservations',
    icon: CalendarCheck,
  },
  {
    label: 'View Activity Log',
    hint: 'See admin actions and system events',
    view: 'activity',
    icon: ScrollText,
  },
]

type GoTo = (view: AdminView, query?: string) => void

/* ==========================================================================
   Small helpers
   ========================================================================== */

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/** Rounds the chart ceiling up so the 5 gridline steps are clean numbers. */
function niceMax(raw: number): number {
  if (raw <= 0) return 100
  const steps = [1, 2, 5]
  let magnitude = 1
  for (;;) {
    for (const s of steps) {
      const step = s * magnitude
      if (step * 5 >= raw) return step * 5
    }
    magnitude *= 10
  }
}

/** Closes a popover on outside click or Escape. */
function useDismiss<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!open) return undefined
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  return ref
}

/* ==========================================================================
   Overview pieces
   ========================================================================== */

const EmptyState: React.FC<{ title: string; hint: string }> = ({ title, hint }) => (
  <div className="ad-empty">
    <p className="ad-empty__title">{title}</p>
    <p className="ad-empty__hint">{hint}</p>
  </div>
)

const StatChange: React.FC<{ changePct: number | null }> = ({ changePct }) => {
  if (changePct === null) {
    return (
      <span className="ad-stat__change ad-stat__change--none">
        <span>&mdash;</span> vs. last 7 days
      </span>
    )
  }
  const direction = changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat'
  return (
    <span className={`ad-stat__change ad-stat__change--${direction}`}>
      {direction !== 'flat' ? <ArrowUp size={14} aria-hidden="true" /> : null}
      <span>{Math.abs(changePct)}%</span> vs. last 7 days
    </span>
  )
}

interface StatCardProps {
  label: string
  stat: AdminStat
  icon: LucideIcon
  tone: 'blue' | 'green' | 'purple' | 'amber'
  tall?: boolean
  onOpen: () => void
}

const StatCard: React.FC<StatCardProps> = ({ label, stat, icon: Icon, tone, tall, onOpen }) => (
  <button
    type="button"
    className={`ad-card ad-stat ad-stat--link${tall ? ' ad-stat--tall' : ''}`}
    onClick={onOpen}
  >
    <span className={`ad-stat__icon ad-stat__icon--${tone}`}>
      <Icon size={22} aria-hidden="true" />
    </span>
    <span className="ad-stat__body">
      <span className="ad-stat__label">{label}</span>
      <span className="ad-stat__value">{numberFormat.format(stat.value)}</span>
    </span>
    <StatChange changePct={stat.changePct} />
  </button>
)

const CHART_SERIES = [
  { key: 'newUsers', label: 'New Users', color: 'var(--ad-blue)' },
  { key: 'newListings', label: 'New Listings', color: 'var(--ad-green)' },
  { key: 'reservations', label: 'Reservations', color: 'var(--ad-purple)' },
] as const

const ActivityChart: React.FC<{ points: AdminActivityPoint[] }> = ({ points }) => {
  const W = 640
  const H = 250
  const PAD_L = 36
  const PAD_R = 14
  const PAD_T = 14
  const PAD_B = 30
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const rawMax = Math.max(0, ...points.flatMap((p) => CHART_SERIES.map((s) => p[s.key])))
  const max = niceMax(rawMax)
  const ticks = [0, 1, 2, 3, 4, 5].map((i) => (max / 5) * i)
  const hasActivity = rawMax > 0

  const x = (i: number) =>
    PAD_L + (points.length <= 1 ? innerW / 2 : (innerW * i) / (points.length - 1))
  const y = (value: number) => PAD_T + innerH - (value / max) * innerH
  const baseY = PAD_T + innerH

  return (
    <div className="ad-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={
          hasActivity
            ? 'Line chart of new users, new listings and reservations over the last 7 days'
            : 'Activity chart. No activity recorded yet.'
        }
      >
        <defs>
          {CHART_SERIES.map((s) => (
            <linearGradient key={s.key} id={`ad-fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: s.color, stopOpacity: 0.28 }} />
              <stop offset="100%" style={{ stopColor: s.color, stopOpacity: 0 }} />
            </linearGradient>
          ))}
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(tick)} y2={y(tick)} className="ad-chart__grid" />
            <text x={PAD_L - 10} y={y(tick) + 4} textAnchor="end" className="ad-chart__tick">
              {Math.round(tick)}
            </text>
          </g>
        ))}

        {points.map((p, i) => (
          <text key={p.date} x={x(i)} y={H - 8} textAnchor="middle" className="ad-chart__tick">
            {formatDayLabel(p.date)}
          </text>
        ))}

        {CHART_SERIES.map((s) => {
          const line = points.map((p, i) => `${x(i)},${y(p[s.key])}`).join(' ')
          const area =
            points.length > 1
              ? `M ${x(0)},${baseY} ${points
                  .map((p, i) => `L ${x(i)},${y(p[s.key])}`)
                  .join(' ')} L ${x(points.length - 1)},${baseY} Z`
              : ''
          return (
            <g key={s.key}>
              {area ? <path d={area} style={{ fill: `url(#ad-fill-${s.key})` }} /> : null}
              <polyline
                points={line}
                fill="none"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{ stroke: s.color }}
              />
              {points.map((p, i) => (
                <circle key={p.date} cx={x(i)} cy={y(p[s.key])} r="3.5" style={{ fill: s.color }} />
              ))}
            </g>
          )
        })}
      </svg>
      {!hasActivity ? <p className="ad-chart__empty">No activity recorded yet</p> : null}
    </div>
  )
}

const STATUS_SEGMENTS: { key: AdminListingStatus; label: string; color: string }[] = [
  { key: 'active', label: 'Active', color: 'var(--ad-green)' },
  { key: 'sold', label: 'Sold', color: 'var(--ad-amber)' },
  { key: 'archived', label: 'Archived', color: 'var(--ad-slate)' },
]

const StatusDonut: React.FC<{ counts: Record<AdminListingStatus, number> }> = ({ counts }) => {
  const R = 64
  const C = 2 * Math.PI * R
  const total = STATUS_SEGMENTS.reduce((sum, s) => sum + counts[s.key], 0)
  const visible = STATUS_SEGMENTS.filter((s) => counts[s.key] > 0).length
  const gap = visible > 1 ? 2 : 0

  let offset = 0
  const arcs = STATUS_SEGMENTS.map((s) => {
    const length = total > 0 ? (counts[s.key] / total) * C : 0
    const dash = Math.max(length - gap, 0)
    const arc = { ...s, dash, offset }
    offset += length
    return arc
  })

  return (
    <div className="ad-donut">
      <div className="ad-donut__chart">
        <svg viewBox="0 0 180 180" role="img" aria-label={`Listing status. ${total} total listings.`}>
          <g transform="rotate(-90 90 90)">
            <circle cx="90" cy="90" r={R} className="ad-donut__track" />
            {arcs.map((arc) =>
              arc.dash > 0 ? (
                <circle
                  key={arc.key}
                  cx="90"
                  cy="90"
                  r={R}
                  fill="none"
                  strokeWidth="24"
                  strokeDasharray={`${arc.dash} ${C - arc.dash}`}
                  strokeDashoffset={-arc.offset}
                  style={{ stroke: arc.color }}
                />
              ) : null,
            )}
          </g>
        </svg>
        <div className="ad-donut__center">
          <strong>{numberFormat.format(total)}</strong>
          <span>Total Listings</span>
        </div>
      </div>

      <ul className="ad-donut__legend">
        {STATUS_SEGMENTS.map((s) => {
          const count = counts[s.key]
          const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
          return (
            <li key={s.key}>
              <span className="ad-dot" style={{ background: s.color }} aria-hidden="true" />
              <div>
                <p className="ad-donut__legend-label">{s.label}</p>
                <p className="ad-donut__legend-value">
                  {numberFormat.format(count)} ({pct}%)
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const ALERT_ICONS: Record<AdminAlertTone, LucideIcon> = {
  danger: Flag,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
}

/* ==========================================================================
   Overview screen
   ========================================================================== */

const OverviewView: React.FC<{
  data: AdminDashboardData
  lastUpdated: Date | null
  goTo: GoTo
}> = ({ data, lastUpdated, goTo }) => {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const lastUpdatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'Not synced yet'

  return (
    <>
      <div className="ad-heading">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Monitor, manage, and keep ThriftFinder safe and trustworthy.</p>
        </div>
        <div className="ad-heading__meta">
          <p className="ad-heading__date">{today}</p>
          <p className="ad-heading__updated">Last updated: {lastUpdatedLabel}</p>
          <p className={`ad-status${lastUpdated ? ' is-live' : ''}`}>
            <span className="ad-dot" aria-hidden="true" />
            {lastUpdated ? 'Live data' : 'Not connected'}
          </p>
        </div>
      </div>

      <div className="ad-body">
        <div className="ad-col">
          <section className="ad-stats" aria-label="Key numbers">
            <StatCard
              label="Total Users"
              stat={data.totalUsers}
              icon={Users}
              tone="blue"
              onOpen={() => goTo('users')}
            />
            <StatCard
              label="Active Listings"
              stat={data.activeListings}
              icon={ShoppingBag}
              tone="green"
              onOpen={() => goTo('listings')}
            />
            <StatCard
              label="Total Reservations"
              stat={data.totalReservations}
              icon={CalendarDays}
              tone="purple"
              onOpen={() => goTo('reservations')}
            />
            <StatCard
              label="Pending Reports"
              stat={data.pendingReports}
              icon={Flag}
              tone="amber"
              tall
              onOpen={() => goTo('reports')}
            />
          </section>

          <div className="ad-row ad-row--chart">
            <section className="ad-card ad-panel" aria-labelledby="ad-activity-title">
              <div className="ad-panel__head">
                <h2 id="ad-activity-title">Platform Activity</h2>
                <ul className="ad-legend">
                  {CHART_SERIES.map((s) => (
                    <li key={s.key}>
                      <span className="ad-dot" style={{ background: s.color }} aria-hidden="true" />
                      {s.label}
                    </li>
                  ))}
                </ul>
              </div>
              <ActivityChart points={data.activity} />
            </section>

            <section className="ad-card ad-panel" aria-labelledby="ad-status-title">
              <div className="ad-panel__head">
                <h2 id="ad-status-title">Listing Status</h2>
              </div>
              <StatusDonut counts={data.listingStatus} />
            </section>
          </div>

          <div className="ad-row ad-row--tables">
            <section className="ad-card ad-panel" aria-labelledby="ad-listings-title">
              <div className="ad-panel__head">
                <h2 id="ad-listings-title">Recent Listings</h2>
                <button type="button" className="ad-link" onClick={() => goTo('listings')}>
                  View all
                </button>
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table" aria-label="Recent listings">
                  <thead>
                    <tr>
                      <th scope="col">Image</th>
                      <th scope="col">Title</th>
                      <th scope="col">Price</th>
                      <th scope="col">Seller</th>
                      <th scope="col">Status</th>
                      <th scope="col">Listed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentListings.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <EmptyState title="No listings yet" hint="New listings will show up here." />
                        </td>
                      </tr>
                    ) : (
                      data.recentListings.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <span className="ad-thumb">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt="" loading="lazy" />
                              ) : (
                                <ShoppingBag size={18} aria-hidden="true" />
                              )}
                            </span>
                          </td>
                          <td>
                            <p className="ad-cell-title">{item.title}</p>
                            <p className="ad-cell-sub">{item.categoryLabel}</p>
                          </td>
                          <td>{pesoFormat.format(item.price)}</td>
                          <td className="ad-cell-muted">{item.sellerHandle}</td>
                          <td>
                            <span className={`ad-pill ad-pill--${item.status}`}>
                              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                          </td>
                          <td className="ad-cell-muted">{formatTimeAgo(item.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="ad-card ad-panel" aria-labelledby="ad-users-title">
              <div className="ad-panel__head">
                <h2 id="ad-users-title">Recent Users</h2>
                <button type="button" className="ad-link" onClick={() => goTo('users')}>
                  View all
                </button>
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table" aria-label="Recent users">
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Role</th>
                      <th scope="col">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentUsers.length === 0 ? (
                      <tr>
                        <td colSpan={3}>
                          <EmptyState title="No users yet" hint="New sign-ups will show up here." />
                        </td>
                      </tr>
                    ) : (
                      data.recentUsers.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <span className="ad-person">
                              <span className="ad-person__avatar">
                                {u.avatarUrl ? (
                                  <img src={u.avatarUrl} alt="" loading="lazy" />
                                ) : (
                                  u.name.trim().charAt(0).toUpperCase()
                                )}
                              </span>
                              {u.name}
                            </span>
                          </td>
                          <td>
                            <span className={`ad-pill ad-pill--${u.role}`}>
                              {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                            </span>
                          </td>
                          <td className="ad-cell-muted">{formatTimeAgo(u.joinedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>

        <aside className="ad-rail" aria-label="Alerts and shortcuts">
          <section className="ad-card ad-panel" aria-labelledby="ad-alerts-title">
            <div className="ad-panel__head">
              <h2 id="ad-alerts-title">Recent Alerts</h2>
              <button type="button" className="ad-link" onClick={() => goTo('reports')}>
                View all
              </button>
            </div>
            {data.alerts.length === 0 ? (
              <EmptyState title="No alerts" hint="Reports and flagged activity will appear here." />
            ) : (
              <ul className="ad-alerts">
                {data.alerts.map((alert) => {
                  const Icon = ALERT_ICONS[alert.tone]
                  return (
                    <li key={alert.id}>
                      <span className={`ad-alert__icon ad-alert__icon--${alert.tone}`}>
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <div className="ad-alert__text">
                        <p className="ad-alert__title">{alert.title}</p>
                        <p className="ad-alert__desc">{alert.description}</p>
                      </div>
                      <time className="ad-alert__time" dateTime={alert.createdAt}>
                        {formatTimeAgo(alert.createdAt)}
                      </time>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="ad-card ad-panel" aria-labelledby="ad-quick-title">
            <div className="ad-panel__head">
              <h2 id="ad-quick-title">Quick Actions</h2>
            </div>
            <ul className="ad-quick">
              {QUICK_ACTIONS.map(({ label, hint, view, icon: Icon }) => (
                <li key={label}>
                  <button type="button" className="ad-quick__item" onClick={() => goTo(view)}>
                    <span className="ad-quick__icon">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="ad-quick__text">
                      <strong>{label}</strong>
                      <span>{hint}</span>
                    </span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  )
}

/* ==========================================================================
   Top bar pieces
   ========================================================================== */

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

const SEARCH_TARGETS: { label: string; view: AdminView; icon: LucideIcon }[] = [
  { label: 'Listings', view: 'listings', icon: Tag },
  { label: 'Users', view: 'users', icon: Users },
  { label: 'Reports', view: 'reports', icon: Flag },
]

const GlobalSearch: React.FC<{ onSearch: GoTo }> = ({ onSearch }) => {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const close = useCallback(() => setOpen(false), [])
  const wrapRef = useDismiss<HTMLDivElement>(open, close)
  const query = value.trim()

  // Ctrl/Cmd + K focuses the search box.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const pick = (view: AdminView) => {
    if (!query) return
    onSearch(view, query)
    setValue('')
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className="ad-search-wrap" ref={wrapRef}>
      <label className="ad-search">
        <Search size={18} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={value}
          placeholder="Search users, listings, or reports..."
          aria-label="Search users, listings, or reports"
          onChange={(event) => {
            setValue(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') pick('listings')
          }}
        />
        <kbd>{IS_MAC ? '\u2318K' : 'Ctrl K'}</kbd>
      </label>

      {open && query ? (
        <div className="ad-pop ad-pop--search" role="listbox" aria-label="Search in">
          {SEARCH_TARGETS.map(({ label, view, icon: Icon }) => (
            <button key={view} type="button" role="option" aria-selected="false" onClick={() => pick(view)}>
              <Icon size={16} aria-hidden="true" />
              <span>
                Search &ldquo;{query}&rdquo; in <strong>{label}</strong>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

const BellMenu: React.FC<{ unread: number; onViewReports: () => void }> = ({
  unread,
  onViewReports,
}) => {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss<HTMLDivElement>(open, close)

  return (
    <div className="ad-pop-wrap" ref={ref}>
      <button
        type="button"
        className="ad-icon-btn ad-bell"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={22} aria-hidden="true" />
        {unread > 0 ? <span className="ad-bell__badge">{unread > 99 ? '99+' : unread}</span> : null}
      </button>

      {open ? (
        <div className="ad-pop ad-pop--right ad-pop--notifications">
          <p className="ad-pop__title">Notifications</p>
          <EmptyState title="You&rsquo;re all caught up" hint="New alerts will appear here." />
          <button
            type="button"
            className="ad-pop__footer"
            onClick={() => {
              close()
              onViewReports()
            }}
          >
            View reports
          </button>
        </div>
      ) : null}
    </div>
  )
}

const UserMenu: React.FC<{
  name: string
  onBackToSite: () => void
  onProfile: () => void
  onLogout: () => void
}> = ({ name, onBackToSite, onProfile, onLogout }) => {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss<HTMLDivElement>(open, close)
  const initial = (name || 'A').trim().charAt(0).toUpperCase()

  const run = (action: () => void) => () => {
    close()
    action()
  }

  return (
    <div className="ad-pop-wrap" ref={ref}>
      <button
        type="button"
        className="ad-user"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="ad-user__avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="ad-user__meta">
          <strong>{name || 'Admin'}</strong>
          <span>Administrator</span>
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {open ? (
        <div className="ad-pop ad-pop--right ad-pop--menu" role="menu">
          <button type="button" role="menuitem" onClick={run(onBackToSite)}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back to ThriftFinder
          </button>
          <button type="button" role="menuitem" onClick={run(onProfile)}>
            <User size={16} aria-hidden="true" />
            My profile
          </button>
          <hr />
          <button type="button" role="menuitem" className="is-danger" onClick={run(onLogout)}>
            <LogOut size={16} aria-hidden="true" />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  )
}

/* ==========================================================================
   Page shell
   ========================================================================== */

const AdminDashboard: React.FC = () => {
  const { displayName, signOut } = useAuth()
  const navigate = useNavigate()
  const { data, lastUpdated } = useAdminDashboard()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const previousView = useRef<AdminView>(parseView(searchParams.get('view')))

  const view = parseView(searchParams.get('view'))
  const query = searchParams.get('q') ?? ''

  const goTo = useCallback<GoTo>(
    (next, nextQuery = '') => {
      const params = new URLSearchParams()
      if (next !== 'overview') params.set('view', next)
      if (nextQuery) params.set('q', nextQuery)
      setSearchParams(params)
      setSidebarOpen(false)
      window.scrollTo(0, 0)
    },
    [setSearchParams],
  )

  // Move keyboard focus to the new screen when the view changes.
  useEffect(() => {
    if (previousView.current !== view) {
      previousView.current = view
      contentRef.current?.focus({ preventScroll: true })
    }
  }, [view])

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  let screen: React.ReactNode
  switch (view) {
    case 'listings':
      screen = <AdminListingsView key={`listings-${query}`} initialSearch={query} />
      break
    case 'reports':
      screen = <AdminReportsView key={`reports-${query}`} initialSearch={query} />
      break
    case 'reservations':
      screen = <AdminReservationsView key={`reservations-${query}`} initialSearch={query} />
      break
    case 'users':
      screen = <AdminUsersView key={`users-${query}`} initialSearch={query} />
      break
    case 'activity':
      screen = <AdminActivityView key={`activity-${query}`} initialSearch={query} />
      break
    default:
      screen = <OverviewView data={data} lastUpdated={lastUpdated} goTo={goTo} />
  }

  return (
    <div className={`ad${sidebarOpen ? ' ad--nav-open' : ''}`}>
      {/* ------------------------------ Sidebar ------------------------------ */}
      <aside className="ad-sidebar" aria-label="Admin navigation">
        <div className="ad-brand">
          <BrandMark size={40} />
          <div className="ad-brand__text">
            <strong>ThriftFinder</strong>
            <span>Secondhand. First choice.</span>
          </div>
          <button
            type="button"
            className="ad-icon-btn ad-sidebar__close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="ad-nav">
          {NAV_SECTIONS.map((section) => (
            <div className="ad-nav__group" key={section.title ?? 'main'}>
              {section.title ? <p className="ad-nav__title">{section.title}</p> : null}
              {section.items.map(({ label, view: itemView, icon: Icon }) => {
                const active = view === itemView
                return (
                  <button
                    key={itemView}
                    type="button"
                    className={`ad-nav__item${active ? ' is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => goTo(itemView)}
                  >
                    <Icon size={20} aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="ad-sidebar__foot">
          <ShieldCheck size={28} aria-hidden="true" />
          <div>
            <strong>ThriftFinder Admin</strong>
            <span>v1.0.0</span>
          </div>
        </div>
      </aside>
      {sidebarOpen ? (
        <button
          type="button"
          className="ad-scrim"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/* ------------------------------ Main column -------------------------- */}
      <div className="ad-main">
        <header className="ad-topbar">
          <button
            type="button"
            className="ad-icon-btn ad-topbar__menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} aria-hidden="true" />
          </button>

          <GlobalSearch onSearch={goTo} />

          <div className="ad-topbar__right">
            <ThemeToggle />
            <BellMenu unread={data.unreadAlertCount} onViewReports={() => goTo('reports')} />
            <UserMenu
              name={displayName}
              onBackToSite={() => navigate('/dashboard')}
              onProfile={() => navigate('/profile')}
              onLogout={handleLogout}
            />
          </div>
        </header>

        <div className="ad-content" ref={contentRef} tabIndex={-1}>
          {screen}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard