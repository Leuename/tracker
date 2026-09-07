-- Until now every money rule in this application lived in the browser.
-- `positiveAmountOf` and `confirmPay` refuse a non-positive amount or a
-- negative charge, and `pg_constraint` carried nothing at all on any ledger
-- table: no CHECK, no domain. Twelve rounds of review asserted `amount <= 0`
-- was zero after every run, and nothing in the database was defending it —
-- the invariant was true only because the client happened to be correct.
--
-- Four accounts share this ledger, a scheduler writes to it nightly, and the
-- REST API is reachable with any signed-in token. A client-side money rule is
-- advisory (trap 88, D61); these are the same rules stated where they hold.
--
-- Bounds chosen against the data as it actually is, not as it ought to be:
--
--   receipts.amount is `>= 0`, NOT `> 0`, because row 1788471059637 — the
--   backup-storage proof — legitimately carries 0.00 and must keep existing.
--   recurring.amount is `>= 0` because `updRec` deliberately clamps a cleared
--   field to 0 while the user is mid-edit (D56).
--   `fee`, `actual` and `rate` are nullable and null is meaningful; the checks
--   only constrain a value that is present.
--
-- Verified immediately before applying: zero existing violations of every
-- clause below, on both projects.

alter table public.txns
  add constraint txns_amount_positive check (amount > 0),
  add constraint txns_fee_not_negative check (fee is null or fee >= 0);

alter table public.receipts
  add constraint receipts_amount_not_negative check (amount >= 0),
  add constraint receipts_actual_not_negative check (actual is null or actual >= 0);

alter table public.recurring
  add constraint recurring_amount_not_negative check (amount >= 0);

alter table public.transfers
  add constraint transfers_amount_positive check (amount > 0),
  add constraint transfers_rate_not_negative check (rate is null or rate >= 0);
