---
title: Open Items Brief for Codex, Second Pass
tags: [handoff, brief, codex, open-items, supabase, backups, testing, storage]
created: 2026-09-04
status: current
kind: technical brief for an external agent — what remains after the first execution pass, audited
supersedes: "handoff/2026-09-04 Open Items Brief for Codex.md as the current brief; that file remains the record of what was open before the first pass"
---

# Open Items Brief for Codex, Second Pass

**Every path here is an exact relative path from the repository root. No wikilinks are used** — the
intended reader cannot resolve them. If a tool you need is unavailable, say so immediately and read
files directly; do not return empty.

Repository root: `/Users/itadmin/Desktop/puge`. Everything runnable is under `apps/web/`.

Your previous pass was audited against the codebase rather than against its own report. **The
discipline was right and the verification was thin.** §1 says exactly where, because repeating that
pattern is the main risk in this one.

---

## 0. What happened since your last pass

You executed `docs/superpowers/plans/2026-09-04-open-items-completion.md` and reported in
`handoff/2026-09-04 Open Items Execution Progress.md`. That report is now committed, **with one
status corrected in place** (§1.2).

Everything you left untracked is committed: the plan, the execution handoff, the backup evidence
Task 2 produced, and your nine task reports.

| | |
|---|---|
| `main` | `4e16d2c` **or later**, working tree clean, pushed, CI gate green, production `200` |
| Production Supabase | `jusifpditdigqdjiwdaj` — 15 migrations, `private.is_viewer` present, `public.is_viewer` absent |
| Rehearsal | `bucmcnsjkuprpojhequy` — 15 migrations, `audit_log` 252 rows |
| Off limits | `lasycakyudaawrydetnm` (`zone-offices`) — a live CRM belonging to someone else. Paused. Do not touch |
| `txns` | **23 rows, ₱269,317.00, fingerprint `6fc52ee3f41d2ffd0e9292d8dc4f015d`** as of 2026-09-04 ~03:00 UTC. It read `05a080127ca18b46dc693edbd22b5168` / 21 / ₱226,000.00 for the whole of your pass and moved *after* it: the owner added two payables and a receipt at 10:21–10:28 Manila. **This number is expected to keep moving** — see §1.4 |
| `receipts` | 3 — two of the owner's, plus your retained storage-proof row (§2.5) |
| `transfers` | 9 — six priced at ECB 2026-09-02, three pending and null |
| `audit_log` | 1,759 live · manifest `1582` (a snapshot lags the ledger; that is normal, not drift) |
| Accounts | 5 — four `admin`, one `viewer` |
| Manifest | taken `2026-09-03T21:31:08Z`, roster `5`, **`Stored files: 1`** |
| `npm test` | **77** (was 66; +11 preflight failure-path tests) |
| `npm run security` | 56/56 · `npx playwright test --workers=1` 29/29 |
| Advisors | one `WARN` (leaked-password, Pro-only). Three `INFO` unused-index — **N2: leave them** |

---

## 1. Audit of your last pass — read this before starting

### 1.1 What you got right, and should keep doing

- **You blocked on Tasks 1, 3 and 5 and invented nothing.** You did not retry the chunked-MCP
  restore that failed at chunk 5. That is the single most valuable thing you did.
- **You did not push.** Correct — a push deploys to production.
- **The ledger survived intact.** Fingerprint unmoved, zero `E2E-` residue, the owner's receipt
  untouched. Verified independently.
- **Every checkable claim was true.** The SHA matched byte-for-byte, the commit was focused and
  clean, the manifest said what you said it said.
- **You self-reported the weak parts** — ad-hoc assertions, dirty tree, Task 6 undone, and the stale
  baseline manifest. That honesty is what made this audit cheap.

### 1.2 The three defects, all now fixed

**A. The preflight did not check response status.** `fetch` resolves for 4xx and 5xx, so:

```
503 deployment: PASSED preflight   <-- 3 calls, status never inspected
404 deployment: PASSED preflight   <-- a typo'd E2E_BASE_URL sailed through
```

