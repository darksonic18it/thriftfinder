import {
    ChevronLeft,
    ChevronRight,
    Download,
    ExternalLink,
    Search,
    Settings,
    ShieldCheck,
    ShoppingBag,
    Trash2,
    X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import React, { useId, useState } from 'react'
import { Link } from 'react-router-dom'

import type {
    AdminActivityFilters,
    AdminActivityTab,
    AdminListingFilters,
    AdminListingSort,
    AdminListingTab,
    AdminReportFilters,
    AdminReportSort,
    AdminReportTab,
    AdminReportTarget,
    AdminReservationFilters,
    AdminReservationTab,
    AdminUserFilters,
    AdminUserSort,
    AdminUserStatus,
    AdminUserTab,
} from '../../hooks/useAdminDashboard'
import {
    ADMIN_ACTIVITY_TABS,
    ADMIN_LISTING_TABS,
    ADMIN_PAGE_SIZE,
    ADMIN_REPORT_TABS,
    ADMIN_RESERVATION_TABS,
    ADMIN_USER_TABS,
    useAdminActivity,
    useAdminListings,
    useAdminReports,
    useAdminReservations,
    useAdminUsers,
} from '../../hooks/useAdminDashboard'
import { capitalize, formatTimeAgo, numberFormat, pesoFormat } from './adminFormat'

/* ==========================================================================
   Shared building blocks
   ========================================================================== */

const CATEGORIES = [
  'Clothing',
  'Shoes',
  'Accessories',
  'Electronics',
  'Collectibles',
  'Bags',
  'Vintage',
  'Furniture',
  'Books',
  'Sports',
  'Other',
]

interface SectionProps {
  /** Pre-fills the search box (used by the top bar search). */
  initialSearch?: string
}

const SectionHeading: React.FC<{
  title: string
  description: string
  actions?: ReactNode
}> = ({ title, description, actions }) => (
  <div className="ad-heading">
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {actions ? <div className="ad-heading__actions">{actions}</div> : null}
  </div>
)

interface TabsProps<K extends string> {
  label: string
  tabs: readonly K[]
  labels: Record<K, string>
  counts: Record<K, number>
  active: K
  onChange: (tab: K) => void
}

function Tabs<K extends string>({ label, tabs, labels, counts, active, onChange }: TabsProps<K>) {
  return (
    <div className="ad-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={active === tab}
          className={`ad-tab${active === tab ? ' is-active' : ''}`}
          onClick={() => onChange(tab)}
        >
          {labels[tab]}
          <span className="ad-tab__count">{numberFormat.format(counts[tab])}</span>
        </button>
      ))}
    </div>
  )
}

const SearchField: React.FC<{
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}> = ({ label, placeholder, value, onChange }) => (
  <label className="ad-field ad-field--search">
    <Search size={16} aria-hidden="true" />
    <input
      type="search"
      value={value}
      placeholder={placeholder}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
    />
    {value ? (
      <button
        type="button"
        className="ad-field__clear"
        aria-label="Clear search"
        onClick={() => onChange('')}
      >
        <X size={14} aria-hidden="true" />
      </button>
    ) : null}
  </label>
)

