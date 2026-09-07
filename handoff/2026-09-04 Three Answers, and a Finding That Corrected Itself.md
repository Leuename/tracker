---
title: Three Answers, and a Finding That Corrected Itself
tags: [handoff, continuation, complete-package, erp, tracker, supabase, decisions, signout, telegram, fx, cron, audit, verification, codex, lyra]
created: 2026-09-04
status: current
kind: complete continuation package — a fresh chat resumes from this file alone
supersedes: "[[2026-09-04 Exchange Rates, R7, and Two Agent Audits]] as the entry point; that note remains the record of phases 37-45 and every trap in it still applies"
covers: "phase 45 — the verification pass, the plan audited twice, the owner's three answers, C1 implemented, C6 and C7 found, and the documentation sweep"
decisions-made: "[[Decisions]] D47 and D48; D41 and D44 amended"
answered-by-owner:
  - "C1 — sign-out stays global, now explicit at both browser call sites (D47)"
  - "C4 — no external notification channel, decided rather than deferred (D48); this closes D31"
  - "C5 — rates-account password deferred again (D44); still open, reminder stands"
blocked-on-owner:
  - "C5 — rotate the rates-account password; procedure ready, needs a Supabase Dashboard action"
  - "C6 — GitHub queues this repository's scheduled runs 2.5-5 hours late"
  - "C7 — three released wires carry no rate, so D45's intent is unenforced"
uncommitted: "15 modified files and 4 untracked: the resolution plan, this package, and the handoff index. Nothing committed, nothing pushed. Re-read the counts with `git diff --shortstat` rather than trusting this line"
related:
  - "[[Decisions]] — D1 to D48, the authority on what is authorised"
  - "[[Remaining Work and Owner Decisions]] — A1-A2, B1-B2, C1-C7"
  - "[[Repository Evidence]] — the factual baseline"
  - "[[2026-09-04 Exchange Rates, R7, and Two Agent Audits]] — phases 37-45, the note this one supersedes"
  - "[[2026-09-03 Ten Closed, and a Backup Nobody Had Deployed]] — traps 1-63"
  - "[[2026-09-04 Owner Decision Brief, C5 to C7]] — the deep technical detail behind C5, C6 and C7, written for a cold-context agent"
  - "[[Handoff Index]] — every handoff, newest first"
  - "[Resolution plan](../docs/superpowers/plans/2026-09-04-c1-c4-c5-resolution.md) — mostly unexecuted, on purpose"
  - "[Supabase Schema](../supabase/README.md) — fifteen migrations"
  - "[Backups](../backups/README.md) — the restore procedure"
up: "[[AI Agent Context]]"
---

# Three Answers, and a Finding That Corrected Itself

**This is the current entry point and a complete continuation package.** Phase 45, all of it on
2026-09-04. A fresh chat resumes from this file alone.

*(The same phase is also summarised as §12 of the superseded
[[2026-09-04 Exchange Rates, R7, and Two Agent Audits]] and in [[Handoff]]. One number, three
places — this file is the complete account; the other two are pointers.)*

Nothing large shipped. Four lines of application code changed and two comment blocks were rewritten.
Everything else in this session was **judgement about work not to do** — a plan audited twice and
then mostly left unexecuted, three owner decisions two of which were "no", and two new findings
neither of which was acted on. The most useful thing in the session is a mistake I made and had to
correct twenty minutes later, and it is §5.

---

## 1. Read this first: the lesson, sharpened

The previous package's §1 said **verification means checking the thing itself, not the report about
the thing.** This session produced the cleanest possible demonstration, and it was mine.

At 06:57 UTC I checked `.github/workflows/fx.yml` and found no scheduled run had ever executed. Its
entire history was one manual `workflow_dispatch`. `fx_rates` held four plausible rows with a
plausible date, so every downstream check passed — the table had data because a human had pressed a
button once. I wrote that up as a finding: *the cron has never fired.*

**At 06:59:08Z it fired.** 4 hours 59 minutes behind its 02:00 UTC slot. The finding was true when
written and false two minutes later.

The generalisation, which is now trap 74: **"has not run yet" and "never runs" leave exactly the
same artifact.** A late scheduler and a dead scheduler are indistinguishable from the evidence.
Only waiting separates them, and I did not wait. Re-check immediately before writing a negative
conclusion down, because a negative conclusion about a *scheduled* thing has a shelf life.

Three corollaries carried forward from the previous package, all still live:

- Anywhere failure arrives in a **return value** rather than as an exception, the absence of an
  error proves nothing. This session hit it twice more: `npm audit` exited with a wrapper status of
  0 while printing `npm error audit endpoint returned an error` (§9), and a background command's
  `[exited with code 0]` said nothing about whether the command inside it succeeded.
- A fix in the working tree is not a fix in the system. `git fetch`, then `git log origin/main..HEAD`.
- `{"success": true}` proves the SQL ran, not that it achieved anything.

---

## 2. The state in one screen

Read live 2026-09-04 between 06:50 and 11:15 UTC. **Re-verify before acting** — §12 has the commands.

