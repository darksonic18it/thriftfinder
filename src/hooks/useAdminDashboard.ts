import { useState } from 'react'

/* ==========================================================================
   GUI-ONLY DATA LAYER
   --------------------------------------------------------------------------
   Every hook in this file returns EMPTY data. There is no backend yet.
   The types describe exactly what each screen renders, so when you build the
   backend you only have to make these hooks return real rows in the same
   shape. Nothing in the UI files has to change.
   ========================================================================== */

/* -------------------------------------------------------------------------- */
/*  Shared types                                                               */
/* -------------------------------------------------------------------------- */

export type AdminListingStatus = 'active' | 'sold' | 'archived'
export type AdminUserRole = 'buyer' | 'seller'
export type AdminAlertTone = 'danger' | 'warning' | 'info' | 'success'

/** Page size used by every list screen. */
export const ADMIN_PAGE_SIZE = 10

/** What every list screen gets back from its hook. */
export interface AdminSectionResult<Row, Tab extends string> {
  rows: Row[]
  /** Total rows matching the current filters (across all pages). */
  total: number
  /** Count shown next to each tab, ignoring the tab itself. */
  tabCounts: Record<Tab, number>
  loading: boolean
}

function zeroCounts<T extends string>(keys: readonly T[]): Record<T, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>
}

/* -------------------------------------------------------------------------- */
/*  Overview                                                                   */
/* -------------------------------------------------------------------------- */

export interface AdminStat {
  value: number
  /** % change vs. the previous 7 days. null = not available yet. */
  changePct: number | null
}

export interface AdminActivityPoint {
  /** Local calendar day, YYYY-MM-DD. */
  date: string
  newUsers: number
  newListings: number
  reservations: number
}

export interface AdminAlert {
  id: string
  tone: AdminAlertTone
  title: string
  description: string
  /** ISO timestamp. */
  createdAt: string
}

export interface AdminRecentListing {
  id: string
  /** Full, already-resolved image URL (not a storage path). */
  imageUrl: string | null
  title: string
  /** e.g. "Clothing • Men" */
  categoryLabel: string
  /** Price in PHP. */
  price: number
  /** e.g. "@jhncrz" */
  sellerHandle: string
  status: AdminListingStatus
  /** ISO timestamp. */
  createdAt: string
}

export interface AdminRecentUser {
  id: string
  name: string
  /** Full, already-resolved image URL (not a storage path). */
  avatarUrl: string | null
  role: AdminUserRole
  /** ISO timestamp. */
  joinedAt: string
}

