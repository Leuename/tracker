---
title: Owner Decision Brief, C5 to C7
tags: [handoff, brief, external-agent, open-items, owner-decision, c5, c6, c7, supabase, credentials, cron, fx, transfers]
created: 2026-09-04
status: current
kind: technical brief for an external agent — the open C items, in depth
audience: "a cold-context coding agent. Exact relative paths, no wikilinks, no assumed conversation history."
companion: "handoff/2026-09-04 Three Answers, and a Finding That Corrected Itself.md is the complete continuation package; this file is the deep technical detail behind its C5, C6 and C7 entries"
---

# Owner Decision Brief, C5 to C7

**Every path in this file is an exact relative path from the repository root
(`/Users/itadmin/Desktop/puge`). No wikilinks are used** — the intended reader cannot resolve them.
If a tool you need is unavailable, say so immediately and read files directly; do not return empty.

This is the technical detail for the three open owner-decision items. The narrative sits in
`handoff/2026-09-04 Three Answers, and a Finding That Corrected Itself.md`; this file is what you
need in order to *act* on C5, C6 or C7 once the owner says go.

**Nothing here is authorised yet.** Every item is blocked on an owner decision. Your job is to
understand it well enough to execute in one pass when the answer comes, and to refuse cleanly if
asked to act before it does.

---

## 0. Hard constraints, before anything else

Violating any of these is worse than returning an incomplete answer.

1. **There is no staging environment.** `npm run e2e`, `npm run smoke`, `npm run security` and any
   `npx playwright test` invocation **write to a live production ledger holding real money**, used
   daily by the owner during Manila working hours (UTC+8). Do not run them to "check something".
   Safe offline commands: `npm test`, `npm run build`, `npm audit`.
2. **A push to `main` runs the CI gate and a green gate deploys production.** Do not push. Do not
   tag. Committing locally is a separate question — ask.
3. **Never rotate a credential, write to the ledger, or change a workflow schedule unasked.** All
   three are literally the subject of this document.
4. **Never put a credential, token, chat id or password in a note, a commit message, a task report,
   a screenshot or a command argument.** Project refs and uuids are safe; secrets are not.
5. `AGENTS.md` and `CLAUDE.md` are equal synchronised policies. Change both in one commit, keep them
   byte-identical, verify with `cmp AGENTS.md CLAUDE.md`.
6. **Do not touch Supabase project `lasycakyudaawrydetnm` (`zone-offices`)** — a live CRM belonging
   to someone else, currently paused. The scratch project is `bucmcnsjkuprpojhequy`
   (`tracker-rehearsal`). Production is `jusifpditdigqdjiwdaj`.

---

## 1. State to verify before you plan anything

Read live 2026-09-04 between 11:00 and 11:45 UTC. **Do not trust it — re-read it.**

```bash
cd /Users/itadmin/Desktop/puge
git fetch origin                       # FETCH FIRST. A stale read caused a false alarm on 2026-09-04
git rev-parse --short HEAD origin/main
git status --short
git log HEAD..origin/main --oneline    # commits you do not have
```

**As of 11:42 UTC the local branch is BEHIND origin and the tree is dirty:**

| | |
|---|---|
| local `HEAD` | `010294c` |
| `origin/main` | `f39de07` — *"Back up the workspace [skip ci]"*, pushed by the backup job at 11:09:48Z |
| working tree | **15 modified files, plus 4 untracked** — the 2026-09-04 session's uncommitted work, this brief included. Read the counts with `git status --short && git diff --shortstat`; they moved several times while these notes were written, so treat any number here as stale on sight |

That combination matters: you cannot simply commit and push. Integrate `origin/main` first, and ask
the owner before doing even that. The backup commit only touches `backups/`, so a rebase is
mechanically trivial — but it is still the owner's call.

Database facts, all read live:

```
project        jusifpditdigqdjiwdaj (baby), ap-southeast-1, free plan, 15 migrations
txns           49 rows, PHP 2,226,438.00, md5 21a63ffeb6368cd06257f17a9aa01a49
receipts       3  (1788471059637 is a DO-NOT-DELETE backup proof)
transfers      9  — all 'released', 6 priced, 3 unpriced  <-- C7
recurring      0
fx_rates       4  — as_of 2026-09-03, fetched_at 2026-09-03 14:43:59Z
audit_log      1915, max(id) 1915   (was 1912 forty minutes earlier — it only grows)
profiles       5  — 4 admin, 1 viewer
advisors       1 WARN (leaked-password protection, Pro-only)
```

The backup manifest at `backups/MANIFEST.md` on `origin/main` independently agrees: 49 txns,
PHP 2,226,438.00, 1912 audit rows, 4 fx rows, roster 5, `Stored files: 1`. Two independent readings
matching is worth more than either alone.

**Re-read the whole block yourself.** `audit_log` in particular grows on every write, so the number
above is a timestamp and will already be wrong:

```sql
select (select count(*) from public.txns)                                    as txns,
       (select md5(string_agg(t::text, chr(10) order by t.id)) from public.txns t) as txns_md5,
       (select sum(amount)::text from public.txns)                           as txns_total,
       (select count(*) from public.receipts)                                as receipts,
       (select count(*) from public.transfers)                               as transfers,
       (select count(*) from public.transfers where rate is not null)        as transfers_priced,
       (select count(*) from public.recurring)                               as recurring,
       (select count(*) from public.fx_rates)                                as fx_rates,
       (select max(as_of)::text from public.fx_rates)                        as fx_as_of,
       (select max(fetched_at)::text from public.fx_rates)                   as fx_fetched_at,
       (select count(*) from public.audit_log)                               as audit_rows,
       (select max(id) from public.audit_log)                                as audit_max_id,
       (select count(*) from public.profiles)                                as roster,
       (select count(*) from public.profiles where role='admin')             as admins,
       (select count(*) from supabase_migrations.schema_migrations)          as migrations;
```

