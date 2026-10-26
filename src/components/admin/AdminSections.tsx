import { ScrollText, Search, ShoppingBag, User, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { useAuth } from '../../context/AuthContext'
import { useAdminAccess } from '../../hooks/useAdminAccess'
import { useAsync } from '../../hooks/useAsync'
import { supabase } from '../../lib/supabaseClient'
import type {
  ActivityEntry, AdminListing, AdminReport, AdminReservation, AdminUser,
} from '../../services/adminService'
import { adminService, friendlyAdminError } from '../../services/adminService'
import { formatTimeAgo, pesoFormat } from './adminFormat'

const PAGE_SIZE = 20
type ViewProps = { initialSearch: string }

/* ------------------------------ helpers ------------------------------ */

const listingPhotoUrl = (path: string | null) =>
  path ? supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl : null

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return v
}

function useNotice() {
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null)
  useEffect(() => {
    if (!notice) return undefined
    const t = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(t)
  }, [notice])
  const node = notice ? (
    <div className={`ad-notice${notice.error ? ' ad-notice--error' : ''}`} role="status">{notice.text}</div>
  ) : null
  return {
    node,
    ok: (text: string) => setNotice({ text }),
    fail: (e: unknown) => setNotice({ text: friendlyAdminError(e), error: true }),
  }
}

/* ------------------------------ shared UI ------------------------------ */

const Heading: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="ad-heading"><div><h1>{title}</h1><p>{subtitle}</p></div></div>
)

const SearchField: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({
  value, onChange, placeholder,
}) => (
  <label className="ad-field ad-field--search">
    <Search size={16} aria-hidden="true" />
    <input type="search" value={value} placeholder={placeholder} aria-label={placeholder}
      onChange={(e) => onChange(e.target.value)} />
    {value ? (
      <button type="button" className="ad-field__clear" aria-label="Clear search" onClick={() => onChange('')}>
        <X size={12} aria-hidden="true" />
      </button>
    ) : null}
  </label>
)

function Tabs<T extends string>({ tabs, value, onChange, count }: {
  tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void; count?: number
}) {
  return (
    <div className="ad-tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={value === t.value}
          className={`ad-tab${value === t.value ? ' is-active' : ''}`} onClick={() => onChange(t.value)}>
          {t.label}
          {value === t.value && count !== undefined ? <span className="ad-tab__count">{count}</span> : null}
        </button>
      ))}
    </div>
  )
}

const Pager: React.FC<{ page: number; total: number; onPage: (p: number) => void }> = ({ page, total, onPage }) => {
  if (total === 0) return null
  const pages = Math.ceil(total / PAGE_SIZE)
  return (
    <div className="ad-pager">
      <span>Showing {page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total}</span>
      <div className="ad-pager__buttons">
        <button type="button" className="ad-btn ad-btn--sm" disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</button>
        <span className="ad-pager__page">Page {page + 1} of {pages}</span>
        <button type="button" className="ad-btn ad-btn--sm" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  )
}

function StateRow({ cols, loading, error, count, title, hint }: {
  cols: number; loading: boolean; error: string | null; count: number; title: string; hint: string
}) {
  if (error) {
    return (
      <tr><td colSpan={cols}><div className="ad-empty" role="alert">
        <p className="ad-empty__title">Couldn&rsquo;t load this list</p>
        <p className="ad-empty__hint">{error}</p>
      </div></td></tr>
    )
  }
  if (count > 0) return null
  return (
    <tr><td colSpan={cols}><div className="ad-empty">
      {loading ? <p className="ad-empty__hint">Loading…</p> : (
        <><p className="ad-empty__title">{title}</p><p className="ad-empty__hint">{hint}</p></>
      )}
    </div></td></tr>
  )
}

const Dialog: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title, onClose, children,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="ad-dialog-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ad-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="ad-dialog__head">
          <h2>{title}</h2>
          <button type="button" className="ad-icon-btn" aria-label="Close" onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

