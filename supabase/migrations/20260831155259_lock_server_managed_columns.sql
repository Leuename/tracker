-- A signed-in client could set `created_at` on insert, back-dating a row to any
-- timestamp it liked. Proven by writing one dated 1999. On a payables ledger
-- that is a record-keeping problem: the audit value of a creation time is that
-- the client does not choose it.
--
-- A table-wide grant covers every column, and a column-level REVOKE cannot
-- carve one out of it, so each grant is replaced by an explicit column list.
-- Anything omitted stays server-managed. `id` remains insertable because the
-- client generates it deliberately, but is no longer updatable: rewriting a
-- primary key is never part of editing a payable.

revoke insert, update on public.txns from authenticated;
grant insert (id, co, cat, description, period, due, amount, status, done, pay_type, check_no, notes)
  on public.txns to authenticated;
grant update (co, cat, description, period, due, amount, status, done, pay_type, check_no, notes)
  on public.txns to authenticated;

revoke insert, update on public.receipts from authenticated;
grant insert (id, co, name, description, amount, status, date, actual)
  on public.receipts to authenticated;
grant update (co, name, description, amount, status, date, actual)
  on public.receipts to authenticated;

revoke insert, update on public.recurring from authenticated;
grant insert (id, co, cat, freq, description, due_date, amount)
  on public.recurring to authenticated;
grant update (co, cat, freq, description, due_date, amount)
  on public.recurring to authenticated;

-- app_config.updated_at was being supplied by the client too. A trigger owns it
-- now, so the stored time is the database's, not whatever a caller sends.
revoke insert, update on public.app_config from authenticated;
grant insert (id, data) on public.app_config to authenticated;
grant update (data)     on public.app_config to authenticated;

create or replace function public.touch_app_config()
returns trigger
language plpgsql
security invoker            -- never definer: this needs no privilege of its own
set search_path = ''        -- pinned, so a caller's search_path cannot redirect it
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger app_config_touch
  before insert or update on public.app_config
  for each row execute function public.touch_app_config();