`audit_rows` and `audit_max_id` should be equal — nothing may delete from `audit_log` (N8), so a gap
means something is wrong. If `transfers_priced` is still 6 of 9, C7 is still open.

**The `txns` fingerprint is a moving baseline, not an invariant.** It read
`6fc52ee3f41d2ffd0e9292d8dc4f015d` / 23 rows / PHP 269,317.00 at 07:00 UTC and moved because the
owner entered 26 payables between 09:29 and 10:52 UTC. Read it at the start of your session as
*your* baseline, assert it unchanged across *your own* writes, and never sweep, restore or rewind to
make it match a number in a document.

---

## 2. C5 — rotate the rates-account password

**Status: open. Deferred twice. Do not rotate unasked.**

### 2.1 What the account is

| | |
|---|---|
| Email | `admin@admin.com` |
| Password | `admin` (five characters, the most-guessed pair on the internet) |
| uid | `14f0d1af-f37a-4936-b278-e280bcb25129` |
| Created | 2026-09-03T14:36:11Z |
| `profiles.role` | `viewer` |
| Used by | `.github/workflows/fx.yml` → `apps/web/scripts/fx.mjs`, via secrets `FX_EMAIL` / `FX_PASSWORD` |
| Also in | `apps/web/.env.local` (git-ignored) as `FX_PASSWORD` |

Supabase itself flags the credential on sign-in:
`"weak_password":{"message":"Password should be at least 6 characters."}` — accepted anyway, because
the dashboard's minimum is advisory and is **not enforced at the API layer** (trap 65).

### 2.2 What it can write — verified, exactly

Read live from `pg_policies` on `public.fx_rates`:

```
INSERT  "only the rates account may add a rate"
        with check ((SELECT auth.uid()) = '14f0d1af-f37a-4936-b278-e280bcb25129'::uuid)

UPDATE  "only the rates account may correct a rate"
        using      ((SELECT auth.uid()) = '14f0d1af-f37a-4936-b278-e280bcb25129'::uuid)
        with check ((SELECT auth.uid()) = '14f0d1af-f37a-4936-b278-e280bcb25129'::uuid)

SELECT  "any signed-in account may read the rates"  using (true)
```

Read live from `information_schema`, grants to `authenticated` on `public.fx_rates`:

```
SELECT  (table-wide)
INSERT  (as_of, cur, rate, source)
UPDATE  (rate, source)          <-- NOT cur, NOT fetched_at
DELETE  none
```

Two consequences you must carry:

- **This is the one deliberate exception to the schema's write pattern.** Every other table gates
  writes on `not private.is_viewer()`; `fx_rates` names one uid instead, because a rate an
  administrator can edit is not a rate. Recorded as D42 in `docs/Decisions.md`. **Do not copy this
  policy shape onto another table, and do not "fix" it to match the others.**
- **`.upsert()` fails against these column-scoped grants** (trap 64). The table's primary key is
  **composite — `(cur, as_of)`**, declared at `supabase/migrations/20260903144056_fx_rates.sql:26`,
  and the grants are `insert (cur, as_of, rate, source)` / `update (rate, source)` (lines 36-37 of
  the same file). supabase-js compiles `.upsert()` to `ON CONFLICT DO UPDATE SET` naming *every*
  payload column — **both key columns included** — and Postgres checks privilege on each even when
  the value is unchanged. `cur` and `as_of` carry no UPDATE grant, so it fails. The error is
  grant-shaped:

  ```
  42501: permission denied for table fx_rates
  hint: GRANT UPDATE ON public.fx_rates TO authenticated;
  ```

  not RLS-shaped (`new row violates row-level security policy`). Note that Postgres's own hint asks
  for exactly the table-wide grant the migration intentionally withheld — following it would undo
  the control. The column grants exist so a client can change what a rate **is**, never what it is
  **for**. `apps/web/scripts/fx.mjs:176-182` already splits into `insert(toInsert)` then
  `.update({ rate, source }).eq('cur', …).eq('as_of', …)`, and the reasoning is written out at
  `apps/web/scripts/fx.mjs:159-170`. **Do not widen the grant to make an upsert work.**

### 2.3 What it can read — the actual blast radius

`is_viewer()` refuses this account write access on every other table. But **every read policy in
this schema is `using (true)`**, so being signed in at all grants full read. Enumerated, not assumed
— `select tablename, policyname, qual from pg_policies where schemaname='public' and cmd='SELECT'`
returns **eight rows and every one of them is `true`**:

```
app_config  "any signed-in account may read the settings"    using (true)
audit_log   "any signed-in account may read the audit log"   using (true)
fx_rates    "any signed-in account may read the rates"       using (true)
profiles    "any signed-in account may read the roster"      using (true)
receipts    "any signed-in account may read the receipts"    using (true)
recurring   "any signed-in account may read the masterlist"  using (true)
transfers   "any signed-in account may read the transfers"   using (true)
txns        "any signed-in account may read the tracker"     using (true)
```

So this login can read: every payable, all nine wires with beneficiary names and amounts, the
complete audit trail **including every actor's email address**, the settings, and the account
roster. On a publicly reachable URL, with the password `admin`. Re-run that query yourself — if a
future migration ever narrows one of these, this section is the thing that goes stale first.

