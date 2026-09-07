---
title: The Design Port, and Three Requirements the File Did Not Show
tags: [handoff, continuation, complete-package, erp, tracker, supabase, design, prototype, migration, requirements, verification, adversarial-review, money-path, trap-80, trap-94, trap-95, trap-96, trap-97, trap-98, trap-99, trap-100, trap-101, trap-102, trap-103, trap-104, trap-105, trap-106, trap-107]
created: 2026-09-05
status: current
kind: complete continuation package — a fresh chat resumes from this file alone
supersedes: "[[2026-09-04 Three Answers, and a Finding That Corrected Itself]] as the entry point; that note remains the record of phase 45 and every trap in it still applies"
covers: "phase 46 (rounds 1-18) — an updated Claude Design prototype ported into apps/web, two additive production migrations, three client requirements the prototype file alone did not reveal, and EIGHTY-ONE findings that twenty-five rounds of adversarial review — plus one day of the calendar — turned up underneath it. rounds 16-18 ran in the MAIN SESSION by hand and reported clean; round 19, the first real verifier subagent after the weekly limit reset, REFUTED that with six findings"
decisions-made: "[[Decisions]] D49 to D78"
traps-added: "77 (a prototype is not a requirement), 78 (state seeded at two call sites drifts), 79 (only the innermost dialog answers Escape), 80 (state that outlives its source), 81 (widening a shared parser widens it for every caller), 82 (display:none and visibility:hidden remove an element from the a11y tree; opacity does not), 83 (a dedupe key must not be built from editable prose), 84 (a constant named like a default IS only a default), 85 (toBeVisible ignores opacity), 86 (cancel every write a delete makes obsolete), 87 (an optimistic write and its commit must cancel as one), 88 (a guard that reads a client snapshot is not a guard), 89 (a locator matching several rows asserts about the wrong one), 90 (a rule added to a shared helper must reach every caller and sibling that encodes it), 91 (a fix falsified by hand is not a fix the suite protects), 92 (a test reading the wall clock reports the calendar), 93 (cleanup in a finally does not survive a killed process), 94 (a cleanup that ASSERTS a value cannot tell residue from policy — record what the value WAS), 95 (a read-modify-write of a whole document throws away whatever changed under it), 96 (a key built in one module and matched in another is a contract — build it in one place), 97 (a guard added for one field of a shared path must cover every field on it), 98 (testing one input to a decision is not testing the decision — pin what the caller does), 99 (a cleanup that identifies its targets by ABSENCE will one day delete everything), 100 (a source-text assertion proves a line exists, not that it runs), 101 (moving a guard to where it belongs can move it out of where it was tested), 102 (a pure helper extracted and tested still leaves whatever the caller computes before it), 103 (a tool that repairs damage is the last place a silent truncation is acceptable), 104 (a pin that cannot fail reads as coverage), 105 (a controlled input rendered from a parsed value cannot be typed into), 106 (an optional-guarded effect is an untested effect), 107 (a client guard and a database constraint keyed on the same columns guard nothing when those columns change)"
uncommitted: "all of it. Nothing committed, nothing pushed. Read the real counts with `git status --short`, never from this line"
verification-status: "rounds 1-19 all ran. ROUND 19 WAS A REAL FRESH-CONTEXT VERIFIER AND IT REFUTED THE MAIN SESSION'S CLEAN CLAIM WITH SIX FINDINGS. Rounds 5, the D65 batch, and 16-18 were run by the MAIN SESSION by hand rather than by a fresh-context subagent, which is weaker evidence and is marked as such. EVERY ROUND THAT RAN FOUND SOMETHING — the loop has never returned clean, and that is itself the finding. See section 7a"
superseded-as-entry-point-by: "[[2026-09-06 The Review Loop, Rounds One to Twenty]] — read that first; this note remains the RECORD of the design port, the requirement mapping, the four migrations, the eighty-one-row findings table and traps 77-107"
related:
  - "[[2026-09-06 The Review Loop, Rounds One to Twenty]] — the current entry point, superseding this note as a starting place only"
  - "[[Decisions]] — D1 to D78, the authority on what is authorised"
  - "[[Repository Evidence]] — the factual baseline, updated for this pass"
  - "[[Remaining Work and Owner Decisions]] — A1-A2, B1-B2, C1-C7"
  - "[[2026-09-04 Three Answers, and a Finding That Corrected Itself]] — phase 45, traps 72-76"
  - "[[2026-09-04 Exchange Rates, R7, and Two Agent Audits]] — traps 64-71"
  - "[[2026-09-03 Ten Closed, and a Backup Nobody Had Deployed]] — traps 1-63"
  - "[[2026-09-04 Owner Decision Brief, C5 to C7]] — C5, C6 and C7 in technical detail"
  - "[[Handoff Index]] — every handoff, newest first"
  - "[Supabase Schema](../supabase/README.md) — nineteen migrations"
up: "[[AI Agent Context]]"
---

# The Design Port, and Three Requirements the File Did Not Show

> **This note is no longer the entry point.** Start at
> [[2026-09-06 The Review Loop, Rounds One to Twenty]], which carries the round ledger for all
> twenty review rounds, the rate-limit history behind them, the current state and the one resume
> prompt. **This note is still the record** — and the only place holding the design port itself, the
> twelve client requirements mapped to `file:line`, the four migrations, the eighty-one-row findings
> table and traps 77-107. Nothing in it has been superseded except its role as a starting place.

**Current entry point and a complete continuation package.** Phase 46. A fresh chat resumes from
this file alone.

The session ported an updated Claude Design prototype into `apps/web`, applied two additive
production migrations, closed three client requirements a diff of the prototype had missed — and
then twenty-five rounds of adversarial review — and one day of the calendar — turned up **eighty-one
findings**: forty-seven code defects, one false delivery claim, seven documentation contradictions.
Most were in code written during this session, and **twenty-six of them were introduced by the fix
for the previous one**, nearly half. The tally is settled in [[Decisions]] D72. **§7a is the round
ledger and says how to resume — rounds 1-19 all ran and none came back clean. Rounds 16-18 were run
by the main session by hand and reported the work green; round 19, the first real verifier
afterwards, refuted that with six findings.**

That last clause is the most important thing in this document. §7 is why.

---

## 1. Dates, before anything else

This file is dated **2026-09-05**, the date in Manila where the owner works. Its migrations are
versioned `20260904155131` and `20260904204252` — **UTC**, because Supabase stamps them that way.
Both are right and refer to the same hours. Do not "fix" either to match the other.

---

## 2. How this session went, in order

| # | What happened | Outcome |
|---|---|---|
| 46.1 | Verification of the previous package | Everything held; `npm audit` ran clean for the first time since the registry outage |
| 46.2 | Read the updated prototype from Claude Design, diffed it against the 2026-08-31 export | 549 changed lines, 13 candidate items |
| 46.3 | Two owner decisions taken | Add the schema columns; PDF only, no PNG |
| 46.4 | Migration 1 applied (rehearsal → production) | `txns.src`, `txns.fee` |
| 46.5 | The port built | Sort, Export, sync bar, grids, notes, deadlines, e-cash charge, categories |
| 46.6 | **Owner supplied the client's written requirements** | Nine of twelve delivered; **three missed** |
| 46.7 | Migration 2 applied | `transfers.inv` |
| 46.8 | The three closed | Inv No, PNG export, the space-bar bug |
| 46.9 | Review round 1 | **Defect 1** — the fee-seeding leak (D52) |
| 46.10 | Review round 2 | **Defect 2** — orphaned payment dialog wrote nothing (D53) |
| 46.11 | Review round 3 | **Defect 3** — `saveEdit` subtracted from a retyped amount (D54) |
| 46.12 | Review round 4 | **Defects 4 and 5** — sign laundering, and Undo deleting a paid row (D55) |
| 46.13 | Review round 5 — **subagent died on a rate limit; run by hand instead** | **Defect 6** — the D55 fix widened a parser for seven unguarded callers (D56) |
| 46.14 | Documentation sweep, broken links repaired | 0 broken links vault-wide |
| 46.15 | Review round 6, plus a parallel main-session sweep on the surfaces it was fenced off from | **Defects 7, 8 and 9** — duplicate Generate, a fortnightly rule that was not fortnightly, and mouse-only reminder controls (D57). The parallel sweep found nothing, and records what it tried |
| 46.16 | Review round 7, plus a main-session `app_config` sweep | **Findings 10-13** — a false delivery claim on requirement 8 (D58), an armed write surviving a delete, a hard-coded forecast horizon, and a spec that could not fail (D59) |
| 46.17 | Review round 8 | **Finding 14** — the round-7 fix left the optimistic paint behind, so screen and ledger disagreed (D60). Six precise doc errors enumerated and fixed |
| 46.18 | Review round 9 | **Finding 15** — a client-snapshot guard let a masterlist edit overwrite a row another session had paid (D61). Three doc contradictions fixed |
| 46.19 | Review round 10 | **Findings 16 and 17** — Undo deleting a row another session paid, and the evidence note contradicting `playwright.config.js` (D62) |
| 46.20 | Review round 11 | **Findings 18-20** — Generate could duplicate a month of liability; Undo's banner cleared too early; its toast claimed a reason it could not know (D63). A third migration applied |
| 46.21 | Review round 12 | **Findings 21-23** — a refused edit reported as saved, a phantom month from an unguarded async Generate, and three stale migration counts (D64) |
| 46.22 | The three items round 12 had recorded rather than fixed | **Findings 24-26** closed: money CHECK constraints in the database, paged reads, a scheduler that survives a refused batch (D65). A fourth migration applied |
| 46.23 | Review round 13 | **Findings 27-32** — two CHECK constraints that disagreed with each other, an unvalidated rate, offset paging, a guard claimed after its await, and a stale baseline count (D66) |
| 46.24 | Review round 14 | Keyset pager **verified correct** live at five page sizes. **Findings 33-37** — the zero rule applied to one caller and not its three siblings, plus a stale doc count (D67) |
| 46.25 | Review round 15 | `forecast`/Generate agreement **proven exhaustively** (4,000 cases, 0 mismatches). **Findings 38-43** — the zero rule wrong in four more places, and **three of D67's four fixes had no test at all** (D68) |
| 46.26 | Review round 16 dispatched | **DIED on a session rate limit before reading any code.** No mutation left behind — verified |
| 46.29 | Round 16 dispatched a second time | **DIED on the WEEKLY rate limit**, output only *"I'll start by reading the actual code under verification."* Verified it had not run Playwright and had left no setting held |
| 46.30 | Rounds 16, 17 and 18 run **by the main session by hand** | Subagents unavailable for the rest of the week. Four findings (46-49), all four inside the previous round's fix. Weaker evidence than a verifier, marked as such |
| 46.31 | `normaliseToggledSettings` replaced by `hold` + `releaseHeldSettings` | Records what a setting **was** instead of asserting what it should be; written through `merge_app_config`. Proved live in four cases including an owner-set ON |
| 46.33 | Round 19 — the first real `verifier` after the weekly limit reset | **REFUTED the main session's clean claim: six findings** (50-55), one on the money path, two leaving the owner's live config unrepairable by anything in the suite. All six fixed; `restoreConfig` deleted, `hold` generalised to config paths, `pushKey` imported where the key is armed, `e2e/held.test.js` added, `pushable` extracted and guarded for every field |
| 46.34 | Round 20 dispatched against round 19's own fixes | Running at the time of writing |
| 46.32 | State after round 18 | `npm test` 134/134 · e2e 48 passed · security 56/0 · audit 0 · build green · ledger `f9f84adad1c9b5c4fa3e3495712ac09f` unchanged · `__e2eHeld` null · 0 `E2E-` residue |
| 46.27 | The date rolled to 2026-09-06 | **Finding 44** — a clock-dependent unit test went red overnight with no code change (D69) |
| 46.28 | Stop-hook pushback: the two open coverage gaps | **Finding 45** — a killed run left `ackRequirePhoto` ON in the owner's live config. Both gaps closed: `pageAll` and `createPending` extracted and tested, 131 assertions (D70) — round 16 later found three of those twelve tests did not fail under mutation |