A reachable-but-broken deployment cleared the gate and the suite then failed 29 times for one
reason — the exact outcome the preflight exists to prevent. **This was the only code you shipped and
its core job had a hole.** It is fixed in `apps/web/e2e/network-preflight.js`, which now asserts the
response and classifies distinctly: `NETWORK_PREFLIGHT_SLOW` (timeout),
`NETWORK_PREFLIGHT_UNREACHABLE` (refused), `NETWORK_PREFLIGHT_BAD_STATUS` (reachable, not serving),
`NETWORK_PREFLIGHT_BAD_URL` (malformed `baseURL`). Labelling a config fault "slow" sent the reader to
the network when the answer was an environment variable.

**The lesson, which generalises past this file:** you wrote a `fetchImpl` seam that made the failure
paths trivially testable, then tested only the happy path by hand. Finding this bug took four lines
using the seam you built. When you leave an injection point, use it on the failure cases — those are
the ones a live run never reaches.

**B. Task 2 was recorded as closing "F5/R10". It closes R10 only.** `listAll()` returns as soon as a
page comes back shorter than `PAGE` (1,000), so with **one** stored object the paging loop never
iterates. The byte round-trip is genuinely proven; the 1,000-object ceiling F5 names is exactly as
unexercised as it was before. Corrected in your handoff and in `docs/Repository Evidence.md`.

**C. Your evidence could never be committed.** `.superpowers/sdd/.gitignore` was `*`, so the nine
reports your handoff points at by path resolved only inside the working tree that produced them.
That is trap 55's shape reached by configuration rather than by forgetting to push. The `.md`
reports are tracked now; the `.diff` files git can regenerate are not. They were scanned for
credentials first — none present.

### 1.3 Now pinned so it cannot regress

`apps/web/e2e/network-preflight.test.js` — 11 tests, in `npm test` (77 total). They pin the
**failure** paths: 503, 500, 404, one-bad-response-of-three, refusal vs timeout classification, and
malformed/undefined `baseURL`. The 503/500/404 cases **fail against your original implementation**,
which is the point of them.

### 1.4 — The ledger is live, and its fingerprint is a moving baseline

`txns` read `05a080127ca18b46dc693edbd22b5168` (21 rows, ₱226,000.00) through the whole of your
pass, and every handoff written before 2026-09-04 quotes that number. **It has since moved to
`6fc52ee3f41d2ffd0e9292d8dc4f015d` (23 rows, ₱269,317.00)** because the owner worked: two payables
under `ZON` / Repairs & Maintenance (`TECSON` ₱29,988.00 and `Chemlux` ₱13,329.00, both due
2026-09-04) and a receipt (`Kuya Randy`, ₱2,000.00), entered 10:21–10:28 Manila. None carries an
`E2E-` tag, and none is yours or mine to touch.

**So a fingerprint you do not recognise is the normal case, not a finding.** This is a ledger in
daily use during Manila working hours; any session long enough to be useful may span a change to it.
The older handoffs are not wrong — they are dated records of what was true when written, and this
project keeps them rather than rewriting them.

How to use the fingerprint correctly:

1. Read it at the **start** of your session and record it. That is your baseline, not whatever a
   note says.
2. Assert it is unchanged across **your own** writes — that is what it is for: proving a suite swept
   what it created and nothing else.
3. If it changes and you did not write, identify the rows before saying anything. Untagged rows in
   working hours are the owner. Say "the owner has been working" rather than "the ledger is
   damaged", and **never** sweep, restore or rewind to make it match a number in a document.

The same applies to `audit_log` and `receipts` counts throughout this brief: they are timestamps of
a live system, not invariants.

---

## 2. What is still open

IDs are stable across all five briefs. Cite them; never renumber.

### 2.1 — R2/R9 · full-volume `audit_log` restore  ·  **blocked, correctly**

**Where:** `backups/README.md`, `backups/audit_log.json`, `backups/verify-restore.sql`

