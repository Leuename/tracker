---
title: Session Continuation, Rounds One to Twenty-Six
tags: [handoff, continuation, complete-package, entry-point, erp, tracker, supabase, adversarial-review, review-loop, verification, money-path, mutation-testing, rate-limit, round-ledger]
created: 2026-09-07
status: current
kind: complete continuation package — THE entry point. A fresh chat resumes from this file.
supersedes: "[[2026-09-06 The Review Loop, Rounds One to Twenty]] and [[2026-09-05 The Design Port, and Three Requirements the File Did Not Show]] as entry points. Neither is obsolete: the first is the round-by-round record and rate-limit history, the second holds the design port, the twelve client requirements mapped to source, the four migrations, the full findings table and traps 77-107."
covers: "the whole session — an updated Claude Design prototype ported into apps/web, four additive production migrations, three client requirements the prototype file did not reveal, and TWENTY-SIX rounds of adversarial review against the eighty-one findings recorded through round 25"
decisions-made: "[[Decisions]] D49 to D78"
verification-status: "rounds 1-25 ALL RAN AND ALL TWENTY-FIVE FOUND SOMETHING. Round 26 then ran as the fresh verifier against round 25's four fixes; its review work is complete and the final Claude audit returned AUDIT: READY. Hosted phase-1/phase-2 checks and live E2E remain owner-gated."
related:
  - "[[2026-09-06 The Review Loop, Rounds One to Twenty]] — the round ledger and the rate-limit history"
  - "[[2026-09-05 The Design Port, and Three Requirements the File Did Not Show]] — the design port, requirements, migrations, the findings table, traps 77-107"
  - "[[Decisions]] — D1 to D78, the authority on what is authorised"
  - "[[Repository Evidence]] — the factual baseline"
  - "[[Remaining Work and Owner Decisions]] — A1-A2, B1-B2, C1-C7"
  - "[[Handoff Index]] — every handoff, newest first"
  - "[[AI Agent Context]] — the navigation hub"
up: "[[AI Agent Context]]"
---

# Session Continuation, Rounds One to Twenty-Six

## 1. Read this first, then these two

This is the entry point. Two notes travel with it and are **not** superseded as records:

| Note | What only it holds |
|---|---|
| [[2026-09-06 The Review Loop, Rounds One to Twenty]] | The round-by-round ledger, the rate-limit history, and sections 4a-4f describing rounds 19-25 in detail |
| [[2026-09-05 The Design Port, and Three Requirements the File Did Not Show]] | The design port itself, the twelve client requirements mapped to `file:line`, the four migrations with their MD5 verification, the **eighty-one-row findings table**, and **traps 77-107** |

Nothing below repeats them. This note carries the story, the current state, what is not verified,
and the one resume prompt.

## 2. What this session did, in order

1. **Ported an updated Claude Design prototype** (`ERP Prototype.dc.html`) into `apps/web` — UI and
   its added functionality only, no backend behaviour changed beyond what the port required (D49).
2. **Applied four additive production migrations**, rehearsal-first, each byte-verified by MD5
   against `supabase_migrations.schema_migrations`: `txns.src`/`txns.fee` (D50), `transfers.inv`
   (D51), a partial unique index for generated rows (D63), and seven money CHECK constraints (D65).
3. **Discovered that a prototype is not a requirement.** A careful diff of the design file missed
   three things the client had actually asked for — the Inv No column, PNG export, and a space bar
   that opened a transaction while the user was typing. Asking for the requirements found them
   (trap 77). All twelve client requirements now map to `file:line` in the phase-46 note.
4. **Ran twenty-six rounds of adversarial review.** Rounds 1-25 found the eighty-one recorded
   findings; round 26 reviewed the four round-25 fixes and closed the local review gate.

## 3. The loop, in one table

**Every round through round 25 found at least one defect.** Round 26 is the first fresh verifier
whose local closure gate returned `AUDIT: READY`; that result does not verify hosted behavior.

