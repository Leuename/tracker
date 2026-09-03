---
title: Ten Closed, and a Backup Nobody Had Deployed
tags: [handoff, continuation, erp, tracker, supabase, backups, restore, testing, security, credentials]
created: 2026-09-03
status: current
supersedes: "[[2026-09-02 The Rewind, and a Backup That Was Short]] as the entry point; that note remains the record of phases 26 to 30 and its traps 47 to 54 all still apply"
extends: "[[2026-09-03 Remediation Brief for an External Agent]] — the defect index this session worked through; its section 5 now carries per-item outcomes"
related:
  - "[[Decisions]] — D1 to D35, the authority on what is authorised"
  - "[[Open Problems and Proposals]] — the proposals behind most of what was built"
  - "[[Exchange Rates Proposal]] — R3, still not started"
  - "[Backups](../backups/README.md) — the restore procedure, rehearsed again"
  - "[Supabase Schema](../supabase/README.md) — twelve applied, two written and unapplied"
up: "[[AI Agent Context]]"
---

# Ten Closed, and a Backup Nobody Had Deployed

**This is the current entry point.** Phases 31 to 34, all on 2026-09-03.

The session was meant to work through the remediation brief. It found something the brief itself
had wrong, and the correction matters more than anything that was built: **the backup fixes written
on 2026-09-02 were never deployed.** They sat in the working tree while the scheduled job kept
running the old code.

---

## The one thing to read if you read nothing else

**A fix in the working tree is not a fix in the system.**

Four commits sat unpushed on `main`. `origin/main` still carried the unpaged `.select('*')` and had
no `backups/accounts.json` at all. The nightly job ran again at **2026-09-02T20:28:01Z** and wrote
`audit_log rows | 1000` against a table holding 1,129 — the same round number, one day after the
paging fix was written and celebrated.

For a whole day the repository said the backup was fixed, every suite was green, and the artifact
that would be used to rebuild the company's ledger was short two hundred rows and could not restore
a single account.

Nothing caught it because **every check in this project reads the working tree.** Nothing compares
`origin/main` with `HEAD`. The only signal, both times, was a suspiciously round `1000` in a
manifest nobody diffs.

```bash
git log origin/main..HEAD    # run this before believing any "fixed" claim
```

It is pushed now, as `6fb8e38`. **Tonight's 18:00 UTC run is the first backup ever taken with the
fixed code, and confirming its manifest reads 1129 or higher is the one thing still outstanding.**

---

## The state in one screen

| | |
|---|---|
| Supabase (production) | `jusifpditdigqdjiwdaj`, `baby`, `ap-southeast-1`, free plan |
| Supabase (rehearsal) | `bucmcnsjkuprpojhequy`, `tracker-rehearsal` — **now holds a restored copy of the ledger**; sign-up verified CLOSED (`422`) |
| Supabase (off limits) | `lasycakyudaawrydetnm`, `zone-offices` — a live CRM. Paused. Do not touch |
| Vercel | project `tracker`, hobby. **SSO protection is on** (`all_except_custom_domains`) |
| Release | `v0.6.0`. `main` at `6fb8e38` |
| Accounts | 4, all admin. `mikmiktabs@gmail.com` is the fourth, recovered this session |

### The ledger, read 2026-09-03 after the e2e run

```
txns fingerprint  05a080127ca18b46dc693edbd22b5168   (unchanged)
txns 21 · PHP 226,000.00 · transfers 9 · profiles 4 (all admin)
receipts 1 · audit_log 1,321 · E2E residue 0 · probe accounts 0
```

**`receipts` went 0 → 1 during the session. That is the owner working, not residue.** `Kuya
Richard` / `Budget` / ₱10,000 / VNQ, entered 06:22 UTC. It is real data and it must never be swept.

### Checks

| Command | Result |
|---|---|
| `npm test` | **53/53** offline |
| `npm run build` | green |
| `npx playwright test --workers=1` | **29 passed in 1.3 min** (2 setup + 27 specs) — was 4.2 min |
| `npm run security` | not re-run this session; the probe gained 2 checks (47 → 49) |
| `npm run backup` | not run; the fixed code has never executed |

---

## What happened, in order

| # | Phase | Outcome |
|---|---|---|
| 31 | The three owner blockers | Vercel bypass token deleted; rehearsal sign-up found already closed and verified at the endpoint; the four unpushed commits merged and pushed |
| 32 | The offline batch | R1, R5, R6, R13, R15, F5, the roster durability fix, and the restore-doc contradictions |
| 33 | The rehearsal | Schema parity, a byte-identical ledger restore, and F3 reproduced then fixed |
| 34 | The credential fix | The e2e suite stopped typing the password in 25 of 27 specs, proven by a real run |