export interface AdminDashboardData {
  totalUsers: AdminStat
  activeListings: AdminStat
  totalReservations: AdminStat
  pendingReports: AdminStat
  /** Number shown on the bell badge. 0 hides the badge. */
  unreadAlertCount: number
  /** One point per day, oldest first (the chart expects 7). */
  activity: AdminActivityPoint[]
  listingStatus: Record<AdminListingStatus, number>
  alerts: AdminAlert[]
  recentListings: AdminRecentListing[]
  recentUsers: AdminRecentUser[]
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildEmptyActivity(days: number): AdminActivityPoint[] {
  const points: AdminActivityPoint[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date()
    day.setDate(day.getDate() - i)
    points.push({
      date: toLocalDateKey(day),
      newUsers: 0,
      newListings: 0,
      reservations: 0,
    })
  }
  return points
}

export function createEmptyDashboardData(): AdminDashboardData {
  return {
    totalUsers: { value: 0, changePct: null },
    activeListings: { value: 0, changePct: null },
    totalReservations: { value: 0, changePct: null },
    pendingReports: { value: 0, changePct: null },
    unreadAlertCount: 0,
    activity: buildEmptyActivity(7),
    listingStatus: { active: 0, sold: 0, archived: 0 },
    alerts: [],
    recentListings: [],
    recentUsers: [],
  }
}

interface UseAdminDashboardResult {
  data: AdminDashboardData
  loading: boolean
  /** null until the first successful fetch. */
  lastUpdated: Date | null
}

/**
 * TODO(backend): replace the body with real fetching (Supabase RPC / queries),
 * then set the data and lastUpdated. Keep the return shape.
 */
export function useAdminDashboard(): UseAdminDashboardResult {
  const [data] = useState<AdminDashboardData>(() => createEmptyDashboardData())
  const [loading] = useState(false)
  const [lastUpdated] = useState<Date | null>(null)

  return { data, loading, lastUpdated }
}

/* -------------------------------------------------------------------------- */
/*  Listings                                                                   */
/* -------------------------------------------------------------------------- */

export const ADMIN_LISTING_TABS = ['all', 'active', 'sold', 'archived', 'reserved'] as const
export type AdminListingTab = (typeof ADMIN_LISTING_TABS)[number]
export type AdminListingSort = 'newest' | 'oldest' | 'price-high' | 'price-low'

export interface AdminListingFilters {
  tab: AdminListingTab
  search: string
  /** 'all' or a category name. */
  category: string
  sort: AdminListingSort
  /** 1-based. */
  page: number
}

export interface AdminListingRow {
  id: string
  imageUrl: string | null
  title: string
  categoryLabel: string
  price: number
  sellerHandle: string
  status: AdminListingStatus
  isReserved: boolean
  /** ISO timestamp. */
  createdAt: string
}

const EMPTY_LISTINGS: AdminSectionResult<AdminListingRow, AdminListingTab> = {
  rows: [],
  total: 0,
  tabCounts: zeroCounts(ADMIN_LISTING_TABS),
  loading: false,
}

/** TODO(backend): query listings using these filters. */
export function useAdminListings(
  _filters: AdminListingFilters,
): AdminSectionResult<AdminListingRow, AdminListingTab> {
  return EMPTY_LISTINGS
}

/* -------------------------------------------------------------------------- */
/*  Reports                                                                    */
/* -------------------------------------------------------------------------- */

export const ADMIN_REPORT_TABS = ['pending', 'reviewing', 'resolved', 'dismissed'] as const
export type AdminReportTab = (typeof ADMIN_REPORT_TABS)[number]
export type AdminReportTarget = 'listing' | 'user' | 'message'
export type AdminReportSort = 'newest' | 'oldest'

export interface AdminReportFilters {
  tab: AdminReportTab
  search: string
  /** 'all' or a target type. */
  target: 'all' | AdminReportTarget
  sort: AdminReportSort
  page: number
}

export interface AdminReportRow {
  id: string
  targetType: AdminReportTarget
  /** e.g. "Vintage Levi's Jacket" or "@user_742" */
  targetLabel: string
  reason: string
  reportedBy: string
  status: AdminReportTab
  /** ISO timestamp. */
  createdAt: string
}

const EMPTY_REPORTS: AdminSectionResult<AdminReportRow, AdminReportTab> = {
  rows: [],
  total: 0,
  tabCounts: zeroCounts(ADMIN_REPORT_TABS),
  loading: false,
}

/** TODO(backend): query reports using these filters. */
export function useAdminReports(
  _filters: AdminReportFilters,
): AdminSectionResult<AdminReportRow, AdminReportTab> {
  return EMPTY_REPORTS
}

/* -------------------------------------------------------------------------- */
/*  Reservations                                                               */
/* -------------------------------------------------------------------------- */

export const ADMIN_RESERVATION_TABS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const
export type AdminReservationTab = (typeof ADMIN_RESERVATION_TABS)[number]

export interface AdminReservationFilters {
  tab: AdminReservationTab
  search: string
  /** YYYY-MM-DD or ''. */
  dateFrom: string
  /** YYYY-MM-DD or ''. */
  dateTo: string
  page: number
}

export interface AdminReservationRow {
  id: string
  itemTitle: string
  itemImageUrl: string | null
  buyerName: string
  sellerHandle: string
  status: Exclude<AdminReservationTab, 'all'>
  /** ISO timestamp. */
  createdAt: string
}

const EMPTY_RESERVATIONS: AdminSectionResult<AdminReservationRow, AdminReservationTab> = {
  rows: [],
  total: 0,
  tabCounts: zeroCounts(ADMIN_RESERVATION_TABS),
  loading: false,
}

/** TODO(backend): query reservations using these filters. */
export function useAdminReservations(
  _filters: AdminReservationFilters,
): AdminSectionResult<AdminReservationRow, AdminReservationTab> {
  return EMPTY_RESERVATIONS
}

/* -------------------------------------------------------------------------- */
/*  Users                                                                      */
/* -------------------------------------------------------------------------- */

export const ADMIN_USER_TABS = ['all', 'buyer', 'seller'] as const
export type AdminUserTab = (typeof ADMIN_USER_TABS)[number]
export type AdminUserStatus = 'active' | 'suspended'
export type AdminUserSort = 'newest' | 'oldest' | 'most-listings'

export interface AdminUserFilters {
  tab: AdminUserTab
  search: string
  /** 'all' or an account status. */
  status: 'all' | AdminUserStatus
  sort: AdminUserSort
  page: number
}

export interface AdminUserRow {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  role: AdminUserRole
  status: AdminUserStatus
  listingCount: number
  /** ISO timestamp. */
  joinedAt: string
}

const EMPTY_USERS: AdminSectionResult<AdminUserRow, AdminUserTab> = {
  rows: [],
  total: 0,
  tabCounts: zeroCounts(ADMIN_USER_TABS),
  loading: false,
}

/** TODO(backend): query users using these filters. */
export function useAdminUsers(
  _filters: AdminUserFilters,
): AdminSectionResult<AdminUserRow, AdminUserTab> {
  return EMPTY_USERS
}

/* -------------------------------------------------------------------------- */
/*  Activity log                                                               */
/* -------------------------------------------------------------------------- */

export const ADMIN_ACTIVITY_TABS = ['all', 'admin', 'system'] as const
export type AdminActivityTab = (typeof ADMIN_ACTIVITY_TABS)[number]

export interface AdminActivityFilters {
  tab: AdminActivityTab
  search: string
  /** YYYY-MM-DD or ''. */
  dateFrom: string
  /** YYYY-MM-DD or ''. */
  dateTo: string
  page: number
}

export interface AdminActivityRow {
  id: string
  kind: Exclude<AdminActivityTab, 'all'>
  /** Who did it, e.g. "Admin" or "System". */
  actor: string
  /** e.g. "removed listing" */
  action: string
  /** e.g. "#L-1267" */
  target: string | null
  /** ISO timestamp. */
  createdAt: string
}

const EMPTY_ACTIVITY: AdminSectionResult<AdminActivityRow, AdminActivityTab> = {
  rows: [],
  total: 0,
  tabCounts: zeroCounts(ADMIN_ACTIVITY_TABS),
  loading: false,
}

/** TODO(backend): query the activity log using these filters. */
export function useAdminActivity(
  _filters: AdminActivityFilters,
): AdminSectionResult<AdminActivityRow, AdminActivityTab> {
  return EMPTY_ACTIVITY
}