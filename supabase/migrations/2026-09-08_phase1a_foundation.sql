-- Phase 1A: ThriftFinder Supabase foundation
-- Creates base tables, RLS policies, and storage buckets/policies.

-- Extensions
create extension if not exists pgcrypto;

-- Types
do $$
begin
  if not exists (select 1 from pg_type where typname = 'reservation_status') then
    create type public.reservation_status as enum (
      'Pending',
      'Confirmed',
      'Completed',
      'Cancelled',
      'Expired'
    );
  end if;
end$$;

-- Helpers: updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = 'pg_catalog', 'public' as $$
begin
  new.updated_at = now();
  return new;
end$$;

-- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  contact_phone text null,
  avatar_path text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Public seller display helper (safe subset; never exposes contact_phone)
-- Public/anonymous listing-detail users can call this function to retrieve:
--   id, full_name, avatar_path
--
-- The base table public.profiles stays private (no public SELECT privilege, and RLS remains owner-scoped).
drop view if exists public.profile_display;

revoke select on public.profiles from public;

create or replace function public.get_profile_display(p_profile_id uuid)
returns table (
  id uuid,
  full_name text,
  avatar_path text
)
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
begin
  return query
  select
    p.id,
    p.full_name,
    p.avatar_path
  from public.profiles p
  where p.id = p_profile_id;
end$$;

-- Explicit EXECUTE scope: public can call the helper, but base-table access remains private.
revoke execute on function public.get_profile_display(uuid) from public;
grant execute on function public.get_profile_display(uuid) to public;

-- Optional: create profile row on signup/auth user creation.
-- SECURITY DEFINER so Supabase can insert even when RLS blocks writes.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = 'pg_catalog', 'public' as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;

  return new;
end$$;

-- SECURITY DEFINER hardening: revoke direct execution from public.
-- Trigger invocation still works because it's called by the auth trigger.
revoke execute on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- listings
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  condition text not null,
  price numeric(12,2) not null,
  city text not null,
  barangay text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_listings_updated_at on public.listings;
create trigger trg_listings_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

-- listings.status intentionally left unconstrained in Phase 1A
-- (RLS/policies do not depend on it; this avoids inventing extra business states).

create index if not exists listings_seller_id_idx on public.listings(seller_id);

-- SRS: listing price must be positive
alter table public.listings
  add constraint listings_price_positive_check
  check (price > 0);

-- listing_images (non-negative photo ordering; unlimited photos)
create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

alter table public.listing_images
  add constraint listing_images_sort_order_check
  check (sort_order >= 0);

create unique index if not exists listing_images_listing_sort_unique
  on public.listing_images(listing_id, sort_order);

-- Photo ordering is enforced by constraints (concurrency-safe):
--   - sort_order check (>= 0)
--   - unique(listing_id, sort_order)

-- We intentionally do NOT add additional uniqueness requirements on storage_path.
--  - sort_order check (>= 0)
--  - unique(listing_id, sort_order)
-- Since sort_order is required and non-negative, an inserted listing_id
-- can have arbitrarily many distinct sort_order rows.

-- Keeping it constraint-based avoids race-prone COUNT(*) triggers.

-- (No count-based trigger exists in this Phase 1A migration.)

-- reservations
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  status public.reservation_status not null default 'Pending',
  expires_at timestamptz null,
  resolved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_reservations_updated_at on public.reservations;
create trigger trg_reservations_updated_at
before update on public.reservations
for each row execute function public.set_updated_at();

create index if not exists reservations_listing_id_idx on public.reservations(listing_id);
create index if not exists reservations_buyer_id_idx on public.reservations(buyer_id);

-- Only one active (Pending/Confirmed) reservation per listing
create unique index if not exists reservations_one_active_per_listing
  on public.reservations(listing_id)
  where status in ('Pending','Confirmed');

-- Keep updated_at and other fields from being set to invalid values.
-- (status transition rules enforced by trigger only; RLS remains scoped.)

-- NOTE: No enforcement yet for Expired-from-Confirmed vs Pending-only; Phase 1B will finalize.

-- Preventing status regression to invalid transitions is handled in trigger.

