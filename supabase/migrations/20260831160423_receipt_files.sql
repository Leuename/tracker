-- The liquidation dialog drew a drop zone that accepted nothing, and the
-- "Require a receipt file to liquidate" setting enforced nothing, because
-- there was nowhere to put a file. This gives both something real.

alter table public.receipts add column file_path text;

grant update (file_path) on public.receipts to authenticated;
-- Re-grant the insert column list with the new column included; a column-level
-- grant replaces nothing on its own, and inserts must be able to carry it.
grant insert (file_path) on public.receipts to authenticated;

-- Private bucket: these are financial documents, so nothing is world-readable.
-- Files are reached through short-lived signed URLs instead.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts', 'receipts', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Same access model as the ledger itself: the three accounts share one set of
-- documents, and a signed-out client reaches none of them.
create policy "signed-in accounts read receipt files" on storage.objects
  for select to authenticated using (bucket_id = 'receipts');

create policy "signed-in accounts upload receipt files" on storage.objects
  for insert to authenticated with check (bucket_id = 'receipts');

create policy "signed-in accounts replace receipt files" on storage.objects
  for update to authenticated
  using (bucket_id = 'receipts') with check (bucket_id = 'receipts');

create policy "signed-in accounts remove receipt files" on storage.objects
  for delete to authenticated using (bucket_id = 'receipts');
