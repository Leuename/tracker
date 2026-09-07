# Occurrence Identity and Review-Loop Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent edited generated payables from being generated twice, make Round 25's script and caller fixes executable offline under the Round 26 verifier, and replace the unbounded review loop with a finite mutation-tested acceptance gate.

**Architecture:** Give each generated transaction an immutable `(src, occurrence_due)` identity separate from its editable payment date and period. Phase 1 is additive: revoke UPDATE only on `occurrence_due` and preserve UPDATE(`src`) for the deployed old bundle. After the identity-aware deployment, phase 2 revokes UPDATE(`src`); the new application omits both from update payloads. Keep backward-compatible coverage during the phased database rollout, move script decisions behind import-safe modules, and test the production collaborator wiring rather than source text.

**Tech Stack:** React, Node.js ESM and `node:test`, Supabase Postgres/PostgREST, Playwright.

**Spec:** `handoff/2026-09-07 Session Continuation, Rounds One to Twenty-Five.md`, Round 25's four fixes and the Round 26 verifier findings, and `docs/Decisions.md` D63/D78.

**Status, 2026-09-07:** Local implementation for Tasks 1–9 is complete. `npm test` passes 191
assertions across 11 files, the 50-test Playwright suite is registered, and Claude Code returned
`AUDIT: READY`. Both migration files are written but unapplied; the identity-aware application is
not deployed. Remaining unchecked items are deliberately owner-gated: phase 1 → deploy and run the
occurrence-identity E2E coverage → phase 2. The new hosted spec skips safely before phase 1 and has
not run against `occurrence_due`. Do not read completed source work as evidence that hosted behavior
changed.

## Global Constraints

- One production ledger holds real money. A row without an `E2E-` tag may belong to the owner.
- Never touch `zone-offices`; rehearse database changes only on `tracker-rehearsal`.
- Do not edit applied migrations. Add new migrations and verify their stored MD5 after application.
- Do not run `npm run smoke` or `npm run backup`.
- Do not commit, push `main`, deploy, or apply a production migration without the owner's explicit authorization.
- Keep `AGENTS.md` and `CLAUDE.md` byte-identical.
- Preserve receipt `1788471059637` and its only stored object.
- After Playwright, delete `apps/web/test-results`; it contains live tokens and `E2E_PASSWORD`.
- Product decision: editing visible `due` or `period` changes payment timing, never the generated occurrence's identity and never authorizes a second liability.

---

## File Map

- Create `apps/web/scripts/backup-plan.js`: import-safe backup key and paging decisions.
- Create `apps/web/scripts/backup-plan.test.js`: recording-fake coverage of real backup plans.
- Create two additive migration files: phase 1 identity/index/grant; phase 2 constraint/old-index cleanup.
- Modify `apps/web/src/logic.js` and `logic.test.js`: occurrence identity and compatibility coverage.
- Modify `apps/web/src/rows.js` and `rows.test.js`: database mapping for `occurrence_due`.
- Modify `apps/web/src/masterlist.js`, `masterlist.test.js`, and `actions.js`: real recurring-edit effects factory.
- Modify `apps/web/scripts/schedule.mjs` and add an import-safe schedule classifier beside it with offline tests.
- Modify `apps/web/scripts/backup.mjs`: consume `backup-plan.js`.
- Modify `apps/web/scripts/rewind-plan.js`, `apps/web/scripts/rewind.mjs`, and the plan test: refuse unsafe pre-identity rewinds.
- Modify `apps/web/security/probe.mjs`: exact-reason immutable-column probe.
- Modify `apps/web/package.json`, `AGENTS.md`, `CLAUDE.md`, `supabase/README.md`, `docs/Decisions.md`, `docs/Repository Evidence.md`, and `docs/Remaining Work and Owner Decisions.md`.

### Task 1: Pin occurrence coverage before implementation

**Files:**
- Modify: `apps/web/src/logic.test.js`

**Interfaces:**
- Consumes: `uncoveredOccurrences(recurring, txns, monthKey)`.
- Produces: executable recurrence-identity behavior for later tasks.