-- Reservations: protect status transitions (Phase 1A foundation)
-- Intended lifecycle: Pending -> Confirmed -> Completed
-- Terminal states: Cancelled / Expired
-- Minimum business protection:
--   - A buyer cannot change their own Pending reservation into Confirmed/Completed.
--
-- This keeps the door open for Phase 1B+ workflow implementation (seller actions can still set
-- Confirmed/Completed via their RLS + this trigger).
create or replace function public.enforce_reservation_status_transition()
returns trigger language plpgsql set search_path = 'pg_catalog', 'public' as $$
declare
  actor_is_buyer boolean := (old.buyer_id = auth.uid());
  actor_is_seller boolean := exists (
    select 1
    from public.listings l
    where l.id = old.listing_id
      and l.seller_id = auth.uid()
  );
begin
  if new.listing_id is distinct from old.listing_id then
    raise exception 'Invalid reservation update: listing_id cannot be changed';
  end if;

  if new.buyer_id is distinct from old.buyer_id then
    raise exception 'Invalid reservation update: buyer_id cannot be changed';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'Invalid reservation update: created_at cannot be modified in Phase 1A';
  end if;

  if new.expires_at is distinct from old.expires_at then
    raise exception 'Invalid reservation update: expires_at cannot be modified in Phase 1A';
  end if;

  if new.resolved_at is distinct from old.resolved_at then
    raise exception 'Invalid reservation update: resolved_at cannot be modified in Phase 1A';
  end if;

  if new.status is distinct from old.status then
    -- Disallow changes from terminal states.
    if old.status in ('Completed','Cancelled','Expired') then
      raise exception 'Invalid reservation update: cannot change from terminal status';
    end if;

    if not actor_is_buyer and not actor_is_seller then
      raise exception 'Invalid reservation update: actor is neither buyer nor seller';
    end if;

    if new.status = 'Confirmed' then
      if old.status <> 'Pending' then
        raise exception 'Invalid reservation transition to Confirmed';
      end if;
      if not actor_is_seller then
        raise exception 'Invalid reservation transition: only seller can confirm';
      end if;

    elsif new.status = 'Completed' then
      if old.status <> 'Confirmed' then
        raise exception 'Invalid reservation transition to Completed';
      end if;
      if not actor_is_seller then
        raise exception 'Invalid reservation transition: only seller can complete';
      end if;

    elsif new.status = 'Cancelled' then
      if old.status not in ('Pending','Confirmed') then
        raise exception 'Invalid reservation transition to Cancelled';
      end if;
      -- allow either buyer or seller to cancel in Phase 1A

    elsif new.status = 'Expired' then
      -- Phase 1A: allow expiration from Pending only (Confirmed->Expired left for Phase 1B rules).
      if old.status <> 'Pending' then
        raise exception 'Invalid reservation transition to Expired';
      end if;
      -- allow either buyer or seller to expire in Phase 1A

    else
      -- Prevent regression to Pending or any unknown transitions.
      raise exception 'Invalid reservation status transition';
    end if;

  end if;

  return new;
end$$;

drop trigger if exists trg_reservations_status_transition on public.reservations;
create trigger trg_reservations_status_transition
before update on public.reservations
for each row execute function public.enforce_reservation_status_transition();

-- -----------------
-- RLS configuration
-- -----------------

-- profiles
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- Public seller-display access is provided only via the safe helper:
--   public.get_profile_display(p_profile_id uuid)
--
-- The base table public.profiles remains private (no public RLS SELECT policy).
-- public SELECT permissions are not granted on the base table; listing pages
-- should call the helper to retrieve only safe seller-display fields.
--
-- (The helper never exposes contact_phone.)




drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- listings
alter table public.listings enable row level security;

-- Browse/listing detail foundation: public read

drop policy if exists listings_select_all on public.listings;
create policy listings_select_all
on public.listings
for select
to public
using (true);

-- Write by authenticated seller only (enforce email verification)

drop policy if exists listings_insert_own on public.listings;
create policy listings_insert_own
on public.listings
for insert
to authenticated
with check (
  seller_id = auth.uid()
  and exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  )
);


drop policy if exists listings_update_own on public.listings;
create policy listings_update_own
on public.listings
for update
to authenticated
using (seller_id = auth.uid())
with check (
  seller_id = auth.uid()
  and exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  )
);


drop policy if exists listings_delete_own on public.listings;
create policy listings_delete_own
on public.listings
for delete
to authenticated
using (
  seller_id = auth.uid()
  and exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  )
);

-- listing_images
alter table public.listing_images enable row level security;

-- Public read for listing detail/photo browsing

