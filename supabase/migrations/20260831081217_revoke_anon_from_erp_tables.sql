-- Supabase's default privileges on `public` hand every new table to `anon`,
-- so the previous migration's grant-only-to-authenticated did not have the
-- effect its comment claimed. RLS was already denying anon every row, but a
-- signed-out client should be refused at the privilege level too: this app has
-- no public data, and defence in depth means a future policy mistake cannot
-- turn into a leak.
revoke all on public.txns       from anon;
revoke all on public.receipts   from anon;
revoke all on public.recurring  from anon;
revoke all on public.app_config from anon;
