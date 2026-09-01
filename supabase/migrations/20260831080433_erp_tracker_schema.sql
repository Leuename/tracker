-- ERP payables tracker: entity tables + one config row per user.
-- Client supplies `id` (Date.now()), so the PK is scoped per user to keep
-- each account's id space independent and let seed ids 1..20 coexist.

create table public.txns (
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id          bigint      not null,
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
  created_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.receipts (
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id          bigint      not null,
  co          text        not null,
  name        text        not null default '',
  description text        not null default '',
  amount      numeric(14,2) not null default 0,
  status      text        not null default 'pending',
  date        date,
  actual      numeric(14,2),
  created_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.recurring (
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id          bigint      not null,
  co          text        not null,
  cat         text        not null,
  freq        text        not null default 'Monthly',
  description text        not null default '',
  due_date    date,
  amount      numeric(14,2) not null default 0,
  created_at  timestamptz not null default now(),
  primary key (user_id, id)
);

-- notes, companies, categories and settings are lists and toggles, not
-- entities worth their own tables yet. One jsonb row per user holds them.
create table public.app_config (
  user_id    uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Tracker list view is filtered by company and status inside a single account.
create index txns_user_status_idx on public.txns (user_id, status);
create index txns_user_co_idx     on public.txns (user_id, co);

alter table public.txns       enable row level security;
alter table public.receipts   enable row level security;
alter table public.recurring  enable row level security;
alter table public.app_config enable row level security;

-- New projects do not expose tables to the Data API automatically
-- (Supabase changelog 2026-04-28), so grant the authenticated role directly.
-- `anon` is deliberately granted nothing: this app has no public data.
grant select, insert, update, delete
  on public.txns, public.receipts, public.recurring, public.app_config
  to authenticated;

-- Each policy pairs `to authenticated` with an ownership predicate; the role
-- check alone would let any signed-in account read every other account's rows.
create policy "txns are private to their owner" on public.txns
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "receipts are private to their owner" on public.receipts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "recurring payables are private to their owner" on public.recurring
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "config is private to its owner" on public.app_config
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
