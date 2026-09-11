-- ThriftFinder Phase 1A fix: unlimited photo ordering
-- Keeps (listing_id, sort_order) uniqueness, but drops the old upper-bound check.

DO $$
BEGIN
  -- Only run if the table exists (idempotent across environments).
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'listing_images'
  ) THEN
    -- Drop the previous sort_order constraint if it exists.
    ALTER TABLE public.listing_images
      DROP CONSTRAINT IF EXISTS listing_images_sort_order_check;

    -- Widen sort_order so it can represent arbitrarily many non-negative positions.
    ALTER TABLE public.listing_images
      ALTER COLUMN sort_order TYPE integer
      USING sort_order::integer;

    -- Allow unlimited non-negative ordering positions.
    ALTER TABLE public.listing_images
      ADD CONSTRAINT listing_images_sort_order_check
      CHECK (sort_order >= 0);
  END IF;
END$$;
