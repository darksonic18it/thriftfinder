import { supabase } from '../lib/supabaseClient'
import { describeError } from '../lib/listingMappers'
import { listingImageService } from './listingImageService'
import type {
  BrowseListingRow,
  Listing,
  ListingDetail,
  ListingDetailRow,
  MyStatsRow,
  PublicSellerListingRow,
  PublicSellerStats,
  ServiceResult,
  UUID,
} from '../types/database'

/**
 * Listing service — the ONLY place the app talks to public.listings.
 *
 * Architecture: page/component -> service -> supabase client -> Postgres.
 * Every write also relies on RLS as the final authority; the ownership checks
 * here exist to give a good error message, not to provide security.
 */

export interface CreateListingInput {
  title: string
  description: string
  category: string
  condition: string
  /** Entered as text in the form; validated and sent as a number. */
  price: number
  city: string
  barangay: string
  /** Ordered: index 0 becomes the main photo. No maximum. */
  photos: File[]
}

export interface UpdateListingInput {
  title: string
  description: string
  category: string
  condition: string
  price: number
  city: string
  barangay: string
}

export interface BrowseFilters {
  search?: string
  category?: string
  condition?: string
  minPrice?: number | null
  maxPrice?: number | null
  limit?: number
  offset?: number
}

/** Fields the UI needs for "my listings" rows. */
export interface MyListingRow {
  id: UUID
  title: string
  price: number | string
  status: string
  /** Free text in the DB; run through `asCondition()` before rendering. */
  condition: string
  city: string
  barangay: string
  created_at: string
  cover_image_path: string | null
  /** Seller pin for the public "Featured Finds" row; false pre-migration. */
  is_featured: boolean
}

/** Columns + cover image needed by every MyListingRow query below. */
const MY_LISTING_SELECT_BASE =
  'id, title, price, status, condition, city, barangay, created_at, listing_images(storage_path, sort_order)'

/** Shape returned by the queries above, before cover-image extraction. */
type MyListingQueryRow = MyListingRow & {
  listing_images?: { storage_path: string; sort_order: number }[] | null
}

/** Cover = the image with the lowest sort_order; same rule as browse_listings(). */
function toMyListingRow(row: MyListingQueryRow): MyListingRow {
  const cover = (row.listing_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)[0]

  return {
    id: row.id,
    title: row.title,
    price: row.price,
    status: row.status,
    condition: row.condition,
    city: row.city,
    barangay: row.barangay,
    created_at: row.created_at,
    cover_image_path: cover?.storage_path ?? null,
    is_featured: Boolean((row as { is_featured?: unknown }).is_featured),
  }
}

async function requireUserId(): Promise<
  { userId: UUID; error: null } | { userId: null; error: { message: string } }
> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return { userId: null, error: { message: 'You need to sign in to do that.' } }
  }
  return { userId: data.user.id, error: null }
}