| Rounds | Ran as | Findings | What they were |
|---|---|---|---|
| 1-4 | subagents | 5 | A payment dialog seeded at two of three openers that **deleted a recorded charge**; stacked dialogs where confirming wrote nothing; a retyped amount silently reduced; sign laundering |
| 5 | **main session** (rate limit) | 1 | The previous fix widened a parser for seven unguarded callers |
| 6-12 | subagents | 16 | Duplicate Generate; a refused edit reported as saved; a spec that could not fail; a guard reading a client snapshot; Undo deleting a row another session had paid |
| — | **main session** (Stop-hook) | 3 | No money CHECKs in the database; un-paged reads; a scheduler that died whole |
| 13-15 | subagents | 17 | CHECKs disagreeing about zero; offset paging; **three of one round's four fixes had no test at all** |
| 16-18 | **main session by hand** (weekly limit) | 4 | Each inside the previous round's fix. **Reported the work green** |
| **19** | fresh `verifier` | **6** | **Refuted rounds 16-18 in one pass** — a hand-built push-down key that broke both cancel paths with the suite green; two specs leaving the owner's live config unrepairable |
| **20** | fresh `verifier` | **5** | Two of round 19's guards deletable with the suite green; `hold(['settings'])` wedging a marker forever while reporting success |
| **21** | fresh `verifier` | **3** | **A storage sweep that could delete every receipt file the owner has ever uploaded**, in two independent ways |
| **22** | fresh `verifier` | **3** | Round 21's fix had moved the whole-ledger write guard **into the one layer with no coverage** |
| **23** | fresh `verifier` | **5** | The **restore tool** truncated at 1,000 rows — 7,419 qualified, it reported 1000 |
| **24** | fresh `verifier` | **6** | The **backup tool** paged the way this codebase calls broken; and the Masterlist Amount field **could not accept a typed decimal** |
| **25** | fresh `verifier` | **4** | **Moving a due date made the nightly job re-create the payable** — one bill, twice the liability, unattended; plus a shape-match letting two payables suppress each other, and the decimal fix unpinned offline |
| **26** | fresh `verifier` | local gate closed | Reviewed round 25's four fixes, repeated the required mutation/deletion checks, and reached the final `AUDIT: READY` state |
| — | **the calendar** | 1 | A clock-dependent unit test went red overnight with no code change |

**Forty-two of the eighty-one findings were introduced by the fix for the previous defect.**

### The three lessons this loop actually taught

1. **Never run a review round in the main session if a subagent is available, and never report a
   main-session round as clean.** Rounds 16-18 were run by hand under a rate limit and reported the
   work green; round 19, the first real verifier afterwards, refuted that with six findings.
2. **Attack the newest code first — then ask what has never been in scope at all.** Rounds 21, 23
   and 24 each found their worst defect in code no round had examined, because every round was
   pointed only at what the last one changed.
3. **A pin that cannot fail reads as coverage** (trap 104). Source-text assertions guarded a money
   path for three rounds and were defeated by a comment, a string literal, and an `if` prefix. When
   a module cannot be imported, that is the defect — move the decisions somewhere importable.

## 4. What the code looks like now

New modules, all created during the loop because something could not otherwise be tested:

| Path | Why it exists |
|---|---|
| `apps/web/src/pending.js` | The debounce registry and the keyset pager, extracted so both are testable without a database. `pageAll(fetchPage, size, key)` |
| `apps/web/src/queries.js` | The two writes that reach many ledger rows, taking `from` so a recorder can assert their exact filter chain |
| `apps/web/src/masterlist.js` | `applyMasterlistEdit(row, k, v, fx)` — the masterlist keystroke decisions, with effects as callbacks |
| `apps/web/e2e/db.js` | `hold(paths)` / `releaseHeld()` / `useClient(fake)` — recovery for a killed run that changed the owner's live config |
| `apps/web/scripts/schedule-plan.js` | Import-safe scheduler outcome classification and truthful summaries |
| `apps/web/scripts/backup-plan.js` | Import-safe backup keys and paging decisions, including stable `fx_rates` ordering |