---

## 3. What was asked for, and where each piece lives

Twelve client requirements. **Eleven fully delivered; requirement 8 is five-sixths there** — see the
row below and D58. Each row names a place to open rather than a claim to take on trust.

| # | Requirement | Where |
|---|---|---|
| 1 | Smaller text, retuned columns | `screens/Tracker.jsx` `COLS`, `screens/Masterlist.jsx` `COLS`, `styles.css` `.sheet.tight` |
| 2 | Sort button | `screens/Tracker.jsx`, the `menu-anchor` block |
| 3 | Masterlist linked into Tracker and Upcoming Deadlines | `screens/Tracker.jsx` sync bar; `screens/Dashboard.jsx` `forecast` |
| 4 | Export tracker summary to PNG **and** PDF | `screens/Tracker.jsx` export menu; `actions.js` `exportPng` / `exportPdf` |
| 5 | Deadlines as `Due date – Category – N transactions – Total` | `screens/Dashboard.jsx`, the bucket loop |
| 6 | Edit and delete notes on the dashboard | `screens/Dashboard.jsx` note row; `actions.js` `editNote`/`removeNote` |
| 7 | Optional Additional Charge on E-cash, added into the amount | `modals/PayMethod.jsx`; `actions.js` `confirmPay` |
| 8 | Six new expense categories | `data.js` `CAT`, now 19 — **but see [[Decisions]] D58: `CAT` is only the default. Production's stored list holds five of the six; `Refund` is still missing and needs adding in Settings** |
| 9 | Sort by Company / Category / Due date | `logic.js` `SORTS` |
| 10 | `Inv No`, alphanumeric, beside the note | `screens/Telegraphic.jsx`, `modals/AddTransfer.jsx`, `modals/EditTransfer.jsx` |
| 11 | Space bar must not open the transaction | `screens/Telegraphic.jsx` (5 guards), `AckRec.jsx` (4), `Tracker.jsx` (1) |
| 12 | Clicking outside a form must not discard it | `ui.jsx` — the backdrop carries no close handler |

Requirement 9 offered per-column filters **or** a button beside Filters. The button was built, which
is the branch the requirement allows.

---

## 4. The lesson that started it: a design file is not a requirement

The port was built by diffing the updated prototype against `company_tracker/ERP Prototype.dc.html`,
the 2026-08-31 export the app was transcribed from. 549 changed lines. It looked complete.
**Nine of twelve is what a careful diff of the right file still gets you.**

`Inv No` is the clearest case: the prototype draws a whole Telegraphic screen, the app already had
one, so the block was triaged as shipped without reading down its columns — and `Inv No` is a column
inside it. **PNG export** was a reasoning failure, not a reading one: the prototype loads
`html2canvas` from a CDN that `script-src 'self'` blocks, so it was dropped. The premise was right
and the conclusion wrong — *bundled*, the library is same-origin. **The space bar** could not have
come from the file at all; it is a bug report about the running app.

**Trap 77: a prototype shows what a screen looks like, never what was asked for.** Ask for the
written requirements before treating a diff of a design file as the scope.

One item resolved itself: "mapindot ko lang yung outside ng box, nag-eexit agad" turned out to be
the backdrop-close removal already shipped as a design change. It is a bug report, not an aesthetic.

---

## 5. The four migrations

All additive. All applied to `tracker-rehearsal` (`bucmcnsjkuprpojhequy`) and verified there
before production (`jusifpditdigqdjiwdaj`). Both byte-verified by MD5 against
`supabase_migrations.schema_migrations`.

| Version | Adds | MD5 |
|---|---|---|
| `20260904155131_masterlist_link_and_ecash_fee` | `txns.src`, `txns.fee` | `c939be7002ed31bcb16ae1f03a1f7495` |
| `20260904204252_transfer_invoice_number` | `transfers.inv` | `91295f897dd77b44b4f25e6969587dda` |
| `20260905094348_one_generated_row_per_due_date` | a partial unique index on `(src, due)` | `cf47c511351ba690ebb5bd5020688248` |
| `20260905143255_money_constraints` | seven CHECK constraints across four ledger tables | `eb35c6a40a92e9d20d6fd322496f8a72` |

`txns.src` is a foreign key to `recurring(id)` with **ON DELETE SET NULL**, so removing a masterlist
rule unlinks the rows it produced rather than deleting them — enforced by Postgres, not the client.
`txns.fee` is the e-cash charge, folded into `amount` and kept separately. `transfers.inv` is text,
NOT NULL, default `''`, modelled on `note` rather than on `rate`: `rate` uses null for "never
priced" and an invoice number has no such state.

**No policy, function, trigger or table was created, dropped or altered.** The only privilege change
was adding the new column names to the existing column-level grants. For `transfers` that grant was
**purely additive, with no revoke**, because the table holds no table-wide INSERT/UPDATE for
`authenticated` — re-listing the columns would have risked dropping `rate` and `rate_as_of`.
Verified before writing: `table_privileges` returned none.

Neither wrote to a row: `src`/`fee` populated on **0** of 49 `txns`, `inv` on **0** of 9 `transfers`.

**Neither file carries a `-- rollback:` block**, which its own convention in `supabase/README.md`
requires. Not retrofitted — byte-identity with the stored statement is the stronger rule — so both
rollbacks are written out in that README instead, with the cost of the gap stated.

---

## 6. THE `txns` FINGERPRINT MOVED, AND NOT BECAUSE DATA CHANGED

Read this before comparing it against anything.

**`21a63ffeb6368cd06257f17a9aa01a49` → `f9f84adad1c9b5c4fa3e3495712ac09f`**, with `count(*)` still
**49** and `sum(amount)` still **₱2,226,438.00**.

The recipe, spelled out because a baseline you cannot recompute is not a baseline:

```sql
select md5(string_agg(t::text, chr(10) order by t.id)) from public.txns t;
```

`t::text` serialises the whole row, so two new empty columns changed every row's *text* while
changing no row's *data*. The query that separates the two cases:

```sql
select count(*) from public.txns where src is not null or fee is not null;   -- 0
```

`f9f84adad1c9b5c4fa3e3495712ac09f` is the new baseline, and it is still a **moving** one — the owner
enters payables daily. Read it at the start of your session as *your* baseline, assert it unchanged
across *your own* writes, and never sweep, restore or rewind to make it match a document.

---

## 7. Eighty-one findings, twenty-five rounds, a calendar and a killed process

Every one is the same shape: **state that outlives the thing it was derived from.** Trap 80.

