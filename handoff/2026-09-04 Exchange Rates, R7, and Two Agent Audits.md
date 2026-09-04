---
title: Exchange Rates, R7, and Two Agent Audits
tags: [handoff, continuation, complete-package, erp, tracker, supabase, fx, r7, backups, testing, security, codex, audit]
created: 2026-09-04
status: current
kind: complete continuation package — a fresh chat resumes from this file alone
supersedes: "[[2026-09-03 Ten Closed, and a Backup Nobody Had Deployed]] as the entry point; that note remains the record of phases 31-36 and its traps 55-63 all still apply"
extends: "[[2026-09-04 Open Items Brief for Codex, Second Pass]] — the external-agent brief; this package is the internal record of the same ground"
decisions-made: "[[Decisions]] D42 to D46, all recorded 2026-09-03 and 2026-09-04"
blocked-on-owner:
  - "C1 — signOut() global or local scope"
  - "C4 — a notification channel, or an explicit decision to have none"
  - "C5 — rotating the rates-account password, deferred once and now unblocked"
related:
  - "[[Decisions]] — D1 to D46, the authority on what is authorised"
  - "[[Remaining Work and Owner Decisions]] — the open-items record, grouped by what blocks each item"
  - "[[Repository Evidence]] — the factual baseline"
  - "[[Exchange Rates Proposal]] — R3's spec, now built"
  - "[[2026-09-04 Open Items Brief for Codex, Second Pass]] — the same open items, written for an external agent"
  - "[Supabase Schema](../supabase/README.md) — fifteen migrations, all applied"
  - "[Backups](../backups/README.md) — the restore procedure"
up: "[[AI Agent Context]]"
---

# Exchange Rates, R7, and Two Agent Audits

**This is the current entry point and a complete continuation package.** Phases 37 to 44, spanning
2026-09-03 and 2026-09-04. A fresh chat resumes from this file alone.

Two things shipped that move real money on screen, two external-agent passes were audited against
the codebase rather than against their own reports, and one class of bug appeared three times in
three different costumes. That last one is the thing to read first.

---

## 1. The one thing to read if you read nothing else

**Verification means checking the thing itself, not the report about the thing.**

Every significant defect this session came from someone — an agent, or me — accepting a signal that
looked like proof and was not:

| What looked like proof | What it actually proved | Cost |
|---|---|---|
| `backups/MANIFEST.md` reading `1129` | Nothing about the nightly job. **A human had run it by hand**; the scheduled job had never executed the fixed code | Nearly declared a broken backup fixed |
| `{"success": true}` from a migration | The SQL parsed and ran | Caught by policy — this project already knew |
| A resolved `fetch()` promise | The server answered. **Not that it answered `200`** | A `503` deployment cleared the e2e gate; 29 specs would fail for one reason |
| `Stored files: 1` in a manifest | A round-trip works. **Not that paging works** | F5 was recorded closed while its loop had never iterated once |
| An agent's handoff saying "removed" | A directory left the filesystem. **Git never tracked it**, so the change was invisible | Three live docs kept describing a boundary that was gone |
| A green `git status` | Nothing about `origin/main` | An entire session's work sat uncommitted while production had moved |

**The generalisation, and the sentence worth carrying forward:** anywhere a failure is reported in a
*return value* rather than thrown as an *exception*, the absence of an error proves nothing. Check
the value. `fetch` is the sharpest example, but `storage.list()`, PostgREST's row counts, and a
manifest's own self-report all behave the same way.

Corollary, learned twice: **`git fetch` before reading anything off `origin/main`.** A stale read
produced a false alarm on 2026-09-04 that cost twenty minutes chasing a backup that was fine.

---

## 2. The state in one screen

Read live 2026-09-04, ~14:20 UTC. **Re-verify before acting** — §10 has the commands.

