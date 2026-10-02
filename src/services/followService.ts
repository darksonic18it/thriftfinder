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
      if (isMissingRelation(error)) return { data: { followers_count: 0, following_count: 0 }, error: null }
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

  /**
   * Whether the signed-in user follows `profileId`. False when signed out or
   * when the follow backend has not been migrated yet.
   */
  async isFollowing(profileId: UUID): Promise<boolean> {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user || auth.user.id === profileId) return false

    const { data, error } = await supabase.rpc('is_following', {
      p_following_id: profileId,
    })
    if (error) {
      if (!isMissingRelation(error)) console.error('[followService.isFollowing]', error)
      return false
    }
    return data === true
  },

  /** Follow a seller. Throws a human-readable message on failure. */
  async follow(profileId: UUID): Promise<ServiceResult<true>> {
    const { error } = await supabase.rpc('follow_profile', { p_following_id: profileId })
    if (error) {
      if (isMissingRelation(error)) {
        return { data: null, error: { message: 'Following is not available yet.' } }
      }
      console.error('[followService.follow]', error)
      const message = /yourself/i.test(error.message)
        ? 'You cannot follow yourself.'
        : /sign in/i.test(error.message)
          ? 'Sign in to follow sellers.'
          : describeError(error, 'Could not follow this seller.').message
      return { data: null, error: { message } }
    }
    return { data: true, error: null }
  },

  /** Unfollow a seller. Throws a human-readable message on failure. */
  async unfollow(profileId: UUID): Promise<ServiceResult<true>> {
    const { error } = await supabase.rpc('unfollow_profile', { p_following_id: profileId })
    if (error) {
      if (isMissingRelation(error)) {
        return { data: null, error: { message: 'Following is not available yet.' } }
      }
      console.error('[followService.unfollow]', error)
      return { data: null, error: describeError(error, 'Could not unfollow this seller.') }
    }
    return { data: true, error: null }
  },
}

function isMissingRelation(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42883' ||
    error.code === '42P01' ||
    /does not exist|could not find the function|relation .* does not exist/i.test(error.message ?? '')
  )
}