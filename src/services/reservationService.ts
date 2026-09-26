import { supabase } from '../lib/supabaseClient'
import { describeError } from '../lib/listingMappers'
import type {
  Reservation,
  ReservationWithListing,
  ServiceResult,
  UUID,
} from '../types/database'

/**
 * Reservation service — FR-006 (reserve item) and FR-007 (status tracking).
 *
 * What the DATABASE owns (see migration 02) and this file therefore does NOT
 * try to set:
 *   * status on insert is always 'Pending'
 *   * expires_at = now() + reservation_holding_period()  (48h)
 *   * resolved_at when a terminal state is reached
 *   * "one active reservation per listing"  (partial unique index)
 *   * "only the seller can Confirm/Complete" (transition trigger)
 *   * "email must be verified"               (RLS)
 *   * "cannot reserve your own listing"      (insert trigger + RLS)
 *
 * This file's job is to call those rules correctly and translate their errors
 * into sentences a buyer or seller can understand.
 */

const SELECT_WITH_LISTING =
  'id, listing_id, buyer_id, status, expires_at, resolved_at, created_at, updated_at, ' +
  'listing:listings(id, title, price, city, seller_id, status, seller:profiles!seller_id(id, full_name))'
  
async function requireUserId(): Promise<
  { userId: UUID; error: null } | { userId: null; error: { message: string } }
> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return { userId: null, error: { message: 'Sign in to manage reservations.' } }
  }
  return { userId: data.user.id, error: null }
}

