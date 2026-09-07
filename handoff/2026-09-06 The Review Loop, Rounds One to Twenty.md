---
title: The Review Loop, Rounds One to Twenty
tags: [handoff, continuation, complete-package, erp, tracker, supabase, adversarial-review, review-loop, verification, rate-limit, money-path, mutation-testing, round-ledger]
created: 2026-09-06
status: current
kind: record of the review loop — superseded as the entry point by [[2026-09-07 Session Continuation, Rounds One to Twenty-Five]], which it should be read with
supersedes: "[[2026-09-05 The Design Port, and Three Requirements the File Did Not Show]] as the ENTRY POINT. That note is not obsolete: it remains the full record of the design port itself, the twelve client requirements mapped to source, the four migrations, and findings 1-55 in one table. Read this note first, then that one."
covers: "the adversarial review loop in full — rounds 1 to 25, EIGHTY-ONE findings, D49 to D78, traps 77 to 107 — and the rate-limit history that shaped how each round was run"
decisions-made: "[[Decisions]] D49 to D78"
verification-status: "rounds 1-25 ALL RAN AND ALL TWENTY-FIVE FOUND SOMETHING. The loop has never returned clean. Rounds 5, 16, 17, 18 and the D65 batch were run by the MAIN SESSION by hand under a rate limit — weaker evidence. Round 19, the first real verifier subagent afterwards, REFUTED the main session's clean claim with six findings. Round 20 REFUTED round 19; round 21 then REFUTED round 20 with three findings, ONE OF THEM DESTRUCTIVE — a storage sweep that could have deleted every receipt file the owner has ever uploaded. Round 22 then REFUTED round 21 in turn, finding that its fix had moved a whole-ledger write guard into the one layer with no test coverage. Round 23 then REFUTED round 22 with five findings, including a RESTORE TOOL that silently truncated its audit_log read at 1,000 rows and emitted a plan missing 6,419 of 7,419 changes. Round 24 then REFUTED round 23 with six findings, including a BACKUP tool paged the way this codebase calls broken and a Masterlist Amount field that could not accept a typed decimal — a hundredfold payable twenty-three rounds had missed. Round 25 then REFUTED round 24 with four findings, the worst of which put wrong money in the ledger unattended. Round 26 has NOT been run; round 25's own fixes are unreviewed and are the next session's first job."
related:
  - "[[2026-09-05 The Design Port, and Three Requirements the File Did Not Show]] — the design port, requirements, migrations, and the findings table"
  - "[[Decisions]] — D1 to D78, the authority on what is authorised"
  - "[[Repository Evidence]] — the factual baseline"
  - "[[Remaining Work and Owner Decisions]] — A1-A2, B1-B2, C1-C7"
  - "[[Handoff Index]] — every handoff, newest first"
  - "[[AI Agent Context]] — the navigation hub"
  - "[Supabase Schema](../supabase/README.md) — nineteen migrations"
up: "[[AI Agent Context]]"
---

# The Review Loop, Rounds One to Twenty

> **This note is no longer the entry point.** Start at
> [[2026-09-07 Session Continuation, Rounds One to Twenty-Five]]. **This note is still the record**
> — and the only place holding the round-by-round ledger, the rate-limit history, and sections
> 4a-4f describing rounds 19 through 25 in detail. Nothing in it has been superseded except its role
> as a starting place.

## 1. What this document is, and what it is not

This was the entry point for the 2026-09-06 pass and is now the round-loop record. It exists because
the continuation package before it —
[[2026-09-05 The Design Port, and Three Requirements the File Did Not Show]] — was written to
record *a design port*, and what actually consumed this session was **the adversarial review loop
that followed it**: twenty-five rounds, eighty-one findings, and a rate-limit history that changed how
several rounds were run and therefore how much they are worth.

**It does not repeat that note.** The twelve client requirements mapped to `file:line`, the four
migrations and their MD5 verification, the fingerprint that moved without data changing, the full
eighty-one-row findings table, and traps 77-107 all live there and are still correct. Read this note
first for the loop and the current state, then that one for the detail behind any finding.

**The one thing to carry out of this document if you read nothing else:** rounds 16, 17 and 18 were
run by the main session by hand because a rate limit had blocked every subagent. They reported the
work green. Round 19 — the first real fresh-context `verifier` after the limit reset — refuted that
in a single pass with **six findings**, one on the money path and two leaving the owner's live
configuration in a state nothing in the suite could repair. Self-review is a stopgap. It is not a
round.

## 2. The rate limits, and why they belong in the record

The user asked specifically that this be written down, and it is not bookkeeping — it is the reason
several rounds carry an asterisk.

| When | What happened | Consequence |
|---|---|---|
| Round 5 | The subagent died on a session limit before reading any code | Round 5 run by the main session by hand. It still found defect #6 |
| After round 12 | Stop-hook pushback; a batch run by the main session | Found three defects (D65) |
| Round 16, attempt 1 | Subagent died on the **session** limit. Only output: *"I'll start by orienting myself in the actual code."* | Left no mutation |
| Round 16, attempt 2 | Subagent died on the **weekly** limit. Only output: *"I'll start by reading the actual code under verification."* | Left no mutation |
| Rounds 16, 17, 18 | Run by the **main session by hand**, weekly limit still in force | Four findings (46-49). All four were inside the previous round's fix. Ended by reporting the work green |
| **A killed round-16 process** | Skipped its `finally` and left `ackRequirePhoto: true` in the **owner's live config** | The owner could not liquidate a receipt without attaching a file — a rule they never chose. **Finding 45, D70, trap 93.** This is what the whole `hold`/`releaseHeld` mechanism exists to prevent |
| Round 19 | Weekly limit reset; first real `verifier` subagent | **REFUTED.** Six findings (50-55) |
| Round 20, attempt 1 | Subagent died on the **session** limit. Only output: *"I'll start by establishing the baseline and reading the newest code."* | Left no mutation — verified: marker null, ledger unchanged, no stray codes |
| Round 20, attempt 2 | Relaunched after a session-limit reset | **REFUTED with five findings.** Section 4a |