| | |
|---|---|
| `main` | `fb1c15c`, pushed, `origin/main..HEAD` empty, working tree clean |
| Production Supabase | `jusifpditdigqdjiwdaj` (`baby`), `ap-southeast-1`, free plan — **15 migrations** |
| Rehearsal | `bucmcnsjkuprpojhequy` (`tracker-rehearsal`) — 15 migrations, `audit_log` 252 rows |
| **Off limits** | `lasycakyudaawrydetnm` (`zone-offices`) — a live CRM belonging to someone else. Paused. Do not touch |
| Vercel | project `tracker`, hobby, `https://tracker-six-flax.vercel.app` → `200` |
| GitHub | `Leuename/tracker`, private. **13 secrets**. **5 workflows** |
| `txns` | **23 rows · ₱269,317.00 · fingerprint `6fc52ee3f41d2ffd0e9292d8dc4f015d`** |
| `receipts` | 3 — two the owner's, one the retained backup proof (§6.2) |
| `transfers` | 9 — **6 priced** at ECB 2026-09-02, 3 pending and deliberately null |
| `fx_rates` | 4 rows, `as_of 2026-09-03`, source `ECB via frankfurter.dev` |
| `audit_log` | 1,760 |
| Accounts | **5** — four `admin`, one `viewer` (the rates job) |
| `is_viewer()` | **`private` schema only.** `public.is_viewer()` is gone |
| Advisors | **one** `WARN` (leaked-password, Pro-only). Three `INFO` unused-index — **N2: leave them** |
| `npm test` | **77/77** offline |
| `npm run security` | **56/56**, 0 failed, `DEFERRED` empty |
| `npx playwright test --workers=1` | **29/29**, ~1.3 min |
| `npm run build` · `npm audit` | green · 0 vulnerabilities |

### The five accounts

| role | purpose |
|---|---|
| `admin` ×4 | The people. Full read and write |
| `viewer` ×1 | `admin@admin.com`, the exchange-rate job. Writes `fx_rates` and **nothing else**; reads everything (§7 C5) |

---

## 3. What happened, in order

| # | Phase | Trigger | Outcome |
|---|---|---|---|
| 37 | Backup confirmed | "confirm the nightly manifest" | The `1129` manifest was **hand-written**, not from the job. Forced a real run: `1389` rows, roster 4/4 emails |
| 38 | Exchange rates built | "let's plan the exchange rates" → "start it" | `fx_rates`, `fx_latest`, a three-rung fallback, a twice-daily ECB job. `cbbe5f1` |
| 39 | The Codex brief | "report for another AI agent" | `2026-09-03 Exchange Rates Shipped, What Is Still Open.md` |
| 40 | Another session's work | "read the 09-04 handoff" | R7 + backfill were **real in the database and uncommitted in git**. Committed; migrations renamed |
| 41 | Policy drift + advisors | "fix the drift, re-check advisors" | 7 stale facts corrected. **The `is_viewer` advisor had closed itself** |
| 42 | Codex pass 1, audited | "rate what codex did" | 7/10. Three defects found, all fixed |
| 43 | Fingerprint + decisions note | "do the refresh, then a report" | `[[Remaining Work and Owner Decisions]]`; §1.4 on the moving baseline |
| 44 | Codex pass 2, audited | "grade its changes" | 8.5/10. One real miss: three live docs left stale |

---

## 4. Phase 38 — exchange rates, in full

### 4.1 Why it mattered

`apps/web/src/logic.js:259` held five constants with no date and no source:

```js
export const TRANSFER_RATES = { PHP: 1, USD: 58, GBP: 74, EUR: 63, AUD: 38 }
```

Measured against the ECB fix of 2026-09-02, **every one was low**:

| | constant | ECB | off by |
|---|---:|---:|---:|
| USD | 58 | 62.5453 | −7.3% |
| GBP | 74 | 84.3305 | −12.2% |
| EUR | 63 | 72.4150 | −13.0% |
| AUD | 38 | 44.7034 | −15.0% |

Recomputed across the nine live wires: the sheet understated by **₱4,322,329.05 — 10.8%.** The
proposal had guessed "5% off, ₱2.0M". It was more than double that.

### 4.2 The finding that reframed the backfill question

[[Exchange Rates Proposal]] called backfill unanswerable — inventing rates for money already moved.
**It wasn't.** `audit_log` holds the status transition, so the release date is a recorded fact: all
six released wires show `released_on 2026-09-02`, and the ECB rate for that date is published and
retrievable. Stamping them cites a reference rate for a known date; it invents nothing.

### 4.3 What was built

| File | What |
|---|---|
| `supabase/migrations/20260903144056_fx_rates.sql` | `fx_rates`, the `fx_latest` view, `transfers.rate`/`rate_as_of` |
| `apps/web/scripts/fx.mjs` | One ECB call, derives PHP-per-unit, **writes only on change** |
| `.github/workflows/fx.yml` | `0 2` and `0 8` UTC |
| `apps/web/src/modals/RateField.jsx` | Shared rate input; the hint states its own provenance |
| `apps/web/src/logic.js` | `rateFor()` — wire → feed → constant |
| `apps/web/src/screens/Telegraphic.jsx` | `at ECB rates of <date>`, or "indicative" when any wire is unpriced |

