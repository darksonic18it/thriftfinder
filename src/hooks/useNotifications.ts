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

const POLL_MS = 60_000
const REFRESH_DEBOUNCE_MS = 400

export function useNotifications() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [raw, setRaw] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestRef = useRef(0)
  const debounceRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setRaw([])
      return
    }

    const requestId = ++requestRef.current
    setLoading(true)

    try {
      const next = await notificationService.getForCurrentUser()

      if (requestId !== requestRef.current) return

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
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
    }

    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null
      void refresh()
    }, REFRESH_DEBOUNCE_MS)
  }, [refresh])

  useEffect(() => {
    if (!userId) {
      setRaw([])
      setError(null)
      setLoading(false)
      return
    }

    void refresh()

    const channel = supabase
      .channel(`user-notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        scheduleRefresh
      )
      .subscribe()

    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }, POLL_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        scheduleRefresh()
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      window.clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)

      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current)
        debounceRef.current = null
      }

      void supabase.removeChannel(channel)
      requestRef.current += 1
    }
  }, [userId, refresh, scheduleRefresh])

  const items = useMemo<NotificationItem[]>(
    () =>
      raw.map((notification) => ({
        ...notification,
        isUnread: notification.readAt === null,
        isArchived: notification.archivedAt !== null,
      })),
    [raw]
  )

  const unreadCount = useMemo(
    () => items.filter((item) => item.isUnread && !item.isArchived).length,
    [items]
  )

  const markRead = useCallback(
    async (id: string) => {
      // Update the UI immediately, then persist to Supabase.
      const previous = raw
      setRaw((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
            : item
        )
      )

      try {
        await notificationService.markRead(id)
      } catch (e) {
        console.error('[useNotifications.markRead]', e)
        setRaw(previous)
        setError('Could not update notification.')
        void refresh()
      }
    },
    [raw, refresh]
  )

  
const markAllRead = useCallback(async () => {
  const now = new Date().toISOString()

  setRaw((current) =>
    current.map((item) =>
      item.archivedAt === null && item.readAt === null
        ? { ...item, readAt: now }
        : item
    )
  )

  try {
    await notificationService.markAllRead()
    setError(null)
  } catch (e) {
    console.error('[useNotifications.markAllRead]', e)
    setError('Could not update notifications.')
    void refresh()
  }
}, [refresh])


  const archive = useCallback(
    async (id: string) => {
      const previous = raw
      const now = new Date().toISOString()

      setRaw((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                readAt: item.readAt ?? now,
                archivedAt: now,
              }
            : item
        )
      )

      try {
        await notificationService.archive(id)
        setError(null)
      } catch (e) {
        console.error('[useNotifications.archive]', e)
        setRaw(previous)
        setError('Could not archive notification.')
        void refresh()
      }
    },
    [raw, refresh]
  )

  const unarchive = useCallback(
    async (id: string) => {
      const previous = raw

      setRaw((current) =>
        current.map((item) =>
          item.id === id ? { ...item, archivedAt: null } : item
        )
      )

      try {
        await notificationService.unarchive(id)
        setError(null)
      } catch (e) {
        console.error('[useNotifications.unarchive]', e)
        setRaw(previous)
        setError('Could not restore notification.')
        void refresh()
      }
    },
    [raw, refresh]
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