| | |
|---|---|
| `main` | local `010294c`, **`origin/main` is `f39de07`** — the backup job pushed a snapshot at 11:09:48Z, so the local branch is **one commit behind**. **This session's work is also uncommitted** — 15 modified files plus 4 untracked. Integrate `origin/main` before committing; the backup commit touches only `backups/`, so it rebases trivially. Read all of it back with `git fetch && git status --short && git diff --shortstat` |
| Production Supabase | `jusifpditdigqdjiwdaj` (`baby`), `ap-southeast-1`, free plan — 15 migrations |
| Rehearsal | `bucmcnsjkuprpojhequy` (`tracker-rehearsal`) — 15 migrations, `audit_log` 252 rows |
| **Off limits** | `lasycakyudaawrydetnm` (`zone-offices`) — a live CRM belonging to someone else. Paused. Do not touch |
| Vercel | project `tracker`, hobby, `https://tracker-six-flax.vercel.app` → `200` |
| GitHub | `Leuename/tracker`, private. **13 secrets** (unchanged — C4 added none). **5 workflows** |
| `txns` | **49 rows · ₱2,226,438.00 · `21a63ffeb6368cd06257f17a9aa01a49`** at 11:15 UTC. It read 23 / ₱269,317.00 / `6fc52ee3…` at 07:00; the owner entered 26 payables in between |
| `receipts` | 3 — two the owner's, one the retained backup proof `1788471059637` |
| `transfers` | 9 — **all released**, 6 priced at ECB 2026-09-02, **3 released unpriced** (§6, C7) |
| `recurring` | 0 |
| `fx_rates` | 4 rows, `as_of 2026-09-03`, `fetched_at 2026-09-03 14:43:59Z`, source `ECB via frankfurter.dev` |
| `audit_log` | 1,760 → 1,818 → 1,854 → **1,912**, `max(id)` equal to the count |
| Accounts | 5 — four `admin`, one `viewer` (`14f0d1af-f37a-4936-b278-e280bcb25129`, the rates job) |
| `is_viewer()` | `private` schema only. 17 write policies behind it, 0 referencing `public.is_viewer` |
| Advisors | one `WARN` (leaked-password, Pro-only). Three `INFO` unused-index — N2: leave them |
| `npm test` | **77/77** offline |
| `npm run build` | green, `vite v8.2.2`, 444.43 kB / 123.20 kB gzip |
| `npm run security` | **56/56**, 0 failed |
| `npx playwright test --workers=1` | **29/29**, ~1.5 min |
| `npm audit` | **NOT RUN.** Registry outage, §9. Last good reading: 0 vulnerabilities, on an unchanged lockfile |
| Toolchain | Node 24.18.1, npm 11.16.0, Vite 8.2.2 |

---

## 3. What happened, in order

| # | What | Trigger | Outcome |
|---|---|---|---|
| 45.1 | Verification pass | the previous package's resume prompt | Five drifts found, §4 |
| 45.2 | Plan audit, round 1 | "read this and evaluate it" | 8 defects against `2026-09-04-c1-c4-c5-resolution.md`, §7.1 |
| 45.3 | Prompt for Codex | "give me a prompt using /lyra" | An optimised, self-contained brief, §7.2 |
| 45.4 | Plan audit, round 2 | "this is what codex returned … double check again if this plan is feasible" | 8 confirmed fixed, **2 new defects**, §7.3 |
| 45.5 | Three owner answers | asked as one question set | C1 global, C4 none, C5 defer. §8 |
| 45.6 | C1 implemented | the answer | 4 lines, 2 comment blocks. §8.1 |
| 45.7 | Verification loop | "looped verifying, auditing, fixing, and testing" | Verifier REFUTED once, fixed, then CONFIRMED. §10 |
| 45.8 | C6 corrected itself | a routine re-check | §5 |
| 45.9 | Documentation sweep | "map, note, write, everything" | This package, plus [[Handoff Index]] and the graph updates in §11 |

---

## 4. The verification pass, and five drifts

The session opened by running the previous package's own checks rather than trusting its snapshot.
Everything it claimed about the database held exactly. Five things did not.

**4.1 — `main` was `010294c`, not `fb1c15c`.** The snapshot named a commit that predated its own.
`origin/main..HEAD` was empty, so it was pushed. **No CI run exists for `010294c`, and that is
correct**: `ci.yml` skips commits touching only `docs/` and `handoff/`, and `010294c` touched three
such files. Checked rather than assumed, because "no CI run" is exactly what a broken gate also
looks like.

**4.2 — `transfers` was `released 9, priced 6`, not the documented `released 6 / pending 3`.** See
§6. Owner activity, and the note had been stale from the moment it was written.

**4.3 — the FX cron appeared never to have fired.** See §5. This one turned out to be wrong.

**4.4 — the working tree was not clean.** `handoff/2026-09-04 Exchange Rates, R7, and Two Agent
Audits.md` carried a 9-line, whitespace-only reformat of its §8 table — an editor padding markdown
table cells, made outside any session's work. Left alone at the time and reported; later normalised
when that table was rewritten for real.

**4.5 — `.claude/rules/dependency-management.md` said "Vite 5".** `apps/web/package.json` pins
`vite ^8.2.2` and the build prints `vite v8.2.2`. **Fixed this session**, with the devDependency
list completed and a note saying to read the manifest rather than restate it from memory.

---

## 5. C6 — the finding that corrected itself

Kept in the shape it happened, because rewriting it into a tidy conclusion would destroy the point.

