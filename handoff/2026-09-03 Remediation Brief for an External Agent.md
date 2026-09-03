---
title: Remediation Brief for an External Agent
tags: [handoff, remediation, brief, audit, erp, tracker, supabase, testing, security, fx, backups, codex]
created: 2026-09-03
status: current
audience: external AI agent (Codex / ChatGPT) conducting research, audit and planning
scope: "the open defects, unproven claims and unanswered questions only — not a session record"
extends: "[[2026-09-02 The Rewind, and a Backup That Was Short]] — the state-of-the-world handoff; this note does not repeat it"
supersedes: nothing
blocks: "nothing is built from this note until the owner answers the questions in §7"
source:
  - "[[2026-09-02 The Rewind, and a Backup That Was Short]] — phases 26-30, findings 1-4, traps 47-54"
  - "[[2026-09-02 Everything Held Back, Built]] — phases 21-25, traps 44-46"
  - "[[2026-09-01 Telegraphic Transfers and Full-Stack Verification]] — phases 14-23, traps 19-43"
  - "[[2026-09-01 Repository Restructure and Data Clear]] — phases 10-13, traps 13-18"
  - "[[2026-09-01 Session Continuation Package]] — phases 1-9, codebase map, traps 1-12"
related:
  - "[[Decisions]] — D1 to D35, the authority on what is authorised"
  - "[[Open Problems and Proposals]] — the round-2 proposals this brief indexes"
  - "[[Exchange Rates Proposal]] — R3's full design"
  - "[[Repository Evidence]] — the factual baseline"
  - "[Backups](../backups/README.md) — the restore procedure R2 must exercise"
  - "[Supabase Schema](../supabase/README.md) — twelve migrations"
up: "[[AI Agent Context]]"
---

# Remediation Brief for an External Agent

**Purpose.** One document an external agent can read end to end and come out able to research,
audit and plan fixes for everything currently broken, unproven or undecided in this repository.
It is a **defect and question index**, not a session narrative. The narrative lives in
[[2026-09-02 The Rewind, and a Backup That Was Short]]
(`handoff/2026-09-02 The Rewind, and a Backup That Was Short.md`).

**Everything here was re-verified against the working tree on 2026-09-03** before this note was
written. Where a fix is described as "shipped but unexercised", the file was opened and checked.

**Revised the same day by an external audit** (Codex, `gpt-5.6-sol`), which read the checkout and
returned six material corrections. Every checkable one was confirmed against the files before being
folded in: the roster backup is missing an email, R7 is 17 policies not 19, R6's window arithmetic
was wrong, R10 was described too broadly, R13 is now actionable, and the storage listing carries
the same 1,000-row cap that produced F1 — recorded here as **F5**. The audit also ran `npm test`
(53/53) and no production-writing suite. Its one unverified claim is R13's: that
`actions/checkout@v5` and `actions/setup-node@v5` now exist. Confirm that before acting on it.

---

## 0. Read this first, agent

You are working on a **live financial system holding real money**. Four accounts, all
administrators, one shared production ledger, and the owner uses the app daily during Manila
working hours. There is no staging environment. `npm run e2e`, `npm run smoke` and
`npm run security` all **write to production**.

Six rules that override anything you infer:

1. **Propose; do not apply.** This brief exists so a plan can be reviewed. Nothing in §5 is
   approved except where the row says `unblocked`.
2. **Assert the refusal, not the absence of an error.** A blocked RLS policy and a missing row
   both return `row_count = 0`. That ambiguity has cost this project three separate incidents.
   Read the state back after every write.
3. **`{"success": true}` proves the SQL ran, not that it achieved anything** — and it can even
   mean it reached a database instance that no longer exists. Verify against
   `information_schema` ([[Decisions]] D23, D25).
4. **Never delete a failing check to make a suite green** ([[Decisions]] D26). Add it to
   `DEFERRED` in `apps/web/security/probe.mjs` with the decision that authorises it, or fix the
   thing.
5. **Supabase project `zone-offices` (`lasycakyudaawrydetnm`) is a live CRM belonging to someone
   else.** 18 tables, 21 migrations, currently paused. Do not touch it. The scratch project is
   `tracker-rehearsal` (`bucmcnsjkuprpojhequy`).
6. **Password and Vercel token rotation are deferred by the owner.** Do not raise them. The
   construction tracker is parked ([[Decisions]] D18).

### Wikilinks and paths

This repository **is** an Obsidian vault (`.obsidian/` sits at the repository root), so every
link below is a `[[wikilink]]`. If your tooling cannot resolve wikilinks, use the exact relative
paths in §8. Wikilinks resolve by filename across the whole vault; a link to a note that does not
exist yet is a deliberate stub, not an error. Two targets — [Backups](../backups/README.md) and
[Supabase Schema](../supabase/README.md) — are relative links instead, because a wikilink cannot
address a file called `README`.

---

## 1. The system in one screen

| | |
|---|---|
| Application | React + Vite ERP at `apps/web/`, the only directory with a package manifest |
| Persistence | Supabase Postgres `jusifpditdigqdjiwdaj` (`baby`), `ap-southeast-1`, **free plan**, Postgres 17.6.1.166 |
| Scratch | Supabase `bucmcnsjkuprpojhequy` (`tracker-rehearsal`) — schema only, no data |
| Off limits | Supabase `lasycakyudaawrydetnm` (`zone-offices`) — a live CRM, paused |
| Hosting | Vercel project `tracker`, hobby plan, Root Directory **must** be `apps/web` |
| Production | `https://tracker-six-flax.vercel.app` — 200, 7 of 7 security headers |
| Repository | `Leuename/tracker`, private, branch `main`. **A push to `main` deploys to production** |
| Release | `v0.6.0`, `apps/web/package.json` matching |
| Tables | `txns`, `receipts`, `recurring`, `transfers`, `app_config`, `audit_log`, `profiles` |
| Migrations | 12, all MD5-identical to what was applied, and replayed into an empty project |
| Workflows | `ci.yml`, `verify.yml`, `backup.yml`, `schedule.yml` |
| Accounts | 4, all `admin`, 0 viewers. Self-serve sign-up **closed** |

