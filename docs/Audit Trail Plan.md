---
title: Audit Trail Plan
tags: [plan, audit, security, database, supabase, deferred]
created: 2026-09-01
status: planned
supersedes: nothing
related:
  - "[Decisions](Decisions.md) — D8 and D20 are why there is nothing to attribute a change to today"
  - "[Continuous Integration Plan](Continuous%20Integration%20Plan.md) — the other unbuilt held-back, sequenced after this one"
  - "[Repository Evidence](Repository%20Evidence.md) — the factual baseline"
up: "[AI Agent Context](AI%20Agent%20Context.md)"
---

# Audit Trail Plan

**Not built.** This is the design to build from, not a description of something that exists.

## Why this one first

Four accounts share one ledger and all four are administrators ([Decisions](Decisions.md) D8, D20).
Nothing records who changed or deleted anything. On 2026-09-01 that got sharper: receipts and
telegraphic transfers both gained delete buttons the same day, so there are now four ways for four
people to destroy a financial record without trace.

It is also the only outstanding item that gets **harder** the longer it waits. Every day of real
data is a day of history that can never be reconstructed, because it was never captured.

Graded **A** by the external consultation on 2026-09-01 — the only held-back where the obvious
answer was also the right one. Estimated four to six hours.

## Why a database trigger and not application code

The client talks straight to Postgres through PostgREST. There is no server in between — see
[Decisions](Decisions.md) D7. Anything written in `apps/web/src/` can be skipped by anyone holding
the publishable key and a session, which is all four accounts and, while sign-up stays open, anyone
at all.

A trigger is the only place in this architecture that cannot be bypassed. Application-level logging
would record what the app did, not what happened to the database.

## Schema

```sql
create table public.audit_log (
  id         bigserial   primary key,
  at         timestamptz not null default now(),
  actor      uuid,                        -- auth.uid(); null for a service-role write
  actor_email text,                       -- resolved at write time, see below
  tbl        text        not null,
  op         text        not null check (op in ('INSERT','UPDATE','DELETE')),
  row_id     bigint,
  before     jsonb,
  after      jsonb
);

create index audit_log_at_idx  on public.audit_log (at desc);
create index audit_log_tbl_idx on public.audit_log (tbl, row_id);
```

`actor_email` is stored rather than joined. `auth.users` is not reachable from a client — the
security probe asserts that, and it must stay true — so a view joining to it would either fail for
clients or require exposing the table. Resolving the email once, at write time, inside the definer
function is the version that keeps both properties.

## The trigger function

```sql
create or replace function public.log_change()
returns trigger
language plpgsql
security definer              -- NOT invoker: clients hold no INSERT on audit_log, by design
set search_path = ''          -- pinned, so a caller's search_path cannot redirect it
as $$
declare
  uid uuid := auth.uid();
begin
  insert into public.audit_log (actor, actor_email, tbl, op, row_id, before, after)
  values (
    uid,
    (select email from auth.users where id = uid),
    tg_table_name,
    tg_op,
    coalesce((to_jsonb(new)->>'id')::bigint, (to_jsonb(old)->>'id')::bigint),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;
```

**`security definer` is the deliberate difference from `touch_app_config`**, which is
`security invoker` because it only rewrites a column on a row the caller already holds. This one
writes to a table the caller must never be able to write to, so it needs privilege the caller does
not have. `set search_path = ''` is not optional on a definer function; without it a caller can
point `public` at their own schema and the function executes their code with elevated rights.

`app_config` uses a boolean primary key, not a bigint, so its `row_id` will be null. That is
correct — there is only ever one config row.

## Triggers

```sql
create trigger txns_audit       after insert or update or delete on public.txns       for each row execute function public.log_change();
create trigger receipts_audit   after insert or update or delete on public.receipts   for each row execute function public.log_change();
create trigger recurring_audit  after insert or update or delete on public.recurring  for each row execute function public.log_change();
create trigger transfers_audit  after insert or update or delete on public.transfers  for each row execute function public.log_change();
create trigger app_config_audit after insert or update or delete on public.app_config for each row execute function public.log_change();
```

Five tables, five triggers. **Any table added later needs its own**, exactly as
[Decisions](Decisions.md) D23 says any table added later needs its own grant revoke. Both are
per-table obligations that a new table silently fails to inherit.

## Grants and policy

```sql
alter table public.audit_log enable row level security;

grant select on public.audit_log to authenticated;
revoke insert, update, delete on public.audit_log from authenticated;
revoke all on public.audit_log from anon;

create policy "any signed-in account may read the audit log" on public.audit_log
  for select to authenticated using (true);
```

Read-only to clients, append-only in practice: only the definer function writes. There is
deliberately no policy for INSERT, UPDATE or DELETE, so those are refused even before the missing
grant is consulted.

## Retention

The table grows without limit. At four people and this volume that is years away from mattering,
so **do not build retention now** — but record the decision that it is unbounded, so the first
person to notice does not treat it as a bug.

When it does matter, `pg_cron` 1.6.4 is available on this project (verified 2026-09-01, not
installed) and a monthly `delete from public.audit_log where at < now() - interval '24 months'` is
the whole job.

## Verification, which is the part that must not be skipped

Add to `apps/web/security/probe.mjs`, in section 5:

1. A signed-in client **cannot** insert into `audit_log`.
2. A signed-in client **cannot** update an existing audit row.
3. A signed-in client **cannot** delete an audit row.
4. A row deleted through the client **does** produce an audit row naming the actor.
5. `anon` cannot read `audit_log` at all — add it to the section 1 table list.

Check 4 is the one that proves the feature works; checks 1 to 3 prove it cannot be tampered with.
A probe check that passes without exercising the thing it claims to test is worse than no check —
see the primary-key check in
[2026-09-01 Telegraphic Transfers and Full-Stack Verification](../handoff/2026-09-01%20Telegraphic%20Transfers%20and%20Full-Stack%20Verification.md),
which reported a pass while skipping its own UPDATE.

## Sequence

1. Migration, applied through MCP `apply_migration`, then **verify with a direct
   `information_schema.role_table_grants` query** rather than trusting the success response. D23 is
   the reason that sentence is here.
2. Mirror the migration into `supabase/migrations/`, MD5-verified against
   `supabase_migrations.schema_migrations`, per D14.
3. Extend the probe with the five checks. Expect 36 → 41.
4. Add `audit_log` to `TABLES` in `apps/web/scripts/backup.mjs`. A table missing from that list is
   invisible until a restore, which is exactly how `transfers` nearly shipped unbacked.
5. Only then consider a UI. A read-only Activity screen is a nice-to-have; the record existing is
   the point.

## What this does not solve

It records what changed and who did it. It does **not** stop anyone doing it — all four accounts
keep full delete rights, by decision (D20). Attribution is not authorization, and this plan
deliberately does not pretend otherwise.

## Guideline Basis

- **SEC-05** places the trust boundary in the database, where it cannot be bypassed by a client.
- **SEC-03** is why no credential appears here and why `auth.users` stays unreachable from a client.
- **PG-04** requires the verification steps to be named before the work is called done.
- **DOC-02** keeps this labelled as a plan rather than as observed fact.

implements: [Awesome Guidelines Integration](Awesome%20Guidelines%20Integration.md)

Related: [Decisions](Decisions.md) · [Continuous Integration Plan](Continuous%20Integration%20Plan.md) · [Repository Evidence](Repository%20Evidence.md) · [Handoff](Handoff.md)
