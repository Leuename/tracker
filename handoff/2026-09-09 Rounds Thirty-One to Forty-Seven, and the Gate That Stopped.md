---
title: Rounds Thirty-One to Forty-Seven, and the Gate That Stopped
tags: [handoff, continuation, complete-package, entry-point, erp, tracker, supabase, adversarial-review, review-loop, mutation-testing, money-path, ci-gate, deployment-drift, prototype-pollution, verification, codex-brief]
created: 2026-09-09
status: current
kind: complete continuation package — THE entry point. A fresh chat, or Codex, resumes from this file.
supersedes: "[[2026-09-08 The Identity Rollout, and Rounds Twenty-Six to Thirty]] as the entry point. It is not obsolete: it remains the record of the occurrence-identity rollout and rounds 26-30."
covers: "adversarial rounds 31 to 46 (decisions D85-D100), round 47 which never ran, the ten-minute production outage this session caused, C9 — the CI gate that stopped running jobs — and the resulting deployment drift"
decisions-made: "[[Decisions]] D85 to D100"
verification-status: "npm test 237/237, npm run build clean, npm audit 0, npm run e2e 52/52 against a LOCAL dev server, npm run security 60 checks 0 failed 0 deferred. ALL VERIFIED LOCALLY. NONE OF IT IS DEPLOYED: production serves the round-42 bundle, and rounds 44, 45 and 46 — including a money-path fix — are committed but not live. The loop is NOT closed: no round has ever returned empty, and round 47 was killed by a session rate limit before it read a file."
owner-actions-closed: "C7 — the owner priced all three unpriced wires himself at 2026-09-08 02:12 UTC"
owner-actions-open: "C5, C6, C8, C9, and the Vercel system-variable setting"
related:
  - "[[2026-09-08 The Identity Rollout, and Rounds Twenty-Six to Thirty]] — the rollout and rounds 26-30"
  - "[[2026-09-07 Session Continuation, Rounds One to Twenty-Five]] — rounds 1-25 and the shape of the loop"
  - "[[2026-09-06 The Review Loop, Rounds One to Twenty]] — the round-by-round ledger and the rate-limit history"
  - "[[2026-09-05 The Design Port, and Three Requirements the File Did Not Show]] — the design port, the twelve client requirements, the eighty-one-row findings table, traps 77-107"
  - "[[Decisions]] — D1 to D100, the authority on what is authorised"
  - "[[Repository Evidence]] — the factual baseline"
  - "[[Remaining Work and Owner Decisions]] — A1-A2, B1-B2, C5-C9"
  - "[[Handoff Index]] — every handoff, newest first"
up: "[[AI Agent Context]]"
---

# Rounds Thirty-One to Forty-Seven, and the Gate That Stopped

## 1. What happened, in one paragraph

The adversarial review loop ran from round 31 to round 46 and **found something every single
time** — sixteen consecutive rounds, sixteen decision records, D85 through D100. Five of those
rounds (32-36) found the *same class* of defect in whichever file the previous round had not been
pointed at, which is why the fix stopped being a patch and became a structural one. Two rounds found
that the *previous round's own evidence was fake*. One of my own fixes blanked production for ten and
a half minutes. And then the thing that matters most for whoever reads this next: **GitHub Actions
stopped running jobs entirely, so the CI gate cannot deploy, so every fix from round 44 onward — a
money-path fix among them — is green in git and absent from the running application.**

## 2. The rounds

Each row names the decision record; the record holds the detail, the reproduction and the mutation
evidence. Do not re-derive them here.

