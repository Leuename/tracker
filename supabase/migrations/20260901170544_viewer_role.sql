-- A fifth account that can see the ledger and change nothing — Decisions D20.
--
-- Until now "being signed in" was the whole authorization (D8): every policy
-- read `for all to authenticated using (true)`, so the four accounts were
-- interchangeable and any fifth would have been too. Roles cannot come from a
-- grant, because every account is the same `authenticated` role to Postgres, so
-- the distinction has to live in the policy predicates.

create table public.profiles (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  role       text        not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

-- Every existing account keeps exactly what it has today. This runs in the same
-- migration as the policy rewrite on purpose: between the two there is a moment
-- where a missing row would mean no write access, and it must not be possible
-- to deploy one without the other.
insert into public.profiles (user_id, role)
select id, 'admin' from auth.users
on conflict (user_id) do nothing;

-- `security definer` so a policy can ask about the caller's role without the
-- caller needing to read profiles, and without the policy on profiles being
-- consulted recursively while it is itself being evaluated. `stable` so it is
-- evaluated once per statement rather than once per row.
create or replace function public.is_viewer()
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

revoke all on function public.is_viewer() from public, anon;
grant execute on function public.is_viewer() to authenticated;

alter table public.profiles enable row level security;

-- Readable so the app can grey out what a viewer cannot use; never writable
-- from a client, because an account that can edit its own role has no role.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

create policy "any signed-in account may read the roster" on public.profiles
  for select to authenticated using (true);

-- Every table added later needs its own trigger, exactly as D24 says.
create trigger profiles_audit
  after insert or update or delete on public.profiles
  for each row execute function public.log_change();

-- ---------------------------------------------------------------------------
-- The policy rewrite. `for all using (true)` becomes read-for-everyone plus
-- write-for-administrators, on each of the five ledger tables.
-- ---------------------------------------------------------------------------

drop policy "any signed-in account may use the tracker"    on public.txns;
drop policy "any signed-in account may use the receipts"   on public.receipts;
drop policy "any signed-in account may use the masterlist" on public.recurring;
drop policy "any signed-in account may use the transfers"  on public.transfers;
drop policy "any signed-in account may use the settings"   on public.app_config;

create policy "any signed-in account may read the tracker" on public.txns
  for select to authenticated using (true);
create policy "administrators may add to the tracker" on public.txns
  for insert to authenticated with check (not public.is_viewer());
create policy "administrators may edit the tracker" on public.txns
  for update to authenticated using (not public.is_viewer()) with check (not public.is_viewer());
create policy "administrators may delete from the tracker" on public.txns
  for delete to authenticated using (not public.is_viewer());

create policy "any signed-in account may read the receipts" on public.receipts
  for select to authenticated using (true);
create policy "administrators may add receipts" on public.receipts
  for insert to authenticated with check (not public.is_viewer());
create policy "administrators may edit receipts" on public.receipts
  for update to authenticated using (not public.is_viewer()) with check (not public.is_viewer());
create policy "administrators may delete receipts" on public.receipts
  for delete to authenticated using (not public.is_viewer());

create policy "any signed-in account may read the masterlist" on public.recurring
  for select to authenticated using (true);
create policy "administrators may add to the masterlist" on public.recurring
  for insert to authenticated with check (not public.is_viewer());
create policy "administrators may edit the masterlist" on public.recurring
  for update to authenticated using (not public.is_viewer()) with check (not public.is_viewer());
create policy "administrators may delete from the masterlist" on public.recurring
  for delete to authenticated using (not public.is_viewer());

create policy "any signed-in account may read the transfers" on public.transfers
  for select to authenticated using (true);
create policy "administrators may add transfers" on public.transfers
  for insert to authenticated with check (not public.is_viewer());
create policy "administrators may edit transfers" on public.transfers
  for update to authenticated using (not public.is_viewer()) with check (not public.is_viewer());
create policy "administrators may delete transfers" on public.transfers
  for delete to authenticated using (not public.is_viewer());

create policy "any signed-in account may read the settings" on public.app_config
  for select to authenticated using (true);
create policy "administrators may create the settings" on public.app_config
  for insert to authenticated with check (not public.is_viewer());
create policy "administrators may change the settings" on public.app_config
  for update to authenticated using (not public.is_viewer()) with check (not public.is_viewer());

-- Receipt documents follow the rows they belong to: a viewer may open one and
-- may not add, replace or remove one.
drop policy "signed-in accounts upload receipt files"  on storage.objects;
drop policy "signed-in accounts replace receipt files" on storage.objects;
drop policy "signed-in accounts remove receipt files"  on storage.objects;

create policy "administrators upload receipt files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and not public.is_viewer());

create policy "administrators replace receipt files" on storage.objects
  for update to authenticated
  using (bucket_id = 'receipts' and not public.is_viewer())
  with check (bucket_id = 'receipts' and not public.is_viewer());

create policy "administrators remove receipt files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and not public.is_viewer());