**Rule this produced, now written into the loop:** never run a review round in the main session if a
subagent is available, and never report a main-session round as clean. When a round dies, **check
`app_config` before doing anything else** — a killed Playwright process skips `finally`.

## 3. THE ROUND LEDGER

Every round that has ever run has found at least one defect. **The loop has never returned clean.**

| Round | Ran as | Findings | Decision |
|---|---|---|---|
| 1 | subagent | 1 — `payFee` seeded at 2 of 3 dialog openers; a reload emptied the dialog and confirming **deleted a recorded charge** | D52 |
| 2 | subagent | 1 — stacked dialogs; Escape orphaned the payment dialog and confirming wrote nothing | D53 |
| 3 | subagent | 1 — `saveEdit` subtracted `edit.fee` from a **retyped** amount | D54 |
| 4 | subagent | 2 — sign laundering; Undo deleted a paid row | D55 |
| 5 | **main session by hand** (subagent hit the rate limit) | 1 — the D55 fix widened a parser for 7 unguarded callers | D56 |
| 6 | subagent | 3 — duplicate Generate; bi-weekly phase; mouse-only reminder controls | D57 |
| 7 | subagent | 3 — a refused edit reported as saved; a phantom month; a spec that could not fail | D58, D59 |
| 8 | subagent | 1 — the round-7 fix left the optimistic paint behind | D60 |
| 9 | subagent | 1 — the completed-row guard read a client snapshot | D61 |
| 10 | subagent | 2 — Undo deleted a row another session paid; a doc contradicting `playwright.config.js` | D62 |
| 11 | subagent | 3 — Generate's dedupe had no index; Undo's banner cleared too early; a toast claiming a reason it could not know | D63 |
| 12 | subagent | 3 — a refused edit reported as saved (new path); an async Generate phantom month; 3 stale migration counts | D64 |
| — | **main session, after Stop-hook pushback** | 3 — no money CHECKs in the database; un-paged reads; a scheduler that died whole | D65 |
| 13 | subagent | 6 — two CHECKs disagreeing about zero; an unvalidated rate; offset paging; a guard claimed after its await; a stale baseline | D66 |
| 14 | subagent | 5 — the zero rule applied to one caller and not three siblings; a stale doc count. Keyset pager verified clean | D67 |
| 15 | subagent | 6 — the zero rule wrong in four more places; **three of D67's four fixes had NO test at all** | D68 |
| 16 | **main session by hand** (subagent died twice) | 2 — the trap-93 fix clobbered an owner policy setting; **three mutants survived** the new `pending.js` tests | D71 |
| 17 | **main session by hand** | 1 — the finding-46 fix used a whole-document write, the lost update `merge_app_config` prevents | D71 |
| 18 | **main session by hand** | 1 — two silent no-op paths in the new `hold`, either of which is trap 93 again | D71 |
| **19** | **fresh-context `verifier`** | **6 — see section 4. It refuted rounds 16-18's clean claim** | D72 |
| **20** | **fresh-context `verifier`** (relaunched after a session limit) | **5 — REFUTED round 19. Four of the five sat inside round 19's own fixes. See section 4a** | D73 |
| **21** | **fresh-context `verifier`** | **3, one DESTRUCTIVE — REFUTED round 20. A storage sweep that could delete every receipt file the owner has uploaded, in two independent ways; trap 98 still open. See section 4b** | D74 |
| **22** | **fresh-context `verifier`** | **3 — REFUTED round 21. Source pins that cannot see statement order; and round 21's own fix having moved the whole-ledger write guard into the one layer with no coverage. See section 4c** | D75 |
| **23** | **fresh-context `verifier`** | **5 — REFUTED round 22. The restore tool truncated at 1,000 rows where 7,419 qualified; a recorder blind to `select`'s options; an ordering assertion defeated by a comment; three more `updRec` mutants; and a false dichotomy in D75's reasoning. See section 4d** | D76 |
| **24** | **fresh-context `verifier`** | **6 — REFUTED round 23. The BACKUP tool paged the way this codebase calls broken; `pageAll` looping forever on a non-`id` key; the source pins defeated three ways; a recorder blind to appended builder methods; and the Masterlist unable to accept a typed decimal. See section 4e** | D77 |
| **25** | **fresh-context `verifier`** | **4 — REFUTED round 24. Moving a due date made the nightly job re-create the payable, doubling the liability unattended; plus a shape-match letting two payables suppress each other, an `fx_rates` paging exception whose justification its own ordering made false, and the decimal fix unpinned offline. See section 4f** | D78 |
| — | **the calendar, 2026-09-06** | 1 — a clock-dependent unit test went red overnight with no code change | D69 |

## 4. Round 19 in full, because it is the most instructive round in the loop

Round 19 attacked exactly what rounds 16-18 had written. All six findings are in `[[2026-09-05 The
Design Port, and Three Requirements the File Did Not Show]]` §7 as findings 50-55 and in
[[Decisions]] D72; the short form:

| # | What it found | Why it mattered |
|---|---|---|
| 50 | A **third** spec changed `dashWindow` in the owner's live config with no `hold` | A killed run left the owner's dashboard on `Next 7 days`, hiding every payable due 8-30 days out |
| 51 | A **fourth** spec adds an `E2E###` code to the shared `companies` list | **Unrecoverable by design** — `hold` recorded settings only, `cleanup` never touches `app_config`. The code would appear in every company dropdown in the app with nothing able to remove it |
| 52 | `actions.js` built the push-down key **by hand** while both cancel paths used the exported `pushKey` | A format change broke both cancels **with the suite fully green**, reinstating D59 and D67: a payable deleted mid-edit still had its push-down fire 500ms later onto live ledger rows |
| 53 | Two more surviving `pending.js` mutants — `timers.delete(key)` removed, and moved after `run()` | `armed()` is the seam every other test reads; it would report fired writes as still pending |
| 54 | `hold`/`releaseHeld` had **zero tests** | Deleting either body left the suite green — trap 91's deletion experiment, applied to rounds 16-18's own work |
| 55 | `pushable` guarded only `amount`, not `desc`/`co`/`cat` | Clearing a Description pushed `''` onto live linked rows — accepted silently, because `txns.description` is `not null default ''` with no emptiness check — and the toast then claimed the rows matched |

**The pattern in 55 is worth naming (trap 97):** the guard existed only for the field whose database
CHECK made the omission fail loudly. The field with *no* constraint was the unguarded one. The safe
field got the guard; the dangerous one did not.

### What was changed in response

- `hold(paths)` takes **config paths** — `settings.<key>` or a top-level section name such as
  `companies` — not setting names.
- `releaseHeldSettings()` became `releaseHeld()`, and it is now called from **every spec's
  `finally`** as well as `beforeAll`.
- **`restoreConfig` is deleted.** It did a whole-document write; every call site is `releaseHeld()`.
  One mechanism, not two.
- `hold` **throws** when a path is absent from the stored config. Recording absence as `null` would
  shadow the default in `src/db.js`, silently turning a `true`-defaulting setting off.
- `src/actions.js` imports `pushKey`; a test fails if the literal is rebuilt.
- `pushable(k, val)` moved to `src/logic.js`, empty-guarded for every field, tested.
- New `apps/web/e2e/held.test.js` — eight tests driving `hold`/`releaseHeld` offline against a fake
  client, through a new `useClient()` seam in `e2e/db.js`.
- `test-results/` deleted: it held Playwright `storageState` with live session tokens on disk.

### 4a. Round 20 — REFUTED, and it refuted round 19

Round 20 was dispatched against round 19's six fixes. It died once on a session rate limit before
reading any code, was relaunched after the limit reset, and came back **REFUTED with five findings —
four of them inside round 19's own fixes** ([[Decisions]] D73, trap 98).

| # | What it found | Why it mattered |
|---|---|---|
| 56 | `&& pushable` could be **deleted from `updRec` with the suite green** | Round 19 extracted `pushable` and tested it in `logic.js`. The predicate was proved right; nothing proved the caller asked. A cleared Description travels onto live linked rows again |
| 57 | Same shape: `if (!pushable) cancelPush(id, k)` — the D67 retraction — **deletable, suite green** | Type `500`, backspace within 500ms: the armed write still fires with the number the user took back |
| 58 | `hold(['settings'])` validated, because `'settings' in cfg` is true — and `releaseHeld` then wrote the held settings object **over its own marker clear** | The marker restored itself **forever**, while `releaseHeld()` returned a success list. The "`__e2eHeld` must be null" invariant could never be met again |
| 59 | Both `app_config` reads **discarded `error`**, unlike every other reader in the file | A transient 5xx or expired token made `releaseHeld()` return null and the spec pass green, leaving `ackRequirePhoto` ON in the owner's live config. Trap 93 by another road |
| 60 | The whole-document config write round 19 deleted `restoreConfig` for **survived inline in a spec** | It bypassed `merge_app_config` and its viewer guard entirely — D28's lost update, in the file that most claims to have eliminated it |

**Twice in a row the miss had the same shape** (trap 98): a helper extracted to make it testable,
tested on its own, with nothing pinning that its caller still used it. Round 19 learned this for
`pushKey`, closed it with a source-text assertion, and left the sibling call site open. Round 20
found it there.

**What changed in response.** `pushPlan(txns, id, k, val)` in `src/logic.js` now returns the whole
decision — `column`, `retract`, `targets` — so a test pins what `updRec` *does*, not one input to
it; `PUSH_DOWN` moved there with it. `hold` refuses the `settings` section as a whole, and the
marker clear is merged **last** so no top-level path can overwrite it. Both reads throw on `error`.
The duplicate-warning spec uses the `merge_app_config` RPC. The fake client in `held.test.js` gained
a failure channel (`readError`, `writeError`, `touched: 0`, missing row), which closed the secondary
gap round 20 also found: D71's two `if (!touched) throw` guards had been deletable with the suite
green. And `keyOf`, duplicated verbatim between the PNG export and the Tracker screen it claims to
summarise, is now one exported `groupKey`.

All five fixes were falsified by mutation — each deleted guard turns the suite red.

### 4b. Round 21 — REFUTED, and one finding was destructive