**Ledger, last read 2026-09-02 ~11:10 UTC.** The fingerprint moves when the owner works; treat a
change as normal and say so rather than assuming damage.

```
txns fingerprint  05a080127ca18b46dc693edbd22b5168
txns 21 · PHP 226,000.00 · receipts 0 · recurring 0 · transfers 9 · profiles 4 (all admin)
audit_log 1,129 · storage objects 0 · residue 0 · probe accounts 0
```

**Architecture fact that decides most designs:** there is no server between the browser and
Postgres ([[Decisions]] D7). Anything a client could skip — a merge, a log, a validation — has to
live in the database as a policy, a trigger or a `security definer` function.

---

## 2. The six findings that produced this brief

F1 to F4 were found 2026-09-02; F5 and F6 on 2026-09-03. All had been true for at least a day.
**None announced itself**, and none was visible from casually reading code — each was found by
running something or by auditing against the file.

| # | Finding | Mechanism | Status |
|---|---|---|---|
| F1 | The backup silently wrote **129 fewer rows** than the database held | PostgREST caps a `select` at 1,000 rows with no error and no flag. Manifest read `1000`; `audit_log` held `1,129` | Fixed in `apps/web/scripts/backup.mjs` (paged reads + count assertion). **Not re-rehearsed** |
| F2 | The **account roster cannot be restored** | `profiles.user_id` references `auth.users(id)`; `backups/` never contained `auth.users`. Restore returns `23503`; skipping it returns a ledger nobody can write to, silently, because no profile row means viewer ([[Decisions]] D29) | `backups/accounts.json` now exists. **Not re-rehearsed** |
| F3 | The **`audit_log` sequence fails days late**, not next | With `setval` skipped, the first write after a restore succeeds and so does the next; `23505 duplicate key` arrives when the sequence climbs into the restored id block, then on every audited write across all six tables at once | `backups/README.md` step rewritten as a required action with an assertion. **Not re-rehearsed** |
| F4 | The **e2e suite has been racing itself against production** | `fullyParallel: false` serialises tests *within* a file only. `workers` is unset, so Playwright runs four, and `app.spec.js` and `functional.spec.js` execute concurrently against one ledger | Root cause proven (0 of 3 clean at four workers; 27/27 twice at one). **`workers: 1` is NOT applied** |

| F5 | **The storage listing is capped the same way `audit_log` was** — and the F1 fix never reached it | `apps/web/scripts/backup.mjs:171` and `:177` list folders and objects with `limit: 1000`, no paging and no count assertion. It is F1 one directory over. It has never mattered because the bucket has been empty at every backup ever taken | **Open.** Found 2026-09-03 by the external audit |

| F6 | **The F1 and F2 fixes are not in operation.** They exist only in the working tree | Four commits sit unpushed on `main`, including `a11f074` "Stop the backup writing less than the database holds". `origin/main:apps/web/scripts/backup.mjs:70` is still the unpaged `.select('*')`, and **`backups/accounts.json` does not exist on the remote at all**. The nightly job ran again at **2026-09-02T20:28:01Z** (`119c615`) and wrote `audit_log rows \| 1000` against a table holding 1,129 | **Open.** Found 2026-09-03 by the external audit, confirmed and extended here |

**The generalisable lesson, and the reason this brief exists:** a backup you have not restored is
a belief, not a backup. Three of the first four came from performing a restore rather than reading
the procedure — and F5 shows the fifth shape: a fix applied where the bug was seen and not where
the same call is made twice more.

---

## 3. What is verified true right now

Re-checked against the working tree, 2026-09-03:

| Claim | Evidence |
|---|---|
| `workers: 1` still not applied | `apps/web/playwright.config.js:32-33` — `fullyParallel: false`, `retries: 0`, no `workers` key |
| Trace leak mechanism still live | `apps/web/playwright.config.js:37` — `trace: 'retain-on-failure'` |
| `SCHEDULE_*` still undocumented | `apps/web/.env.example` names only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` |
| One backup run per day | `.github/workflows/backup.yml:15` — a single `cron: '0 18 * * *'` |
| Roster fix shipped | `backups/accounts.json` exists; `apps/web/scripts/backup.mjs:126-165` writes it |
| Sequence fix shipped | `backups/README.md:158-166` — `setval` plus a `last_value >= max(id)` assertion |
| FX constants still hardcoded | `apps/web/src/logic.js:259` — `{ PHP: 1, USD: 58, GBP: 74, EUR: 63, AUD: 38 }` |
| `is_viewer()` still called over RPC | `apps/web/src/db.js:78` — `supabase.rpc('is_viewer')` |
| The roster backup is **short one email** | `backups/accounts.json:8` — `"email": null` on one of four accounts |
| `is_viewer()` guards **17** policies | `supabase/migrations/20260901170544_viewer_role.sql` — 3 each on `txns`, `receipts`, `recurring`, `transfers`, `storage.objects`; 2 on `app_config` |
| The storage listing is uncapped-unsafe (F5) | `apps/web/scripts/backup.mjs:171,177` — `list(…, { limit: 1000 })`, no paging, no assertion |
| The e2e config header is false | `apps/web/playwright.config.js:20-22` — claims the specs are read-only |
| The restore doc contradicts itself | `backups/README.md:252-255` — says accounts are not exported and no restore has been performed |
| **The backup fixes are unpushed** (F6) | `git log origin/main..HEAD` returns four commits; `origin/main` head is `119c615` |
| **The deployed backup still truncates** | `git show origin/main:apps/web/scripts/backup.mjs:70` — unpaged `.select('*')` |
| **The deployed backup has no roster** | `git ls-tree origin/main backups/` — no `accounts.json` |
| **The last nightly wrote 1000 again** | `git show origin/main:backups/MANIFEST.md` — `audit_log rows \| 1000`, taken 2026-09-02T20:28:01Z |

---

## 4. Believed, but never proven

Treat every line here as **untested**, not as background. Each is a claim the repository makes
about itself that nobody has exercised.

- **None of the three restore fixes (F1, F2, F3) has been re-rehearsed.** They are written and
  unexercised. This is the highest-value hour available.
- **`audit_log` has never been restored at full volume.** 1,129 rows; the rehearsals used a
  representative block. The mechanism is one statement either way — the sequence is the part that
  bites.
- **Restoring `files/` has never been exercised.** The storage bucket has been empty at every
  backup ever taken, so a stored document has never made the return trip.
- **No viewer account exists.** The role was proven by demoting and promoting a real account,
  never by issuing a permanently read-only one.
- **The rewind has never been applied to production.** Only to a rehearsal copy.
- **No migration in this repository has a rollback path.** Twelve migrations, zero reversals.
- **The roster backup has never been complete.** One of the four accounts carries no recoverable
  email (`backups/accounts.json:8`), so even the corrected procedure restores three of four.
- **Nothing verifies that what runs nightly is what is checked in.** F6 went unnoticed for a day
  because every check reads the working tree. No check compares `origin/main` with `HEAD`, and the
  backup's own manifest reporting a suspiciously round `1000` was the only signal either time.
- **The storage backup has never been exercised at all** (F5). The listing is capped at 1,000 and
  the bucket has been empty at every backup taken, so nothing has ever tested either half.

---

## 5. The remediation index

Stable IDs. Cite them in your plan. `unblocked` means the owner has already approved the shape
and only the work remains; `needs answer` means §7 must be answered first.

| ID | Item | Where | State | Blocked by |
|---|---|---|---|---|
| **R1** | Set `workers: 1`, and correct **two** false comments: the parallelism claim at `:32`, and the file header at `:20-22` which says the specs are "deliberately read-only" when `functional.spec.js` writes heavily | `apps/web/playwright.config.js:14-22, 32` | **unblocked** — one line, the cause of three failed runs, and `verify.yml` runs the same race invisibly | — |
| **R2** | Re-rehearse the restore end to end on `tracker-rehearsal` | `backups/README.md`, `apps/web/scripts/backup.mjs` | **unblocked** — exercises F1, F2 and F3 together. **But F2's fix is incomplete:** `backups/accounts.json:8` holds one account with `"email": null`, so the checked-in backup alone cannot recreate the full roster — three of four accounts, not four | Q12 for the missing email |
| **R3** | Exchange rates: `fx_rates` table, scheduler fetch, `transfers.rate`/`rate_at`, three-step fallback in `inPesos`, `as_of` on the strip | `apps/web/src/logic.js:259-262`, `.github/workflows/schedule.yml`, a new migration | **needs answer** — Q2a/b/c | owner |
| **R4** | Stop Playwright traces recording the password: a setup project that signs in through the UI once with tracing off, saving `storageState` | `apps/web/playwright.config.js`, `apps/web/e2e/app.spec.js:85` | plan drafted, **and incomplete as drafted**: the expired-token spec at `app.spec.js:85` deliberately forces a refresh, which rotates the token and can invalidate a shared saved snapshot even at one worker. It needs isolated state or explicit ordering, and the gate and wrong-password specs need empty-state overrides | **R1** |
| **R5** | Document `SCHEDULE_EMAIL` / `SCHEDULE_PASSWORD` — names only, never values | `apps/web/.env.example`, `apps/web/README.md` | **unblocked** — two files, no code | — |
| **R6** | A second daily backup run | `.github/workflows/backup.yml:13-15` | approved in principle. **The arithmetic in the earlier handoff is wrong:** adding 09:00 UTC to the existing 18:00 produces gaps of 9 h and **15 h**, so worst case becomes 15 h, not ~9 h. An evenly spaced second run is **06:00 UTC**, giving two 12 h gaps. Q7 is therefore a choice of objective, not an hour | Q7 |
| **R7** | `is_viewer()`: **move** it to a non-exposed `private` schema, **or** accept the advisory on the record. **Scope is 17 policies, not 19** — counted at `supabase/migrations/20260901170544_viewer_role.sql`: three each on `txns`, `receipts`, `recurring`, `transfers` and `storage.objects`, two on `app_config` (no delete policy) — plus the call inside `merge_app_config` at `20260901170754_harden_merge_app_config.sql:22` and the client call at `db.js:78` | new migration, `apps/web/src/db.js:78`, [[Decisions]] | **needs answer** — Q3 | owner |
| **R8** | Network preflight before the specs (three uncached `GET`s of `baseURL`, fail fast with `NETWORK_PREFLIGHT_SLOW`) plus `retries: process.env.CI ? 0 : 1` | `apps/web/playwright.config.js`, a preflight file | proposed | Q5 |
| **R9** | Restore `audit_log` at full volume (1,129 rows), not a sample | `backups/README.md` | folds into **R2** | — |
| **R10** | Exercise a `files/` bucket **backup and restore** — the byte round-trip itself is already proven by `apps/web/src/smoke.mjs:102` (upload, download, SHA-256, re-upload, compare). What is unproven is the path `backup.mjs` → `backups/files/` → empty project. **Fix F5 first**, or the rehearsal proves a capped listing works | `apps/web/scripts/backup.mjs:166-195`, `backups/README.md` | never attempted; `backups/files/` holds only `.gitkeep` | needs a non-empty bucket at backup time — Q13 |
| **R11** | Issue a viewer account (8a); then, only if refusals actually confuse someone, grey out affordances (8b) — six screens, twelve modals | Supabase auth, `apps/web/src/` | proposed | needs an address from the owner |
| **R12** | A real notification channel for the scheduler; today it reports only to the Actions job summary | `.github/workflows/schedule.yml` | **needs answer** — provider, addresses, owner ([[Decisions]] D31) | owner |
| **R13** | Node 20 deprecation warnings on `actions/checkout@v4` and `actions/setup-node@v4` | `.github/workflows/*`, e.g. `ci.yml:57` | **now actionable.** The external audit reports both `v5` releases exist and run on the Node 24 runtime. **This session did not verify that independently** — confirm against the release pages before acting | Q14 (authorisation), not upstream |
| **R14** | `apps/api/` is an empty directory declaring an intent nobody has acted on: delete it, or keep it and say why | `apps/api/` | **needs answer** — Q9. Five minutes either way | owner |
| **R15** | Every new migration ships a `-- rollback:` block in the same file, plus a section in [Supabase Schema](../supabase/README.md) on applying one | `supabase/migrations/`, `supabase/README.md` | proposed, not built | — |

### R0 — cleared 2026-09-03

All three blockers below were closed on 2026-09-03. **R2 is now unblocked.** The history is kept
because each one was invisible until something was run, and each will recur.

| Blocker | State |
|---|---|
| F6, the unpushed backup fixes | **Closed.** Merged and pushed as `62fc195`. `origin/main` now carries the paged read with its count assertion (`backup.mjs:87,94`) and `backups/accounts.json`. The remote's own truncated snapshot lost the merge conflict; `MANIFEST.md` reads `1129`. Tonight's 18:00 UTC run is the first on the fixed code — **check its manifest** |
| Sign-up at `tracker-rehearsal` | **Closed**, and it was already off when checked. The dashboard toggle was grey with no pending change, and the endpoint agrees: `POST /auth/v1/signup` → `422 signup_disabled`. Four auth users, zero probe accounts. The 2026-09-03 audit's `200` predates the fix |
| The Vercel bypass token | **Deleted by the owner**, entry `1788371324936`. Not independently verifiable — Vercel's protection API returns password, SSO and trusted-IP state but never bypass entries, so this rests on the owner's word and the dashboard |

**The lesson F6 leaves behind, which outlives the fix:** every check this repository runs reads the
working tree. Nothing compares `origin/main` with `HEAD`, so a fix can be "shipped" in the tree and
absent from the system that runs nightly — for a day, with the suites green throughout. The only
signal either time was a suspiciously round `1000` in a manifest.

<details><summary>Why this was a blocker, kept for the next time it happens</summary>

**F6 changed the order of work.** Every other item assumes the backup is fixed. It is fixed in the
working tree and **not in the system**: the job that runs at 18:00 UTC every night still truncates
`audit_log` at 1,000 rows and still captures no roster. Until the four local commits reach
`origin/main`, the checked-in disaster-recovery artifact stays short and unrestorable, and R2 would
rehearse a procedure against a snapshot the live job does not produce.

**This is not a task an agent may take.** A push to `main` deploys to production, so publishing
those four commits is the owner's decision and nobody else's. What an agent may do is review them
as a deployable change set — which nobody has yet done — and report whether they are safe to ship.

| Also blocked on the owner | Why |
|---|---|
| **Self-serve sign-up at `tracker-rehearsal`** | D35 and trap 51 forbid loading real data there until it is off. An agent's Supabase tooling can read database state but **cannot change Auth configuration** — that is the dashboard or the Management API only |
| **A Vercel deployment-protection bypass token** | `npx vercel curl` silently generates one. It is not visible through the Vercel API's protection endpoint, so an agent cannot confirm its own cleanup — only the dashboard can |

</details>

### Documentation that contradicts itself

Found by the external audit on 2026-09-03. None of it is a code defect, and all of it will
mislead the next reader. Fixing it is not authorised by this brief; **flag it, do not silently
rewrite it.**

| Where | The contradiction |
|---|---|
| `backups/README.md:252-255` | "**Accounts.** Supabase Auth users are not exported" and "**A tested restore.** Nobody has performed one against an empty project" — both contradicted by `backups/accounts.json` existing and by the 2026-09-02 rehearsal table earlier in the same file |
| `apps/web/playwright.config.js:20-22` | Says the specs "are deliberately read-only". `functional.spec.js` writes heavily. Folded into R1 |
| `apps/web/README.md` | Omits the scheduler and its `SCHEDULE_*` variables entirely; adjacent test and security counts are stale. Folded into R5 |
| `docs/Repository Evidence.md:32` | Describes `apps/api/` as an intended boundary — accurate, but it is the note R14 would have to change |

### Explicit non-actions

Do not do these. Each was considered and rejected with a reason.

| ID | Do not | Why |
|---|---|---|
| **N1** | Do **not** revoke `EXECUTE` on `is_viewer()` from `authenticated` | Tested on a throwaway schema: Postgres checks `EXECUTE` on a function used in an RLS policy against the **querying role**. Revoking leaves every account able to read the whole ledger and unable to write a single row — the app looks *almost* fine, which is worse than an outage. [[Decisions]] D34. The Supabase advisor's *first* remediation is wrong for this schema; its second is right |
| **N2** | Do **not** remove the three unused indexes | INFO-level evidence on near-empty tables says nothing about their value once the tables fill. `transfers_co_idx` has nine rows to work with now where it had none |
| **N3** | Do **not** raise the Playwright timeouts | Longer budgets hide the signal instead of classifying it. With `workers: 1` the 30 s budget is no longer the binding constraint. An earlier proposal to raise them was withdrawn |
| **N4** | Do **not** reimplement recurrence in SQL | `buildGeneratedRows` in `apps/web/src/logic.js` is the single definition, shared by the Generate button and the scheduled job. `pg_cron` is available and was deliberately not used because it would mean a second copy that drifts ([[Decisions]] D31) |
| **N5** | Do **not** add a credential fallback for `SCHEDULE_*` | Not to `BACKUP_*`, not to `E2E_*`. The scheduler **writes**; the backup only reads. A fallback conceals which privilege each credential carries (trap 41) |
| **N6** | Do **not** mock Supabase or stand up a local database for the e2e suite | The suite's entire value is that it drives the real stack |
| **N7** | Do **not** modify anything under `company_tracker/` | Generated Design Component exports, read-only by the nearer `AGENTS.md` |
| **N8** | Do **not** clean up `audit_log` | Nothing may delete from it, by design. Every suite run leaves writes there permanently. That is correct behaviour, not residue |

---

## 6. Traps — the full constraint set, 1 to 54

Condensed from five handoffs so you do not have to open all of them. **Every one of these cost
real time.** Full prose for 1-12 is in [[2026-09-01 Session Continuation Package]], 13-18 in
[[2026-09-01 Repository Restructure and Data Clear]], 19-43 in
[[2026-09-01 Telegraphic Transfers and Full-Stack Verification]], 44-46 in
[[2026-09-02 Everything Held Back, Built]], 47-54 in
[[2026-09-02 The Rewind, and a Backup That Was Short]].

### Database and schema

| # | Trap |
|---|---|
| 1 | An update must never send the primary key — `UPDATE` on `id` is not granted. `forUpdate()` in `rows.js` strips it. Symptom: every edit silently fails to save |
| 2 | `app_config` cannot be upserted; upsert carries `id` into its `DO UPDATE`. Update, then insert only if no row exists |
| 4 | The Supabase SQL tool does **not** roll back a `do $$ … $$` block. Use read-only probes or explicit `begin … rollback`, and verify afterwards |
| 20 | A column grant cannot carve a column out of a table grant. Revoke first, then grant columns, then verify against `information_schema.role_column_grants` |
| 27 | `revoke insert, update, delete` does not lock a table down. Supabase's default privileges grant ALL, and ALL includes **TRUNCATE**, which RLS does not restrict. `revoke all from anon, authenticated`, then grant back |
| 28 | **A new table needs five things it does not inherit:** revoke-then-grant; a `for select` policy **plus** write policies predicated on `not public.is_viewer()`; an entry in `TABLES` in `apps/web/scripts/backup.mjs`; its own security-probe checks; its own `log_change()` trigger |
| 29 | The audit log cannot be cleaned up. Every suite run leaves writes there permanently, by design |
| 35 | A schema fingerprint over a whole database compares the platform too. A 177-vs-176 "drift" was a Supabase `realtime` trigger. Scope catalogue comparisons to `public` |
| 39 | A single `for all using (true)` policy on a new table hands viewers full write access. The old shape is still all over the earlier migrations; do not copy it |
| 48 | **PostgREST caps a read at 1,000 rows and says nothing** — no error, no flag, a short array. Any `select` over a table that can exceed 1,000 rows must page **and then assert the count**. The same cap applies to `storage.list()`, where it is **still unfixed** (F5, `backup.mjs:171,177`) |

### Backup, restore and recovery

| # | Trap |
|---|---|
| 36 | A restore must disable the audit triggers and `app_config_touch`, then fix the sequence. Leave triggers on and the restore writes history about itself; leave `app_config_touch` on and every restored `updated_at` becomes `now()` |
| 37 | A restore cannot run through the application's credentials. `authenticated` has no INSERT on `audit_log` and only column-list grants elsewhere, so a client-credentialed restore silently drops `created_at` and the whole audit history. Restore as `postgres` |
| 49 | **`backups/` does not contain `auth.users`, and `profiles` needs it.** Restoring the roster into a fresh project fails `23503`; skipping it succeeds and returns a ledger nobody can write to |
| 50 | **The `audit_log` sequence fails late, not next.** A rehearsal that ends "can I still write? yes" passes while broken. Assert the sequence, not the write |
| 53 | `{"success": true}` from `apply_migration` can mean the migration reached an instance that no longer exists. Read the catalogue afterwards |
| 54 | A newly restored Supabase project reads as **empty while it is still restoring**. `information_schema` returned zero `public` tables for a database holding eighteen. Wait, then look again |

### Testing

| # | Trap |
|---|---|
| 3 | React StrictMode double-invokes effects in dev, so `load()` runs twice — this once masked a bug and made a regression test pass with the fix removed. Never gate a dev-mode test on a request count |
| 5 | Writes are fire-and-forget. A test that queries immediately after a UI action races the write. Poll |
| 6 | Playwright `hasText` does not see input values. Masterlist rows hold their description in an `<input>`; locate by field value |
| 7 | `locator.isVisible()` does not wait. Use `expect(...).toBeVisible()` |
| 11 / 16 | No spec may assume the ledger has content. Use `makeReceipt` / `makeRecurring` from `e2e/db.js`, create the fixture **before** `signIn`, give each a unique name |
| 12 | One unexplained run reported `6 passed` with no failure or skip. If it recurs, check whether `playwright.config.js` loaded `.env.local` — `haveCredentials()` skips the whole functional file when it did not |
| 22 | `npm run smoke` and `npm run e2e` **write to the production ledger**. `E2E_BASE_URL` changes the site, not the database. The sweep is tag-scoped and safe; `cleanupOrphanFiles()` is **not** — it deletes any stored file no receipt row points at |
| 25 | A Playwright row click lands on the row's centre. On the AckRec sheet that is the status `<select>`, which stops propagation. Click a named cell |
| 40 | **Assert the refusal, not the absence of an error.** `merge_app_config` returned 0 and no error to a viewer, because a blocked policy and a missing row both give `row_count = 0` |
| 43 | An e2e spec must assert on its own row, never on how many carry the run's tag. Counting shared-ledger rows is a race |
| 47 | **`fullyParallel: false` does not mean one worker.** Playwright still runs separate files in parallel, four at a time. On a shared production ledger that is a race, and it read as a network problem for hours |
| 31 / 52 | A green `npm run security` is not proof — it exits 0 for anything in `DEFERRED`; read the `n deferred` line. And **a Playwright trace is a credential**: `fill()` values are recorded verbatim, so never attach one to an issue, a PR or a message |

### Auth, roles and secrets

| # | Trap |
|---|---|
| 26 | The security probe creates a real account each run while sign-up is open, and it survives the run |
| 38 | **Creating an account is two steps.** An account with no `public.profiles` row is a viewer and can change nothing. If someone reports that nothing saves, check for the row |
| 41 | The scheduler writes to the ledger as an administrator, reusing `BACKUP_EMAIL`/`BACKUP_PASSWORD`. Demote that account and the daily run goes red with `42501` |
| 24 | Never hand a secret through prose. A truncated key with a `…` failed with a ByteString error 26 characters in. Read secrets from the file |
| 33 | **A GitHub secret's NAME is public; only its value is secret.** A Vercel token pasted into the name position was published in the settings UI and burned |
| 34 | Vercel token management is browser-only. A leaked token cannot be revoked from a session — only at the account tokens page. Plan for that before creating one |
| 51 | **A new Supabase project has sign-up ON.** Load real rows into one and a stranger can register and read the lot. Close sign-up first, or load nothing real ([[Decisions]] D35) |

### Deployment and repository

| # | Trap |
|---|---|
| 8 | Vercel's Security Checkpoint appears under automated traffic, 403s scripts, and clears itself. Not an outage |
| 9 | Vite dev-server console noise on cold start is not an app error |
| 10 | The completed filter is off by default, so a row marked paid leaves the Tracker view. Correct behaviour, not a lost row |
| 13 | **Vercel's Root Directory is load-bearing** — it is `apps/web`. Unset it and every build fails with `vite: command not found` |
| 14 | A failed Vercel build does not take production down; the domain keeps serving the last successful deployment |
| 15 | Link rewriters do not see inside code fences. **Any path in a fenced block — resume prompts especially — must be updated by hand after a move** |
| 17 | `git mv` cannot move a repo root. Move `.git` up, then `git add -A` |
| 18 | `.obsidian/` is 16 MB and churns on every pane change. Gitignored. Do not add it |
| 19 | `[skip ci]` does not stop a Vercel deploy; `ignoreCommand` in `apps/web/vercel.json` is what works |
| 23 | Node 22 or newer is required — `supabase-js` reaches for a native WebSocket at `createClient` and Node 20 dies at import |
| 30 / 32 | `ci.yml` gates nothing while Vercel deploys on push; `vercel.json`'s `git.deploymentEnabled` takes effect **on the commit that introduces it**, not one push late |
| 44 | A tag and the manifest drift silently. Bump `package.json` and tag as part of the release commit, not afterwards |
| 45 | `start()` must return every key `initialState` sets pessimistically. `readOnly` defaults to `true`, and a path omitting it would have refused every action until reload |
| 46 | A partial patch is not a whole config. An insert fallback writing `undefined` into every omitted key must merge the patch over the defaults |

---

## 7. Questions only the owner can answer

Nothing in R3, R7, R11, R12 or R14 can be planned to a conclusion without these. Group them into
one message; a one-word answer is enough where the recommendation is agreed.

| ID | Question | What it decides | Recommendation |
|---|---|---|---|
| **Q2a** | Exchange-rate provider: `frankfurter.app` (ECB reference rates, **no API key**) or a keyed provider with more frequent updates? | R3's whole shape. No key means no secret to store, leak or rotate — and rotation is deferred | frankfurter |
| **Q2b** | May the person entering a wire type over the fetched rate? | Whether the daily rate is authoritative or a default | Yes — six wires were released at some bank's real rate and only the person entering them knows it |
| **Q2c** | Backfill the nine existing wires with the rates they were actually sent at? | Whether ₱39,964,763.80 of history gets re-priced | **Cannot be answered without the owner's real numbers.** Without them a backfill invents figures for money that has already moved |
| **Q3** | `is_viewer()`: move it to a `private` schema, or accept the advisory on the record? | R7, and the last actionable Supabase advisory | Move it — not because the exposure is large (an account learns its own role, which it can already read from `profiles`) but because an advisory left open with no written reason trains everyone to skim advisories |
| **Q4** | Apply `workers: 1`? | R1 | Yes. If the owner takes one thing from this brief, this is it |
| **Q5** | Network preflight plus local retries? | R8 | Yes |
| **Q6** | Keep the password out of Playwright traces? | R4 | Yes. If rejected, the one-line README warning should still happen — the whole risk is that nobody knows a trace is a credential |
| **Q7** | Second daily backup at 09:00 UTC — confirm the hour? | R6 | Yes, or name a better one |
| **Q8** | A dedicated scheduler account? | R12's attribution | No recommendation. This schema has two roles, so a dedicated account would still be an administrator: it buys clean attribution in `audit_log` and a separately revocable credential, **not less privilege** |
| **Q9** | Delete the empty `apps/api/`? | R14 | Genuinely split. One prior consultation said keep it as a documented boundary; the previous session leaned delete, calling it a note pretending to be architecture |
| **Q10** | Which address receives the viewer account? | R11 | — |
| **Q11** | For the scheduler's notifications: which provider, which recipients, and who is accountable when delivery stops? | R12. Q8 does not answer these | — |
| **Q12** | May the operator retrieve the fourth administrator's email from the production Auth dashboard, or will the owner supply it? | **R2 cannot fully close without it** — `accounts.json:8` has `"email": null` | Owner supplies it; reading it from the dashboard is also fine and cheaper |
| **Q13** | Authorise a real `files/` backup-and-restore rehearsal? Either place one controlled synthetic object in production, or wait for a genuine document | R10 | Either, but it must not race the e2e cleanup — `cleanupOrphanFiles()` deletes any stored file no receipt row points at |
| **Q14** | Authorise the `actions/checkout@v5` and `actions/setup-node@v5` bump, both together? | R13 | Yes if the v5 releases check out |
| **Q15** | Adopt R15 prospectively? | Every future migration, R3 and R7 included, would then carry a same-file `-- rollback:` block. **It does not make the existing twelve reversible** | Yes |

**On the count.** This section has fifteen IDs. [[Open Problems and Proposals]] says "nine
questions" because it counts the exchange-rate question as one; here it is split into Q2a/b/c, and
Q10-Q15 were added by the 2026-09-03 audit. Neither number is wrong — they count different things.

---

## 8. Files an agent should read, with exact paths

Wikilink on the left, path on the right. Read in this order.

| Note | Path | Why |
|---|---|---|
| [[2026-09-02 The Rewind, and a Backup That Was Short]] | `handoff/2026-09-02 The Rewind, and a Backup That Was Short.md` | The current state-of-the-world handoff. Phases 26-30, traps 47-54 |
| [[Open Problems and Proposals]] | `docs/Open Problems and Proposals.md` | The full round-2 proposals this brief indexes, with the evidence behind each |
| [[Exchange Rates Proposal]] | `docs/Exchange Rates Proposal.md` | R3's complete design, including the CSP and bundle-key constraints |
| [[Decisions]] | `docs/Decisions.md` | D1-D35. The authority on what is authorised |
| [Backups](../backups/README.md) | `backups/README.md` | The restore procedure R2 must exercise |
| [Supabase Schema](../supabase/README.md) | `supabase/README.md` | Twelve migrations, replay procedure |
| [[Repository Evidence]] | `docs/Repository Evidence.md` | The factual baseline; distinguishes evidence from inference |
| [[AI Agent Context]] | `docs/AI Agent Context.md` | Navigation hub for the whole vault |
| [[2026-09-02 Everything Held Back, Built]] | `handoff/2026-09-02 Everything Held Back, Built.md` | Phases 21-25, traps 44-46 |
| [[2026-09-01 Telegraphic Transfers and Full-Stack Verification]] | `handoff/2026-09-01 Telegraphic Transfers and Full-Stack Verification.md` | Phases 14-23, traps 19-43 |
| [[2026-09-01 Repository Restructure and Data Clear]] | `handoff/2026-09-01 Repository Restructure and Data Clear.md` | Phases 10-13, traps 13-18 |
| [[2026-09-01 Session Continuation Package]] | `handoff/2026-09-01 Session Continuation Package.md` | Phases 1-9, the codebase map, traps 1-12 |

Source files named by this brief:

```
apps/web/playwright.config.js      R1 line 32, R4 line 37, R8
apps/web/.env.example              R5
apps/web/src/logic.js              R3 line 259 (TRANSFER_RATES), line 262 (inPesos)
apps/web/src/db.js                 R7 line 78 (supabase.rpc('is_viewer'))
apps/web/scripts/backup.mjs        F1 paging, F2 accounts.json, trap 28 TABLES list
apps/web/scripts/rewind.mjs        the audit-log undo; writes nothing, emits .sql
apps/web/security/probe.mjs        47 checks; the DEFERRED list lives here
backups/README.md                  the restore procedure; setval assertion at 158-166
.github/workflows/backup.yml       R6 cron at line 15
.github/workflows/schedule.yml     R3 step, R12 notifications
.github/workflows/verify.yml       runs the three ledger-writing suites nightly
supabase/migrations/               twelve migrations, zero rollbacks (R15)
```

---

## 9. How to verify state before planning anything

Do not trust this snapshot. Run these first and report what drifted.

```bash
cd /Users/itadmin/Desktop/puge/apps/web
npm test                          # 53 offline assertions
npm run build                     # green
npm audit                         # 0
npx playwright test --workers=1   # 27 specs — WRITES to production. The DEFAULT worker count fails
npm run security                  # expect "47 checks, 0 failed" and no "deferred" clause
npm run smoke                     # live end-to-end — WRITES, and stores a document
SCHEDULE_EMAIL=… SCHEDULE_PASSWORD=… npm run schedule -- --dry-run
```

`E2E_REQUIRE_CREDENTIALS=1` turns a silent skip into a failure. **If e2e reports specs skipped, it
ran nothing.**

Then read the database directly, not through the app:

```sql
-- the owner's data. The fingerprint moves when they work; the shape should not.
select md5(string_agg(t::text, chr(10) order by t.id)) as fingerprint,
       count(*), sum(amount)::text from public.txns t;

-- everybody has a role, and nobody is accidentally a viewer
select u.email, p.role from public.profiles p join auth.users u on u.id = p.user_id order by 1;

-- the backup is not short (compare with backups/MANIFEST.md)
select count(*) from public.audit_log;

-- no residue
select 'txns' t, count(*) from public.txns where description like '%E2E-%'
union all select 'probe users', count(*) from auth.users where email like 'sec-probe-%';

-- every migration still matches the repository
select version, md5(statements[1]) from supabase_migrations.schema_migrations order by version;
```

Also confirm the Supabase project has not paused (free plan, seven quiet days), that all four
workflows are still enabled, and re-read the Supabase advisors — two `WARN`s are known.

---

## 10. What a good plan from you looks like

The owner is going to read your output and decide what to build. Make that decision cheap:

1. **Cite the IDs.** R1-R15, N1-N8, F1-F4, Q2a-Q9, and trap numbers. They are stable across notes.
2. **Separate what needs an answer from what needs work.** Anything blocked on §7 is a question,
   not a task, and putting it in a task list wastes the owner's attention.
3. **Name the check that closes each item.** "Done" here means a command that fails if the fix
   regresses — this repository has no formatter, linter or type checker, so the suites are the
   only gate. `npm test` is offline; everything else touches production.
4. **Order by evidence, not by size.** R2 exercises three unproven fixes at once and is worth more
   than the four one-line items combined.
5. **State what you did not verify.** Source gaps are a required part of a review here
   ([[Decisions]], `CLAUDE.md` §Reviews).
6. **Propose migrations with a `-- rollback:` block** (R15), even before R15 is formally adopted.

---

## Resume prompt

One prompt, whole state. Paste it into a fresh chat as-is.

```
Read these, in this order, in /Users/itadmin/Desktop/puge:

  handoff/2026-09-03 Remediation Brief for an External Agent.md      (START HERE — the fix index)
  handoff/2026-09-02 The Rewind, and a Backup That Was Short.md      (phases 26-30, traps 47-54)
  docs/Open Problems and Proposals.md                                (the proposals, with evidence)
  docs/Exchange Rates Proposal.md                                    (R3's full design)
  docs/Decisions.md                                                  (D1-D35, what is authorised)
  backups/README.md                                                  (the restore procedure)

Then, only if you need the prose behind a trap number:
  handoff/2026-09-02 Everything Held Back, Built.md                  (phases 21-25, traps 44-46)
  handoff/2026-09-01 Telegraphic Transfers and Full-Stack Verification.md (traps 19-43)
  handoff/2026-09-01 Repository Restructure and Data Clear.md        (traps 13-18)
  handoff/2026-09-01 Session Continuation Package.md                 (codebase map, traps 1-12)

This is a React + Vite ERP in apps/web on Supabase Postgres, deployed to Vercel behind a CI
gate, at v0.6.0. Four accounts, all administrators, one shared ledger, REAL financial data,
and the owner uses it daily during Manila working hours. There is no staging environment.
Your job is to research, audit and produce a PLAN for the remediation index in section 5 of
the brief. Do not apply changes unless the owner says so.

Before planning anything, verify rather than trusting the snapshot. In apps/web run npm test
(expect 53), npm run build, npm audit, npx playwright test --workers=1 (expect 27; the
DEFAULT worker count fails), npm run security (expect "47 checks, 0 failed" with no deferred
clause) and npm run smoke, then run the SQL in section 9 of the brief. npm run e2e and
npm run smoke WRITE to the production ledger, and npm run e2e exits 0 having run nothing when
credentials are missing. If the txns fingerprint differs from
05a080127ca18b46dc693edbd22b5168, the owner has been working — say so rather than assuming
damage.

Hold these while you work:
- Propose; do not apply. Only R1, R2 and R5 in the brief are unblocked.
- Assert the refusal, not the absence of an error, and read the state back. A blocked policy
  and a missing row both give row_count = 0, and that has cost this project three times.
- {"success": true} from apply_migration proves the SQL ran, not that it achieved anything —
  and it can mean it reached an instance that no longer exists. Verify against
  information_schema. Revoke ALL then grant back what is intended (D23/D25). TRUNCATE ignores
  RLS.
- Do NOT revoke EXECUTE on is_viewer(). Tested: it breaks every write with 42501 while reads
  keep working, so the app looks almost fine (D34). Moving it to a non-exposed schema works.
- PostgREST caps a select at 1,000 rows silently. Anything reading a growing table must page
  and then assert the count.
- backups/ has no auth.users; backups/accounts.json is the fix and has NOT been re-rehearsed.
  Neither has the paged-read assertion or the corrected setval step. A restore that drops the
  roster throws nothing and leaves everybody a viewer — assert four profiles rows AND that
  every one is admin. accounts.json is ALSO short one email ("email": null on one of four), so
  the checked-in backup alone recreates three of four accounts (Q12).
- THE BACKUP FIXES ARE NOT DEPLOYED (F6). Four commits sit unpushed on main; origin/main still
  has the unpaged .select('*') and no backups/accounts.json, and the nightly job wrote
  "audit_log rows | 1000" again on 2026-09-02T20:28Z. Check git log origin/main..HEAD before
  believing any "fixed" claim in this brief. Pushing is the OWNER'S call — a push to main
  deploys to production.
- Self-serve sign-up is still ON at tracker-rehearsal, so R2 cannot start (D35, trap 51).
- The 1,000-row cap that produced F1 is still present in the STORAGE listing —
  apps/web/scripts/backup.mjs:171 and :177 call list() with limit 1000, no paging, no count
  assertion. That is F5, found 2026-09-03 and unfixed.
- Skipping setval on audit_log_id_seq kills a write DAYS later, on every audited table at
  once. A rehearsal that ends "can I still write? yes" passes while broken.
- npm run e2e runs FOUR workers against one shared production ledger, because
  fullyParallel:false only serialises within a file. workers:1 is proposed and NOT applied.
- A failed Playwright run writes the shared password in plaintext into
  apps/web/test-results/*/trace.zip. Gitignored, never uploaded, but delete artifacts after
  debugging and never attach a trace anywhere.
