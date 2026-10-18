-- Items Near Me: protected meetup coordinates and nearby search.
-- Existing listings remain valid without coordinates.
-- Exact seller GPS is rounded by the application before persistence; raw GPS is never stored.
-- The nearby-search RPC returns only a coarsely rounded distance, never coordinates.

begin;

create table if not exists public.listing_locations (
  listing_id uuid primary key
    references public.listings(id) on delete cascade,
  latitude double precision not null
    check (latitude between -90 and 90),
  longitude double precision not null
    check (longitude between -180 and 180),
  updated_at timestamptz not null default now()
);

-- Enforce coarse coordinates in Postgres too, so clients cannot bypass the
-- service and write precise GPS through the table API.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'listing_locations_latitude_coarse_check'
      and conrelid = 'public.listing_locations'::regclass
  ) then
    alter table public.listing_locations
      add constraint listing_locations_latitude_coarse_check
      check (latitude = round(latitude::numeric, 2)::double precision);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'listing_locations_longitude_coarse_check'
      and conrelid = 'public.listing_locations'::regclass
  ) then
    alter table public.listing_locations
      add constraint listing_locations_longitude_coarse_check
      check (longitude = round(longitude::numeric, 2)::double precision);
  end if;
end;
$$;

create index if not exists listing_locations_latitude_idx
  on public.listing_locations (latitude);
create index if not exists listing_locations_longitude_idx
  on public.listing_locations (longitude);

alter table public.listing_locations enable row level security;

-- Only the listing owner can access the saved coarse area coordinates.
drop policy if exists "Sellers manage own listing locations"
  on public.listing_locations;

create policy "Sellers manage own listing locations"
on public.listing_locations
for all
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_locations.listing_id
      and l.seller_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_locations.listing_id
      and l.seller_id = (select auth.uid())
  )
);

-- Authenticated clients can reach the table, but RLS restricts rows
-- to their owners. Anonymous clients receive no direct table privileges.
revoke all on public.listing_locations from public, anon;
grant select, insert, update, delete
  on public.listing_locations to authenticated;

create or replace function public.nearby_listings(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_km double precision default 5,
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
  is_reserved boolean,
  distance_km double precision
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_latitude is null or p_latitude not between -90 and 90
     or p_longitude is null or p_longitude not between -180 and 180 then
    raise exception 'Invalid search coordinates';
  end if;

  if p_radius_km is null or p_radius_km <= 0 or p_radius_km > 100 then
    raise exception 'Radius must be greater than 0 and at most 100 km';
  end if;

  return query
  with candidates as (
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
        from public.listing_images li
        where li.listing_id = l.id
      ) as image_count,
      exists (
        select 1
        from public.reservations r
        where r.listing_id = l.id
          and r.status in ('Pending', 'Confirmed')
      ) as is_reserved,
      loc.latitude,
      loc.longitude
    from public.listings l
    join public.profiles p on p.id = l.seller_id
    join public.listing_locations loc on loc.listing_id = l.id
    left join lateral (
      select li.storage_path
      from public.listing_images li
      where li.listing_id = l.id
      order by li.sort_order, li.created_at
      limit 1
    ) cover on true
    where l.status = 'active'
      -- Coarse bounding box reduces the rows needing Haversine calculation.
      and loc.latitude between
        greatest(-90.0, p_latitude - p_radius_km / 110.574)
        and least(90.0, p_latitude + p_radius_km / 110.574)
      and loc.longitude between
        greatest(-180.0, p_longitude - p_radius_km / (111.320 * greatest(abs(cos(radians(p_latitude))), 0.01)))
        and least(180.0, p_longitude + p_radius_km / (111.320 * greatest(abs(cos(radians(p_latitude))), 0.01)))
      and (
        p_search is null or btrim(p_search) = ''
        or l.title ilike '%' || btrim(p_search) || '%'
        or l.description ilike '%' || btrim(p_search) || '%'
        or l.category ilike '%' || btrim(p_search) || '%'
        or l.condition ilike '%' || btrim(p_search) || '%'
        or l.city ilike '%' || btrim(p_search) || '%'
        or l.barangay ilike '%' || btrim(p_search) || '%'
        or p.full_name ilike '%' || btrim(p_search) || '%'
      )
      and (p_category is null or btrim(p_category) = ''
           or l.category = p_category)
      and (p_condition is null or btrim(p_condition) = ''
           or l.condition = p_condition)
      and (p_min_price is null or l.price >= p_min_price)
      and (p_max_price is null or l.price <= p_max_price)
  ),
  distances as (
    select c.*,
      6371.0 * 2.0 * asin(sqrt(least(1.0, greatest(0.0,
        power(sin(radians(c.latitude - p_latitude) / 2.0), 2)
        + cos(radians(p_latitude))
        * cos(radians(c.latitude))
        * power(sin(radians(c.longitude - p_longitude) / 2.0), 2)
      )))) as calculated_distance
    from candidates c
  )
  select
    d.id,
    d.seller_id,
    d.title,
    d.description,
    d.category,
    d.condition,
    d.price,
    d.city,
    d.barangay,
    d.created_at,
    d.seller_full_name,
    d.cover_image_path,
    d.image_count,
    d.is_reserved,
    (round(d.calculated_distance * 2.0) / 2.0)::double precision
  from distances d
  where (round(d.calculated_distance * 2.0) / 2.0) <= p_radius_km
  order by round(d.calculated_distance * 2.0) asc, d.created_at desc
  limit greatest(0, least(coalesce(p_limit, 48), 100))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

-- Nearby search returns public-safe listing fields and distance rounded to 0.5 km.
-- Coordinates in listing_locations must be coarse area references, never exact meetup pins.
revoke all on function public.nearby_listings(
  double precision, double precision, double precision,
  text, text, text, numeric, numeric, integer, integer
) from public;

grant execute on function public.nearby_listings(
  double precision, double precision, double precision,
  text, text, text, numeric, numeric, integer, integer
) to anon, authenticated;

commit;