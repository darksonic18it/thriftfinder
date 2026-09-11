import { getSupabaseClient } from '../lib/supabaseClient'

// Phase 1A foundation only.
// Stubs are intentionally incomplete until Phase 1B.

export const reservationService = {
  async reserveListing(_payload: { listing_id: string; buyer_id: string }) {
    void _payload
    const _client = getSupabaseClient()
    void _client
    // TODO (Phase 1B): implement
    return null
  },
}