- A green npm run security is not proof: it exits 0 for anything in DEFERRED in
  apps/web/security/probe.mjs. That list is empty today. Read the "n deferred" line, and
  never delete a failing check to make a suite green (D26).
- Self-serve sign-up is CLOSED and must stay closed. Read policies are still using(true), so
  being signed in grants the whole ledger; only writes are role-gated. An account with no
  public.profiles row is a VIEWER.
- A new table needs five things it does not inherit: revoke-then-grant, a for-select policy
  PLUS write policies predicated on not public.is_viewer(), an entry in TABLES in
  apps/web/scripts/backup.mjs, its own security-probe checks, and its own log_change()
  trigger.
- Do not reimplement recurrence in SQL; buildGeneratedRows in src/logic.js is the single
  definition (D31). Do not remove the three unused indexes. Do not raise the Playwright
  timeouts. Do not add a credential fallback for SCHEDULE_*. Do not modify company_tracker/.
- Supabase project zone-offices (lasycakyudaawrydetnm) is a LIVE CRM, 18 tables, paused. Do
  not touch it. tracker-rehearsal (bucmcnsjkuprpojhequy) is the scratch project; it holds the
  schema and no data, and a new Supabase project has sign-up ON by default (D35).
- npm run rewind reconstructs any second from audit_log (D32). It writes nothing; it emits a
  .sql file to run as postgres. Generated plans are gitignored — they carry whole rows.
