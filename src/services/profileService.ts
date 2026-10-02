import { supabase } from '../lib/supabaseClient'
import { describeError } from '../lib/listingMappers'
import type { Profile, ServiceResult, UUID } from '../types/database'

/** Safe, public subset of a profile — never includes contact_phone. */
export interface ProfileDisplay {
  id: UUID
  full_name: string
  avatar_path: string | null
  cover_path: string | null
  /** Optional seller bio; null when the column does not exist yet or is unset. */
  bio: string | null
  /** Optional public city; null when unset. Never a full address. */
  location_city: string | null
  created_at: string
}

export const profileService = {
  /**
   * Loads the profile row for a user id.
   * Returns null when no row exists yet (RLS also returns null for other users).
   * Tolerates databases before the storefront migration (no bio/location_city).
   */
  async getProfileById(profileId: string): Promise<Profile | null> {
    const withOptional = await supabase
      .from('profiles')
      .select('id, full_name, contact_phone, avatar_path, cover_path, bio, location_city, created_at, updated_at')
      .eq('id', profileId)
      .maybeSingle()

    if (!withOptional.error) {
      return normalizeProfile(withOptional.data as Record<string, unknown> | null)
    }

    const err = withOptional.error as { code?: string; message?: string }
    const missingColumn =
      err.code === '42703' ||
      /bio|location_city|column|does not exist/i.test(err.message ?? '')
    if (!missingColumn) {
      console.error('[profileService.getProfileById]', err.message)
      return null
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, contact_phone, avatar_path, cover_path, created_at, updated_at')
      .eq('id', profileId)
      .maybeSingle()

    if (error) {
      console.error('[profileService.getProfileById]', error.message)
      return null
    }

    return normalizeProfile(data as unknown as Record<string, unknown> | null)
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

    const rows = (data ?? []) as Array<Record<string, unknown>>
    const row = rows[0] ?? null
    if (!row) return null
    return {
      id: row.id as UUID,
      full_name: (row.full_name as string) ?? '',
      avatar_path: (row.avatar_path as ProfileDisplay['avatar_path']) ?? null,
      cover_path: typeof row.cover_path === 'string' ? row.cover_path : null,
      bio: typeof row.bio === 'string' ? row.bio : null,
      location_city: typeof row.location_city === 'string' ? row.location_city : null,
      created_at: (row.created_at as string) ?? '',
    }
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
    patch: {
      full_name?: string
      contact_phone?: string | null
      avatar_path?: string | null
      cover_path?: string | null
      bio?: string | null
      location_city?: string | null
    }
  ): Promise<ServiceResult<Profile>> {
    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError || !auth?.user) {
      return { data: null, error: { message: 'Sign in to update your profile.' } }
    }

    const attempt = async (body: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(body)
        .eq('id', auth.user.id)
        .select('id, full_name, contact_phone, avatar_path, cover_path, bio, location_city, created_at, updated_at')
        .maybeSingle()
      return { data, error }
    }

    let result = await attempt(patch as Record<string, unknown>)

    if (result.error) {
      const err = result.error as { code?: string; message?: string }
      const missingColumn =
        err.code === '42703' ||
        /bio|location_city|column|does not exist/i.test(err.message ?? '')
      if (missingColumn) {
        const { bio: _bio, location_city: _city, ...rest } = patch as Record<string, unknown>
        void _bio
        void _city
        result = await supabase
          .from('profiles')
          .update(rest)
          .eq('id', auth.user.id)
          .select('id, full_name, contact_phone, avatar_path, cover_path, created_at, updated_at')
          .maybeSingle()
      }
    }

    const { data, error } = result

    if (error) {
      console.error('[profileService.updateMyProfile]', error)
      return { data: null, error: describeError(error, 'Could not save your profile.') }
    }
    if (!data) {
      return { data: null, error: { message: 'Profile not found.' } }
    }

    return { data: normalizeProfile(data as unknown as Record<string, unknown>) as Profile, error: null }
  },
}

function normalizeProfile(row: Record<string, unknown> | null): Profile | null {
  if (!row) return null
  return {
    id: row.id as Profile['id'],
    full_name: (row.full_name as string) ?? '',
    contact_phone: (row.contact_phone as Profile['contact_phone']) ?? null,
    avatar_path: (row.avatar_path as Profile['avatar_path']) ?? null,
    cover_path: (row.cover_path as Profile['cover_path']) ?? null,
    bio: typeof row.bio === 'string' ? row.bio : null,
    location_city: typeof row.location_city === 'string' ? row.location_city : null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}