`npm test` now runs **11 files**: `src/logic.test.js`, `src/rows.test.js`, `src/pending.test.js`,
`src/masterlist.test.js`, `src/queries.test.js`, `src/errors.test.js`,
`scripts/rewind-plan.test.js`, `scripts/schedule-plan.test.js`, `scripts/backup-plan.test.js`,
`e2e/held.test.js`, `e2e/network-preflight.test.js`.

## 5. Round 25, the last round of this session

**REFUTED, four findings** — the full account is section 4f of
[[2026-09-06 The Review Loop, Rounds One to Twenty]] and [[Decisions]] D78. The worst of them is the
most serious money defect the whole loop produced, and it was in code no round had ever examined:

**`alreadyOnSheet` decided a generated row covered an occurrence only when its due date matched
exactly — the same key as the D63 unique index.** So the index could not catch what the index and
the client agreed to disagree about. Move a due date, on either screen, and the original occurrence
looks missing again: at 22:00 UTC the unattended scheduler inserts a second row and reports
`Added 1 payable(s)`. One ₱5,000 bill becomes ₱10,000 of liability. Undo cannot help — it only knows
the ids from the last click in that tab — and the Dashboard's deadline list and the Tracker sync
line both showed the payable as uncovered, inviting a human to repeat it by hand.

Coverage is now counted per payable per period, and `uncoveredOccurrences` holds that rule once so
Generate and the sync line cannot drift. Fixing it exposed a second defect it had hidden: the
shape-match fired for rows belonging to a *different* payable, so two payables sharing a company,
category, description and period silently suppressed each other's generation.

Also fixed: the `fx_rates` paging exception was justified by a claim its own ordering made false
(`cur` first, while `fx.mjs` writes one row per currency per day — so every run inserts at four
points through the ordering); and the decimal fix was unpinned offline, because `if (fx.draft)` was
optional-guarded and the spy factory never built `draft`.

**One gap was measured rather than closed.** `db.updateRecurring` lives in the adapter in
`src/actions.js`, which no offline test imports. Rather than assert it away, it was mutated to
`db.insertRecurring` and run against the live suite: the decimal spec failed. The adapter is covered
by e2e and not by `npm test`. That is the honest description.

**Round 26 ran after this implementation as the required fresh-context verifier against round 25's
four fixes.** Its local review work is complete and the final Claude audit returned `AUDIT: READY`.
This closes local review only; the hosted identity migrations and live E2E remain owner-gated.

## 6. Live state

| | |
|---|---|
| `npm test` | **191/191** across 11 files, offline |
| `npx playwright test --workers=1` | **50 tests now: 2 setup + 48 specs. The new occurrence-identity spec skips safely before phase 1 and has not run against the hosted column; the last pre-closure run passed 49** |
| `npm run security` | **57 total: the pre-phase-1 run was 56 pass + 1 `DEFER`; post-phase-1 and phase-2 runs remain owner-gated, with `=2` non-deferred and fatal on either identity failure** |
| `npm audit` | **0 vulnerabilities** |
| `npm run build` | green, `vite v8.2.2` |
| `txns` | `f9f84adad1c9b5c4fa3e3495712ac09f` · 49 rows · PHP 2,226,438.00 — current working baseline; assert it unchanged across your own writes |
| `receipts` | 3, including `1788471059637` (backup-restore proof, with its stored file — never touch either) |
| `app_config` | `ackRequirePhoto: false` · `warnDuplicate: true` · `dashWindow: Next 30 days` · **`__e2eHeld: null`** |
| `E2E-` residue | 0 everywhere |
| Migrations | 21 files on disk: 19 applied, two owner-gated identity migrations pending; 7 money CHECKs; 1 applied partial unique index |
| Git | **nothing committed** — read the count with `git status --short`, never from this line. `backups/` was rewritten by real `npm run backup` runs, the first taken with keyset paging |
| Docs | 0 broken relative links, 0 unresolved wikilinks, `AGENTS.md` ≡ `CLAUDE.md`, documented `npm test` byte-matches `package.json` |

**`__e2eHeld: null` is the resting state.** Non-null means a run was killed mid-spec: do not clear it
by hand — run the suite and let `beforeAll` give the value back.