**06:57 UTC.** `gh run list --workflow=fx.yml` returned exactly one row: `workflow_dispatch`,
`2026-09-03T14:52:01Z`, success. No `schedule` event in the workflow's entire history. The `0 2`
cron had produced nothing, nearly five hours after its slot. `fx_rates.fetched_at` still pointed at
that manual run. Other schedules in this repository were landing 1.5 to 3 hours late, so five hours
looked outside the pattern. Written up as *"the FX cron has never fired"* — trap 71 in a second
costume, and reported to the owner in exactly those words.

**06:59:08Z.** A `schedule` run started and succeeded. **4 h 59 min after its 02:00 UTC slot.**
Found on a routine re-check about four hours later, while confirming the finding before shipping it.

**The run wrote nothing, and that is correct.** `fx_rates.fetched_at` is still
`2026-09-03 14:43:59Z`, every row still reads `as_of 2026-09-03`, and no audit trigger fired. The
ECB publishes once a day; its 2026-09-03 fix was already stored, so `fx.mjs` had nothing to write.
**This is the first demonstration of [[Decisions]] D43's idempotence on the scheduled path** rather
than on a manual rerun — a genuinely useful result that the wrong version of this finding would
have buried.

### What is actually left, and it is narrower

GitHub is queuing this repository's scheduled runs **2.5 to 5 hours** behind their cron slots.
`backup.yml`'s 06:00 UTC run had still not appeared by 11:03 UTC, leaving `backups/MANIFEST.md`
around fourteen hours old — same delay, not a second bug.

Both FX slots exist to land **before** the ECB's ~14:00 UTC publication, so the stored rate is
deliberately one working day old (D43). 08:00 UTC plus a five-hour delay is 13:00 UTC: still inside
the window, but the real margin is about an hour, not the six the cron appears to buy. **A longer
delay would flip the stored rate from T+1 to T+0 with nothing on screen changing.**

**Do not "fix" this by moving the cron hours.** 02:00 and 08:00 UTC are deliberate and decided
(D43), and moving them earlier makes the delay worse rather than better. If it is ever worth
closing, the cheap check is comparing the `as_of` actually stored against the date expected for the
run's wall-clock time — `fx_rates` already stores `as_of`, so nothing new is needed.

And the consequence that reaches C5: **never read a late or absent cron run as a failed credential
rotation.** That is why the resolution plan's Task 2 now dispatches a run rather than waiting for
one.

---

## 6. C7 — three released wires carry no rate

`select status, count(*), count(rate) from public.transfers group by 1` returns `released 9,
priced 6`. Every note written before this session says `released 6 / pending 3`.

The owner moved the last three from `pending` to `released` at **2026-09-04 02:26:59–02:27:03 UTC**
(10:27 Manila), recorded as `audit_log` 1697, 1698, 1699, actor `aepinza@gmail.com`. All three
crossed with `rate` and `rate_as_of` null:

| id | company | currency | amount |
|---|---|---|---:|
| `1788313757081` | `GZZ` | EUR | 100,000.00 |
| `1788318165685` | `ZPH` | USD | 79,180.00 |
| `1788318201948` | `MCR` | USD | 78,675.00 |

Ordinary owner work, not damage. The finding is what it exposes.

**[[Decisions]] D45 says a released wire carries the rate it went out at.** `apps/web/src/logic.js:261`
says the same in a comment: *"once this is set nothing may re-price it."* **Nothing in the
application stamps a rate when the status changes.** The rate is a manual field on the transfer form
(`apps/web/src/modals/EditTransfer.jsx` via `RateField.jsx`), and the inline status control on the
Telegraphic sheet does not touch it. So the documented invariant is enforced by nobody — trap 72.

Practical effect: those three fall to rung 2 of `rateFor()` and are re-valued off `fx_latest`
whenever the feed moves. They are **not** on the stale constants today, because the feed rung is
live, so this is drift rather than a wrong number on screen. `transferTotals` still reports the
oldest date it priced at, so the strip does not claim provenance it did not earn.

Two separable owner questions, neither acted on:

1. **Backfill the three?** The same reasoning that legitimised the 2026-09-02 backfill applies — the
   release date is a recorded fact in `audit_log`, so stamping the ECB rate for that date cites a
   published number rather than inventing one.
2. **Should release stamp a rate automatically from now on?** That is a behaviour change to the
   transfer form and the sheet's status control.

Both are writes to a live money ledger. Neither is mine to take.

---

## 7. The resolution plan, audited twice

The plan lives at `docs/superpowers/plans/2026-09-04-c1-c4-c5-resolution.md`. It is **untracked in
git** and now carries an outcome banner at the top saying which tasks ran and which must not.

### 7.1 Round one — eight defects

Ten claims in the plan were verified correct first, so the audit could not be dismissed as
scepticism: the FX Auth UUID is genuinely the `viewer` row; both workflows already declare a boolean
`dry_run` dispatch input mapped to `-- --dry-run`; `fx dry run complete` is the exact string at
`fx.mjs:204`; the scheduler insertion point has `overdue`, `unliquidated`, `today` and `dryRun` in
scope; the warning not to send the `lines` array is right, because `lines` carries company,
description, due date and per-row amount; only `schedule.yml` runs `npm run schedule`; `AGENTS.md`
and `CLAUDE.md` were byte-identical and both said "thirteen secrets"; `app.spec.js` writes no ledger
rows; and `node --env-file --input-type=module -e` works on Node 24.18.1.

