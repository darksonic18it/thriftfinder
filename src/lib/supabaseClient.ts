import { createClient } from '@supabase/supabase-js'

let client: any = null

export function getSupabaseClient(): any {
  if (client) return client

  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!url) throw new Error('Missing VITE_SUPABASE_URL')
  if (!key) throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY')

  client = createClient(url, key)
  return client
}

export type SupabaseClient = any
