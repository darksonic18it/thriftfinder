import { supabase } from '../lib/supabaseClient'
import { describeError } from '../lib/listingMappers'
import { listingImageService } from './listingImageService'
import type {
  BrowseListingRow,
  Listing,
  ListingDetail,
  ListingDetailRow,
  MyStatsRow,
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
  city: string
  created_at: string
  cover_image_path: string | null
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

    let query = supabase
      .from('listings')
      .select('id, title, price, status, city, created_at, listing_images(storage_path, sort_order)')
      .eq('seller_id', auth.userId)
      .order('created_at', { ascending: false })

    if (options.status) query = query.eq('status', options.status)

    const { data, error } = await query

    if (error) {
      console.error('[listingService.getMyListings]', error)
      return { data: null, error: describeError(error, 'Could not load your listings.') }
    }

    const rows: MyListingRow[] = (data ?? []).map((row) => {
      const r = row as MyListingRow & {
        listing_images?: { storage_path: string; sort_order: number }[]
      }
      const cover = (r.listing_images ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)[0]

      return {
        id: r.id,
        title: r.title,
        price: r.price,
        status: r.status,
        city: r.city,
        created_at: r.created_at,
        cover_image_path: cover?.storage_path ?? null,
      }
    })

    return { data: rows, error: null }
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
  // ARCHIVE / DELETE (FR-003)
  // -------------------------------------------------------------------
  /**
   * The normal "remove this listing" action.
   *
   * Archive (not hard delete) is the right default here because
   * reservations.listing_id is ON DELETE CASCADE — a hard delete would erase
   * the buyer's reservation history along with the listing, breaking FR-007
   * (both parties can see reservation state) and the Low-priority FR-011
   * ratings that hang off completed reservations. Archived listings are
   * excluded from browse_listings(), so FR-003's acceptance criterion —
   * "a deleted listing no longer appears in browse or search results" — still
   * holds.
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
      return { data: null, error: describeError(error, 'Could not archive the listing.') }
    }
    if (!data) {
      return {
        data: null,
        error: { message: 'You can only archive your own listings.', code: '42501' },
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
      return { data: null, error: describeError(error, 'Could not restore the listing.') }
    }
    if (!data) {
      return { data: null, error: { message: 'You can only restore your own listings.', code: '42501' } }
    }
    return { data: true, error: null }
  },

  /**
   * Permanent removal. Used by the create-listing rollback, and available to
   * a seller for a listing that was never reserved. Storage objects are
   * removed BEFORE the row, because the storage DELETE policy checks that the
   * owning listing still exists.
   */
  async hardDeleteListing(listingId: UUID): Promise<ServiceResult<true>> {
    const imagesResult = await listingImageService.listByListing(listingId)
    if (imagesResult.data && imagesResult.data.length > 0) {
      await listingImageService.removeObjects(
        imagesResult.data.map((img) => img.storage_path)
      )
    }

    const { error } = await supabase.from('listings').delete().eq('id', listingId)

    if (error) {
      console.error('[listingService.hardDeleteListing]', error)
      return { data: null, error: describeError(error, 'Could not delete the listing.') }
    }
    return { data: true, error: null }
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