| # | What it found | Why it mattered |
|---|---|---|
| 61 | **`cleanupOrphanFiles` identified orphans by ABSENCE** from a `receipts` read whose `error` it discarded, defaulting to `[]` | One transient 5xx or expired token and **every receipt file in the owner's live bucket** is deleted — the backup-proof attachment included. The `remove()` error was discarded too, so it reported success. The `E2E-` tag rule protected every table and **nothing** in storage |
| 62 | The same read was **unpaged** | `src/db.js` already routes receipts through `pageAll` because the table outgrows PostgREST's silent 1000-row cap. At 1001 receipts every attachment past the cut is deleted on the next run, worse every day |
| 63 | **Trap 98 was still open** — nothing imports `src/actions.js`, so two call-site mutants survived at 156/156 | Deleting the `cancelPush` retraction; and rebuilding the patch as `{ [k]: val }`, where `desc` is stored in `description`, so every description push-down would have returned 400 |

`cleanupOrphanFiles` is **deleted**. `cleanup()` now collects the `file_path` of the receipt rows it
actually removed by tag and deletes exactly those files — no bucket enumeration, every error throws.
`pushPlan(k, val)` returns `{column, retract, patch}` so the call site assembles nothing.

**Round 21 also raised an observation I acted on rather than filing.** `pushPlan` was fed
`state.txns`, a page-load snapshot, so a linked open row another session created after this tab
mounted was never written while the toast said the rows matched. The client no longer chooses the
rows: `db.patchTxns` went from `(ids, patch, src)` with `.in('id', ids)` to `(patch, src)` selecting
`.eq('src', src).neq('status','completed')` **in the write**.

### 4c. Round 22 — REFUTED, and the criticism lands on round 21's fix

| # | What it found | Why it mattered |
|---|---|---|
| 64 | **A source-text pin cannot see statement order.** `retract` and a null `patch` are the same predicate, so moving `if (!plan.patch) return` above `if (plan.retract) cancelPush(id, k)` makes the cancellation dead code — all four assertions still matching | D67 reinstated: the write armed before a field was cleared fires anyway, with the value the user took back. A second mutant survived too — the repaint keyed off `plan.column` instead of `k`, so `desc` never repaints while the toast says the rows match |
| 65 | **Round 21's fix moved the guard out of the only layer that had coverage.** Nothing imports `src/db.js`; deleting **both** `.eq('src', src)` and `.neq('status','completed')` left `npm test` green | One masterlist keystroke would issue `PATCH /txns` **with no filter at all** — every row in the shared ledger, completed included, set to that amount, toast reporting 49 rows updated |
| 66 | The tag-scoped sweep leaks orphans **permanently** | A failed remove, or a kill between the row delete and the file remove, and no later sweep can find those files. The trade D74 made, now written down instead of implied |

**Finding 65 is the one to learn from (trap 101).** Round 21 was right that a guard evaluated on the
client is not a guard, and moving it into the write was correct — but it landed in the one module
the offline suite cannot import, because `src/db.js` builds the live Supabase client at module
scope. The fix was right and the coverage went backwards.

**What changed.** New `src/queries.js` holds `pushDownTxns(from, patch, src)` and
`deleteGeneratedTxns(from, ids)`, taking `from` instead of reaching for the client, so
`src/queries.test.js` drives them with a recorder and asserts the exact filter chain; `db.js`
supplies the real `from`. The `deleteTxns` guards, never covered either, came along. The call-site
pin gained an `indexOf` **ordering** assertion and a pin on the repaint expression.

### 4d. Round 23 — REFUTED, and the worst finding was in the repair tool

| # | What it found | Why it mattered |
|---|---|---|
| 67 | **`scripts/rewind.mjs` read `audit_log` unpaged** | The restore tool, silently capped at 1,000 rows. `planRewind` keys on the first entry per row, so a row whose first post-cut change fell past the cut produces **no step at all**. Measured on production: **7,419** rows qualified, it reported **1000**, and printed a confident count for a plan missing 6,419 changes. `backup.mjs` documents this exact scar and pages; `src/db.js` pages everything |
| 68 | The round-22 recorder checked only `select()`'s **first argument** | `select('id', { head: true })` passed while making both builders return nothing: the ledger changes, the screen never repaints, and undo flashes "0 removed" about rows the database did delete |
| 69 | The `indexOf` ordering assertion was **defeated by a comment** | Comment out the real `cancelPush`, re-insert it below the early return, ordering still holds, statement unreachable |
| 70 | Three more `updRec` mutants | Dropping `Math.max(0, …)` puts a **negative payable** in the ledger and the totals; storing the raw input sends a string to a numeric column; deleting `if (!written.length) return` flashes "0 rows updated" |
| 71 | **The dichotomy D75 accepted was false** | Read the tagged paths, remove the files, *then* delete the rows: a kill leaves the rows tagged and the next sweep retries. Neither leak nor loss |

**What changed.** `rewind.mjs` uses `pageAll` with keyset paging and now reports 7419 — verified
live. The recorder compares the whole `select` call. The source pins strip comments before any
assertion. `recValue(k, v)` and `editRecurring(row, k, v)` moved to `src/logic.js` with tests, and
`updRec` reads the pushed value back off the row it stores so the two cannot diverge. `cleanup()`
removes files before deleting the rows that name them; `src/smoke.mjs` had the same ordering with a
comment claiming the opposite, fixed alongside.

**Two of the five were in code no round had ever examined** — the second time that has happened
(round 21 was the first). The pattern is now explicit in the brief: attack the newest code, then ask
what has never been in scope at all.

