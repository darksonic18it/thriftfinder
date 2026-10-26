import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export interface AdminNotification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  entity_type: string | null
  entity_id: string | null
  created_at: string
  read_at: string | null
}

// Only these kinds show in the admin bell. Add more here later (the rest stay in the main bell).
const ADMIN_ENTITY_TYPES = ['report']
const LIMIT = 15

export function useAdminNotifications() {
  const { user } = useAuth()
  const [items, setItems] = useState<AdminNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const [list, count] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, type, title, message, link, entity_type, entity_id, created_at, read_at')
        .eq('recipient_id', user.id)
        .in('entity_type', ADMIN_ENTITY_TYPES)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(LIMIT),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .in('entity_type', ADMIN_ENTITY_TYPES)
        .is('archived_at', null)
        .is('read_at', null),
    ])
    if (!list.error && list.data) setItems(list.data as AdminNotification[])
    if (!count.error) setUnread(count.count ?? 0)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (!user) return undefined
    void load()
    const channel = supabase
      .channel(`admin-notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
        () => { void load() },
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [user?.id, load])

  const markRead = useCallback(async (id: string) => {
    const now = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: now } : n)))
    await supabase.from('notifications').update({ read_at: now }).eq('id', id).is('read_at', null)
    await load()
  }, [load])

  const markAllRead = useCallback(async () => {
    if (!user) return
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', user.id)
      .in('entity_type', ADMIN_ENTITY_TYPES)
      .is('read_at', null)
    await load()
  }, [user?.id, load])

  return { items, unread, loading, markRead, markAllRead }
}