| Round | What it found | Record |
|---|---|---|
| 31 | A status the dropdown does not offer blanked the whole app | [[Decisions]] D85 |
| 32 | The tenth `obj[key]` site — and a decision record that was not true | D86 |
| 33 | The same defect, a third round running, in whichever files were named | D87 |
| 34 | One guard for the class, because the call sites keep moving | D88 |
| 35 | A ratchet instead of a promise (`lookups.test.js`) | D89 |
| 36 | Make the shape impossible, not detectable — `bare()` / `Object.create(null)` | D90 |
| 37 | The guarantee did not survive its own lifecycle | D91 |
| 38 | The **write** half of the class, which no grep could have found | D92 |
| 39 | A pasted number seven orders of magnitude wrong | D93 |
| 40 | A minus sign that was not a minus sign (U+2212, U+2013, U+FF0D) | D94 |
| 41 | The scheduler was living in a different day (no zone) | D95 |
| 42 | A leap day that crossed no month | D96 |
| 43 | The probe went **greener** when the application broke | D97 |
| 44 | The restore left out a table, and the verifier agreed with it | D98 |
| 45 | A think-pause between two digits wrote money | D99 |
| 46 | The mutation I ran was not the mutation that mattered | D100 |
| 47 | **Never ran.** Killed by a session rate limit before it opened a file. | — |

**The two findings worth reading in full if you read nothing else.**

*Round 36 → D90.* Rounds 32 to 36 each found another `obj[key]` lookup on data the database does not
constrain, and each time the fix was another guarded call site. `Object.prototype` members are
truthy, so they defeat every `|| fallback` written after them. The fix that ended it was not a better
guard: it was `bare()` in `src/data.js`, which builds every constant this app indexes by row data
with `Object.create(null)`. There is no prototype to inherit from, so the lookup is safe **however it
is spelled** — including the four spellings a source-text ratchet provably cannot catch, which are
listed at the top of `src/lookups.test.js`.

*Round 45 → D99, corrected by round 46 → D100.* Typing an amount and pausing between two digits sent
the half-typed number down to the linked ledger rows, because the push-down was on the same 500 ms
keystroke debounce as the local row save. D99 then claimed the fix was guarded and **the claim was
false**: the mutation I ran changed the constant `PUSH_DELAY`, which the tests assert directly, while
reverting the *production wiring* — `}, PUSH_DELAY)` in `recEffects` — left all 235 tests green. The
rule that came out of it, and the one to carry forward: *a mutation test proves something about the
line you mutated; if that line is not the one shipping the behaviour, it proves nothing about the
behaviour.* Round 46 also found the warning lied on two paths — a push that wrote zero rows, and a
push Postgres refused, both told the person "the linked Tracker rows were already updated", and
because `flash` is a single slot that warning **erased the genuine permission error**. With
`recurring` empty in production, the zero-row path is the normal one.

## 3. Three things that went wrong, and were mine

- **I blanked production for ten and a half minutes** (`c480f3e`, reverted `9f0aee1`, relanded
  `daee328`). My edit replaced a span starting above two `const` declarations and never re-declared
  them; `StoreProvider` threw a `ReferenceError` on render. `npm test` was green, `npm run build` was
  green, the CI gate was green — because **none of them import a `.jsx` file**. The rule now in both
  `CLAUDE.md` and `AGENTS.md`: run Playwright against a local dev server before pushing anything
  under `apps/web/src/`. Recorded as D84.
- **`git add -A` swept a running verifier's in-flight mutation into a commit** (`ba397fa`) and pushed
  it. CI failed in 12 seconds and the deploy was skipped, so nothing reached production. Stage
  explicit paths while a subagent is running.
- **Ten decision records overstated their evidence** — D85, D88, D89's ratchet, D90, D91's scope,
  D93, D95, the "invariant" fingerprint claim, D99, and one more. Each now carries an inline
  correction rather than a silent edit. This is the loop's most persistent failure mode and it is
  worth assuming the next record has it too.

## 4. C9 — the gate stopped, and what that means right now

**Every GitHub Actions job fails in two to three seconds having executed zero steps.** Latest
evidence, run `34244030155` for commit `c3c4a8d`: job `check` failure with 0 steps, job `deploy`
skipped, started 15:19:43Z and over at 15:19:46Z. Repository-level Actions permissions are
`{"enabled":true,"allowed_actions":"all"}`, so it is **not** a repository setting; it reads as an
account-level spending or billing stop, and the billing endpoint needs a `user` scope this token does
not have. **Only the owner can see the cause.** It has been persistent since roughly 12:00 UTC on
2026-09-08 and a fresh manual dispatch reproduced it.

