# Task 3 report — full schema replay evidence

Status: **BLOCKED**

## Finding

The stronger claim—rebuilding all 15 migrations into a genuinely empty Supabase
target and comparing its catalog fingerprint—could not be performed safely in
this session.

The repository identifies only these relevant projects:

- `baby` (`jusifpditdigqdjiwdaj`): production; not disposable.
- `tracker-rehearsal` (`bucmcnsjkuprpojhequy`): the existing rehearsal target; the
  three FX/R7 migrations are already applied there and must not be reapplied.
- `zone-offices` (`lasycakyudaawrydetnm`): a live CRM belonging to someone else;
  explicitly off-limits.

No approved, genuinely empty target or supervised `postgres` connection string
for one was available. The local repository has no Supabase CLI, no
`supabase/config.toml`, and no linked project. The available local environment
contains application/publishable credentials, not a database connection string;
those credentials are not an acceptable substitute for the required `postgres`
replay path.

## Existing evidence reconciled

The existing evidence remains valid and was not repeated:

- `supabase/README.md` records the first 12 migrations replayed into
  `tracker-rehearsal` and matching over 291 public catalog facts with fingerprint
  `7d44a32a1ad258f984fb145892e94c97`.
- The same README records that `fx_rates`, `private_is_viewer`, and
  `drop_public_is_viewer` are applied on `tracker-rehearsal` and production, with
  the live RPC/private-schema and policy checks passing.
- `docs/Repository Evidence.md` records the production rollout and the existing
  rehearsal proof, but does not claim a blank-target 15-migration fingerprint.
- The task brief explicitly says not to reapply the three migrations on
  `tracker-rehearsal`; doing so would not close the blank-target gap anyway.

## Checks performed

Read-only local discovery found no `postgres`/`DATABASE_URL`/`PG*` connection
environment variables, no Supabase CLI, and no local Supabase project config.
The canonical notes and continuation handoffs consistently state that a new
empty project requires an owner-approved slot and that `zone-offices` must not be
touched. No browser or Supabase management connector was available for further
project discovery.

No migration was applied, no project was created, and no database was mutated.
`docs/Repository Evidence.md` and `supabase/README.md` were intentionally left
unchanged because their replay claims must only be expanded after a blank-target
fingerprint and catalog assertions pass.

## To unblock

An owner-approved disposable empty Supabase project, plus its supervised
`postgres` connection string, is required. Then apply the exact 15 migration
files in repository/MCP-assigned version order, read back
`supabase_migrations.schema_migrations`, and run the catalog assertions for
columns, grants, column grants, RLS, policies, triggers, indexes, function
security flags, exposed-schema boundary, public RPC absence, and private-schema
refusal before updating the two canonical notes.