**This is the whole risk. It is a read problem, not a write problem.** Say it that way when you
raise it — "it can only write `fx_rates`" is true and misleading on its own.

### 2.4 Why the Admin API path is barred

`supabase.auth.admin.updateUserById()` requires a `service_role` key. **This repository deliberately
does not hold one** — a `service_role` key ignores row-level security on every table and can
`TRUNCATE`, which would make it the highest-authority secret in the repo and a far larger loss than
this account. See the comment block at the top of `.github/workflows/fx.yml`.

So the password change is a **Supabase Dashboard action only the owner can take**. An agent cannot
do this step. Plan around that rather than looking for a way around it.

### 2.5 The rotation procedure

Full version with rollback rules: `docs/superpowers/plans/2026-09-04-c1-c4-c5-resolution.md`, Task 2.
Summary, in order:

1. **Owner** generates a 32+ character URL-safe password in a password manager. Not via a shell
   command, not in chat, not in a temp file, not in a repository patch.
2. **Owner** updates the password for the existing Auth user in the Supabase Dashboard. Do **not**
   delete and recreate the user: the uid is named literally in two RLS policies and in
   `supabase/migrations/20260903144056_fx_rates.sql`. Email, uid, metadata and `profiles.role` must
   all stay unchanged.
3. Propagate to GitHub **interactively**, so the value never reaches the command line or shell
   history:
   ```bash
   gh secret set FX_PASSWORD --repo Leuename/tracker
   ```
4. Update `FX_PASSWORD=` in `apps/web/.env.local` with an editor. Not `sed`, not `apply_patch`, not
   a heredoc.
5. Verify the **local** path without writing rates:
   ```bash
   cd apps/web
   npm run fx -- --dry-run          # require exit 0 and the literal line: fx dry run complete
   ```
6. Verify the **GitHub** path separately — a local pass proves nothing about the secret, and a
   queued workflow reads repository secrets at queue time:
   ```bash
   gh workflow run fx.yml --repo Leuename/tracker --ref main -f dry_run=true
   gh run list --repo Leuename/tracker --workflow fx.yml --limit 3
   ```
7. Then a **non-dry dispatched run**, and require it green:
   ```bash
   gh workflow run fx.yml --repo Leuename/tracker --ref main -f dry_run=false
   ```
8. Confirm the obsolete password is refused — one attempt, in a clean private browser.
9. Confirm identity survived:
   ```sql
   select user_id::text, role from public.profiles
    where user_id = '14f0d1af-f37a-4936-b278-e280bcb25129';
   -- expect exactly one row, role = 'viewer'
   ```
10. Confirm `git status --short` does not list `apps/web/.env.local`, and scan every command and
    workflow output for accidental disclosure before reporting.

### 2.6 Two things that will mislead you

- **Do not wait for a scheduled FX run as rotation evidence.** See C6: this repository's crons land
  1h44m to 5h04m behind their slots, so "no run yet" tells you nothing about the credential. Dispatch
  a run instead. This exact confusion is why step 7 exists.
- **An already-issued access JWT stays valid until it expires**, regardless of the password change.
  Treat the rotation as fully settled only after the project's configured access-token lifetime has
  passed. A successful sign-in with the old password immediately after rotation would be a real
  failure; an existing session continuing to work for a while is not.

### 2.7 Rollback

```
Supabase update fails            -> stop. Change neither GitHub nor local state.
GitHub/local propagation fails   -> keep the NEW Supabase password, retry propagation.
New password lost                -> reset the same Auth user to another new strong password.
uid changed                      -> stop the FX workflow immediately; do not edit policies
                                    until identity is reconciled.
Never restore the obsolete weak password.
```

---

## 3. C6 — scheduled runs land hours late

**Status: open, low urgency, owner's call. Do not change any cron.**

### 3.1 How this item was found, and corrected

At 06:57 UTC on 2026-09-04, `.github/workflows/fx.yml` had **no `schedule` run in its entire
history** — one `workflow_dispatch` at 2026-09-03T14:52:01Z and nothing else. `fx_rates` held four
plausible rows only because a human had pressed a button once. That was written up as *"the cron has
never fired."*

**At 06:59:08Z it fired.** The finding was true when written and false two minutes later. Recorded
as trap 74 in the continuation package: *a job that has not run yet and a job that never runs leave
exactly the same artifact.* Re-check immediately before writing a negative conclusion about anything
scheduled.

### 3.2 The measured delay, all four workflows

Declared slots, from `grep -n cron .github/workflows/*.yml`:

```
fx.yml         0 2 * * *   and  0 8 * * *
backup.yml     0 18 * * *  and  0 6 * * *
schedule.yml   0 22 * * *
verify.yml     0 16 * * *
```

Observed `schedule`-event runs (`gh run list --workflow=<f> --json event,createdAt,conclusion`):

| Workflow | Slot | Actual start | Delay |
|---|---|---|---:|
| `schedule.yml` | 22:00 09-02 | 2026-09-02T23:48:42Z | +1h48m |
| `schedule.yml` | 22:00 09-03 | 2026-09-03T23:44:55Z | +1h44m |
| `backup.yml` | 18:00 09-02 | 2026-09-02T20:27:45Z | +2h27m |
| `backup.yml` | 18:00 09-03 | 2026-09-03T20:26:41Z | +2h26m |
| `verify.yml` | 16:00 09-02 | 2026-09-02T19:10:49Z | +3h10m |
| `verify.yml` | 16:00 09-03 | 2026-09-03T19:03:02Z | +3h03m |
| `fx.yml` | **02:00 09-04** | 2026-09-04T06:59:08Z | **+4h59m** |
| `backup.yml` | **06:00 09-04** | 2026-09-04T11:04:28Z | **+5h04m** |