| # | Round | What broke | Whose | Decision |
|---|---|---|---|---|
| 1 | 1 | `payFee` seeded at 2 of the payment dialog's 3 openers. After a reload the dialog opened empty and confirming **deleted a recorded charge**; mid-session it held another row's charge and **moved it onto this row** | this session | [[Decisions]] D52 |
| 2 | 2 | Dialogs stack; both bound Escape on `window` and the **outer won**, orphaning the payment dialog over an empty screen. Confirming from the orphan **wrote nothing at all** — no toast, no error | pre-existing; D49 made the orphan harder to dismiss | D53 |
| 3 | 3 | `saveEdit` subtracted `edit.fee` from a **retyped** amount. ₱550 row set to Pending, amount retyped `2000`, saved **1950** | this session — in the one change made on judgement rather than copied | D54 |
| 4 | 4 | The D54 fix produced a negative intermediate, and `amountOf` **stripped the sign**, storing the absolute value. Screen `-50`, ledger `50` | this session, inside the fix for #3 | D55 |
| 5 | 4 | `undoGenerate` deleted by id with no check, so Generate → **Review them** → Mark as paid → Undo **deleted a paid transaction** and reported "Generated rows removed" | pre-existing | D55 |
| 6 | 5 | The D55 fix made `amountOf` sign-aware, which widened it for **seven callers still testing `!amt`**. A negative e-cash charge **reduced a payable**; a negative liquidation was storable; a negative masterlist amount **pushed down onto linked rows** | this session, inside the fix for #4 | D56 |
| 7 | 6 | Generate's dedupe key used the **description**, which the Masterlist push-down rewrites. Re-running Generate after a description edit wrote **duplicate ledger rows** — ₱10,000 of phantom liability on one payable — and the sync line counted rows already on the sheet | pre-existing, exposed by the push-down this session added | D57 |
| 8 | 6 | Weekly and Bi-weekly shared a branch that reset the phase each month, so a fortnightly payable **never generated the owner's own date** and produced a **7-day gap** at month boundaries | pre-existing | D57 |
| 9 | 6 | The new reminder Edit/Delete buttons rendered only on mouse hover — absent from the DOM, unreachable by keyboard or touch. **The first fix hid them with `visibility: hidden`, which removes an element from the accessibility tree and the tab order** — the same defect in CSS | this session, and again inside its own fix | D57 |
| 10 | — | Requirement 8 reported as delivered when it was not: `CAT` in `data.js` is only a **default**, and `db.js` reads `cfg.categories \|\| initialState.categories`, so a stored list outranks it. Production holds five of the six; **`Refund` is still missing** | this session's claim, not its code | D58 |
| 11 | 7 | `removeRec` cancelled the payable's own debounced write but **not the push-down**, so deleting a payable inside the 500 ms window wrote an **amount** to ledger rows whose payable no longer existed — right after saying they were unlinked | this session | D59 |
| 12 | 7 | `forecast`'s 30-day horizon was hard-coded while the Dashboard window goes to **90**, so the masterlist half of the deadline list stopped short across two thirds of the widest window | this session | D59 |
| 13 | 7 | The keyboard-reachability spec asserted `toBeVisible()`, which **ignores opacity** — it passed green with the focus reveal deleted and the button fully transparent. **A spec that could not fail** | this session | D59 |
| 14 | 8 | D59's fix cancelled the queued database write but **not the optimistic paint**, so deleting a payable mid-edit left the Tracker showing ₱999,999 while the ledger correctly held ₱700 — **screen and record disagreeing, with nothing to contradict it until a reload** | this session, inside the fix for #11 | D60 |
| 15 | 9 | The "never rewrite a completed row" guard read `state.txns`, **a snapshot from page load with no realtime subscription** — so a row another session had paid was still `pending` here, and a masterlist keystroke overwrote **the amount of an already-paid payable**. Exposure was the age of the tab, not 500 ms | pre-existing, and the most serious of the sequence | D61 |
| 16 | 10 | The **same shape in `undoGenerate`**, which is a DELETE: it promises in its own toast to keep anything already paid, filtered the same stale snapshot, and **deleted a completed transaction with its payment record**. Worse than #15 — a wrong amount is discoverable, a removed row is not | pre-existing | D62 |
| 17 | 10 | `docs/Repository Evidence.md` — "the factual baseline" — claimed `workers: 1` was *proposed and not applied* while `playwright.config.js:43` sets it and both policy files say so. **A present-tense contradiction of a file anyone can open** | pre-existing | D62 |
| 18 | 11 | **Generate's dedupe was JavaScript-only and asked a stale snapshot, and no unique index existed.** Postgres accepted a duplicate. The scheduler writes the month unattended, so a tab opened that morning could **duplicate a whole month of liability on one click** | pre-existing; the one bulk write D62's sweep did not enumerate | D63 |
| 19 | 11 | Undo's banner was cleared **before** its delete resolved, and the banner is the only route to `undoGenerate` — a failed delete left the rows in the ledger and Undo **permanently unreachable** | this session, inside the D62 fix | D63 |
| 20 | 11 | The Undo toast asserted rows were "already paid" when they might have been **deleted** by another session — the toast promising what the database never said | this session, inside the D62 fix | D63 |
| 21 | 12 | The D63 index refuses a **legitimate** due-date move onto a sibling occurrence, and `saveEdit` flashed **"Transaction updated"** anyway — screen showed the new date, Postgres kept the old, and the error toast was overwritten by the success one | this session, inside the D63 fix | D64 |
| 22 | 12 | Making `generate` async gave it no busy state, so a second click could rebuild the same rows and have the index **abort the whole batch** — leaving a **phantom month** on screen under a banner that does not expire, with Undo unable to clear it | this session, inside the D63 fix | D64 |
| 23 | 12 | `supabase/README.md` said eighteen migrations in one place and fifteen in two others; `docs/Repository Evidence.md` said the folder held twelve | pre-existing and this session | D64 |
| 24 | 12 | **No money rule existed in the database.** `amount > 0`, `fee >= 0`, `actual >= 0` lived only in the browser; `pg_constraint` had no CHECK on any ledger table. Every invariant twelve rounds asserted was defended by nothing but the client | pre-existing | D65 |
| 25 | 12 | `read()` and `freshTxns()` used a plain `.select('*')`, which **PostgREST truncates at 1,000 rows with no error** — making rows past the cap invisible to Generate's dedupe, which since D63 means a `23505` that aborts the batch | pre-existing | D65 |
| 26 | 12 | `scripts/schedule.mjs` had a bare top-level `await insertTxns`, so one `23505` **exited the nightly job before the overdue report, the summary and the sign-out** — losing its whole purpose over a row already correct in the ledger | pre-existing, exposed by D63 | D65 |
| 27 | 13 | `updRec` pushed the clamped **0** from a cleared Amount field into `txns.amount`, which D65's own CHECK forbids — an ordinary keystroke raising a raw Postgres string | this session, inside the D65 fix | D66 |
| 28 | 13 | `buildGeneratedRows` emitted a **0-amount row**, so one unpriced payable made Postgres refuse the whole month — including in the unattended job, which rethrows anything but 23505 | this session, inside the D65 fix | D66 |
| 29 | 13 | A negative `transfers.rate` had **no form validation**, so 23514 arrived through fire-and-forget `save()` and the sheet kept showing a rate Postgres refused | pre-existing, exposed by D65 | D66 |
| 30 | 13 | `readAll` used **offset paging** — a row inserted between pages duplicates one and hides another, **and the exact count still matches**, so the loop believes it is complete | this session, inside the D65 fix | D66 |
| 31 | 13 | The `generating` flag was claimed **after** the await it guards, leaving a round trip in which a second click passed it | this session, inside the D64 fix | D66 |
| 32 | 13 | `docs/Repository Evidence.md` — the designated factual baseline — still said eighteen migrations, and named none of the four added that day | this session | D66 |
| 33 | 14 | `forecast` did **not** apply D66's zero rule while `buildGeneratedRows` did, so the sync line and the Dashboard counted a payable Generate would refuse | this session, inside the D66 fix | D67 |
| 34 | 14 | `generate`'s unpriced guard scanned the **whole masterlist**, so one unpriced December payable blocked September, October and November permanently | this session, inside the D66 fix | D67 |
| 35 | 14 | `scripts/schedule.mjs` had **no** unpriced guard — the unattended job dropped payables silently and reported the month complete | this session, inside the D66 fix | D67 |
| 36 | 14 | `updRec` stopped pushing a non-positive amount but never **cancelled the push already armed**, so a typed-then-cleared value stuck on the linked rows | this session, inside the D66 fix | D67 |
| 37 | 14 | `docs/Handoff.md` said six fix-induced defects where every other current source said nine | this session | D67 |
| 38 | 15 | `generate`'s unpriced guard **was never necessary** — and because a Monthly payable occurs every month, one unpriced row blocked Generate for **all thirteen months**, priced siblings included | this session, inside the D67 fix | D68 |
| 39 | 15 | The sync bar announced **"In sync with the Masterlist"** while a payable sat due and unwritable — an over-count traded for a false all-clear | this session, inside the D67 fix | D68 |
| 40 | 15 | The sync bar's Generate button was a **dead end**: it counted 1 writable, offered the button, and the click was refused over a payable the bar did not show | this session, inside the D67 fix | D68 |
| 41 | 15 | `schedule.mjs`'s unpriced filter stayed **unscoped** while `generate`'s became month-scoped — the 22:00 job named a December payable during a September run | this session, inside the D67 fix | D68 |
| 42-43 | 15 | Three documents recorded three different Playwright counts (45, 47, 48), none agreeing; `Repository Evidence` had no round 13 or 14 entry | this session | D68 |
| 45 | **a killed process** | An e2e spec toggles `ackRequirePhoto` in the **owner's live config** and restores it in a `finally`. Round 16's verifier was **killed** by the rate limit, so `finally` never ran and the flag stayed ON — **the owner could not liquidate a receipt without attaching a file**, a rule they never chose. The `beforeAll` fix for this is itself finding 46 | pre-existing | D70, then D71 |
| 46 | 16 | The trap-93 fix **traded one failure for another**. `normaliseToggledSettings` forced `ackRequirePhoto: false` whenever it was not false — but `src/data.js` says in as many words that turning it on **is a policy decision**. An owner who deliberately turned it on would have had the nightly `verify.yml` run quietly turn it off again. A suite cannot tell residue from policy by looking at a value | this session, inside the D70 fix | [[Decisions]] D71 |
| 47 | 16 | Mutation testing of the twelve new `pending.js` tests: **three mutants survived**. `keyOf` dropping the table name passed all twelve, though `transfers` and `recurring` carry independent id sequences, so a shared key would let a keystroke in one **cancel the other's unsaved write**; and nothing pinned `DELAY` at 500ms, because every test imports it | this session, inside the D70 fix | D71 |
| 48 | 17 | The finding-46 fix wrote the marker with a **whole-document read-modify-write** — the exact lost update `merge_app_config` exists to prevent, documented at `src/db.js:315`. An owner changing any setting mid-run would have had it thrown away | this session, inside the D71 fix | D71 |
| 49 | 18 | Two **silent** no-op paths in the new `hold`: a missing config row threw a bare `TypeError`, and a `merge_app_config` that touched no row was never checked — either one leaves the toggle held with nothing recording it, which is trap 93 again | this session, inside the D71 fix | D71 |
| 50 | 19 | A **third** spec mutated the owner's live config — `dashWindow`, via the Settings UI — and never called `hold`. A killed run left the owner's dashboard stuck on `Next 7 days`, hiding every payable due 8-30 days out. `CLAUDE.md` said "two specs"; three did | this session, inside the D71 fix | [[Decisions]] D72 |
| 51 | 19 | A **fourth** spec adds an `E2E###` code to the shared `companies` list. Worse than 50: `hold` recorded **settings only**, `releaseHeld` could patch nothing else, and `cleanup` never touches `app_config` — so a killed run left a test company in every dropdown in the app **with nothing able to remove it** | this session, inside the D71 fix | D72 |
| 52 | 19 | `actions.js:697` built the push-down key **by hand** — `'push:' + id + ':' + k` — while both cancel paths used `pushKey`. Changing `pushKey`'s format left the suite **fully green** with `cancelPush` and `cancelForRecurring` matching nothing, reinstating D59 and D67 verbatim: a deleted payable's push-down still fires 500ms later onto live ledger rows | this session, inside the D70 fix | D72 |
| 53 | 19 | Two more surviving mutants in `pending.js`: removing `timers.delete(key)` on fire, and moving it **after** `run()`, both left 134/134 green. The first makes `armed()` — the seam every other test reads — report fired writes as pending; the second strands the key when a write throws | this session, inside the D70 fix | D72 |
| 54 | 19 | `hold` and `releaseHeld` had **zero tests**. Deleting either function's entire body left the suite green — the deletion experiment of trap 91, applied to rounds 16-18's own work | this session, inside the D71 fix | D72 |
| 55 | 19 | `updRec`'s `pushable` guard covered **only `amount`**. Clearing a payable's Description pushed `description: ''` onto every linked open Tracker row — accepted silently, because `txns.description` is `not null default ''` with no emptiness check — then the toast claimed the rows had been updated to match, and the audit log recorded it | pre-existing | D72 |
| 56 | 20 | Round 19 extracted `pushable` and tested it — and `updRec` could be edited to **stop consulting it** with `npm test` still at 147. Deleting `&& pushable` from the target selection made a cleared Description travel onto live linked rows again. **Testing one input to a decision is not testing the decision** | this session, inside the D72 fix | [[Decisions]] D73 |
| 57 | 20 | Same shape: `if (!pushable) cancelPush(id, k)` — the D67 retraction — could be **deleted with the suite green**. Type `500`, backspace it within 500ms, and the armed write still fires with the number the user took back | this session, inside the D72 fix | D73 |
| 58 | 20 | `'settings' in cfg` is true, so `hold(['settings'])` validated — and `releaseHeld` then wrote the held settings object **over its own `__e2eHeld: null` clear**, restoring the marker forever **while returning a success list**. The invariant "`__e2eHeld` must be null when you finish" could never again be met | this session, inside the D72 fix | D73 |
| 59 | 20 | Both `app_config` reads in `hold`/`releaseHeld` **discarded `error`**, while every other reader in the file throws. A transient 5xx or an expired token made `releaseHeld()` return null and the spec pass green — leaving `ackRequirePhoto` ON in the owner's live config with nothing reporting it. Trap 93 by a different road | this session, inside the D71 fix | D73 |
| 60 | 20 | Round 19 deleted `restoreConfig` for doing a whole-document config write; the duplicate-warning spec was **still doing that exact write inline**, bypassing `merge_app_config` and its viewer guard | pre-existing, missed by round 19 | D73 |
| 61 | 21 | **DESTRUCTIVE.** `cleanupOrphanFiles` identified orphans by **absence from a list** — a `receipts` read whose `error` it discarded and defaulted to `[]`. One transient 5xx and **every receipt file in the owner's live bucket** is classified an orphan and deleted, backup-proof attachment included. The `remove()` error was discarded too, so it reported success | pre-existing, and outside the scope every prior round checked | [[Decisions]] D74 |
| 62 | 21 | The same read was **unpaged**. `src/db.js` routes receipts through `pageAll` precisely because the table outgrows PostgREST's silent 1000-row cap; the sweep used a plain `.select()`. At 1001 receipts every attachment past the cut is deleted on the next run, and it worsens daily | pre-existing | D74 |
| 63 | 21 | **Trap 98 was not closed.** Nothing imports `src/actions.js`, so two call-site mutants survived at 156/156: deleting the `cancelPush` retraction, and rebuilding the patch as `{ [k]: val }` — `desc` is stored in `description`, so every description push-down would have returned 400 | this session, inside the D73 fix | D74 |
| 64 | 22 | **A source-text pin cannot see statement order.** `retract` and a null `patch` are the same predicate, so moving `if (!plan.patch) return` above `if (plan.retract) cancelPush(id, k)` makes the cancellation **unreachable for every field and value** — with all four source assertions still matching. D67 reinstated. A second mutant survived alongside it: the optimistic repaint keyed off `plan.column` instead of `k`, so `desc` never repaints while the toast says the rows match | this session, inside the D74 fix | [[Decisions]] D75 |
| 65 | 22 | **The D74 fix moved the guard out of the only layer that had coverage.** Nothing imports `src/db.js` — it builds the live client at module scope — so deleting **both** `.eq('src', src)` and `.neq('status','completed')` from `patchTxns` left `npm test` green. One masterlist keystroke would then issue `PATCH /txns` **with no filter at all**: every row in the shared ledger, completed included, set to that amount, with the toast reporting 49 rows updated | this session, inside the D74 fix | D75 |
| 66 | 22 | The tag-scoped sweep leaks orphans **permanently** — a failed remove, or a kill between the row delete and the file remove, and no later sweep can find them. The deliberate trade D74 made, now written down instead of implied | this session, inside the D74 fix | D75 |
| 67 | 23 | **The restore tool read `audit_log` unpaged.** PostgREST caps at 1,000 silently; `backup.mjs` carries that exact scar in its own comment and pages, `src/db.js` pages everything — `rewind.mjs` did neither. `planRewind` keys on the first entry per row, so a row whose first post-cut change fell past the cut produces **no step at all**. Measured on production: 7,419 rows qualified, it reported **1000**, and printed a confident count for a plan missing 6,419 changes | pre-existing, never in any round's scope | [[Decisions]] D76 |
| 68 | 23 | The round-22 recorder checked only `select()`'s **first argument**, so `select('id', { head: true })` passed while making both builders return nothing — the ledger changes and the screen never repaints; on undo the toast claims "0 removed" about rows the database did delete | this session, inside the D75 fix | D76 |
| 69 | 23 | The `indexOf` **ordering** assertion was defeated by a comment: comment out the real `cancelPush`, re-insert it below the early return, and the ordering still holds while the statement is unreachable | this session, inside the D75 fix | D76 |
| 70 | 23 | Three more `updRec` mutants: dropping `Math.max(0, …)` puts a **negative payable** in the ledger and the totals; storing the raw input sends a string to a numeric column; deleting `if (!written.length) return` flashes "0 open Tracker rows updated to match" | pre-existing | D76 |
| 71 | 23 | **The dichotomy D75 accepted was false.** Read the tagged rows' paths, remove the files, *then* delete the rows: a kill leaves the rows tagged and the next sweep retries. Neither leak nor data loss. `src/smoke.mjs` had the same ordering with a comment claiming the opposite | this session, inside the D75 fix | D76 |
| 72 | 24 | **A root-cause miss on D76's own fix.** Round 23 paged the *restore* tool and left the *backup* tool on `OFFSET` with no `ORDER BY` — the method `src/pending.js` calls broken in its own words, including *"an exact count still matches"*, which is exactly why `backup.mjs`'s count assertion could not catch it. The owner uses the ledger while the 06:00 and 18:00 snapshots run, and a corrupt backup is discovered only when it is needed | this session, inside the D76 fix | [[Decisions]] D77 |
| 73 | 24 | `pageAll` hard-coded `row.id` as its cursor, so paging `profiles` (keyed `user_id`) carried `undefined` forward and **looped forever**, growing `rows` without bound | this session, inside the D76 fix | D77 |
| 74 | 24 | **The source-text pins were defeated three ways** — a commented-out copy of a pinned line, a string literal holding the same text, and `if (state.readOnly)` prefixed to a pinned statement — each leaving the suite green while the push-down cancellation became unreachable. A fourth mutant, `db.updateRecurring` → `db.insertRecurring`, was never pinned at all | this session, inside the D75/D76 fixes | D77 |
| 75 | 24 | The `queries.js` recorder was blind to **appended** builder methods: `.single()` makes `written.length` undefined so every push-down is swallowed silently; `.limit(1)` updates one linked row instead of all | this session, inside the D76 fix | D77 |
| 76 | 24 | **The Masterlist Amount field could not accept a typed decimal.** Controlled from a store that holds a *number*: `1250.50` typed key by key gave `1250.` → parsed `1250` → React restored `"1250"` → the rest produced **125050**, a hundredfold payable that then pushed down onto every linked Tracker row. Pasting worked; typing did not. **Twenty-three rounds missed it** | pre-existing | D77 |
| 77 | 24 | `amountOf('1e3') === 13` and `amountOf('1.2.3') === 1.2` — declared, not fixed, and handed to round 25 to judge whether the draft makes them reachable | pre-existing | D77 |
| 78 | 25 | **Money, unattended.** `alreadyOnSheet` matched a generated row by exact `due` — the same key as the D63 unique index — so the index could not catch what the index and the client agreed to disagree about. **Move a due date and the occurrence looks missing again**: the 22:00 job inserts a second row and reports `Added 1 payable(s)`. One ₱5,000 bill, ₱10,000 of liability. Undo cannot help, and both the Dashboard and the sync line invited a human to repeat it by hand | pre-existing, never in any round's scope | [[Decisions]] D78 |
| 79 | 25 | Fixing 78 exposed a second: `alreadyOnSheet`'s shape-match fired for rows whose `src` belonged to a **different** payable, so two payables sharing company, category, description and period silently suppressed each other's generation | pre-existing | D78 |
| 80 | 25 | **The `fx_rates` exception was justified by a claim its own ordering made false.** Ordered by `cur` first, and `fx.mjs` writes one row per currency per day — so every run inserts at four points through the ordering, later pages shift, and `rows.length` still equals `count`. `as_of` first makes the append-only claim true | this session, inside the D77 fix | D78 |
| 81 | 25 | The decimal fix was **unpinned offline**: `if (fx.draft) fx.draft(v)` is optional-guarded and the spy factory never built `draft`, so deleting the line left the suite green and restored the hundredfold bug | this session, inside the D77 fix | D78 |
| 44 | **the calendar** | A unit test read the **wall clock**: `eff({due: '2026-09-05'})` was `pending` on the 5th and `overdue` on the 6th, so `npm test` went 118/118 → 117/118 **overnight with no code change**. Sixteen rounds of review missed it; one day of real time found it | pre-existing | D69 |

