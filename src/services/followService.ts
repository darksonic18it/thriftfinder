import { supabase } from '../lib/supabaseClient'
import { describeError } from '../lib/listingMappers'
import type { ServiceError, ServiceResult, UUID } from '../types/database'

async function requireUserId(): Promise<{ userId: UUID } | { userId: null; error: ServiceError }> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return { userId: null, error: { message: 'Sign in to view follow stats.' } }
  }
  return { userId: data.user.id }
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

export const followService = {
  async getFollowCounts(profileId: UUID): Promise<ServiceResult<{ followers_count: number; following_count: number }>> {
    const { data, error } = await supabase.rpc('get_follow_counts', {
      p_profile_id: profileId,
    })

    if (error) {
      console.error('[followService.getFollowCounts]', error)
      return { data: null, error: describeError(error, 'Could not load follow stats.') }
    }

    const row = (data ?? []) as
      | Array<{ followers_count: unknown; following_count: unknown }>
      | null

    const first = row?.[0] ?? null
    if (!first) {
      return { data: { followers_count: 0, following_count: 0 }, error: null }
    }

    return {
      data: {
        followers_count: toNumber(first.followers_count),
        following_count: toNumber(first.following_count),
      },
      error: null,
    }
  },

  async getMyFollowCounts(): Promise<ServiceResult<{ followers_count: number; following_count: number }>> {
    const auth = await requireUserId()
    if ('error' in auth) return { data: null, error: auth.error }
    return followService.getFollowCounts(auth.userId)
  },
}