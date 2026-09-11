declare module '@supabase/supabase-js' {
  export type SupabaseClient = any

  export function createClient(url: string, key: string): SupabaseClient
}