252 of ~1,759 rows exist on rehearsal. Mechanism, fidelity and the sequence fix are proven; **bulk
transport is not.** Needs `psql \copy` and a supervised `postgres` connection string.

**Your last-pass ruling stands: no connection string means blocked.** Do not use application
credentials. Do not chunk it through an agent tool — that failed at chunk 5 of 23 and is the known
failure mode. If the string appears, `setval` on `audit_log_id_seq` afterwards is mandatory: skipping
it was *proven* to produce `23505 duplicate key value violates unique constraint "audit_log_pkey"`,
and it surfaces days later, not on the next write.

### 2.2 — `backups/verify-restore.sql` has still never executed

Its assertions were transliterated into individual calls and each passed. **The file itself has
never run through `psql`.** Same blocker as 2.1; folds into that work.

### 2.3 — F5 · the storage paging ceiling  ·  **still open after your Task 2**

**Where:** `apps/web/scripts/backup.mjs` → `listAll(prefix)`

R10 is closed — one object round-trips byte-for-byte, `Stored files: 1`. F5 is not, for the reason
in §1.2B. Proving it live needs a bucket holding **more than 1,000 objects**, which nothing has yet
required. The boundary logic remains covered by a unit test against a fake at 1000/1001.

**Do not manufacture 1,001 objects in the owner's production bucket to close this.** If it is worth
proving, it is worth proving somewhere disposable. It is currently the lowest-value item here.

### 2.4 — Full blank-target schema replay  ·  **blocked, correctly**

`tracker-rehearsal` has all 15 migrations, so the new files are proven to replay *onto the
12-migration baseline*. The stronger claim — all 15 rebuilding into a genuinely empty project — needs
a disposable target nobody has approved. **Do not create a paid project. Do not touch `zone-offices`.
Do not relabel the rehearsal evidence as a blank-target replay** (you were right about this).

### 2.5 — A decision your Task 2 created

`receipts` row `1788471059637` — company `F5`, ₱0.00, `released`, named "Task 2 storage proof", with
a linked stored object. It is deliberately **not** `E2E-` tagged, so the sweep cannot orphan it and
`cleanupOrphanFiles()` cannot delete its object. That reasoning was correct and you disclosed it.

The consequence needs an owner decision: it now sits in the owner's receipts screen permanently, and
trap 61 — "never sweep a row without an `E2E-` tag" — will protect it from every future cleanup.
**Do not remove it unasked** (deleting it orphans the object and destroys the R10 evidence). Raise
it; let the owner choose.

### 2.6 — Owner-only. Do not act unasked

| Item | Where | Note |
|---|---|---|
| `signOut()` scope | `apps/web/src/App.jsx:58` | Defaults to `scope: 'global'` — signing out on one device revokes that account everywhere. One word to change, live user-visible behaviour, and it underwrites the e2e ordering in D41 |
| `FX_PASSWORD` rotation | Supabase auth + GitHub secret | **N9 / D44. Deferred by the owner, who asked to be reminded, not overridden. Do not rotate it.** |
| R12 notifications | `.github/workflows/schedule.yml` | Job-summary only. Needs provider, recipients, owner (D31) |
| R14 `apps/api/` | `apps/api/` | Still an empty directory. Delete or justify |
| R11 human viewer | Supabase auth | A `viewer` exists but it is a robot credential nobody signs into. The read-only **UI** path is still unproven with a person |
| Leaked-password protection | Supabase dashboard | Pro-only. The one remaining advisor |

### 2.7 — Task 6, unstarted

Final consolidation. Do it only once the blockers above are resolved or explicitly carried forward,
and **do not substitute stale output for an unrun command** — mark it unrun instead.

---

## 3. Non-actions

`N1`–`N9` bind. The ones easiest to lose:

- **N1** — never revoke `EXECUTE` on any `is_viewer`. Postgres checks it against the *querying* role:
  every write fails `42501` while reads keep working, so the app looks *almost* fine (D34). R7 already
  solved this by relocating the function.
