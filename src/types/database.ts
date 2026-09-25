// Centralized application/database types for Supabase.
//
// Phase 2 decision: we KEEP these hand-written types rather than switching to
// `supabase gen types typescript`. Reasons:
//   * The generated file would need to be regenerated after every migration
//     and committed — extra ceremony for a two-person capstone.
//   * Our RPCs (browse_listings, get_listing_detail, get_my_stats) return
//     shapes that we want to name explicitly anyway.
//   * The existing code (AuthContext, profileService) already imports from
//     here; changing the source would ripple through Phase 1 code for no
//     functional gain.
// If you later decide to generate types, generate into
// `src/types/supabase.generated.ts` and re-export from this file — do NOT
// keep two competing definitions of Listing/Profile.

export type UUID = string

export type ListingCategory =
  | 'Clothing'
  | 'Shoes'
  | 'Accessories'
  | 'Electronics'
  | 'Collectibles'
  | 'Bags'
  | 'Vintage'
  | 'Furniture'
  | 'Books'
  | 'Sports'
  | 'Others'

export type ListingCondition = 'Like New' | 'Excellent' | 'Good' | 'Fair'

export type ListingStatus = 'active' | 'archived'

export type ReservationStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Completed'
  | 'Cancelled'
  | 'Expired'

export const LISTING_CATEGORIES: ListingCategory[] = [
  'Clothing',
  'Shoes',
  'Accessories',
  'Electronics',
  'Collectibles',
  'Bags',
  'Vintage',
  'Furniture',
  'Books',
  'Sports',
  'Others',
]

export const LISTING_CONDITIONS: ListingCondition[] = [
  'Like New',
  'Excellent',
  'Good',
  'Fair',
]

/** Supabase Storage bucket created by the Phase 1A migration. */
export const LISTING_PHOTOS_BUCKET = 'listing-photos'

// ---------------------------------------------------------------------
// Table rows
// ---------------------------------------------------------------------

export interface Profile {
  id: UUID
  full_name: string
  contact_phone: string | null
  avatar_path: string | null
  created_at: string
  updated_at: string
}

export interface Listing {
  id: UUID
  seller_id: UUID
  title: string
  description: string
  category: ListingCategory | string
  condition: ListingCondition | string
  /**
   * numeric(12,2). PostgREST may serialise this as a number or a string
   * depending on the driver/version — always run it through `toNumber()`
   * from src/lib/listingMappers.ts before doing arithmetic or formatting.
   */
  price: number | string
  city: string
  barangay: string
  status: ListingStatus | string
  created_at: string
  updated_at: string
}

export interface ListingImage {
  id: UUID
  listing_id: UUID
  storage_path: string
  sort_order: number
  created_at: string
}

export interface Reservation {
  id: UUID
  listing_id: UUID
  buyer_id: UUID
  status: ReservationStatus | string
  expires_at: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

/** OPTIONAL module — only exists if migration 04 was applied. */
export interface Favorite {
  id: UUID
  user_id: UUID
  listing_id: UUID
  created_at: string
}

// ---------------------------------------------------------------------
// RPC return shapes (migration 03)
// ---------------------------------------------------------------------

/** One row of public.browse_listings(...) */
export interface BrowseListingRow {
  id: UUID
  seller_id: UUID
  title: string
  description: string
  category: string
  condition: string
  price: number | string
  city: string
  barangay: string
  created_at: string
  seller_full_name: string
  cover_image_path: string | null
  image_count: number
  is_reserved: boolean
}

/** The single row returned by public.get_listing_detail(uuid) */
export interface ListingDetailRow {
  id: UUID
  seller_id: UUID
  title: string
  description: string
  category: string
  condition: string
  price: number | string
  city: string
  barangay: string
  status: ListingStatus | string
  created_at: string
  updated_at: string
  seller_full_name: string
  seller_active_listings: number
  seller_member_since: string | null
  is_reserved: boolean
  reservation_status: ReservationStatus | null
  reservation_expires_at: string | null
  viewer_is_seller: boolean
  viewer_reservation_id: UUID | null
  viewer_reservation_status: ReservationStatus | null
}

/** The single row returned by public.get_my_stats() */
export interface MyStatsRow {
  active_listings: number
  archived_listings: number
  reserved_listings: number
  sold_listings: number
  my_active_reservations: number
  my_past_reservations: number
  incoming_reservations: number
}

// ---------------------------------------------------------------------
// Service-layer view models
// ---------------------------------------------------------------------

/** A listing plus everything the detail page needs, already normalised. */
export interface ListingDetail {
  listing: ListingDetailRow
  images: ListingImage[]
}

/** A reservation joined with the minimum listing context the UI shows. */
export interface ReservationWithListing extends Reservation {
  listing: {
    id: UUID
    title: string
    price: number | string
    city: string
    seller_id: UUID
    status: string
    seller: {
      full_name: string
    } | null
  } | null
}

/** Uniform error shape returned by every Phase 2 service call. */
export interface ServiceError {
  message: string
  /** Postgres / PostgREST code when available, e.g. '23505', '42501'. */
  code?: string
}

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: ServiceError }