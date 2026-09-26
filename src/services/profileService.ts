import { supabase } from '../lib/supabaseClient'
import { describeError } from '../lib/listingMappers'
import type { Profile, ServiceResult, UUID } from '../types/database'

/** Safe, public subset of a profile — never includes contact_phone. */
export interface ProfileDisplay {
  id: UUID
  full_name: string
  avatar_path: string | null
}

export const profileService = {
  /**
   * Loads the profile row for a user id.
   * Returns null when no row exists yet (RLS also returns null for other users).
   *
   * UNCHANGED from Phase 1 — AuthContext depends on this exact signature.
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

  /**
   * Public seller display info, via the Phase 1A SECURITY DEFINER helper.
   * Use this — never a direct select on public.profiles — when showing
   * somebody ELSE's name, because the base table is intentionally private.
   *
   * Note: browse_listings() and get_listing_detail() already embed the seller
   * name, so this is only needed for one-off lookups (e.g. naming the buyer
   * on an incoming reservation).
   */
  async getProfileDisplay(profileId: UUID): Promise<ProfileDisplay | null> {
    const { data, error } = await supabase.rpc('get_profile_display', {
      p_profile_id: profileId,
    })

    if (error) {
      console.error('[profileService.getProfileDisplay]', error.message)
      return null
    }

    const rows = (data ?? []) as ProfileDisplay[]
    return rows[0] ?? null
  },

  /** Batch version for lists; de-duplicates ids before calling. */
  async getProfileDisplays(profileIds: UUID[]): Promise<Record<UUID, ProfileDisplay>> {
    const unique = Array.from(new Set(profileIds.filter(Boolean)))
    const entries = await Promise.all(
      unique.map(async (id) => [id, await profileService.getProfileDisplay(id)] as const)
    )

    const map: Record<UUID, ProfileDisplay> = {}
    for (const [id, display] of entries) {
      if (display) map[id] = display
    }
    return map
  },

  /**
   * Update the signed-in user's own profile (FR-002).
   * RLS restricts this to id = auth.uid(); the .eq() is only for clarity.
   */
  async updateMyProfile(
    patch: { full_name?: string; contact_phone?: string | null }
  ): Promise<ServiceResult<Profile>> {
    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError || !auth?.user) {
      return { data: null, error: { message: 'Sign in to update your profile.' } }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', auth.user.id)
      .select('id, full_name, contact_phone, avatar_path, created_at, updated_at')
      .maybeSingle()

    if (error) {
      console.error('[profileService.updateMyProfile]', error)
      return { data: null, error: describeError(error, 'Could not save your profile.') }
    }
    if (!data) {
      return { data: null, error: { message: 'Profile not found.' } }
    }

    return { data: data as Profile, error: null }
  },
}