### What that costs, stated exactly

`ci.yml` runs the checks and *then* deploys with the Vercel CLI; automatic git deployments are off in
`apps/web/vercel.json` by [[Decisions]] D27, precisely so that GitHub gates production. With the gate
dead, nothing deploys at all. Verified at 2026-09-08 19:14 UTC:

- production serves `/assets/index-CvO23MaO.js`; a build of `HEAD` produces `index-uPCpXUsX.js`
- the live bundle contains **zero** occurrences of the round-45/46 marker string `already updated`;
  the local build of `HEAD` contains one

So production is running the bundle from **`c7daee1` (round 42)**, and these are committed but not
live:

| Commit | Round | Application files not deployed |
|---|---|---|
| `6bb176c` | 44 | `src/actions.js`, `src/logic.js`, `src/screens/Masterlist.jsx` |
| `c4c64e6` | 45 | `src/actions.js`, `src/masterlist.js`, `src/pending.js` |
| `c3c4a8d` | 46 | `src/actions.js`, `src/masterlist.js`, `src/pending.js` |

`d31e8f0` (round 43) changed only `security/probe.mjs`, which is a local script and never shipped to
a browser, so that one costs nothing.

**The money-path defect D99 describes is therefore still live for the owner.** It needs `recurring`
to be non-empty to fire and `recurring` is currently 0 rows, which is the only reason this is not an
emergency. It becomes one the moment a recurring payable is created.

**Do not hand-deploy around the gate.** D27 exists because GitHub checks do not gate Vercel; bypassing
it re-creates the exact hole the decision closed. The fix is the owner clearing C9.

## 5. Live state, verified 2026-09-08 19:14 UTC

Read directly from production, not copied from a document.

| Fact | Value |
|---|---|
| `app_config.data.settings.__e2eHeld` | `null` — no run was killed mid-spec |
| categories / companies | 19 / 21 — `Refund` **is** present |
| `txns` | 49 rows, 0 with `src` set and `occurrence_due` null, 0 `E2E-` residue |
| `transfers` | 12 rows (9 released, 3 pending), 0 `E2E-` residue, **all 12 priced** |
| `receipts` | 3 rows; row `1788471059637` still holds its file — the backup proof |
| `recurring` | **0 rows** |
| `fx_rates` | 12 rows, newest `as_of` 2026-09-07 (one working day behind by D43 — but see C6) |
| migrations | 21 on disk, 21 applied, newest `20260907182000` |
| the identity index | `txns_one_generated_row_per_occurrence` present; D63's `(src, due)` gone |
| a `status` CHECK constraint | **none** — C8 is still open |
| last `audit_log` write | 2026-09-08 15:18:55 UTC, from my own e2e run |

**Counts are baselines, not invariants.** The owner enters rows daily. Assert them unchanged across
*your own* writes; never sweep or rewind to make them match a number in a document.

## 6. What closed while this session ran — and it was not me

**C7 is closed by the owner's own hand.** `aepinza@gmail.com` priced all three released wires on
2026-09-08 between 02:12:18 and 02:12:54 UTC (`audit_log` 9952, 9960, 9961), each stamped with the
ECB rate as of 2026-09-07: `GZZ` EUR at 72.801000, `ZPH` USD and `MCR` USD at 62.640681. That answers
C7's first question. **Its second question is still open**: whether moving a wire to `released`
should stamp a rate automatically from now on, which is a behaviour change to the transfer form and
not mine to take.

`Refund` is present in production's categories and no longer an owner-gated item.

## 7. Still open, and none of it is mine to close