Range 1h44m to 5h04m. **The pattern is not random: the two early-UTC slots (02:00, 06:00) are the
two worst, by roughly two hours over the evening slots.** Every run listed succeeded — this is a
queuing delay, not a failure. Treat the pattern as a hypothesis from eight data points, not a law.

At 11:42 UTC the `0 8` FX slot had not yet produced a run (+3h42m and counting), which is consistent
with the table rather than a new problem.

### 3.3 Why it matters, precisely

`fx.yml`'s two slots exist to land **before** the ECB publishes its daily reference fix at roughly
16:00 CET = 14:00 UTC, so the stored rate is deliberately one working day old. That is decided, with
the arithmetic, as D43 in `docs/Decisions.md`. The second run is a **retry**, not a second number —
the ECB publishes once a day, and `apps/web/scripts/fx.mjs` writes only when a value differs, so a
run with nothing to do writes no row and fires no audit trigger.

The 08:00 UTC slot plus the observed worst-case 5h04m delay is **13:04 UTC**. Still before
publication — but the margin is roughly an hour, not the six the cron appears to buy. **A longer
delay would silently flip the stored rate from T+1 to T+0 with nothing on screen changing**, because
the row would simply carry a different `as_of` and every check would still pass.

### 3.4 What was verified about the 06:59 run

It succeeded and **wrote nothing, correctly.** `fx_rates.fetched_at` is still
`2026-09-03 14:43:59.729133+00` for all four rows, every row still reads `as_of 2026-09-03`, and no
audit trigger fired. The ECB's 2026-09-03 fix was already stored, so there was nothing to write.

**This is the first demonstration of D43's idempotence on the scheduled path** rather than on a
manual rerun. It is a genuinely useful result that the wrong version of this finding would have
buried.

### 3.5 Non-actions for C6

- **Do not move the cron hours.** 02:00 and 08:00 UTC are deliberate (D43), and moving them *earlier*
  makes the delay worse, not better.
- **Do not read a late or absent cron run as a failed credential rotation** (C5, §2.6).
- **Do not add a "keep-alive" workflow** or any scheduling workaround without an explicit request.
  GitHub's queue is not something this repository controls.

### 3.6 If the owner ever wants it closed

The cheap check needs no new infrastructure, because `fx_rates` already stores `as_of`: compare the
`as_of` actually written against the date expected for the run's wall-clock time, and surface a
mismatch. Scope it as a change to `apps/web/scripts/fx.mjs` plus one assertion, and propose it —
do not build it unasked.

Monitoring command:

```bash
gh run list --repo Leuename/tracker --workflow fx.yml --json event,createdAt,conclusion
gh run list --repo Leuename/tracker --workflow backup.yml --json event,createdAt,conclusion
```

---

## 4. C7 — three released wires carry no rate

**Status: open. Two separable owner decisions. Do not write to these rows unasked.**

### 4.1 The rows

```sql
select status, count(*), count(rate) priced from public.transfers group by 1;
-- returns: released 9, priced 6
```

Every note written before 2026-09-04 says `released 6 / pending 3`. That is stale, not wrong-at-the-
time. The three unpriced rows:

| id | co | cur | amount | status | rate | rate_as_of |
|---|---|---|---:|---|---|---|
| `1788313757081` | `GZZ` | EUR | 100,000.00 | released | **null** | **null** |
| `1788318165685` | `ZPH` | USD | 79,180.00 | released | **null** | **null** |
| `1788318201948` | `MCR` | USD | 78,675.00 | released | **null** | **null** |

The six priced ones carry `rate_as_of = 2026-09-02` with EUR `72.415000`, USD `62.545345`,
GBP `84.330965`.

### 4.2 How they got there — from the audit log, not inference

```sql
select id, at, op, actor_email, row_id, before->>'status', after->>'status'
from public.audit_log
where tbl='transfers' and row_id in (1788313757081, 1788318165685, 1788318201948)
order by id;
```

The relevant tail:

```
1697  2026-09-04 02:26:59.319681+00  UPDATE  aepinza@gmail.com  1788313757081  pending -> released
1698  2026-09-04 02:27:01.207035+00  UPDATE  aepinza@gmail.com  1788318165685  pending -> released
1699  2026-09-04 02:27:03.010352+00  UPDATE  aepinza@gmail.com  1788318201948  pending -> released
```

Three seconds apart, by the owner, at 10:27 Manila. **Ordinary owner work. Not damage, not test
residue, not an agent.** None carries an `E2E-` tag. Do not touch them as cleanup.

### 4.3 The defect this exposes

`docs/Decisions.md` D45 states that a released wire carries the rate it went out at. The code says
the same, at `apps/web/src/logic.js:261`:

> *"the rate stored ON the wire — what it was actually sent at. A released wire must keep the value
> it had the day it went out, so once this is set nothing may re-price it."*

**Nothing in the application stamps a rate when the status changes.** Verified by reading the write
paths:

- `apps/web/src/modals/EditTransfer.jsx` — `rate` is a manual field rendered by
  `apps/web/src/modals/RateField.jsx`; the Status `<select>` and the rate input are independent.