### 4e. Round 24 — REFUTED, and a money bug twenty-three rounds walked past

| # | What it found | Why it mattered |
|---|---|---|
| 72 | **`scripts/backup.mjs` paged by OFFSET with no ORDER BY** | The disaster-recovery snapshot, using the method `src/pending.js` calls broken in its own comment — *"one row comes back twice, another is never seen, **and an exact count still matches**"* — which is precisely why its own count assertion could not catch it. Round 23 patched the restore tool and left this one: a root-cause miss |
| 73 | `pageAll` hard-coded `row.id` as its cursor | Paging `profiles` (keyed `user_id`) carried `undefined` forward and **looped forever** |
| 74 | **The source-text pins were defeated three ways** | A commented-out copy of a pinned line; a string literal holding the same text; `if (state.readOnly)` prefixed to a pinned statement. Each left the suite green while the push-down cancellation became unreachable. A fourth mutant was never pinned at all |
| 75 | The recorder was blind to **appended** builder methods | `.single()` makes `written.length` undefined so every push-down is swallowed silently; `.limit(1)` updates one linked row instead of all |
| 76 | **The Masterlist Amount field could not accept a typed decimal** | Controlled from a store holding a *number*: `1250.50` typed key by key gave `1250.` → parsed `1250` → React restored `"1250"` → the rest produced **125050**. A hundredfold payable that then pushed down onto every linked Tracker row. Pasting worked; typing did not, which is why **twenty-three rounds missed it** — nothing had ever typed |
| 77 | `amountOf('1e3') === 13`, `amountOf('1.2.3') === 1.2` | Declared and not fixed; handed to round 25 to judge |

**What changed.** `readAll` in `backup.mjs` uses `pageAll` with keyset paging and an explicit order —
a real run reads 7,902 audit rows with zero duplicates. `pageAll` takes a `key` and **throws** when a
full page cannot supply a cursor. `applyMasterlistEdit(row, k, v, fx)` moved into a new
`src/masterlist.js` with its effects as callbacks, driven by spies in `src/masterlist.test.js`, and
**both source-text tests were deleted** — a pin that cannot fail reads as coverage (trap 104). Both
query builders' entire call lists are matched exactly. `state.recDraft` holds the raw keystrokes for
the cell being edited, with a new e2e spec that types the value key by key and was verified to fail
when the fix is reverted.

### 4f. Round 25 — REFUTED, and the worst money defect of the whole loop

Round 25's first attempt died on a session rate limit before reading any code; the working tree,
ledger and config were verified untouched and it was relaunched. It came back **REFUTED with four
findings** ([[Decisions]] D78, traps 106-107).

| # | What it found | Why it mattered |
|---|---|---|
| 78 | **`alreadyOnSheet` matched a generated row by exact `due`** — the same key as the D63 unique index | So the index could not catch what the index and the client agreed to disagree about. **Move a due date and the occurrence looks missing again**: at 22:00 UTC the unattended job inserts a second row and reports `Added 1 payable(s)`. One PHP 5,000 bill becomes PHP 10,000 of liability. Undo cannot help — it only knows the ids from the last click in that tab — and both the Dashboard deadline list and the Tracker sync line invited a human to repeat it by hand |
| 79 | Fixing 78 exposed a second defect it had hidden | `alreadyOnSheet`'s shape-match fired for rows whose `src` belonged to a **different** payable, so two payables sharing a company, category, description and period silently suppressed each other's generation |
| 80 | **The `fx_rates` paging exception was justified by a claim its own ordering made false** | D77 kept ordered offset paging because the table is append-only — but ordered by `cur` first, and `fx.mjs` writes one row per currency per day, so each run inserts at four points through the ordering and every later page shifts, with `rows.length` still equal to `count` |
| 81 | **The decimal fix was unpinned offline** | `if (fx.draft) fx.draft(v)` is optional-guarded and the spy factory never built `draft`, so deleting the line left the suite green and restored the hundredfold bug |

**What changed.** Coverage is counted **per payable per period** rather than per exact date, and
`uncoveredOccurrences` holds that rule once so `buildGeneratedRows` and `forecast` cannot drift —
which is exactly what D67 and D68 were about. `alreadyOnSheet` is now the legacy path only
(`t.src == null`). `fx_rates` orders by `as_of` first, and a table added to `TABLES` without a `KEY`
entry throws instead of falling silently into the offset branch. The spy factory builds `draft` and
two tests assert it receives the raw text before anything is parsed.

**One gap was measured rather than closed.** The adapter in `src/actions.js` still holds
`db.updateRecurring`, which no offline test imports. Instead of asserting that away, it was mutated
to `db.insertRecurring` and run against the **live** suite: the decimal spec failed. So the adapter
is covered by e2e and not by `npm test` — that is the honest description, and it is recorded rather
than dressed up.

**Round 26 has NOT been run. Round 25's own fixes are the unreviewed code**, and every round so far
has found something in exactly that position. Round 26 is the next session's first job.

## 5. The ratio, which is the real finding

**Forty-two of the eighty-one findings were introduced by the fix for the previous defect.** Half.
Findings 46-49 were four consecutive examples, five of round 19's six another, four of round 20's
five another again.

**But round 21 is the counter-example worth holding onto:** two of its three findings were
*pre-existing* code that twenty rounds had never looked at, because every round had been pointed at
what the last round changed. Attack the newest code first — then ask what has never been in scope at
all. The storage bucket never had been.

