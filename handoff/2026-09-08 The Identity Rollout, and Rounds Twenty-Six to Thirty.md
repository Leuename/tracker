---
title: The Identity Rollout, and Rounds Twenty-Six to Thirty
tags: [handoff, continuation, complete-package, entry-point, erp, tracker, supabase, occurrence-identity, migration-rollout, adversarial-review, review-loop, verification, money-path, mutation-testing, information-disclosure]
created: 2026-09-08
status: current
kind: complete continuation package — THE entry point. A fresh chat resumes from this file.
supersedes: "[[2026-09-07 Session Continuation, Rounds One to Twenty-Five]] as the entry point. It is not obsolete: it remains the record of rounds 1-25 and the shape of the loop."
covers: "the owner-authorised occurrence-identity rollout — rehearsal, two production migrations, deployment — and adversarial rounds 26 to 30, which produced decisions D80 to D83"
decisions-made: "[[Decisions]] D80 to D93"
verification-status: "The rollout is COMPLETE and verified. Rounds 27 to 39 each REFUTED the one before; every finding is fixed, deployed and mutation-checked. Round 30's own fix BLANKED PRODUCTION for ten and a half minutes and was reverted and relanded. Round 40 was dispatched and its result is NOT in this document."
related:
  - "[[2026-09-07 Session Continuation, Rounds One to Twenty-Five]] — rounds 1-25 and the loop's shape"
  - "[[2026-09-06 The Review Loop, Rounds One to Twenty]] — the round-by-round ledger and the rate-limit history"
  - "[[2026-09-05 The Design Port, and Three Requirements the File Did Not Show]] — the design port, the twelve client requirements, the eighty-one-row findings table, traps 77-107"
  - "[[Decisions]] — D1 to D93, the authority on what is authorised"
  - "[[Repository Evidence]] — the factual baseline"
  - "[[Remaining Work and Owner Decisions]] — A1-A2, B1-B2, C5-C8"
  - "[[Handoff Index]] — every handoff, newest first"
up: "[[AI Agent Context]]"
---

# The Identity Rollout, and Rounds Twenty-Six to Thirty

## 1. What happened

The owner authorised the rollout that five previous sessions had left owner-gated, and it went
through end to end: rehearsal, phase 1, deploy, phase 2, with the acceptance suite run on both sides
of the last phase. Then the review loop continued, and rounds 27, 28 and 29 each refuted the one
before it.

**The headline is not the rollout. It is what the loop found afterwards.** Round 27 found that a
coverage filter had been silently disabled for all twelve months, so a monthly payable would have
been generated **once, ever** — the exact inverse of the defect the rollout existed to fix, and
worse, because that one double-billed loudly while this one silently stopped billing.

## 2. The rollout, in order

| Step | Evidence |
|---|---|
| Rehearsal, both phases, on `tracker-rehearsal` | Seeded the three cases production does not have. Both rescheduled rows kept their **original** occurrence; a duplicate insert at an existing `(src, occurrence_due)` was refused; deleting the recurring parent unlinked its rows without violating the new CHECK. Seed removed. |
| Production preflight | `linked_rows=0`, `rescheduled_linked=0`, `relinks=0`, `collisions=0` — backfill a no-op, `audit_log` unmoved across it. |
| Phase 1 | Version `20260907181000`, stored md5 `1d164ba0be70f52f709ec3facef2b48f` matching the file byte-for-byte, which also proves the executed text was the file. |
| Deploy | CI gate green; bundle moved off `index-DQlFRu57.js`. |
| Phase 2 | Version `20260907182000`, md5 `69cf1c0b932287d1710966c65e375d2e`. 21 migrations. |
| Probe | 57 checks, 0 failed, **0 deferred** — `occurrence_due: 42501, src: 42501`. |

Full record in [[Decisions]] D80.

**The ordering lesson, which the plan got wrong.** Task 10 ran the acceptance suite once, between
the deploy and phase 2, so nothing in the prescribed order exercised the application against the
final grant set. Running it again after phase 2 found two defects, one of them a spec whose refusal
came from the very index phase 2 drops. **A staged grant change must re-run its acceptance suite
after the LAST phase.**