- `apps/web/src/screens/Telegraphic.jsx` — the sheet's inline status control does not touch `rate`.
- `apps/web/src/rows.js:85` and `:91` — `rate: nrate(w.rate)` maps whatever the form holds. `nrate`
  turns `''`/`null`/`undefined` into `null`. No status-dependent branch anywhere.

So D45 is an invariant **enforced by nobody**. That is trap 72 in the continuation package: *a
documented invariant that no code enforces is a comment, not an invariant.*

### 4.4 What actually happens to those rows now

`apps/web/src/logic.js:274`:

```js
export const rateFor = (w, rates) => {
  if (w && w.rate != null && w.rate !== '') return { rate: Number(w.rate), src: 'wire', asOf: w.rate_as_of || null }
  const live = (rates || {})[w && w.cur]
  if (live && live.rate != null) return { rate: Number(live.rate), src: 'feed', asOf: live.as_of || null }
  return { rate: TRANSFER_RATES[w && w.cur] || 1, src: 'constant', asOf: null }
}
```

Rung 1 is skipped (`rate` is null), so the three fall to **rung 2, the live feed**, sourced from the
`public.fx_latest` view:

```sql
SELECT DISTINCT ON (cur) cur, rate, as_of, source, fetched_at
  FROM fx_rates ORDER BY cur, as_of DESC;
```

They are **not** on the stale constants (`TRANSFER_RATES` at `apps/web/src/logic.js:254`, which run
7% to 15% low). So **no number on screen is wrong today.** The defect is that those three wires are
**re-valued every time the feed moves**, which is precisely what D45 exists to prevent.

`transferTotals` (`apps/web/src/logic.js:306`) still behaves correctly: `asOf` is the oldest date any
counted wire was priced at, and `null` the moment one falls to a constant, so the strip cannot claim
provenance it did not earn.

### 4.5 Magnitude — computed, not read

| Priced at | EUR 100,000 | USD 79,180 | USD 78,675 | Total |
|---|---:|---:|---:|---:|
| Stored feed, `as_of 2026-09-03` (EUR 72.605000, USD 62.509686) | 7,260,500.00 | 4,949,516.94 | 4,917,949.55 | **17,127,966.48** |
| The 2026-09-02 fix the other six carry (EUR 72.415, USD 62.545345) | 7,241,500.00 | 4,952,340.42 | 4,920,755.02 | **17,114,595.43** |
| | | | **difference** | **13,371.05** (0.078%) |

**This table is arithmetic, not a database reading.** The amounts and both rate sets were read live;
every product and total was computed, then recomputed independently — which caught two cents-level
errors in the first draft of this very table. Per-row figures are rounded to two places and the
totals are summed from the unrounded products, so the columns may not add to the last cent. Verify
them yourself before quoting them anywhere that matters.

The point is **not** today's delta, which is small only because the rates barely moved between
2026-09-02 and 2026-09-03. The point is that the exposure is **unbounded going forward**: these three
re-price on every feed update, indefinitely, while the other six are frozen at the rate they went out
at. A month of currency movement makes this number arbitrary.

### 4.6 The two decisions, and the date subtlety

**Decision 1 — backfill the three existing wires?**

The precedent is D45's own backfill of 2026-09-02: the release date is a *recorded fact* in
`audit_log`, and the ECB rate for a given date is published and retrievable, so stamping one cites a
published number rather than inventing one.

**But there is a wrinkle the 2026-09-02 backfill did not have.** These three were released at
**02:27 UTC on 2026-09-04**. The ECB had not yet published its 2026-09-04 fix at that moment — it
publishes around 14:00 UTC — so at the instant of release the most recent published fix was
**2026-09-03**. Two defensible answers:

- **`as_of = 2026-09-04`** — the fix for the day the wire was released. Matches "the rate on the day
  it went out" literally. Requires fetching a rate that did not exist when the wire was released.
- **`as_of = 2026-09-03`** — the rate that was actually knowable and displayed at the moment of
  release, and the one the app was showing the owner. Consistent with D43's T+1 design.

**Do not choose between these yourself.** Put both to the owner with this reasoning. The 2026-09-02
backfill did not have to decide it, because those wires were released after that day's fix existed.

**Decision 2 — should release stamp a rate automatically from now on?**

A behaviour change to `apps/web/src/modals/EditTransfer.jsx` and the inline status control in
`apps/web/src/screens/Telegraphic.jsx`. Design questions the owner must settle: does it stamp the
feed rate at the moment of release, and is it editable afterwards (which would re-open the D45
question in a different form)? Scope this as a proposal, not an implementation.

### 4.7 If a backfill is authorised

Shape only — **do not run this**. It is written to be reviewed, not pasted.

```sql
-- One statement per row, id-scoped, never a bulk UPDATE without a WHERE on id.
-- Run as an ADMINISTRATOR (the transfers UPDATE policy is `not private.is_viewer()`),
-- NOT as the rates account, which is a viewer and will be refused.
update public.transfers
   set rate = <rate>, rate_as_of = '<YYYY-MM-DD>'
 where id = 1788313757081 and rate is null;   -- guard: refuse to overwrite a set rate
```

Notes that matter:

- The `and rate is null` guard is not decoration. A re-run must be a no-op, because
  `{"success": true}` proves the SQL ran, not that it did the right thing.
- Each statement fires the `transfers_audit` trigger and writes an attributed `audit_log` row, which
  is the record and the undo. Reversal is setting both columns back to `null` on the same ids, or
  generating a plan with `npm run rewind -- --since <ISO>`.
- `rate_as_of` is a `date`; `rate` is `numeric`. Column list confirmed from `information_schema`:
  `id, co, name, cur, amount, status, note, created_at, rate, rate_as_of`.
