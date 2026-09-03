-- Move `is_viewer()` out of the schema PostgREST exposes — Decisions D34, R7.
--
-- A Supabase advisor flags `public.is_viewer()` as a `security definer`
-- function callable by `authenticated` over `/rest/v1/rpc/is_viewer`. The
-- advisor offers two remediations and only the second one is available here.
--
-- Its first — revoke EXECUTE from `authenticated` — was tested on 2026-09-02
-- and must never be applied (D34, brief N1). Postgres checks EXECUTE on a
-- function used in an RLS policy against the QUERYING role at query time, not
-- against the definer, so revoking it leaves every account able to read the
-- whole ledger and unable to write a single row: `42501` on every insert,
-- update and delete across all six tables and on receipt uploads, while reads
-- keep working. The app looks almost fine, which is worse than an outage.
--
-- Its second is this migration. PostgREST exposes `public` and
-- `graphql_public` only, so a function in `private` has no REST endpoint and
-- the advisory clears, while policies — evaluated inside the server — reach it
-- exactly as before.
--
-- Seventeen policies call it: three each on `txns`, `receipts`, `recurring`,
-- `transfers` and `storage.objects`, two on `app_config` (there is no
-- `app_config` delete policy), plus the guard inside `merge_app_config`. All
-- eighteen call sites are re-pointed below.
--
-- `public.is_viewer()` is deliberately NOT dropped here. The deployed frontend
-- still calls it over RPC at `apps/web/src/db.js`, and dropping it before that
-- deploy lands breaks sign-in for everyone. The drop is a separate migration —
-- `20260903071600_drop_public_is_viewer.sql` — to be applied only after the
-- client change is live.

create schema if not exists private;

-- Revoke-then-grant, the same shape D23 and D25 required for tables: a schema
-- created by `postgres` grants nothing to PUBLIC, but saying so is cheaper than
-- assuming it.
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- Body identical to `public.is_viewer()` as created in
-- `20260901170544_viewer_role.sql`, including the pinned empty `search_path`
-- and the coalesce that makes an account with no profile row a viewer.
--
-- `security definer` so a policy can ask about the caller's role without the
-- caller needing to read profiles, and without the policy on profiles being
-- consulted recursively while it is itself being evaluated. `stable` so it is
-- evaluated once per statement rather than once per row.
create or replace function private.is_viewer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- Defaults to TRUE for an account with no profile row: an account created in
  -- the dashboard and forgotten about can read and change nothing, rather than
  -- silently holding full delete rights over real financial data. Creating an
  -- account is two steps now, and the second one is the one that grants power.
  select coalesce(
    (select p.role = 'viewer' from public.profiles p where p.user_id = (select auth.uid())),
    true)
$$;

revoke all on function private.is_viewer() from public, anon;
grant execute on function private.is_viewer() to authenticated;

-- ---------------------------------------------------------------------------
-- The seventeen policies, dropped and recreated against `private.is_viewer()`.
-- Names, commands, roles and predicates are otherwise unchanged: this migration
-- moves a function, it does not change who may do what.
--
-- The `for select ... using (true)` policies on all six tables are untouched,
-- because none of them consults the function.
-- ---------------------------------------------------------------------------

drop policy "administrators may add to the tracker"      on public.txns;
drop policy "administrators may edit the tracker"        on public.txns;
drop policy "administrators may delete from the tracker" on public.txns;

create policy "administrators may add to the tracker" on public.txns
  for insert to authenticated with check (not private.is_viewer());
create policy "administrators may edit the tracker" on public.txns
  for update to authenticated using (not private.is_viewer()) with check (not private.is_viewer());
create policy "administrators may delete from the tracker" on public.txns
  for delete to authenticated using (not private.is_viewer());

drop policy "administrators may add receipts"    on public.receipts;
drop policy "administrators may edit receipts"   on public.receipts;
drop policy "administrators may delete receipts" on public.receipts;