**Three design points that are load-bearing:**

1. **`fx_latest` is a view, not the table.** Four currencies × ~260 working days ≈ 1,040 rows/year —
   the table crosses PostgREST's silent 1,000-row cap inside a year. The view stays four rows forever.
2. **`transferTotals` reports the oldest date it priced at, or `null`** the moment one wire falls to
   a constant. A total cannot claim provenance it did not entirely earn.
3. **A stored rate of `0` is honoured, never replaced.** Zero is wrong *visibly*; falling through to
   a constant would value the wire at 58× what somebody deliberately typed, silently.

### 4.4 Two bugs caught before shipping

**The API omits the base currency.** `base=EUR&symbols=…,EUR` returns **no EUR key** — one euro is
one euro. `perEur.EUR` was `undefined`, so EUR derived as `NaN` and the guard would have dropped it
from every run. **EUR is ₱18.9M of the sheet.** Fixed, plus two assertions: a positive-finite check
per currency, and an equality check that derived EUR matches the ECB's own published PHP figure.

**`.upsert()` fails against column-scoped grants — F7.** It compiles to `ON CONFLICT DO UPDATE SET`
naming *every* payload column, primary key included, and Postgres checks privilege on each even when
the value is unchanged. The migration granted `update (rate, source)` only — deliberately. Result:

```
permission denied for table fx_rates
hint: GRANT UPDATE ON public.fx_rates TO authenticated;
```

**Grant-shaped, not RLS-shaped** — an RLS refusal says `new row violates row-level security policy`.
Fixed by splitting into insert + targeted update rather than widening the grant.

---

## 5. Phases 40–41 — the gap between the database and the repository

A prior session applied R7 and the backfill to **production**, then left every documenting change
uncommitted. `origin/main` said thirteen migrations; production ran fifteen. Anyone cloning got a
map that no longer matched the territory.

**Also found:** the two R7 migration files were named `20260903071500`/`20260903071600` in advance,
but MCP assigned `20260903204135`/`20260903204751`. The invented timestamps sorted them **before**
`20260903144056_fx_rates` when the database applied them **after** — a replay in filename order
would not reproduce the proven sequence. Renamed; contents untouched, md5s still match
(`eb46987e…`, `c606df30…`).

**The advisor closed itself.** R7's whole purpose was removing the `SECURITY DEFINER` `is_viewer()`
from the exposed schema. Supabase's linter now reports one WARN instead of two — the linter agreeing
independently, not another restatement of our own checks.

---

## 6. The two external-agent passes, audited

### 6.1 Pass 1 — 7/10

**Right:** blocked on all three blocked tasks, invented nothing, did not retry the chunked restore,
did not push, left the ledger fingerprint unmoved. Every checkable claim held.

**Three defects:**

- **The preflight never checked status.** Demonstrated: 503 and 404 both *passed*. Fixed, and split
  into four classifications — `SLOW`, `UNREACHABLE`, `BAD_STATUS`, `BAD_URL`.
- **F5 overclaimed.** `listAll()` returns on the first short page, so one object never iterates.
- **Evidence was uncommittable.** `.superpowers/sdd/.gitignore` was `*`.

**The lesson:** it built a `fetchImpl` injection seam, then tested only the happy path by hand.
Finding the bug took four lines *using the seam it built*.

### 6.2 Pass 2 — 8.5/10

**The standout:** its plan said "rename the receipt." It checked first, found the rename already
applied, and **wrote nothing**. Confirmed — exactly two audit rows for that row. Blindly re-applying
a plan step against a production ledger is how a proof row gets double-written.

**The miss:** it removed `apps/api/` and updated `Repository Evidence`, but left `AGENTS.md`,
`CLAUDE.md` and `AI Agent Context` still describing it. Its own constraint said "keep them
synchronized" — they stayed synchronized *with each other*, and both stayed wrong.

**Worth knowing:** git never tracked `apps/api/` (git does not track empty directories), so the
deletion produced **no diff**. The documentation was the entire deliverable.

---

## 7. What needs the owner

Full detail with costs and recommendations in [[Remaining Work and Owner Decisions]].

