import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import {
  notificationService,
  type AppNotification,
} from '../services/notificationService'

export interface NotificationItem extends AppNotification {
  isUnread: boolean
  isArchived: boolean
}

interface StoredState {
  read: string[]
  archived: string[]
}

const POLL_MS = 60_000
const REFRESH_DEBOUNCE_MS = 400
const MAX_STORED_IDS = 300

const storageKey = (userId: string) => `thriftfinder:notifications:${userId}`

function loadState(userId: string): StoredState {
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return { read: [], archived: [] }
    const parsed = JSON.parse(raw) as Partial<StoredState>
    return {
      read: Array.isArray(parsed.read) ? parsed.read : [],
      archived: Array.isArray(parsed.archived) ? parsed.archived : [],
    }
  } catch {
    return { read: [], archived: [] }
  }
}

function saveState(userId: string, state: StoredState) {
  try {
    window.localStorage.setItem(
      storageKey(userId),
      JSON.stringify({
        read: state.read.slice(-MAX_STORED_IDS),
        archived: state.archived.slice(-MAX_STORED_IDS),
      })
    )
  } catch {
    /* storage full or blocked — read state just won't persist */
  }
}

/**
 * Live notification feed for the signed-in user.
 *
 * Refresh triggers: initial load, Supabase Realtime changes on `reservations`,
 * a 60s poll (fallback if Realtime isn't enabled), tab focus, and manual refresh.
 * Read / archived state is kept per user in localStorage.
 */
export function useNotifications() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [raw, setRaw] = useState<AppNotification[]>([])
  const [stored, setStored] = useState<StoredState>({ read: [], archived: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestRef = useRef(0)
  const debounceRef = useRef<number | null>(null)

  // Load persisted read/archived state whenever the user changes.
  useEffect(() => {
    if (!userId) {
      setStored({ read: [], archived: [] })
      setRaw([])
      return
    }
    setStored(loadState(userId))
  }, [userId])

  const refresh = useCallback(async () => {
    if (!userId) return
    const requestId = ++requestRef.current
    setLoading(true)
    try {
      const next = await notificationService.getForCurrentUser()
      if (requestId !== requestRef.current) return // a newer request won
      setRaw(next)
      setError(null)
    } catch (e) {
      if (requestId !== requestRef.current) return
      console.error('[useNotifications.refresh]', e)
      setError('Could not load notifications.')
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [userId])

  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null
      void refresh()
    }, REFRESH_DEBOUNCE_MS)
  }, [refresh])

  useEffect(() => {
    if (!userId) return

    void refresh()

    // Realtime: needs `reservations` in the supabase_realtime publication.
    // RLS is applied to these events, so we only hear about our own rows.
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        scheduleRefresh
      )
      .subscribe()

    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, POLL_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') scheduleRefresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      window.clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      void supabase.removeChannel(channel)
      requestRef.current += 1 // invalidate in-flight requests
    }
  }, [userId, refresh, scheduleRefresh])

  const update = useCallback(
    (fn: (prev: StoredState) => StoredState) => {
      if (!userId) return
      setStored((prev) => {
        const next = fn(prev)
        saveState(userId, next)
        return next
      })
    },
    [userId]
  )

  const items = useMemo<NotificationItem[]>(() => {
    const read = new Set(stored.read)
    const archived = new Set(stored.archived)
    return raw.map((n) => ({
      ...n,
      isUnread: !read.has(n.id),
      isArchived: archived.has(n.id),
    }))
  }, [raw, stored])

  const unreadCount = useMemo(
    () => items.filter((n) => n.isUnread && !n.isArchived).length,
    [items]
  )

  const markRead = useCallback(
    (id: string) =>
      update((s) =>
        s.read.includes(id) ? s : { ...s, read: [...s.read, id] }
      ),
    [update]
  )

  const markAllRead = useCallback(
    () =>
      update((s) => {
        const read = new Set(s.read)
        for (const n of raw) read.add(n.id)
        return { ...s, read: Array.from(read) }
      }),
    [update, raw]
  )

  const archive = useCallback(
    (id: string) =>
      update((s) => ({
        read: s.read.includes(id) ? s.read : [...s.read, id],
        archived: s.archived.includes(id) ? s.archived : [...s.archived, id],
      })),
    [update]
  )

  const unarchive = useCallback(
    (id: string) =>
      update((s) => ({ ...s, archived: s.archived.filter((x) => x !== id) })),
    [update]
  )

  return {
    items,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
    archive,
    unarchive,
  }
}