### Phase 31 — three blockers, and only one of them was real

The Vercel bypass token was real and still there; the owner deleted it. **The rehearsal's sign-up
was already off** — the toggle was grey with no pending change, and a click would have turned it
*on*. Verified where it counts rather than in the UI:

```
POST /auth/v1/signup → 422 {"error_code":"signup_disabled"}
```

The 2026-09-03 audit that reported `200` was accurate when written and stale by the time it was
read. **An external report is a snapshot, not a state.**

### Phase 33 — the rehearsal, and F3 caught in the act

Schema parity first, and it is exact:

```
821 catalogue facts · 9878b2dbf88b626ad943aad0aff31901 · production
821 catalogue facts · 9878b2dbf88b626ad943aad0aff31901 · tracker-rehearsal
```

Then the data. `txns` came back at fingerprint `05a080127ca18b46dc693edbd22b5168`, 21 rows,
₱226,000.00 — identical to production. `app_config.updated_at` kept its stored time rather than
being stamped `now()`. Four profiles, all `admin`, all joining `auth.users`. **Zero rows written
into `audit_log` by the restore**, which is what disabling the triggers is for.

**Then F3, reproduced deliberately rather than described.** With the sequence left behind and the
triggers back on:

| Stage | Result |
|---|---|
| Audited write, sequence at 1 | **`23505 duplicate key value violates unique constraint "audit_log_pkey"`** |
| After the prescribed `setval` | write accepted |
| `last_value >= max(id)` | true |

That is the trap the procedure warns about, caused on purpose and then cured by the documented
step. `backups/verify-restore.sql` — written this session — asserts every one of these and fails
loudly rather than reporting.

### Phase 34 — the password stops reaching the disk

A setup project signs in through the UI once with tracing off and saves `storageState`; the other
25 specs start authenticated. The two specs whose whole purpose is the sign-in form still use it.

Two things fell out of building it that nobody had noticed:

- **`supabase.auth.signOut()` defaults to `scope: 'global'`** — confirmed in the installed
  dependency, which carries its own warning comment. `src/App.jsx:58` calls it bare, so signing out
  on a laptop revokes that person's phone session too. One word to change, user-visible, and
  **nobody asked for it — it is the owner's call.**
- A forced token refresh **rotates** the refresh token, so a shared `storageState` snapshot can be
  invalidated mid-run. Isolation alone does not fix it; the global sign-out above defeats isolation.
  Ordering does, and the specs are ordered accordingly.

The suite went from 4.2 minutes to **1.3**, because 25 sign-ins disappeared.

---

## Believed, but never proven

- **Tonight's backup.** The fixed code has never run. Confirm the manifest.
- **`audit_log` at full volume.** 250 of 1,129 rows loaded before a session limit stopped it. The
  mechanism, the fidelity and the sequence are proven; bulk transport is not — and an agent tool is
  the wrong transport for it. Use `psql \copy`.
- **`verify-restore.sql` has never been run through `psql`.** Its assertions were transliterated
  and proven individually; the file itself is untested, because no connection string was available.
- **The storage paging fix (F5) has never seen a live bucket.** It is unit-tested against a fake at
  the 1000/1001 boundary. This is exactly the position F1 shipped in.
- **The two `is_viewer` migrations have been applied nowhere**, not even the rehearsal.
- **The account-*recreation* path is still untested.** Deleting `auth.users` rows is blocked in this
  environment even scoped to four ids, so the rehearsal restored `profiles` against accounts that
  already existed. `accounts.json` is correct now; using it has still never been necessary.
- **`npm run security` was not re-run** after the probe gained two checks.

---

## Traps, continued

Traps 1 to 54 are in the five earlier packages and all still apply. These are new.

55. **A fix in the working tree is not a fix in the system.** Nothing here compares `origin/main`
    with `HEAD`, so a "shipped" fix can be absent from the job that runs nightly — for a day, with
    every suite green. `git log origin/main..HEAD` before believing any such claim.
56. **`supabase.auth.signOut()` is global by default.** It revokes every refresh token the account
    holds, on every device. `{ scope: 'local' }` is the local one.
