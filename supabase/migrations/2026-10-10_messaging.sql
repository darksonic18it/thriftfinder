-- ThriftFinder: in-app messaging backend (conversations + messages).
-- Non-destructive and idempotent: safe to run more than once in the Supabase SQL editor.
--
-- Model (matches the ERD):
--   conversations = one thread per (listing, buyer, seller)
--   messages      = rows inside a thread
--
-- Who can do what (the database owns the rules, the client cannot bypass them):
--   * Conversations are created ONLY through start_conversation(). There is no
--     insert policy, so a direct INSERT from the browser is denied.
--       - a buyer starts a thread on someone else's listing
--       - a seller can start a thread with a buyer who has reserved that listing
--   * Only the two participants can read a thread or send into it.
--   * Messages can never be edited or deleted by clients (no update/delete policy).
--     "Read" status is changed only through mark_conversation_read().
--
-- RPCs: start_conversation, get_my_conversations, mark_conversation_read,
--       get_unread_message_count

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_no_self check (buyer_id <> seller_id),
  constraint conversations_one_thread unique (listing_id, buyer_id, seller_id)
);

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create index if not exists conversations_buyer_idx on public.conversations (buyer_id, updated_at desc);
create index if not exists conversations_seller_idx on public.conversations (seller_id, updated_at desc);
create index if not exists conversations_listing_idx on public.conversations (listing_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_content_length check (char_length(content) between 1 and 2000)
);

drop trigger if exists trg_messages_updated_at on public.messages;
create trigger trg_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);
create index if not exists messages_unread_idx
  on public.messages (conversation_id) where is_read = false;

-- ---------------------------------------------------------------------
-- 2. Message rules
--    * sender must be one of the two participants
--    * new messages always start unread
--    * content is trimmed (so "   " is rejected by the length check)
--    * after insert, bump the thread's updated_at so it sorts to the top
-- ---------------------------------------------------------------------
create or replace function public.enforce_message_rules()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  r record;
begin
  select c.buyer_id, c.seller_id
    into r
  from public.conversations c
  where c.id = new.conversation_id;

  if not found or new.sender_id not in (r.buyer_id, r.seller_id) then
    raise exception 'You are not part of this conversation.';
  end if;

  new.is_read := false;
  new.content := btrim(new.content);
  return new;
end $$;

drop trigger if exists trg_messages_enforce_rules on public.messages;
create trigger trg_messages_enforce_rules
before insert on public.messages
for each row execute function public.enforce_message_rules();

create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
begin
  update public.conversations c
     set updated_at = new.created_at
   where c.id = new.conversation_id;
  return new;
end $$;

drop trigger if exists trg_messages_touch_conversation on public.messages;
create trigger trg_messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation_on_message();

-- ---------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Participants can read their threads. No insert/update/delete policy on
-- purpose: threads are created by start_conversation() only.
drop policy if exists conversations_select_participant on public.conversations;
create policy conversations_select_participant
on public.conversations
for select
to authenticated
using (auth.uid() in (buyer_id, seller_id));

drop policy if exists messages_select_participant on public.messages;
create policy messages_select_participant
on public.messages
for select
to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and auth.uid() in (c.buyer_id, c.seller_id)
  )
);

drop policy if exists messages_insert_sender on public.messages;
create policy messages_insert_sender
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and auth.uid() in (c.buyer_id, c.seller_id)
  )
  and exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  )
);

-- ---------------------------------------------------------------------
-- 4. Realtime: let the browser hear about new messages (RLS still applies,
--    so each user only receives messages from their own threads).
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. RPCs
-- ---------------------------------------------------------------------

