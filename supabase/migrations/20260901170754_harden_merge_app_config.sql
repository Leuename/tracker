-- `merge_app_config` returned 0 and no error when a viewer called it. The
-- policy did block the update — nothing was written — but the function could
-- not tell "no config row exists yet" from "you are not allowed", and both
-- arrive as row_count = 0.
--
-- That matters because the caller treats 0 as "no row yet" and falls through to
-- an INSERT, so a refused save became a confusing second failure instead of a
-- clear first one. Found by the role probe asserting the refusal rather than
-- assuming it; a check that only asserts "no error" would have passed.
--
-- The policy is still the enforcement. This only makes the refusal legible,
-- with the same 42501 a direct table write returns.
create or replace function public.merge_app_config(patch jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  touched integer;
begin
  if public.is_viewer() then
    raise exception 'permission denied for table app_config' using errcode = '42501';
  end if;

  update public.app_config
     set data = (data || (patch - 'settings'))
                || case
                     when patch ? 'settings'
                       then jsonb_build_object(
                              'settings',
                              coalesce(data->'settings', '{}'::jsonb) || (patch->'settings'))
                     else '{}'::jsonb
                   end
   where id = true;
  get diagnostics touched = row_count;
  return touched;   -- 0 now means only what it says: the workspace has no config row yet
end;
$$;

revoke all on function public.merge_app_config(jsonb) from public, anon;
grant execute on function public.merge_app_config(jsonb) to authenticated;
