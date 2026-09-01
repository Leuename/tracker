-- app_config is one jsonb row holding four independent things — the notes, the
-- company list, the category list and the settings — and the client rewrote all
-- four on every save. Two people editing *different* settings therefore
-- clobbered each other: whoever saved second wrote a `data` built from the
-- config they had loaded, silently discarding the other's change.
--
-- The merge belongs here rather than in apps/web/src/, for the same reason the
-- audit trail does (Decisions D7, D24): there is no server between the client
-- and Postgres, so a merge written in the app is a merge any client can skip.
--
-- Two levels deep, deliberately. A shallow `data || patch` would fix the
-- notes/companies/categories/settings collision and leave the one people
-- actually hit — two settings toggles on the same screen — still broken,
-- because `settings` is itself an object.
--
-- What this does NOT solve: two people editing the SAME key at once. The later
-- write still wins the company list if both edit it. Fixing that needs per-item
-- operations rather than a document, which is a bigger change than the problem
-- has earned.
create or replace function public.merge_app_config(patch jsonb)
returns integer
language plpgsql
security invoker            -- never definer: this needs no privilege the caller lacks
set search_path = ''        -- pinned, so a caller's search_path cannot redirect it
as $$
declare
  touched integer;
begin
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
  return touched;   -- 0 means the workspace has no config row yet; the caller inserts one
end;
$$;

revoke all on function public.merge_app_config(jsonb) from public, anon;
grant execute on function public.merge_app_config(jsonb) to authenticated;
