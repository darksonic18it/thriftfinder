begin;

-- 1) Message column and rules ---------------------------------------------
alter table public.messages add column if not exists image_path text;

-- A message needs text, a photo, or both.
alter table public.messages drop constraint if exists messages_content_length;
alter table public.messages add constraint messages_content_length
  check (
    char_length(content) <= 2000
    and (char_length(content) >= 1 or image_path is not null)
  );

-- A photo must live in this conversation's folder, under the sender's own folder.
alter table public.messages drop constraint if exists messages_image_path_shape;
alter table public.messages add constraint messages_image_path_shape
  check (
    image_path is null
    or image_path like (conversation_id::text || '/' || sender_id::text || '/%')
  );

-- 2) Private storage bucket (5 MB, images only) -----------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', false, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3) Storage policies. Path format: <conversation_id>/<sender_id>/<file> ----
drop policy if exists chat_images_insert on storage.objects;
create policy chat_images_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-images'
  and split_part(objects.name, '/', 2) = (select auth.uid())::text
  and exists (
    select 1 from public.conversations c
    where c.id::text = split_part(objects.name, '/', 1)
      and (select auth.uid()) in (c.buyer_id, c.seller_id)
  )
  and (select public.is_email_confirmed())
  and not public.is_user_suspended((select auth.uid()))
);

drop policy if exists chat_images_select on storage.objects;
create policy chat_images_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-images'
  and exists (
    select 1 from public.conversations c
    where c.id::text = split_part(objects.name, '/', 1)
      and (select auth.uid()) in (c.buyer_id, c.seller_id)
  )
);

drop policy if exists chat_images_delete on storage.objects;
create policy chat_images_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-images'
  and split_part(objects.name, '/', 2) = (select auth.uid())::text
);

-- 4) Inbox preview: show "Photo" for image messages ---------------------------
create or replace function public.get_my_conversations()
returns table (
  conversation_id uuid, listing_id uuid, listing_title text,
  other_user_id uuid, other_user_name text, other_user_avatar_path text,
  last_message text, last_message_at timestamptz, last_message_sender_id uuid,
  unread_count bigint, updated_at timestamptz
)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
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
    case
      when lm.image_path is not null and btrim(coalesce(lm.content, '')) = '' then '📷 Photo'
      when lm.image_path is not null then '📷 ' || lm.content
      else lm.content
    end,
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
    select m2.content, m2.image_path, m2.created_at, m2.sender_id
    from public.messages m2
    where m2.conversation_id = c.id
    order by m2.created_at desc
    limit 1
  ) lm on true
  where auth.uid() in (c.buyer_id, c.seller_id)
  order by coalesce(lm.created_at, c.created_at) desc;
end $function$;

-- 5) Notification text for photo messages ------------------------------------
create or replace function public.create_message_notification()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_recipient_id uuid;
  v_listing_id uuid;
  v_listing_title text;
  v_sender_name text;
  v_preview text;
begin
  select
    case
      when c.buyer_id = new.sender_id then c.seller_id
      when c.seller_id = new.sender_id then c.buyer_id
      else null
    end,
    c.listing_id
  into v_recipient_id, v_listing_id
  from public.conversations c
  where c.id = new.conversation_id;

  if v_recipient_id is null then
    return new;
  end if;

  select l.title into v_listing_title from public.listings l where l.id = v_listing_id;
  select p.full_name into v_sender_name from public.profiles p where p.id = new.sender_id;

  v_preview := case
    when new.image_path is not null and btrim(new.content) = '' then 'Sent a photo'
    when new.image_path is not null then 'Photo: ' || left(new.content, 110)
    else left(new.content, 120)
  end;

  insert into public.notifications (
    recipient_id, actor_id, type, title, message, link,
    entity_type, entity_id, dedupe_key
  )
  values (
    v_recipient_id,
    new.sender_id,
    'user',
    'New message',
    coalesce(nullif(v_sender_name, ''), 'Someone') ||
      case
        when v_listing_title is not null
          then ' sent you a message about ' || v_listing_title
        else ' sent you a message'
      end ||
      ': ' || v_preview,
    '/dashboard?conversationId=' || new.conversation_id::text,
    'message',
    new.id,
    'message:' || new.id::text || ':recipient:' || v_recipient_id::text
  )
  on conflict (dedupe_key) do nothing;

  return new;
end;
$function$;

commit;