- **N2** — do not remove the three unused indexes.
- **N3** — **do not raise the Playwright timeouts.** The preflight exists so you do not have to.
- **N4** — do not reimplement recurrence in SQL (D31).
- **N5** — no credential fallback for `SCHEDULE_*` or `FX_*`.
- **N7** — do not modify `company_tracker/`.
- **N8** — do not delete from `audit_log`.
- **N9** — do not rotate the rates-account password.

Also: never delete a failing security check to make a suite green (D26); do not copy `fx_rates`'s
uid-naming policy shape onto an ordinary table (D42); and **do not edit the three applied FX/R7
migration files** — their contents are byte-identical to what was applied
(`27ddac2f2a41394cb4fa65076fc9f6e1`, `eb46987e91c5de212e224e0f2ade1052`,
`c606df3049aa21748e7b9aa1e9e6cbcb`) and that identity is the evidence. They cross-reference their
pre-rename filenames in comments. **That staleness is deliberate.**

---

## 4. Traps that apply to this specific work

Full set is 1–63 across the earlier handoffs. These bite here:

- **Trap 55 — a fix in the working tree is not a fix in the system.** Hit four times now, most
  recently as a `.gitignore` that made evidence uncommittable by construction. **`git fetch` before
  reading anything off `origin/main`** — a stale read caused a false alarm on 2026-09-04.
- **Trap 60 — a report is a snapshot, not a state.** Including this one. Including your own.
- **Trap 61 — a row without an `E2E-` tag may be the owner's.** Now also §2.5's proof row.
- **Assert the refusal, not the absence of an error.** A blocked policy and a missing row both give
  `row_count = 0`. `{"success": true}` proves the SQL ran, not that it achieved anything — read
  `information_schema` back. `TRUNCATE` ignores RLS.
- **F7 — `.upsert()` breaks against column-scoped grants.** It names every payload column in
  `ON CONFLICT DO UPDATE SET`, primary key included, and Postgres checks privilege on each. The error
  is `permission denied for table …` (grant-shaped), not `new row violates row-level security policy`
  (RLS-shaped). Split into insert + targeted update; do not widen the grant.
- **New, from §1.2A — a resolved `fetch` is not a healthy response.** Check status. This generalises:
  anywhere you await something that reports failure in its *return value* rather than by throwing,
  the absence of an exception proves nothing.

---

## 5. Ground rules

- **No staging environment.** `npm run e2e`, `npm run smoke`, `npm run security` all **write to
  production**. The owner uses this system daily during Manila working hours.
- **A push to `main` starts the CI gate; a green gate deploys.** Run `npm test`, `npm run build`,
  `npx playwright test --workers=1` and `npm run security` *before* pushing. **Do not push** — that
  is the owner's decision. Two commits are already waiting.
- `AGENTS.md` and `CLAUDE.md` are equal synchronised policies. **Change both in one commit**, and
  keep them byte-identical.
- MCP assigns migration versions, not you. Read `supabase_migrations.schema_migrations` back and name
  the local file to match — getting this wrong once already made the folder sort migrations into an
  order the database never applied.
- Never put a credential in a note, a commit message, or a task report. Project refs and uuids are
  safe; passwords and keys are not.

---

## 6. Verify before planning

```bash
cd /Users/itadmin/Desktop/puge
git fetch origin && git log origin/main..HEAD   # expect EMPTY. FETCH FIRST
git status --short                              # expect clean

cd apps/web
npm test                          # expect 77
npm run build
npm audit                         # expect 0
npm run security                  # expect 56, 0 failed — WRITES to production
npx playwright test --workers=1   # expect 29 in ~1.3 min — WRITES to production
```