- **Assert the outcome, do not assume it.** Re-read the three rows and re-run the
  `status/count(rate)` query afterwards; a blocked policy and a missing row both give
  `row_count = 0`.
- Take the `txns`/`transfers` fingerprint before and after so you can prove you changed exactly three
  rows and nothing else.
- **Run it through an authenticated administrator session, not as `postgres`.** This is not a style
  preference. `log_change()` derives `actor` and `actor_email` from the request's JWT, so a direct
  `postgres` session in the SQL editor writes an audit row with a **null actor** — a money change
  with no attribution, in the one table that exists to say who did what. The D45 precedent did it
  correctly: `audit_log` ids 1475-1480, six sequential guarded updates about 140 ms apart, each
  carrying the administrator's uid and email. Match that shape. Verify afterwards:

  ```sql
  select id, at, op, actor is not null as attributed, row_id
  from public.audit_log
  where tbl = 'transfers' and row_id in (1788313757081, 1788318165685, 1788318201948)
    and id > <your baseline max(id)>
  order by id;   -- expect exactly 3 rows, all attributed = true
  ```

---

## 5. C1 to C4 — closed. Do not reopen

A cold reader will find open-sounding language about these in older notes. They are answered.

| Item | Answer | Where |
|---|---|---|
| **C1** sign-out scope | **Global, made explicit.** `apps/web/src/App.jsx:63` and `apps/web/src/store.jsx:67` both pass `{ scope: 'global' }`. Runtime behaviour unchanged. Node-script callers stay bare on purpose; `apps/web/scripts/fx.mjs:203` stays `'local'` | D47 |
| **C2** the PHP 0.00 proof row | **Kept and renamed.** `receipts` row `1788471059637`, "DO NOT DELETE — backup proof". Deliberately not `E2E-` tagged so the sweep cannot orphan its stored object | D46 |
| **C3** `apps/api/` | **Deleted.** Git never tracked it (git does not track empty directories), so the deletion produced no diff — the documentation was the whole change | D46 |
| **C4** notification channel | **No external channel.** A Telegram design was specified in full, costed and declined. This also closes D31 | D48 |

**Two files still instruct a future session to ask the owner to choose C1 and C4.** Both now carry a
superseded banner: `handoff/2026-09-04 Remaining Work Implementation Handoff.md` and
`docs/superpowers/plans/2026-09-04-remaining-work-decisions.md`. Read the banner, not the body.

C4's unbuilt specification is preserved in
`docs/superpowers/plans/2026-09-04-c1-c4-c5-resolution.md`, Tasks 4 and 5, and its code was extracted
and run offline (3 tests, 3 pass) so reopening it would be a build rather than a redesign. **Do not
build it unasked.**

---

## 6. The other open items, briefly

Not C-items, but they will come up. Full detail in `docs/Remaining Work and Owner Decisions.md`.

| ID | Item | Blocked on | Correct answer if asked |
|---|---|---|---|
| **A1** | Full-volume `audit_log` restore | A supervised `postgres` connection string. **None exists** — not in the repo, not among the 13 GitHub secrets | "Blocked, and here is the prerequisite." `backups/audit_log.json` is 1.7 MB; chunking through an agent tool failed at 5 of 23 and **is the known failure mode**, not a slow route to success. The right transport is `psql \copy` |
| **A2** | Run `backups/verify-restore.sql` | Same string | Folds into A1. Its assertions are each proven individually; **the file itself has never executed**, so it has never been shown to parse |
| **B1** | Storage paging past 1,000 objects | Somewhere disposable | Leave it. `listAll()` in `apps/web/scripts/backup.mjs` returns on the first short page and the bucket holds one object, so the loop has never iterated. Logic is unit-tested at the 1000/1001 boundary. **Do not create 1,001 objects in the owner's production bucket** |
| **B2** | Blank-target schema replay | An approved empty Supabase project | Leave it. **Do not create a paid project.** Do not relabel the rehearsal evidence as a blank-target replay |
| — | R11 human viewer | A person | A `viewer` exists but it is a robot credential nobody signs into. The read-only **UI** path is unproven with a human |
| — | Leaked-password protection | Supabase Pro | The one remaining advisor WARN |

If A1's connection string ever appears: `setval` on `audit_log_id_seq` afterwards is **mandatory**.
Skipping it was proven to produce `23505 duplicate key value violates unique constraint
"audit_log_pkey"` — and it surfaces **days later**, not on the next write, hitting every audited
write on all six tables at once. Assert the sequence, not the write.

---

## 7. Non-actions that bind you

`N1`–`N9` from earlier briefs still bind. The ones that bite here:

- **N1** — never revoke `EXECUTE` on any `is_viewer`. Postgres checks it against the *querying* role,
  so every write fails `42501` while reads keep working and the app looks *almost* fine (D34). R7
  already solved this by relocating the function into a non-exposed `private` schema.
- **N2** — do not remove the three unused indexes the advisor reports.
- **N3** — do not raise the Playwright timeouts. The preflight in `apps/web/e2e/network-preflight.js`
  exists so you do not have to.
- **N4** — do not reimplement recurrence in SQL (D31).
- **N5** — no credential fallback for `SCHEDULE_*` or `FX_*`. A fallback hides which privilege each
  credential carries.
- **N7** — do not modify `company_tracker/`. Generated export, read-only.
- **N8** — do not delete from `audit_log`.
- **N9** — do not rotate the rates-account password. **This is C5. It stays until the owner says go.**

