-- ThriftFinder: seller reviews backend (FR-011). Non-destructive and idempotent:
-- safe to run more than once in the Supabase SQL editor.
--
-- Adds: public.reviews table, validation trigger, RLS policies, a guard that
-- stops a listing with reviews from being permanently deleted, and 3 RPCs:
--   get_seller_review_summary(seller)    -> average, count, 1-5 star breakdown
--   get_seller_reviews(seller, limit, offset) -> public review list with reviewer name
--   get_reviewable_reservations(seller)  -> the caller's Completed reservations
--                                           with this seller that are not reviewed yet

-- ---------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null,
  comment text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_rating_range check (rating between 1 and 5),
  constraint reviews_comment_length check (char_length(coalesce(comment, '')) <= 500),
  constraint reviews_no_self check (reviewer_id <> seller_id),
  constraint reviews_one_per_reservation unique (reservation_id, reviewer_id)
);

drop trigger if exists trg_reviews_updated_at on public.reviews;
create trigger trg_reviews_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

create index if not exists reviews_seller_id_idx on public.reviews (seller_id, created_at desc);
create index if not exists reviews_reviewer_id_idx on public.reviews (reviewer_id);
create index if not exists reviews_listing_id_idx on public.reviews (listing_id);

-- ---------------------------------------------------------------------
-- 2. Business rules (the database owns them, the client cannot bypass them)
--    * only the BUYER of a reservation can review it
--    * only once the reservation is Completed
--    * listing_id and seller_id are always derived from the reservation
--    * ownership columns can never be changed afterwards
-- ---------------------------------------------------------------------
create or replace function public.enforce_review_rules()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  r record;
begin
  if tg_op = 'INSERT' then
    select res.buyer_id, res.status::text as status, res.listing_id, l.seller_id
      into r
    from public.reservations res
    join public.listings l on l.id = res.listing_id
    where res.id = new.reservation_id;

    if not found then
      raise exception 'Reservation not found.';
    end if;
    if r.buyer_id <> new.reviewer_id then
      raise exception 'Only the buyer of this reservation can review it.';
    end if;
    if r.status <> 'Completed' then
      raise exception 'You can only review a completed reservation.';
    end if;

    new.listing_id := r.listing_id;
    new.seller_id := r.seller_id;
  else
    if new.reservation_id <> old.reservation_id
       or new.listing_id <> old.listing_id
       or new.reviewer_id <> old.reviewer_id
       or new.seller_id <> old.seller_id then
      raise exception 'Review ownership fields cannot be changed.';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_reviews_enforce_rules on public.reviews;
create trigger trg_reviews_enforce_rules
before insert or update on public.reviews
for each row execute function public.enforce_review_rules();

-- ---------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------
alter table public.reviews enable row level security;

-- Reviews are public (they are shown on the seller storefront).
drop policy if exists reviews_select_all on public.reviews;
create policy reviews_select_all
on public.reviews
for select
to anon, authenticated
using (true);

drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own
on public.reviews
for insert
to authenticated
with check (
  reviewer_id = auth.uid()
  and exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  )
);

drop policy if exists reviews_update_own on public.reviews;
create policy reviews_update_own
on public.reviews
for update
to authenticated
using (reviewer_id = auth.uid())
with check (
  reviewer_id = auth.uid()
  and exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  )
);

drop policy if exists reviews_delete_own on public.reviews;
create policy reviews_delete_own
on public.reviews
for delete
to authenticated
using (reviewer_id = auth.uid());

-- ---------------------------------------------------------------------
-- 4. Guard: a seller must not be able to erase a bad review by permanently
--    deleting the listing (reservations and reviews cascade from listings).
--    Archiving still works. Deletes that cascade from an account removal
--    (trigger depth > 1) are NOT blocked.
-- ---------------------------------------------------------------------
create or replace function public.block_delete_listing_with_reviews()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
begin
  if pg_trigger_depth() = 1
     and exists (select 1 from public.reviews rv where rv.listing_id = old.id) then
    raise exception 'This listing has buyer reviews and cannot be permanently deleted. Archive it instead.';
  end if;
  return old;
end $$;

drop trigger if exists trg_listings_block_delete_with_reviews on public.listings;
create trigger trg_listings_block_delete_with_reviews
before delete on public.listings
for each row execute function public.block_delete_listing_with_reviews();

-- ---------------------------------------------------------------------
-- 5. RPCs
-- ---------------------------------------------------------------------
create or replace function public.get_seller_review_summary(p_seller_id uuid)
returns table (
  average_rating numeric,
  review_count bigint,
  count_1 bigint,
  count_2 bigint,
  count_3 bigint,
  count_4 bigint,
  count_5 bigint
)
language plpgsql security definer set search_path = 'pg_catalog', 'public' as $$
begin
  return query
  select
    coalesce(round(avg(rv.rating)::numeric, 1), 0),
    count(*),
    count(*) filter (where rv.rating = 1),
    count(*) filter (where rv.rating = 2),
    count(*) filter (where rv.rating = 3),
    count(*) filter (where rv.rating = 4),
    count(*) filter (where rv.rating = 5)
  from public.reviews rv
  where rv.seller_id = p_seller_id;
end $$;
revoke execute on function public.get_seller_review_summary(uuid) from public;
grant execute on function public.get_seller_review_summary(uuid) to public;
grant execute on function public.get_seller_review_summary(uuid) to authenticated;
grant execute on function public.get_seller_review_summary(uuid) to anon;

create or replace function public.get_seller_reviews(
  p_seller_id uuid,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  rating smallint,
  comment text,
  created_at timestamptz,
  updated_at timestamptz,
  listing_id uuid,
  listing_title text,
  reviewer_id uuid,
  reviewer_name text,
  reviewer_avatar_path text
)
language plpgsql security definer set search_path = 'pg_catalog', 'public' as $$
begin
  return query
  select rv.id, rv.rating, rv.comment, rv.created_at, rv.updated_at,
         rv.listing_id, l.title, rv.reviewer_id, p.full_name, p.avatar_path
  from public.reviews rv
  join public.profiles p on p.id = rv.reviewer_id
  left join public.listings l on l.id = rv.listing_id
  where rv.seller_id = p_seller_id
  order by rv.created_at desc
  limit greatest(least(coalesce(p_limit, 20), 50), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end $$;
revoke execute on function public.get_seller_reviews(uuid, integer, integer) from public;
grant execute on function public.get_seller_reviews(uuid, integer, integer) to public;
grant execute on function public.get_seller_reviews(uuid, integer, integer) to authenticated;
grant execute on function public.get_seller_reviews(uuid, integer, integer) to anon;

create or replace function public.get_reviewable_reservations(p_seller_id uuid)
returns table (
  reservation_id uuid,
  listing_id uuid,
  listing_title text,
  resolved_at timestamptz
)
language plpgsql security definer set search_path = 'pg_catalog', 'public' as $$
begin
  if auth.uid() is null then
    return;
  end if;

  return query
  select res.id, l.id, l.title, res.resolved_at
  from public.reservations res
  join public.listings l on l.id = res.listing_id
  where res.buyer_id = auth.uid()
    and l.seller_id = p_seller_id
    and res.status = 'Completed'
    and not exists (
      select 1 from public.reviews rv
      where rv.reservation_id = res.id
        and rv.reviewer_id = auth.uid()
    )
  order by res.resolved_at desc nulls last, res.created_at desc;
end $$;
revoke execute on function public.get_reviewable_reservations(uuid) from public;
grant execute on function public.get_reviewable_reservations(uuid) to authenticated;