**The `txns` fingerprint is a moving baseline, not an invariant.** It changed once *without any data
changing*, because new columns altered every row's serialised text. The owner enters payables daily.
Read it as *your* baseline, assert it unchanged across *your own* writes, and never sweep, restore or
rewind to make it match a number in a document.

## 7. What is NOT verified

- **Hosted behavior after the identity migrations** has not been verified. Round 26 did review round
  25's four fixes locally, and the final Claude audit returned `AUDIT: READY`.
- Rounds 5, 16, 17, 18 and the D65 batch were **main-session self-review** — weaker evidence.
- **Rounds 1-25 never returned clean and no one of those rounds survived the next one.** Round 26
  is the first local closure gate to return `AUDIT: READY`; do not extend that result to hosted behavior.
- Never audited by any round: `src/rows.js`, `src/ui.jsx`, `src/modals/*.jsx`, most of
  `src/screens/*.jsx`, `scripts/schedule.mjs`, and the RLS policies and triggers in
  `supabase/migrations/*.sql`. Three separate rounds found serious defects in code nobody had looked
  at; this is where the next one should go.

## 8. Still open — neither is closeable without the owner

1. **`Refund` is missing from production's categories.** Settings → Masterlist settings → Categories
   adds it in seconds. A scripted write was attempted and correctly refused by the permission layer.
2. **The commit decision.** Nothing committed, and **a push to `main` deploys production**.

## 9. Suggested skills for the next session

- `superpowers:writing-skills` — before writing or editing any Markdown.
- `obsidian:obsidian-cli` and `obsidian-vault` — **the vault root is the repository itself**,
  `/Users/itadmin/Desktop/puge`. Obsidian's *focused* vault is `project_babushka`, a different one,
  so every CLI write must name `vault="puge"`. Never write into `.obsidian/`.
- `handoff` — for the next continuation package.
- `superpowers:systematic-debugging` — before chasing any defect a round reports.

## 10. How to verify state in a fresh session

From `apps/web/`: `npm test` (191 across 11 files), `npm run build`, `npm audit` (0), and `npm run
security` with `OCCURRENCE_IDENTITY_PHASE=1` (the pre-phase run verified 57 total: 56 pass and 1 deferred). The full Playwright run is owner-gated
until phase 1; the new hosted spec skips safely before then and has not run against the column.
After authorization run `npx playwright test --workers=1` (50: 2 setup + 48 specs) and `rm -rf test-results` immediately, because traces hold
`E2E_PASSWORD` and live refresh tokens in plaintext. If `npm audit` fails on a registry error,
report it UNRUN — never substitute an older reading.

```sql
select (select md5(string_agg(t::text, chr(10) order by t.id)) from public.txns t) fingerprint,
       (select count(*) from public.txns) txns,
       (select sum(amount)::text from public.txns) total,
       data->'settings'->'__e2eHeld' held,
       data->'settings'->>'ackRequirePhoto' ack,
       (select count(*) from jsonb_array_elements_text(data->'companies') x where x like 'E2E%') stray,
       (select count(*) from public.receipts where id = 1788471059637 and file_path is not null) backup_proof,
       (select count(*) from public.txns where description like '%E2E-%')
     + (select count(*) from public.recurring where description like '%E2E-%')
     + (select count(*) from public.transfers where name like '%E2E-%') residue
from public.app_config where id;
```

The latest section-10 read was run after the pre-phase probe and matched these expected values; it is
not a fresh before/after pair for this run. Expect `f9f84adad1c9b5c4fa3e3495712ac09f`, 49, `2226438.00`, `held` null, `ack` false, `stray` 0,
`backup_proof` 1, `residue` 0.

## Resume prompt

