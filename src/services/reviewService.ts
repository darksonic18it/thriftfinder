import { supabase } from '../lib/supabaseClient'
import { describeError } from '../lib/listingMappers'
import type {
  Review,
  ReviewableReservation,
  SellerReviewRow,
  SellerReviewSummary,
  ServiceResult,
  UUID,
} from '../types/database'

/**
 * Review service — FR-011 (seller ratings and reviews).
 *
 * What the DATABASE owns (see 2026-10-09_reviews.sql) and this file therefore
 * does NOT try to enforce:
 *   * only the buyer of a reservation can review it
 *   * the reservation must be 'Completed'
 *   * listing_id and seller_id are derived from the reservation
 *   * one review per (reservation, reviewer)
 *   * rating 1..5, comment <= 500 chars, no self-review
 *   * "email must be verified" (RLS)
 *
 * This file calls those rules correctly and turns their errors into
 * sentences a user can understand.
 */

const REVIEW_COLUMNS =
  'id, reservation_id, listing_id, reviewer_id, seller_id, rating, comment, created_at, updated_at'

const EMPTY_SUMMARY: SellerReviewSummary = {
  average_rating: 0,
  review_count: 0,
  count_1: 0,
  count_2: 0,
  count_3: 0,
  count_4: 0,
  count_5: 0,
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function isMissingRelation(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42883' ||
    error.code === '42P01' ||
    /does not exist|could not find the function|relation .* does not exist/i.test(
      error.message ?? ''
    )
  )
}

function translateWriteError(
  error: { code?: string; message?: string },
  fallback: string
): { message: string; code?: string } {
  const raw = error.message ?? ''
  if (error.code === '23505') {
    return { message: 'You already reviewed this purchase.', code: error.code }
  }
  if (/only the buyer/i.test(raw)) {
    return { message: 'Only the buyer can review this reservation.', code: 'P0001' }
  }
  if (/completed reservation/i.test(raw)) {
    return {
      message: 'You can review a seller after your reservation is completed.',
      code: 'P0001',
    }
  }
  if (/reviews_rating_range/i.test(raw)) {
    return { message: 'Pick a rating from 1 to 5 stars.', code: error.code }
  }
  if (/reviews_comment_length/i.test(raw)) {
    return { message: 'Keep your comment under 500 characters.', code: error.code }
  }
  if (/reviews_no_self/i.test(raw)) {
    return { message: 'You cannot review yourself.', code: error.code }
  }
  return describeError(error, fallback)
}

