import { supabase } from '../lib/supabaseClient';

export type AdminRole = 'super_admin' | 'admin' | 'moderator'
export interface Paged<T> { rows: T[]; total: number }

export class AdminError extends Error {
  constructor(message: string, public code?: string) { super(message) }
}

export function friendlyAdminError(e: unknown): string {
  const err = e as AdminError
  if (err?.code === '42501') return "You don't have permission to do that."
  if (err?.code === 'P0002') return 'That record no longer exists.'
  if (err?.code === '22023') return err.message
  if (err instanceof Error && !err.code) return err.message
  return 'Something went wrong. Please try again.'
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new AdminError(error.message, error.code)
  return data as T
}

async function rpcPaged<T extends { total_count: number }>(
  fn: string, args: Record<string, unknown>
): Promise<Paged<Omit<T, 'total_count'>>> {
  const data = await rpc<T[]>(fn, args)
  const total = data.length ? Number(data[0].total_count) : 0
  return { rows: data.map(({ total_count, ...row }) => row), total }
}

export interface Overview {
  total_users: number; new_users_7d: number
  listings: { total: number; active: number; sold: number; archived: number }
  new_listings_7d: number
  reservations: Record<string, number>
  open_reports: number; suspended_users: number
}
export interface AdminListing {
  id: string; title: string; price: number; category: string; condition: string
  status: 'active' | 'sold' | 'archived'; is_featured: boolean; city: string; barangay: string
  created_at: string; sold_at: string | null; seller_id: string; seller_name: string | null
  cover_path: string | null; open_reports: number
}
export interface AdminReport {
  id: string; target_type: 'listing' | 'user' | 'message'
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
  reason: string; details: string | null; created_at: string; reviewed_at: string | null
  resolution_note: string | null; reporter_id: string; reporter_name: string | null
  reviewed_by_name: string | null; listing_id: string | null; listing_title: string | null
  listing_status: string | null; reported_user_id: string | null; reported_user_name: string | null
  message_id: string | null; message_excerpt: string | null
}
export interface AdminUser {
  id: string; full_name: string; email: string; avatar_path: string | null; created_at: string
  admin_role: AdminRole | null; listings_count: number; reservations_count: number
  reports_against: number; is_suspended: boolean; suspended_until: string | null
}
export interface AdminReservation {
  id: string; status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Expired'
  created_at: string; expires_at: string | null; resolved_at: string | null; is_overdue: boolean
  listing_id: string; listing_title: string; listing_price: number
  buyer_id: string; buyer_name: string | null; seller_id: string; seller_name: string | null
}
export interface ActivityEntry {
  id: string; actor_id: string | null; actor_name: string | null; actor_type: 'admin' | 'system'
  action: string; target_type: string | null; target_id: string | null
  details: Record<string, unknown>; created_at: string
}

export async function fetchAdminRole(userId: string): Promise<AdminRole | null> {
  const { data } = await supabase
    .from('admin_accounts')
    .select('admin_role, is_active')
    .eq('profile_id', userId)
    .maybeSingle()
  return data?.is_active ? (data.admin_role as AdminRole) : null
}

export const adminService = {
  getOverview: () => rpc<Overview>('admin_get_overview'),

  listListings: (o: { search?: string; status?: string; limit?: number; offset?: number } = {}) =>
    rpcPaged<AdminListing & { total_count: number }>('admin_list_listings', {
      p_search: o.search || null, p_status: o.status || null,
      p_limit: o.limit ?? 20, p_offset: o.offset ?? 0 }),

  setListingStatus: (listingId: string, status: 'active' | 'archived', reason?: string) =>
    rpc<void>('admin_set_listing_status', {
      p_listing_id: listingId, p_status: status, p_reason: reason ?? null }),

  listReports: (o: { status?: string; targetType?: string; search?: string; limit?: number; offset?: number } = {}) =>
    rpcPaged<AdminReport & { total_count: number }>('admin_list_reports', {
      p_status: o.status || null, p_target_type: o.targetType || null, p_search: o.search || null,
      p_limit: o.limit ?? 20, p_offset: o.offset ?? 0 }),

  resolveReport: (reportId: string, status: 'reviewing' | 'resolved' | 'dismissed',
                  note?: string, archiveListing = false) =>
    rpc<void>('admin_resolve_report', {
      p_report_id: reportId, p_status: status, p_note: note ?? null,
      p_archive_listing: archiveListing }),

  listUsers: (o: { search?: string; filter?: 'suspended' | 'admins'; limit?: number; offset?: number } = {}) =>
    rpcPaged<AdminUser & { total_count: number }>('admin_list_users', {
      p_search: o.search || null, p_filter: o.filter || null,
      p_limit: o.limit ?? 20, p_offset: o.offset ?? 0 }),

  moderateUser: (userId: string, action: 'warn' | 'suspend' | 'reinstate',
                 reason: string, endsAt?: Date | null) =>
    rpc<void>('admin_moderate_user', {
      p_user_id: userId, p_action: action, p_reason: reason,
      p_ends_at: endsAt ? endsAt.toISOString() : null }),

  listReservations: (o: { status?: string; search?: string; limit?: number; offset?: number } = {}) =>
    rpcPaged<AdminReservation & { total_count: number }>('admin_list_reservations', {
      p_status: o.status || null, p_search: o.search || null,
      p_limit: o.limit ?? 20, p_offset: o.offset ?? 0 }),

  listActivity: (o: { action?: string; search?: string; limit?: number; offset?: number } = {}) =>
    rpcPaged<ActivityEntry & { total_count: number }>('admin_list_activity', {
      p_action: o.action || null, p_search: o.search || null,
      p_limit: o.limit ?? 30, p_offset: o.offset ?? 0 }),
}