| Item | State |
|---|---|
| **C9** | Actions run zero steps. Blocks deploys, the nightly `verify.yml`, both `fx` runs, the daily `schedule` run and both `backup` snapshots. Owner must look at billing. |
| **C5** | `admin@admin.com` / `admin` — the FX account — is live on production. The owner has deferred rotating it **twice**. Keep raising it. |
| **C6** | Scheduled crons land 2.5-5 hours late. Moot while C9 stands, real again the moment it clears. |
| **C8** | `status` is free text in the database, enforced only by a dropdown. Confirmed absent again today. |
| **Vercel** | The system-environment-variable setting the owner still has to flip. |

## 8. What is NOT verified

- **Nothing since round 42 has run in production.** Every green number in this document is local.
- **Round 47 never ran.** Two dispatches: the first died on a classifier timeout, the second on
  `You've hit your session limit`. No round has ever returned empty, so the loop's stopping condition
  has never been met and **must not be reported as met**.
- `npm run smoke` and `npm run security` last ran at `5eadf6e`; round 46 touched only `masterlist.js`,
  `pending.js` and their test, so the probe result still stands — but it has not been re-run since.
- The rounds have never examined: `src/store.jsx` in full, `src/ui.jsx`, the modal components, or
  `scripts/rewind.mjs` beyond its plan module.

## 9. The `/goal`, past, current and future

The standing goal is verbatim: *"solve all the held-backs, open-items, problems arising, and
everything that is coding related. Then, do a looped end-to-end, full-stack: auditing, verification,
testing, fixing, etc… and only return to me once there are nothing to fix and solve."*

- **Past.** Every coding-related item raised in this session has been fixed, mutation-checked and
  committed. Sixteen rounds, sixteen records, 235 → 237 assertions, e2e 49 → 52 specs, the security
  probe 57 → 60 checks.
- **Current.** The goal is **not met**, on two independent counts. The loop has never returned an
  empty round, and the work that is finished cannot reach production while C9 stands. Both of those
  are honest blockers, not a reason to stop looping.
- **Future.** Dispatch round 47 with the brief in section 10, fix what it finds, and keep going until
  a round comes back genuinely empty. Meanwhile the owner clears C9; the moment Actions run again,
  push nothing new — just re-dispatch `ci.yml` on `main`, confirm the deploy lands, then run the
  Playwright suite **against the deployment** and compare the live bundle hash to a local build.

## 10. How a fresh session verifies state

From `apps/web`, in this order — the order is load-bearing, because the probe's secret scan reads
`dist/assets` and running it before the build scans the *previous* bundle:

```bash
npm test          # expect 237 across 13 files
npm run build
npm audit         # expect 0
# Playwright against a LOCAL dev server, never against production for a routine check:
npm run dev &     # then, with E2E_BASE_URL unset:
E2E_REQUIRE_CREDENTIALS=1 npx playwright test --workers=1   # expect 52 passed
rm -rf test-results   # traces hold E2E_PASSWORD and live refresh tokens in plaintext
npm run security  # 60 checks, 0 failed, 0 deferred — WRITES TO PRODUCTION
```

Then confirm the deploy drift is still what section 4 says:

```bash
curl -s https://tracker-six-flax.vercel.app/ | grep -o '/assets/index-[A-Za-z0-9_-]*\.js'
ls apps/web/dist/assets/index-*.js
```

Different hashes mean the gate is still down. Then the live-state SQL:

```sql
select
  (select data->'settings'->>'__e2eHeld' from public.app_config where id)            as held,
  (select jsonb_array_length(data->'categories') from public.app_config where id)    as cats,
  (select count(*) from public.txns)                                                 as txns,
  (select count(*) from public.txns where src is not null and occurrence_due is null) as unresolved,
  (select count(*) from public.txns where description like '%E2E-%')                 as txn_residue,
  (select count(*) from public.transfers where name like '%E2E-%')                   as tr_residue,
  (select count(*) from public.receipts where id = 1788471059637 and file_path is not null) as backup_proof,
  (select count(*) from public.recurring)                                            as recurring,
  (select max(at)::text from public.audit_log)                                       as last_audit;
```