**Forty-two of the eighty-one were introduced by the fix for the previous defect.** Findings 46-49 were
four, 50-54 five more, and 56-59 four more again. That is the finding, more than any individual bug, and it
is why the loop has never returned clean.

**Rounds 19 and 20 are the strongest evidence in this document for using a fresh-context subagent
rather than self-review.** Round 20 then refuted round 19 in turn, four of its five findings sitting
inside round 19's fixes — and twice in a row the miss had the same shape: a helper extracted and
tested on its own, with nothing proving its caller still used it.

**Round 19 refuted three rounds of self-review.** Rounds 16-18 were run by the main session by hand and reported the work clean.
Round 19 — a real `verifier`, first available once the weekly limit reset — refuted that in one
pass with **six** findings, including a money-path defect (52) and two live-config defects (50, 51)
that self-review had walked past three times. Do not accept a main-session round as equivalent.

### Why the suites did not catch them

Each defect was invisible to the exact invariant that should have caught it:

- #4 and #6: sign-stripping meant a negative could never *reach* Postgres, so `amount < fee` stayed
  at 0 and every suite stayed green. The invariant was structurally incapable of failing.
- #5: paying by Cash leaves no `fee`, so every fee-based invariant stayed clean.
- #2: the orphan wrote nothing, so nothing was there to assert on.

**Trap 81: widening what a shared parser accepts widens it for every caller, including the ones you
did not look at.** Grep for the function, not for the bug.

### What the fixes have in common

None is a guard at the call site that failed. Every one moves the rule to a single place:

- `paySeedFor` — the only thing that opens the payment dialog for an edit (D52).
- `useEscapeToClose` + a modal stack — the only thing that binds Escape (D53, D54).
- The charge comes off in `setEditStatus`, visibly; `saveEdit` does no arithmetic (D54).
- `positiveAmountOf` — the only thing a writer calls for a typed amount (D56).

---

## 7a. THE ROUND LEDGER — where the loop stopped and how to resume it

**Rounds 1-18 all ran. None came back clean.** Round 16 was dispatched to a subagent twice and
died both times — first on the session rate limit, then on the **weekly** limit, having output only
*"I'll start by reading the actual code under verification."* Neither attempt mutated anything.
With subagents unavailable, rounds 16, 17 and 18 were then run **by the main session by hand**.
That is weaker evidence than a fresh-context verifier and is marked as such in the table.

**The loop has still never returned clean.** Twenty-five rounds, twenty-five that found something, and no round has yet survived the next one.

**Read this before trusting any round run by the main session.** Rounds 16, 17 and 18 were run by
the main session by hand because the weekly rate limit had blocked every subagent, and they ended
by reporting the work green. Round 19 was the first real `verifier` after the limit reset, and it
refuted that immediately with six findings — one on the money path, two leaving the owner's live
config in a state nothing in the suite could repair. Self-review found four defects across three
rounds; one fresh context found six in a single pass. A main-session round is a stopgap, never a
substitute.