Also: never delete a failing security check to make a suite green (D26). Do not copy `fx_rates`'s
uid-naming policy shape onto an ordinary table (D42). And **do not edit the three applied FX/R7
migration files** — `supabase/migrations/20260903144056_fx_rates.sql`,
`20260903204135_private_is_viewer.sql`, `20260903204751_drop_public_is_viewer.sql`. Their contents
are byte-identical to what was applied (`27ddac2f2a41394cb4fa65076fc9f6e1`,
`eb46987e91c5de212e224e0f2ade1052`, `c606df3049aa21748e7b9aa1e9e6cbcb`) and that identity **is** the
evidence. They cross-reference their pre-rename filenames in comments; **that staleness is
deliberate.**

---

## 8. Traps that apply to these three items specifically

Full sets: traps 1-63 in `handoff/2026-09-03 Ten Closed, and a Backup Nobody Had Deployed.md`,
64-71 in `handoff/2026-09-04 Exchange Rates, R7, and Two Agent Audits.md`, 72-76 in
`handoff/2026-09-04 Three Answers, and a Finding That Corrected Itself.md`.

- **74 — "has not run yet" and "never runs" leave the same artifact.** Bites C5 (do not read a late
  cron as a failed rotation) and *is* C6.
- **72 — a documented invariant that no code enforces is a comment.** This is C7.
- **64 — `.upsert()` breaks against column-scoped grants.** Bites any change to `fx_rates` writes.
- **65 — a Supabase account can be created below the password minimum.** Why C5 exists at all; do not
  assume a weak credential "would have been rejected".
- **68 — a resolved `fetch` is not a healthy response.** 4xx and 5xx resolve normally. Generalises to
  anything reporting failure in a return value.
- **75 — a wrapper's exit status is not the command's verdict.** A backgrounded `npm audit` printed
  `[exited with code 0]` alongside `npm error audit endpoint returned an error`.
- **61 — a row without an `E2E-` tag may be the owner's.** Never sweep one. `receipts` row
  `1788471059637` is the storage-restore proof; deleting it orphans the object and destroys the
  evidence.
- **Assert the refusal, not the absence of an error.** A blocked policy and a missing row both give
  `row_count = 0`. `{"success": true}` proves the SQL ran, not that it achieved anything — read
  `information_schema` or the catalogue back.

---

## 9. What a good response to this brief looks like

1. Names the item IDs from §2, §3, §4 it addresses. Never renumber them.
2. States per item whether you can execute it **in your environment**. C5 step 2 needs a Supabase
   Dashboard action; C7 needs an owner decision on the `as_of` date. **"Blocked, and here is the
   concrete prerequisite" is a correct and valued answer.**
3. Cites exact paths and line numbers, and **separates what you verified from what you inferred.**
   The magnitude figures in §4.5 are arithmetic; say so if you repeat them.
4. Proposes checks that would **FAIL if the change were wrong** — including the failure paths, not
   just the happy one. A prior agent built a `fetchImpl` injection seam and then tested only the
   happy path by hand; finding the bug took four lines using the seam it had built.
5. Touches nothing in §7.
6. Does not push, does not tag, does not run a production-writing suite.
7. Re-reads any negative conclusion about a scheduled job immediately before writing it down.

---

## 10. Resume prompt

