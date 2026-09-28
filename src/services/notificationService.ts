import { reservationService } from './reservationService'
import { profileService } from './profileService'
import type { ReservationWithListing, UUID } from '../types/database'

/**
 * Notification service.
 *
 * There is no `notifications` table. Every notification is DERIVED from real
 * activity the signed-in user is already allowed to read under RLS:
 *
 *   As a SELLER (reservations on my listings)
 *     Pending   -> "New reservation request"
 *     Cancelled -> "Reservation cancelled"
 *     Expired   -> "Reservation expired"
 *     Pending, expiring soon -> "Respond soon"
 *
 *   As a BUYER (my own reservations)
 *     Confirmed -> "Reservation confirmed"
 *     Completed -> "Purchase completed"
 *     Cancelled -> "Reservation cancelled"
 *     Expired   -> "Reservation expired"
 *     Pending, expiring soon -> "Reservation expiring soon"
 *
 * Each id is `<reservationId>:<event>`, so a status change produces a NEW
 * notification while the old one disappears.
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'user'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  description: string
  /** ISO timestamp of the underlying event. */
  createdAt: string
  /** Where clicking the notification should take the user. */
  href: string
}

/** Ignore activity older than this so old history doesn't flood the bell. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
/** A Pending reservation this close to expiry triggers a warning. */
const EXPIRING_SOON_MS = 12 * 60 * 60 * 1000

function formatRemaining(ms: number): string {
  const totalMinutes = Math.max(1, Math.round(ms / 60000))
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.round(totalMinutes / 60)
  return `${hours} hr${hours === 1 ? '' : 's'}`
}

/** Stable timestamp for "expiring soon": when the warning window opened. */
function warningStart(r: ReservationWithListing): string {
  const opened = new Date(r.expires_at as string).getTime() - EXPIRING_SOON_MS
  return new Date(Math.max(opened, new Date(r.created_at).getTime())).toISOString()
}

function eventTime(r: ReservationWithListing): string {
  return r.resolved_at ?? r.updated_at ?? r.created_at
}

export const notificationService = {
  async getForCurrentUser(): Promise<AppNotification[]> {
    // Lazily flips overdue Pending reservations to Expired. No-op if the
    // optional DB function doesn't exist (see reservationService.expireDue).
    await reservationService.expireDue()

    const [mine, incoming] = await Promise.all([
      reservationService.getMyReservations(),
      reservationService.getIncomingReservations(),
    ])

    const myRows = mine.data ?? []
    const incomingRows = incoming.data ?? []

    if (mine.error && incoming.error) {
      throw new Error(mine.error.message)
    }

    // The base profiles table is private, so buyer names come from the
    // public display helper (cached per id inside the service call).
    const buyerIds: UUID[] = incomingRows.map((r) => r.buyer_id)
    const buyers = buyerIds.length
      ? await profileService.getProfileDisplays(buyerIds)
      : {}

    const now = Date.now()
    const out: AppNotification[] = []

    const push = (n: AppNotification) => {
      if (now - new Date(n.createdAt).getTime() <= MAX_AGE_MS) out.push(n)
    }

    // ---- Seller side --------------------------------------------------
    for (const r of incomingRows) {
      const title = r.listing?.title ?? 'your listing'
      const href = `/listing/${r.listing_id}`
      const buyerName = buyers[r.buyer_id]?.full_name?.trim() || 'A buyer'

      if (r.status === 'Pending') {
        push({
          id: `${r.id}:incoming`,
          type: 'user',
          title: 'New reservation request',
          description: `${buyerName} reserved “${title}”. Confirm it to arrange the handover.`,
          createdAt: r.created_at,
          href,
        })

        if (r.expires_at) {
          const left = new Date(r.expires_at).getTime() - now
          if (left > 0 && left <= EXPIRING_SOON_MS) {
            push({
              id: `${r.id}:seller-expiring`,
              type: 'warning',
              title: 'Respond soon',
              description: `The reservation on “${title}” expires in ${formatRemaining(left)}.`,
              createdAt: warningStart(r),
              href,
            })
          }
        }
      } else if (r.status === 'Cancelled') {
        push({
          id: `${r.id}:seller-cancelled`,
          type: 'error',
          title: 'Reservation cancelled',
          description: `A reservation on “${title}” was cancelled.`,
          createdAt: eventTime(r),
          href,
        })
      } else if (r.status === 'Expired') {
        push({
          id: `${r.id}:seller-expired`,
          type: 'warning',
          title: 'Reservation expired',
          description: `The reservation on “${title}” expired without a response.`,
          createdAt: eventTime(r),
          href,
        })
      }
    }

    // ---- Buyer side ---------------------------------------------------
    for (const r of myRows) {
      const title = r.listing?.title ?? 'the item'
      const href = `/listing/${r.listing_id}`

      switch (r.status) {
        case 'Confirmed':
          push({
            id: `${r.id}:confirmed`,
            type: 'success',
            title: 'Reservation confirmed',
            description: `The seller confirmed your reservation for “${title}”.`,
            createdAt: eventTime(r),
            href,
          })
          break
        case 'Completed':
          push({
            id: `${r.id}:completed`,
            type: 'success',
            title: 'Purchase completed',
            description: `Your reservation for “${title}” is marked as completed.`,
            createdAt: eventTime(r),
            href,
          })
          break
        case 'Cancelled':
          push({
            id: `${r.id}:cancelled`,
            type: 'error',
            title: 'Reservation cancelled',
            description: `Your reservation for “${title}” was cancelled.`,
            createdAt: eventTime(r),
            href,
          })
          break
        case 'Expired':
          push({
            id: `${r.id}:expired`,
            type: 'warning',
            title: 'Reservation expired',
            description: `Your hold on “${title}” expired.`,
            createdAt: eventTime(r),
            href,
          })
          break
        case 'Pending': {
          if (!r.expires_at) break
          const left = new Date(r.expires_at).getTime() - now
          if (left > 0 && left <= EXPIRING_SOON_MS) {
            push({
              id: `${r.id}:expiring`,
              type: 'warning',
              title: 'Reservation expiring soon',
              description: `Your hold on “${title}” expires in ${formatRemaining(left)}.`,
              createdAt: warningStart(r),
              href,
            })
          }
          break
        }
        default:
          break
      }
    }

    return out.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  },
}