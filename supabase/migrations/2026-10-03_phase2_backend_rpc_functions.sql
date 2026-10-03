-- ============================================================
-- Phase 2: Backend RPC functions required by the current app
-- ============================================================
--
-- This migration does NOT create or modify tables.
-- It only restores the RPC functions already expected by
-- src/services/listingService.ts.
--
-- Required RPCs:
--   1. browse_listings()
--   2. get_listing_detail()
--   3. get_my_stats()
--
-- Keep this migration idempotent.
-- ============================================================


-- ------------------------------------------------------------
-- 1. PUBLIC BROWSE
-- ------------------------------------------------------------

create or replace function public.browse_listings(
  p_search text default null,
  p_category text default null,
  p_condition text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_limit integer default 48,
  p_offset integer default 0
)
returns table (
  id uuid,
  seller_id uuid,
  title text,
  description text,
  category text,
  condition text,
  price numeric,
  city text,
  barangay text,
  created_at timestamptz,
  seller_full_name text,
  cover_image_path text,
  image_count integer,
  is_reserved boolean
)
language sql
security definer
set search_path = 'pg_catalog', 'public'
as $$
  select
    l.id,
    l.seller_id,
    l.title,
    l.description,
    l.category,
    l.condition,
    l.price,
    l.city,
    l.barangay,
    l.created_at,
    p.full_name as seller_full_name,

    cover.storage_path as cover_image_path,

    (
      select count(*)::integer
      from public.listing_images li_count
      where li_count.listing_id = l.id
    ) as image_count,

    exists (
      select 1
      from public.reservations r_reserved
      where r_reserved.listing_id = l.id
        and r_reserved.status in ('Pending', 'Confirmed')
    ) as is_reserved

  from public.listings l

  join public.profiles p
    on p.id = l.seller_id

  left join lateral (
    select li.storage_path
    from public.listing_images li
    where li.listing_id = l.id
    order by li.sort_order asc, li.created_at asc
    limit 1
  ) cover on true

  where
    l.status = 'active'

    and (
      p_search is null
      or btrim(p_search) = ''
      or l.title ilike '%' || btrim(p_search) || '%'
      or l.description ilike '%' || btrim(p_search) || '%'
      or l.category ilike '%' || btrim(p_search) || '%'
      or l.condition ilike '%' || btrim(p_search) || '%'
      or l.city ilike '%' || btrim(p_search) || '%'
      or l.barangay ilike '%' || btrim(p_search) || '%'
      or p.full_name ilike '%' || btrim(p_search) || '%'
    )

    and (
      p_category is null
      or btrim(p_category) = ''
      or l.category = p_category
    )

    and (
      p_condition is null
      or btrim(p_condition) = ''
      or l.condition = p_condition
    )

    and (
      p_min_price is null
      or l.price >= p_min_price
    )

    and (
      p_max_price is null
      or l.price <= p_max_price
    )

  order by
    l.created_at desc

  limit greatest(0, least(coalesce(p_limit, 48), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;


revoke execute on function public.browse_listings(
  text,
  text,
  text,
  numeric,
  numeric,
  integer,
  integer
) from public;

grant execute on function public.browse_listings(
  text,
  text,
  text,
  numeric,
  numeric,
  integer,
  integer
) to anon, authenticated;


-- ------------------------------------------------------------
-- 2. LISTING DETAIL
-- ------------------------------------------------------------

create or replace function public.get_listing_detail(
  p_listing_id uuid
)
returns table (
  id uuid,
  seller_id uuid,
  title text,
  description text,
  category text,
  condition text,
  price numeric,
  city text,
  barangay text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  seller_full_name text,
  seller_active_listings integer,
  seller_member_since timestamptz,
  is_reserved boolean,
  reservation_status public.reservation_status,
  reservation_expires_at timestamptz,
  viewer_is_seller boolean,
  viewer_reservation_id uuid,
  viewer_reservation_status public.reservation_status
)
language sql
security definer
set search_path = 'pg_catalog', 'public'
as $$
  select
    l.id,
    l.seller_id,
    l.title,
    l.description,
    l.category,
    l.condition,
    l.price,
    l.city,
    l.barangay,
    l.status,
    l.created_at,
    l.updated_at,

    p.full_name as seller_full_name,

    (
      select count(*)::integer
      from public.listings seller_listing_count
      where seller_listing_count.seller_id = l.seller_id
        and seller_listing_count.status = 'active'
    ) as seller_active_listings,

    p.created_at as seller_member_since,

    (
      active_reservation.id is not null
    ) as is_reserved,

    active_reservation.status as reservation_status,
    active_reservation.expires_at as reservation_expires_at,

    (
      auth.uid() is not null
      and auth.uid() = l.seller_id
    ) as viewer_is_seller,

    case
      when active_reservation.buyer_id = auth.uid()
        then active_reservation.id
      else null
    end as viewer_reservation_id,

    case
      when active_reservation.buyer_id = auth.uid()
        then active_reservation.status
      else null
    end as viewer_reservation_status

  from public.listings l

  join public.profiles p
    on p.id = l.seller_id

  left join lateral (
    select
      r.id,
      r.buyer_id,
      r.status,
      r.expires_at
    from public.reservations r
    where r.listing_id = l.id
      and r.status in ('Pending', 'Confirmed')
    order by r.created_at desc
    limit 1
  ) active_reservation on true

  where
    l.id = p_listing_id

    and (
      l.status = 'active'
      or l.seller_id = auth.uid()
    );
$$;


revoke execute on function public.get_listing_detail(uuid) from public;

grant execute on function public.get_listing_detail(uuid)
to anon, authenticated;


-- ------------------------------------------------------------
-- 3. CURRENT USER STATS
-- ------------------------------------------------------------

create or replace function public.get_my_stats()
returns table (
  active_listings integer,
  archived_listings integer,
  reserved_listings integer,
  sold_listings integer,
  my_active_reservations integer,
  my_past_reservations integer,
  incoming_reservations integer
)
language sql
security definer
set search_path = 'pg_catalog', 'public'
as $$
  select
    (
      select count(*)::integer
      from public.listings l
      where l.seller_id = auth.uid()
        and l.status = 'active'
    ) as active_listings,

    (
      select count(*)::integer
      from public.listings l
      where l.seller_id = auth.uid()
        and l.status = 'archived'
    ) as archived_listings,

    (
      select count(distinct r.listing_id)::integer
      from public.reservations r
      join public.listings l
        on l.id = r.listing_id
      where l.seller_id = auth.uid()
        and r.status in ('Pending', 'Confirmed')
    ) as reserved_listings,

    (
      select count(distinct r.listing_id)::integer
      from public.reservations r
      join public.listings l
        on l.id = r.listing_id
      where l.seller_id = auth.uid()
        and r.status = 'Completed'
    ) as sold_listings,

    (
      select count(*)::integer
      from public.reservations r
      where r.buyer_id = auth.uid()
        and r.status in ('Pending', 'Confirmed')
    ) as my_active_reservations,

    (
      select count(*)::integer
      from public.reservations r
      where r.buyer_id = auth.uid()
        and r.status in ('Completed', 'Cancelled', 'Expired')
    ) as my_past_reservations,

    (
      select count(*)::integer
      from public.reservations r
      join public.listings l
        on l.id = r.listing_id
      where l.seller_id = auth.uid()
        and r.status in ('Pending', 'Confirmed')
    ) as incoming_reservations;
$$;


revoke execute on function public.get_my_stats() from public;

grant execute on function public.get_my_stats()
to authenticated;