```
Read these, in this order, in /Users/itadmin/Desktop/puge (exact relative paths, no wikilinks):

  handoff/2026-09-04 Owner Decision Brief, C5 to C7.md              (START HERE — this brief)
  handoff/2026-09-04 Three Answers, and a Finding That Corrected Itself.md  (the full narrative)
  docs/Remaining Work and Owner Decisions.md                        (A1-A2, B1-B2, C1-C7)
  docs/Decisions.md                                                 (D1-D48; D42-D48 matter most here)
  docs/superpowers/plans/2026-09-04-c1-c4-c5-resolution.md          (MOSTLY UNEXECUTED, on purpose)
  handoff/2026-09-03 Ten Closed, and a Backup Nobody Had Deployed.md   (traps 1-63, all still apply)
  supabase/README.md                                                (fifteen migrations, the rename note)
  backups/README.md                                                 (the restore procedure)

React + Vite ERP in apps/web on Supabase Postgres (project jusifpditdigqdjiwdaj), deployed to Vercel
behind a CI gate. FIVE accounts: four administrators and one viewer account that writes exchange
rates and nothing else. ONE shared ledger holding REAL money, used daily by the owner during Manila
working hours. There is NO staging environment: npm run e2e, npm run smoke and npm run security all
WRITE to production. Do not run them. Safe: npm test, npm run build, npm audit.

VERIFY FIRST, do not trust this file. Run `git fetch origin` then
`git rev-parse --short HEAD origin/main` and `git status --short`. As of 2026-09-04T11:42Z the local
branch was BEHIND origin (HEAD 010294c, origin/main f39de07 from the backup job) AND the tree was
dirty with an uncommitted session's work. Both may have changed — trust `git status --short`, never
a count written in a note. A push to main deploys production; do not push, do not tag, and ask
before committing.

THE TXNS FINGERPRINT IS A MOVING BASELINE, NOT AN INVARIANT. It was
21a63ffeb6368cd06257f17a9aa01a49 (49 rows, PHP 2,226,438.00) at 11:15 UTC on 2026-09-04, having been
6fc52ee3f41d2ffd0e9292d8dc4f015d (23 rows, PHP 269,317.00) four hours earlier because the owner
entered 26 payables. A value you do not recognise is the NORMAL case. Read it as YOUR baseline,
assert it unchanged across YOUR OWN writes, and never sweep, restore or rewind to match a document.

Three items are open and ALL THREE are blocked on the owner. Do not act on any of them unasked:

- C5 — rotate the rates account (admin@admin.com, uid 14f0d1af-f37a-4936-b278-e280bcb25129,
  profiles.role 'viewer'). It writes only fx_rates, via two RLS policies naming that uid, with
  column grants insert(as_of,cur,rate,source) and update(rate,source) only. But EVERY read policy in
  this schema is using(true), so it READS THE WHOLE LEDGER: every payable, all nine wires with
  beneficiary names, the full audit trail. That is the actual risk; say it as a read problem. The
  password change is a Supabase DASHBOARD action only the owner can take — the Admin API path needs
  a service_role key this repo deliberately does not hold. Deferred twice (D44). Section 2 has the
  procedure, verification and rollback.
- C6 — GitHub queues this repo's scheduled runs 1h44m to 5h04m behind their cron slots, worst on the
  early-UTC slots. The FX cron's first ever scheduled run fired 2026-09-04T06:59:08Z, 4h59m after
  its 02:00 slot, and correctly wrote nothing because the ECB fix was already stored. Both FX slots
  exist to land before ECB publication at ~14:00 UTC, so the real margin is about an hour, not six;
  a longer delay flips the stored rate from T+1 to T+0 silently. DO NOT move the cron hours — 02:00
  and 08:00 UTC are deliberate (D43) and moving them earlier makes it worse. Never read a late or
  absent cron run as a failed credential rotation.
- C7 — three released wires carry no rate: 1788313757081 GZZ EUR 100,000, 1788318165685 ZPH USD
  79,180, 1788318201948 MCR USD 78,675. The owner released all three at 2026-09-04 02:26:59-02:27:03
  UTC (audit_log 1697-1699). Nothing in the app stamps a rate on status change, so D45 and the
  comment at apps/web/src/logic.js:261 describe an invariant no code enforces. They fall to rung 2
  of rateFor() and re-price off fx_latest whenever the feed moves. TWO separate owner questions:
  whether to backfill the three, and whether release should stamp automatically. Backfilling has a
  date subtlety the 2026-09-02 backfill did not — they were released BEFORE that day's ECB fix
  existed, so as_of 2026-09-04 and as_of 2026-09-03 are both defensible. Do not choose for the
  owner. Do not write to these rows unasked.

C1, C2, C3 and C4 are CLOSED (D46, D47, D48). Do not reopen them. Sign-out stays global and is
explicit at apps/web/src/App.jsx:63 and apps/web/src/store.jsx:67; the scheduler gets no external
notification channel; receipt 1788471059637 is a DO-NOT-DELETE backup proof; apps/api/ is gone. Two
older files still tell you to ask the owner to choose C1 and C4 — both now carry a superseded
banner; read the banner, not the body.

Hold these:
- Assert the refusal, not the absence of an error. {"success": true} proves the SQL ran, not that it
  achieved anything; a blocked policy and a missing row both give row_count = 0.
- A resolved fetch is not a healthy response, and a wrapper's exit code is not the command's verdict.
- "Has not run yet" and "never runs" leave the same artifact. Re-check immediately before writing
  down that something never ran.
- A documented invariant that no code enforces is a comment, not an invariant.
- .upsert() breaks against column-scoped grants: it names every payload column including the primary
  key in ON CONFLICT DO UPDATE SET. Split into insert + targeted update; do NOT widen the grant.
- A row without an E2E- tag may be the owner's. Never sweep one.
- Do NOT revoke EXECUTE on any is_viewer (N1/D34); remove the three unused indexes (N2); raise the
  Playwright timeouts (N3); reimplement recurrence in SQL (N4); add a credential fallback for
  SCHEDULE_*/FX_* (N5); modify company_tracker/ (N7); delete from audit_log (N8); delete a failing
  security check to make a suite green (D26); or edit the three applied FX/R7 migration files, whose
  byte-identity to what was applied IS the evidence.
- zone-offices (lasycakyudaawrydetnm) is a LIVE CRM belonging to someone else. Paused. Do not touch.
  tracker-rehearsal (bucmcnsjkuprpojhequy) is the scratch project.
- AGENTS.md and CLAUDE.md are equal synchronized policies. Change both in one commit, keep them
  byte-identical, verify with cmp.

Produce a plan naming the item IDs it addresses, stating per item whether you can actually execute
it here ("blocked, and here is the prerequisite" is a correct answer), citing exact paths and line
numbers, separating what you verified from what you inferred, and proposing checks that would FAIL
if the change were wrong — including the failure paths, not just the happy one. Then report what you
verified and what drifted, confirm the state back, and wait for direction before starting.
```

## Guideline Basis

- **PG-04** names the reproducible check behind every claim; the policy, grant, run-history and audit-log figures were each read live on 2026-09-04, and §4.5 is labelled as arithmetic rather than a reading.
- **DOC-02** separates observed evidence from inference and from owner decision, and marks the one place (§4.6) where a choice has no correct default.
- **MD-02** uses exact relative paths throughout, because the intended reader cannot resolve wikilinks.
- **DOC-03** reuses the established A/B/C, D and N identifiers and the trap numbering rather than renumbering them.
- **SEC-03** is why no credential value, token or connection string appears here, and why C5 describes blast radius rather than the secret.
- **SEC-05** is why §2.2 and §2.3 state the trust boundary as grants plus policies rather than as a summary of intent.