### C1 — `signOut()` revokes every device

`apps/web/src/App.jsx:58` calls it bare; the library defaults to `scope: 'global'`. Signing out on
one device kills that account **everywhere**. `{ scope: 'local' }` is one word. Both are defensible
— "sign out everywhere" is a real security posture for a shared ledger. It also currently underwrites
the e2e ordering in D41. **Live, user-visible, nobody chose it. Owner's call.**

### C4 — the scheduler has no channel

`apps/web/scripts/schedule.mjs:96` — the only delivery path is `GITHUB_STEP_SUMMARY`, which nobody
opens unless already suspicious. Needs a provider, recipients and an owner (D31). **Recommend
Telegram** — visible, and no email deliverability work. "No channel" is a legitimate answer if
recorded as decided.

### C5 — the rates password, deferred and now unblocked

`admin@admin.com` / `admin`, live since 2026-09-03. Supabase itself flags it:
`"weak_password":{"message":"Password should be at least 6 characters."}`.

- **Writes:** `fx_rates` only. `is_viewer()` refuses it everywhere else. Verified both directions.
- **Reads: the entire ledger.** Every read policy is `using(true)`, so being signed in grants
  everything — every payable, all nine wires with beneficiary names, the whole audit trail.

Most-guessed credential pair on the internet, on a public URL. **Cost to fix is small:** generate a
password, update Supabase, update the `FX_PASSWORD` GitHub secret and `.env.local` **together**.
Same account, same uid, same policies — the migrations naming its uid are unaffected.

**The owner deferred it "while testing" and asked to be reminded. That work is finished. This is the
reminder** (D44, N9).

---

## 8. Still open, and why

| ID | Item | Blocked on |
|---|---|---|
| **A1** | Full-volume `audit_log` restore | A supervised `postgres` connection string. **None exists** — not in the repo, not among the 13 secrets. The file is now **1.7 MB**; chunking needs ~50 payloads and failed at 5 of 23 before |
| **A2** | Run `backups/verify-restore.sql` | Same string. Its assertions are proven individually; **the file has never executed** |
| **B1** | F5's 1,000-object ceiling | Somewhere disposable. **Do not create 1,001 objects in production.** Logic is unit-tested at the 1000/1001 boundary |
| **B2** | Blank-target schema replay | An approved empty project. Rehearsal is no longer blank |
| **C1/C4/C5** | See §7 | The owner |
| — | R11 human viewer | A `viewer` exists but is a robot credential. The read-only **UI** path is unproven with a person |
| — | Leaked-password protection | Pro-only |

**Closed this session:** R3 exchange rates · R7 `is_viewer` relocation · the backfill · C2 (proof row
renamed, kept) · C3 (`apps/api/` deleted) · the backup manifest · `npm run security` into the
pre-push routine.

---

## 9. Decisions made

| # | Decision |
|---|---|
| **D42** | Rates are written by a **named account**, not by `not is_viewer()`. The one deliberate exception to this schema's write pattern — a rate a user can edit is not a rate |
| **D43** | The FX job runs `0 2` and `0 8` UTC, **both before ECB publication**, so the rate is one working day old **by design**. The second run is a retry, not a second number |
| **D44** | `FX_PASSWORD` rotation deferred, with a standing reminder |
| **D45** | Released wires carry their historical rate; pending wires stay null until release |
| **D46** | The storage-restore proof is preserved; `apps/api/` removed |

---

## 10. How to verify state in a fresh session

```bash
cd /Users/itadmin/Desktop/puge
git fetch origin && git log origin/main..HEAD    # expect empty. FETCH FIRST
git status --short                               # expect clean

cd apps/web
npm test                          # 77
npm run build
npm audit                         # 0
npm run security                  # 56, 0 failed — WRITES to production
npx playwright test --workers=1   # 29, ~1.3 min — WRITES to production
```

