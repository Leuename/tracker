-- Telegraphic transfers: outbound wires, tracked per company and beneficiary.
-- A fourth entity alongside txns, receipts and recurring, following the same
-- shared-workspace rules: one dataset, any signed-in account may use it.
--
-- `cur` is the currency the wire is actually sent in, so `amount` is in that
-- currency and NOT in pesos. Anything that totals across rows has to convert,
-- and the rate it converts at is a display concern, not a stored one — see
-- TRANSFER_RATES in apps/web/src/logic.js.

create table public.transfers (
  id          bigint      primary key,
  co          text        not null,
  name        text        not null default '',
  cur         text        not null default 'USD',
  amount      numeric(14,2) not null default 0,
  status      text        not null default 'pending',
  note        text        not null default '',
  created_at  timestamptz not null default now()
);

-- The sheet groups and filters by company, the same way the tracker does.
create index transfers_co_idx     on public.transfers (co);
create index transfers_status_idx on public.transfers (status);

alter table public.transfers enable row level security;

grant select, delete on public.transfers to authenticated;

-- Column lists rather than a table-wide grant, so `created_at` stays
-- server-managed and a client cannot back-date a wire. Same reasoning as
-- lock_server_managed_columns applied to the other three tables; `id` is
-- insertable because the client generates it, and never updatable.
grant insert (id, co, name, cur, amount, status, note) on public.transfers to authenticated;
grant update (co, name, cur, amount, status, note)     on public.transfers to authenticated;

-- Supabase's default privileges on `public` hand new tables to `anon`, so
-- revoke explicitly: a signed-out client must be refused before RLS is even
-- consulted. None of this data is public.
revoke all on public.transfers from anon;

-- Same access model as the rest of the ledger, per Decisions D8 and D20:
-- being signed in is the authorization, while sign-up stays closed.
create policy "any signed-in account may use the transfers" on public.transfers
  for all to authenticated using (true) with check (true);