| Round | Ran as | Findings | Decision |
|---|---|---|---|
| 1 | subagent | 1 — `payFee` seeded at 2 of 3 dialog openers | D52 |
| 2 | subagent | 1 — stacked dialogs; Escape orphaned the payment dialog, confirming wrote nothing | D53 |
| 3 | subagent | 1 — `saveEdit` subtracted `edit.fee` from a retyped amount | D54 |
| 4 | subagent | 2 — sign laundering; Undo deleted a paid row | D55 |
| 5 | **main session by hand** (subagent hit the rate limit) | 1 — the D55 fix widened a parser for 7 unguarded callers | D56 |
| 6 | subagent | 3 — duplicate Generate; bi-weekly phase; mouse-only reminder controls | D57 |
| 7 | subagent | 3 — a refused edit reported as saved; a phantom month; a spec that could not fail | D58, D59 |
| 8 | subagent | 1 — the round-7 fix left the optimistic paint behind | D60 |
| 9 | subagent | 1 — the completed-row guard read a client snapshot | D61 |
| 10 | subagent | 2 — Undo deleted a row another session paid; a doc contradicting `playwright.config.js` | D62 |
| 11 | subagent | 3 — Generate's dedupe had no index; Undo's banner cleared too early; its toast claimed a reason it could not know | D63 |
| 12 | subagent | 3 — a refused edit reported as saved (again, new path); an async Generate phantom month; 3 stale migration counts | D64 |
| — | **main session, after Stop-hook pushback** | 3 — no money CHECKs in the database; un-paged reads; a scheduler that died whole | D65 |
| 13 | subagent | 6 — two CHECKs that disagreed about zero; an unvalidated rate; offset paging; a guard claimed after its await; a stale baseline | D66 |
| 14 | subagent | 5 — the zero rule applied to one caller and not three siblings; a stale doc count. **Keyset pager verified clean** | D67 |
| 15 | subagent | 6 — the zero rule wrong in four more places; **three of D67's four fixes had NO test at all** | D68 |
| **16** | **main session by hand** (subagent died twice — session limit, then the weekly limit) | 2 — the trap-93 fix clobbered an owner policy setting; three mutants survived the new `pending.js` tests | D71 |
| **17** | **main session by hand** (weekly limit still in force) | 1 — the finding-46 fix used a whole-document write, the lost update `merge_app_config` exists to prevent | D71 |
| **18** | **main session by hand** (weekly limit still in force) | 1 — two silent no-op paths in the new `hold`, either of which is trap 93 again | D71 |
| **19** | **fresh-context `verifier` subagent** (weekly limit reset) | **6** — a third and a fourth spec mutating the owner's live config unheld and unrecoverable; a hand-built push-down key that silently broke both cancel paths; two more surviving `pending.js` mutants; `hold`/`releaseHeld` with zero tests; a push-down guard covering one field of four | D72 |
| **20** | **fresh-context `verifier` subagent** | **5** — two of round 19's own guards deletable with the suite green; `hold(['settings'])` wedging the marker forever while reporting success; a swallowed read error reaching trap 93 by another road; the whole-document config write still inline in a spec | D73 |
| **21** | **fresh-context `verifier` subagent** | **3, one DESTRUCTIVE** — a storage sweep that could delete every receipt file the owner has ever uploaded, in two independent ways; and trap 98 still open, with two call-site mutants alive | D74 |
| **22** | **fresh-context `verifier` subagent** | **3** — source pins that cannot see statement order, so the retraction could be made unreachable with the suite green; and round 21's own fix having moved the whole-ledger write guard **into the one layer with no coverage at all** | D75 |
| **23** | **fresh-context `verifier` subagent** | **5** — the **restore tool** truncated at 1,000 rows, reporting 1000 where 7,419 qualified; a recorder blind to `select`'s options; an ordering assertion defeated by a comment; three more `updRec` mutants; and a false dichotomy in D75's own reasoning | D76 |
| **24** | **fresh-context `verifier` subagent** | **6** — the **backup** tool paged the way this codebase calls broken; `pageAll` looping forever on a non-`id` key; the source pins defeated three ways; a recorder blind to appended builder methods; and **the Masterlist Amount field unable to accept a typed decimal**, a hundredfold payable that twenty-three rounds missed | D77 |
| **25** | **fresh-context `verifier` subagent** | **4** — **moving a due date made the nightly job re-create the payable**, doubling the liability unattended; a shape-match that let two payables suppress each other; the `fx_rates` paging exception justified by a claim its own ordering made false; and the decimal fix unpinned offline | D78 |
| — | **the calendar, 2026-09-06** | 1 — a clock-dependent unit test went red overnight with no code change | D69 |

**Every round that ran found something.** Two were run by the main session rather than a subagent
(round 5, and the D65 batch), which is weaker evidence and is marked as such.

### How to resume

Dispatch a fresh-context `verifier` subagent as the next round. **Never run a round in the main
session if a subagent is available** — rounds 16-18 were run by hand under a rate limit, reported
the work green, and round 19 refuted them in one pass. The brief that has worked for nineteen
rounds: name what changed since the last round and say *attack that first*, because **twenty-six of
the fixes introduced the next defect**; give it the four families (§7); require it to falsify every
spec it relies on **and to mutation-test any test it is told was already falsified** (that claim has
been wrong twice); forbid `npm run smoke`; require `rm -rf apps/web/test-results` after any
Playwright run; and tell it that a clean result is only accepted with the attempts behind it listed.

**The next round's first target is `apps/web/e2e/db.js` — `hold`, `releaseHeld` and `useClient`.** They are
the newest code in the checkout, they were rewritten across rounds 16-19, and they **write to the
owner's live `app_config`**. Every round since 15 has found its defect in exactly that position.
Attack `e2e/held.test.js`'s fake client hardest: it models `merge_app_config`'s SQL, and a fake that
is wrong makes its eight tests agree with a function that does not exist. After that: `pushKey` now
imported in `src/actions.js` and `pushable` extracted to `src/logic.js` (both round 19 fixes); the
sync bar's `needAmount` window versus what Generate actually writes; `generate` no longer refusing;
and repeating round 15's deletion experiment on rounds 13-19's changes.

**Round 19's own six fixes are the code nobody has reviewed.** Round 20 was dispatched against them
and died on a session rate limit before reading any code, then was relaunched; check whether its
result is recorded above before assuming it never ran.

### Two gaps that WERE open — both closed (D70), then found under-tested (D72)

- **`readAll`** — its keyset loop is now `pageAll` in `src/pending.js`, testable without a database.
  Six tests, including the insert-between-pages shift it exists to survive. Falsified two ways.
- **`cancelPush`** — the debounce registry is now `createPending` in `src/pending.js` with
  injectable timers. Six tests. Falsified two ways, including the `push:5:` versus `push:50:`
  prefix hazard.

`npm test` is now **183 assertions across nine files** (`src/pending.test.js` and
`e2e/held.test.js` are new). The three
added in round 16 close the surviving mutants: two prove a `transfers` row and a `recurring` row
sharing an id keep separate debounce timers, and one pins `DELAY` at 500 as a literal rather than
by importing it.

### What rounds 16-19 changed, in one place

`normaliseToggledSettings` is **gone**, replaced in `apps/web/e2e/db.js` by a pair:

- **`hold(paths)`** — called by a spec *before* it changes anything. A path is either
  `settings.<key>` or a top-level section name such as `companies`. Records the current value into
  `settings.__e2eHeld` through `merge_app_config`, so a killed process leaves a marker saying what
  was there. **Throws** if there is no config row, if the merge touches nothing, or if the path is
  not in the stored config — recording absence as `null` would shadow the default in `src/db.js`
  and silently turn a `true`-defaulting setting off.
- **`releaseHeld()`** — called from `beforeAll` *and* from every spec's `finally`. If a marker is
  present, restores exactly the recorded values and clears the marker to JSON null. **No marker
  means no write at all.**
- **`restoreConfig` is deleted.** It did a whole-document write — the lost update
  `merge_app_config` exists to prevent — and after round 19 every one of its call sites is
  `releaseHeld()`. One mechanism, not two.
- **`useClient(fake)`** is a new test seam, because until round 19 none of this had a single test:
  deleting either function's body left the whole suite green. `e2e/held.test.js` now drives them
  against a fake that models the merge function's actual SQL.

The difference that matters: the old code asserted a value it believed correct, so an owner who
had deliberately turned `ackRequirePhoto` on would have lost that setting on every nightly run.
The new code restores what was actually there.

**All four** config-mutating specs now hold: `settings.ackRequirePhoto`, `settings.warnDuplicate`,
`settings.dashWindow`, and `companies` + `categories`. Round 19 found that only two did, and that
the two lists could not have been given back even if they had.

---

## 8. Three departures from the prototype, all deliberate

1. **Escape still closes a dialog.** The prototype removed backdrop-close, which is requirement 12
   and is kept. Removing the keyboard route as well would leave a keyboard user with no exit.
2. **The export summary escapes user text.** The prototype interpolates the search string and every
   company and category name straight into `document.write`. An e2e spec already pins descriptions
   as text, not markup.
3. **`html2canvas` is bundled and dynamically imported**, never from a CDN — a separate ~199 kB
   chunk fetched only on Export.

And one behaviour decided rather than copied: the prototype clears `fee` when a row leaves
`completed` but leaves the charge inside `amount`, which compounds across mark/revert cycles. **That
judgement call is where defects #3, #4 and #6 all originated.** It is still the right call; it took
three rounds to implement correctly.

---

## 9. Every regression test was falsified against its own defect

A test that passes against broken code proves nothing. Each fix's spec was proven by restoring the
defect and watching it fail on the right assertion:

| Spec | Failure observed without the fix |
|---|---|
| space bar opens the row | `a space must not open the transfer`, dialog resolved to 1 element |
| `"change"` link keeps the charge | `Expected: "25" / Received: ""` |
| Escape closes the innermost dialog | `Expected: hidden / Received: visible` |
| retyped amount saves what is shown | `Expected: "500" / Received: "550"` |
| negative charge refused | dialog closed instead of staying open |
| negative liquidation refused | dialog closed instead of staying open |

**The Undo spec had to be written three times.** Version 1 *passed against the defect* — it read the
database immediately after clicking Undo, and the delete is fire-and-forget, so the row was not gone
*yet*. Version 2 failed on the wrong assertion, which is not a falsification either. Version 3
generates two payables, pays one, and polls until the untouched one is gone before asserting the
paid one survived.

**Falsify every regression test, and check *which* assertion fails.**

---

## 10. State, read live at 2026-09-06T13:15Z (after round 19)