create policy "administrators may add receipts" on public.receipts
  for insert to authenticated with check (not private.is_viewer());
create policy "administrators may edit receipts" on public.receipts
  for update to authenticated using (not private.is_viewer()) with check (not private.is_viewer());
create policy "administrators may delete receipts" on public.receipts
  for delete to authenticated using (not private.is_viewer());

drop policy "administrators may add to the masterlist"      on public.recurring;
drop policy "administrators may edit the masterlist"        on public.recurring;
drop policy "administrators may delete from the masterlist" on public.recurring;

create policy "administrators may add to the masterlist" on public.recurring
  for insert to authenticated with check (not private.is_viewer());
create policy "administrators may edit the masterlist" on public.recurring
  for update to authenticated using (not private.is_viewer()) with check (not private.is_viewer());
create policy "administrators may delete from the masterlist" on public.recurring
  for delete to authenticated using (not private.is_viewer());

drop policy "administrators may add transfers"    on public.transfers;
drop policy "administrators may edit transfers"   on public.transfers;
drop policy "administrators may delete transfers" on public.transfers;

create policy "administrators may add transfers" on public.transfers
  for insert to authenticated with check (not private.is_viewer());
create policy "administrators may edit transfers" on public.transfers
  for update to authenticated using (not private.is_viewer()) with check (not private.is_viewer());
create policy "administrators may delete transfers" on public.transfers
  for delete to authenticated using (not private.is_viewer());

-- Two, not three: `app_config` is a singleton and has no delete policy.
drop policy "administrators may create the settings" on public.app_config;
drop policy "administrators may change the settings" on public.app_config;

create policy "administrators may create the settings" on public.app_config
  for insert to authenticated with check (not private.is_viewer());
create policy "administrators may change the settings" on public.app_config
  for update to authenticated using (not private.is_viewer()) with check (not private.is_viewer());

-- Receipt documents follow the rows they belong to: a viewer may open one and
-- may not add, replace or remove one.
drop policy "administrators upload receipt files"  on storage.objects;
drop policy "administrators replace receipt files" on storage.objects;
drop policy "administrators remove receipt files"  on storage.objects;

create policy "administrators upload receipt files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and not private.is_viewer());

create policy "administrators replace receipt files" on storage.objects
  for update to authenticated
  using (bucket_id = 'receipts' and not private.is_viewer())
  with check (bucket_id = 'receipts' and not private.is_viewer());

create policy "administrators remove receipt files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and not private.is_viewer());