```sql
-- The fingerprint is a MOVING BASELINE, not an invariant. See trap 67.
select md5(string_agg(t::text, chr(10) order by t.id)) fingerprint, count(*), sum(amount)::text
  from public.txns t;   -- 6fc52ee3f41d2ffd0e9292d8dc4f015d, 23, 269317.00 at the time of writing

-- R7 landed: private present, public absent, nothing pointing at the old function
select (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='private' and p.proname='is_viewer') private_fn,
       (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='public'  and p.proname='is_viewer') public_fn,
       (select count(*) from pg_policies
          where (coalesce(qual,'')||coalesce(with_check,'')) like '%public.is_viewer%') stale_policies;
-- expect 1, 0, 0

-- 17 write policies private-backed: 14 in public + 3 in storage
select schemaname, count(*) from pg_policies
 where (coalesce(qual,'')||coalesce(with_check,'')) like '%private.is_viewer%' group by 1;

select status, count(*), count(rate) priced from public.transfers group by 1;
-- expect released 6/6, pending 3/0

select id, co, name, file_path from public.receipts order by id;
-- expect 3. Delete NONE. 1788471059637 is the backup proof
```

---

## 11. Traps, continued from 63

64. **`.upsert()` breaks against column-scoped grants.** It names every payload column in
    `ON CONFLICT DO UPDATE SET`, primary key included, and Postgres checks privilege on each even
    when unchanged. Split into insert + targeted update; do **not** widen the grant.
65. **A Supabase account can be created below the password minimum.** The dashboard's 6-character
    rule is not enforced at the API layer — sign-in succeeds and merely returns a `weak_password`
    advisory. Do not assume a weak credential "would have been rejected."
66. **`api.frankfurter.dev` omits the base currency from `rates`.** `base=EUR` with EUR among the
    symbols returns no EUR key. Naive division gives `NaN`, silently.
67. **The `txns` fingerprint is a moving baseline, not an invariant.** This is a live ledger used
    during Manila working hours. Read it at session start as *your* baseline, assert it across
    *your own* writes, and **never sweep or restore to make it match a number in a document.**
68. **A resolved `fetch` is not a healthy response.** It rejects only on transport failure; 4xx and
    5xx resolve normally. Generalises to anything reporting failure in a return value.
69. **Git does not track empty directories**, so deleting one produces no diff and a fresh clone
    never had it. The documentation is the deliverable.
70. **MCP assigns migration versions, not you.** Naming a file in advance made the folder sort two
    migrations before one the database applied after them.
71. **A hand-run job leaves the same artifact as a scheduled one.** A manifest reading a healthy
    number proves nothing about whether the job that writes it nightly has ever worked.

---

## 12. Resume prompt