- [x] Add failing tests for these exact states:
  1. A linked row moved to another `due` still covers its original `occurrenceDue`.
  2. Moving both visible `period` and `due` still covers the original occurrence.
  3. Moving the recurring rule anchor within a month does not duplicate an existing linked liability.
  4. A partially generated multi-occurrence rule creates only missing occurrences.
  5. Two same-shape payables never cover each other.
  6. A stale-window row with `src` but no `occurrenceDue`, even after rescheduling, blocks automatic generation for that source and is reported as an unresolved identity; no month is guessed and no liability is added.
- [x] Preserve the exported `coverageFor` API. Rewrite the existing assertions around `logic.test.js:551-556`: invert the claim that a linked row in another editable `period` does not cover when `occurrenceDue` identifies the requested occurrence; retain the unrelated-source and legacy unlinked-shape assertions.
- [x] Run `node --test src/logic.test.js`; verify the new identity cases fail for the intended reason.

### Task 2: Implement complete in-memory coverage classification

**Files:**
- Modify: `apps/web/src/logic.js`
- Modify: `apps/web/src/rows.js`
- Modify: `apps/web/src/rows.test.js`

**Interfaces:**
- Consumes transaction fields `src`, editable `due`/`period`, and new database field `occurrence_due` mapped to `occurrenceDue`.
- Produces complete row classification while preserving the named `coverageFor` export:
  - `src != null && occurrenceDue != null`: exact `(src, occurrenceDue)`, then same-source spare reconciliation scoped by the month of `occurrenceDue`.
  - `src != null && occurrenceDue == null`: unresolved identity. Fail closed for that source: return no new generated rows and expose it to the UI/scheduler report. Do not infer identity from editable `due` or `period`.
  - `src == null`: existing shape fallback.

- [x] Map `occurrence_due` to/from `occurrenceDue`; omit it from update payloads so UI edits cannot change identity.
- [x] Make generated rows carry the scheduled occurrence date in `occurrenceDue`.
- [x] Redefine the bodies of exported `coverageFor`/`uncoveredOccurrences` with the three exhaustive branches above while preserving their exports and partial occurrence counts. Add the smallest result field/helper needed for callers to report unresolved identities.
- [x] Run `node --test src/logic.test.js src/rows.test.js`; verify all new and existing cases pass.
- [x] Mutation-check by removing each branch at its production call site; each named test must fail.

### Task 3: Author the phase-1 additive migration, without applying it

**Files:**
- Create: `supabase/migrations/<timestamp>_generated_occurrence_identity.sql`

**Interfaces:**
- Produces nullable `public.txns.occurrence_due date`, authenticated INSERT permission only, and `txns_one_generated_row_per_occurrence` on `(src, occurrence_due)` where both are non-null.

- [x] Re-run the production and rehearsal preflight immediately before finalizing SQL: count linked rows, audited `due`/`period` changes, and mapped `(src, occurrence)` collisions.
- [x] Preserve the verified production observation from 2026-09-07 only as evidence, not a future assumption: `linked_rows=0`, `rescheduled_linked=0`, collisions `0`.
- [x] Scrutinize the `src` and `due` history of every row that is currently linked. If later data leaves any such mapping ambiguous, abort and ask the owner. Historical `src` transitions on now-unlinked rows do not block because those rows require no occurrence identity. Never choose a row to delete or leave unprotected.
- [x] Write one additive transaction that adds the column, permits authenticated INSERT of both identity columns, revokes authenticated UPDATE only on `occurrence_due`, preserves UPDATE(`src`) for the deployed old bundle, disables `txns_audit` only around deterministic backfill, re-enables it, and creates the new partial unique index alongside the old `(src,due)` index.
- [x] Do not add a CHECK in phase 1: `NOT VALID` still enforces new writes and would break stale clients.
- [ ] Review rollback SQL and rehearse only after owner authorizes external database work.

### Task 4: Make scheduler outcomes truthful and executable

**Files:**
- Create: `apps/web/scripts/schedule-plan.js`
- Create: `apps/web/scripts/schedule-plan.test.js`
- Modify: `apps/web/scripts/schedule.mjs`

**Interfaces:**
- Produces outcomes `generated`, `covered`, `unpriced`, `not-due`, `unresolved-identity`, `failed`, `concurrent-23505`, and fatal `contract-23514`.
- `23505` reports that another writer covered the occurrence and exits successfully.
- `23514` prints a specific contract diagnostic and still throws/exits nonzero.