57. **A Playwright `storageState` file is a credential, and a rotating one.** It holds an access
    token and a refresh token; a forced refresh rotates it, and a global sign-out revokes it. Store
    it under `test-results/`, and order the specs that mutate sessions.
58. **A rehearsal project that already has the accounts skips the step the rehearsal is for.**
    `profiles` restores cleanly against a roster that never had to be recreated, and proves nothing
    about `accounts.json`.
59. **The storage API has no count, so the F1 assertion cannot be copied to it.** `readAll` counts
    first with `{ count: 'exact', head: true }` and pages with `.range()`; `storage.list()` offers
    neither. The strongest available assertion is "a full page means keep going".
60. **An external agent's report is a snapshot, not a state.** Two findings this session were
    accurate when written and stale hours later — a sign-up setting and a project's HEAD. Re-verify
    before acting, especially before "fixing" something already fixed.
61. **`receipts` growing is the owner working.** The ledger moves during a session now. Check
    whether a new row carries an `E2E-` tag before calling anything residue; this one was a real
    ₱10,000 entry made while the suites were running.

---

## Open items

| # | Item | State |
|---|---|---|
| 1 | **Tonight's manifest** | The only thing outstanding from this session. Expect `audit_log rows` ≥ 1129 and an `accounts.json` with four emails |
| 2 | **Exchange rates (R3)** | **Not started.** ₱39,964,763.80 priced by five constants at `logic.js:259`. An agent was killed mid-build and left nothing. Defaults chosen and recorded: frankfurter, override allowed, no backfill |
| 3 | **`is_viewer()` move (R7)** | Two migrations written, applied nowhere. Ordering documented in [Supabase Schema](../supabase/README.md) |
| 4 | **`audit_log` full-volume restore** | 250 of 1,129. Needs `psql`, not an agent |
| 5 | **`signOut()` scope** | Owner decision. See trap 56 |
| 6 | **Viewer account / notifications / `apps/api/`** | Unchanged; each blocked on a fact or a preference only the owner holds |
| 7 | **`npm run security`** | Re-run it; the probe is at 49 checks and has not been exercised |

---

## Resume prompt

One prompt, whole state. Paste it into a fresh chat as-is.

