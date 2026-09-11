// Centralized application/database types for Supabase.
// This file intentionally keeps typing lightweight for Phase 1A.

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
  price: string // numeric(12,2) comes back as string via supabase-js
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