export const reservationService = {
  // -------------------------------------------------------------------
  // CREATE (FR-006)
  // -------------------------------------------------------------------
  /**
   * Reserve a listing for the signed-in buyer.
   * Returns the REAL row the database created — never a client-side boolean.
   */
  async reserveListing(listingId: UUID): Promise<ServiceResult<Reservation>> {
    const auth = await requireUserId()
    if (auth.userId == null) return { data: null, error: auth.error }

    const { data, error } = await supabase
      .from('reservations')
      .insert({ listing_id: listingId, buyer_id: auth.userId })
      .select('id, listing_id, buyer_id, status, expires_at, resolved_at, created_at, updated_at')
      .single()

    if (error) {
      console.error('[reservationService.reserveListing]', error)

      if (error.code === '23505') {
        return {
          data: null,
          error: {
            message: 'Someone already has an active reservation on this item.',
            code: error.code,
          },
        }
      }
      if (/cannot reserve your own listing/i.test(error.message)) {
        return { data: null, error: { message: 'This is your own listing.', code: 'P0001' } }
      }
      if (/not available for reservation/i.test(error.message)) {
        return {
          data: null,
          error: { message: 'This listing is no longer available.', code: 'P0001' },
        }
      }
      return { data: null, error: describeError(error, 'Could not place the reservation.') }
    }

    return { data: data as Reservation, error: null }
  },

  // -------------------------------------------------------------------
  // READ (FR-007)
  // -------------------------------------------------------------------
  /** Reservations the signed-in user placed as a buyer. */
  async getMyReservations(
    options: { activeOnly?: boolean } = {}
  ): Promise<ServiceResult<ReservationWithListing[]>> {
    const auth = await requireUserId()
    if (auth.userId == null) return { data: null, error: auth.error }

    let query = supabase
      .from('reservations')
      .select(SELECT_WITH_LISTING)
      .eq('buyer_id', auth.userId)
      .order('created_at', { ascending: false })

    if (options.activeOnly) query = query.in('status', ['Pending', 'Confirmed'])

    const { data, error } = await query

    if (error) {
      console.error('[reservationService.getMyReservations]', error)
      return { data: null, error: describeError(error, 'Could not load your reservations.') }
    }
    return { data: (data ?? []) as unknown as ReservationWithListing[], error: null }
  },

  /** Reservations other people placed on the signed-in user's listings. */
  async getIncomingReservations(
    options: { activeOnly?: boolean } = {}
  ): Promise<ServiceResult<ReservationWithListing[]>> {
    const auth = await requireUserId()
    if (auth.userId == null) return { data: null, error: auth.error }

    let query = supabase
      .from('reservations')
      .select(
        'id, listing_id, buyer_id, status, expires_at, resolved_at, created_at, updated_at, ' +
          'listing:listings!inner(id, title, price, city, seller_id, status, seller:profiles!seller_id(id, full_name))'
      )
      .eq('listing.seller_id', auth.userId)
      .order('created_at', { ascending: false })

    if (options.activeOnly) query = query.in('status', ['Pending', 'Confirmed'])

    const { data, error } = await query

    if (error) {
      console.error('[reservationService.getIncomingReservations]', error)
      return { data: null, error: describeError(error, 'Could not load reservations.') }
    }
    return { data: (data ?? []) as unknown as ReservationWithListing[], error: null }
  },

  /** The signed-in buyer's current reservation on one listing, if any. */
  async getMyReservationForListing(
    listingId: UUID
  ): Promise<ServiceResult<Reservation | null>> {
    const auth = await requireUserId()
    if (!auth.userId) return { data: null, error: auth.error }

    const { data, error } = await supabase
      .from('reservations')
      .select('id, listing_id, buyer_id, status, expires_at, resolved_at, created_at, updated_at')
      .eq('listing_id', listingId)
      .eq('buyer_id', auth.userId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('[reservationService.getMyReservationForListing]', error)
      return { data: null, error: describeError(error, 'Could not check your reservation.') }
    }
    return { data: ((data ?? [])[0] as Reservation) ?? null, error: null }
  },

  // -------------------------------------------------------------------
  // TRANSITIONS (FR-007)
  // -------------------------------------------------------------------
  /** Seller only. Pending -> Confirmed. */
  async confirmReservation(reservationId: UUID): Promise<ServiceResult<Reservation>> {
    return updateStatus(reservationId, 'Confirmed', 'Could not confirm the reservation.')
  },

  /** Seller only. Confirmed -> Completed (handover happened). */
  async completeReservation(reservationId: UUID): Promise<ServiceResult<Reservation>> {
    return updateStatus(reservationId, 'Completed', 'Could not complete the reservation.')
  },

  /** Buyer or seller. Pending/Confirmed -> Cancelled. */
  async cancelReservation(reservationId: UUID): Promise<ServiceResult<Reservation>> {
    return updateStatus(reservationId, 'Cancelled', 'Could not cancel the reservation.')
  },

  // -------------------------------------------------------------------
  // FR-008 (OPTIONAL — only works if migration 05 was applied)
  // -------------------------------------------------------------------
  /**
   * Lazily expire overdue Pending reservations, as specified in the SRS
   * implementation note for FR-008. Safe to call when migration 05 has NOT
   * been applied: the missing-function error is swallowed and it becomes a
   * no-op, so core Phase 2 keeps working either way.
   */
  async expireDue(): Promise<number> {
    const { data, error } = await supabase.rpc('expire_due_reservations')
    if (error) {
      // 42883 = undefined_function -> migration 05 not applied. Not an error.
      if (error.code !== '42883' && !/does not exist|not find the function/i.test(error.message)) {
        console.error('[reservationService.expireDue]', error)
      }
      return 0
    }
    return typeof data === 'number' ? data : 0
  },
}

async function updateStatus(
  reservationId: UUID,
  status: 'Confirmed' | 'Completed' | 'Cancelled',
  fallback: string
): Promise<ServiceResult<Reservation>> {
  const { data, error } = await supabase
    .from('reservations')
    .update({ status })
    .eq('id', reservationId)
    .select('id, listing_id, buyer_id, status, expires_at, resolved_at, created_at, updated_at')
    .maybeSingle()

  if (error) {
    console.error('[reservationService.updateStatus]', status, error)

    if (/only seller can/i.test(error.message)) {
      return {
        data: null,
        error: { message: 'Only the seller can do that.', code: 'P0001' },
      }
    }
    if (/terminal status/i.test(error.message)) {
      return {
        data: null,
        error: { message: 'This reservation is already finished.', code: 'P0001' },
      }
    }
    if (/Invalid reservation transition/i.test(error.message)) {
      return {
        data: null,
        error: { message: 'That status change is not allowed right now.', code: 'P0001' },
      }
    }
    return { data: null, error: describeError(error, fallback) }
  }

  if (!data) {
    return {
      data: null,
      error: { message: 'You do not have access to that reservation.', code: '42501' },
    }
  }

  return { data: data as Reservation, error: null }
}