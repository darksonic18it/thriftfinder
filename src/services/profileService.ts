import { supabase } from '../lib/supabaseClient'
import type { Profile } from '../types/database'

export const profileService = {
  /**
   * Loads the profile row for a user id.
   * Returns null when no row exists yet (RLS also returns null for other users).
   */
  async getProfileById(profileId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, contact_phone, avatar_path, created_at, updated_at')
      .eq('id', profileId)
      .maybeSingle()

    if (error) {
      console.error('[profileService.getProfileById]', error.message)
      return null
    }

    return (data as Profile | null) ?? null
  },
}