## 3. The rounds

| Round | Verdict | What it found |
|---|---|---|
| 26 | local gate closed | Reviewed round 25's four fixes; `AUDIT: READY` |
| **27** | **REFUTED, 4** | **`coverageFor`'s month scope was dead code — a monthly payable generated once, ever.** Plus `payErr` with no reader, a doubled scheduler summary, and the probe failing by default against a correctly locked database |
| **28** | **REFUTED, 4** | The `occurrence_due` READ mapping was never pinned **and a commit message claimed it was**; a new e2e assertion that could not fail; a hardcoded month pair that expires; report ordering that no test could reach |
| **29** | **REFUTED, 3** | **The round-28 rollback closed a feedback loop** — 79 writes and 79 toasts from one toggle in 500ms; a guard that skipped the case it was written for; row detail attached to the wrong summary line |
| **30** | **REFUTED, 2** | The round-29 rollback **still** lost the change it was written to recover — the patch was computed at effect time and frozen in the debounce closure; and the whole of round 29's fix could be deleted with 201 tests green |
| — | **a production outage** | Round 30's fix dropped two `const` declarations. `ReferenceError` from `StoreProvider`'s render, React unmounted the tree, **production blank for ten and a half minutes**. Build green, 209 tests green, gate green, deployed |
| **31** | **REFUTED, 2** | **A `receipts.status` outside the four the dropdown offers blanked the whole app**, unrecoverable by reload — one pattern in three places, guarded in one. And **Escape was dead for every dialog opened from a row control** |
| **32** | **REFUTED, 4** | **A tenth `onKeyDown` site** — the button opening the *payment* dialog, missed because round 31 defined its helper locally in the two files it was handed. And **D85's justification was factually false**: `AckRec` renders a `<select>`, never a chip, so an unknown status still displayed "Pending" |
| **33** | **REFUTED, 4** | **The same `<select>` defect again**, in every edit modal and in Masterlist — round 32's fix had gone onto two sheet-row selects and nothing else. Fixed in the shared `Select` component this time, covering sixteen call sites and the seventeenth nobody has written |
| **34** | **REFUTED, 1** | **`curFmt` printed a function's source beside the amount** on the transfer sheet for a rogue currency — a hole it had carried since it was written, through thirty-three rounds. Plus three fresh unguarded `CSYM[c]` lookups written by round 33's own fix |
| **35** | **REFUTED, 4** | D88 had declared the inherited-key class closed **on the strength of a grep for one identifier**. Four more remained, including a **status filter that passed the row it was meant to hold**. Answered with a ratchet — `src/lookups.test.js` — which then found three more nobody had reported |
| **36** | **REFUTED, 6** | **Defeated the ratchet with ordinary code** — a split line, `?.[`, and a fresh lookup appended to an already-allowed line all left the suite green. Answered by `bare()`: `Object.create(null)`, so the shape is impossible rather than detectable |
| **37** | **REFUTED, 1** | **A spread of a bare object produces an ordinary one**, so the guarantee lasted until the first status toggle. True of eight maps, false of the two that are mutable |
| **38** | **REFUTED, 1** | **The write half**, which seven rounds had never looked for: `o['__proto__'] = v` creates nothing and the value is lost. Found in `configPatch`'s accumulators — a setting from the database could vanish from its own patch |
| **39** | **REFUTED, 2** | **A pasted `1.20E+07` became `1.2007`** — seven orders of magnitude, and legal to both the client and the database. Plus `rewind.mjs` interpolating a value raw into a `--` comment in SQL a human runs as `postgres` |
| 40 | **dispatched; result not in this document** | |

Decisions [[Decisions]] D81 to D84 carry the reasoning. Four findings across these rounds were
introduced by the previous round's fix, which is the loop's oldest pattern.