Then the eight:

| # | Defect | Why it mattered |
|---|---|---|
| 1 | C5's closing evidence was *"observe the next scheduled FX run"* | No scheduled run had ever happened. The rotation could never be marked closed, and the wait would read as a rotation failure |
| 2 | The C4 kill switch was booby-trapped | Deleting the two Telegram secrets — the obvious way to silence the channel — would make the scheduler `exit 2`. Turning it off would need a code revert and a deploy |
| 3 | The transport collapsed every failure into one message, and the test never entered that branch | `catch { throw new Error('Telegram request failed.') }` erases timeout vs refused vs DNS — the exact defect this repo had just fixed in `e2e/network-preflight.js`. It built a `fetchImpl` seam and tested only the happy path |
| 4 | The e2e reorder moved the shared-session revocation to the front of the run | `scope: 'local'` still revokes that session's refresh token server-side, so 25+ later specs would run on a session that can no longer refresh. It works only because the access JWT outlives a 1.5-minute suite |
| 5 | One of two contradicting comments was left standing | `app.spec.js:88-95` said *"the sign-out spec below therefore has to run after this one"*, false the moment the reorder lands |
| 6 | The plan pre-answered C1 | *"Use this exact decision statement… C1: local"*, against a source document that says no default is safe to assume. It also never stated local's cost: a lost phone can no longer be revoked from another device |
| 7 | `store.jsx:62` excluded on a reason that does not hold | Grouped with the Node scripts as "different lifecycles". It is the same user in the same browser |
| 8 | `apps/web/package.json:12` is the `smoke` script | `test` is line 11 |

### 7.2 The Codex brief

Built with `/lyra` and deliberately shaped for a cold-context external agent: exact relative paths
only and no wikilinks, because the reader cannot resolve them; a "already verified correct" block so
it would not re-derive ten settled facts; each defect carrying its own evidence and `file:line`; the
scope fenced on both axes (**revise the document, do not execute it** and **no production writes**);
and acceptance criteria demanding verified-versus-inherited separation plus a check that would fail
if each change were wrong.

### 7.3 Round two — two more defects, both fixed here

Codex's revision closed all eight, correctly, and its own report was accurate about what it had and
had not checked. Two new problems:

**Defect 9 — the new test suite fails against a correct implementation.** Task 4's test used
`assert.throws(fn, new RegExp('^' + CONFIG))`. Node tests a RegExp against the error's **string
representation** — `Error: TELEGRAM_CONFIG: …` — not against `error.message`, so an anchored
`^TELEGRAM_CONFIG` can never match. Four assertions would have gone red against correct code, and
Step 2's deliberate "expect this to fail" check immediately before them would have been unreadable.
Proven by running it, not by reasoning:

```
ANCHORED-REGEXP: FAILED -> The input did not match the regular expression /^TELEGRAM_CONFIG/
WITH-ERROR-PREFIX: MATCHED
```

Fixed to `^Error: ` with a note in the plan explaining why, so nobody "simplifies" the anchor back.
The third test was already correct — it uses the validation-function form and asserts on
`error.message` itself. This is now trap 73.

**Defect 10 — nothing ever commits.** Task 5 Step 5 pushed `HEAD` to a branch, but no earlier task
committed anything, so it would have published a revision without the work. Added a branch-commit
step and a check that `apps/web/.env.local` is not in it.

### 7.4 The unexecuted half was proven anyway

Because C4 was declined, Tasks 4 and 5 will never run as written — which normally means their code
is asserted rather than known. So Task 4's module and test were extracted verbatim into a scratch
directory and executed offline:

```
✔ telegramConfig has an explicit off switch and rejects partial configuration
✔ sendTelegram accepts only HTTP and Telegram success
✔ sendTelegram classifies failures without echoing the token-bearing URL
ℹ tests 3 · pass 3 · fail 0
```

The specification kept in the plan is therefore **known-good, not merely written**. If C4 is ever
reopened it is a build, not a redesign.

---

## 8. The three answers, and what changed

Put to the owner as one question set, with both branches stated neutrally and the cost of each named.

| Item | Answer | Consequence |
|---|---|---|
| **C1** | **global**, made explicit | Plan Task 3's `global` branch executed. [[Decisions]] D47 |
| **C4** | **no external channel** | Plan Tasks 4 and 5 **not executed** and kept as specification. D48, which also closes D31 |
| **C5** | **defer again** | Plan Task 2 **not executed**. D44 stays active, reminder stands |

Three of the plan's six tasks were therefore deliberately skipped. Most of that document is
unexecuted by design, which is why it now opens with a banner saying so.

### 8.1 The exact change

```
apps/web/src/App.jsx      +6 −1   scope written out, with the reasoning
apps/web/src/store.jsx    +6 −1   same scope, the session-expiry handler
apps/web/e2e/app.spec.js  +19 −12 two comment blocks. NO test body, NO test order
```

- `apps/web/src/App.jsx:63` — the Sign out button now calls
  `supabase.auth.signOut({ scope: 'global' })`.
