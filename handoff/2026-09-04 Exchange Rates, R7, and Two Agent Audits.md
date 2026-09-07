---
title: Exchange Rates, R7, and Two Agent Audits
tags: [handoff, continuation, complete-package, erp, tracker, supabase, fx, r7, backups, testing, security, codex, audit]
created: 2026-09-04
status: superseded 2026-09-04 by [[2026-09-04 Three Answers, and a Finding That Corrected Itself]]
kind: complete continuation package — superseded as the entry point; still the record of phases 37-45
supersedes: "[[2026-09-03 Ten Closed, and a Backup Nobody Had Deployed]] as the entry point; that note remains the record of phases 31-36 and its traps 55-63 all still apply"
extends: "[[2026-09-04 Open Items Brief for Codex, Second Pass]] — the external-agent brief; this package is the internal record of the same ground"
decisions-made: "[[Decisions]] D42 to D48, recorded 2026-09-03 and 2026-09-04"
answered-by-owner:
  - "C1 — sign-out stays global, and is now explicit at both browser call sites (D47)"
  - "C4 — no external notification channel, decided rather than deferred (D48)"
blocked-on-owner:
  - "C5 — rotating the rates-account password, raised again 2026-09-04 and deferred again (D44)"
  - "C6 — scheduled runs land 2.5-5 hours late, which eats the FX margin before ECB publication"
  - "C7 — three released wires carry no rate, so D45's intent is unenforced"
related:
  - "[[Decisions]] — D1 to D48, the authority on what is authorised"
  - "[[Remaining Work and Owner Decisions]] — the open-items record, grouped by what blocks each item"
  - "[[Repository Evidence]] — the factual baseline"
  - "[[Exchange Rates Proposal]] — R3's spec, now built"
  - "[[2026-09-04 Open Items Brief for Codex, Second Pass]] — the same open items, written for an external agent"
  - "[Supabase Schema](../supabase/README.md) — fifteen migrations, all applied"
  - "[Backups](../backups/README.md) — the restore procedure"
up: "[[AI Agent Context]]"
---

# Exchange Rates, R7, and Two Agent Audits

> **Superseded as the entry point on 2026-09-04 by [[2026-09-04 Three Answers, and a Finding That Corrected Itself]].** Resume from that note, not
> this one. Everything here is still accurate as a dated record — this is where phases 37 to 45
> live, along with traps 64-74 and the audits of both external-agent passes — but the current
> state, the open items and the one resume prompt a fresh session needs are in the newer file.
> [[Handoff Index]] maps the whole folder.

**A complete continuation package for phases 37 to 45**, spanning 2026-09-03 and 2026-09-04.

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

Read live 2026-09-04, and re-read at ~06:50-07:00 UTC after C1 and C4 were answered.
**Re-verify before acting** — §10 has the commands.