**Two of them were mine and are worth naming.** I wrote a `.catch(() => {})` onto the one assertion
guarding the regression — trap 104, while fixing trap 104. And the config-save rollback I added in
round 28 became round 29's worst finding. Neither was caught by the suite; both were caught by a
fresh verifier.

## 4. Found outside the rounds

- **The browser bundle was publishing the private repository's commits.** `import.meta.env` was read
  as a whole object, so Vite inlined every `VITE_` variable — on Vercel that is the repo owner,
  slug, ids, branch, SHAs, committer and the **full text of the latest commit message**, served to
  anyone fetching the sign-in page. No credential; metadata. Proved closed by canary in both
  directions. Older deployments are behind Vercel SSO, so the residual exposure is closed too —
  measured, not assumed. D82.
- **`Refund` was missing from production's categories** while `src/data.js` had shipped it all
  along, which is why the suite was green against a short list. Added under a guarded write.
- **The nightly `verify.yml` would have gone red** on a correctly secured database, because the
  probe's phase defaulted to `1`. Fixed, and the workflow now states its expectation.
- **A `git add -A` swept a verifier's in-flight mutation into a commit** and pushed it. The gate
  caught it in 12 seconds and the deploy was skipped. Stage explicit paths while an agent is running.
- **I blanked production for ten and a half minutes** relanding round 30's fix. See D84 and section 6
  — the rule that came out of it is the most useful thing in this handoff.

## 5. Live state

Read 2026-09-08. **Both `txns` and `transfers` are moving baselines** — assert them unchanged across
your own writes, never against a number in a document.

| | |
|---|---|
| `npm test` | **229/229** across 13 files, offline |
| `npx playwright test --workers=1` | **52/52**, run against a local dev server before each push and against the deployment after |
| `npm run security` | **57 checks, 0 failed, 0 deferred**; `OCCURRENCE_IDENTITY_PHASE` now defaults to `2` |
| `npm audit` | **0** |
| `npm run build` | green, `vite v8.2.2` |
| `verify.yml` | dispatched on the current commit and **passed e2e, security and smoke** |
| Migrations | **21, all applied**, latest `20260907182000` |
| `txns` | 49 · PHP 2,226,438.00 · identity fingerprint `a76686384422360d47403627c35f4f7f` unchanged throughout |
| `transfers` | **12** — was 9; three wires entered by `aepinza@gmail.com` at 02:13–02:15 UTC today |
| `recurring` / linked / unresolved | 0 / 0 / 0 |
| `app_config` | `ackRequirePhoto: false` · `warnDuplicate: true` · `dashWindow: Next 30 days` · **`__e2eHeld: null`** · 19 categories · 21 companies |
| `E2E-` residue | 0 everywhere |
| Git | **everything committed and pushed**; the gate ran green on every push and production is deployed |

## 6. What is NOT verified — and the rule that matters most

**`npm test` imports no `.jsx` at all.** Not `store.jsx`, not `App.jsx`, not a single screen or
modal. A render-time error in any component passes `npm test`, passes `npm run build`, passes the CI
gate, deploys, and blanks the page for every signed-in user. That is not hypothetical: it happened on
2026-09-08 and cost ten and a half minutes of blank production (D84).

**So: run the Playwright suite against a LOCAL dev server before pushing anything under
`apps/web/src/`.** `E2E_REQUIRE_CREDENTIALS=1 npx playwright test --workers=1` with `E2E_BASE_URL`
unset. It drives the real UI and is the only check here that does. Two and a half minutes. This is
now in `AGENTS.md` and `CLAUDE.md`.

Also unverified:

- **Round 40's result is not in this document.** Check it before treating the loop as clean.
- Never audited by any round: `src/icons.jsx`, `src/screens/Masterlist.jsx`, and every file in
  `src/modals/` except `PayMethod.jsx`; `scripts/rewind.mjs`, `scripts/fx.mjs`. Round 29 cleared the
  migrations; rounds 31 and 32 covered `AckRec.jsx`, `Telegraphic.jsx`, `ui.jsx`, `Tracker.jsx`,
  `Dashboard.jsx`, `App.jsx` and `Settings.jsx` — **and found six defects between them.**
