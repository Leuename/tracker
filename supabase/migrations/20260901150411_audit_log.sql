-- Who changed what. Four accounts share one ledger and all four are
-- administrators (Decisions D8, D20), so until now a deletion was
-- indistinguishable from a row that never existed. Receipts and transfers both
-- gained delete buttons on 2026-09-01, which made that a four-by-four problem.
--
-- This lives in the database, not in apps/web/src/, because there is no server
-- between the client and Postgres (D7). Anything written in the app can be
-- skipped by anyone holding the publishable key and a session. A trigger is the
-- only place in this architecture that cannot be bypassed.

create table public.audit_log (
  id          bigserial   primary key,
  at          timestamptz not null default now(),
  actor       uuid,                       -- auth.uid(); null for a service-role write
  actor_email text,                       -- resolved at write time, see below
  tbl         text        not null,
  op          text        not null check (op in ('INSERT','UPDATE','DELETE')),
  row_id      bigint,
  before      jsonb,
  after       jsonb
);

-- The two ways this table gets read: newest first, and the history of one row.
create index audit_log_at_idx  on public.audit_log (at desc);
create index audit_log_tbl_idx on public.audit_log (tbl, row_id);

-- `actor_email` is stored rather than joined. `auth.users` is not reachable
-- from a client — the security probe asserts that and it must stay true — so a
-- view joining to it would either fail for clients or require exposing the
-- table. Resolving the email once, at write time, inside the definer function
-- keeps both properties.
create or replace function public.log_change()
returns trigger
language plpgsql
security definer            -- NOT invoker: clients hold no INSERT on audit_log, by design
set search_path = ''        -- pinned, so a caller's search_path cannot redirect it
as $$
declare
  uid uuid  := auth.uid();
  -- Computed through tg_op rather than by testing the records: on DELETE the
  -- NEW record is unassigned, and reading it is how this function would fail
  -- on exactly the operation it exists to record.
  b jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end;
  a jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end;
  -- app_config's primary key is the boolean `true`, not a bigint, so the cast
  -- is guarded. Its row_id stays null; there is only ever one config row.
  key text := coalesce(a->>'id', b->>'id');
begin
  insert into public.audit_log (actor, actor_email, tbl, op, row_id, before, after)
  values (
    uid,
    (select email from auth.users where id = uid),
    tg_table_name,
    tg_op,
    case when key ~ '^[0-9]+$' then key::bigint end,
    b,
    a
  );
  return null;              -- an AFTER row trigger's return value is discarded
end;
$$;

-- A definer function is a privilege boundary, so nothing but the trigger
-- machinery may call it. Calling a trigger function directly already errors;
-- this makes it unreachable rather than merely useless.
revoke all on function public.log_change() from public, anon, authenticated;

create trigger txns_audit       after insert or update or delete on public.txns       for each row execute function public.log_change();
create trigger receipts_audit   after insert or update or delete on public.receipts   for each row execute function public.log_change();
create trigger recurring_audit  after insert or update or delete on public.recurring  for each row execute function public.log_change();
create trigger transfers_audit  after insert or update or delete on public.transfers  for each row execute function public.log_change();
create trigger app_config_audit after insert or update or delete on public.app_config for each row execute function public.log_change();

alter table public.audit_log enable row level security;

-- Read-only to clients, append-only in practice: only the definer function
-- writes. There is deliberately no policy for INSERT, UPDATE or DELETE, so
-- those are refused before the missing grant is even consulted.
grant select on public.audit_log to authenticated;
revoke insert, update, delete on public.audit_log from authenticated;
revoke all on public.audit_log from anon;
revoke all on sequence public.audit_log_id_seq from anon, authenticated;

create policy "any signed-in account may read the audit log" on public.audit_log
  for select to authenticated using (true);
