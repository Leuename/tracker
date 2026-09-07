-- Two prototype behaviours the schema could not express.
--
-- `src` is the masterlist payable a generated Tracker row came from. Until now
-- Generate produced rows indistinguishable from hand-entered ones, so the sheet
-- could not mark them, an edit to a recurring payable could not reach the rows
-- it had already produced, and removing a payable silently orphaned them.
-- ON DELETE SET NULL is the unlink: the rows stay on the ledger and stop
-- claiming a parent that no longer exists. The database does that whether or
-- not a client is still around to.
--
-- `fee` is the extra charge an e-cash payment carries. It is folded into
-- `amount`, so the row still totals what actually left the account, and kept
-- separately so the line can say how much of that total was the charge. NULL
-- means no charge was recorded, which is not the same claim as a charge of 0.

alter table public.txns
  add column src bigint references public.recurring(id) on delete set null,
  add column fee numeric;

-- Column-level grants are exhaustive (20260831155259_lock_server_managed_columns):
-- a column not named in the list cannot be written at all, so both new columns
-- have to be added to the insert and update grants rather than inheriting
-- anything from the table.
revoke insert, update on public.txns from authenticated;
grant insert (id, co, cat, description, period, due, amount, status, done, pay_type, check_no, notes, src, fee)
  on public.txns to authenticated;
grant update (co, cat, description, period, due, amount, status, done, pay_type, check_no, notes, src, fee)
  on public.txns to authenticated;
