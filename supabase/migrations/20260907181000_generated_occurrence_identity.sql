-- A generated transaction keeps the scheduled occurrence it came from even
-- when its visible payment date or period is edited. Keep the old (src, due)
-- backstop during the phased rollout; phase 2 removes it only after every
-- writer understands occurrence_due.
--
-- Preflight on 2026-09-07 found zero linked production rows, zero rescheduled
-- linked rows, and zero mapped collisions. The assertions below deliberately
-- remain: that observation is a rollout baseline, not a future invariant.

begin;

alter table public.txns
  add column occurrence_due date;

-- Column grants are exhaustive. The browser may set identity when it creates a
-- generated row, but no authenticated client may rewrite it afterwards.
grant insert (occurrence_due) on public.txns to authenticated;
revoke update (occurrence_due) on public.txns from authenticated;

create temporary table generated_occurrence_backfill
  on commit drop
as
select
  t.id,
  t.src,
  case
    when exists (
      select 1
      from public.audit_log a
      where a.tbl = 'txns'
        and a.row_id = t.id
        and a.op = 'UPDATE'
        and a.before->>'src' = t.src::text
        and a.after->>'src' = t.src::text
        and (
          a.before->>'due' is distinct from a.after->>'due'
          or a.before->>'period' is distinct from a.after->>'period'
        )
    ) then (
      select case
        when a.before->>'src' = t.src::text then (a.before->>'due')::date
        else (a.after->>'due')::date
      end
      from public.audit_log a
      where a.tbl = 'txns'
        and a.row_id = t.id
        and (a.before->>'src' = t.src::text or a.after->>'src' = t.src::text)
      order by a.id
      limit 1
    )
    else t.due
  end as occurrence_due
from public.txns t
where t.src is not null;

do $$
declare
  bad_ids text;
  duplicate_keys text;
begin
  -- Any UPDATE that changes src is a relink, including null -> parent. It has
  -- no identity this migration can infer safely. Ordinary INSERT audit rows are
  -- not relinks and remain valid evidence of the generated occurrence.
  select string_agg(x.row_id::text, ', ' order by x.row_id)
    into bad_ids
  from (
    select distinct a.row_id
    from public.audit_log a
    join public.txns t on t.id = a.row_id and t.src is not null
    where a.tbl = 'txns'
      and a.op = 'UPDATE'
      and a.before->>'src' is distinct from a.after->>'src'
      and (a.before->>'src' is not null or a.after->>'src' is not null)
  ) x;

  if bad_ids is not null then
    raise exception 'occurrence identity needs an explicit source mapping for txns ids: %', bad_ids;
  end if;

  select string_agg(id::text, ', ' order by id)
    into bad_ids
  from generated_occurrence_backfill
  where occurrence_due is null;

  if bad_ids is not null then
    raise exception 'occurrence identity could not be derived for txns ids: %', bad_ids;
  end if;

  select string_agg(src::text || '/' || occurrence_due::text, ', ' order by src, occurrence_due)
    into duplicate_keys
  from (
    select src, occurrence_due
    from generated_occurrence_backfill
    group by src, occurrence_due
    having count(*) > 1
  ) collisions;

  if duplicate_keys is not null then
    raise exception 'duplicate generated occurrence mappings require owner review: %', duplicate_keys;
  end if;
end;
$$;

-- The backfill is a schema transition, not a user ledger edit. Suppress only
-- its deterministic UPDATE; transaction rollback restores the trigger if any
-- assertion or later statement fails.
alter table public.txns disable trigger txns_audit;

update public.txns t
set occurrence_due = b.occurrence_due
from generated_occurrence_backfill b
where b.id = t.id;

alter table public.txns enable trigger txns_audit;

create unique index txns_one_generated_row_per_occurrence
  on public.txns (src, occurrence_due)
  where src is not null and occurrence_due is not null;

commit;