Expect `held` null, `cats` 19, `unresolved` 0, both residues 0, `backup_proof` 1. If `last_audit` is
minutes old and carries a human's email, **a person is in the app — wait before writing anything.**

## 11. Suggested skills

- `superpowers:systematic-debugging` before touching any defect a round reports. The loop's whole
  history says the second explanation is usually the right one.
- `superpowers:brainstorming` before any change that alters a money path, and before agreeing to
  close the loop.
- `handoff` at the end of the next session. This folder's convention is one file per session, never
  an overwrite.
- `obsidian-vault` for note placement and linking; the repository root **is** the vault.
- `verifier` subagents for every round — the loop's first rule, below.

## Resume prompt

```
Read handoff/2026-09-09 Rounds Thirty-One to Forty-Seven, and the Gate That Stopped.md first — it is
the entry point. Read it with handoff/2026-09-08 The Identity Rollout, and Rounds Twenty-Six to
Thirty.md (the occurrence-identity rollout and rounds 26-30), handoff/2026-09-07 Session
Continuation, Rounds One to Twenty-Five.md (rounds 1-25 and the shape of the loop), handoff/2026-09-06
The Review Loop, Rounds One to Twenty.md (the round ledger and the rate-limit history) and
handoff/2026-09-05 The Design Port, and Three Requirements the File Did Not Show.md (the design port,
the twelve client requirements mapped to file:line, the eighty-one-row findings table, traps 77-107).
Also read docs/Decisions.md (D1-D100; D85-D100 were written in the last session), docs/Repository
Evidence.md, docs/Remaining Work and Owner Decisions.md, docs/AI Agent Context.md, and AGENTS.md /
CLAUDE.md, which are byte-identical synchronized policies — any shared-policy change goes into both.

VERIFY BEFORE YOU ACT. Do not trust any snapshot, including this one. From apps/web run, IN THIS
ORDER: npm test (expect 237 across 13 files), npm run build, npm audit (0), Playwright against a
LOCAL dev server with E2E_BASE_URL unset (E2E_REQUIRE_CREDENTIALS=1 npx playwright test --workers=1,
expect 52 passed), then rm -rf test-results, then npm run security (60 checks, 0 failed, 0 deferred).
The order is load-bearing: the probe's secret scan reads dist/assets, so running it before the build
scans the previous bundle. Then run the live-state SQL in section 10 and report what drifted rather
than assuming these documents are current.

THIS APP HAS ONE SHARED LEDGER HOLDING REAL MONEY AND A PERSON IS IN IT MOST MORNINGS — Manila office
hours, roughly 01:00-10:00 UTC. THERE IS NO STAGING: npm run e2e, npm run smoke and npm run security
ALL WRITE TO PRODUCTION. Before running any of them, read the last ten audit_log rows; if the newest
are minutes old and carry a human's email, wait. A row without an E2E- tag may be the owner's — never
sweep one. txns AND transfers are MOVING BASELINES, not invariants: read them as your own baseline,
assert them unchanged across YOUR OWN writes, and never sweep, restore or rewind to make a count
match a number in a document. receipts row 1788471059637 ("DO NOT DELETE — backup proof") is the
storage-restore evidence; its amount 0.00 and company F5 trigger two refusals that are EXPECTED, so
do not "fix" that row. IF YOU SEE A NON-NULL __e2eHeld a run was killed mid-spec — do not clear it by
hand; run the suite and let beforeAll give the value back. Playwright traces hold E2E_PASSWORD and
live refresh tokens in plaintext, so rm -rf apps/web/test-results after every run. zone-offices
(lasycakyudaawrydetnm) is a LIVE CRM belonging to someone else — paused, do not touch;
tracker-rehearsal (bucmcnsjkuprpojhequy) is the scratch project; production is jusifpditdigqdjiwdaj.
Do NOT edit the three applied FX/R7 migration files or any of the 21 applied migrations. Never write
into .obsidian/. A push to main DEPLOYS PRODUCTION. Before pushing anything under apps/web/src/, run
Playwright against a local dev server: npm test and npm run build import no .jsx at all, so a
render-time ReferenceError passes both and blanks the page for everyone — that happened on
2026-09-08 and production was dark for ten and a half minutes.

THE STATE THAT MATTERS MOST. GitHub Actions has been failing every job in 2-3 seconds with ZERO steps
executed since roughly 2026-09-08 12:00 UTC (item C9). Repository Actions permissions are enabled, so
it is an account-level billing stop only the owner can see. Because ci.yml is what deploys — Vercel's
own git deployments are off by D27 — NOTHING HAS DEPLOYED SINCE ROUND 42. Production serves the
bundle from commit c7daee1; rounds 44, 45 and 46 are committed and NOT live, including the D99
money-path fix. Confirm it yourself: curl the site, read the /assets/index-*.js name, and compare it
to a local build. DO NOT HAND-DEPLOY AROUND THE GATE — D27 exists because GitHub checks do not gate
Vercel. The moment the owner clears C9, do not push anything new: re-dispatch ci.yml on main, confirm
the deploy lands, then run Playwright against the DEPLOYMENT and re-compare the bundle hash.

YOUR FIRST JOB IS ROUND 47 OF THE ADVERSARIAL REVIEW LOOP. Never run a round in the main session if a
subagent is available, and never report a main-session round as clean — rounds 16-18 were run by hand
under a rate limit and reported green, and round 19, the first real verifier afterwards, refuted that
with six findings. Dispatch a FRESH-CONTEXT reviewer, tell it to REFUTE rather than admire, and give
it the production-safety constraints above verbatim plus this: it may run npm test and npm run build
freely and must NOT run e2e, smoke, security or anything under scripts/. Point it first at round 46's
own work — src/masterlist.js, src/pending.js, src/masterlist.test.js and D100 — because the loop's
signature failure is TRAP 98: a test exercises a HELPER while the production wiring lives in a
different function no test touches, so mutating the real call site leaves the suite green. That is
exactly what round 46 caught round 45 doing. For every guard, delete it and run npm test; a guard
whose deletion leaves the suite green is a finding regardless of whether the guard is correct. Also
watch for TRAP 100/104 (a pin that cannot fail) and TRAP 101 (a guard that moved out of the function
where it was tested). Prefer ONE real defect with a reproduction over five speculative ones; a
genuinely empty round is the goal and a fake finding is worse than none. Any subagent that mutates a
file must restore it byte-for-byte and end with git status --short. Never run git add -A while a
subagent is running — that has already swept an in-flight mutation into a pushed commit.

THE LOOP'S STOPPING CONDITION HAS NEVER BEEN MET. Rounds 1 through 46 each found something; round 47
was killed by a rate limit before it read a file. Keep dispatching rounds until one comes back
genuinely empty. Ten decision records in this loop claimed more evidence than their check
established — assume the next one does too, and correct records inline rather than silently.

NOT YOURS TO CLOSE, and they are the owner's alone: C9 (Actions billing), C5 (the admin@admin.com /
admin FX account, rotation deferred TWICE — keep raising it), C6 (cron delays, moot while C9 stands),
C8 (no status CHECK constraint in the database, confirmed absent again on 2026-09-08), the Vercel
system-variable setting, and the second half of C7 (whether releasing a wire should stamp a rate
automatically — the owner priced the three existing wires himself at 2026-09-08 02:12 UTC, which
closed the first half).

Confirm the state back to me — what you verified, what drifted, and what round 47 found — and wait
for direction before starting anything the state may have invalidated.
```

## Guideline Basis

- **DOC-02** keeps evidence, inference and decision separable: every count here names when and how it
  was read.
- **PG-04** requires a reproducible check behind each claim; the unverified ones are listed in
  section 8 rather than omitted.
- **GIT-04** governs the deployment and rollback record in section 4.
- **MD-02** requires resolvable, path-qualified links.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [[Handoff Index]] · [[Decisions]] · [[Repository Evidence]] · [[Remaining Work and Owner Decisions]] · [[AI Agent Context]]
