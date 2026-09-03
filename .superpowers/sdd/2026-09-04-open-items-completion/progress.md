# SDD ledger — plan: docs/superpowers/plans/2026-09-04-open-items-completion.md

## Preflight plan scan

| Scope | Shared file/interface | Finding | Ruling |
|---|---|---|---|
| Task 1 ↔ Task 6 | `docs/Repository Evidence.md` | Task 1 may add restore evidence; Task 6 consolidates final evidence. | Task 1 records only observed restore facts; Task 6 reviews and normalizes them. No conflict. |
| Task 2 ↔ Task 6 | `docs/Repository Evidence.md` | Storage evidence is produced before final documentation. | Task 2 records object/hash facts; Task 6 checks links and scope. No conflict. |
| Task 3 ↔ Task 6 | `docs/Repository Evidence.md`, `supabase/README.md` | Replay status can change while the plan is running. | Task 3 updates only after a blank-target fingerprint; Task 6 verifies the claim against live state. No conflict. |
| Task 4 ↔ Task 6 | `apps/web/playwright.config.js`, e2e command | Task 4 requires a production-writing success run; Task 6 repeats applicable checks. | Task 4 owns the focused behavior test; Task 6 reruns the final suite only after the source change is accepted. No conflict. |
| Task 5 ↔ Task 6 | `docs/Decisions.md` | Task 5 records only owner-selected decisions; Task 6 records final evidence. | No owner-only item is defaulted. No conflict. |
| Every task | Global constraints | Restore, security, and live-storage actions have external side effects. | Delegate security-sensitive work, require credentials/window where stated, and stop on missing authority. |

| Task | Internal consistency check | Result |
|---|---|---|
| 0 | Fetch-first baseline and read-only SQL assertions agree with the global constraints. | Consistent. |
| 1 | `psql` restore procedure requires a postgres connection string and explicitly fixes the sequence before verification. | Consistent. |
| 2 | Real linked receipt is required before backup; orphan cleanup is called out. | Consistent. |
| 3 | Existing rehearsal proof is not treated as a blank-target proof. | Consistent. |
| 4 | Preflight uses a named failure classification and does not raise timeouts. | Consistent. |
| 5 | Owner-only changes require explicit choices and separate verification. | Consistent. |
| 6 | Final checks distinguish current runs from historical evidence and forbid push. | Consistent. |

## Rulings

- Ruling: Treat Tasks 1 and 2 as externally side-effecting operations requiring the credentials and production-writing authority stated in the plan; no agent can substitute a chunked restore or synthetic storage object for the missing prerequisite. Cost if wrong: the task remains open until the operator supplies the required access.
- Ruling: Treat Task 3 as open only for a genuinely empty-target replay; do not reapply already-proven migrations to `tracker-rehearsal`. Cost if wrong: duplicate migration errors or false replay evidence.
- Ruling: Treat Task 5 owner choices as hard gates; no default sign-out, notification, API-boundary, human-viewer, or password action will be inferred. Cost if wrong: user-visible behavior or credentials change without authorization.

## Task status

- Task 0: complete (commits 3c3f030..3c3f030, review clean; baseline report `.superpowers/sdd/2026-09-04-open-items-completion/task-0-report.md`)
- Task 1: blocked — no `postgres` connection string in the environment; the documented `psql \copy` restore and `backups/verify-restore.sql` execution cannot be performed safely without operator access. Ruling: do not substitute application credentials or chunked MCP transport; cost if wrong is a partial/unaudited restore.
- Task 2: minor (deferred): report's changed-file list omits `backups/app_config.json`; the backup output is still in scope and verified. Source/restored temporary bytes were deleted, so the three-way hash is evidenced but not independently reproducible from the checkout.
- Task 2: complete (commits 3c3f030..3c3f030, 1 parked minor; review otherwise clean; report `.superpowers/sdd/2026-09-04-open-items-completion/task-2-report.md`).
- Task 3: blocked — no approved empty target, postgres connection string, Supabase CLI, or local project config. Existing tracker-rehearsal already has the 15-migration proof; no mutation made. Review clean. Ruling: do not create a paid target or treat the populated rehearsal as a blank replay. Cost if wrong: unapproved spend or false schema-rebuild evidence.
- Task 3: complete (commits 3c3f030..3c3f030, review clean; blocked prerequisite recorded).
- Task 4: minor (deferred): helper-specific assertions were ad hoc rather than committed regression tests; both required paths were independently exercised.
- Task 4: complete (commits 3c3f030..e616254, 1 parked minor; review clean; report `.superpowers/sdd/2026-09-04-open-items-completion/task-4-report.md`).
- Task 5: blocked — requires owner choices for sign-out scope, human viewer account, notification provider/recipients, and `apps/api/` retention. Ruling: do not infer any of these from the open-items list; cost if wrong is an unauthorized behavior, account, credential, or boundary change.
- Task 6: pending all applicable tasks