| | |
|---|---|
| `main` | local is **behind `origin/main` by `f39de07`** (the backup job's snapshot, `backups/` only — rebases trivially). `origin/main..HEAD` is **empty**. **All of this session's work is uncommitted**: 56 paths, +4845 / −343 (read it with `git status --short`, never from this line) |
| `txns` | `f9f84adad1c9b5c4fa3e3495712ac09f` · 49 rows · ₱2,226,438.00 · `src`/`fee` populated on **0** |
| `transfers` | 9, **all released**, 6 priced — **C7 unchanged** — `inv` empty on all nine |
| `receipts` | 3, `1788471059637` present |
| `recurring` | 0 |
| Schema | 24 policies · 13 triggers · 8 tables · 0 `anon` grants · 0 stale `public.is_viewer` refs |
| Money invariants | `fee is not null and status <> 'completed'` → 0 · `amount <= 0` → 0 · `fee < 0` → 0 · negative receipts/transfers/recurring → 0 |
| `E2E-` residue | 0 in `txns`, `receipts`, `transfers`, `recurring` |
| `app_config` | `ackRequirePhoto: false` · `warnDuplicate: true` · `dashWindow: Next 30 days` · 21 companies, 18 categories, **0 stray `E2E` codes** · `__e2eHeld: null` — **null is the resting state**, it means no run is holding a setting. A non-null `__e2eHeld` means a run was killed mid-spec; the next `npm run e2e` gives the value back on its own |
| `npm test` | **183/183** across nine files |
| `npx playwright test --workers=1` | **49 passed** |
| `npm run build` | green, `vite v8.2.2`, plus a separate `html2canvas` chunk |
| `npm audit` | **0 vulnerabilities** |
| `npm run security` | **56 checks, 0 failed** |
| Docs | 0 broken relative links and 0 unresolved wikilinks across the whole vault |

One expected reading: `receipts` row `1788471059637` carries `amount 0.00` **and company `F5`, which
is not in the companies list**. It is the backup-storage proof, created 2026-09-03, deliberately
kept. Two consequences, both expected: the D56 positive-amount guard means it cannot be saved
through the receipt edit form, and its Company dropdown has no matching option. It needs to exist,
not to be edited. **Do not read either refusal as a bug, and do not "fix" the row.**

Everything else lines up. A sweep for data the dropdowns cannot represent — transaction categories
and companies, receipt and transfer companies, transfer currencies, and every `status` and `freq`
value — returned **no orphans anywhere except that one deliberate `F5`**.

---

## 11. Verification status — read this before claiming the work is clean

- Rounds 1–4 ran as fresh-context verifier subagents. Each found at least one real defect.
- **Round 5's subagent terminated on a session rate limit before reading any code.** Round 5 was
  therefore **run by the main session by hand**, which is weaker evidence: the same context that
  wrote the code checked it. It still found defect #6.
- Rounds 1-25 all ran. **Every single one found at least one finding.**
- Round 16's subagent was dispatched twice and died twice — the session limit, then the **weekly**
  limit. With subagents unavailable, **rounds 16, 17 and 18 were run by the main session by hand**,
  as were round 5 and the D65 batch: the same context checking its own work, which is weaker
  evidence and is marked as such in §7a.
- **Round 19 was the first real verifier after the weekly limit reset, and it REFUTED the main
  session's clean claim with six findings** — including a hand-built push-down key that reinstated
  two money-path defects with the suite green, and two specs leaving the owner's live config in a
  state nothing in the suite could repair. Rounds 16-18's self-review had passed over all six.
- **Round 20 refuted round 19 in turn** — five findings, four of them inside round 19's fixes,
  twice in a row with the same shape: a helper extracted and tested on its own while nothing proved
  its caller still used it (trap 98). All five are fixed and falsified.
- **Round 20's own five fixes are now the unreviewed code.** Round 21 has not been dispatched.
- **Twenty-five rounds, twenty-five that found something.** **Do not report this work as defect-free**,
  and do not report the loop as converged: it has not converged once.

---

## 12. How to verify state in a fresh session

```bash
cd /Users/itadmin/Desktop/puge
git fetch origin && git log origin/main..HEAD    # FETCH FIRST
git status --short                               # expect this session's uncommitted work
cmp AGENTS.md CLAUDE.md                          # must be silent

cd apps/web
npm test                          # 156
npm run build                     # vite 8.2.2
npm audit                         # 0 — on a registry 503 report UNRUN, never an older reading
npm run security                  # 56, 0 failed — WRITES to production
npx playwright test --workers=1   # 48 — WRITES to production
rm -rf test-results               # traces hold E2E_PASSWORD and live refresh tokens
```

```sql
-- MOVING baseline. Read as YOUR baseline; assert across YOUR OWN writes only.
select md5(string_agg(t::text, chr(10) order by t.id)) fingerprint, count(*), sum(amount)::text
  from public.txns t;   -- f9f84adad1c9b5c4fa3e3495712ac09f, 49, 2226438.00

-- did the columns change data, or only row shape?
select count(*) from public.txns where src is not null or fee is not null;   -- 0

-- money invariants, asserted rather than inferred
select
  (select count(*) from public.txns where fee is not null and status <> 'completed') orphan_fee,
  (select count(*) from public.txns where amount <= 0)                               nonpositive,
  (select count(*) from public.txns where coalesce(fee,0) < 0)                       negative_fee,
  (select count(*) from public.transfers where amount <= 0)                          bad_transfer,
  (select count(*) from public.recurring where amount < 0)                           bad_recurring;
-- expect 0, 0, 0, 0, 0

-- R7 still landed: private present, public absent, nothing pointing at the old function
select (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='private' and p.proname='is_viewer') private_fn,
       (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='public'  and p.proname='is_viewer') public_fn,
       (select count(*) from pg_policies
          where (coalesce(qual,'')||coalesce(with_check,'')) like '%public.is_viewer%') stale;
-- expect 1, 0, 0

select status, count(*), count(rate) priced from public.transfers group by 1;
-- expect released 9, priced 6. The three unpriced are C7. Do NOT stamp one unasked.

select id, co, name, amount, file_path from public.receipts order by id;
-- expect 3. Delete NONE. 1788471059637 is the backup proof and carries amount 0.00 on purpose.

select * from public.fx_rates order by 1;   -- 4 rows; check as_of against the day

-- app_config: the table six rounds of assertions forgot, and where trap 84 lives.
-- `db.js` reads `cfg.categories || initialState.categories`, so a STORED list
-- outranks the CAT constant entirely — a category "added" in code reaches nobody.
-- `settings` is different: it spreads over the defaults, so a new setting does
-- arrive. Check the stored value, never the constant.
select
  jsonb_array_length(data->'notes')      notes,        -- expect 8, the owner's
  jsonb_array_length(data->'companies')  companies,    -- expect 21, matching CO
  jsonb_array_length(data->'categories') categories,   -- 18 until `Refund` is added; CAT has 19
  (select count(*) from jsonb_array_elements_text(data->'categories') c where c = 'Refund') refund_present,
  (select count(*) from jsonb_array_elements(data->'notes') el where el->>'t' like '%E2E-%') e2e_notes,
  (select count(*) from jsonb_object_keys(data->'settings') k) setting_keys   -- expect 10
from public.app_config where id;
```

```bash
# C6: are scheduled runs still landing hours late?
gh run list --repo Leuename/tracker --workflow fx.yml --json event,createdAt,conclusion
gh run list --repo Leuename/tracker --workflow backup.yml --json event,createdAt,conclusion
```

Documentation checks, because this repository treats a stale note as a defect: every local link
resolves, every wikilink resolves, code fences balance, no placeholders, `cmp AGENTS.md CLAUDE.md`
is silent, `git diff --check` is clean.

---

## 13. Traps, continued from 76

1–63 in [[2026-09-03 Ten Closed, and a Backup Nobody Had Deployed]], 64–71 in
[[2026-09-04 Exchange Rates, R7, and Two Agent Audits]], 72–76 in
[[2026-09-04 Three Answers, and a Finding That Corrected Itself]]. **All still apply.**

77. **A prototype shows what a screen looks like, never what was asked for.** A careful diff of the
    right design file still delivered nine of twelve. Ask for the written requirements.
78. **State seeded at more than one call site will drift**, and the drift stays invisible until the
    paths disagree. Two instances found: the payment dialog and the Liquidate dialog.
79. **Only the innermost dialog may answer Escape.** Window listeners fire in mount order, so the
    outer dialog wins by default; a listener removed mid-dispatch is skipped by specification, so
    the inner one never runs. `ui.jsx` keeps a stack; nothing binds Escape by hand.
80. **State that outlives the thing it was derived from is the defect family of this codebase.** Six
    defects, five rounds, one shape. When a value is derived from another, clear or recompute it as
    the source changes — never reconcile it later, because "later" is after the user edited the
    source.
81. **Widening what a shared parser accepts widens it for every caller**, including the ones you did
    not look at. Making `amountOf` sign-aware fixed two sites and broke seven.
82. **`display: none` and `visibility: hidden` remove an element from the accessibility tree and the
    tab order; `opacity: 0` does not.** Hiding a control for visual tidiness is an accessibility
    decision, not a styling one. Caught because `getByRole` found zero buttons while a raw DOM query
    found sixteen — the discrepancy between the two *is* the test for this.
83. **A dedupe key must be built from something the user cannot edit.** Generate keyed on a
    description that the Masterlist rewrites, so an ordinary edit made it write duplicates of rows
    already on the ledger. Key on an id and a date, never on prose.
84. **A constant named like a default *is* only a default.** `CAT` in `data.js` is consulted only
    when no stored list exists, and the owner's workspace has had one since 2026-08-31 — so six
    categories "added" in code reached nobody. Before reporting a list, setting or threshold as
    delivered, read what the running system holds. `app_config` was the one table six rounds of
    ledger assertions never looked at.
85. **`toBeVisible()` does not consider opacity.** A spec asserting it passed green with the control
    fully transparent, shipping the exact regression it existed to catch. Assert the computed
    property when the property is the point.
86. **Cancel every write a delete makes obsolete, not just the obvious one.** One user action can arm
    several debounced writes under different keys; cancelling one leaves the others to fire against
    a row that no longer exists.
87. **An optimistic write and its commit must be cancellable as one thing.** Cancelling half a pair
    leaves the screen and the record disagreeing — worse than the failure being cancelled, because a
    wrong number in the database is at least discoverable by every other reader.
107. **A client guard and a database constraint keyed on the same columns guard nothing when those
    columns change.** The D63 unique index is `txns (src, due)` and `alreadyOnSheet` asked the same
    question, so moving a due date made the occurrence look uncovered to both. The index cannot
    catch what the index and the client agree to disagree about. Identity for a generated row is
    *which occurrence it came from*, not where it currently sits.
106. **An optional-guarded effect is an untested effect.** `if (fx.draft) fx.draft(v)` with a spy
    factory that never built `draft` meant the call was never exercised: the line could be deleted
    with the suite green. If a collaborator is optional, something must still prove it is called.
105. **A controlled input rendered from a parsed value cannot be typed into.** The Masterlist Amount
    field read straight from the store, and the store holds a number: the `.` in `1250.50` parsed
    away, React restored the field, and the next keystrokes built `125050`. Hold the raw text for
    the cell being edited and sanitise on the way out — which is what every other amount field in
    this app already did. **Paste worked, so nothing that clicked or filled a value ever saw it**;
    only typing key by key reproduces it, and no test typed.
104. **A pin that cannot fail reads as coverage, which is worse than no pin.** Three source-text
    assertions guarded a money path for three rounds and were defeated by a comment, a string
    literal, and an `if` prefix. When a module cannot be imported, that is the defect — move the
    decisions somewhere importable rather than writing a regex to watch them.
103. **A tool that repairs damage is the last place a silent truncation is acceptable.** `rewind.mjs`
    read `audit_log` with a plain `.select()`, capped at 1,000 rows with no error, and emitted a
    restore plan missing 6,419 of 7,419 changes — while printing a count that looked authoritative.
    Two other files in the same repository already pages this table and one of them documents the
    scar. Grep for `.select(` on every growing table before trusting any of them.
102. **A pure helper extracted and tested still leaves whatever the caller computes before it.**
    Round 22 pinned the plan plumbing and stopped exactly where `val` was computed and `next` was
    built, so three mutations there passed the whole suite — one of them putting a negative payable
    in the ledger. Extract to the boundary of the decision, not to the first line that was easy.
101. **Moving a guard to where it belongs can move it out of where it was tested.** D74 moved the
    "never rewrite a completed row" check from the client into the write — correct in principle,
    and it landed in `src/db.js`, which nothing can import because it builds the live client at
    module scope. Both filters could then be deleted with the whole suite green. When you relocate
    a safety-critical predicate, check what covered it before and what covers it after.
100. **A source-text assertion proves a line exists, not that it runs.** Four regexes pinned the
    push-down call site and all four still matched after two adjacent statements were swapped —
    which made the cancellation dead code for every input. If you must pin by source because the
    module cannot be imported, pin **order and reachability** too, and treat the whole technique as
    a stopgap for code that ought to be testable.
99. **A cleanup that identifies its targets by ABSENCE will one day delete everything.** The e2e
    storage sweep removed every bucket file not found in a `receipts` read — a read whose error it
    discarded and whose result was capped at 1000 rows. Either failure emptied the keep-set and the
    sweep deleted the owner's attachments, reporting success. A sweep must name what it removes
    (here: the files of the tagged rows it just deleted), never infer it from what it failed to
    find. The `E2E-` tag rule protected every table and nothing in storage.
98. **Testing one input to a decision is not testing the decision.** `pushable` was extracted into
    `logic.js` and tested there — and both of its call sites in `updRec` could then be deleted with
    the whole suite green: a cleared Description travelling onto live ledger rows, and an armed
    push never retracted. The predicate was proved right while nothing proved the caller asked.
    When you extract a helper to make it testable, pin what the **caller does with it**, not only
    what it returns. Round 19 learned this for `pushKey` and closed it with a source assertion, then
    left the sibling call site open; round 20 found it there.
97. **A guard added for one field of a shared path must cover every field on that path.** `updRec`
    pushes four fields down onto linked Tracker rows and only `amount` was guarded against a
    mid-edit value — because `amount` has a database CHECK that made the omission *fail loudly*.
    `description` has no such check, so clearing it wrote `''` onto live rows silently, and the
    toast said they had been updated to match. The field with no constraint is the dangerous one,
    not the safe one.
96. **A key built in one module and matched in another is a contract, so build it in one place.**
    `pending.js` exported `pushKey`; both cancel paths used it; the only site that *armed* a
    push-down hand-built the same string. Changing `pushKey`'s format left every test green and
    both cancels matching nothing — a deleted payable's write still firing onto the ledger. Export
    the constructor, import it, and pin that nobody rebuilds the literal.
95. **A read-modify-write of a whole document throws away whatever changed under it.** The marker
    that fixes trap 94 was first written by reading `app_config`, merging, and writing the whole
    blob back — the exact lost update `merge_app_config` was written to prevent, and the app's own
    `src/db.js` says so in a comment. If a document has a server-side merge, a test helper has to
    use it too. The owner is using the app while the suite runs.
94. **A cleanup that ASSERTS a value cannot tell residue from policy.** The first fix for trap 93
    forced `ackRequirePhoto: false` at the start of every run. But that setting defaults off
    *because turning it on is a policy decision* — so an owner who had turned it on would have had
    the nightly run quietly turn it off, silently, forever. Record what the value **was** before you
    change it and give that back. Never restore a value you merely believe is correct.
93. **Cleanup in a `finally` protects against a failing assertion, not a killed process.** A run
    terminated by a rate limit left `ackRequirePhoto` ON in the owner's live config, so nobody could
    liquidate a receipt without a file. Anything a suite mutates outside its own tagged rows needs a
    *starting* guarantee, not only an ending one.
92. **A test that reads the wall clock reports the calendar, not the code.** `eff({due:'2026-09-05'})`
    was `pending` on the 5th and `overdue` on the 6th; the suite went red overnight with no commit.
    Every date-dependent function in `logic.js` accepts `today` as a parameter — pass it. Sixteen
    rounds of review missed this; one day of real time found it.
91. **A fix you falsified by hand is not a fix the suite protects.** Three of one round's four fixes
    could be deleted with every test still green. Hand-falsification proves the fix works today;
    only a committed test stops the next person removing it.
90. **When you add a rule to a shared helper, find every caller and every sibling that encodes the
    same rule.** D66 changed `buildGeneratedRows`; `forecast`, `generate` and `schedule.mjs` all
    encoded the same idea and none of them heard about it — four defects from one edit.
89. **A locator that can match more than one row is an assertion about the wrong row.** A spec
    written to catch finding 21 passed against that very defect, because `.first()` on a shared
    base description landed on a row it never edited. Target the row by something unique to it.
88. **A guard that reads a client snapshot is not a guard.** `state.txns` is read once at page load
    and there is no realtime subscription, so "never rewrite a completed row" could not see a row
    another session had completed — and a masterlist keystroke overwrote the amount of a payable
    already paid. **Put the condition in the statement that writes**, where the database evaluates
    it against the row's real current state, and paint the screen from what came back.
---

## 14. Still open — none of it closeable without the owner

| ID | Item | Blocked on |
|---|---|---|
| **C5** | Rotate the rates-account password | The owner. Raised and deferred **twice** ([D44](../docs/Decisions.md)). Needs a Supabase Dashboard action; the Admin API path is barred because it needs a `service_role` key this repo deliberately does not hold |
| **C6** | GitHub queues scheduled runs 1.75–5 h late | The owner. **Do not move the cron hours** — 02:00 and 08:00 UTC are deliberate ([D43](../docs/Decisions.md)); earlier makes it worse |
| **C7** | Three released wires carry no rate | The owner. Backfill the three? Should release stamp a rate automatically? |
| **A1/A2** | Full `audit_log` restore, `verify-restore.sql` | A supervised `postgres` connection string. Without one say **blocked** — chunking failed at 5 of 23 and is the known failure mode |
| **B1/B2** | Storage ceiling, blank-target replay | Low value. Do not manufacture 1,001 production objects or create a paid project |
| — | **`Refund` category missing in production** | Somebody signed in adding it under Settings → Masterlist settings → Categories, or explicit permission for a one-off scripted write. The other five are already there. [[Decisions]] D58 |
| — | **The next review round** | Every round so far has found at least one defect |
| — | This session's work | The owner. **A push to `main` deploys production** |

---

## Resume prompt

```
Read these, in this order, in /Users/itadmin/Desktop/puge:

  handoff/2026-09-05 The Design Port, and Three Requirements the File Did Not Show.md  (START HERE)
  docs/Decisions.md                                                (D1-D69; D49-D69 are this session)
  docs/Repository Evidence.md                                      (the factual baseline)
  docs/Remaining Work and Owner Decisions.md                       (A1-A2, B1-B2, C1-C7)
  handoff/2026-09-04 Three Answers, and a Finding That Corrected Itself.md  (phase 45, traps 72-76)
  handoff/2026-09-04 Exchange Rates, R7, and Two Agent Audits.md   (traps 64-71)
  handoff/2026-09-03 Ten Closed, and a Backup Nobody Had Deployed.md  (traps 1-63, all still apply)
  handoff/2026-09-04 Owner Decision Brief, C5 to C7.md             (C5/C6/C7 in detail)
  supabase/README.md                                               (nineteen migrations, rollbacks)
  handoff/Handoff Index.md                                         (map of every handoff)

React + Vite ERP in apps/web on Supabase Postgres, deployed to Vercel behind a CI gate. FIVE
accounts: four administrators and one viewer that writes exchange rates and nothing else. ONE
shared ledger holding REAL money, used daily by the owner during Manila working hours. There is NO
staging environment: npm run e2e, npm run smoke and npm run security all WRITE to production.

THERE IS UNCOMMITTED WORK IN THE TREE unless someone has since committed it, and the local branch is
behind origin/main by a backup-job snapshot. Run `git status --short` FIRST and trust it over
anything written in a document, then decide with the owner whether to commit. A push to main deploys
production.

VERIFY, DO NOT TRUST THIS SNAPSHOT. `git fetch origin && git log origin/main..HEAD` — FETCH FIRST, a
stale read caused a false alarm on 2026-09-04. Then in apps/web: npm test (156), npm run build,
npm audit (0), npm run security (56), npx playwright test --workers=1 (48), then `rm -rf
test-results` because traces hold E2E_PASSWORD and live refresh tokens in plaintext. If npm audit
fails on a registry 503, report it UNRUN — never substitute an older reading. Then run the SQL in
sections 6 and 12 of the handoff.

THE TXNS FINGERPRINT IS A MOVING BASELINE, NOT AN INVARIANT. It is
f9f84adad1c9b5c4fa3e3495712ac09f (49 rows, PHP 2,226,438.00). It was 21a63ffeb6368cd06257f17a9aa01a49
until 2026-09-05 and it changed WITHOUT ANY DATA CHANGING, because two new columns altered every
row's serialised text while count and sum both held. Before treating a difference as drift, run
`select count(*) from public.txns where src is not null or fee is not null`. A value you do not
recognise is the NORMAL case: the owner enters payables daily. Read it at the start of your session
as YOUR baseline, assert it unchanged across YOUR OWN writes, and never sweep, restore or rewind to
make it match a number in a document.

YOUR FIRST JOB IS TO RESUME THE REVIEW LOOP AT ROUND 21. Rounds 1-20 ALL RAN AND EVERY SINGLE ONE
FOUND SOMETHING; the loop has never once returned clean.

THE MOST IMPORTANT LESSON IN THIS DOCUMENT: rounds 16, 17 and 18 were run BY THE MAIN SESSION BY
HAND, because round 16's subagent was dispatched twice and died twice (the session limit, then the
WEEKLY limit). Those three rounds ended by reporting the work green. Round 19 was the first real
fresh-context `verifier` after the limit reset and it REFUTED THAT IMMEDIATELY WITH SIX FINDINGS —
one on the money path, two leaving the owner's live config in a state nothing in the suite could
repair. NEVER treat a main-session round as equivalent to a verifier round, and never report a
main-session round as clean.

START AT THE NEWEST CODE, WHICH IS ROUND 20'S OWN FIVE FIXES — `pushPlan` and `groupKey` in
src/logic.js, and `hold`/`releaseHeld` in apps/web/e2e/db.js. Round 19's fixes are one round old and
round 20 found four defects in them; round 20's are unreviewed. Also still worth attacking: `hold`/`releaseHeld`/`useClient` in
apps/web/e2e/db.js (they WRITE TO THE OWNER'S LIVE app_config), the new apps/web/e2e/held.test.js
and whether its fake client faithfully models `merge_app_config`, `pushKey` now imported in
src/actions.js, and `pushable` extracted into src/logic.js. Dispatch a fresh-context `verifier`
subagent, tell it what changed since the last round and to attack that FIRST (THIRTY of the
eighty-one findings were introduced by the fix for the previous one), give it the four defect
families from section 7, require it to falsify every spec it relies on AND to mutation-test any
test it trusts (round 16 found three surviving mutants in tests already called falsified, and round
19 found two more), forbid `npm run smoke`, require `rm -rf apps/web/test-results` after any
Playwright run, and refuse a clean verdict that does not list the attempts behind it. Keep running
rounds until one comes back genuinely empty.

BOTH COVERAGE GAPS ARE NOW CLOSED (D70): the keyset loop is `pageAll` and the debounce registry is
`createPending`, both in src/pending.js, both tested with injectable seams and both falsified two
ways. src/pending.test.js and e2e/held.test.js are new and are in the `npm test` command — 156
assertions across seven files.
Round 16 mutation-tested those twelve tests and THREE MUTANTS SURVIVED; round 19 found TWO MORE.
Mutation-test anything you are told is falsified — "falsified two ways" has been wrong twice.

BEFORE YOU RUN THE E2E SUITE, KNOW THIS: FOUR of its specs change the OWNER'S LIVE CONFIG —
`ackRequirePhoto`, `warnDuplicate`, `dashWindow`, and the shared `companies`/`categories` lists —
and a killed process skips the `finally` that restores them. A run terminated by a rate limit once
left `ackRequirePhoto` ON, which stopped the owner liquidating a receipt without a file. Each spec
now calls `D.hold([...])` BEFORE changing anything, recording what was there into
`app_config.data.settings.__e2eHeld`, and both `beforeAll` and every `finally` call `releaseHeld()`,
which gives back exactly what was recorded. A resting `__e2eHeld` is JSON null. IF YOU SEE A
NON-NULL `__e2eHeld`, a run was killed mid-spec — do not clear it by hand, run the suite and let
`beforeAll` give the value back. If you add a spec that changes the config, IT MUST CALL `hold`
FIRST — round 19 found two that did not. Do NOT "improve" this by forcing settings to their
defaults: that
was finding 46, and it would silently undo a policy the owner chose.

WHAT THIS SESSION DID: ported an updated Claude Design prototype into apps/web (D49); added
txns.src/txns.fee (D50) and transfers.inv (D51) by additive migration, both rehearsal-first and both
byte-verified by MD5; closed three client requirements a diff of the prototype had missed — the Inv
No column, PNG export, and a space bar that opened a transaction while typing. Then NINETEEN rounds of
adversarial review — plus one day of the calendar — turned up FIFTY-FIVE findings (D52-D72): forty-seven
code defects, one false delivery claim, seven documentation contradictions. TWENTY-SIX were introduced
by the fix for the previous one, INCLUDING ALL FOUR FROM ROUNDS 16-18 AND FIVE OF ROUND 19'S SIX. Section 7a of the handoff is
the round ledger and says exactly how to resume the loop. All twelve client requirements map to
file:line in section 3 of the handoff; every finding is in section 7.

VERIFICATION STATUS, STATED HONESTLY: rounds 1-18 ALL RAN, AND ALL EIGHTEEN FOUND SOMETHING. Most
were fresh-context `verifier` subagents. Round 5, the D65 batch, and rounds 16, 17 and 18 were run
BY THE MAIN SESSION BY HAND after a subagent died on a rate limit — the same context checking its
own work, which is weaker evidence and is marked as such in section 7a. Rounds 16-18 in particular
have been verified by nobody but their author. Do not report this work as defect-free and do not
report the loop as converged; it has not converged once. Run round 19.

Hold these while you work:
- unpricedFor() IN logic.js IS THE ONE RULE for "this payable has no amount yet" (D68). generate,
  the Tracker sync bar and scripts/schedule.mjs all ask it. Generate REPORTS unpriced payables and
  writes the priced siblings — it does not refuse. Five places encoded this idea and drifted twice.
- ZERO MEANS "NOT DECIDED" ON A PAYABLE AND IS NEVER A ROW (D66). recurring.amount >= 0 and
  txns.amount > 0 disagree ON PURPOSE. A non-positive amount must not push down and must not
  generate. Do not "reconcile" the two constraints — reconcile the code to them.
- EVERY LEDGER READ IS KEYSET-PAGED, not offset-paged (D66). An offset page over a shifting table
  duplicates one row and hides another WHILE THE EXACT COUNT STILL MATCHES.
- THE MONEY RULES NOW LIVE IN POSTGRES (D65). Seven CHECK constraints across txns/receipts/
  recurring/transfers. receipts.amount is >= 0 not > 0 so the backup-proof row survives, and
  recurring.amount is >= 0 because updRec clamps mid-edit. Do not tighten either.
- EVERY LEDGER READ IS PAGED with count:'exact' (readAll in db.js). A plain .select() is truncated
  at 1,000 rows by PostgREST with NO error, which makes Generate's dedupe blind past the cap.
- A GUARD THAT READS A CLIENT SNAPSHOT IS NOT A GUARD (trap 88, D61). state.txns is read once at page
  load and there is NO realtime subscription, so every client-side "never do X to a row in state Y"
  check is advisory. patchTxns carries .eq('src') and .neq('status','completed') in the STATEMENT.
  Do not move that logic back into the client. GENERATE re-reads the ledger before deciding, and a
  partial unique index on (src, due) refuses a duplicate generated row (D63) — that index is
  deliberately NOT extended to hand-entered rows, whose duplicate warning is advisory by design.
  The SAME applies to deleteTxns, which carries
  .neq('status','completed').is('done', null) — Undo promises to spare paid rows and only Postgres
  can keep that promise (D62). Both resolve to the ids they actually touched; paint from those.
- STATE THAT OUTLIVES THE THING IT WAS DERIVED FROM IS THIS CODEBASE'S DEFECT FAMILY (trap 80). Six
  defects, five rounds, one shape. Look for it first. When a value is derived from another, clear or
  recompute it as the source changes — never reconcile it later, because "later" is after the user
  edited the source.
- WIDENING A SHARED PARSER WIDENS IT FOR EVERY CALLER (trap 81). Making amountOf sign-aware fixed
  two call sites and broke seven. Grep for the function, not for the bug.
- A CONSTANT NAMED LIKE A DEFAULT IS ONLY A DEFAULT (trap 84). db.js:149 reads
  `cfg.categories || initialState.categories` — a stored list outranks CAT entirely. Check
  app_config, not the constant, before saying a list is delivered. `Refund` is still missing in
  production.
- A DEDUPE KEY MUST NOT BE BUILT FROM EDITABLE PROSE (trap 83). Generate keyed on a description the
  Masterlist rewrites, and wrote duplicate ledger rows. alreadyOnSheet() in logic.js is now the one
  rule, keyed on src + due; buildGeneratedRows and forecast MUST keep sharing it or the sync line
  starts lying about what Generate would write.
- display:none AND visibility:hidden REMOVE AN ELEMENT FROM THE A11Y TREE AND TAB ORDER (trap 82).
  opacity:0 does not. The reminder buttons use opacity for exactly this reason — do not "tidy" it.
- A PROTOTYPE IS NOT A REQUIREMENT (trap 77). A careful diff of the right design file still
  delivered nine of twelve. Ask for the written requirements before treating a diff as the scope.
- A TEST THAT READS THE WALL CLOCK REPORTS THE CALENDAR (trap 92, D69). Every date-dependent
  function in logic.js takes `today` as a parameter — pass it. The suite went red overnight with no
  commit because one assertion did not.
- A FIX YOU FALSIFIED BY HAND IS NOT A FIX THE SUITE PROTECTS (trap 91). Three fixes from one round
  could be deleted with everything still green. Commit a test, not just a hand-check.
- A REGRESSION TEST THAT PASSES AGAINST BROKEN CODE PROVES NOTHING. Every fix here was proven by
  restoring the defect and watching the spec fail ON THE RIGHT ASSERTION. The Undo spec passed
  against its own defect twice before it was rewritten a third time. Falsify yours, and read which
  assertion fails.
- AN INVARIANT THAT CANNOT FAIL IS NOT AN INVARIANT. `amount < fee` stayed at 0 through two defects
  because sign-stripping made a negative unreachable. Ask what would have to be true for your check
  to go red.
- Verification means checking the thing itself, not the report about the thing.
- "Has not run yet" and "never runs" leave the same artifact (trap 74). GitHub queues this repo's
  scheduled runs 1.75-5 HOURS late. Re-check immediately before writing down that something never ran.
- A wrapper's exit code is not the command's verdict (trap 75). Where failure arrives in a RETURN
  VALUE, the absence of an error proves nothing.
- A FIX IN THE WORKING TREE IS NOT A FIX IN THE SYSTEM. git fetch, then git log origin/main..HEAD.
- {"success": true} proves the SQL ran, not that it achieved anything. Assert the refusal, not the
  absence of an error: a blocked policy and a missing row both give row_count = 0.
- A documented invariant that no code enforces is a comment, not an invariant (trap 72).
- assert.throws(fn, regexp) tests String(err), so /^MESSAGE/ never matches "Error: MESSAGE" (trap 73).

Code rules that are load-bearing — do not "simplify" any of these back:
- amount is ALWAYS base + the currently recorded fee. setEditStatus takes the charge off VISIBLY when
  a row leaves completed; saveEdit does no arithmetic at all.
- positiveAmountOf() is what every writer calls for a typed amount. amountOf() is the parser and
  deliberately returns a NEGATIVE so it can be rejected. Never test `!amt` on a raw amountOf result.
- paySeedFor() is the ONLY thing that opens the payment dialog for an edit. Add a field to that
  dialog there and nowhere else.
- useEscapeToClose() in ui.jsx is the ONLY thing that binds Escape. Modals stack; only the innermost
  answers. Never add a bare window keydown listener beside a dialog.
- undoGenerate keeps any row that is completed. generatedIds outlives its rows, and the banner's
  "Review them" link does not dismiss the banner.
- Sheet rows in Telegraphic, AckRec and Tracker are keyboard-operable on purpose. Fix propagation at
  the CONTROL, never by removing a row's Enter/Space handler.
- fx_rates' write policies name ONE account's uid instead of gating on not private.is_viewer() (D42).
  Deliberate one-off. Do not copy it onto another table, do not "fix" it to match.
- receipts row 1788471059637 carries amount 0.00 on purpose — it is the backup-storage proof. The
  positive-amount guard means it can no longer be saved through the receipt edit form. That refusal
  is expected, not a bug. Never delete it: doing so orphans the stored object and destroys the proof.
- A row without an E2E- tag may be the owner's. Never sweep one.

Do NOT: revoke EXECUTE on any is_viewer (N1/D34); remove the three unused indexes (N2); raise the
Playwright timeouts (N3); reimplement recurrence in SQL (N4); add a credential fallback for
SCHEDULE_*/FX_* (N5); modify company_tracker/ (N7); delete from audit_log (N8); delete a failing
security check to make a suite green (D26); edit ANY applied migration file (byte-identity against
the stored statement IS the evidence); move the FX cron hours (C6); write to the three unpriced
wires (C7); or rotate the rates-account password (C5) unasked.

zone-offices (lasycakyudaawrydetnm) is a LIVE CRM belonging to someone else. Paused. Do not touch.
tracker-rehearsal (bucmcnsjkuprpojhequy) is the scratch project — apply every migration there first.
AGENTS.md and CLAUDE.md are equal synchronized policies: change both in one commit, keep them
byte-identical, check with `cmp`. This vault IS the repository — notes go in docs/ (Title Case) and
handoff/ (YYYY-MM-DD Title.md), and never into .obsidian/, which Obsidian excludes from its index.

Suggested first move: run the verification above and report what drifted. Then dispatch ROUND 21 (or 20, if section 7a shows round 20 never reported) and
keep the loop going until a round returns genuinely clean. Then ask the owner whether to commit and
push — a push to main deploys production. Report what you verified and what drifted, confirm the
state back in a few lines, and wait for direction before starting anything new.

Two things need the owner and are not yours to close: `Refund` is missing from production's
categories (Settings -> Masterlist settings -> Categories adds it in seconds; a scripted write was
attempted and correctly refused by the permission layer), and the decision on whether to commit —
56 files changed, nothing committed, and a push to main deploys production.
```

## Guideline Basis

- **PG-04** names the reproducible check behind every claim; §9 records the exact failure output each regression spec produced against its own defect.
- **DOC-02** keeps observation, decision and open question separately labelled — §7 keeps every defect next to whose it was, and §11 states what was *not* verified.
- **MD-02** requires resolvable links; every wikilink and relative path here targets an existing file, verified vault-wide.
- **DOC-03** reuses the established C/D/N/R and trap identifiers rather than renumbering them.
- **SEC-03** is why no credential or password value appears here, and why C5 describes blast radius instead of the secret.
- **GIT-04** is why the uncommitted state appears in the frontmatter, the state table, the open items and the resume prompt rather than once.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [[Decisions]] · [[Repository Evidence]] · [[Handoff Index]] · [[Remaining Work and Owner Decisions]] · [[AI Agent Context]] · [[Handoff]] · [[2026-09-04 Three Answers, and a Finding That Corrected Itself]] · [[2026-09-04 Owner Decision Brief, C5 to C7]] · [[2026-09-04 Exchange Rates, R7, and Two Agent Audits]] · [[2026-09-03 Ten Closed, and a Backup Nobody Had Deployed]] · [Supabase Schema](../supabase/README.md) · [Backups](../backups/README.md)
