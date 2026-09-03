### Task 3: Finish the full schema replay evidence for FX/R7

**Files:**
- Read: `supabase/README.md`
- Read: `supabase/migrations/20260903144056_fx_rates.sql`
- Read: `supabase/migrations/20260903071500_private_is_viewer.sql`
- Read: `supabase/migrations/20260903071600_drop_public_is_viewer.sql`
- Modify: `docs/Repository Evidence.md` and `supabase/README.md` only if a genuinely empty-project replay is performed

**Interfaces:**
- Consumes: a disposable empty Supabase target and the exact 15 migration files in version order.
- Produces: a schema fingerprint proving all 15 migrations rebuild cleanly, including FX column grants, RLS, views, private function, and policy dependencies.

- [ ] **Step 1: Reconcile existing evidence**

  The FX and R7 migrations have already been replayed on `tracker-rehearsal`; do not reapply them there. This task remains open only for a genuinely empty-target replay if the brief’s stronger claim is required.

- [ ] **Step 2: Confirm a disposable target without touching `zone-offices`**

  If no existing empty target and no approved disposable project/connection string exist, mark this task blocked. Do not create a paid project or branch without explicit owner cost approval.

- [ ] **Step 3: Apply all 15 migrations in repository/MCP-assigned order**

  Preserve the exact contents and historical comments of the applied FX/R7 files. Let Supabase assign migration versions; read `supabase_migrations.schema_migrations` back rather than trusting `success: true`.

- [ ] **Step 4: Assert schema and authorization facts**

  Compare the empty target with production for columns, grants, column grants, RLS, policies, triggers, indexes, function security flags, and the exposed-schema boundary. Assert public RPC absence and private-schema refusal, not merely a missing result row.

- [ ] **Step 5: Record replay evidence or the blocker**

  Update the two canonical notes only after the fingerprint and catalog queries pass. If blocked, record the missing target/credential and leave the claim explicitly open.

**Checkpoint:** Existing rehearsal proof closes replay of the new files into the 12-migration baseline; only a blank-target fingerprint closes the stronger full-rebuild claim.

---