```
Read these, in this order, in /Users/itadmin/Desktop/puge:

  handoff/2026-09-03 Ten Closed, and a Backup Nobody Had Deployed.md   (START HERE, phases 31-34)
  handoff/2026-09-03 Remediation Brief for an External Agent.md        (the defect index, section 5 carries outcomes)
  handoff/2026-09-02 The Rewind, and a Backup That Was Short.md        (phases 26-30, traps 47-54)
  docs/Decisions.md                                                    (D1-D35, what is authorised)
  backups/README.md                                                    (the restore procedure)
  supabase/README.md                                                   (twelve applied, TWO WRITTEN AND UNAPPLIED)

This is a React + Vite ERP in apps/web on Supabase Postgres, deployed to Vercel behind a CI
gate, v0.6.0, main at 6fb8e38. Four accounts, all administrators, one shared ledger, REAL
money, and the owner uses it daily during Manila working hours. There is no staging
environment: npm run e2e, npm run smoke and npm run security all WRITE to production.

FIRST THING, before anything else: confirm the nightly backup. The fixes that make it
complete were only pushed on 2026-09-03 and the job has never run with them. Check the most
recent commit to backups/MANIFEST.md on origin/main and expect `audit_log rows` to read 1129
or higher, NOT 1000, and backups/accounts.json to hold four emails with no nulls. If it still
says 1000, the deploy did not take and that is the most important thing in the repository.

Then verify rather than trusting this snapshot. In apps/web: npm test (expect 53), npm run
build, npm audit, npx playwright test --workers=1 (expect 29 — 2 setup + 27 specs — in about
1.3 min), npm run security (the probe now has 49 checks and has NOT been run since; expect 0
failed and no deferred clause), npm run smoke. Then the SQL in the earlier handoff's "How to
verify state in a fresh session". If the txns fingerprint differs from
05a080127ca18b46dc693edbd22b5168, the owner has been working — say so rather than assuming
damage.

Hold these while you work:
- A FIX IN THE WORKING TREE IS NOT A FIX IN THE SYSTEM. Nothing here compares origin/main
  with HEAD. Run `git log origin/main..HEAD` before believing any "shipped" claim. That gap
  hid a broken backup for a day with every suite green.
- An external agent's report is a snapshot, not a state. Two findings went stale within hours
  this session. Re-verify before acting on one, especially before "fixing" what is fixed.
- receipts growing is the OWNER WORKING, not residue. Check for an E2E- tag before calling
  anything test data. Never sweep a row that lacks one.
- Assert the refusal, not the absence of an error, and read the state back. A blocked policy
  and a missing row both give row_count = 0.
- {"success": true} proves the SQL ran, not that it achieved anything. Verify against
  information_schema (D23/D25). TRUNCATE ignores RLS.
- Do NOT revoke EXECUTE on is_viewer(): every write fails 42501 while reads keep working, so
  the app looks almost fine (D34). Moving it to a non-exposed schema is the fix, and the two
  migrations that do it are written, applied NOWHERE, and order-dependent — apply migration 1,
  deploy the db.js change, THEN migration 2. supabase/README.md explains why.
- PostgREST caps a select at 1,000 rows silently, and storage.list() carries the same ceiling
  with NO count available — so its paging cannot assert a total, only "a full page means keep
  going". That fix has never seen a live bucket.
- Restoring audit_log at volume needs psql \copy, not an agent tool. 250 of 1,129 rows are
  loaded on tracker-rehearsal; the mechanism, fidelity and sequence are all proven.
  backups/verify-restore.sql holds the assertions and has never been run through psql.
- Skipping setval on audit_log_id_seq was PROVEN this session to give
  "23505 duplicate key value violates unique constraint audit_log_pkey" on an audited write.
- supabase.auth.signOut() defaults to scope 'global' and src/App.jsx:58 calls it bare, so
  signing out on one device kills that person's session everywhere. One word to fix,
  user-visible, and it is the OWNER'S call — do not change it unasked.
- A Playwright storageState file is a credential. A forced refresh rotates it and a global
  sign-out revokes it, which is why the specs that touch sessions are ORDERED. Do not reorder
  app.spec.js casually.
- Self-serve sign-up is CLOSED on production and on tracker-rehearsal (verified 422). Read
  policies are still using(true), so being signed in grants the whole ledger. An account with
  no public.profiles row is a VIEWER.
- zone-offices (lasycakyudaawrydetnm) is a LIVE CRM belonging to someone else. Paused. Do not
  touch. tracker-rehearsal (bucmcnsjkuprpojhequy) is the scratch project and now holds a
  restored copy of the real ledger.
- A new table needs five things it does not inherit: revoke-then-grant, a for-select policy
  PLUS write policies predicated on not is_viewer(), an entry in TABLES in
  apps/web/scripts/backup.mjs, its own security-probe checks, and its own log_change() trigger.
- Do not reimplement recurrence in SQL (D31). Do not remove the three unused indexes. Do not
  raise the Playwright timeouts. Do not add a credential fallback for SCHEDULE_*. Do not
  modify company_tracker/. Never delete a failing security check to make a suite green (D26).
- Password and Vercel token rotation are DEFERRED by the owner. Do not raise them.
- cleanupOrphanFiles() deletes any stored file no receipt row points at.

Next work, highest value first:
1. Confirm tonight's manifest (above). Nothing else matters if the backup is still short.
2. Exchange rates — docs/Exchange Rates Proposal.md. NOT STARTED. PHP 39,964,763.80 across the
   transfer sheet is priced by five constants with no date and no source, against a ledger
   whose entire remainder is PHP 226,000. Defaults already chosen: frankfurter.app (no API
   key), a person MAY override the fetched rate, and NO backfill of the nine existing wires.
3. Prove the two is_viewer migrations on tracker-rehearsal, then apply to production in the
   documented order.
4. Re-run npm run security — it has 49 checks now and has not been exercised once.

Report what you verified and what drifted, confirm the state back to me in a few lines, and
wait for direction before starting.
```

---

## Guideline Basis

- **PG-04** requires a continuation record naming scope, checks, limitations and unresolved evidence.
- **DOC-02** keeps observed facts, decisions, incidents and open questions separately labelled.
- **MD-02** requires descriptive, resolvable links.
- **SEC-03** is why no credential appears here, and why the trace and bypass exposures are described by mechanism rather than value.

implements: [[Awesome Guidelines Integration]]

Related: [[2026-09-03 Remediation Brief for an External Agent]] · [[2026-09-02 The Rewind, and a Backup That Was Short]] · [[Decisions]] · [[Open Problems and Proposals]] · [[Exchange Rates Proposal]] · [Backups](../backups/README.md) · [Supabase Schema](../supabase/README.md) · [[AI Agent Context]]
