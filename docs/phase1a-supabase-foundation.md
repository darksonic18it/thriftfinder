# Phase 1A — Supabase foundation (ThriftFinder)

This phase creates the backend foundation for the ThriftFinder MVP:
- Supabase client foundation (frontend-only publishable key)
- Centralized TypeScript database types
- Service layer stubs (not wired into UI)
- SQL migration for tables, constraints, RLS, and Storage buckets/policies

## What was created
### Frontend
- `src/lib/supabaseClient.ts`
  - `getSupabaseClient()` uses `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`.
- `src/types/database.ts`
  - lightweight centralized types for: `profiles`, `listings`, `listing_images`, `reservations`.
- Service stubs:
  - `src/services/profileService.ts`
  - `src/services/listingService.ts`
  - `src/services/reservationService.ts`

### Env scaffolding
- `.env.example`
  - documents `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

### SQL migration
- `supabase/migrations/2026-09-08_phase1a_foundation.sql`

## Migration application (manual)
Apply the SQL migration to the Supabase project (Dashboard SQL editor or Supabase CLI).
After applying, verify:
- RLS is enabled on all created tables
- Storage buckets exist and policies match expected path conventions

## Manual checks
- Confirm `listings`/`listing_images` read access choices (public vs authenticated).
- Confirm reservation status transitions enforcement strategy (trigger vs policy-only).
