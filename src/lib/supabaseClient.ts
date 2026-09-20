import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

if (!url) throw new Error('Missing VITE_SUPABASE_URL')
if (!key) throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY')

export const supabase: SupabaseClient = createClient(url, key, {
  auth: {
    // Session is stored in localStorage and refreshed automatically.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Kept for backwards compatibility with the existing service stubs.
export function getSupabaseClient(): SupabaseClient {
  return supabase
}

export type { SupabaseClient }