```
Read these, in this order, in /Users/itadmin/Desktop/puge:

  handoff/2026-09-04 Exchange Rates, R7, and Two Agent Audits.md   (START HERE — complete package)
  handoff/2026-09-04 Open Items Brief for Codex, Second Pass.md    (the same open items, for an external agent)
  docs/Remaining Work and Owner Decisions.md                       (C1/C4/C5 with costs and recommendations)
  docs/Decisions.md                                                (D1-D46)
  handoff/2026-09-03 Ten Closed, and a Backup Nobody Had Deployed.md  (traps 1-63, all still apply)
  supabase/README.md                                               (fifteen migrations, the rename note)
  backups/README.md                                                (the restore procedure)

React + Vite ERP in apps/web on Supabase Postgres, deployed to Vercel behind a CI gate. main is
at fb1c15c, pushed, clean. FIVE accounts: four administrators and one viewer account that writes
exchange rates and nothing else. ONE shared ledger holding REAL money, used daily by the owner
during Manila working hours. There is NO staging environment: npm run e2e, npm run smoke and
npm run security all WRITE to production.

VERIFY FIRST, do not trust this snapshot. Run `git fetch origin && git log origin/main..HEAD`
(expect empty — and FETCH FIRST; a stale read caused a false alarm on 2026-09-04). Then in
apps/web: npm test (77), npm run build, npm audit (0), npm run security (56), npx playwright
test --workers=1 (29). Then the SQL in section 10.

THE TXNS FINGERPRINT IS A MOVING BASELINE, NOT AN INVARIANT. It was
6fc52ee3f41d2ffd0e9292d8dc4f015d (23 rows, PHP 269,317.00) when this was written. A value you do
not recognise is the NORMAL case: this is a live ledger. Read it at the start of your session as
YOUR baseline, assert it unchanged across YOUR OWN writes, and never sweep, restore or rewind to
make it match a number written in a document.

Shipped recently: exchange rates (fx_rates table, fx_latest view, an ECB job at 02:00 and 08:00
UTC, a three-rung fallback of stored rate then feed then constants), the R7 relocation of
is_viewer() into a non-exposed private schema, and a backfill giving the six released wires their
ECB 2026-09-02 rate. Two external-agent passes were audited against the codebase and their
defects fixed. Section 1 explains the single failure mode behind nearly every bug found:
verification that checks a report instead of the thing itself.

Hold these while you work:
- A resolved fetch is not a healthy response. Anywhere failure arrives in a RETURN VALUE rather
  than as an exception, the absence of an error proves nothing. Check the value.
- A FIX IN THE WORKING TREE IS NOT A FIX IN THE SYSTEM. Hit four times. git fetch, then
  git log origin/main..HEAD, before believing any "shipped" claim.
- {"success": true} proves the SQL ran, not that it achieved anything. Assert the refusal, not
  the absence of an error: a blocked policy and a missing row both give row_count = 0.
- A row without an E2E- tag may be the owner's. Never sweep one. receipts row 1788471059637
  ("DO NOT DELETE — backup proof") is the storage-restore evidence — deleting it orphans the
  object and destroys the proof.
- fx_rates' write policies name ONE account's uid instead of gating on not private.is_viewer()
  (D42). Deliberate one-off. Do not copy it onto another table, do not "fix" it to match.
- The FX cron lands before ECB publication both times, so the rate is one working day old BY
  DESIGN (D43). Not a bug. Do not move the hours to "fix" it.
- Do NOT rotate FX_PASSWORD (D44/N9) without being asked; revoke EXECUTE on any is_viewer
  (N1/D34); change signOut() at apps/web/src/App.jsx:58; remove the three unused indexes (N2);
  raise the Playwright timeouts (N3); reimplement recurrence in SQL (N4); add a credential
  fallback for SCHEDULE_*/FX_* (N5); modify company_tracker/ (N7); delete from audit_log (N8);
  or delete a failing security check to make a suite green (D26).
- Do NOT edit the three applied FX/R7 migration files. Their contents are byte-identical to what
  was applied and that identity IS the evidence; their stale filename cross-references in
  comments are deliberate.
- .upsert() breaks against column-scoped grants (trap 64). Split into insert + targeted update.
- zone-offices (lasycakyudaawrydetnm) is a LIVE CRM belonging to someone else. Paused. Do not
  touch. tracker-rehearsal (bucmcnsjkuprpojhequy) is the scratch project.
- AGENTS.md and CLAUDE.md are equal synchronized policies. Change both in one commit and keep
  them byte-identical.

Next work, highest value first:
1. C5 — rotate the rates-account password. The owner deferred it while testing; that work is
   finished, so the condition is met. It writes only fx_rates but READS THE WHOLE LEDGER,
   because every read policy is using(true). Rotate Supabase, the FX_PASSWORD GitHub secret and
   .env.local together. Ask before acting.
2. C1 and C4 — signOut() scope, and a notification channel or an explicit decision to have none.
   Both are owner choices; present the trade-offs, do not default them.
3. A1/A2 — the full audit_log restore and verify-restore.sql, IF the owner supplies a supervised
   postgres connection string. Without one, say "blocked" rather than chunking it.
4. B1/B2 — low value. Do not manufacture 1,001 production objects or create a paid project.

Report what you verified and what drifted, confirm the state back in a few lines, and wait for
direction before starting.
```

## Guideline Basis

- **PG-04** names the reproducible check behind every claim; every figure was read live on 2026-09-04.
- **DOC-02** keeps observed facts, decisions, audits and open questions separately labelled.
- **MD-02** requires resolvable links; every wikilink here targets an existing note.
- **DOC-03** reuses the established R/F/N/Q/D identifiers rather than renumbering them.
- **SEC-03** is why no credential value appears here, and why C5 describes blast radius rather than the secret.

implements: [[Awesome Guidelines Integration]]

Related: [[Remaining Work and Owner Decisions]] · [[2026-09-04 Open Items Brief for Codex, Second Pass]] · [[2026-09-04 Remaining Work Implementation Handoff]] · [[2026-09-04 Open Items Execution Progress]] · [[2026-09-04 Exchange Rates and R7 Production Rollout]] · [[2026-09-03 Exchange Rates Shipped, What Is Still Open]] · [[2026-09-03 Ten Closed, and a Backup Nobody Had Deployed]] · [[Decisions]] · [[Repository Evidence]] · [[Exchange Rates Proposal]] · [[Handoff]] · [[AI Agent Context]] · [Supabase Schema](../supabase/README.md) · [Backups](../backups/README.md)