- `apps/web/src/store.jsx:67` — the session-expiry handler carries the same scope. **Every earlier
  framing of C1 missed this call site.** It is the same user in the same browser, and two different
  scopes there would be an accidental policy. Its practical impact is small — a dead session has no
  usable refresh token left to revoke — and the comment says so rather than overclaiming.
- The Node-script callers in `scripts/backup.mjs`, `scripts/schedule.mjs`, `src/smoke.mjs` and
  `security/probe.mjs` stay **bare**, deliberately: a script that signs in, works and exits has a
  different lifecycle, and normalising them would imply a shared rule that does not exist.
  `scripts/fx.mjs:203` already passes `local` for its own reasons and was not touched.

**Runtime behaviour is unchanged by construction** — `global` is what the unread default already
did. That is why the evidence for this change is an unchanged suite rather than a new assertion, and
why the value is legibility: the next reader cannot mistake a decision for an accident, and cannot
edit one call site without meeting the other.

**The e2e order is unchanged and still load-bearing.** Under global scope the sign-out spec revokes
both saved test sessions, so the forced-refresh spec must keep running before it (D41). Both comment
blocks were rewritten to describe the scope as chosen rather than inherited; the reorder the plan
described for the `local` branch was **not** performed.

---

## 9. `npm audit` did not run, and that is reported as such

Three attempts, all failing upstream:

```
http fetch POST 503 https://registry.npmjs.org/-/npm/v1/security/advisories/bulk 72198ms
npm warn audit network timeout at: https://registry.npmjs.org/-/npm/v1/security/advisories/bulk
npm error audit endpoint returned an error
```

A registry outage, not a repository problem. `apps/web/package.json` and `apps/web/package-lock.json`
are **not in this session's diff**, and two successful `npm audit` runs earlier the same day on that
identical lockfile reported **0 vulnerabilities**.

Recorded as **unrun** rather than passed, because substituting a stale reading for an unrun command
is the failure mode this project keeps writing down. One detail worth keeping: the backgrounded
attempt reported `[exited with code 0]` while its output contained `npm error` — a wrapper status is
not the command's verdict.

---

## 10. The verification loop

Non-trivial work gets a fresh-context adversarial pass before being called done. Two rounds ran.

**Round one — REFUTED.** It confirmed the code, the untouched Node scripts, the preserved test
order, `npm test` 77/77, the absence of any `TELEGRAM` string under `apps/web/**` or `.github/**`,
the absent `.env.local`, and `AGENTS.md` ≡ `CLAUDE.md`. It refuted one thing: `docs/AI Agent
Context.md:25` still said the handoff covered **"phases 37-44"** while the change had just added a
§12 "Phase 45" to it. Fixed, along with the same range in the handoff's own intro and the trap count.

**Round two — CONFIRMED.** Re-verified the fix, checked `docs/Handoff.md`'s new section against the
actual diff, re-ran `npm test` and `npm run build`, and swept every changed file for cross-document
contradictions about C1/C4/C5, D-ranges and section numbers. Clean.

It also surfaced a **pre-existing** self-contradiction it was not asked about: `docs/Repository
Evidence.md` claimed both that the CI gate is active and deploying, and — 97 lines later — that the
app "still has no server component, no CI, no deployment". Untouched by this diff and false since
2026-09-01. **Fixed**, since that document had just been named as the current inventory. The same
sweep found two more stale sentences in `docs/Handoff.md` and corrected them in place, both marked
as corrections rather than silently rewritten.

Both agents were told explicitly not to run `npx playwright`, `npm run e2e`, `npm run smoke` or
`npm run security`, because those write to a live ledger the owner was using at the time. Neither
did.

---

## 11. Everything changed this session

### Application source

| Path | Change |
|---|---|
| `apps/web/src/App.jsx` | `{ scope: 'global' }` + a five-line comment naming D47 and pointing at `store.jsx` |
| `apps/web/src/store.jsx` | Same scope + a comment naming D47 and stating the honest, small impact |
| `apps/web/e2e/app.spec.js` | Two comment blocks replaced. No test body, no order change |

### Decisions

| Path | Change |
|---|---|
| `docs/Decisions.md` | **D47** browser sign-out is explicitly global · **D48** no external notification channel · **D41** amended: the scope is chosen, not inherited, and the ordering stands · **D44** amended: raised again 2026-09-04 and deferred again |

### Notes and policy

| Path | Change |
|---|---|
| `docs/Remaining Work and Owner Decisions.md` | C1/C4 resolved, C5 re-deferred, **new section D** carrying C6 and C7, summary table and intro rewritten |
| `docs/Repository Evidence.md` | Live state at 07:00 and 11:00, both fingerprints, the C6 correction, the C1 change, **and the pre-existing CI self-contradiction fixed** |
| `docs/AI Agent Context.md` | Entry point, phase range 37-45, traps 64-74, C1/C4 answered, C5/C6/C7 open, D31 closed |
| `docs/Handoff.md` | New newest-first section for this pass; the stale "Resuming from" pointer; two stale legacy claims corrected in place |
| `handoff/2026-09-04 Exchange Rates, R7, and Two Agent Audits.md` | §12 added, §8/§9 rewritten, §10 SQL corrected, traps 72-74, resume prompt rewritten, table normalised |
| `AGENTS.md`, `CLAUDE.md` | The stale "current handoff" pointer. Changed identically, verified with `cmp` |
| `.claude/rules/dependency-management.md` | "Vite 5" → the real pinned versions, with a note to read the manifest |
| `docs/superpowers/plans/2026-09-04-c1-c4-c5-resolution.md` | Defects 9 and 10 fixed; outcome banner; C6 claim refined |
| `docs/Open Problems and Proposals.md` | Item 8c, the scheduler's missing notification channel, struck through and answered by D48 |
| `handoff/2026-09-04 Remaining Work Implementation Handoff.md` | Superseded banner — it told a future session to ask the owner to choose C1 and C4, which are now answered |
| `docs/superpowers/plans/2026-09-04-remaining-work-decisions.md` | Same banner, same reason |
| `handoff/Handoff Index.md` | **New.** A map of content for fourteen handoffs that had no index |
| `handoff/2026-09-04 Three Answers, and a Finding That Corrected Itself.md` | **New.** This file |

