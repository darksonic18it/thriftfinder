import { supabase } from './supabaseClient'
import type { Product } from '../components/ProductCard'
import {
  LISTING_PHOTOS_BUCKET,
  type BrowseListingRow,
  type ListingCondition,
  type ServiceError,
} from '../types/database'

/**
 * Small shared helpers used by the services and the pages.
 * Deliberately one file: these are five tiny functions, not a "utils layer".
 */

/** numeric(12,2) can arrive as a string; normalise it before formatting. */
export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/** ₱1,250 — matches the existing `₱${price.toLocaleString()}` formatting. */
export function formatPeso(value: number | string | null | undefined): string {
  return `₱${toNumber(value).toLocaleString('en-PH')}`
}

const VALID_CONDITIONS: ListingCondition[] = ['Like New', 'Excellent', 'Good', 'Fair']

/** The UI's Product type has a closed condition union; DB stores free text. */
export function asCondition(value: string | null | undefined): ListingCondition {
  return VALID_CONDITIONS.includes(value as ListingCondition)
    ? (value as ListingCondition)
    : 'Good'
}

/**
 * Inline placeholder so a listing that somehow has no image row still renders
 * without a broken <img>. It is NOT mock marketplace data — it carries no
 * fake product information.
 */
export const IMAGE_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
       <rect width="600" height="600" fill="#f1f5f9"/>
       <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
             font-family="sans-serif" font-size="26" fill="#94a3b8">No photo</text>
     </svg>`
  )

/**
 * Build a browser-usable URL for an object in the listing-photos bucket.
 * The bucket is PUBLIC (created that way by the Phase 1A migration), so a
 * public URL is correct here and needs no signing round-trip.
 */
export function listingImageUrl(storagePath: string | null | undefined): string {
  if (!storagePath) return IMAGE_PLACEHOLDER
  const { data } = supabase.storage.from(LISTING_PHOTOS_BUCKET).getPublicUrl(storagePath)
  return data.publicUrl || IMAGE_PLACEHOLDER
}

/**
 * Strip anything that could break a Storage key or leak information.
 * Keeps the extension, drops paths, unicode, spaces and control characters.
 */
export function sanitizeFileName(name: string): string {
  const cleaned = (name || 'photo')
    .split(/[\\/]/)
    .pop()!
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+/, '')
    .toLowerCase()

  const safe = cleaned || 'photo'
  // Storage keys must stay short; 60 chars is plenty for a filename segment.
  return safe.length > 60 ? safe.slice(safe.length - 60) : safe
}

/** Short random token so re-ordering never collides with an existing key. */
export function randomToken(): string {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * Storage key convention, matching the Phase 1A migration comment:
 *   <seller_id>/<listing_id>/<sort_order>_<file>
 * The RLS policy on storage.objects only inspects segments 1 and 2
 * (seller id, listing id), so the third segment is free-form. A random token
 * is added so a photo keeps a stable key even when its sort_order changes.
 */
export function buildListingImagePath(
  sellerId: string,
  listingId: string,
  sortOrder: number,
  fileName: string
): string {
  const ordinal = String(sortOrder).padStart(4, '0')
  return `${sellerId}/${listingId}/${ordinal}_${randomToken()}_${sanitizeFileName(fileName)}`
}

/** Map a browse_listings() row onto the existing ProductCard shape. */
export function browseRowToProduct(row: BrowseListingRow): Product {
  const locationParts = [row.barangay, row.city].filter(
    (part) => !!part && part.trim().length > 0
  )

  return {
    id: row.id,
    name: row.title,
    price: toNumber(row.price),
    condition: asCondition(row.condition),
    location: locationParts.join(', ') || row.city,
    seller: row.seller_full_name,
    image: listingImageUrl(row.cover_image_path),
    // Reuses the existing `product-tag` pill instead of adding a new element.
    tag: row.is_reserved ? 'Reserved' : undefined,
  }
}

/**
 * Turn a Supabase/PostgREST error into something a human can act on.
 * Never swallow the original — services log it before calling this.
 */
export function describeError(
  error: { message?: string; code?: string; details?: string } | null,
  fallback = 'Something went wrong. Please try again.'
): ServiceError {
  if (!error) return { message: fallback }

  const code = error.code
  const raw = error.message || ''

  if (code === '23505') {
    return { message: 'That already exists.', code }
  }
  if (code === '42501' || /row-level security/i.test(raw)) {
    return {
      message:
        'You do not have permission to do that. If you just signed up, confirm your email address first.',
      code,
    }
  }
  if (code === 'P0002' || /not found/i.test(raw)) {
    return { message: 'We could not find that item.', code }
  }
  if (/Failed to fetch|NetworkError|fetch failed/i.test(raw)) {
    return { message: 'Network problem. Check your connection and try again.', code }
  }

  return { message: raw || fallback, code }
}