That is why the loop has not converged, and it is not because the defects are hard to find. It is
because **every fix is a new, unreviewed change**, and the next round is the first time anyone looks
at it. Any round that ends without attacking what the previous round wrote has not really run.

### The four defect families

Every finding fits one of these. Give them to the next verifier verbatim.

1. **State outliving the source it was derived from** (trap 80). The largest family.
2. **A shared helper acquiring a caller whose assumptions differ** (traps 81, 90, 96).
3. **A fix trading one failure for another** (traps 94, 95).
4. **A guard evaluated on the client instead of in the write** (trap 88).

### Why the suites kept missing them

- A spec can pass **against its own defect** — round 7 found one, and the undo spec was rewritten
  three times before it could fail.
- "Falsified two ways" has been **wrong twice**: round 16 found three surviving mutants in tests
  already called falsified, round 19 found two more. **Mutation-test anything you are told is
  falsified.**
- A fix with no test is invisible: three of D67's four fixes could be deleted with the suite green
  (trap 91). Repeat that deletion experiment every round.
- Nothing exercised `e2e/` helper code at all until round 19 (finding 54).

## 6. Where the code stands

| Path | What it is | Born |
|---|---|---|
| `apps/web/src/pending.js` | `createPending` (debounce registry, injectable timers) + `pageAll` (keyset pager) + `keyOf`/`pushKey`. Extracted so both are testable without a database | D70 |
| `apps/web/src/pending.test.js` | 19 tests. Mutation-tested twice over (rounds 16 and 19) | D70, D72 |
| `apps/web/e2e/held.test.js` | 8 tests for `hold`/`releaseHeld` against a fake modelling `merge_app_config`'s SQL | D72 |
| `apps/web/e2e/db.js` | `hold(paths)`, `releaseHeld()`, `useClient(fake)`. **Writes to the owner's live `app_config`** | D71, D72 |
| `apps/web/src/logic.js` | `pushable`, `forecast`, `sortRows`, `summaryHTML`, `alreadyOnSheet`, `unpricedFor`, sign-aware `amountOf` | D49-D72 |
| `supabase/migrations/` | 19 total; four applied this session, all rehearsal-first and MD5-verified | D50, D51, D63, D65 |

**Nineteen migrations, 7 money CHECKs, 1 partial unique index** on `(src, due)`.

## 7. Live state

Read at 2026-09-06, after round 20's five fixes were applied and verified.

| | |
|---|---|
| `npm test` | **183/183** across nine files, offline |
| `npx playwright test --workers=1` | **48 passed** |
| `npm run security` | **56 checks, 0 failed** |
| `npm audit` | **0 vulnerabilities** |
| `npm run build` | green, `vite v8.2.2` |
| `txns` | `f9f84adad1c9b5c4fa3e3495712ac09f` · 49 rows · PHP 2,226,438.00 — **unchanged across every run this session** |
| `receipts` | 3, including `1788471059637` (backup-restore proof — never touch) |
| `app_config` | `ackRequirePhoto: false` · `warnDuplicate: true` · `dashWindow: Next 30 days` · 21 companies, 18 categories · **0 stray `E2E` codes** · `__e2eHeld: null` |
| `E2E-` residue | 0 in `txns`, `receipts`, `transfers`, `recurring` |
| `test-results/` | removed — it held live session tokens |
| Git | `HEAD` is `010294c`; **56 changed paths, nothing committed** |
| Docs | 0 broken relative links, 0 unresolved wikilinks, `AGENTS.md` ≡ `CLAUDE.md` byte-identical |

**`__e2eHeld: null` is the resting state.** A non-null value means a run was killed mid-spec: do not
clear it by hand — run the suite and let `beforeAll` give the value back.

**The `txns` fingerprint is a moving baseline, not an invariant.** It was
`21a63ffeb6368cd06257f17a9aa01a49` until 2026-09-05 and changed **without any data changing**,
because two new columns altered every row's serialised text while count and sum both held. The owner
enters payables daily, so a value you do not recognise is the normal case. Read it at the start of
your session as *your* baseline, assert it unchanged across *your own* writes, and never sweep,
restore or rewind to make it match a number in a document.

## 8. What is NOT verified, stated plainly

- **Round 20's own five fixes** have been reviewed by nobody but their author. Round 21 has not
  been dispatched, and every round so far has found something in exactly this position.
- Rounds 5, 16, 17, 18 and the D65 batch were **main-session self-review**.
- **The loop has never returned clean.** Do not report this work as defect-free and do not report it
  as converged.

## 9. Traps

Traps 1-63 in [[2026-09-03 Ten Closed, and a Backup Nobody Had Deployed]], 64-71 in
[[2026-09-04 Exchange Rates, R7, and Two Agent Audits]], 72-76 in
[[2026-09-04 Three Answers, and a Finding That Corrected Itself]], **77-98 in
[[2026-09-05 The Design Port, and Three Requirements the File Did Not Show]]**. All still apply.

The five that govern this loop specifically:

- **91** — a fix you falsified by hand is not a fix the suite protects.
- **93** — cleanup in a `finally` does not survive a killed process.
- **94** — a cleanup that *asserts* a value cannot tell residue from policy. Record what the value
  **was**.
- **96** — a key built in one module and matched in another is a contract; build it in one place.
- **98** — testing one input to a decision is not testing the decision. When you extract a helper to
  make it testable, pin what the **caller does with it**. This was missed three times running.
- **99** — a cleanup that identifies its targets by **absence** will one day delete everything. Name
  what you remove; never infer it from what a read failed to return.