### Not changed, deliberately

No commit, no push, no tag. No Telegram code, secret or workflow wiring. No password rotation. No
write to the three unpriced wires and no change to how release works. No change to any cron
schedule. No migration. No dependency. `company_tracker/` untouched. The three applied FX/R7
migration files untouched — their byte-identity is the evidence.

---

## 12. How to verify state in a fresh session

```bash
cd /Users/itadmin/Desktop/puge
git fetch origin && git log origin/main..HEAD    # FETCH FIRST
git status --short                               # expect this session's uncommitted work

cd apps/web
npm test                          # 77
npm run build                     # vite 8.2.2
npm audit                         # 0 — may fail on a registry outage; report unrun, not passed
npm run security                  # 56, 0 failed — WRITES to production
npx playwright test --workers=1   # 29, ~1.5 min — WRITES to production
```

```sql
-- A MOVING BASELINE. Read it as YOUR baseline; assert it across YOUR OWN writes only.
select md5(string_agg(t::text, chr(10) order by t.id)) fingerprint, count(*), sum(amount)::text
  from public.txns t;   -- 21a63ffeb6368cd06257f17a9aa01a49, 49, 2226438.00 at 11:15 UTC

-- R7 landed: private present, public absent, nothing pointing at the old function
select (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='private' and p.proname='is_viewer') private_fn,
       (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='public'  and p.proname='is_viewer') public_fn,
       (select count(*) from pg_policies
          where (coalesce(qual,'')||coalesce(with_check,'')) like '%public.is_viewer%') stale;
-- expect 1, 0, 0

select status, count(*), count(rate) priced from public.transfers group by 1;
-- expect released 9, priced 6. The three unpriced are C7. Do NOT stamp one unasked.

select id, co, name, file_path from public.receipts order by id;
-- expect 3. Delete NONE. 1788471059637 is the backup proof.

select * from public.fx_rates order by 1;   -- 4 rows; check as_of against the day
```

```bash
# C6: are scheduled runs still landing hours late?
gh run list --repo Leuename/tracker --workflow fx.yml --json event,createdAt,conclusion
gh run list --repo Leuename/tracker --workflow backup.yml --json event,createdAt,conclusion
```

Documentation checks, since this repository treats stale notes as defects: every local link
resolves, code fences balance, no placeholders, `cmp AGENTS.md CLAUDE.md` is silent, and
`git diff --check` is clean.

---

## 13. Traps, continued from 71

The full set is 1-63 in [[2026-09-03 Ten Closed, and a Backup Nobody Had Deployed]] and 64-71 in
[[2026-09-04 Exchange Rates, R7, and Two Agent Audits]]. All still apply.

72. **A documented invariant that no code enforces is a comment, not an invariant.** D45 and
    `logic.js:261` both say a released wire keeps the rate it went out at. Nothing stamps one when
    the status changes. Before trusting a rule written in a note, find the line that makes it true.
73. **`assert.throws(fn, regexp)` tests `String(err)`, not `err.message`.** The string is
    `Error: MESSAGE`, so an anchored `/^MESSAGE/` never matches and the test fails against a
    *correct* implementation. Use `/^Error: MESSAGE/`, or the validation-function form and assert on
    `error.message` yourself.
74. **"Has not run yet" and "never runs" leave the same artifact.** A late scheduler is
    indistinguishable from a dead one. GitHub queues this repository's scheduled runs **2.5 to 5
    hours** behind their slots. Re-check immediately before writing a negative conclusion down.
75. **A wrapper's exit status is not the command's verdict.** A backgrounded `npm audit` reported
    `[exited with code 0]` while printing `npm error audit endpoint returned an error`. Read the
    output, not the status.
76. **An agent's plan can be right and its tests still wrong.** Two rounds of audit found ten
    defects; the last two were in the code meant to *prove* the plan worked. Run the tests a plan
    ships with before trusting the plan.

---

## 14. Still open