- Password and Vercel token rotation are DEFERRED by the owner. Do not raise them. The
  construction tracker is parked (D18).
- cleanupOrphanFiles() deletes any stored file no receipt row points at.

Deliver, in this shape:
1. A ranked plan citing the brief's IDs (R1-R15, N1-N8, F1-F4, traps by number), with the
   check that closes each item and the files it touches.
2. The questions from section 7 that must be answered first, separated from the tasks —
   R3, R7, R11, R12 and R14 are all blocked on the owner.
3. What you verified, what drifted, and what you could NOT verify.

Report what you verified and confirm the state back in a few lines, then wait for direction
before starting any work.
```

---

## Guideline Basis

- **PG-02** keeps every item tied to a checked-in file or an observed run; nothing here is an invented command.
- **PG-04** requires each claim to name the reproducible check behind it, and §3 records the re-verification done on 2026-09-03.
- **DOC-02** keeps evidence (§2, §3), unproven belief (§4), proposal (§5) and open question (§7) separately labelled.
- **DOC-03** keeps terminology, paths and relationship labels consistent with the rest of the vault.
- **MD-02** requires descriptive, resolvable links; §8 pairs every wikilink with its exact relative path for agents that cannot resolve wikilinks.
- **SEC-03** is why no credential appears in this note, and why the trace exposure is described by its mechanism rather than its value.

implements: [[Awesome Guidelines Integration]]

Related: [[2026-09-02 The Rewind, and a Backup That Was Short]] · [[Open Problems and Proposals]] · [[Exchange Rates Proposal]] · [[Decisions]] · [Backups](../backups/README.md) · [Supabase Schema](../supabase/README.md) · [[Repository Evidence]] · [[AI Agent Context]] · [[Handoff]]