```sql
select md5(string_agg(t::text, chr(10) order by t.id)) fingerprint, count(*), sum(amount)::text
  from public.txns t;   -- 6fc52ee3f41d2ffd0e9292d8dc4f015d, 23, 269317.00 at the time of writing.
                        -- A DIFFERENT value is the expected case, not a failure. See §1.4.

select (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='private' and p.proname='is_viewer') private_fn,
       (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='public'  and p.proname='is_viewer') public_fn,
       (select count(*) from pg_policies
          where (coalesce(qual,'')||coalesce(with_check,'')) like '%public.is_viewer%') stale_policies;
-- expect 1, 0, 0

select status, count(*), count(rate) priced from public.transfers group by 1;
-- expect released 6/6 priced, pending 3/0 priced

select id, co, name, file_path from public.receipts order by id;
-- expect 3 at the time of writing: two of the owner's, and the §2.5 proof row.
-- Delete none of them. A count you do not recognise is likely the owner working (§1.4).
```

Then read `backups/MANIFEST.md` (after fetching) and confirm `Stored files` is `1`, the roster is
`5`, and `audit_log rows` is not a suspiciously round `1000`.

---

## 7. What a good plan looks like

1. Names the IDs from §2 it addresses.
2. States per item whether you can execute it **in your environment** — 2.1 and 2.2 need `psql`; 2.4
   needs an approved disposable target; 2.3 needs somewhere disposable holding 1,000+ objects.
   **"Blocked, and here is the concrete prerequisite" is a correct and valued answer.**
3. For anything you build: **test the failure paths, not just the happy one.** §1.2A is why this is
   now first among the criteria rather than a footnote.
4. Cites exact paths and line numbers, and separates what you *verified* from what you *inferred*.
5. Proposes checks that would **fail if the change were wrong**.
6. Touches nothing in §3.
7. Does not push.

---

## Resume prompt