- **100** — a source-text assertion proves a line exists, not that it **runs**. Pin order and
  reachability too, and treat the technique as a stopgap for code that ought to be importable.
- **101** — moving a guard to where it belongs can move it **out of where it was tested**. Check what
  covered a safety-critical predicate before you relocate it, and what covers it after.
- **102** — a pure helper extracted and tested still leaves whatever the caller computes **before**
  it. Extract to the boundary of the decision, not to the first line that was easy.
- **103** — a tool that **repairs** damage is the last place a silent truncation is acceptable. Grep
  every `.select(` on a growing table before trusting any of them.
- **104** — a pin that cannot fail reads as **coverage**, which is worse than no pin. If a module
  cannot be imported, that is the defect; move the decisions somewhere importable.
- **105** — a controlled input rendered from a **parsed** value cannot be typed into. Paste worked,
  so nothing that filled a value ever saw it. **No test had ever typed.**
- **97** — a guard added for one field of a shared path must cover every field on it, and the field
  with no database constraint is the dangerous one.

## 10. Still open — neither is closeable without the owner

1. **`Refund` is missing from production's categories.** Settings → Masterlist settings → Categories
   adds it in seconds. A scripted write was attempted and correctly refused by the permission layer.
2. **The commit decision.** 56 changed paths, nothing committed, and **a push to `main` deploys
   production**.

## 11. Suggested skills for the next session

- `superpowers:writing-skills` — before writing or editing any Markdown.
- `obsidian:obsidian-cli` and `obsidian-vault` — **the vault root is the repository itself**,
  `/Users/itadmin/Desktop/puge`. Obsidian's *focused* vault is `project_babushka`, a different one,
  so every CLI write must name `vault="puge"` explicitly. Never write into `.obsidian/`.
- `handoff` — for the next continuation package.
- `superpowers:systematic-debugging` — before chasing any defect a round reports.

## 12. How to verify state in a fresh session

From `apps/web/`: `npm test` (183), `npm run build`, `npm audit` (0), `npm run security` (56), then
`npx playwright test --workers=1` (48) and `rm -rf test-results` afterwards, because traces hold
`E2E_PASSWORD` and live refresh tokens in plaintext. If `npm audit` fails on a registry error,
report it UNRUN — never substitute an older reading.

Then read the ledger and the config in one query:

```sql
select (select md5(string_agg(t::text, chr(10) order by t.id)) from public.txns t) fingerprint,
       (select count(*) from public.txns) txns,
       (select sum(amount)::text from public.txns) total,
       data->'settings'->'__e2eHeld' held,
       data->'settings'->>'ackRequirePhoto' ack,
       data->'settings'->>'dashWindow' win,
       (select count(*) from jsonb_array_elements_text(data->'companies') x where x like 'E2E%') stray,
       (select count(*) from public.txns where description like '%E2E-%')
     + (select count(*) from public.receipts where name like '%E2E-%')
     + (select count(*) from public.transfers where name like '%E2E-%') residue
from public.app_config where id;
```

Expect `f9f84adad1c9b5c4fa3e3495712ac09f`, 49, `2226438.00`, `held` null, `ack` false,
`win` `Next 30 days`, `stray` 0, `residue` 0.

## Resume prompt