function SelectField<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: V
  options: { value: V; label: string }[]
  onChange: (value: V) => void
}) {
  const id = useId()
  return (
    <div className="ad-field-wrap">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="ad-select"
        value={value}
        onChange={(event) => onChange(event.target.value as V)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

const DateRangeFields: React.FC<{
  from: string
  to: string
  onChange: (patch: { dateFrom?: string; dateTo?: string }) => void
}> = ({ from, to, onChange }) => {
  const fromId = useId()
  const toId = useId()
  return (
    <>
      <div className="ad-field-wrap">
        <label htmlFor={fromId}>From</label>
        <input
          id={fromId}
          type="date"
          className="ad-select"
          value={from}
          max={to || undefined}
          onChange={(event) => onChange({ dateFrom: event.target.value })}
        />
      </div>
      <div className="ad-field-wrap">
        <label htmlFor={toId}>To</label>
        <input
          id={toId}
          type="date"
          className="ad-select"
          value={to}
          min={from || undefined}
          onChange={(event) => onChange({ dateTo: event.target.value })}
        />
      </div>
    </>
  )
}

const EmptyState: React.FC<{
  title: string
  hint: string
  actionLabel?: string
  onAction?: () => void
}> = ({ title, hint, actionLabel, onAction }) => (
  <div className="ad-empty">
    <p className="ad-empty__title">{title}</p>
    <p className="ad-empty__hint">{hint}</p>
    {actionLabel && onAction ? (
      <button type="button" className="ad-btn ad-btn--sm" onClick={onAction}>
        {actionLabel}
      </button>
    ) : null}
  </div>
)

interface Column {
  key: string
  label: string
  /** Visually hidden header (e.g. the actions column). */
  srOnly?: boolean
}

const DataTable: React.FC<{
  label: string
  columns: Column[]
  isEmpty: boolean
  emptyState: ReactNode
  children: ReactNode
}> = ({ label, columns, isEmpty, emptyState, children }) => (
  <div className="ad-table-wrap">
    <table className="ad-table ad-table--wide" aria-label={label}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col">
              {column.srOnly ? <span className="ad-sr-only">{column.label}</span> : column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {isEmpty ? (
          <tr>
            <td colSpan={columns.length}>{emptyState}</td>
          </tr>
        ) : (
          children
        )}
      </tbody>
    </table>
  </div>
)

const Pager: React.FC<{
  page: number
  total: number
  onPage: (page: number) => void
}> = ({ page, total, onPage }) => {
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE))
  const from = total === 0 ? 0 : (page - 1) * ADMIN_PAGE_SIZE + 1
  const to = Math.min(total, page * ADMIN_PAGE_SIZE)

  return (
    <div className="ad-pager">
      <p>
        Showing {numberFormat.format(from)}&ndash;{numberFormat.format(to)} of{' '}
        {numberFormat.format(total)}
      </p>
      <div className="ad-pager__buttons">
        <button
          type="button"
          className="ad-btn ad-btn--sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Previous
        </button>
        <span className="ad-pager__page">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          className="ad-btn ad-btn--sm"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          Next
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

const Pill: React.FC<{ kind: string; label?: string }> = ({ kind, label }) => (
  <span className={`ad-pill ad-pill--${kind}`}>{label ?? capitalize(kind)}</span>
)

const Thumb: React.FC<{ url: string | null }> = ({ url }) => (
  <span className="ad-thumb">
    {url ? <img src={url} alt="" loading="lazy" /> : <ShoppingBag size={18} aria-hidden="true" />}
  </span>
)

const Person: React.FC<{ name: string; avatarUrl: string | null; sub?: string }> = ({
  name,
  avatarUrl,
  sub,
}) => (
  <span className="ad-person">
    <span className="ad-person__avatar">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" loading="lazy" />
      ) : (
        name.trim().charAt(0).toUpperCase()
      )}
    </span>
    <span>
      <span className="ad-cell-title">{name}</span>
      {sub ? <span className="ad-cell-sub ad-cell-sub--block">{sub}</span> : null}
    </span>
  </span>
)

/* ==========================================================================
   Listings
   ========================================================================== */

const LISTING_TAB_LABELS: Record<AdminListingTab, string> = {
  all: 'All',
  active: 'Active',
  sold: 'Sold',
  archived: 'Archived',
  reserved: 'Reserved',
}

export const AdminListingsView: React.FC<SectionProps> = ({ initialSearch = '' }) => {
  const [filters, setFilters] = useState<AdminListingFilters>({
    tab: 'all',
    search: initialSearch,
    category: 'all',
    sort: 'newest',
    page: 1,
  })
  const { rows, total, tabCounts } = useAdminListings(filters)

  const update = (patch: Partial<AdminListingFilters>) =>
    setFilters((current) => ({ ...current, page: 1, ...patch }))
  const hasFilters =
    filters.tab !== 'all' || filters.search.trim() !== '' || filters.category !== 'all'
  const clear = () => update({ tab: 'all', search: '', category: 'all' })

  return (
    <>
      <SectionHeading
        title="Listings"
        description="Review, search, and remove listings across the marketplace."
      />
      <section className="ad-card ad-panel ad-list-panel" aria-label="Listings">
        <Tabs
          label="Listing status"
          tabs={ADMIN_LISTING_TABS}
          labels={LISTING_TAB_LABELS}
          counts={tabCounts}
          active={filters.tab}
          onChange={(tab) => update({ tab })}
        />

        <div className="ad-toolbar">
          <SearchField
            label="Search listings"
            placeholder="Search by title or seller..."
            value={filters.search}
            onChange={(search) => update({ search })}
          />
          <SelectField
            label="Category"
            value={filters.category}
            options={[
              { value: 'all', label: 'All categories' },
              ...CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
            onChange={(category) => update({ category })}
          />
          <SelectField<AdminListingSort>
            label="Sort by"
            value={filters.sort}
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
              { value: 'price-high', label: 'Price: high to low' },
              { value: 'price-low', label: 'Price: low to high' },
            ]}
            onChange={(sort) => update({ sort })}
          />
        </div>

        <DataTable
          label="Listings"
          columns={[
            { key: 'listing', label: 'Listing' },
            { key: 'seller', label: 'Seller' },
            { key: 'price', label: 'Price' },
            { key: 'status', label: 'Status' },
            { key: 'listed', label: 'Listed' },
            { key: 'actions', label: 'Actions', srOnly: true },
          ]}
          isEmpty={rows.length === 0}
          emptyState={
            hasFilters ? (
              <EmptyState
                title="No listings match your filters"
                hint="Try a different search or clear the filters."
                actionLabel="Clear filters"
                onAction={clear}
              />
            ) : (
              <EmptyState title="No listings yet" hint="Listings posted by sellers will show up here." />
            )
          }
        >
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <span className="ad-person">
                  <Thumb url={row.imageUrl} />
                  <span>
                    <span className="ad-cell-title">{row.title}</span>
                    <span className="ad-cell-sub ad-cell-sub--block">{row.categoryLabel}</span>
                  </span>
                </span>
              </td>
              <td className="ad-cell-muted">{row.sellerHandle}</td>
              <td>{pesoFormat.format(row.price)}</td>
              <td>
                <Pill kind={row.status} />
                {row.isReserved ? <Pill kind="reserved" /> : null}
              </td>
              <td className="ad-cell-muted">{formatTimeAgo(row.createdAt)}</td>
              <td>
                <span className="ad-row-actions">
                  <Link
                    to={`/listing/${row.id}`}
                    className="ad-btn ad-btn--sm"
                    aria-label={`View ${row.title}`}
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                    View
                  </Link>
                  {/* TODO(backend): wire up removal (confirm dialog + delete). */}
                  <button
                    type="button"
                    className="ad-btn ad-btn--sm ad-btn--danger"
                    aria-label={`Remove ${row.title}`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Remove
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </DataTable>

        <Pager page={filters.page} total={total} onPage={(page) => update({ page })} />
      </section>
    </>
  )
}

/* ==========================================================================
   Reports
   ========================================================================== */

const REPORT_TAB_LABELS: Record<AdminReportTab, string> = {
  pending: 'Pending',
  reviewing: 'Reviewing',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
}

export const AdminReportsView: React.FC<SectionProps> = ({ initialSearch = '' }) => {
  const [filters, setFilters] = useState<AdminReportFilters>({
    tab: 'pending',
    search: initialSearch,
    target: 'all',
    sort: 'newest',
    page: 1,
  })
  const { rows, total, tabCounts } = useAdminReports(filters)

  const update = (patch: Partial<AdminReportFilters>) =>
    setFilters((current) => ({ ...current, page: 1, ...patch }))
  const hasFilters = filters.search.trim() !== '' || filters.target !== 'all'
  const clear = () => update({ search: '', target: 'all' })

  return (
    <>
      <SectionHeading
        title="Reports"
        description="Check reported listings, users, and messages, then decide what to do."
      />
      <section className="ad-card ad-panel ad-list-panel" aria-label="Reports">
        <Tabs
          label="Report status"
          tabs={ADMIN_REPORT_TABS}
          labels={REPORT_TAB_LABELS}
          counts={tabCounts}
          active={filters.tab}
          onChange={(tab) => update({ tab })}
        />

        <div className="ad-toolbar">
          <SearchField
            label="Search reports"
            placeholder="Search by reason, target, or reporter..."
            value={filters.search}
            onChange={(search) => update({ search })}
          />
          <SelectField<'all' | AdminReportTarget>
            label="Type"
            value={filters.target}
            options={[
              { value: 'all', label: 'All types' },
              { value: 'listing', label: 'Listings' },
              { value: 'user', label: 'Users' },
              { value: 'message', label: 'Messages' },
            ]}
            onChange={(target) => update({ target })}
          />
          <SelectField<AdminReportSort>
            label="Sort by"
            value={filters.sort}
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
            ]}
            onChange={(sort) => update({ sort })}
          />
        </div>

        <DataTable
          label="Reports"
          columns={[
            { key: 'report', label: 'Report' },
            { key: 'type', label: 'Type' },
            { key: 'by', label: 'Reported by' },
            { key: 'status', label: 'Status' },
            { key: 'when', label: 'Reported' },
            { key: 'actions', label: 'Actions', srOnly: true },
          ]}
          isEmpty={rows.length === 0}
          emptyState={
            hasFilters ? (
              <EmptyState
                title="No reports match your filters"
                hint="Try a different search or clear the filters."
                actionLabel="Clear filters"
                onAction={clear}
              />
            ) : (
              <EmptyState
                title={`No ${REPORT_TAB_LABELS[filters.tab].toLowerCase()} reports`}
                hint="Reports from users will show up here."
              />
            )
          }
        >
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <span className="ad-cell-title">{row.reason}</span>
                <span className="ad-cell-sub ad-cell-sub--block">{row.targetLabel}</span>
              </td>
              <td>{capitalize(row.targetType)}</td>
              <td className="ad-cell-muted">{row.reportedBy}</td>
              <td>
                <Pill kind={row.status} />
              </td>
              <td className="ad-cell-muted">{formatTimeAgo(row.createdAt)}</td>
              <td>
                <span className="ad-row-actions">
                  {/* TODO(backend): open the report and apply a decision. */}
                  <button type="button" className="ad-btn ad-btn--sm ad-btn--primary">
                    Review
                  </button>
                  <button type="button" className="ad-btn ad-btn--sm">
                    Dismiss
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </DataTable>

        <Pager page={filters.page} total={total} onPage={(page) => update({ page })} />
      </section>
    </>
  )
}

/* ==========================================================================
   Reservations
   ========================================================================== */

const RESERVATION_TAB_LABELS: Record<AdminReservationTab, string> = {
  all: 'All',
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const AdminReservationsView: React.FC<SectionProps> = ({ initialSearch = '' }) => {
  const [filters, setFilters] = useState<AdminReservationFilters>({
    tab: 'all',
    search: initialSearch,
    dateFrom: '',
    dateTo: '',
    page: 1,
  })
  const { rows, total, tabCounts } = useAdminReservations(filters)

  const update = (patch: Partial<AdminReservationFilters>) =>
    setFilters((current) => ({ ...current, page: 1, ...patch }))
  const hasFilters =
    filters.tab !== 'all' ||
    filters.search.trim() !== '' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== ''
  const clear = () => update({ tab: 'all', search: '', dateFrom: '', dateTo: '' })

  return (
    <>
      <SectionHeading
        title="Reservations"
        description="Monitor booking activity between buyers and sellers."
      />
      <section className="ad-card ad-panel ad-list-panel" aria-label="Reservations">
        <Tabs
          label="Reservation status"
          tabs={ADMIN_RESERVATION_TABS}
          labels={RESERVATION_TAB_LABELS}
          counts={tabCounts}
          active={filters.tab}
          onChange={(tab) => update({ tab })}
        />

        <div className="ad-toolbar">
          <SearchField
            label="Search reservations"
            placeholder="Search by item, buyer, or seller..."
            value={filters.search}
            onChange={(search) => update({ search })}
          />
          <DateRangeFields from={filters.dateFrom} to={filters.dateTo} onChange={update} />
        </div>

        <DataTable
          label="Reservations"
          columns={[
            { key: 'item', label: 'Item' },
            { key: 'buyer', label: 'Buyer' },
            { key: 'seller', label: 'Seller' },
            { key: 'status', label: 'Status' },
            { key: 'when', label: 'Reserved' },
            { key: 'actions', label: 'Actions', srOnly: true },
          ]}
          isEmpty={rows.length === 0}
          emptyState={
            hasFilters ? (
              <EmptyState
                title="No reservations match your filters"
                hint="Try a different search, status, or date range."
                actionLabel="Clear filters"
                onAction={clear}
              />
            ) : (
              <EmptyState
                title="No reservations yet"
                hint="Reservations made by buyers will show up here."
              />
            )
          }
        >
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <span className="ad-person">
                  <Thumb url={row.itemImageUrl} />
                  <span className="ad-cell-title">{row.itemTitle}</span>
                </span>
              </td>
              <td>{row.buyerName}</td>
              <td className="ad-cell-muted">{row.sellerHandle}</td>
              <td>
                <Pill kind={row.status} />
              </td>
              <td className="ad-cell-muted">{formatTimeAgo(row.createdAt)}</td>
              <td>
                <span className="ad-row-actions">
                  {/* TODO(backend): open reservation details. */}
                  <button type="button" className="ad-btn ad-btn--sm">
                    Details
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </DataTable>

        <Pager page={filters.page} total={total} onPage={(page) => update({ page })} />
      </section>
    </>
  )
}

/* ==========================================================================
   Users
   ========================================================================== */

const USER_TAB_LABELS: Record<AdminUserTab, string> = {
  all: 'All users',
  buyer: 'Buyers',
  seller: 'Sellers',
}

export const AdminUsersView: React.FC<SectionProps> = ({ initialSearch = '' }) => {
  const [filters, setFilters] = useState<AdminUserFilters>({
    tab: 'all',
    search: initialSearch,
    status: 'all',
    sort: 'newest',
    page: 1,
  })
  const { rows, total, tabCounts } = useAdminUsers(filters)

  const update = (patch: Partial<AdminUserFilters>) =>
    setFilters((current) => ({ ...current, page: 1, ...patch }))
  const hasFilters =
    filters.tab !== 'all' || filters.search.trim() !== '' || filters.status !== 'all'
  const clear = () => update({ tab: 'all', search: '', status: 'all' })

  return (
    <>
      <SectionHeading
        title="User Management"
        description="View accounts, check activity, and keep the community safe."
      />
      <section className="ad-card ad-panel ad-list-panel" aria-label="Users">
        <Tabs
          label="User role"
          tabs={ADMIN_USER_TABS}
          labels={USER_TAB_LABELS}
          counts={tabCounts}
          active={filters.tab}
          onChange={(tab) => update({ tab })}
        />

        <div className="ad-toolbar">
          <SearchField
            label="Search users"
            placeholder="Search by name or email..."
            value={filters.search}
            onChange={(search) => update({ search })}
          />
          <SelectField<'all' | AdminUserStatus>
            label="Account status"
            value={filters.status}
            options={[
              { value: 'all', label: 'All accounts' },
              { value: 'active', label: 'Active' },
              { value: 'suspended', label: 'Suspended' },
            ]}
            onChange={(status) => update({ status })}
          />
          <SelectField<AdminUserSort>
            label="Sort by"
            value={filters.sort}
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
              { value: 'most-listings', label: 'Most listings' },
            ]}
            onChange={(sort) => update({ sort })}
          />
        </div>

        <DataTable
          label="Users"
          columns={[
            { key: 'user', label: 'User' },
            { key: 'role', label: 'Role' },
            { key: 'status', label: 'Status' },
            { key: 'listings', label: 'Listings' },
            { key: 'joined', label: 'Joined' },
            { key: 'actions', label: 'Actions', srOnly: true },
          ]}
          isEmpty={rows.length === 0}
          emptyState={
            hasFilters ? (
              <EmptyState
                title="No users match your filters"
                hint="Try a different search or clear the filters."
                actionLabel="Clear filters"
                onAction={clear}
              />
            ) : (
              <EmptyState title="No users yet" hint="New sign-ups will show up here." />
            )
          }
        >
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <Person name={row.name} avatarUrl={row.avatarUrl} sub={row.email} />
              </td>
              <td>
                <Pill kind={row.role} />
              </td>
              <td>
                <Pill kind={row.status} />
              </td>
              <td>{numberFormat.format(row.listingCount)}</td>
              <td className="ad-cell-muted">{formatTimeAgo(row.joinedAt)}</td>
              <td>
                <span className="ad-row-actions">
                  <Link to={`/profile/${row.id}`} className="ad-btn ad-btn--sm">
                    <ExternalLink size={14} aria-hidden="true" />
                    Profile
                  </Link>
                  {/* TODO(backend): suspend / restore account. */}
                  <button type="button" className="ad-btn ad-btn--sm ad-btn--danger">
                    {row.status === 'suspended' ? 'Restore' : 'Suspend'}
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </DataTable>

        <Pager page={filters.page} total={total} onPage={(page) => update({ page })} />
      </section>
    </>
  )
}