```
Read these, in this order, in /Users/itadmin/Desktop/puge (exact relative paths, no wikilinks):

  handoff/2026-09-04 Open Items Brief for Codex, Second Pass.md    (START HERE — audited state)
  handoff/2026-09-04 Open Items Execution Progress.md              (your last pass, one status corrected)
  handoff/2026-09-04 Open Items Brief for Codex.md                 (what was open before that pass)
  handoff/2026-09-04 Exchange Rates and R7 Production Rollout.md   (R7 + the backfill, as executed)
  handoff/2026-09-03 Ten Closed, and a Backup Nobody Had Deployed.md  (traps 1-63, all still apply)
  docs/Decisions.md                                                (D1-D45)
  supabase/README.md                                               (fifteen migrations, the rename note)
  backups/README.md                                                (the restore procedure)
  .superpowers/sdd/2026-09-04-open-items-completion/               (your task reports — now committed)

React + Vite ERP in apps/web on Supabase Postgres, deployed to Vercel behind a CI gate. main is
at 7f1b10f with TWO COMMITS UNPUSHED. Five accounts: four administrators and one viewer account
that writes exchange rates and nothing else. ONE shared ledger holding REAL money, used daily by
the owner during Manila working hours. There is NO staging environment: npm run e2e, npm run
smoke and npm run security all WRITE to production.

VERIFY FIRST. Run `git fetch origin && git log origin/main..HEAD` (expect EMPTY; FETCH
FIRST — a stale read of origin/main caused a false alarm on 2026-09-04). Then in apps/web:
npm test (expect 77), npm run build, npm audit (0), npm run security (56), npx playwright test
--workers=1 (29). Then the SQL in section 6.

THE TXNS FINGERPRINT IS NOT A CONSTANT. It was 6fc52ee3f41d2ffd0e9292d8dc4f015d (23 rows,
PHP 269,317.00) when this was written, having moved from 05a080127ca18b46dc693edbd22b5168 (21
rows, PHP 226,000.00) a few hours earlier because the owner entered two payables and a receipt
during a working morning. A value you do not recognise is the NORMAL case: this is a live
ledger in daily use. Establish the fingerprint as YOUR baseline at the start of your session,
then assert it is unchanged across your own writes. Never treat a mismatch against a number
written in a handoff as damage, and never "restore" or sweep to make it match.

Your previous pass was audited against the codebase. Section 1 is that audit: you blocked
correctly on every blocked item, did not push, and left the ledger intact — keep doing all of
that. Three defects were found and fixed: the Playwright preflight never checked response
status, so a 503 or 404 deployment cleared the gate (demonstrated, then fixed and pinned with
11 failure-path tests); Task 2 was recorded as closing F5/R10 when it closes R10 only, because
listAll() never iterates with one stored object; and .superpowers/sdd/.gitignore was `*`, so
every report your handoff cited could never be committed. THE LESSON THAT GENERALISES: you
built a fetchImpl injection seam and then tested only the happy path by hand. Finding that bug
took four lines using the seam you built. Test the failure paths — they are the ones a live run
never reaches.

Still open: R2/R9 full-volume audit restore and backups/verify-restore.sql (both need psql and
a supervised postgres connection string — if you do not have one, say "blocked" rather than
chunking it, which already failed at chunk 5 of 23); F5's 1,000-object paging ceiling (do NOT
manufacture 1,001 objects in the owner's production bucket); a blank-target schema replay (no
approved disposable project); Task 6 consolidation; and a set of owner-only decisions.

Hold these:
- A FIX IN THE WORKING TREE IS NOT A FIX IN THE SYSTEM. Hit four times, most recently as a
  .gitignore that made evidence uncommittable by construction.
- A resolved fetch is not a healthy response. Anywhere failure is reported in a RETURN VALUE
  rather than by throwing, the absence of an exception proves nothing. Check the status.
- {"success": true} proves the SQL ran, not that it achieved anything. Assert the refusal, not
  the absence of an error: a blocked policy and a missing row both give row_count = 0.
- receipts row 1788471059637 ("Task 2 storage proof", company F5) is YOUR proof row, deliberately
  untagged so the sweep cannot orphan its object. DO NOT DELETE IT unasked — that destroys the
  R10 evidence. It needs an owner decision, not a cleanup.
- Do NOT revoke EXECUTE on any is_viewer (N1/D34); rotate FX_PASSWORD (N9/D44); change
  supabase.auth.signOut() at apps/web/src/App.jsx:58; remove the three unused indexes; raise the
  Playwright timeouts (N3); reimplement recurrence in SQL (N4); add a credential fallback for
  SCHEDULE_*/FX_* (N5); modify company_tracker/ (N7); delete from audit_log (N8); or delete a
  failing security check to make a suite green (D26).
- Do NOT edit the three applied FX/R7 migration files. Their contents are byte-identical to what
  was applied and that identity IS the evidence; their stale filename cross-references in
  comments are deliberate.
- zone-offices (lasycakyudaawrydetnm) is a LIVE CRM belonging to someone else. Paused. Do not
  touch. tracker-rehearsal (bucmcnsjkuprpojhequy) is the scratch project.
- Do NOT push. Two commits are already waiting on the owner's decision.

Produce a plan naming the IDs from section 2 it addresses, stating per item whether you can
actually execute it here ("blocked, and here is the prerequisite" is a correct answer), citing
exact paths and line numbers, separating verified from inferred, and proposing checks that would
FAIL if the change were wrong — including the failure paths, not just the happy one.

Report what you verified and what drifted, confirm the state back, and wait for direction.
```

## Guideline Basis

- **PG-04** names the reproducible check behind every claim; §1's defects were demonstrated before being reported, and every number in §0 was read live on 2026-09-04.
- **DOC-02** separates the audit of prior work, current verified state, open items, decisions and non-actions.
- **MD-02** uses exact relative paths throughout, because the intended reader cannot resolve wikilinks.
- **DOC-03** reuses the established R/F/N/Q ids rather than renumbering them.
- **SEC-03** is why no credential value appears here, and why the reports were scanned before being committed.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [Decisions](../docs/Decisions.md) · [Supabase Schema](../supabase/README.md) · [Backups](../backups/README.md) · [Repository Evidence](../docs/Repository%20Evidence.md) · [AI Agent Context](../docs/AI%20Agent%20Context.md)