- **The loop has never returned clean in thirty-nine rounds.** Do not report this work as defect-free.

## 7. Still open — none of it is mine to close

1. **C5, the rates-account password.** `admin@admin.com` / `admin`, still live, `viewer` role, last
   sign-in 2026-09-07 14:08 UTC (the FX cron). It can read the entire ledger, and it is the
   most-guessed credential pair on the internet on a publicly reachable URL. Deferred twice. Not
   rotated here because generating and transmitting a production credential through a transcript is
   itself a disclosure.
2. **C6**, scheduled runs landing 2.5–5 hours late. **C7**, three released wires with no rate — both
   halves (a live-ledger write, and making release stamp a rate) are owner decisions.
3. **A1/A2** need a `postgres` connection string. **B1/B2** need a disposable target; B2's gap has
   widened from three migrations to nine.
4. **The Vercel setting** that exposes system variables to the framework prefix is still on. The code
   no longer reads them, which is the durable fix, but a future file could reopen it.

## 8. How to verify state in a fresh session

From `apps/web/`: `npm test` (201 across 11 files), `npm run build`, `npm audit` (0), and
`npm run security` (57, 0 failed, 0 deferred — the phase variable defaults to `2` now).

**Check for human activity before running anything that writes**, because the app is in daily use
during Manila mornings, roughly 01:00–10:00 UTC:

```sql
select at, actor_email, tbl, op from public.audit_log order by at desc limit 10;
```

Then the state read:

```sql
select (select count(*) from public.txns) txns,
       (select sum(amount)::text from public.txns) total,
       (select md5(string_agg(t.id::text||':'||t.amount::text||':'||t.status, chr(10) order by t.id))
          from public.txns t) identity_fingerprint,
       data->'settings'->'__e2eHeld' held,
       jsonb_array_length(data->'categories') cats,
       (select count(*) from public.transfers) transfers,
       (select count(*) from public.txns where src is not null and occurrence_due is null) unresolved,
       (select count(*) from public.txns where description like '%E2E-%')
     + (select count(*) from public.recurring where description like '%E2E-%')
     + (select count(*) from public.transfers where name like '%E2E-%') residue,
       (select count(*) from public.receipts where id = 1788471059637 and file_path is not null) backup_proof
from public.app_config where id;
```

Expect `held` null, `cats` 19, `unresolved` 0, `residue` 0, `backup_proof` 1. **Counts and totals are
baselines, not invariants** — the owner enters rows daily.

## Resume prompt