- [x] Write failing pure tests for no due rules, all unpriced, all covered, unresolved stale identity, mixed generated/unpriced, ordinary failure, benign `23505`, and fatal `23514`.
- [x] Implement the smallest import-safe classifier and summary formatter.
- [x] Replace the false `!rows.length` all-covered branch with classifier output.
- [x] Update the stale header comment that still describes shape/description matching.
- [x] Run `node --test scripts/schedule-plan.test.js`; verify all cases pass.
- [x] Mutation-check the all-covered predicate and both SQLSTATE branches.

### Task 5: Pin the real decimal draft wiring offline

**Files:**
- Modify: `apps/web/src/masterlist.js`
- Modify: `apps/web/src/masterlist.test.js`
- Modify: `apps/web/src/actions.js`

**Interfaces:**
- Produce `recEffects({set, save, db, queueRow, queueCall, cancelPush, flash, id, key})` in the import-safe module.
- It returns required callbacks `draft`, `paint`, `saveRow`, `queuePush`, and `cancelPush` used directly by `applyMasterlistEdit`.

- [x] Add a failing test that drives the production `recEffects` factory with recording dependencies and asserts raw key-by-key draft text, paint, save, push, and cancellation.
- [x] Make `applyMasterlistEdit` call `fx.draft(v)` unconditionally.
- [x] Move the existing production effects literal from `actions.js` into `recEffects`; import no React/store module into `masterlist.js`.
- [x] Make `actions.js` call the factory rather than rebuilding collaborators.
- [x] Run `node --test src/masterlist.test.js`; verify passing behavior.
- [x] Delete the factory's `draft` wiring temporarily; the offline test must fail.

### Task 6: Make backup query planning executable offline

**Files:**
- Create: `apps/web/scripts/backup-plan.js`
- Create: `apps/web/scripts/backup-plan.test.js`
- Modify: `apps/web/scripts/backup.mjs`

**Interfaces:**
- Produce table-key lookup and query/page planning consumed by `backup.mjs`.
- Ordinary tables use declared-key keyset paging; `fx_rates` uses stable `as_of`, then `cur` ordering with range paging.

- [x] Write a recording fake and failing tests for unknown-table refusal, exact ordinary builder/cursor behavior, non-advancing cursor refusal, and exact FX ordering.
- [x] Move only KEY and paging/query decisions into `backup-plan.js`; keep credentials, authentication, filesystem writes, and top-level execution in `backup.mjs`.
- [x] Run `node --test scripts/backup-plan.test.js`.
- [x] Delete the key guard and reverse FX order separately; each mutation must fail offline.
- [x] Never run `npm run backup` for this task.

### Task 7: Refuse unsafe rewinds across the identity migration

**Files:**
- Modify: `apps/web/scripts/rewind-plan.js`
- Modify: `apps/web/scripts/rewind.mjs`
- Modify: `apps/web/scripts/rewind-plan.test.js`

**Interfaces:**
- `planRewind(entries, { occurrenceIdentity = false } = {})` refuses a `txns` before-image with non-null `src` and no `occurrence_due` when `occurrenceIdentity` is true.
- `rewind.mjs` probes whether `txns.occurrence_due` exists and passes that result; an unknown-column response means false, while any other probe error aborts.

- [x] Add failing tests using a linked pre-migration transaction image with the flag on and off; only identity-aware planning refuses it.
- [x] Fail before SQL emission with a message requiring the pre-migration schema or an explicit occurrence mapping.
- [x] Run `node --test scripts/rewind-plan.test.js`.
- [x] Delete the guard; verify the new test fails.

### Task 8: Add the exact-reason security probe

**Files:**
- Modify: `apps/web/security/probe.mjs`

**Interfaces:**
- One new check has explicitly selected staged semantics. With `OCCURRENCE_IDENTITY_PHASE=1`, absent `occurrence_due` is deferred before phase 1; after phase 1 it accepts only exact `42501` for `occurrence_due` and requires `src` to remain updateable. Deferral is allowed only while phase 1 is unapplied or that compatibility state is being verified. Set `OCCURRENCE_IDENTITY_PHASE=2` only after phase 2; the check is removed from `DEFERRED`, accepts only exact `42501` for both, and any failure is fatal/nonzero.
- `PGRST204`/`42703` is failure, not proof of immutability.