| ID | Item | Blocked on |
|---|---|---|
| **C5** | Rotate the rates-account password | The owner. Procedure ready in the plan's Task 2. Needs a Supabase Dashboard action; the Admin API path is barred because it needs a `service_role` key this repo deliberately does not hold |
| **C6** | Scheduled runs land 2.5-5 h late | The owner. §5. Not urgent; do not move the cron hours |
| **C7** | Three released wires carry no rate | The owner. §6. Two separable questions |
| — | Local branch is behind `origin/main` | The backup job pushed `f39de07` at 11:09:48Z. Integrate before committing |
| — | This session's work is uncommitted | The owner. A push to `main` deploys production |
| **A1** | Full-volume `audit_log` restore | A supervised `postgres` connection string. None exists — not in the repo, not among the 13 secrets. The file is 1.7 MB; chunking failed at 5 of 23 before and is the known failure mode |
| **A2** | Run `backups/verify-restore.sql` | Same string. Its assertions are proven individually; the file has never executed |
| **B1** | F5's 1,000-object storage ceiling | Somewhere disposable. Do not create 1,001 objects in production |
| **B2** | Blank-target schema replay | An approved empty project. The rehearsal is no longer blank |
| — | R11 human viewer | A `viewer` exists but is a robot credential. The read-only **UI** path is unproven with a person |
| — | Leaked-password protection | Pro-only |

**Closed this session:** C1 (D47) · C4 (D48, which also closes D31) · the plan's two remaining
defects · the `Repository Evidence` CI self-contradiction · two stale claims in `docs/Handoff.md` ·
the "Vite 5" drift · the missing handoff index.

---

## 15. Resume prompt

```
Read these, in this order, in /Users/itadmin/Desktop/puge:

  handoff/2026-09-04 Three Answers, and a Finding That Corrected Itself.md   (START HERE)
  docs/Remaining Work and Owner Decisions.md                       (A1-A2, B1-B2, C1-C7)
  docs/Decisions.md                                                (D1-D48)
  handoff/2026-09-04 Exchange Rates, R7, and Two Agent Audits.md   (phases 37-45, traps 64-71)
  handoff/2026-09-03 Ten Closed, and a Backup Nobody Had Deployed.md  (traps 1-63, all still apply)
  docs/superpowers/plans/2026-09-04-c1-c4-c5-resolution.md         (MOSTLY UNEXECUTED, on purpose)
  supabase/README.md                                               (fifteen migrations, the rename note)
  backups/README.md                                                (the restore procedure)
  handoff/2026-09-04 Owner Decision Brief, C5 to C7.md             (deep detail on C5/C6/C7)
  handoff/Handoff Index.md                                         (map of every handoff)

React + Vite ERP in apps/web on Supabase Postgres, deployed to Vercel behind a CI gate. FIVE
accounts: four administrators and one viewer account that writes exchange rates and nothing else.
ONE shared ledger holding REAL money, used daily by the owner during Manila working hours. There is
NO staging environment: npm run e2e, npm run smoke and npm run security all WRITE to production.

THERE IS UNCOMMITTED WORK IN THE TREE unless someone has since committed it: 15 modified files
and 4 untracked — docs/superpowers/plans/2026-09-04-c1-c4-c5-resolution.md, this
handoff, and handoff/Handoff Index.md. Run `git status --short` FIRST and trust it over these
numbers, then decide with the owner whether to commit. A push to main deploys production.

VERIFY, do not trust this snapshot. `git fetch origin && git log origin/main..HEAD` — FETCH FIRST, a
stale read caused a false alarm on 2026-09-04. Then in apps/web: npm test (77), npm run build,
npm audit (0), npm run security (56), npx playwright test --workers=1 (29). Then the SQL in
section 12. If npm audit fails on a registry 503, report it UNRUN — do not substitute an older
reading.

THE TXNS FINGERPRINT IS A MOVING BASELINE, NOT AN INVARIANT. It was
21a63ffeb6368cd06257f17a9aa01a49 (49 rows, PHP 2,226,438.00) at 11:15 UTC on 2026-09-04, having
been 6fc52ee3f41d2ffd0e9292d8dc4f015d (23 rows, PHP 269,317.00) four hours earlier because the
owner entered 26 payables. A value you do not recognise is the NORMAL case. Read it at the start
of your session as YOUR baseline, assert it unchanged across YOUR OWN writes, and never sweep,
restore or rewind to make it match a number written in a document.

Already decided on 2026-09-04 — do not reopen:
- C1 — sign-out stays GLOBAL and is now explicit at apps/web/src/App.jsx:63 and
  apps/web/src/store.jsx:67 (D47). Runtime behaviour did not change. Do not revert either call to a
  bare signOut(), and never give the two same-browser callers different scopes. The Node scripts
  stay bare on purpose; scripts/fx.mjs:203 stays 'local'.
- C4 — the scheduler gets NO external notification channel (D48). This closes D31. Telegram was
  fully specified, costed and declined; Tasks 4 and 5 of the plan are kept unbuilt as that
  specification and their code was proven offline (3 tests, 3 pass). Do not build it unasked.
- C5 — the rates-account password was raised again and DEFERRED AGAIN (D44). Still open. Keep
  reminding. Do not rotate it unasked.

Open, none of it yours to close alone:
- C5 above. Procedure ready in the plan's Task 2, rollback rules included. It needs a Supabase
  Dashboard action; the Admin API path is barred because it needs a service_role key this repo
  deliberately does not hold. Full technical detail for C5, C6 and C7 — exact policies, grants,
  measured cron delays, the audit-log provenance of the three wires, and a backfill shape — is in
  handoff/2026-09-04 Owner Decision Brief, C5 to C7.md.
- C6 — GitHub queues this repo's scheduled runs 2.5-5 HOURS late. The FX cron's first ever
  scheduled run fired at 2026-09-04T06:59:08Z, 4h59m after its 02:00 UTC slot, and correctly wrote
  nothing because the ECB fix was already stored. Both FX slots exist to land before ECB
  publication at ~14:00 UTC, so the real margin is about an hour, not six; a longer delay flips the
  stored rate from T+1 to T+0 silently. Do NOT move the cron hours — 02:00 and 08:00 UTC are
  deliberate (D43) and moving them earlier makes it worse.
- C7 — three released wires carry no rate. The owner released them at 2026-09-04 02:27 UTC
  (audit_log 1697-1699): GZZ EUR 100,000, ZPH USD 79,180, MCR USD 78,675. Nothing in the app stamps
  a rate on release, so D45 and the comment at apps/web/src/logic.js:261 describe an invariant no
  code enforces. Two owner questions: backfill the three, and whether release should stamp
  automatically. Do not write to them unasked.
- A1/A2 — the full audit_log restore and verify-restore.sql, IF the owner supplies a supervised
  postgres connection string. Without one say "blocked" rather than chunking it; chunking failed at
  5 of 23 and is the known failure mode.
- B1/B2 — low value. Do not manufacture 1,001 production objects or create a paid project.

Hold these while you work:
- Verification means checking the thing itself, not the report about the thing. Section 1 is the
  argument and section 5 is me getting it wrong.
- "Has not run yet" and "never runs" leave the same artifact (trap 74). Re-check immediately before
  writing down that something never ran.
- A resolved fetch is not a healthy response, and a wrapper's exit code is not the command's
  verdict (trap 75). Anywhere failure arrives in a RETURN VALUE, the absence of an error proves
  nothing.
- A FIX IN THE WORKING TREE IS NOT A FIX IN THE SYSTEM. git fetch, then git log origin/main..HEAD.
- {"success": true} proves the SQL ran, not that it achieved anything. Assert the refusal, not the
  absence of an error: a blocked policy and a missing row both give row_count = 0.
- A documented invariant that no code enforces is a comment, not an invariant (trap 72).
- assert.throws(fn, regexp) tests String(err), so /^MESSAGE/ never matches "Error: MESSAGE"
  (trap 73).
- A row without an E2E- tag may be the owner's. Never sweep one. receipts row 1788471059637
  ("DO NOT DELETE — backup proof") is the storage-restore evidence — deleting it orphans the object
  and destroys the proof.
- fx_rates' write policies name ONE account's uid instead of gating on not private.is_viewer()
  (D42). Deliberate one-off. Do not copy it onto another table, do not "fix" it to match.
- Do NOT revoke EXECUTE on any is_viewer (N1/D34); remove the three unused indexes (N2); raise the
  Playwright timeouts (N3); reimplement recurrence in SQL (N4); add a credential fallback for
  SCHEDULE_*/FX_* (N5); modify company_tracker/ (N7); delete from audit_log (N8); or delete a
  failing security check to make a suite green (D26).
- Do NOT edit the three applied FX/R7 migration files. Their contents are byte-identical to what
  was applied and that identity IS the evidence; their stale filename cross-references in comments
  are deliberate.
- .upsert() breaks against column-scoped grants (trap 64). Split into insert + targeted update.
- zone-offices (lasycakyudaawrydetnm) is a LIVE CRM belonging to someone else. Paused. Do not
  touch. tracker-rehearsal (bucmcnsjkuprpojhequy) is the scratch project.
- AGENTS.md and CLAUDE.md are equal synchronized policies. Change both in one commit and keep them
  byte-identical.
- This vault IS the repository. Notes go in docs/ (Title Case) and handoff/ (YYYY-MM-DD Title.md).
  Never write into .obsidian/ — Obsidian excludes it from the index, so the graph goes dark.

Suggested first move: run the verification above and report what drifted, then ask the owner whether
to commit the pending work. Report what you verified and what drifted, confirm the state back in a
few lines, and wait for direction before starting.
```

