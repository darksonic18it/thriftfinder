begin;

drop policy if exists reports_insert_own on public.reports;

create policy reports_insert_own
on public.reports
for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and resolution_note is null
  and public.is_email_confirmed()
  and (
    (target_type = 'listing' and not exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = (select auth.uid())))
    or (target_type = 'user' and reported_user_id <> (select auth.uid()))
    or (target_type = 'message' and not exists (
      select 1 from public.messages m
      where m.id = message_id and m.sender_id = (select auth.uid())))
  )
);

commit;