- [x] Add one 57th probe covering both identity columns and a `DEFERRED` entry citing the new decision while phase 1 is unapplied.
- [ ] Run with `OCCURRENCE_IDENTITY_PHASE=1` before and after phase 1: pre-migration prints `DEFER`, then exact `42501` is required for `occurrence_due` while `src` stays allowed. Deferral is limited to these pre/compatibility states. Set `OCCURRENCE_IDENTITY_PHASE=2` only after phase 2, remove the check from `DEFERRED`, and require exact `42501` for both with fatal/nonzero failures.

### Task 9: Author phase 2 and document the owner-gated rollout

**Files:**
- Create: `supabase/migrations/<later-timestamp>_enforce_generated_occurrence_identity.sql`
- Modify: `supabase/README.md`
- Modify: `docs/Decisions.md`
- Modify: `docs/Repository Evidence.md`
- Modify: `docs/Remaining Work and Owner Decisions.md`
- Modify identically: `AGENTS.md`, `CLAUDE.md`
- Modify: `apps/web/package.json`

**Interfaces:**
- Phase 2 revokes authenticated UPDATE(`src`), asserts no `src is not null and occurrence_due is null`, adds `CHECK (src is null OR occurrence_due is not null)`, validates it, then drops the old `(src,due)` index.
- The one-way check permits `ON DELETE SET NULL` to preserve generated rows when a recurring parent is deleted.

- [x] Write the exact rollout order: apply/rehearse additive phase 1 first; only then deploy the identity-aware app; run the occurrence-identity e2e coverage and verify writes; apply/rehearse phase 2 last. Record the staged 57th-probe expectations and that the hosted occurrence spec skips safely before phase 1 and has not yet run against the column.
- [x] State that deploying code before phase 1 produces PostgREST unknown-column failures, while phase 2 before the deployment rejects stale clients.
- [x] Add rehearsal acceptance that deleting a recurring parent leaves its transactions unlinked without a constraint failure.
- [x] Add a new decision superseding D63 and record the rewind boundary.
- [x] Update test file lists, exact assertion count, security count 57, migration counts, and policies byte-identically.
- [x] Do not apply, commit, push, or deploy in this task.

### Task 10: Run the finite acceptance matrix

**Files:**
- Verify all paths above; do not add unrelated scope.

- [x] Restore every mutation and run `npm test`, `npm run build`, and `npm audit`.
- [ ] Run `OCCURRENCE_IDENTITY_PHASE=1 npm run security` before phase 1 (56 pass plus one `DEFER`) and after phase 1 (exact `42501` only for `occurrence_due`, `src` allowed). After phase 2 run `OCCURRENCE_IDENTITY_PHASE=2 npm run security`; the identity check is not deferred, exact `42501` is required for both, and either failure exits nonzero.
- [ ] Set `E2E_REQUIRE_CREDENTIALS=1`; run the key-by-key decimal Playwright spec, then the full single-worker suite once.
- [x] Delete `apps/web/test-results` immediately after Playwright.
- [ ] Run the entry-point handoff section-10 SQL before and after production-writing checks. Assert the session's fingerprint/count/total are unchanged across our writes, `__e2eHeld` is null, E2E residue is zero, and the backup-proof receipt remains.
- [x] Run `cmp AGENTS.md CLAUDE.md` and documentation link/placeholder checks.
- [x] Dispatch one fresh verifier to audit this explicit matrix. Fix reproducible material correctness, security, or money-loss findings; record unrelated non-material observations without starting another numbered review loop.

## Self-Review

- Spec coverage: all four Round 25 fixes reviewed by the Round 26 verifier, the cross-period money defect, migration rollout, stale clients, parent deletion, security proof, rewind boundary, and finite verification are assigned above.
- Placeholder scan: timestamp placeholders are deliberate migration filename selection at execution time; no implementation behavior is unspecified.
- Interface consistency: application field `occurrenceDue` maps only to database `occurrence_due`; generated writes insert it, edits omit it, coverage consumes it.