```
Read handoff/2026-09-06 The Review Loop, Rounds One to Twenty.md first — it is the entry point and
carries the round ledger. Then read handoff/2026-09-05 The Design Port, and Three Requirements the
File Did Not Show.md for the design port, the twelve client requirements mapped to file:line, the
four migrations, the full eighty-one-row findings table and traps 77-107. Also read docs/Decisions.md
(D1-D72), docs/Repository Evidence.md, docs/Remaining Work and Owner Decisions.md, and AGENTS.md /
CLAUDE.md, which are byte-identical synchronized policies.

VERIFY BEFORE YOU ACT. Do not trust the snapshot in either handoff. From apps/web run: npm test
(expect 183 across nine files), npm run build, npm audit (0), npm run security (56), npx playwright
test --workers=1 (48), then `rm -rf apps/web/test-results` because traces hold E2E_PASSWORD and live
refresh tokens in plaintext. Then run the SQL in section 12 of the entry-point handoff. Report what
drifted rather than assuming the documents are current.

THIS APP HAS ONE SHARED LEDGER HOLDING REAL MONEY, used daily by the owner during Manila working
hours. THERE IS NO STAGING: npm run e2e, npm run smoke and npm run security all WRITE TO PRODUCTION.
A row without an E2E- tag may be the owner's — never sweep one. receipts row 1788471059637 ("DO NOT
DELETE — backup proof") is the storage-restore evidence and carries amount 0.00 and company F5,
which is not in the companies list; both refusals it triggers are expected, do not "fix" the row.
zone-offices (lasycakyudaawrydetnm) is a LIVE CRM belonging to someone else — paused, do not touch.
tracker-rehearsal (bucmcnsjkuprpojhequy) is the scratch project. Do NOT edit the three applied FX/R7
migration files. Never write into .obsidian/. A push to main DEPLOYS PRODUCTION.

THE TXNS FINGERPRINT IS A MOVING BASELINE, NOT AN INVARIANT: f9f84adad1c9b5c4fa3e3495712ac09f, 49
rows, PHP 2,226,438.00. It changed once WITHOUT ANY DATA CHANGING, because new columns altered every
row's serialised text. The owner enters payables daily. Read it as YOUR baseline, assert it unchanged
across YOUR OWN writes, and never sweep, restore or rewind to make it match a number in a document.

BEFORE RUNNING THE E2E SUITE: four specs change the OWNER'S LIVE CONFIG — ackRequirePhoto,
warnDuplicate, dashWindow, and the shared companies/categories lists. A killed process skips the
finally that restores them; one such kill once left ackRequirePhoto ON, which stopped the owner
liquidating a receipt without a file. Each spec now calls D.hold([...]) BEFORE changing anything,
recording what was there into app_config.data.settings.__e2eHeld, and both beforeAll and every
finally call releaseHeld(). A resting __e2eHeld is JSON null. IF YOU SEE A NON-NULL __e2eHeld a run
was killed mid-spec — do not clear it by hand, run the suite and let beforeAll give the value back.
If you add a spec that changes the config, IT MUST CALL hold FIRST. Do NOT "improve" this by forcing
settings to their defaults: that was finding 46, and it would silently undo a policy the owner chose.

YOUR FIRST JOB IS TO CONTINUE THE REVIEW LOOP. Check section 4c and the round ledger for round 23's
result; if none is recorded it never reported and must be re-run, otherwise fix what it found and
dispatch the next round. ROUNDS 1-22 ALL RAN AND EVERY SINGLE ONE FOUND SOMETHING; the loop has
NEVER returned clean, NO ROUND HAS SURVIVED THE NEXT ONE, and FORTY OF THE SEVENTY-SEVEN FINDINGS
WERE INTRODUCED BY THE FIX FOR THE PREVIOUS DEFECT. Start at the newest code, which is round 24's fixes:
scripts/backup.mjs (now keyset-paged), pageAll's `key` parameter in apps/web/src/pending.js,
apps/web/src/masterlist.js and its test, and the recDraft/draftText path behind the Masterlist
Amount field.

THREE TRAPS HAVE EACH BITTEN MORE THAN ONCE, AND THEY ARE HOW YOU FIND THE NEXT DEFECT:
- TRAP 98: a helper extracted to make it testable, tested on its own, with nothing pinning that its
  caller still uses it. When you check a fix, DELETE IT AT THE CALL SITE, not just in the helper.
- TRAP 100: a source-text assertion proves a line exists, not that it RUNS. Round 22 reordered two
  adjacent statements and made a guard dead code with every assertion still matching.
- TRAP 101: moving a guard to where it belongs can move it OUT of where it was tested. Round 21
  moved the whole-ledger write guard into src/db.js, which nothing can import.

ALSO ASK WHAT HAS NEVER BEEN IN SCOPE AT ALL. Round 21 found its worst defect — a sweep that could
delete every receipt file the owner owns — in code twenty prior rounds had never looked at, because
each round was pointed only at what the last one changed. Still unaudited: apps/web/scripts/*.mjs,
src/smoke.mjs, src/store.jsx, src/rows.js, .github/workflows/*.yml, vercel.json.

NEVER RUN A ROUND IN THE MAIN SESSION IF A SUBAGENT IS AVAILABLE. Rounds 16-18 were run by hand
under a rate limit and reported the work green; round 19, the first real fresh-context verifier
afterwards, refuted that in one pass with six findings — one on the money path, two leaving the
owner's live config unrepairable by anything in the suite. Never report a main-session round as
clean. If a round dies on a rate limit, CHECK app_config BEFORE DOING ANYTHING ELSE.

Each round: dispatch a fresh-context `verifier` subagent; tell it what changed since the last round
and to ATTACK THAT FIRST; give it the four defect families (state outliving its source; a shared
helper acquiring a caller whose assumptions differ; a fix trading one failure for another; a guard
evaluated on the client instead of in the write); require it to falsify every spec it relies on AND
to MUTATION-TEST any test it is told was already falsified, because that claim has been wrong twice;
require it to repeat the deletion experiment — delete each recent fix and check whether any test goes
red; forbid npm run smoke; forbid npm run e2e unless a finding requires it; require `rm -rf
apps/web/test-results` afterwards; and refuse a clean verdict that does not list the attempts behind
it. Keep running rounds until one comes back genuinely empty, then write a full handoff for Codex to
read and verify.

TWO THINGS NEED THE OWNER AND ARE NOT YOURS TO CLOSE: `Refund` is missing from production's
categories (Settings -> Masterlist settings -> Categories adds it in seconds; a scripted write was
attempted and correctly refused by the permission layer), and the decision on whether to commit —
56 changed paths, nothing committed, and a push to main deploys production.

The vault root IS the repository, /Users/itadmin/Desktop/puge. Obsidian's focused vault is
project_babushka, a DIFFERENT one, so any obsidian CLI write must name vault="puge" explicitly.
Knowledge notes go in docs/, handoffs in handoff/ named `YYYY-MM-DD Title.md`, never into .obsidian/,
which Obsidian excludes from its index.

Report what you verified and what drifted, confirm the state back in a few lines, and WAIT for
direction before starting anything new.
```

## Guideline Basis

- **DOC-02** separates observed state, decisions, and inference throughout this note.
- **PG-04** requires every claimed result to name the check that produced it; section 12 names them.
- **MD-02** uses path-qualified links that resolve locally.
- **AGENT-02** keeps this note vendor-neutral: it briefs any agent, not one tool.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [[2026-09-05 The Design Port, and Three Requirements the File Did Not Show]] ·
[[Decisions]] · [[Repository Evidence]] · [[Handoff Index]] · [[AI Agent Context]]