drop policy if exists listing_images_select_all on public.listing_images;
create policy listing_images_select_all
on public.listing_images
for select
to public
using (true);

-- Writes only for listing seller + confirmed email

drop policy if exists listing_images_insert_own on public.listing_images;
create policy listing_images_insert_own
on public.listing_images
for insert
to authenticated
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and l.seller_id = auth.uid()
  )
  and exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  )
);


drop policy if exists listing_images_update_own on public.listing_images;
create policy listing_images_update_own
on public.listing_images
for update
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and l.seller_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and l.seller_id = auth.uid()
  )
  and exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  )
);


drop policy if exists listing_images_delete_own on public.listing_images;
create policy listing_images_delete_own
on public.listing_images
for delete
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and l.seller_id = auth.uid()
  )
);

-- reservations
alter table public.reservations enable row level security;

-- Select: buyers see their own reservations; sellers see reservations for their listings

drop policy if exists reservations_select_buyer on public.reservations;
create policy reservations_select_buyer
on public.reservations
for select
to authenticated
using (buyer_id = auth.uid());


drop policy if exists reservations_select_seller on public.reservations;
create policy reservations_select_seller
on public.reservations
for select
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = reservations.listing_id
      and l.seller_id = auth.uid()
  )
);

-- Insert: buyer creates Pending reservation

drop policy if exists reservations_insert_buyer_pending on public.reservations;
create policy reservations_insert_buyer_pending
on public.reservations
for insert
to authenticated
with check (
  buyer_id = auth.uid()
  and status = 'Pending'
  and exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  )
);

-- Update: buyer can update their own reservation

drop policy if exists reservations_update_buyer on public.reservations;
create policy reservations_update_buyer
on public.reservations
for update
to authenticated
using (buyer_id = auth.uid())
with check (
  buyer_id = auth.uid()
  and exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  )
);

-- Update: seller can update reservations for their listings

drop policy if exists reservations_update_seller on public.reservations;
create policy reservations_update_seller
on public.reservations
for update
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = reservations.listing_id
      and l.seller_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.listings l
    where l.id = reservations.listing_id
      and l.seller_id = auth.uid()
  )
  and exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  )
);

-- -----------------
-- Storage foundation
-- -----------------
-- Storage path conventions (inside object name, not including bucket_id):
-- profile-avatars bucket:
--   <user_id>/<file>
-- listing-photos bucket:
--   <seller_id>/<listing_id>/<sort_order>_<file>

-- Create buckets (idempotent)
insert into storage.buckets (id, name, public)
values
  ('profile-avatars','profile-avatars', false),
  ('listing-photos','listing-photos', true)
on conflict (id) do nothing;

-- Avatars: owner-only read/write

drop policy if exists avatar_select_own on storage.objects;
create policy avatar_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);


drop policy if exists avatar_write_own on storage.objects;
create policy avatar_write_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);


drop policy if exists avatar_update_own on storage.objects;
create policy avatar_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'profile-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);


drop policy if exists avatar_delete_own on storage.objects;
create policy avatar_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Listing photos: seller-only write; public read via public bucket

drop policy if exists listing_photos_select_public on storage.objects;
create policy listing_photos_select_public
on storage.objects
for select
to public
using (bucket_id = 'listing-photos');


drop policy if exists listing_photos_write_own on storage.objects;
create policy listing_photos_write_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-photos'
  and split_part(name, '/', 1) = auth.uid()::text
  and exists (
    select 1
    from public.listings l
    where l.id::text = split_part(name, '/', 2)
      and l.seller_id = auth.uid()
  )
);


drop policy if exists listing_photos_update_own on storage.objects;
create policy listing_photos_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-photos'
  and split_part(name, '/', 1) = auth.uid()::text
  and exists (
    select 1
    from public.listings l
    where l.id::text = split_part(name, '/', 2)
      and l.seller_id = auth.uid()
  )
)
with check (
  bucket_id = 'listing-photos'
  and split_part(name, '/', 1) = auth.uid()::text
  and exists (
    select 1
    from public.listings l
    where l.id::text = split_part(name, '/', 2)
      and l.seller_id = auth.uid()
  )
);


drop policy if exists listing_photos_delete_own on storage.objects;
create policy listing_photos_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-photos'
  and split_part(name, '/', 1) = auth.uid()::text
  and exists (
    select 1
    from public.listings l
    where l.id::text = split_part(name, '/', 2)
      and l.seller_id = auth.uid()
  )
);
