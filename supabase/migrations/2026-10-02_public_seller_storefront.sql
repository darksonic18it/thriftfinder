-- ThriftFinder: public seller storefront backend (non-destructive, idempotent).
-- Adds: profiles.bio + profiles.location_city, follows table + helpers,
-- listings.is_featured (+max 3 trigger), extended get_profile_display,
-- get_public_seller_stats, get_public_seller_listings.
-- Reviews are NOT added (no backend yet): UI shows honest empty state.
-- __FUNCS_A__
-- NOTE: tables/columns are added at the bottom of this file, but the
-- functions below are CREATE OR REPLACE (idempotent), so apply this file
-- twice on a fresh DB, or apply after the DDL section has run once.

create or replace function public.get_profile_display(p_profile_id uuid)
returns table (id uuid, full_name text, avatar_path text, cover_path text, bio text, location_city text, created_at timestamptz)
language plpgsql security definer set search_path = 'pg_catalog', 'public' as $$
begin return query select p.id, p.full_name, p.avatar_path, p.cover_path, p.bio, p.location_city, p.created_at
from public.profiles p where p.id = p_profile_id; end $$;
revoke execute on function public.get_profile_display(uuid) from public;
grant execute on function public.get_profile_display(uuid) to public;
grant execute on function public.get_profile_display(uuid) to authenticated;
grant execute on function public.get_profile_display(uuid) to anon;

create or replace function public.get_follow_counts(p_profile_id uuid)
returns table (followers_count bigint, following_count bigint)
language plpgsql security definer set search_path = 'pg_catalog', 'public' as $$
begin return query select
(select count(*) from public.follows f where f.following_id = p_profile_id),
(select count(*) from public.follows f where f.follower_id = p_profile_id); end $$;
revoke execute on function public.get_follow_counts(uuid) from public;
grant execute on function public.get_follow_counts(uuid) to public;
grant execute on function public.get_follow_counts(uuid) to authenticated;
grant execute on function public.get_follow_counts(uuid) to anon;

create or replace function public.is_following(p_following_id uuid) returns boolean
language plpgsql security definer set search_path = 'pg_catalog', 'public' as $$
declare v boolean; begin
if auth.uid() is null then return false; end if;
select exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p_following_id) into v;
return coalesce(v, false); end $$;
revoke execute on function public.is_following(uuid) from public;
grant execute on function public.is_following(uuid) to authenticated;

create or replace function public.follow_profile(p_following_id uuid) returns void
language plpgsql security definer set search_path = 'pg_catalog', 'public' as $$
begin
if auth.uid() is null then raise exception 'Sign in to follow sellers.'; end if;
if p_following_id = auth.uid() then raise exception 'You cannot follow yourself.'; end if;
insert into public.follows (follower_id, following_id) values (auth.uid(), p_following_id) on conflict do nothing;
end $$;
revoke execute on function public.follow_profile(uuid) from public;
grant execute on function public.follow_profile(uuid) to authenticated;

create or replace function public.unfollow_profile(p_following_id uuid) returns void
language plpgsql security definer set search_path = 'pg_catalog', 'public' as $$
begin
if auth.uid() is null then raise exception 'Sign in to follow sellers.'; end if;
delete from public.follows where follower_id = auth.uid() and following_id = p_following_id;
end $$;
revoke execute on function public.unfollow_profile(uuid) from public;
grant execute on function public.unfollow_profile(uuid) to authenticated;
create or replace function public.get_public_seller_stats(p_seller_id uuid)
returns table (active_listings bigint, sold_listings bigint)
language plpgsql security definer set search_path = 'pg_catalog', 'public' as $$
begin return query select
(select count(*) from public.listings l where l.seller_id = p_seller_id and l.status = 'active'),
(select count(*) from public.reservations r join public.listings l on l.id = r.listing_id
where l.seller_id = p_seller_id and r.status = 'Completed'); end $$;
revoke execute on function public.get_public_seller_stats(uuid) from public;
grant execute on function public.get_public_seller_stats(uuid) to public;
grant execute on function public.get_public_seller_stats(uuid) to authenticated;
grant execute on function public.get_public_seller_stats(uuid) to anon;

create or replace function public.get_public_seller_listings(p_seller_id uuid)
returns table (id uuid, title text, price numeric, status text, condition text, city text, barangay text, created_at timestamptz, is_featured boolean, cover_image_path text)
language plpgsql security definer set search_path = 'pg_catalog', 'public' as $$
begin return query select l.id, l.title, l.price, l.status, l.condition, l.city, l.barangay, l.created_at,
coalesce(l.is_featured, false),
(select li.storage_path from public.listing_images li where li.listing_id = l.id order by li.sort_order asc limit 1)
from public.listings l where l.seller_id = p_seller_id and l.status = 'active'
order by coalesce(l.is_featured, false) desc, l.created_at desc; end $$;
revoke execute on function public.get_public_seller_listings(uuid) from public;
grant execute on function public.get_public_seller_listings(uuid) to public;
grant execute on function public.get_public_seller_listings(uuid) to authenticated;
grant execute on function public.get_public_seller_listings(uuid) to anon;

alter table public.profiles add column if not exists bio text null;
alter table public.profiles add column if not exists location_city text null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_bio_length') then
    alter table public.profiles add constraint profiles_bio_length check (char_length(coalesce(bio, '')) <= 500);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_location_length') then
    alter table public.profiles add constraint profiles_location_length check (char_length(coalesce(location_city, '')) <= 120);
  end if;
end $$;

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_no_self check (follower_id <> following_id),
  constraint follows_pkey primary key (follower_id, following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);
create index if not exists follows_follower_idx on public.follows (follower_id);
alter table public.follows enable row level security;
drop policy if exists follows_select_all on public.follows;
create policy follows_select_all on public.follows for select to authenticated using (true);
drop policy if exists follows_insert_own on public.follows;
create policy follows_insert_own on public.follows for insert to authenticated with check (follower_id = auth.uid());
drop policy if exists follows_delete_own on public.follows;
create policy follows_delete_own on public.follows for delete to authenticated using (follower_id = auth.uid());

alter table public.listings add column if not exists is_featured boolean not null default false;
create or replace function public.enforce_featured_limit() returns trigger language plpgsql set search_path = 'pg_catalog', 'public' as $$
declare c int; begin
  if coalesce(new.is_featured, false) then
    select count(*) into c from public.listings
    where seller_id = new.seller_id and status = 'active' and is_featured = true and id <> new.id;
    if c >= 3 then raise exception 'You can feature up to 3 listings at a time.'; end if;
  end if; return new;
end $$;
drop trigger if exists trg_listings_featured_limit on public.listings;
create trigger trg_listings_featured_limit before insert or update of is_featured, status on public.listings
for each row execute function public.enforce_featured_limit();
