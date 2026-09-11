import { getSupabaseClient } from '../lib/supabaseClient'

// Phase 1A foundation only.
// Stubs are intentionally incomplete until Phase 1B.

export const listingService = {
  async createListing(_payload: {
    seller_id: string
    title: string
    description: string
    category: string
    condition: string
    price: string
    city: string
    barangay: string
  }) {
    void _payload
    const _client = getSupabaseClient()
    void _client
    // TODO (Phase 1B): implement
    return null
  },
}
