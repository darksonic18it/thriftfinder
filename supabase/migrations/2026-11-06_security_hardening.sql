begin;

-- 1) PHONE PRIVACY ---------------------------------------------------------
-- Own full profile (incl. phone) only through this function.
create or replace function public.get_my_profile()
returns table (
  id uuid, full_name text, contact_phone text, avatar_path text,
  cover_path text, bio text, location_city text,
  created_at timestamptz, updated_at timestamptz
)
language sql stable security definer
set search_path = 'pg_catalog', 'public'
as $$
  select p.id, p.full_name, p.contact_phone, p.avatar_path, p.cover_path,
         p.bio, p.location_city, p.created_at, p.updated_at
  from public.profiles p
  where p.id = (select auth.uid());
$$;
revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

-- Everyone else can read only the public columns (not contact_phone).
revoke select on public.profiles from authenticated;
grant select (id, full_name, avatar_path, cover_path, bio, location_city,
              created_at, updated_at)
  on public.profiles to authenticated;

-- 2) FUNCTION EXECUTE HARDENING ---------------------------------------------
do $$
declare r record;
begin
  -- Trigger functions never need to be callable by API roles.
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prorettype = 'pg_catalog.trigger'::regtype
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
  end loop;

  -- Signed-in-only functions: remove logged-out access, keep authenticated.
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prokind = 'f'
      and p.prorettype <> 'pg_catalog.trigger'::regtype
      and (
        p.proname like 'admin\_%' escape '\'
        or p.proname in (
          'current_admin_role','is_admin','is_active_admin',
          'is_email_confirmed','is_user_suspended',
          'start_conversation','follow_profile','unfollow_profile',
          'mark_conversation_read','get_my_conversations','get_my_stats',
          'get_unread_message_count','get_reviewable_reservations',
          'get_active_listing_coordinates','mark_listing_sold'
        )
      )
  loop
    execute format('revoke all on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;

  -- Pin search_path on the two flagged functions.
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('reservation_holding_period','like_escape')
  loop
    execute format('alter function %s set search_path = pg_catalog, public', r.sig);
  end loop;
end $$;
-- Left public on purpose (logged-out browsing): browse_listings,
-- get_listing_detail, nearby_listings, get_public_seller_*, get_seller_review*,
-- get_follow_counts, get_profile_display, is_following, expire_due_reservations.

-- 3) TABLE GRANTS (defence in depth; RLS still applies) ----------------------
revoke all on all tables in schema public from anon;
grant select on public.listings, public.listing_images, public.reviews to anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
alter default privileges in schema public revoke all on tables from anon;

-- 4) STORAGE LIMITS ----------------------------------------------------------
update storage.buckets
set file_size_limit = 10485760,  -- 10 MB
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
where id in ('listing-photos','profile-avatars','profile-covers');

-- 5) SUSPENDED USERS CAN'T FILE REPORTS --------------------------------------
drop policy if exists reports_block_suspended on public.reports;
create policy reports_block_suspended
on public.reports
as restrictive
for insert
to authenticated
with check (not public.is_user_suspended((select auth.uid())));

commit;