export const reviewService = {
  // -------------------------------------------------------------------
  // READ (public)
  // -------------------------------------------------------------------
  /** Average rating, count and 1-5 star breakdown for a seller. */
  async getSellerSummary(sellerId: UUID): Promise<ServiceResult<SellerReviewSummary>> {
    const { data, error } = await supabase.rpc('get_seller_review_summary', {
      p_seller_id: sellerId,
    })

    if (error) {
      // Pre-migration database: show an honest empty state instead of an error.
      if (isMissingRelation(error)) return { data: EMPTY_SUMMARY, error: null }
      console.error('[reviewService.getSellerSummary]', error)
      return { data: null, error: describeError(error, 'Could not load ratings.') }
    }

    const row = ((data ?? []) as Array<Record<string, unknown>>)[0]
    if (!row) return { data: EMPTY_SUMMARY, error: null }

    return {
      data: {
        average_rating: toNumber(row.average_rating),
        review_count: toNumber(row.review_count),
        count_1: toNumber(row.count_1),
        count_2: toNumber(row.count_2),
        count_3: toNumber(row.count_3),
        count_4: toNumber(row.count_4),
        count_5: toNumber(row.count_5),
      },
      error: null,
    }
  },

  /** Newest-first public reviews for a seller, with reviewer display name. */
  async getSellerReviews(
    sellerId: UUID,
    options: { limit?: number; offset?: number } = {}
  ): Promise<ServiceResult<SellerReviewRow[]>> {
    const { data, error } = await supabase.rpc('get_seller_reviews', {
      p_seller_id: sellerId,
      p_limit: options.limit ?? 20,
      p_offset: options.offset ?? 0,
    })

    if (error) {
      if (isMissingRelation(error)) return { data: [], error: null }
      console.error('[reviewService.getSellerReviews]', error)
      return { data: null, error: describeError(error, 'Could not load reviews.') }
    }

    const rows = ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      ...(r as unknown as SellerReviewRow),
      rating: toNumber(r.rating),
    }))
    return { data: rows, error: null }
  },

  // -------------------------------------------------------------------
  // ELIGIBILITY
  // -------------------------------------------------------------------
  /**
   * The signed-in buyer's Completed reservations with this seller that have
   * no review yet. Empty when signed out or not eligible.
   */
  async getReviewableReservations(
    sellerId: UUID
  ): Promise<ServiceResult<ReviewableReservation[]>> {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user || auth.user.id === sellerId) return { data: [], error: null }

    const { data, error } = await supabase.rpc('get_reviewable_reservations', {
      p_seller_id: sellerId,
    })

    if (error) {
      if (isMissingRelation(error)) return { data: [], error: null }
      console.error('[reviewService.getReviewableReservations]', error)
      return { data: null, error: describeError(error, 'Could not check review eligibility.') }
    }
    return { data: (data ?? []) as ReviewableReservation[], error: null }
  },

  // -------------------------------------------------------------------
  // WRITE (buyer only; enforced by RLS + trigger)
  // -------------------------------------------------------------------
  async submitReview(args: {
    reservationId: UUID
    rating: number
    comment?: string
  }): Promise<ServiceResult<Review>> {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) {
      return { data: null, error: { message: 'Sign in to leave a review.' } }
    }

    const rating = Math.round(args.rating)
    if (!(rating >= 1 && rating <= 5)) {
      return { data: null, error: { message: 'Pick a rating from 1 to 5 stars.' } }
    }

    const comment = (args.comment ?? '').trim()
    if (comment.length > 500) {
      return { data: null, error: { message: 'Keep your comment under 500 characters.' } }
    }

    // listing_id / seller_id are filled in by the database trigger.
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        reservation_id: args.reservationId,
        reviewer_id: auth.user.id,
        rating,
        comment: comment.length > 0 ? comment : null,
      })
      .select(REVIEW_COLUMNS)
      .single()

    if (error) {
      console.error('[reviewService.submitReview]', error)
      return { data: null, error: translateWriteError(error, 'Could not submit your review.') }
    }
    return { data: data as Review, error: null }
  },

  /** Edit your own rating/comment. */
  async updateReview(
    reviewId: UUID,
    patch: { rating?: number; comment?: string | null }
  ): Promise<ServiceResult<Review>> {
    const update: { rating?: number; comment?: string | null } = {}
    if (patch.rating !== undefined) update.rating = Math.round(patch.rating)
    if (patch.comment !== undefined) {
      const trimmed = (patch.comment ?? '').trim()
      update.comment = trimmed.length > 0 ? trimmed : null
    }

    const { data, error } = await supabase
      .from('reviews')
      .update(update)
      .eq('id', reviewId)
      .select(REVIEW_COLUMNS)
      .maybeSingle()

    if (error) {
      console.error('[reviewService.updateReview]', error)
      return { data: null, error: translateWriteError(error, 'Could not update your review.') }
    }
    if (!data) {
      return {
        data: null,
        error: { message: 'You can only edit your own reviews.', code: '42501' },
      }
    }
    return { data: data as Review, error: null }
  },

  /** Delete your own review. */
  async deleteReview(reviewId: UUID): Promise<ServiceResult<true>> {
    const { data, error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .select('id')

    if (error) {
      console.error('[reviewService.deleteReview]', error)
      return { data: null, error: describeError(error, 'Could not delete your review.') }
    }
    if (!data || data.length === 0) {
      return {
        data: null,
        error: { message: 'You can only delete your own reviews.', code: '42501' },
      }
    }
    return { data: true, error: null }
  },
}