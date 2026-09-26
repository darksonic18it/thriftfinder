import { supabase } from '../lib/supabaseClient'
import { describeError } from '../lib/listingMappers'
import type { ServiceResult, UUID } from '../types/database'

/**
 * OPTIONAL MODULE — requires migration 04.
 * Favorites are NOT an SRS functional requirement; they exist because the
 * shipped UI already has heart buttons and a "Saved items" counter.
 *
 * If you skip migration 04, do not import this file anywhere.
 */

async function requireUserId(): Promise<
  { userId: UUID; error: null } | { userId: null; error: { message: string } }
> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return { userId: null, error: { message: 'Sign in to save items.' } }
  }
  return { userId: data.user.id, error: null }
}

export const favoriteService = {
  /** Set of listing ids the signed-in user has saved. Empty when signed out. */
  async getMyFavoriteIds(): Promise<ServiceResult<Set<UUID>>> {
    const auth = await requireUserId()
    if (!auth.userId) return { data: new Set<UUID>(), error: null }

    const { data, error } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', auth.userId)

    if (error) {
      console.error('[favoriteService.getMyFavoriteIds]', error)
      return { data: null, error: describeError(error, 'Could not load saved items.') }
    }

    return {
      data: new Set((data ?? []).map((r) => (r as { listing_id: UUID }).listing_id)),
      error: null,
    }
  },

  async isFavorite(listingId: UUID): Promise<boolean> {
    const auth = await requireUserId()
    if (!auth.userId) return false

    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('listing_id', listingId)
      .maybeSingle()

    if (error) {
      console.error('[favoriteService.isFavorite]', error)
      return false
    }
    return !!data
  },

  /** Idempotent: saving twice is a no-op, not an error. */
  async addFavorite(listingId: UUID): Promise<ServiceResult<true>> {
    const auth = await requireUserId()
    if (auth.userId == null) return { data: null, error: auth.error }

    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: auth.userId, listing_id: listingId })

    if (error) {
      if (error.code === '23505') return { data: true, error: null } // already saved
      console.error('[favoriteService.addFavorite]', error)
      return { data: null, error: describeError(error, 'Could not save this item.') }
    }
    return { data: true, error: null }
  },

  async removeFavorite(listingId: UUID): Promise<ServiceResult<true>> {
    const auth = await requireUserId()
    if (auth.userId == null) return { data: null, error: auth.error }

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', auth.userId)
      .eq('listing_id', listingId)

    if (error) {
      console.error('[favoriteService.removeFavorite]', error)
      return { data: null, error: describeError(error, 'Could not remove this item.') }
    }
    return { data: true, error: null }
  },

  /** Convenience for the heart button. Returns the NEW saved state. */
  async toggleFavorite(
    listingId: UUID,
    currentlySaved: boolean
  ): Promise<ServiceResult<boolean>> {
    const result = currentlySaved
      ? await favoriteService.removeFavorite(listingId)
      : await favoriteService.addFavorite(listingId)

    if (result.error) return { data: null, error: result.error }
    return { data: !currentlySaved, error: null }
  },

  async countMyFavorites(): Promise<number> {
    const auth = await requireUserId()
    if (!auth.userId) return 0

    const { count, error } = await supabase
      .from('favorites')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId)

    if (error) {
      console.error('[favoriteService.countMyFavorites]', error)
      return 0
    }
    return count ?? 0
  },

  /** Saved listings with enough detail to render cards on a saved-items view. */
  /** Saved listings with enough detail to render cards on a saved-items view. */
/** Saved listings with enough detail to render cards on a saved-items view. */
async getMyFavoriteListings(): Promise<
  ServiceResult<
    {
      listing_id: UUID
      title: string
      price: number | string
      city: string
      condition: string
      seller_full_name: string
      status: string
      cover_image_path: string | null
    }[]
  >
> {
  const auth = await requireUserId()
  if (!auth.userId) return { data: [], error: null }

  // 1. Get the user's saved listings.
  const { data, error } = await supabase
    .from('favorites')
    .select(
      `
      listing_id,
      created_at,
      listing:listings(
        id,
        title,
        price,
        city,
        condition,
        status,
        seller_id,
        listing_images(
          storage_path,
          sort_order
        )
      )
      `
    )
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[favoriteService.getMyFavoriteListings]', error)
    return {
      data: null,
      error: describeError(error, 'Could not load saved items.'),
    }
  }

  // 2. Extract the listings and seller IDs.
  const listingRows = (data ?? []).map((row) => {
    const r = row as unknown as {
      listing_id: UUID
      listing: {
        title: string
        price: number | string
        city: string
        condition: string
        status: string
        seller_id: UUID
        listing_images?: {
          storage_path: string
          sort_order: number
        }[]
      } | null
    }

    return r
  })

  const sellerIds = [
    ...new Set(
      listingRows
        .map((row) => row.listing?.seller_id)
        .filter((id): id is UUID => Boolean(id))
    ),
  ]

  // 3. Get seller names separately.
  const sellerMap = new Map<UUID, string>()

  if (sellerIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', sellerIds)

    if (profilesError) {
      console.error(
        '[favoriteService.getMyFavoriteListings:profiles]',
        profilesError
      )

      return {
        data: null,
        error: describeError(
          profilesError,
          'Could not load seller information.'
        ),
      }
    }

    for (const profile of profiles ?? []) {
      sellerMap.set(
        profile.id as UUID,
        profile.full_name ?? 'Unknown seller'
      )
    }
  }

  // 4. Build the final Saved Items card data.
  const rows = listingRows.map((r) => {
    const cover = (r.listing?.listing_images ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)[0]

    const sellerId = r.listing?.seller_id

    return {
      listing_id: r.listing_id,
      title: r.listing?.title ?? 'Removed listing',
      price: r.listing?.price ?? 0,
      city: r.listing?.city ?? '',
      condition: r.listing?.condition ?? 'Good',
      seller_full_name: sellerId
        ? sellerMap.get(sellerId) ?? 'Unknown seller'
        : 'Unknown seller',
      status: r.listing?.status ?? 'archived',
      cover_image_path: cover?.storage_path ?? null,
    }
  })

  return { data: rows, error: null }
},
}