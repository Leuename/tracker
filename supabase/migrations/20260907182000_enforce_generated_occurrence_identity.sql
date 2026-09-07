-- Run only after the identity-aware application is deployed and the phase-1
-- security probe proves authenticated clients cannot update occurrence_due.

begin;

do $$
declare
  missing_count bigint;
begin
  select count(*)
    into missing_count
  from public.txns
  where src is not null and occurrence_due is null;

  if missing_count <> 0 then
    raise exception 'cannot enforce generated occurrence identity: % linked txns have no occurrence_due', missing_count;
  end if;
end;
$$;

-- The identity-aware application omits src from ordinary UPDATE payloads.
-- Revoke it only now; doing this in phase 1 would break the deployed old bundle.
revoke update (src) on public.txns from authenticated;

alter table public.txns
  add constraint txns_generated_occurrence_has_identity
  check (src is null or occurrence_due is not null) not valid;

alter table public.txns
  validate constraint txns_generated_occurrence_has_identity;

-- ON DELETE SET NULL remains valid: unlinking a generated row makes src null
-- and deliberately leaves its historical occurrence_due in place.
drop index public.txns_one_generated_row_per_due_date;

commit;