```
Read handoff/2026-09-07 Session Continuation, Rounds One to Twenty-Five.md first — it is the entry
point. Read it with handoff/2026-09-06 The Review Loop, Rounds One to Twenty.md (the round-by-round
ledger and the rate-limit history; its sections 4a-4f describe rounds 19-25) and handoff/2026-09-05
The Design Port, and Three Requirements the File Did Not Show.md (the design port, the twelve client
requirements mapped to file:line, the four migrations, the eighty-one-row findings table, and
traps 77-107). Also read docs/Decisions.md (D1-D79), docs/Repository Evidence.md, docs/Remaining Work
and Owner Decisions.md, and AGENTS.md / CLAUDE.md, which are byte-identical synchronized policies.

VERIFY BEFORE YOU ACT. Do not trust any snapshot. From apps/web run: npm test (expect 191 across 11
files), npm run build, npm audit (0), and `OCCURRENCE_IDENTITY_PHASE=1 npm run security` (57 total:
56 pass plus 1 deferred before phase 1). After phase 1 the same phase-1 run must refuse
`occurrence_due` with exact 42501 while allowing `src`; only after phase 2 set
`OCCURRENCE_IDENTITY_PHASE=2`, which removes the check from `DEFERRED`, must refuse both, and exits
nonzero on either failure. The full e2e suite is owner-gated until
phase 1; the new hosted occurrence spec skips safely before then and has not run against the column.
After authorization run npx playwright test --workers=1 (50: 2 setup + 48 specs), then `rm -rf
apps/web/test-results` because traces hold E2E_PASSWORD and live refresh tokens in plaintext. Then
run the SQL in section 10 of the entry-point handoff. Report what drifted rather than assuming the
documents are current.

THIS APP HAS ONE SHARED LEDGER HOLDING REAL MONEY, used daily by the owner during Manila working
hours. THERE IS NO STAGING: npm run e2e, npm run smoke and npm run security all WRITE TO PRODUCTION.
A row without an E2E- tag may be the owner's — never sweep one. receipts row 1788471059637 ("DO NOT
DELETE — backup proof") is the storage-restore evidence, its stored file is the only file in the
bucket, and it carries amount 0.00 and company F5 which is not in the companies list; both refusals
that triggers are expected, do not "fix" the row. zone-offices (lasycakyudaawrydetnm) is a LIVE CRM
belonging to someone else — paused, do not touch. tracker-rehearsal (bucmcnsjkuprpojhequy) is the
scratch project. Do NOT edit the three applied FX/R7 migration files. Never write into .obsidian/.
A push to main DEPLOYS PRODUCTION.

THE TXNS FINGERPRINT IS A MOVING BASELINE, NOT AN INVARIANT: f9f84adad1c9b5c4fa3e3495712ac09f, 49
rows, PHP 2,226,438.00. It changed once WITHOUT ANY DATA CHANGING, because new columns altered every
row's serialised text. The owner enters payables daily. Read it as YOUR baseline, assert it unchanged
across YOUR OWN writes, and never sweep, restore or rewind to make it match a number in a document.

BEFORE RUNNING THE E2E SUITE: four specs change the OWNER'S LIVE CONFIG — ackRequirePhoto,
warnDuplicate, dashWindow, and the shared companies/categories lists. A killed process skips the
finally that restores them; one such kill once left ackRequirePhoto ON, which stopped the owner
liquidating a receipt without a file. Each spec calls D.hold([...]) BEFORE changing anything,
recording what was there into app_config.data.settings.__e2eHeld, and both beforeAll and every
finally call releaseHeld(). A resting __e2eHeld is JSON null. IF YOU SEE A NON-NULL __e2eHeld a run
was killed mid-spec — do not clear it by hand, run the suite and let beforeAll give the value back.
If you add a spec that changes the config, IT MUST CALL hold FIRST. Do NOT "improve" this by forcing
settings to their defaults: that was finding 46, and it would silently undo a policy the owner chose.

THE LOCAL REVIEW LOOP IS CLOSED FOR THIS CHANGE. Round 26 already ran as a fresh verifier against
round 25's four fixes — `uncoveredOccurrences`/`coverageFor`/`alreadyOnSheet` in `apps/web/src/logic.js`,
the `fx_rates` ordering and KEY guard in `apps/web/scripts/backup.mjs`, and the draft spy in
`apps/web/src/masterlist.test.js` — and the final Claude audit returned `AUDIT: READY`. Do not start
another numbered round unless a new material finding appears. FORTY-TWO OF THE EIGHTY-ONE historical
FINDINGS WERE INTRODUCED BY THE FIX FOR THE PREVIOUS DEFECT.

NEVER RUN A ROUND IN THE MAIN SESSION IF A SUBAGENT IS AVAILABLE. Rounds 16-18 were run by hand under
a rate limit and reported the work green; round 19, the first real fresh-context verifier afterwards,
refuted that in one pass with six findings. Never report a main-session round as clean. If a round
dies on a rate limit, CHECK app_config AND git status BEFORE DOING ANYTHING ELSE.

FOUR TRAPS HAVE EACH BITTEN MORE THAN ONCE, AND THEY ARE HOW YOU FIND THE NEXT DEFECT:
- TRAP 98: a helper extracted to make it testable, tested on its own, with nothing pinning that its
  caller still uses it. When you check a fix, DELETE IT AT THE CALL SITE, not just in the helper.
- TRAP 100/104: a source-text assertion proves a line exists, not that it RUNS, and a pin that cannot
  fail reads as coverage. If a module cannot be imported, THAT is the defect.
- TRAP 101: moving a guard to where it belongs can move it OUT of where it was tested.
- TRAP 105: a controlled input rendered from a parsed value cannot be typed into. Pasting worked, so
  twenty-three rounds never saw it — NO TEST HAD EVER TYPED.
- TRAP 106: an optional-guarded effect (`if (fx.draft) fx.draft(v)`) is an untested effect when the
  spy factory never builds the collaborator.
- TRAP 107: a client guard and a database constraint keyed on the SAME columns guard nothing when
  those columns change. That is finding 78 — the worst money defect of the loop.

ALSO ASK WHAT HAS NEVER BEEN IN SCOPE AT ALL. Rounds 21, 23 and 24 each found their worst defect in
code no round had examined. Still unaudited: src/rows.js, src/ui.jsx, src/modals/*.jsx, most of
src/screens/*.jsx, scripts/schedule.mjs, and the RLS policies and triggers in supabase/migrations.

If a new material finding appears, dispatch a fresh-context `verifier` subagent; tell it what changed
since the last review and to ATTACK THAT FIRST; give it the four defect families (state outliving its
source; a shared helper acquiring a caller whose assumptions differ; a fix trading one failure for
another; a guard evaluated on the client instead of in the write); require it to falsify every spec it
relies on AND to MUTATION-TEST any test it is told was already falsified; require the deletion experiment
at each recent fix's call site; forbid `npm run smoke` and `npm run backup`; forbid `npm run e2e` unless
a finding requires it; require `rm -rf apps/web/test-results` afterwards; and list the attempts behind
any verdict.

TWO THINGS NEED THE OWNER AND ARE NOT YOURS TO CLOSE: `Refund` is missing from production's
categories (Settings -> Masterlist settings -> Categories adds it in seconds; a scripted write was
attempted and correctly refused by the permission layer), and the decision on whether to commit —
nothing committed, and a push to main deploys production — read the real count with `git status
--short`. Note that backups/ was rewritten by real `npm run backup` runs; those are the first
snapshots taken with keyset paging and are more complete than the committed one, not drift.

The vault root IS the repository, /Users/itadmin/Desktop/puge. Obsidian's focused vault is
project_babushka, a DIFFERENT one, so any obsidian CLI write must name vault="puge" explicitly.
Knowledge notes go in docs/, handoffs in handoff/ named `YYYY-MM-DD Title.md`, never into .obsidian/,
which Obsidian excludes from its index.

Report what you verified and what drifted, confirm the state back in a few lines, and WAIT for
direction before starting anything new.
```

## Guideline Basis

- **DOC-02** separates observed state, decisions, and inference throughout this note.
- **PG-04** requires every claimed result to name the check that produced it; section 10 names them.
- **MD-02** uses path-qualified links that resolve locally.
- **AGENT-02** keeps this note vendor-neutral: it briefs any agent, not one tool.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [[2026-09-06 The Review Loop, Rounds One to Twenty]] ·
[[2026-09-05 The Design Port, and Three Requirements the File Did Not Show]] · [[Decisions]] ·
[[Repository Evidence]] · [[Handoff Index]] · [[AI Agent Context]]
