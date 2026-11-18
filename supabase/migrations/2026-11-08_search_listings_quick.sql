begin;

-- Fast substring search on titles (optional but cheap)
create extension if not exists pg_trgm with schema extensions;

create index if not exists listings_title_trgm_idx
  on public.listings using gin (title extensions.gin_trgm_ops)
  where status = 'active';

create or replace function public.search_listings_quick(
  p_query text,
  p_limit integer default 6
)
returns table (
  id uuid,
  title text,
  category text,
  price numeric,
  cover_image_path text
)
language sql
stable
security definer
set search_path = 'pg_catalog', 'public'
as $$
  with q as (select btrim(coalesce(p_query, '')) as term)
  select
    l.id,
    l.title,
    l.category,
    l.price,
    cover.storage_path as cover_image_path
  from public.listings l
  cross join q
  left join lateral (
    select li.storage_path
    from public.listing_images li
    where li.listing_id = l.id
    order by li.sort_order asc, li.created_at asc
    limit 1
  ) cover on true
  where length(q.term) >= 2
    and l.status = 'active'
    and (
      l.title    ilike '%' || public.like_escape(q.term) || '%'
      or l.category ilike '%' || public.like_escape(q.term) || '%'
    )
  order by
    (l.title ilike public.like_escape(q.term) || '%') desc,  -- "starts with" first
    l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 6), 10));
$$;

-- Signed-in only (the dashboard navbar is for logged-in users)
revoke all on function public.search_listings_quick(text, integer) from public, anon;
grant execute on function public.search_listings_quick(text, integer) to authenticated;

commit;