| | |
|---|---|
| `main` | `010294c` at last check, equal to `origin/main`. The C1/C4 change of 2026-09-04 is **uncommitted** — see §12 |
| Production Supabase | `jusifpditdigqdjiwdaj` (`baby`), `ap-southeast-1`, free plan — **15 migrations** |
| Rehearsal | `bucmcnsjkuprpojhequy` (`tracker-rehearsal`) — 15 migrations, `audit_log` 252 rows |
| **Off limits** | `lasycakyudaawrydetnm` (`zone-offices`) — a live CRM belonging to someone else. Paused. Do not touch |
| Vercel | project `tracker`, hobby, `https://tracker-six-flax.vercel.app` → `200` |
| GitHub | `Leuename/tracker`, private. **13 secrets**. **5 workflows** |
| `txns` | **49 rows · ₱2,226,438.00 · fingerprint `21a63ffeb6368cd06257f17a9aa01a49`** at 11:00 UTC. It read 23 / ₱269,317.00 / `6fc52ee3…` four hours earlier; the owner entered 26 payables between 09:29 and 10:52 UTC. **This is the normal case** |
| `receipts` | 3 — two the owner's, one the retained backup proof (§6.2) |
| `transfers` | 9 — **all released**, 6 priced at ECB 2026-09-02, **3 released unpriced**. Not the 6/3 split earlier drafts of this note claimed; see §12 C7 |
| `fx_rates` | 4 rows, `as_of 2026-09-03`, source `ECB via frankfurter.dev` |
| `audit_log` | 1,760 → 1,818 (two suites) → 1,854 (the owner's 26 payables) → **1,912** (two more suites) |
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
| 45 | C1/C4/C5 answered | "evaluate the plan, then implement it" | Plan audited (8 defects, then 2 more), C1 global and explicit, C4 no channel, C5 deferred again. Two findings, one of which corrected itself mid-session. §12 |

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

### C1 — `signOut()` revokes every device · **answered 2026-09-04**

`apps/web/src/App.jsx:58` called it bare; the library defaults to `scope: 'global'`. Signing out on
one device kills that account **everywhere**. `{ scope: 'local' }` is one word. Both are defensible
— "sign out everywhere" is a real security posture for a shared ledger. It also underwrites the e2e
ordering in D41. Live, user-visible, nobody had chosen it.

**The owner chose to keep it global**, and it is now written out rather than inherited (D47). The
same bare call was also at `apps/web/src/store.jsx:62`, the session-expiry handler, which the
original framing of this item missed — same user, same browser, so both now carry the same explicit
scope at `App.jsx:63` and `store.jsx:67`. Runtime behaviour is unchanged; what changed is that a
reader can tell it was decided. The Node-script callers stay bare on purpose.

### C4 — the scheduler has no channel · **answered 2026-09-04**

`apps/web/scripts/schedule.mjs:96` — the only delivery path is `GITHUB_STEP_SUMMARY`, which nobody
opens unless already suspicious. Needed a provider, recipients and an owner (D31). Telegram was
recommended and specified in full: one dedicated bot, one private chat, an explicit
`TELEGRAM_NOTIFICATIONS` on/off variable as the kill switch, and an aggregate-only payload carrying
no company, beneficiary, description, due date or per-row amount.

**The owner chose no external channel** (D48). This is decided, not deferred — the job summary and
GitHub's failure notification are the accepted paths, `schedule.mjs` is untouched, no `TELEGRAM_*`
secret or variable exists, and the secret count stays at thirteen. The unbuilt specification is kept
in `docs/superpowers/plans/2026-09-04-c1-c4-c5-resolution.md`, Tasks 4 and 5.

### C5 — the rates password, deferred and now unblocked

`admin@admin.com` / `admin`, live since 2026-09-03. Supabase itself flags it:
`"weak_password":{"message":"Password should be at least 6 characters."}`.

- **Writes:** `fx_rates` only. `is_viewer()` refuses it everywhere else. Verified both directions.
- **Reads: the entire ledger.** Every read policy is `using(true)`, so being signed in grants
  everything — every payable, all nine wires with beneficiary names, the whole audit trail.

Most-guessed credential pair on the internet, on a public URL. **Cost to fix is small:** generate a
password, update Supabase, update the `FX_PASSWORD` GitHub secret and `.env.local` **together**.
Same account, same uid, same policies — the migrations naming its uid are unaffected.

**The owner deferred it "while testing" and asked to be reminded. That work is finished. This was the
reminder** (D44, N9) — **delivered 2026-09-04, and the owner deferred again.** D44 stays active and
this stays open. Do not rotate it unasked. The full procedure, its rollback rules and its evidence
steps are ready in `docs/superpowers/plans/2026-09-04-c1-c4-c5-resolution.md`, Task 2; note that
Task 2 uses an explicitly **dispatched** FX run as evidence, because the cron runs hours behind its
slot and is a poor rotation signal (§12).

---

## 8. Still open, and why

| ID | Item | Blocked on |
|---|---|---|
| **A1** | Full-volume `audit_log` restore | A supervised `postgres` connection string. **None exists** — not in the repo, not among the 13 secrets. The file is now **1.7 MB**; chunking needs ~50 payloads and failed at 5 of 23 before |
| **A2** | Run `backups/verify-restore.sql` | Same string. Its assertions are proven individually; **the file has never executed** |
| **B1** | F5's 1,000-object ceiling | Somewhere disposable. **Do not create 1,001 objects in production.** Logic is unit-tested at the 1000/1001 boundary |
| **B2** | Blank-target schema replay | An approved empty project. Rehearsal is no longer blank |
| **C5** | The rates-account password | The owner. Raised again 2026-09-04 and **deferred again** (D44) |
| **C6** | Scheduled runs land 2.5–5 h late | The owner. New 2026-09-04 — see §12 |
| **C7** | Three released wires carry no rate | The owner. New 2026-09-04 — see §12 |
| — | R11 human viewer | A `viewer` exists but is a robot credential. The read-only **UI** path is unproven with a person |
| — | Leaked-password protection | Pro-only |

**Closed this session:** R3 exchange rates · R7 `is_viewer` relocation · the backfill · C2 (proof row
renamed, kept) · C3 (`apps/api/` deleted) · **C1 (sign-out stays global, now explicit, D47)** ·
**C4 (no external channel, D48 — which also closes R12/D31)** · the backup manifest ·
`npm run security` into the pre-push routine.

---

## 9. Decisions made

| # | Decision |
|---|---|
| **D42** | Rates are written by a **named account**, not by `not is_viewer()`. The one deliberate exception to this schema's write pattern — a rate a user can edit is not a rate |
| **D43** | The FX job runs `0 2` and `0 8` UTC, **both before ECB publication**, so the rate is one working day old **by design**. The second run is a retry, not a second number |
| **D44** | `FX_PASSWORD` rotation deferred, with a standing reminder |
| **D45** | Released wires carry their historical rate; pending wires stay null until release |
| **D46** | The storage-restore proof is preserved; `apps/api/` removed |
| **D47** | Browser sign-out is **explicitly global**, at both `App.jsx:63` and `store.jsx:67`. Runtime behaviour unchanged; the point is that it now reads as chosen. Node scripts stay bare |
| **D48** | The scheduler gets **no external notification channel**. Decided, not deferred — this closes D31. The Telegram design is recorded unbuilt, so reopening it is a build rather than a redesign |

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
-- expect released 9, priced 6. The three unpriced ones are C7 in §12 — the owner
-- released them on 2026-09-04 and nothing stamped a rate. Do NOT stamp one unasked.

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
72. **A documented invariant that no code enforces is a comment, not an invariant.** D45 and
    `logic.js:261` both say a released wire keeps the rate it went out at. Nothing stamps one when
    the status changes, so three wires released on 2026-09-04 are re-priced off the feed every time
    it moves. Before trusting a rule written in a note, find the line that makes it true.
73. **`assert.throws(fn, regexp)` tests `String(err)`, not `err.message`.** The string is
    `Error: MESSAGE`, so an anchored `/^MESSAGE/` never matches and the test fails against a
    *correct* implementation. Use `/^Error: MESSAGE/`, or the validation-function form and assert on
    `error.message` yourself. Caught in review of a plan, before it cost a red suite.
74. **"Has not run yet" and "never runs" are the same artifact.** A scheduler that is merely late
    leaves exactly the evidence of one that is broken: no run, and a table whose contents came from
    somewhere else. On 2026-09-04 the FX cron was declared dead at 06:57 UTC and fired at 06:59:08Z,
    4 h 59 min behind its slot. **GitHub queues this repository's scheduled runs 2.5 to 5 hours
    late** — check the delay distribution before concluding absence, and re-check immediately before
    writing the conclusion down.

---

## 12. Phase 45 — the three answers, and two things verification found

### 12.1 What was asked and what happened

An implementation plan for C1, C4 and C5 was written, audited against the codebase, revised by an
external agent, then audited again. Eight defects in the first version, two more in the revision:
its new test suite used `assert.throws(fn, new RegExp('^' + CONFIG))`, which cannot match because
Node compares against `Error: …` (trap 73), and no task committed anything before Task 5 tried to
push a branch. Both fixed in `docs/superpowers/plans/2026-09-04-c1-c4-c5-resolution.md`.

The owner then answered all three. **C1: keep it global, explicitly. C4: no external channel.
C5: defer again.** That skipped the plan's Tasks 2, 4 and 5 entirely — most of the plan is
deliberately unexecuted, and Tasks 4 and 5 are kept as a written specification rather than deleted.

What actually changed in the code is four lines and two comment blocks:
`apps/web/src/App.jsx:63` and `apps/web/src/store.jsx:67` now pass `{ scope: 'global' }`, and the
two comment blocks in `apps/web/e2e/app.spec.js` that described the scope as a library default now
describe it as a decision. Runtime behaviour is unchanged by construction, which is why the evidence
is an unchanged suite rather than a new assertion.

### 12.2 C6 — the FX cron fires hours late, and this finding corrected itself

**What was written first.** At 06:57 UTC, `.github/workflows/fx.yml` — which declares `0 2` and
`0 8` UTC — had exactly one run in its history: a `workflow_dispatch` at `2026-09-03T14:52:01Z`. No
`schedule` event had ever appeared. `fx_rates` held four plausible rows with a plausible date, so
every downstream check passed, and the table had data only because a human pressed a button once.
That is trap 71 in a second costume, and it went into this note as "the cron has never fired."

**Two minutes later it fired.** A `schedule` run began at `2026-09-04T06:59:08Z` and succeeded —
**4 h 59 min after its 02:00 UTC slot.** The finding was true when written and false twenty minutes
afterwards. It is kept here in that shape on purpose, because it is the sharpest available example
of §1's own lesson pointed back at me: *a job that has not run yet and a job that never runs are
indistinguishable from the artifact.* Only waiting separates them, and I did not wait.

**The run wrote nothing, and that is correct.** `fx_rates.fetched_at` is still
`2026-09-03 14:43:59Z` and no audit trigger fired: the ECB publishes once a day and its 2026-09-03
fix was already stored, so `fx.mjs` had nothing to write. **This is the first time D43's idempotence
has been demonstrated on the scheduled path** rather than a manual rerun.

**What is actually left is narrower, and still worth knowing.** GitHub is queuing this repository's
scheduled runs 2.5 to 5 hours behind their slots — `backup.yml`'s 06:00 UTC run had not appeared by
11:03 UTC either, leaving `backups/MANIFEST.md` around fourteen hours old. Both FX slots exist to
land *before* the ECB's ~14:00 UTC publication, so the stored rate is deliberately one working day
old (D43). 08:00 UTC plus five hours is 13:00 UTC: still inside the window, but the margin is about
an hour, not the six the cron appears to buy. A longer delay would flip the stored rate from T+1 to
T+0 silently.

**Do not "fix" this by moving the hours** — 02:00 and 08:00 UTC are deliberate (D43), and moving
them earlier makes the delay worse. And do not read a late or absent cron run as a failed credential
rotation: that is why the plan's Task 2 uses an explicitly dispatched run as C5's evidence.

### 12.3 C7 — three released wires carry no rate

`select status, count(*), count(rate) from public.transfers` returns `released 9, priced 6`. Earlier
drafts of this note said `released 6 / pending 3`; that was already stale when written. The owner
moved the last three wires from `pending` to `released` at 2026-09-04 02:26:59–02:27:03 UTC —
`audit_log` 1697–1699, actor the owner — and all three crossed with `rate` and `rate_as_of` null:
`GZZ` EUR 100,000, `ZPH` USD 79,180, `MCR` USD 78,675.

Ordinary owner work, not damage. But D45 and the comment at `apps/web/src/logic.js:261` both say a
released wire keeps the rate it went out at, and **nothing in the app stamps one** — the rate is a
manual field on the transfer form, and changing the status does not touch it. Those three now fall
to rung 2 of `rateFor()` and are re-valued off `fx_latest` whenever the feed moves. They are not on
the stale constants today, because the feed rung is live, so this is drift rather than a wrong
number on screen.

Two separable questions, both the owner's: whether to stamp the three existing wires with the ECB
rate for their release date — the same reasoning that made the 2026-09-02 backfill legitimate, since
the release date is a recorded fact in `audit_log` — and whether release should stamp a rate
automatically from now on. Neither was acted on.

### 12.4 The change set, uncommitted

Nothing was committed or pushed. `git status --short` shows the four source lines, the two comment
blocks, the plan, and the documentation updates. The handoff also carries a whitespace-only table
reformat from an editor, made outside this work and left alone.

---

## 13. Resume prompt (superseded)

> Kept as the record of what this package asked a fresh session to do. **The prompt to use is
> in [[2026-09-04 Three Answers, and a Finding That Corrected Itself]] §15.**

```
Read these, in this order, in /Users/itadmin/Desktop/puge:

  handoff/2026-09-04 Exchange Rates, R7, and Two Agent Audits.md   (START HERE — complete package)
  docs/Remaining Work and Owner Decisions.md                       (A1-A2, B1-B2, C1-C7)
  docs/Decisions.md                                                (D1-D48)
  docs/superpowers/plans/2026-09-04-c1-c4-c5-resolution.md         (mostly UNEXECUTED, on purpose)
  handoff/2026-09-03 Ten Closed, and a Backup Nobody Had Deployed.md  (traps 1-63, all still apply)
  supabase/README.md                                               (fifteen migrations, the rename note)
  backups/README.md                                                (the restore procedure)

React + Vite ERP in apps/web on Supabase Postgres, deployed to Vercel behind a CI gate. FIVE
accounts: four administrators and one viewer account that writes exchange rates and nothing else.
ONE shared ledger holding REAL money, used daily by the owner during Manila working hours. There
is NO staging environment: npm run e2e, npm run smoke and npm run security all WRITE to production.

THERE IS UNCOMMITTED WORK IN THE TREE unless someone has since committed it. The C1 change of
2026-09-04 — four source lines and two e2e comment blocks — plus the plan and the documentation
updates. Check `git status --short` FIRST and decide with the owner whether to commit; a push to
main deploys production.

VERIFY, do not trust this snapshot. Run `git fetch origin && git log origin/main..HEAD` and FETCH
FIRST; a stale read caused a false alarm on 2026-09-04. Then in apps/web: npm test (77), npm run
build, npm audit (0), npm run security (56), npx playwright test --workers=1 (29). Then the SQL in
section 10.

THE TXNS FINGERPRINT IS A MOVING BASELINE, NOT AN INVARIANT. It was
21a63ffeb6368cd06257f17a9aa01a49 (49 rows, PHP 2,226,438.00) at 11:00 UTC on 2026-09-04, having
been 6fc52ee3f41d2ffd0e9292d8dc4f015d (23 rows, PHP 269,317.00) four hours earlier — the owner
entered 26 payables in between. A value you do not recognise is the NORMAL case: this is a live
ledger in daily use. Read it at the start of your session as YOUR baseline, assert it unchanged
across YOUR OWN writes, and never sweep, restore or rewind to make it match a number written in a
document.

What the owner decided on 2026-09-04, so you do not reopen it:
- C1 — sign-out stays GLOBAL and is now explicit at apps/web/src/App.jsx:63 and
  apps/web/src/store.jsx:67 (D47). Runtime behaviour did not change. Do not "simplify" either call
  back to a bare signOut(), and do not give the two same-browser callers different scopes.
- C4 — the scheduler gets NO external notification channel (D48). This closes D31. Telegram was
  fully specified and declined; Tasks 4 and 5 of the plan are kept unbuilt as that specification.
  Do not build it unasked.
- C5 — the rates-account password was raised again and DEFERRED AGAIN (D44). Still open. Keep
  reminding. Do not rotate it unasked.

Open, and none of it yours to close alone:
- C5 above. The procedure is ready in the plan's Task 2, rollback rules included.
- C6 — GitHub queues this repo's scheduled runs 2.5-5 HOURS behind their slots. The FX cron's
  first ever scheduled run fired at 2026-09-04T06:59:08Z, 4h59m after its 02:00 UTC slot, and
  correctly wrote nothing because the ECB fix was already stored. Both FX slots exist to land
  before ECB publication at ~14:00 UTC, so the real margin is about an hour, not six; a longer
  delay flips the stored rate from T+1 to T+0 silently. Do NOT move the cron hours: 02:00 and
  08:00 UTC are deliberate (D43) and moving them earlier makes the delay worse. Never read a late
  or absent cron run as a failed credential rotation.
- C7 — three released wires carry no rate. The owner released them at 2026-09-04 02:27 UTC
  (audit_log 1697-1699) and nothing in the app stamps a rate on release, so D45's intent is not
  enforced and those wires re-price off the feed. Two owner questions: backfill the three, and
  whether release should stamp automatically. Do not write to them unasked.
- A1/A2 — the full audit_log restore and verify-restore.sql, IF the owner supplies a supervised
  postgres connection string. Without one, say "blocked" rather than chunking it.
- B1/B2 — low value. Do not manufacture 1,001 production objects or create a paid project.

Hold these while you work:
- Verification means checking the thing itself, not the report about the thing. Section 1 is the
  whole argument; C6 is it happening again.
- A resolved fetch is not a healthy response. Anywhere failure arrives in a RETURN VALUE rather
  than as an exception, the absence of an error proves nothing. Check the value.
- A FIX IN THE WORKING TREE IS NOT A FIX IN THE SYSTEM. git fetch, then git log origin/main..HEAD,
  before believing any "shipped" claim.
- {"success": true} proves the SQL ran, not that it achieved anything. Assert the refusal, not the
  absence of an error: a blocked policy and a missing row both give row_count = 0.
- A documented invariant that no code enforces is a comment, not an invariant (trap 72).
- "Has not run yet" and "never runs" leave the same artifact. This repo's scheduled runs land
  2.5-5 hours late; re-check immediately before writing down that something never ran (trap 74).
- assert.throws(fn, regexp) tests String(err), so /^MESSAGE/ never matches "Error: MESSAGE"
  (trap 73).
- A row without an E2E- tag may be the owner's. Never sweep one. receipts row 1788471059637
  ("DO NOT DELETE — backup proof") is the storage-restore evidence — deleting it orphans the
  object and destroys the proof.
- fx_rates' write policies name ONE account's uid instead of gating on not private.is_viewer()
  (D42). Deliberate one-off. Do not copy it onto another table, do not "fix" it to match.
- Do NOT revoke EXECUTE on any is_viewer (N1/D34); remove the three unused indexes (N2); raise the
  Playwright timeouts (N3); reimplement recurrence in SQL (N4); add a credential fallback for
  SCHEDULE_*/FX_* (N5); modify company_tracker/ (N7); delete from audit_log (N8); or delete a
  failing security check to make a suite green (D26).
- Do NOT edit the three applied FX/R7 migration files. Their contents are byte-identical to what
  was applied and that identity IS the evidence; their stale filename cross-references in
  comments are deliberate.
- .upsert() breaks against column-scoped grants (trap 64). Split into insert + targeted update.
- zone-offices (lasycakyudaawrydetnm) is a LIVE CRM belonging to someone else. Paused. Do not
  touch. tracker-rehearsal (bucmcnsjkuprpojhequy) is the scratch project.
- AGENTS.md and CLAUDE.md are equal synchronized policies. Change both in one commit and keep
  them byte-identical.

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