```
Read handoff/2026-09-08 The Identity Rollout, and Rounds Twenty-Six to Thirty.md first — it is the
entry point. Read it with handoff/2026-09-07 Session Continuation, Rounds One to Twenty-Five.md
(rounds 1-25 and the shape of the loop), handoff/2026-09-06 The Review Loop, Rounds One to Twenty.md
(the round ledger and rate-limit history) and handoff/2026-09-05 The Design Port, and Three
Requirements the File Did Not Show.md (the design port, the twelve client requirements mapped to
file:line, the eighty-one-row findings table, traps 77-107). Also read docs/Decisions.md (D1-D83,
with D80-D83 written today), docs/Repository Evidence.md, docs/Remaining Work and Owner Decisions.md,
and AGENTS.md / CLAUDE.md, which are byte-identical synchronized policies.

VERIFY BEFORE YOU ACT. Do not trust any snapshot. From apps/web run: npm test (expect 201 across 11
files), npm run build, npm audit (0), and npm run security (57 checks, 0 failed, 0 deferred —
OCCURRENCE_IDENTITY_PHASE defaults to 2 now, and setting it to 1 SHOULD fail against this database,
which is how you know the check still has teeth). Then run the SQL in section 8. Report what drifted
rather than assuming the documents are current.

THIS APP HAS ONE SHARED LEDGER HOLDING REAL MONEY AND A PERSON IS IN IT MOST MORNINGS — Manila
office hours, roughly 01:00-10:00 UTC. On 2026-09-08 an admin entered three wires at 02:13 UTC while
a review round was running. THERE IS NO STAGING: npm run e2e, npm run smoke and npm run security all
WRITE TO PRODUCTION. Before running any of them, read the last ten audit_log rows; if the newest are
minutes old and carry a human's email, wait. A row without an E2E- tag may be the owner's — never
sweep one. BOTH txns AND transfers are moving baselines: assert them unchanged across YOUR OWN
writes, never against a number copied from a document. receipts row 1788471059637 ("DO NOT DELETE —
backup proof") is the storage-restore evidence; its amount 0.00 and company F5 trigger two refusals
that are EXPECTED. zone-offices (lasycakyudaawrydetnm) is a LIVE CRM belonging to someone else —
paused, do not touch. tracker-rehearsal (bucmcnsjkuprpojhequy) is the scratch project. Do NOT edit
applied migrations — all 21 are applied. A push to main DEPLOYS PRODUCTION.

THE OCCURRENCE-IDENTITY ROLLOUT IS COMPLETE. Both migrations are applied, the identity-aware app is
deployed, D63's (src, due) index is gone and generated payables key on (src, occurrence_due), which
a visible due-date edit cannot move. Do not re-run the rollout. If you ever need to reverse it, the
SQL is in supabase/README.md: phase 2's reversal is safe, phase 1's DESTROYS the identities and
occurrence_due is not derivable from the ledger afterwards.

BEFORE RUNNING THE E2E SUITE: four specs change the OWNER'S LIVE CONFIG — ackRequirePhoto,
warnDuplicate, dashWindow, and the shared companies/categories lists. Each calls D.hold([...]) BEFORE
changing anything, recording what was there into app_config.data.settings.__e2eHeld, and both
beforeAll and every finally call releaseHeld(). A resting __e2eHeld is JSON null. IF YOU SEE A
NON-NULL __e2eHeld a run was killed mid-spec — do not clear it by hand, run the suite and let
beforeAll give the value back. Afterwards run `rm -rf apps/web/test-results`: traces hold
E2E_PASSWORD and live refresh tokens in plaintext.

CONTINUE THE REVIEW LOOP. Round 40 was dispatched against round 39's fixes and ITS RESULT IS NOT IN
THE HANDOFF — find out whether it finished before assuming anything. Round 39's fixes are in commit
6a098ef: amountOf refuses input it cannot read instead of mangling it, and rewind-plan flattens every
value it interpolates into a comment line. ROUNDS 1-39 ALL FOUND SOMETHING.

SET A SCOPE RULE ON EACH ROUND. Rounds 32 to 38 — SEVEN in a row — all found instances of one class,
`obj[key]` meeting Object.prototype. The loop was over-fitting: each round looked where the last one
had just been. Round 39 was FORBIDDEN from reporting a prototype finding as its primary result and
immediately found a money-parsing defect instead. When a class has been found twice running, name it
in the next round's brief and rule it out.

THE PROTOTYPE CLASS IS CLOSED THREE WAYS and does not need re-litigating: bare() builds every
constant map with Object.create(null) (data.js), own() guards the reads, and src/lookups.test.js is a
ratchet over src/. Its header states honestly which bypasses it CANNOT see — a split line,
Reflect.get, a template key, destructuring — and names bare() as the actual guarantee, because a
regex over source text can always be out-written. THE LOOP HAS NEVER RETURNED CLEAN, NO ROUND HAS EVER SURVIVED THE
NEXT ONE, and roughly half of all findings were introduced by the fix for the previous defect.

RUN THE E2E SUITE AGAINST A LOCAL DEV SERVER BEFORE PUSHING ANYTHING UNDER apps/web/src/.
`E2E_REQUIRE_CREDENTIALS=1 npx playwright test --workers=1` with E2E_BASE_URL unset. npm test imports
no .jsx at all, so a ReferenceError in a React component passes the tests, passes the build, passes
the gate, deploys, and blanks the page for everyone. That happened on 2026-09-08 — ten and a half
minutes of blank production, ended by git revert. The Playwright suite is the ONLY check here that
drives the real UI.

NEVER RUN A ROUND IN THE MAIN SESSION IF A SUBAGENT IS AVAILABLE, and never report a main-session
round as clean. Rounds 16-18 were run by hand under a rate limit and reported the work green; round
19, the first real fresh-context verifier afterwards, refuted that in one pass with six findings. If
a round dies on a rate limit — round 30 did once — CHECK app_config AND git status BEFORE DOING
ANYTHING ELSE.

DO NOT RUN `git add -A` WHILE A SUBAGENT IS RUNNING. Verifiers mutation-test by editing production
files and restoring them; a blanket stage commits the deliberate breakage. That happened on
2026-09-08 and reached main. The gate caught it in 12 seconds and the deploy was skipped. Stage
explicit paths, and account for every path in git status --short before committing.

THE TRAPS THAT KEEP BITING, AND HOW THE LAST FOUR ROUNDS FOUND THEIR DEFECTS:
- A DEFAULT THAT FAILS OPEN IS INVISIBLE. Round 27's worst finding was a month lookup returning null,
  and the caller read null as "no filter" — every screen agreed with the wrong answer because they
  all call the same function. Sweep `|| null`, `?? []`, `!x ||`, and any catch that returns empty.
- A MAPPING HAS TWO DIRECTIONS. The write was pinned, the read was not, and the commit message said
  otherwise. Never claim coverage without running the mutation that proves it.
- A PIN THAT CANNOT FAIL READS AS COVERAGE (trap 100/104). `.catch(() => {})` on an assertion, a
  source-text match, a test that ERRORS instead of asserting. Make every new assertion fail on
  purpose before trusting it.
- A FIX TRADES ONE FAILURE FOR ANOTHER (family c) — this is the one that keeps landing. Round 28's
  rollback became round 29's retry loop (79 writes and 79 toasts from one toggle in 500ms), round
  29's fix still lost the change it was written to recover, and round 30's fix blanked the app.
- THE .jsx LAYER HAS NO OFFLINE COVERAGE. Every defect in it ships green. When you touch a component,
  the local e2e run above is not optional.
- A GUARD ADDED FOR A RARE HARM CAN BLOCK THE COMMON CASE. Round 29's second finding: the rollback
  guard skipped exactly the situation the rollback existed for.
- TRAP 98: delete each fix AT ITS CALL SITE, not in the helper.
- AND THE HABIT BEHIND IT, which round 32 named and round 33 then caught AGAIN in the fix for it:
  a round fixes the sites it was TOLD about, so the instance in a file nobody named survives. Round
  31 missed the tenth onKeyDown site — the button opening the PAYMENT dialog. Round 32 fixed two
  sheet-row selects and left the same defect in every edit modal. After any fix, GREP FOR THE
  PATTERN across src/, scripts/, e2e/ and security/, not for the helper's name: an inline anonymous
  copy never matches the name. And prefer GUARDING THE SHARED COMPONENT over guarding its callers —
  only the first ends the class, and it covers the call site nobody has written yet. Round 34 pushed
  that one step further: guard the shared LOOKUP too. `own(obj, key)` in logic.js is the only place
  a plain object is indexed by row data now, because obj[key] finds Object.prototype members, which
  are TRUTHY and defeat every `|| fallback` written after them.
- A DECISION RECORD THAT DESCRIBES INTENT RATHER THAN BEHAVIOUR, or that claims more than its check
  established. SIX records in this loop have done it — D85, D88, D89's ratchet, D90, D91's scope, and
  D89's own first draft: D85 said a screen showed the raw status "in
  a neutral chip" when that screen renders a <select> and has no chip; D88 declared a whole class of
  defect closed on the strength of a grep for ONE identifier; and the ratchet written to replace
  that promise shipped with a matcher blind to the very shape that motivated it. A CLAIM ABOUT A
  CLASS NEEDS A CHECK THAT RUNS OVER THE CLASS — and `apps/web/src/lookups.test.js` is what that
  looks like here, so the next round need not take it on trust.
- TRAP 101: moving a guard to where it belongs can move it out of where it was tested.

ALSO ASK WHAT HAS NEVER BEEN IN SCOPE. Rounds 21, 23, 24, 27 and 31 each found their worst defect in
code no round had examined. Still unaudited: src/App.jsx, src/icons.jsx, src/screens/Settings.jsx,
Dashboard.jsx, Masterlist.jsx, Tracker.jsx, src/modals/*.jsx other than PayMethod, scripts/rewind.mjs,
scripts/fx.mjs. Round 29 cleared the migrations; round 31 covered AckRec.jsx, Telegraphic.jsx and
ui.jsx and found a defect in each of the first two.

THE TECHNIQUE THAT IS FINDING THINGS: drive a real browser against a LOCAL dev server, listen for
pageerror and console.error, and rewrite PostgREST GET responses in flight with page.route to inject
values the UI never produces — never by writing to the database. Round 31 found both of its defects
that way, including one it proved with a real keyboard press and document.activeElement. Look for an
unguarded lookup on a plain object keyed by data the database does not constrain: txns.status,
receipts.status, transfers.status, transfers.cur, txns.co and txns.cat are ALL free text with no
CHECK constraint, enforced by dropdowns and nothing else.

Each round: dispatch a fresh-context `verifier` subagent; tell it what changed since the last round
and to ATTACK THAT FIRST; give it the defect families and the traps above; require it to MUTATION-TEST
every test it is told already covers something, because that claim has now been wrong three times;
require the deletion experiment at call sites; forbid smoke, backup, non-dry-run schedule and the
security probe; forbid Playwright unless a finding demands it AND the owner is not working; require
`rm -rf apps/web/test-results` afterwards; and refuse a clean verdict that does not list the attempts
behind it. Keep running rounds until one comes back genuinely empty.

FIVE THINGS NEED THE OWNER AND ARE NOT YOURS TO CLOSE. C5: admin@admin.com / admin is still live —
viewer role, reads the whole ledger, most-guessed credential on the internet, deferred twice; do not
rotate it yourself, because putting a production credential in a transcript is itself a disclosure.
C6: scheduled runs land 2.5-5 hours late. C7: three released wires carry no rate, and both halves are
owner decisions. C8: status is free text in the database on txns, receipts and transfers — the crash
it caused is fixed in the client, but a rogue status still drops a payable from the Tracker sheet AND
the grand total, and adding the CHECK is a production schema change. And the Vercel project setting that exposes system variables to the framework prefix
is still on — the code no longer reads them, which is the durable fix, but a future file could
reopen it.

The vault root IS the repository, /Users/itadmin/Desktop/puge. Obsidian's focused vault is
project_babushka, a DIFFERENT one, so any obsidian CLI write must name vault="puge" explicitly.
Knowledge notes go in docs/, handoffs in handoff/ named `YYYY-MM-DD Title.md`, never into .obsidian/,
which Obsidian excludes from its index.

Report what you verified and what drifted, confirm the state back in a few lines, and WAIT for
direction before starting anything new.
```

## Guideline Basis

- **DOC-02** separates observed state, decisions, and inference throughout this note.
- **PG-04** requires every claimed result to name the check that produced it; section 8 names them.
- **MD-02** uses path-qualified links that resolve locally.
- **AGENT-02** keeps this note vendor-neutral: it briefs any agent, not one tool.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [[2026-09-07 Session Continuation, Rounds One to Twenty-Five]] ·
[[2026-09-06 The Review Loop, Rounds One to Twenty]] ·
[[2026-09-05 The Design Port, and Three Requirements the File Did Not Show]] · [[Decisions]] ·
[[Repository Evidence]] · [[Handoff Index]] · [[AI Agent Context]]
