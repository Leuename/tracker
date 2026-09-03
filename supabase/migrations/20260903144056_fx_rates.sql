-- Exchange rates: a dated, sourced rate per currency, and the rate each wire
-- was actually valued at.
--
-- Until now every cross-currency figure on the transfer sheet came from five
-- constants in apps/web/src/logic.js with no date and no provenance. Measured
-- against the ECB fix of 2026-09-02 they ran 7% to 15% low, understating a
-- ₱39,964,763.80 sheet by ₱4,322,329.05. See docs/Exchange Rates Proposal.md.
--
-- Two problems wear that one symptom and this migration separates them:
--
--   * `fx_rates` fixes STALE rates. Refreshed daily, carrying the date the ECB
--     published and the source it came from.
--   * `transfers.rate` fixes REVALUED HISTORY. Without it, adding a live feed
--     makes things worse: every wire on the sheet would re-price itself
--     whenever the peso moved, so last month's released transfer would quietly
--     change value overnight. The feed supplies the rate; the row remembers it.
--
-- Doing only the first is the one combination worse than doing nothing.

create table public.fx_rates (
  cur         text          not null,
  as_of       date          not null,   -- the day the ECB published, NOT the day we fetched
  rate        numeric(18,6) not null,   -- pesos per 1 unit of `cur`
  source      text          not null,
  fetched_at  timestamptz   not null default now(),
  primary key (cur, as_of)
);

alter table public.fx_rates enable row level security;

-- Supabase's default privileges on `public` hand new tables to `anon`, so
-- revoke explicitly before granting anything back.
revoke all on public.fx_rates from anon, authenticated;

grant select on public.fx_rates to authenticated;
grant insert (cur, as_of, rate, source) on public.fx_rates to authenticated;
grant update (rate, source)             on public.fx_rates to authenticated;

create policy "any signed-in account may read the rates" on public.fx_rates
  for select to authenticated using (true);

-- NO ADMINISTRATOR WRITES RATES. These two policies name one account's uid
-- rather than gating on not is_viewer() — its profiles.role is 'viewer', so
-- is_viewer() refuses it everywhere else, and it can write these two columns
-- of this one table and nothing else in the whole schema.
create policy "only the rates account may add a rate" on public.fx_rates
  for insert to authenticated
  with check ((select auth.uid()) = '14f0d1af-f37a-4936-b278-e280bcb25129'::uuid);

create policy "only the rates account may correct a rate" on public.fx_rates
  for update to authenticated
  using ((select auth.uid()) = '14f0d1af-f37a-4936-b278-e280bcb25129'::uuid)
  with check ((select auth.uid()) = '14f0d1af-f37a-4936-b278-e280bcb25129'::uuid);

create trigger fx_rates_audit after insert or update or delete on public.fx_rates
  for each row execute function public.log_change();

-- The app reads this view rather than the table: four currencies times ~260
-- working days a year crosses PostgREST's silent 1,000-row cap inside a year,
-- the same ceiling that truncated audit_log on 2026-09-02.
create view public.fx_latest with (security_invoker = on) as
  select distinct on (cur) cur, rate, as_of, source, fetched_at
    from public.fx_rates
   order by cur, as_of desc;

grant select on public.fx_latest to authenticated;
revoke all on public.fx_latest from anon;

-- Both nullable; null means "never priced" and falls back to the feed, then
-- the constants. rate_as_of is client-set, not server-managed: it is a fact
-- about which day's fix a rate is, not an audit timestamp.
alter table public.transfers
  add column rate       numeric(18,6),
  add column rate_as_of date;

-- A person MAY override the fetched rate, so every administrator gets this.
grant insert (rate, rate_as_of) on public.transfers to authenticated;
grant update (rate, rate_as_of) on public.transfers to authenticated;