/* ==========================================================================
   Activity log
   ========================================================================== */

const ACTIVITY_TAB_LABELS: Record<AdminActivityTab, string> = {
  all: 'All activity',
  admin: 'Admin actions',
  system: 'System events',
}

export const AdminActivityView: React.FC<SectionProps> = ({ initialSearch = '' }) => {
  const [filters, setFilters] = useState<AdminActivityFilters>({
    tab: 'all',
    search: initialSearch,
    dateFrom: '',
    dateTo: '',
    page: 1,
  })
  const { rows, total, tabCounts } = useAdminActivity(filters)

  const update = (patch: Partial<AdminActivityFilters>) =>
    setFilters((current) => ({ ...current, page: 1, ...patch }))
  const hasFilters =
    filters.tab !== 'all' ||
    filters.search.trim() !== '' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== ''
  const clear = () => update({ tab: 'all', search: '', dateFrom: '', dateTo: '' })

  return (
    <>
      <SectionHeading
        title="Activity Log"
        description="See admin actions and system events in one place."
        actions={
          // TODO(backend): export the filtered log as CSV.
          <button
            type="button"
            className="ad-btn"
            disabled={rows.length === 0}
            title={rows.length === 0 ? 'Nothing to export yet' : 'Export as CSV'}
          >
            <Download size={16} aria-hidden="true" />
            Export CSV
          </button>
        }
      />
      <section className="ad-card ad-panel ad-list-panel" aria-label="Activity log">
        <Tabs
          label="Activity type"
          tabs={ADMIN_ACTIVITY_TABS}
          labels={ACTIVITY_TAB_LABELS}
          counts={tabCounts}
          active={filters.tab}
          onChange={(tab) => update({ tab })}
        />

        <div className="ad-toolbar">
          <SearchField
            label="Search activity"
            placeholder="Search by action, actor, or target..."
            value={filters.search}
            onChange={(search) => update({ search })}
          />
          <DateRangeFields from={filters.dateFrom} to={filters.dateTo} onChange={update} />
        </div>

        {rows.length === 0 ? (
          hasFilters ? (
            <EmptyState
              title="No activity matches your filters"
              hint="Try a different search, type, or date range."
              actionLabel="Clear filters"
              onAction={clear}
            />
          ) : (
            <EmptyState
              title="No activity yet"
              hint="Admin actions and system events will be recorded here."
            />
          )
        ) : (
          <ul className="ad-activity">
            {rows.map((row) => (
              <li key={row.id}>
                <span className={`ad-activity__icon ad-activity__icon--${row.kind}`}>
                  {row.kind === 'admin' ? (
                    <ShieldCheck size={18} aria-hidden="true" />
                  ) : (
                    <Settings size={18} aria-hidden="true" />
                  )}
                </span>
                <p>
                  <strong>{row.actor}</strong> {row.action}
                  {row.target ? <span className="ad-activity__target"> {row.target}</span> : null}
                </p>
                <time dateTime={row.createdAt}>{formatTimeAgo(row.createdAt)}</time>
              </li>
            ))}
          </ul>
        )}

        <Pager page={filters.page} total={total} onPage={(page) => update({ page })} />
      </section>
    </>
  )
}