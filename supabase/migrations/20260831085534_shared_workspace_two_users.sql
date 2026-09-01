-- The first schema gave every account its own private copy of the data, which
-- is wrong for this app: an admin and an executive share one company ledger.
-- Ownership is dropped entirely — there is one dataset, and any signed-in
-- account may read and write all of it.
--
-- All four tables are empty at this point (the smoke-test account and its rows
-- were deleted), so they are recreated rather than migrated in place.

drop table if exists public.txns;
drop table if exists public.receipts;
drop table if exists public.recurring;
drop table if exists public.app_config;

create table public.txns (
  id          bigint      primary key,
  co          text        not null,
  cat         text        not null,
  description text        not null default '',
  period      text        not null default '',
  due         date,
  amount      numeric(14,2) not null default 0,
  status      text        not null default 'pending',
  done        date,
  pay_type    text,
  check_no    text,
  notes       text,
  created_at  timestamptz not null default now()
);

create table public.receipts (
  id          bigint      primary key,
  co          text        not null,
  name        text        not null default '',
  description text        not null default '',
  amount      numeric(14,2) not null default 0,
  status      text        not null default 'pending',
  date        date,
  actual      numeric(14,2),
  created_at  timestamptz not null default now()
);

create table public.recurring (
  id          bigint      primary key,
  co          text        not null,
  cat         text        not null,
  freq        text        not null default 'Monthly',
  description text        not null default '',
  due_date    date,
  amount      numeric(14,2) not null default 0,
  created_at  timestamptz not null default now()
);

-- One row, shared by both accounts: notes, the company and category lists,
-- and settings. The check constraint is what makes it a singleton.
create table public.app_config (
  id         boolean     primary key default true check (id),
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index txns_status_idx on public.txns (status);
create index txns_co_idx     on public.txns (co);

alter table public.txns       enable row level security;
alter table public.receipts   enable row level security;
alter table public.recurring  enable row level security;
alter table public.app_config enable row level security;

grant select, insert, update, delete
  on public.txns, public.receipts, public.recurring, public.app_config
  to authenticated;

-- Supabase's default privileges on `public` hand new tables to `anon` too, so
-- revoke explicitly: a signed-out client must be refused before RLS is even
-- consulted. None of this data is public.
revoke all on public.txns       from anon;
revoke all on public.receipts   from anon;
revoke all on public.recurring  from anon;
revoke all on public.app_config from anon;

-- Being signed in IS the authorization here, by decision: the two accounts are
-- an admin and an executive with equal powers. That only holds while sign-up
-- stays closed, so no stranger can mint themselves an account — see
-- Decisions.md D8. If a third role ever appears, these predicates are where
-- it goes.
create policy "any signed-in account may use the tracker" on public.txns
  for all to authenticated using (true) with check (true);

create policy "any signed-in account may use the receipts" on public.receipts
  for all to authenticated using (true) with check (true);

create policy "any signed-in account may use the masterlist" on public.recurring
  for all to authenticated using (true) with check (true);

create policy "any signed-in account may use the settings" on public.app_config
  for all to authenticated using (true) with check (true);
