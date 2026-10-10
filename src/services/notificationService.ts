import { supabase } from '../lib/supabaseClient'

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'user'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  description: string
  createdAt: string
  href: string
  readAt: string | null
  archivedAt: string | null
}

interface NotificationRow {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  created_at: string
  read_at: string | null
  archived_at: string | null
}

function normalizeType(value: string): NotificationType {
  switch (value) {
    case 'info':
    case 'success':
    case 'warning':
    case 'error':
    case 'user':
      return value
    default:
      return 'info'
  }
}

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: normalizeType(row.type),
    title: row.title,
    description: row.message,
    createdAt: row.created_at,
    href: row.link || '/dashboard',
    readAt: row.read_at,
    archivedAt: row.archived_at,
  }
}

export const notificationService = {
  async getForCurrentUser(): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select(
        'id, type, title, message, link, created_at, read_at, archived_at'
      )
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[notificationService.getForCurrentUser]', error)
      throw error
    }

    return (data ?? []).map((row) => mapRow(row as NotificationRow))
  },

  async markRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .is('read_at', null)

    if (error) throw error
  },

  async markAllRead(): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)
      .is('archived_at', null)

    if (error) throw error
  },

  async archive(id: string): Promise<void> {
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('notifications')
      .update({
        read_at: now,
        archived_at: now,
      })
      .eq('id', id)

    if (error) throw error
  },

  async unarchive(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ archived_at: null })
      .eq('id', id)

    if (error) throw error
  },
}