import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabaseClient';

export type AdminListingStatus = 'active' | 'sold' | 'archived'
export type AdminAlertTone = 'danger' | 'warning' | 'info' | 'success'

export interface AdminStat { value: number; changePct: number | null }
export interface AdminActivityPoint { date: string; newUsers: number; newListings: number; reservations: number }
export interface AdminRecentListing {
  id: string; title: string; categoryLabel: string; price: number; sellerHandle: string
  status: AdminListingStatus; createdAt: string; imageUrl: string | null
}
export interface AdminRecentUser {
  id: string; name: string; avatarUrl: string | null; role: 'buyer' | 'seller'; joinedAt: string
}
export interface AdminAlert {
  id: string; tone: AdminAlertTone; title: string; description: string; createdAt: string
}
export interface AdminDashboardData {
  totalUsers: AdminStat
  activeListings: AdminStat
  totalReservations: AdminStat
  pendingReports: AdminStat
  activity: AdminActivityPoint[]
  listingStatus: Record<AdminListingStatus, number>
  recentListings: AdminRecentListing[]
  recentUsers: AdminRecentUser[]
  alerts: AdminAlert[]
  unreadAlertCount: number
}

const ZERO: AdminStat = { value: 0, changePct: null }
const EMPTY: AdminDashboardData = {
  totalUsers: ZERO, activeListings: ZERO, totalReservations: ZERO, pendingReports: ZERO,
  activity: [], listingStatus: { active: 0, sold: 0, archived: 0 },
  recentListings: [], recentUsers: [], alerts: [], unreadAlertCount: 0,
}

interface RawStat { value: number; current: number; previous: number }
interface RawDashboard {
  total_users: RawStat; active_listings: RawStat; total_reservations: RawStat; pending_reports: RawStat
  unreviewed_reports: number; overdue_reservations: number
  listing_status: Record<AdminListingStatus, number>
  activity: { date: string; new_users: number; new_listings: number; reservations: number }[]
  recent_listings: { id: string; title: string; category: string; price: number; status: AdminListingStatus
    created_at: string; seller_name: string | null; cover_path: string | null }[]
  recent_users: { id: string; full_name: string; avatar_path: string | null; created_at: string
    role: 'buyer' | 'seller' }[]
  alerts: { id: string; target_type: 'listing' | 'user' | 'message'; reason: string
    status: 'pending' | 'reviewing'; created_at: string
    listing_title: string | null; reported_user_name: string | null }[]
}

// "% change in new items: last 7 days vs the 7 days before". null when there is nothing to compare.
const pct = (cur: number, prev: number): number | null =>
  Number(prev) === 0 ? null : Math.round(((Number(cur) - Number(prev)) / Number(prev)) * 100)
const toStat = (s: RawStat): AdminStat => ({ value: Number(s.value), changePct: pct(s.current, s.previous) })

const photoUrl = (path: string | null) =>
  path ? supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl : null

// profile-avatars is private: signed URLs work only if the optional admin storage policy was applied.
async function signAvatars(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  try {
    const { data, error } = await supabase.storage.from('profile-avatars').createSignedUrls(paths, 3600)
    if (error || !data) return {}
    const out: Record<string, string> = {}
    data.forEach((d) => { if (d.path && d.signedUrl) out[d.path] = d.signedUrl })
    return out
  } catch { return {} }
}

async function map(raw: RawDashboard): Promise<AdminDashboardData> {
  const avatars = await signAvatars(raw.recent_users.map((u) => u.avatar_path).filter((p): p is string => !!p))

  const alerts: AdminAlert[] = raw.alerts.map((a) => {
    const target =
      a.target_type === 'listing' ? a.listing_title ?? 'a listing'
      : a.target_type === 'user' ? a.reported_user_name ?? 'a user'
      : 'a message'
    return {
      id: a.id,
      tone: a.status === 'pending' ? 'danger' : 'warning',
      title: `Report on ${a.target_type}`,
      description: `${a.reason} · ${target}`,
      createdAt: a.created_at,
    }
  })
  if (Number(raw.overdue_reservations) > 0) {
    alerts.push({
      id: 'overdue-reservations', tone: 'warning',
      title: `${raw.overdue_reservations} overdue reservation${Number(raw.overdue_reservations) === 1 ? '' : 's'}`,
      description: 'Pending holds that passed their expiry time.',
      createdAt: new Date().toISOString(),
    })
  }

  return {
    totalUsers: toStat(raw.total_users),
    activeListings: toStat(raw.active_listings),
    totalReservations: toStat(raw.total_reservations),
    pendingReports: toStat(raw.pending_reports),
    activity: raw.activity.map((p) => ({
      date: p.date, newUsers: Number(p.new_users), newListings: Number(p.new_listings),
      reservations: Number(p.reservations) })),
    listingStatus: {
      active: Number(raw.listing_status.active), sold: Number(raw.listing_status.sold),
      archived: Number(raw.listing_status.archived) },
    recentListings: raw.recent_listings.map((l) => ({
      id: l.id, title: l.title, categoryLabel: l.category, price: Number(l.price),
      sellerHandle: l.seller_name ?? 'Unknown seller', status: l.status,
      createdAt: l.created_at, imageUrl: photoUrl(l.cover_path) })),
    recentUsers: raw.recent_users.map((u) => ({
      id: u.id, name: u.full_name || 'Unnamed user',
      avatarUrl: u.avatar_path ? avatars[u.avatar_path] ?? null : null,
      role: u.role, joinedAt: u.created_at })),
    alerts,
    unreadAlertCount: Number(raw.unreviewed_reports),
  }
}

export function useAdminDashboard() {
  const [data, setData] = useState<AdminDashboardData>(EMPTY)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: raw, error: rpcError } = await supabase.rpc('admin_get_dashboard')
    if (rpcError || !raw) {
      setError(rpcError?.message ?? 'Could not load dashboard data')
      return
    }
    setData(await map(raw as RawDashboard))
    setLastUpdated(new Date())
    setError(null)
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 60_000)
    return () => window.clearInterval(timer)
  }, [load])

  return { data, lastUpdated, error, reload: load }
}