const ReasonDialog: React.FC<{
  title: string; intro?: React.ReactNode; label?: string; confirmLabel: string
  danger?: boolean; required?: boolean; onClose: () => void
  onConfirm: (reason: string) => Promise<void>; children?: React.ReactNode
}> = ({ title, intro, label = 'Reason', confirmLabel, danger, required = true, onClose, onConfirm, children }) => {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (required && !reason.trim()) return
    setBusy(true)
    try { await onConfirm(reason.trim()) } finally { setBusy(false) }
  }
  return (
    <Dialog title={title} onClose={onClose}>
      <form onSubmit={submit}>
        {intro ? <div className="ad-dialog__intro">{intro}</div> : null}
        {children}
        <div className="ad-field-wrap">
          <label htmlFor="ad-reason">{label}{required ? ' (required)' : ''}</label>
          <textarea id="ad-reason" className="ad-textarea" rows={3} maxLength={500} value={reason}
            onChange={(e) => setReason(e.target.value)} autoFocus />
        </div>
        <div className="ad-dialog__actions">
          <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className={`ad-btn ${danger ? 'ad-btn--danger' : 'ad-btn--primary'}`}
            disabled={busy || (required && !reason.trim())}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

/* ------------------------------ Listings ------------------------------ */

export const AdminListingsView: React.FC<ViewProps> = ({ initialSearch }) => {
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [target, setTarget] = useState<AdminListing | null>(null)
  const q = useDebounced(search)
  const { node, ok, fail } = useNotice()
  const { data, loading, error, reload } = useAsync(
    () => adminService.listListings({ search: q, status, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [q, status, page])
  const rows = (data?.rows ?? []) as AdminListing[]

  const restore = async (l: AdminListing) => {
    try { await adminService.setListingStatus(l.id, 'active'); ok('Listing restored'); reload() } catch (e) { fail(e) }
  }

  return (
    <>
      <Heading title="Listings" subtitle="Review items for sale and remove anything that breaks the rules." />
      <section className="ad-card ad-list-panel">
        <div className="ad-toolbar">
          <SearchField value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder="Search listings or sellers" />
          <div className="ad-field-wrap">
            <label htmlFor="ad-listing-status">Status</label>
            <select id="ad-listing-status" className="ad-select" value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(0) }}>
              <option value="">All</option><option value="active">Active</option>
              <option value="sold">Sold</option><option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <div className="ad-table-wrap">
          <table className="ad-table ad-table--wide" aria-label="Listings">
            <thead><tr>
              <th scope="col">Image</th><th scope="col">Title</th><th scope="col">Price</th>
              <th scope="col">Seller</th><th scope="col">Status</th><th scope="col">Reports</th>
              <th scope="col">Listed</th><th scope="col"><span className="ad-sr-only">Actions</span></th>
            </tr></thead>
            <tbody>
              <StateRow cols={8} loading={loading} error={error} count={rows.length}
                title="No listings found" hint="Try a different search or filter." />
              {rows.map((l) => {
                const img = listingPhotoUrl(l.cover_path)
                return (
                  <tr key={l.id}>
                    <td><span className="ad-thumb">{img ? <img src={img} alt="" loading="lazy" /> : <ShoppingBag size={18} aria-hidden="true" />}</span></td>
                    <td><p className="ad-cell-title">{truncate(l.title, 40)}</p><p className="ad-cell-sub">{l.category} · {l.condition}</p></td>
                    <td>{pesoFormat.format(l.price)}</td>
                    <td className="ad-cell-muted">{l.seller_name ?? 'Unknown'}</td>
                    <td><span className={`ad-pill ad-pill--${l.status}`}>{l.status.charAt(0).toUpperCase() + l.status.slice(1)}</span></td>
                    <td>{Number(l.open_reports) > 0 ? <span className="ad-pill ad-pill--suspended">{l.open_reports} open</span> : <span className="ad-cell-muted">None</span>}</td>
                    <td className="ad-cell-muted">{formatTimeAgo(l.created_at)}</td>
                    <td><div className="ad-row-actions">
                      {l.status === 'active' ? <button type="button" className="ad-btn ad-btn--sm ad-btn--danger" onClick={() => setTarget(l)}>Remove</button> : null}
                      {l.status === 'archived' ? <button type="button" className="ad-btn ad-btn--sm" onClick={() => restore(l)}>Restore</button> : null}
                    </div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pager page={page} total={data?.total ?? 0} onPage={setPage} />
      </section>

      {target ? (
        <ReasonDialog title="Remove listing" danger confirmLabel="Remove listing" onClose={() => setTarget(null)}
          intro={<p>&ldquo;{target.title}&rdquo; will be archived and hidden from buyers. The seller is notified with your reason.</p>}
          onConfirm={async (reason) => {
            try { await adminService.setListingStatus(target.id, 'archived', reason); ok('Listing removed'); setTarget(null); reload() } catch (e) { fail(e) }
          }} />
      ) : null}
      {node}
    </>
  )
}

/* ------------------------------ Reports ------------------------------ */

const REPORT_TABS = [
  { value: 'pending', label: 'Pending' }, { value: 'reviewing', label: 'Reviewing' },
  { value: 'resolved', label: 'Resolved' }, { value: 'dismissed', label: 'Dismissed' }, { value: '', label: 'All' },
]

function describeTarget(r: AdminReport): { kind: string; main: string } {
  if (r.target_type === 'listing') return { kind: 'Listing', main: r.listing_title ?? 'Deleted listing' }
  if (r.target_type === 'user') return { kind: 'User', main: r.reported_user_name ?? 'Unknown user' }
  return { kind: 'Message', main: r.message_excerpt ? `“${truncate(r.message_excerpt, 60)}”` : 'Deleted message' }
}

const ReportDialog: React.FC<{
  report: AdminReport; onClose: () => void
  onSubmit: (v: { status: 'reviewing' | 'resolved' | 'dismissed'; note: string; archive: boolean }) => Promise<void>
}> = ({ report, onClose, onSubmit }) => {
  const closed = report.status === 'resolved' || report.status === 'dismissed'
  const [status, setStatus] = useState<'reviewing' | 'resolved' | 'dismissed'>(report.status === 'reviewing' ? 'resolved' : 'reviewing')
  const [note, setNote] = useState('')
  const [archive, setArchive] = useState(false)
  const [busy, setBusy] = useState(false)
  const t = describeTarget(report)
  const needsNote = status !== 'reviewing'
  const canArchive = status === 'resolved' && report.listing_id && report.listing_status === 'active'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (needsNote && !note.trim()) return
    setBusy(true)
    try { await onSubmit({ status, note: note.trim(), archive: Boolean(canArchive && archive) }) } finally { setBusy(false) }
  }

  return (
    <Dialog title="Review report" onClose={onClose}>
      <div className="ad-dialog__intro">
        <p><strong>{t.kind}:</strong> {t.main}</p>
        <p><strong>Reason:</strong> {report.reason}</p>
        {report.details ? <p><strong>Details:</strong> {report.details}</p> : null}
        <p className="ad-cell-sub">Reported by {report.reporter_name ?? 'Unknown'} · {formatTimeAgo(report.created_at)}</p>
        {closed ? (
          <p className="ad-cell-sub">
            {report.status === 'resolved' ? 'Resolved' : 'Dismissed'} by {report.reviewed_by_name ?? 'an admin'}
            {report.reviewed_at ? ` · ${fmtDate(report.reviewed_at)}` : ''}. Note: {report.resolution_note ?? '—'}
          </p>
        ) : null}
      </div>
      {closed ? (
        <div className="ad-dialog__actions"><button type="button" className="ad-btn" onClick={onClose}>Close</button></div>
      ) : (
        <form onSubmit={submit}>
          <div className="ad-field-wrap">
            <label htmlFor="ad-report-action">Action</label>
            <select id="ad-report-action" className="ad-select" value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}>
              {report.status === 'pending' ? <option value="reviewing">Mark as under review</option> : null}
              <option value="resolved">Resolve</option><option value="dismissed">Dismiss</option>
            </select>
          </div>
          <div className="ad-field-wrap">
            <label htmlFor="ad-report-note">Note{needsNote ? ' (required)' : ''}</label>
            <textarea id="ad-report-note" className="ad-textarea" rows={3} maxLength={500} value={note}
              onChange={(e) => setNote(e.target.value)} />
          </div>
          {canArchive ? (
            <label className="ad-check">
              <input type="checkbox" checked={archive} onChange={(e) => setArchive(e.target.checked)} />
              Also remove the reported listing
            </label>
          ) : null}
          <div className="ad-dialog__actions">
            <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="ad-btn ad-btn--primary" disabled={busy || (needsNote && !note.trim())}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  )
}

export const AdminReportsView: React.FC<ViewProps> = ({ initialSearch }) => {
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState('pending')
  const [page, setPage] = useState(0)
  const [target, setTarget] = useState<AdminReport | null>(null)
  const q = useDebounced(search)
  const { node, ok, fail } = useNotice()
  const { data, loading, error, reload } = useAsync(
    () => adminService.listReports({ status, search: q, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [status, q, page])
  const rows = (data?.rows ?? []) as AdminReport[]

  return (
    <>
      <Heading title="Reports" subtitle="Review what users have flagged and decide what to do." />
      <section className="ad-card ad-list-panel">
        <Tabs tabs={REPORT_TABS} value={status} count={data?.total} onChange={(v) => { setStatus(v); setPage(0) }} />
        <div className="ad-toolbar">
          <SearchField value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder="Search reports" />
        </div>
        <div className="ad-table-wrap">
          <table className="ad-table ad-table--wide" aria-label="Reports">
            <thead><tr>
              <th scope="col">Target</th><th scope="col">Reason</th><th scope="col">Reported by</th>
              <th scope="col">Status</th><th scope="col">Reported</th><th scope="col"><span className="ad-sr-only">Actions</span></th>
            </tr></thead>
            <tbody>
              <StateRow cols={6} loading={loading} error={error} count={rows.length}
                title="No reports here" hint="Nothing matches this tab or search." />
              {rows.map((r) => {
                const t = describeTarget(r)
                return (
                  <tr key={r.id}>
                    <td><p className="ad-cell-title">{truncate(t.main, 48)}</p><p className="ad-cell-sub">{t.kind}</p></td>
                    <td>{truncate(r.reason, 40)}</td>
                    <td className="ad-cell-muted">{r.reporter_name ?? 'Unknown'}</td>
                    <td><span className={`ad-pill ad-pill--${r.status}`}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span></td>
                    <td className="ad-cell-muted">{formatTimeAgo(r.created_at)}</td>
                    <td><div className="ad-row-actions">
                      <button type="button" className="ad-btn ad-btn--sm" onClick={() => setTarget(r)}>
                        {r.status === 'resolved' || r.status === 'dismissed' ? 'View' : 'Review'}
                      </button>
                    </div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pager page={page} total={data?.total ?? 0} onPage={setPage} />
      </section>

      {target ? (
        <ReportDialog report={target} onClose={() => setTarget(null)}
          onSubmit={async ({ status: next, note, archive }) => {
            try { await adminService.resolveReport(target.id, next, note, archive); ok('Report updated'); setTarget(null); reload() } catch (e) { fail(e) }
          }} />
      ) : null}
      {node}
    </>
  )
}

/* ------------------------------ Reservations ------------------------------ */

const RESERVATION_TABS = [
  { value: '', label: 'All' }, { value: 'Pending', label: 'Pending' }, { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Completed', label: 'Completed' }, { value: 'Cancelled', label: 'Cancelled' }, { value: 'Expired', label: 'Expired' },
]

export const AdminReservationsView: React.FC<ViewProps> = ({ initialSearch }) => {
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const q = useDebounced(search)
  const { data, loading, error } = useAsync(
    () => adminService.listReservations({ status, search: q, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [status, q, page])
  const rows = (data?.rows ?? []) as AdminReservation[]

  return (
    <>
      <Heading title="Reservations" subtitle="Monitor holds and bookings across the marketplace." />
      <section className="ad-card ad-list-panel">
        <Tabs tabs={RESERVATION_TABS} value={status} count={data?.total} onChange={(v) => { setStatus(v); setPage(0) }} />
        <div className="ad-toolbar">
          <SearchField value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder="Search by item, buyer, or seller" />
        </div>
        <div className="ad-table-wrap">
          <table className="ad-table ad-table--wide" aria-label="Reservations">
            <thead><tr>
              <th scope="col">Item</th><th scope="col">Buyer</th><th scope="col">Seller</th>
              <th scope="col">Status</th><th scope="col">Expires</th><th scope="col">Created</th>
            </tr></thead>
            <tbody>
              <StateRow cols={6} loading={loading} error={error} count={rows.length}
                title="No reservations found" hint="Reservations will appear here as buyers place holds." />
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><p className="ad-cell-title">{truncate(r.listing_title, 40)}</p><p className="ad-cell-sub">{pesoFormat.format(r.listing_price)}</p></td>
                  <td>{r.buyer_name ?? 'Unknown'}</td>
                  <td className="ad-cell-muted">{r.seller_name ?? 'Unknown'}</td>
                  <td>
                    <span className={`ad-pill ad-pill--${r.status.toLowerCase()}`}>{r.status}</span>
                    {r.is_overdue ? <span className="ad-pill ad-pill--suspended">Overdue</span> : null}
                  </td>
                  <td className="ad-cell-muted">{r.expires_at ? fmtDateTime(r.expires_at) : '—'}</td>
                  <td className="ad-cell-muted">{formatTimeAgo(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} total={data?.total ?? 0} onPage={setPage} />
      </section>
    </>
  )
}

/* ------------------------------ Users ------------------------------ */

type UserAction = 'warn' | 'suspend' | 'reinstate'
const USER_ACTION_COPY: Record<UserAction, { title: string; confirm: string; danger?: boolean }> = {
  warn: { title: 'Warn user', confirm: 'Send warning' },
  suspend: { title: 'Suspend user', confirm: 'Suspend', danger: true },
  reinstate: { title: 'Reinstate user', confirm: 'Reinstate' },
}

export const AdminUsersView: React.FC<ViewProps> = ({ initialSearch }) => {
  const { user: me } = useAuth()
  const { role } = useAdminAccess()
  const [search, setSearch] = useState(initialSearch)
  const [filter, setFilter] = useState<'' | 'suspended' | 'admins'>('')
  const [page, setPage] = useState(0)
  const [target, setTarget] = useState<{ user: AdminUser; action: UserAction } | null>(null)
  const [endsAt, setEndsAt] = useState('')
  const q = useDebounced(search)
  const { node, ok, fail } = useNotice()
  const { data, loading, error, reload } = useAsync(
    () => adminService.listUsers({ search: q, filter: filter || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [q, filter, page])
  const rows = (data?.rows ?? []) as AdminUser[]
  const canSuspend = role === 'admin' || role === 'super_admin'

  const open = (user: AdminUser, action: UserAction) => { setEndsAt(''); setTarget({ user, action }) }

  return (
    <>
      <Heading title="User Management" subtitle="Warn, suspend, or reinstate accounts." />
      <section className="ad-card ad-list-panel">
        <div className="ad-toolbar">
          <SearchField value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder="Search by name or email" />
          <div className="ad-field-wrap">
            <label htmlFor="ad-user-filter">Show</label>
            <select id="ad-user-filter" className="ad-select" value={filter}
              onChange={(e) => { setFilter(e.target.value as typeof filter); setPage(0) }}>
              <option value="">All users</option><option value="suspended">Suspended</option><option value="admins">Admins</option>
            </select>
          </div>
        </div>
        <div className="ad-table-wrap">
          <table className="ad-table ad-table--wide" aria-label="Users">
            <thead><tr>
              <th scope="col">Name</th><th scope="col">Role</th><th scope="col">Listings</th>
              <th scope="col">Reservations</th><th scope="col">Reports</th><th scope="col">Status</th>
              <th scope="col">Joined</th><th scope="col"><span className="ad-sr-only">Actions</span></th>
            </tr></thead>
            <tbody>
              <StateRow cols={8} loading={loading} error={error} count={rows.length}
                title="No users found" hint="Try a different search or filter." />
              {rows.map((u) => {
                const isSelf = u.id === me?.id
                const protectedAdmin = u.admin_role !== null && role !== 'super_admin'
                const locked = isSelf || protectedAdmin
                return (
                  <tr key={u.id}>
                    <td>
                      <span className="ad-person">
                        <span className="ad-person__avatar">{(u.full_name || '?').trim().charAt(0).toUpperCase()}</span>
                        <span><span className="ad-cell-title">{u.full_name || 'Unnamed user'}</span>
                          <span className="ad-cell-sub ad-cell-sub--block">{u.email}</span></span>
                      </span>
                    </td>
                    <td>{u.admin_role ? <span className="ad-pill ad-pill--buyer">{u.admin_role.replace('_', ' ')}</span> : <span className="ad-cell-muted">User</span>}</td>
                    <td>{u.listings_count}</td>
                    <td>{u.reservations_count}</td>
                    <td>{Number(u.reports_against) > 0 ? <span className="ad-pill ad-pill--pending">{u.reports_against}</span> : <span className="ad-cell-muted">0</span>}</td>
                    <td>
                      {u.is_suspended ? (
                        <><span className="ad-pill ad-pill--suspended">Suspended</span>
                          <span className="ad-cell-sub ad-cell-sub--block">{u.suspended_until ? `until ${fmtDate(u.suspended_until)}` : 'indefinitely'}</span></>
                      ) : <span className="ad-pill ad-pill--active">Active</span>}
                    </td>
                    <td className="ad-cell-muted">{formatTimeAgo(u.created_at)}</td>
                    <td><div className="ad-row-actions">
                      {locked ? <span className="ad-cell-muted">{isSelf ? 'You' : ''}</span> : (
                        <>
                          {!u.is_suspended ? <button type="button" className="ad-btn ad-btn--sm" onClick={() => open(u, 'warn')}>Warn</button> : null}
                          {!u.is_suspended && canSuspend ? <button type="button" className="ad-btn ad-btn--sm ad-btn--danger" onClick={() => open(u, 'suspend')}>Suspend</button> : null}
                          {u.is_suspended && canSuspend ? <button type="button" className="ad-btn ad-btn--sm" onClick={() => open(u, 'reinstate')}>Reinstate</button> : null}
                        </>
                      )}
                    </div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pager page={page} total={data?.total ?? 0} onPage={setPage} />
      </section>

      {target ? (
        <ReasonDialog
          title={USER_ACTION_COPY[target.action].title} danger={USER_ACTION_COPY[target.action].danger}
          confirmLabel={USER_ACTION_COPY[target.action].confirm} onClose={() => setTarget(null)}
          intro={<p>{target.user.full_name || target.user.email} will be notified with your reason.</p>}
          onConfirm={async (reason) => {
            const end = target.action === 'suspend' && endsAt ? new Date(endsAt) : null
            if (end && end.getTime() <= Date.now()) { fail(new Error('Pick a time in the future.')); return }
            try {
              await adminService.moderateUser(target.user.id, target.action, reason, end)
              ok('Done'); setTarget(null); reload()
            } catch (e) { fail(e) }
          }}>
          {target.action === 'suspend' ? (
            <div className="ad-field-wrap">
              <label htmlFor="ad-suspend-until">Suspend until (leave empty for indefinite)</label>
              <input id="ad-suspend-until" type="datetime-local" className="ad-select" value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          ) : null}
        </ReasonDialog>
      ) : null}
      {node}
    </>
  )
}

/* ------------------------------ Activity ------------------------------ */

const ACTION_LABELS: Record<string, string> = {
  listing_archived: 'removed a listing', listing_restored: 'restored a listing',
  report_reviewing: 'started reviewing a report', report_resolved: 'resolved a report',
  report_dismissed: 'dismissed a report', user_warn: 'warned a user',
  user_suspend: 'suspended a user', user_reinstate: 'reinstated a user',
}

export const AdminActivityView: React.FC<ViewProps> = ({ initialSearch }) => {
  const [search, setSearch] = useState(initialSearch)
  const [action, setAction] = useState('')
  const [page, setPage] = useState(0)
  const q = useDebounced(search)
  const { data, loading, error } = useAsync(
    () => adminService.listActivity({ action, search: q, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [action, q, page])
  const rows = (data?.rows ?? []) as ActivityEntry[]

  return (
    <>
      <Heading title="Activity Log" subtitle="Every admin action and system event, newest first." />
      <section className="ad-card ad-list-panel">
        <div className="ad-toolbar">
          <SearchField value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder="Search activity" />
          <div className="ad-field-wrap">
            <label htmlFor="ad-activity-action">Action</label>
            <select id="ad-activity-action" className="ad-select" value={action}
              onChange={(e) => { setAction(e.target.value); setPage(0) }}>
              <option value="">All actions</option>
              {Object.entries(ACTION_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>
        </div>

        {error ? (
          <div className="ad-empty" role="alert"><p className="ad-empty__title">Couldn&rsquo;t load activity</p><p className="ad-empty__hint">{error}</p></div>
        ) : rows.length === 0 ? (
          <div className="ad-empty">
            {loading ? <p className="ad-empty__hint">Loading…</p> : (
              <><p className="ad-empty__title">No activity yet</p><p className="ad-empty__hint">Admin actions will be recorded here.</p></>
            )}
          </div>
        ) : (
          <ul className="ad-activity">
            {rows.map((a) => {
              const raw = a.details?.reason ?? a.details?.note ?? a.details?.title
              return (
                <li key={a.id}>
                  <span className={`ad-activity__icon ad-activity__icon--${a.actor_type}`}>
                    {a.actor_type === 'admin' ? <User size={18} aria-hidden="true" /> : <ScrollText size={18} aria-hidden="true" />}
                  </span>
                  <div>
                    <p><strong>{a.actor_name ?? 'System'}</strong> {ACTION_LABELS[a.action] ?? a.action.replace(/_/g, ' ')}</p>
                    {raw ? <p className="ad-cell-sub">{truncate(String(raw), 120)}</p> : null}
                  </div>
                  <time dateTime={a.created_at}>{formatTimeAgo(a.created_at)}</time>
                </li>
              )
            })}
          </ul>
        )}
        <Pager page={page} total={data?.total ?? 0} onPage={setPage} />
      </section>
    </>
  )
}