function toNumberSafe(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function myListingSelect(): string {
  // is_featured only exists after the storefront migration; keep the base
  // select as the safe default and add the column opportunistically.
  return `${MY_LISTING_SELECT_BASE}, is_featured`;
}

interface ListingRowsQueryResult {
  data: MyListingQueryRow[] | null
  error: { code?: string; message?: string } | null
}

async function queryListingRows(
  buildQuery: (select: string) => PromiseLike<unknown>,
  fallbackMessage: string
): Promise<ServiceResult<MyListingRow[]>> {
  const withFeatured = (await buildQuery(myListingSelect())) as unknown as ListingRowsQueryResult
  if (!withFeatured.error) {
    return {
      data: ((withFeatured.data ?? []) as MyListingQueryRow[]).map(toMyListingRow),
      error: null,
    };
  }
  const err = withFeatured.error as { code?: string; message?: string };
  const missingColumn =
    err.code === '42703' || /is_featured|column|does not exist/i.test(err.message ?? '');
  if (!missingColumn) {
    console.error('[listingService.myListings]', err);
    return { data: null, error: describeError(withFeatured.error, fallbackMessage) };
  }

  const base = (await buildQuery(MY_LISTING_SELECT_BASE)) as unknown as ListingRowsQueryResult
  if (base.error) {
    console.error('[listingService.myListings]', base.error);
    return { data: null, error: describeError(base.error, fallbackMessage) };
  }
  return {
    data: ((base.data ?? []) as MyListingQueryRow[]).map(toMyListingRow),
    error: null,
  };
}

export const listingService = {
  // -------------------------------------------------------------------
  // CREATE  (FR-003)
  // -------------------------------------------------------------------
  /**
   * Create a listing and all of its photos.
   *
   * Order matters and is forced by the Phase 1A storage policy, which only
   * accepts an upload when a listing row with that id already exists:
   *
   *   1. insert the listing row (seller_id comes from the session, never the
   *      client form)                         -> we now have a real listing id
   *   2. upload every selected file to Storage
   *   3. insert one listing_images row per uploaded file, sort_order = index
   *
   * Rollback: if step 2 or 3 fails, every object uploaded in this attempt is
   * removed from Storage FIRST (the storage DELETE policy needs the listing
   * row to still exist), then the listing row is deleted, which cascades away
   * any listing_images rows. The user is left exactly where they started.
   */
  async createListing(input: CreateListingInput): Promise<ServiceResult<Listing>> {
    const auth = await requireUserId()
    if (auth.userId === null) return { data: null, error: auth.error }
    const sellerId = auth.userId

    // SRS 4.4: "listings without at least one photo cannot be published".
    if (input.photos.length === 0) {
      return { data: null, error: { message: 'Add at least one photo before publishing.' } }
    }

    const { data: created, error: insertError } = await supabase
      .from('listings')
      .insert({
        seller_id: sellerId, // must equal auth.uid(); RLS enforces it too
        title: input.title,
        description: input.description,
        category: input.category,
        condition: input.condition,
        price: input.price,
        city: input.city,
        barangay: input.barangay,
        status: 'active',
      })
      .select('*')
      .single()

    if (insertError || !created) {
      console.error('[listingService.createListing:insert]', insertError)
      return {
        data: null,
        error: describeError(insertError, 'Could not publish the listing.'),
      }
    }

    const listing = created as Listing

    const uploadResult = await listingImageService.uploadFiles(
      sellerId,
      listing.id,
      input.photos,
      0
    )

    if (uploadResult.error) {
      await listingService.hardDeleteListing(listing.id)
      return { data: null, error: uploadResult.error }
    }

    const rowsResult = await listingImageService.insertRows(listing.id, uploadResult.data)

    if (rowsResult.error) {
      await listingImageService.removeObjects(
        uploadResult.data.map((u) => u.storage_path)
      )
      await listingService.hardDeleteListing(listing.id)
      return { data: null, error: rowsResult.error }
    }

    return { data: listing, error: null }
  },

  // -------------------------------------------------------------------
  // READ — Browse (FR-004)
  // -------------------------------------------------------------------
  async browse(filters: BrowseFilters = {}): Promise<ServiceResult<BrowseListingRow[]>> {
    const { data, error } = await supabase.rpc('browse_listings', {
      p_search: filters.search?.trim() || null,
      p_category:
        !filters.category || filters.category === 'All' ? null : filters.category,
      p_condition:
        !filters.condition || filters.condition === 'All' ? null : filters.condition,
      p_min_price: filters.minPrice ?? null,
      p_max_price: filters.maxPrice ?? null,
      p_limit: filters.limit ?? 48,
      p_offset: filters.offset ?? 0,
    })

    if (error) {
      console.error('[listingService.browse]', error)
      return { data: null, error: describeError(error, 'Could not load listings.') }
    }
    return { data: (data ?? []) as BrowseListingRow[], error: null }
  },

  // -------------------------------------------------------------------
  // READ — Listing detail (FR-005)
  // -------------------------------------------------------------------
  async getDetail(listingId: UUID): Promise<ServiceResult<ListingDetail>> {
    const { data, error } = await supabase.rpc('get_listing_detail', {
      p_listing_id: listingId,
    })

    if (error) {
      console.error('[listingService.getDetail]', error)
      return { data: null, error: describeError(error, 'Could not load this listing.') }
    }

    const rows = (data ?? []) as ListingDetailRow[]
    if (rows.length === 0) {
      return { data: null, error: { message: 'Listing not found.', code: 'P0002' } }
    }

    const imagesResult = await listingImageService.listByListing(listingId)
    if (imagesResult.error) {
      return { data: null, error: imagesResult.error }
    }

    return { data: { listing: rows[0], images: imagesResult.data }, error: null }
  },

  // -------------------------------------------------------------------
  // READ — the signed-in seller's own listings (FR-002)
  // -------------------------------------------------------------------
  async getMyListings(options: { status?: 'active' | 'archived' } = {}): Promise<
    ServiceResult<MyListingRow[]>
  > {
    const auth = await requireUserId()
    if (auth.userId === null) return { data: null, error: auth.error }

    return queryListingRows(
      (select) => {
        let query = supabase
          .from('listings')
          .select(select)
          .eq('seller_id', auth.userId)
          .order('created_at', { ascending: false })
        if (options.status) query = query.eq('status', options.status)
        return query
      },
      'Could not load your listings.'
    )
  },

    // -------------------------------------------------------------------
  // READ — public listings by seller (active only, featured first)
  // -------------------------------------------------------------------
  async getPublicListingsBySeller(
    sellerId: UUID
  ): Promise<ServiceResult<PublicSellerListingRow[]>> {
    const viaRpc = await supabase.rpc('get_public_seller_listings', {
      p_seller_id: sellerId,
    })

    if (!viaRpc.error) {
      const rows = ((viaRpc.data ?? []) as PublicSellerListingRow[]).map((row) => ({
        ...row,
        is_featured: Boolean(row.is_featured),
      }))
      return { data: rows, error: null }
    }

    const rpcError = viaRpc.error as { code?: string; message?: string }
    const missingFn =
      rpcError.code === '42883' ||
      /could not find the function|does not exist/i.test(rpcError.message ?? '')
    // Pre-migration DBs may also lack is_featured: fall back to plain query.
    if (!missingFn && !/is_featured|column/i.test(rpcError.message ?? '')) {
      console.error('[listingService.getPublicListingsBySeller]', rpcError)
      return {
        data: null,
        error: describeError(viaRpc.error, 'Could not load this user’s listings.'),
      }
    }

    const fallback = await queryListingRows(
      (select) =>
        supabase
          .from('listings')
          .select(select)
          .eq('seller_id', sellerId)
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
      'Could not load this user’s listings.'
    )

    if (fallback.error || !fallback.data) {
      return { data: null, error: fallback.error ?? { message: 'Could not load this user’s listings.' } }
    }

    const rows: PublicSellerListingRow[] = fallback.data
      .slice()
      .sort((a, b) => Number(b.is_featured) - Number(a.is_featured))

    return { data: rows, error: null }
  },

  /**
   * Public-safe seller aggregates: active listings + completed sales.
   * Rating/review counts stay omitted until a real reviews backend exists.
   */
  async getPublicSellerStats(sellerId: UUID): Promise<ServiceResult<PublicSellerStats>> {
    const { data, error } = await supabase.rpc('get_public_seller_stats', {
      p_seller_id: sellerId,
    })

    if (error) {
      const err = error as { code?: string; message?: string }
      if (err.code === '42883' || /could not find the function|does not exist/i.test(err.message ?? '')) {
        return { data: null, error: { message: 'Seller stats are not available yet.' } }
      }
      console.error('[listingService.getPublicSellerStats]', error)
      return { data: null, error: describeError(error, 'Could not load seller stats.') }
    }

    const row = ((data ?? []) as Array<{ active_listings: unknown; sold_listings: unknown }>)[0]
    return {
      data: {
        active_listings: toNumberSafe(row?.active_listings),
        sold_listings: toNumberSafe(row?.sold_listings),
      },
      error: null,
    }
  },

  /**
   * Toggle the seller-controlled "Featured" pin (owner only, max 3 active).
   * The DB trigger enforces the limit; its message is surfaced as-is.
   */
  async setFeatured(listingId: UUID, featured: boolean): Promise<ServiceResult<true>> {
    const auth = await requireUserId()
    if (auth.userId === null) return { data: null, error: auth.error }

    const { error } = await supabase
      .from('listings')
      .update({ is_featured: featured })
      .eq('id', listingId)
      .eq('seller_id', auth.userId)

    if (error) {
      const err = error as { code?: string; message?: string }
      if (err.code === '42703' || /is_featured|column|does not exist/i.test(err.message ?? '')) {
        return { data: null, error: { message: 'Featuring listings is not available yet.' } }
      }
      console.error('[listingService.setFeatured]', error)
      if (/feature up to 3/i.test(err.message ?? '')) {
        return { data: null, error: { message: 'You can feature up to 3 listings at a time.' } }
      }
      return { data: null, error: describeError(error, 'Could not update the featured listing.') }
    }

    return { data: true, error: null }
  },

  /** Raw row + images for the edit form. Owner only (checked here and by RLS). */
  async getForEdit(listingId: UUID): Promise<
    ServiceResult<{ listing: Listing; images: { id: UUID; storage_path: string; sort_order: number }[] }>
  > {
    const auth = await requireUserId()
    if (auth.userId == null) return { data: null, error: auth.error }

    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .maybeSingle()

    if (error) {
      console.error('[listingService.getForEdit]', error)
      return { data: null, error: describeError(error, 'Could not load the listing.') }
    }
    if (!data) {
      return { data: null, error: { message: 'Listing not found.', code: 'P0002' } }
    }

    const listing = data as Listing
    if (listing.seller_id !== auth.userId) {
      return { data: null, error: { message: 'You can only edit your own listings.', code: '42501' } }
    }

    const imagesResult = await listingImageService.listByListing(listingId)
    if (imagesResult.error) return { data: null, error: imagesResult.error }

    return {
      data: {
        listing,
        images: imagesResult.data.map((img) => ({
          id: img.id,
          storage_path: img.storage_path,
          sort_order: img.sort_order,
        })),
      },
      error: null,
    }
  },

  // -------------------------------------------------------------------
  // UPDATE (FR-003)
  // -------------------------------------------------------------------
  async updateListing(
    listingId: UUID,
    patch: UpdateListingInput
  ): Promise<ServiceResult<Listing>> {
    const auth = await requireUserId()
    if (auth.userId === null) return { data: null, error: auth.error }

    const { data, error } = await supabase
      .from('listings')
      .update({
        title: patch.title,
        description: patch.description,
        category: patch.category,
        condition: patch.condition,
        price: patch.price,
        city: patch.city,
        barangay: patch.barangay,
      })
      .eq('id', listingId)
      .eq('seller_id', auth.userId) // belt; RLS is the braces
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('[listingService.updateListing]', error)
      return { data: null, error: describeError(error, 'Could not save your changes.') }
    }
    if (!data) {
      return {
        data: null,
        error: { message: 'You can only edit your own listings.', code: '42501' },
      }
    }

    return { data: data as Listing, error: null }
  },

  /**
   * Apply photo changes for an existing listing in one call.
   *
   * @param keptImageIds  existing image ids, in their FINAL display order
   * @param removedImageIds existing image ids the user deleted
   * @param newPhotos     newly picked files, appended after the kept ones
   *
   * Only the images named in `removedImageIds` are deleted — removing one
   * photo never wipes the rest.
   */
  async updateListingImages(
    listingId: UUID,
    args: { keptImageIds: UUID[]; removedImageIds: UUID[]; newPhotos: File[] }
  ): Promise<ServiceResult<true>> {
    const auth = await requireUserId()
    if (auth.userId === null) return { data: null, error: auth.error }
    const sellerId = auth.userId

    if (args.keptImageIds.length === 0 && args.newPhotos.length === 0) {
      return {
        data: null,
        error: { message: 'A listing needs at least one photo.' },
      }
    }

    // 1. delete removed images (rows + objects)
    if (args.removedImageIds.length > 0) {
      const removeResult = await listingImageService.deleteImages(args.removedImageIds)
      if (removeResult.error) return { data: null, error: removeResult.error }
    }

    // 2. push surviving rows into the high offset range so new photos can
    //    claim their final slots without violating UNIQUE(listing_id, sort_order)
    if (args.keptImageIds.length > 0) {
      const reorderResult = await listingImageService.reorder(listingId, args.keptImageIds)
      if (reorderResult.error) return { data: null, error: reorderResult.error }
      // reorder() already settles them at 0..n-1, which is what we want when
      // there are no new photos. When there ARE new photos we simply append.
    }

    // 3. upload + record the new photos after the kept ones
    if (args.newPhotos.length > 0) {
      const startAt = args.keptImageIds.length
      const uploadResult = await listingImageService.uploadFiles(
        sellerId,
        listingId,
        args.newPhotos,
        startAt
      )
      if (uploadResult.error) return { data: null, error: uploadResult.error }

      const rowsResult = await listingImageService.insertRows(listingId, uploadResult.data)
      if (rowsResult.error) {
        // roll back just this batch of uploads; existing photos are untouched
        await listingImageService.removeObjects(
          uploadResult.data.map((u) => u.storage_path)
        )
        return { data: null, error: rowsResult.error }
      }
    }

    return { data: true, error: null }
  },

  // -------------------------------------------------------------------
    // -------------------------------------------------------------------
  // ARCHIVE / DELETE (FR-003)
  // -------------------------------------------------------------------

  /**
   * The normal "remove this listing" action.
   *
   * Archive is still available for flows that need to preserve reservation
   * history without permanently removing the listing.
   */
  async archiveListing(listingId: UUID): Promise<ServiceResult<true>> {
    const auth = await requireUserId()
    if (auth.userId === null) return { data: null, error: auth.error }

    const { data, error } = await supabase
      .from('listings')
      .update({ status: 'archived' })
      .eq('id', listingId)
      .eq('seller_id', auth.userId)
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('[listingService.archiveListing]', error)
      return {
        data: null,
        error: describeError(error, 'Could not archive the listing.'),
      }
    }

    if (!data) {
      return {
        data: null,
        error: {
          message: 'You can only archive your own listings.',
          code: '42501',
        },
      }
    }

    return { data: true, error: null }
  },

  async unarchiveListing(listingId: UUID): Promise<ServiceResult<true>> {
    const auth = await requireUserId()
    if (auth.userId == null) return { data: null, error: auth.error }

    const { data, error } = await supabase
      .from('listings')
      .update({ status: 'active' })
      .eq('id', listingId)
      .eq('seller_id', auth.userId)
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('[listingService.unarchiveListing]', error)
      return {
        data: null,
        error: describeError(error, 'Could not restore the listing.'),
      }
    }

    if (!data) {
      return {
        data: null,
        error: {
          message: 'You can only restore your own listings.',
          code: '42501',
        },
      }
    }

    return { data: true, error: null }
  },

  /**
   * Check whether a listing has reservation records before showing the
   * permanent-delete confirmation.
   */
  async getDeleteInfo(
    listingId: UUID
  ): Promise<ServiceResult<{ hasReservations: boolean }>> {
    const auth = await requireUserId()

    if (auth.userId === null) {
      return { data: null, error: auth.error }
    }

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id')
      .eq('id', listingId)
      .eq('seller_id', auth.userId)
      .maybeSingle()

    if (listingError) {
      console.error('[listingService.getDeleteInfo:listing]', listingError)

      return {
        data: null,
        error: describeError(
          listingError,
          'Could not verify the listing.'
        ),
      }
    }

    if (!listing) {
      return {
        data: null,
        error: {
          message: 'You can only delete your own listings.',
          code: '42501',
        },
      }
    }

    const { count, error: reservationError } = await supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId)

    if (reservationError) {
      console.error(
        '[listingService.getDeleteInfo:reservations]',
        reservationError
      )

      return {
        data: null,
        error: describeError(
          reservationError,
          'Could not check the listing reservations.'
        ),
      }
    }

    return {
      data: {
        hasReservations: (count ?? 0) > 0,
      },
      error: null,
    }
  },

  /**
   * Permanently delete a listing and its listing images.
   *
   * Storage objects are removed BEFORE the listing row because the Storage
   * DELETE policy requires the owning listing to still exist.
   *
   * The existing database ON DELETE CASCADE behavior will remove related
   * listing_images rows and any reservations associated with this listing.
   */
  async hardDeleteListing(
    listingId: UUID
  ): Promise<ServiceResult<{ deleted: true; hadReservations: boolean }>> {
    const auth = await requireUserId()

    if (auth.userId === null) {
      return { data: null, error: auth.error }
    }

    // Verify that the signed-in user owns this listing.
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id')
      .eq('id', listingId)
      .eq('seller_id', auth.userId)
      .maybeSingle()

    if (listingError) {
      console.error(
        '[listingService.hardDeleteListing:listing]',
        listingError
      )

      return {
        data: null,
        error: describeError(
          listingError,
          'Could not verify the listing.'
        ),
      }
    }

    if (!listing) {
      return {
        data: null,
        error: {
          message: 'You can only delete your own listings.',
          code: '42501',
        },
      }
    }

    // Check reservation history before doing anything destructive.
    const { count, error: reservationError } = await supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId)

    if (reservationError) {
      console.error(
        '[listingService.hardDeleteListing:reservations]',
        reservationError
      )

      return {
        data: null,
        error: describeError(
          reservationError,
          'Could not check the listing reservations.'
        ),
      }
    }

    const hadReservations = (count ?? 0) > 0

    // Get all listing images before deleting the listing.
    const imagesResult = await listingImageService.listByListing(listingId)

    if (imagesResult.error) {
      return {
        data: null,
        error: imagesResult.error,
      }
    }

    // Storage objects must be deleted before the listing row.
    if (imagesResult.data && imagesResult.data.length > 0) {
      await listingImageService.removeObjects(
        imagesResult.data.map((img) => img.storage_path)
      )
    }

    // Delete the listing itself.
    //
    // The database FK will cascade to listing_images and reservations.
    const { data, error } = await supabase
      .from('listings')
      .delete()
      .eq('id', listingId)
      .eq('seller_id', auth.userId)
      .select('id')
      .maybeSingle()

    if (error) {
      console.error(
        '[listingService.hardDeleteListing]',
        error
      )

      return {
        data: null,
        error: describeError(
          error,
          'Could not delete the listing.'
        ),
      }
    }

    if (!data) {
      return {
        data: null,
        error: {
          message: 'The listing could not be deleted.',
          code: 'P0001',
        },
      }
    }

    return {
      data: {
        deleted: true,
        hadReservations,
      },
      error: null,
    }
  },

  // -------------------------------------------------------------------
  // STATS (dashboard / profile)
  // -------------------------------------------------------------------
  async getMyStats(): Promise<ServiceResult<MyStatsRow>> {
    const { data, error } = await supabase.rpc('get_my_stats')

    if (error) {
      console.error('[listingService.getMyStats]', error)
      return { data: null, error: describeError(error, 'Could not load your stats.') }
    }

    const rows = (data ?? []) as MyStatsRow[]
    const empty: MyStatsRow = {
      active_listings: 0,
      archived_listings: 0,
      reserved_listings: 0,
      sold_listings: 0,
      my_active_reservations: 0,
      my_past_reservations: 0,
      incoming_reservations: 0,
    }
    return { data: rows[0] ?? empty, error: null }
  },
}