## Guideline Basis

- **PG-04** names the reproducible check behind every claim here; every figure was read live on 2026-09-04 and §9 marks the one command that did not run.
- **DOC-02** keeps observation, decision, audit and open question separately labelled — §5 keeps a wrong observation next to its correction rather than replacing it.
- **MD-02** requires resolvable links; every wikilink and relative path here targets an existing file.
- **DOC-03** reuses the established C/D/N/R and trap identifiers rather than renumbering them.
- **SEC-03** is why no credential, token or password value appears here, and why C5 describes blast radius instead of the secret.
- **GIT-04** is why the uncommitted state is stated in the frontmatter, the state table, the open items and the resume prompt rather than mentioned once.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [[2026-09-04 Owner Decision Brief, C5 to C7]] · [[Handoff Index]] · [[Remaining Work and Owner Decisions]] · [[Decisions]] · [[Repository Evidence]] · [[AI Agent Context]] · [[Handoff]] · [[2026-09-04 Exchange Rates, R7, and Two Agent Audits]] · [[2026-09-03 Ten Closed, and a Backup Nobody Had Deployed]] · [Resolution plan](../docs/superpowers/plans/2026-09-04-c1-c4-c5-resolution.md) · [Supabase Schema](../supabase/README.md) · [Backups](../backups/README.md)