-- ---------------------------------------------------------------------------
-- The eighteenth call site. Body unchanged from
-- `20260901170754_harden_merge_app_config.sql` apart from the schema on the
-- guard: the function still raises the same `42501` a direct table write
-- returns, so a refused save stays legible instead of arriving as `0`.
-- ---------------------------------------------------------------------------
create or replace function public.merge_app_config(patch jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  touched integer;
begin
  if private.is_viewer() then
    raise exception 'permission denied for table app_config' using errcode = '42501';
  end if;

  update public.app_config
     set data = (data || (patch - 'settings'))
                || case
                     when patch ? 'settings'
                       then jsonb_build_object(
                              'settings',
                              coalesce(data->'settings', '{}'::jsonb) || (patch->'settings'))
                     else '{}'::jsonb
                   end
   where id = true;
  get diagnostics touched = row_count;
  return touched;   -- 0 now means only what it says: the workspace has no config row yet
end;
$$;

revoke all on function public.merge_app_config(jsonb) from public, anon;
grant execute on function public.merge_app_config(jsonb) to authenticated;

-- rollback:
--   Safe only while `public.is_viewer()` still exists — that is, before
--   `20260903071600_drop_public_is_viewer.sql` has been applied. If that one
--   has landed, roll IT back first or these policies will reference a function
--   that is not there and every write will fail `42883`.
--
--   drop policy "administrators may add to the tracker"      on public.txns;
--   drop policy "administrators may edit the tracker"        on public.txns;
--   drop policy "administrators may delete from the tracker" on public.txns;
--   create policy "administrators may add to the tracker" on public.txns
--     for insert to authenticated with check (not public.is_viewer());
--   create policy "administrators may edit the tracker" on public.txns
--     for update to authenticated using (not public.is_viewer()) with check (not public.is_viewer());
--   create policy "administrators may delete from the tracker" on public.txns
--     for delete to authenticated using (not public.is_viewer());
--
--   drop policy "administrators may add receipts"    on public.receipts;
--   drop policy "administrators may edit receipts"   on public.receipts;
--   drop policy "administrators may delete receipts" on public.receipts;
--   create policy "administrators may add receipts" on public.receipts
--     for insert to authenticated with check (not public.is_viewer());
--   create policy "administrators may edit receipts" on public.receipts
--     for update to authenticated using (not public.is_viewer()) with check (not public.is_viewer());
--   create policy "administrators may delete receipts" on public.receipts
--     for delete to authenticated using (not public.is_viewer());
--
--   drop policy "administrators may add to the masterlist"      on public.recurring;
--   drop policy "administrators may edit the masterlist"        on public.recurring;
--   drop policy "administrators may delete from the masterlist" on public.recurring;
--   create policy "administrators may add to the masterlist" on public.recurring
--     for insert to authenticated with check (not public.is_viewer());
--   create policy "administrators may edit the masterlist" on public.recurring
--     for update to authenticated using (not public.is_viewer()) with check (not public.is_viewer());
--   create policy "administrators may delete from the masterlist" on public.recurring
--     for delete to authenticated using (not public.is_viewer());
--
--   drop policy "administrators may add transfers"    on public.transfers;
--   drop policy "administrators may edit transfers"   on public.transfers;
--   drop policy "administrators may delete transfers" on public.transfers;
--   create policy "administrators may add transfers" on public.transfers
--     for insert to authenticated with check (not public.is_viewer());
--   create policy "administrators may edit transfers" on public.transfers
--     for update to authenticated using (not public.is_viewer()) with check (not public.is_viewer());
--   create policy "administrators may delete transfers" on public.transfers
--     for delete to authenticated using (not public.is_viewer());
--
--   drop policy "administrators may create the settings" on public.app_config;
--   drop policy "administrators may change the settings" on public.app_config;
--   create policy "administrators may create the settings" on public.app_config
--     for insert to authenticated with check (not public.is_viewer());
--   create policy "administrators may change the settings" on public.app_config
--     for update to authenticated using (not public.is_viewer()) with check (not public.is_viewer());
--
--   drop policy "administrators upload receipt files"  on storage.objects;
--   drop policy "administrators replace receipt files" on storage.objects;
--   drop policy "administrators remove receipt files"  on storage.objects;
--   create policy "administrators upload receipt files" on storage.objects
--     for insert to authenticated
--     with check (bucket_id = 'receipts' and not public.is_viewer());
--   create policy "administrators replace receipt files" on storage.objects
--     for update to authenticated
--     using (bucket_id = 'receipts' and not public.is_viewer())
--     with check (bucket_id = 'receipts' and not public.is_viewer());
--   create policy "administrators remove receipt files" on storage.objects
--     for delete to authenticated
--     using (bucket_id = 'receipts' and not public.is_viewer());
--
--   Restore the guard in `merge_app_config`. Re-apply
--   `20260901170754_harden_merge_app_config.sql` verbatim; it is a
--   `create or replace` and needs no editing.
--
--   drop function if exists private.is_viewer();
--   drop schema if exists private;   -- fails if anything else was put in it, deliberately
--
--   Then verify, because {"success": true} proves the SQL ran and nothing more:
--     select count(*) from pg_policies
--      where qual like '%private.is_viewer%' or with_check like '%private.is_viewer%';
--     -- expect 0, and 17 for the same query against public.is_viewer
