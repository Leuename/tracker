-- The wire sheet records who was paid and why, but never which invoice it
-- settled. The owner asked for it as its own column rather than folded into
-- `note`: an invoice number is an identifier you match against a document, and
-- burying it in free text means it cannot be read back as a field. `note` stays
-- exactly as it is and keeps doing its own job.
--
-- Modelled on `note` deliberately — text, NOT NULL, defaulting to the empty
-- string — so the two behave identically end to end and the client needs no
-- second null-handling rule for a field that sits beside one it already has.
-- Postgres 11 and later add a NOT NULL column with a constant default without
-- rewriting the table, so this does not touch the stored rows.

alter table public.transfers add column inv text not null default '';

-- Purely additive. `public.transfers` holds no table-wide INSERT or UPDATE for
-- `authenticated` — 20260901092751 revoked it — so a new column arrives with no
-- privilege at all and only needs one granted. Verified before writing this:
-- table_privileges returned none, and the column list still carries `rate` and
-- `rate_as_of` from 20260903144056. Re-listing every column instead would risk
-- dropping those two on the way past.
grant insert (inv) on public.transfers to authenticated;
grant update (inv) on public.transfers to authenticated;