-- Find or create the thread for a listing. Returns the conversation id.
--   buyer:  start_conversation(listing_id)
--   seller: start_conversation(listing_id, buyer_id)  -- buyer must have reserved it
create or replace function public.start_conversation(
  p_listing_id uuid,
  p_buyer_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_seller uuid;
  v_status text;
  v_buyer uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Sign in to send messages.';
  end if;

  if not exists (
    select 1 from auth.users u
    where u.id = v_uid and u.email_confirmed_at is not null
  ) then
    raise exception 'Verify your email to send messages.';
  end if;

  select l.seller_id, l.status::text
    into v_seller, v_status
  from public.listings l
  where l.id = p_listing_id;

  if not found then
    raise exception 'Listing not found.';
  end if;

  if v_uid = v_seller then
    if p_buyer_id is null then
      raise exception 'Choose a buyer to message.';
    end if;
    if not exists (
      select 1 from public.reservations r
      where r.listing_id = p_listing_id and r.buyer_id = p_buyer_id
    ) then
      raise exception 'You can only message buyers who reserved this listing.';
    end if;
    v_buyer := p_buyer_id;
  else
    v_buyer := v_uid;
  end if;

  -- Existing thread: always reachable, even if the listing was archived since.
  select c.id into v_id
  from public.conversations c
  where c.listing_id = p_listing_id
    and c.buyer_id = v_buyer
    and c.seller_id = v_seller;

  if v_id is not null then
    return v_id;
  end if;

  if v_status <> 'active' then
    raise exception 'This listing is no longer available for messages.';
  end if;

  insert into public.conversations (listing_id, buyer_id, seller_id)
  values (p_listing_id, v_buyer, v_seller)
  on conflict on constraint conversations_one_thread
  do update set listing_id = excluded.listing_id
  returning id into v_id;

  return v_id;
end $$;
revoke execute on function public.start_conversation(uuid, uuid) from public;
grant execute on function public.start_conversation(uuid, uuid) to authenticated;

-- The signed-in user's inbox, newest activity first.
create or replace function public.get_my_conversations()
returns table (
  conversation_id uuid,
  listing_id uuid,
  listing_title text,
  other_user_id uuid,
  other_user_name text,
  other_user_avatar_path text,
  last_message text,
  last_message_at timestamptz,
  last_message_sender_id uuid,
  unread_count bigint,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  return query
  select
    c.id,
    c.listing_id,
    l.title,
    o.id,
    o.full_name,
    o.avatar_path,
    lm.content,
    lm.created_at,
    lm.sender_id,
    (
      select count(*) from public.messages m
      where m.conversation_id = c.id
        and m.sender_id <> auth.uid()
        and m.is_read = false
    ),
    c.updated_at
  from public.conversations c
  join public.listings l on l.id = c.listing_id
  join public.profiles o
    on o.id = case when c.buyer_id = auth.uid() then c.seller_id else c.buyer_id end
  left join lateral (
    select m2.content, m2.created_at, m2.sender_id
    from public.messages m2
    where m2.conversation_id = c.id
    order by m2.created_at desc
    limit 1
  ) lm on true
  where auth.uid() in (c.buyer_id, c.seller_id)
  order by coalesce(lm.created_at, c.created_at) desc;
end $$;
revoke execute on function public.get_my_conversations() from public;
grant execute on function public.get_my_conversations() to authenticated;

-- Mark everything the OTHER person sent in this thread as read.
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  n integer;
begin
  if auth.uid() is null then
    return 0;
  end if;

  update public.messages m
     set is_read = true
   where m.conversation_id = p_conversation_id
     and m.sender_id <> auth.uid()
     and m.is_read = false
     and exists (
       select 1 from public.conversations c
       where c.id = p_conversation_id
         and auth.uid() in (c.buyer_id, c.seller_id)
     );

  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- Total unread messages across all threads (for the badge on the Messages pill).
create or replace function public.get_unread_message_count()
returns bigint
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  n bigint;
begin
  if auth.uid() is null then
    return 0;
  end if;

  select count(*) into n
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where auth.uid() in (c.buyer_id, c.seller_id)
    and m.sender_id <> auth.uid()
    and m.is_read = false;

  return coalesce(n, 0);
end $$;
revoke execute on function public.get_unread_message_count() from public;
grant execute on function public.get_unread_message_count() to authenticated;