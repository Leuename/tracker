---
title: The Rewind, and a Backup That Was Short
tags: [handoff, continuation, erp, tracker, supabase, backups, rewind, restore, testing, fx, security]
created: 2026-09-02
status: current
supersedes: "[Everything Held Back, Built](2026-09-02%20Everything%20Held%20Back,%20Built.md) as the entry point; that note remains the record of phases 21 to 25 and its traps 44 to 46 all still apply"
related:
  - "[Decisions](../docs/Decisions.md) — D1 to D35, the authority on what is authorised"
  - "[Open Problems and Proposals](../docs/Open%20Problems%20and%20Proposals.md) — eight items, nine questions, nothing built without an answer"
  - "[Exchange Rates Proposal](../docs/Exchange%20Rates%20Proposal.md) — item 1, standalone, awaiting three answers"
  - "[Backups](../backups/README.md) — the restore procedure, corrected twice this session"
  - "[Supabase Schema](../supabase/README.md) — twelve migrations, replayed"
  - "[Handoff](../docs/Handoff.md) — the per-pass record"
  - "[Repository Evidence](../docs/Repository%20Evidence.md) — the factual baseline"
up: "[AI Agent Context](../docs/AI%20Agent%20Context.md)"
---

# The Rewind, and a Backup That Was Short

**This is the current entry point.** Phases 26 to 30. Everything below was measured today.

The session began as a verification pass and was supposed to end after reporting drift. It found a
failing test suite, and chasing that honestly took the whole day. What it turned up, in order of how
much it matters: **the backup had been silently writing 129 fewer rows than the database held**, the
**account roster could not be restored at all**, the **`audit_log` sequence fails days after a
restore rather than on the next write**, and the **e2e suite has been racing itself against
production**. None of those were introduced today. All of them had been true for at least a day, and
none announced itself.

---

## The one thing to read if you read nothing else

**A backup you have not restored is a belief, not a backup.** Three of this session's four findings
came from performing a restore rather than reading the procedure, and every one of them was
invisible from the code:

- `select` without paging silently truncated at 1,000 rows. The manifest said `1000`; the table held
  **1,129**. The only clue was the round number.
- `profiles.user_id` references `auth.users(id)`, and nothing in `backups/` recorded that the
  accounts exist. A restore returned `23503` — and had it skipped the roster instead, it would have
  returned a ledger **nobody can write to**, silently, because no profile row means viewer (D29).
- Skipping `setval` does not kill the next write. It kills one days later, on every table at once.

All three are fixed. **None of the fixes has been exercised by a second rehearsal**, which is the
first thing the next session should do.

---

## The state in one screen

| | |
|---|---|
| Supabase (production) | `jusifpditdigqdjiwdaj`, name `baby`, `ap-southeast-1`, **free plan**, Postgres **17.6.1.166** |
| Supabase (rehearsal) | `bucmcnsjkuprpojhequy`, name **`tracker-rehearsal`**, `ap-southeast-1`, free, **schema only, no data** |
| Supabase (off limits) | `lasycakyudaawrydetnm`, `zone-offices` — a **live CRM**, 18 tables, 21 migrations. Paused. Do not touch |
| Vercel | project `tracker`, `prj_7Nn67JEsbpVL98GZssRteALD7i7L`, team `team_b28zdgmC8juoUYma2pUpdZPA`, hobby |
| GitHub | `Leuename/tracker`, private, Pro |
| Production | `https://tracker-six-flax.vercel.app` — 200, 7 of 7 security headers |
| Accounts | 4, all `admin`, 0 viewers. Sign-up closed |
| Release | `v0.6.0`, manifest matching |
| Tables | `txns`, `receipts`, `recurring`, `transfers`, `app_config`, `audit_log`, `profiles` |
| Migrations | 12, all MD5-identical, **and replayed** — 291 facts, `7d44a32a1ad258f984fb145892e94c97` |
| Workflows | `ci.yml`, `verify.yml`, `backup.yml`, `schedule.yml` — all active, all last-green |
| Secrets | 11 |

### The ledger, last read 2026-09-02 ~11:10 UTC

```
txns fingerprint  05a080127ca18b46dc693edbd22b5168   (was f95cd619… before the owner's edits)
txns 21 · PHP 226,000.00 · receipts 0 · recurring 0 · transfers 9 · profiles 4 (all admin)
audit_log 1,129 · storage objects 0 · residue 0 · probe accounts 0
```

**The fingerprint moves now.** The owner is using the app daily; treat a change as normal and say so
rather than assuming damage. What does not move without a reason: 21 rows at ₱226,000.00, four admin
profiles, zero residue.

### Checks, as of the end of this session

| Command | Result |
|---|---|
| `npm test` | **53/53** offline — was 43; `scripts/rewind-plan.test.js` added ten |
| `npm run build` | green |
| `npm audit` | 0 |
| `npm run e2e` | **27/27 only with `--workers=1`.** 0 of 3 clean at the default four |
| `npm run security` | **47 checks, 0 failed, `DEFERRED` empty** — confirmed by reading `probe.mjs`, not the exit code |
| `npm run smoke` | passing, document round-trip included |
| `npm run rewind` | new. Read 202 changes, planned 76 statements, wrote nothing |
| `npm run schedule -- --dry-run` | clean **only when handed credentials `.env.local` does not carry** |
| `npm run backup` | 1,129 audit rows after the paging fix; 1,000 before it |
| Local markdown links | all resolve |
| `AGENTS.md` vs `CLAUDE.md` | byte-identical |

---

## What happened, in order

| # | Phase | Trigger | Outcome |
|---|---|---|---|
| 26 | Verification sweep | the resume prompt | Everything green except `npm run e2e`, which failed three times; a password found in a test artifact |
| 27 | Round-one proposals | "propose a plan and I will approve" | [Open Problems and Proposals](../docs/Open%20Problems%20and%20Proposals.md), eight items |
| 28 | The owner's answers | five answers in one message | Backup dispatched; `is_viewer()` settled by experiment; Codex consulted twice; the e2e root cause found |
| 29 | The rehearsal | "retry the new project" | Twelve migrations replayed; the roster restore failed; the rewind proven; a copy of the ledger left briefly exposed |
| 30 | The fixes | "are you saying you broke it without fixing anything?" | `accounts.json`, paged reads with an assertion, the restore procedure rewritten — and the 1,000-row truncation found |

### Phase 26 — the sweep, and a suite that would not pass

Green on everything except e2e. The drift was all the owner working, and it is worth knowing what it
looked like, because this is the first session where production changed *while* it was being
verified:

- **01:48–03:03 UTC** — `aepinza@gmail.com` entered nine telegraphic transfers through the
  production UI. EUR 261,500, USD 399,531.10, GBP 4,290.
- **10:32 UTC** — six of those nine marked `released`.
- **10:34 UTC** — two payables, GTOI and ZON, marked completed by Check.

That retires a line that had stood in three handoffs: **the Telegraphic screen has now been used by
a human, in production, for real money.** It also moved item 1 from theoretical to urgent, which is
why the exchange-rate proposal got its own note.

**A credential in a test artifact.** `trace: 'retain-on-failure'` records every `fill()` call with
its value, so each failed e2e run wrote the shared account password in plaintext into
`apps/web/test-results/*/trace.zip`, with screenshots of the sign-in form beside it. Nothing had
shipped — `test-results/` and `playwright-report/` are gitignored and no workflow uploads artifacts
— but the mechanism regenerates them on every failure. Artifacts deleted; the fix is proposed, not
applied.

### Phase 28 — three things settled by experiment rather than argument

**`is_viewer()`.** The Supabase advisory's first remediation would have broken the application.
Tested in a throwaway schema, never against production:

| Step | Result |
|---|---|
| Write as `authenticated`, `EXECUTE` granted | succeeds |
| Write as `authenticated`, `EXECUTE` revoked | **`42501 permission denied for function is_viewer`** |
| Read, `EXECUTE` revoked | succeeds — the read policy never calls it |
| Write, function in a **non-exposed schema**, `EXECUTE` granted there | succeeds |

Postgres checks `EXECUTE` on a function used in an RLS policy against the **querying role**.
Revoking on `baby` would have left every account able to read everything and unable to write
anything — the app looking almost fine, which is worse than an outage. [Decisions](../docs/Decisions.md)
D34. The branch that would have changed `db.js` to read `profiles` directly and then revoked the
grant is dead: the policies need it whatever the client does.

**`zone-offices` is not a scratch project.** Round one proposed rehearsing on it. Restored to look
inside, it holds a **live CRM** — `contacts`, `companies`, `opportunities`, `sales_representatives`,
`audit_events` and thirteen more, behind 21 of its own migrations. One of our migrations was sent to
it while it was still restoring, returned `{"success": true}` and **did not land**, the instance
having been replaced as the restore completed. Luck, not design, and D23's lesson arriving a third
time. Verified clean four ways; untouched since.

**The e2e failures were not the network.** The network evidence was real and it was a red herring: a
trace showed every Supabase call returning 200 within 1.8 s, edge logs showed 1,060 requests with
zero 429s and a maximum `origin_time` of 1,027 ms, and fifteen timed fetches of the production HTML
ranged **0.50 s to 17.93 s**. The cause came from asking whether `fullyParallel: false` does what
its comment claims.

**It does not.** It serialises tests *within* a file. `workers` is unset, so Playwright runs four,
and `app.spec.js` and `functional.spec.js` have been executing **concurrently against one production
ledger** — the shared-ledger race trap 43 was written about, one layer below where it was fixed.

| Configuration | Runs | Result |
|---|---|---|
| Default, 4 workers | 3 | **0 clean** — 20/1/6, 7/1/19, 18/2/7 |
| `--workers=1` | 2 | **27/27 both**, 4.2 min and 3.2 min |

`verify.yml` has been running the same race invisibly. **`workers: 1` is proposed and not applied.**

### Phase 29 — the rehearsal, and what it broke

`tracker-rehearsal` created after the owner paused `zone-offices` to free a free-plan slot.

**The twelve migrations rebuild production exactly** — 291 catalogue facts scoped to `public`,
`7d44a32a1ad258f984fb145892e94c97` on both sides. First replay ever of `merge_app_config`,
`viewer_role` and `harden_merge_app_config`. The data came back byte-for-byte,
`app_config.updated_at` preserved rather than stamped `now()`, and the restore wrote **zero** rows
into `audit_log`.

Then three failures, each described in *The one thing to read* and in
[Backups](../backups/README.md).

**And one exposure I created and closed.** A new Supabase project allows self-serve sign-up by
default. This one was holding a copy of the real ledger behind the same `using (true)` read
policies, and a probe registered successfully. Anonymous access was correctly refused (`42501`).
The copied data was deleted the same session, the probe account removed, the throwaway credential
disabled, the schema kept. [Decisions](../docs/Decisions.md) D35 makes it a rule rather than an
anecdote.

### Phase 30 — the fixes, and the one nobody had noticed

`backup.mjs` gained `accounts.json` and paged reads. Running it is what surfaced the truncation: the
first run after the roster fix printed `audit_log: 1000 rows` — the same round number the morning's
manifest carried — against a table holding 1,129.

---

## The rewind, in enough detail to use it

Built on the owner's instruction: *"since PITR is a Pro add-on, use the write-ahead log."*
[Decisions](../docs/Decisions.md) D32.

```bash
cd apps/web
REWIND_EMAIL=… REWIND_PASSWORD=… npm run rewind -- --since 2026-09-02T01:00:00Z
```

It prints what it would put back, per table, names the accounts whose work would be undone, and
writes a `.sql` file. **It never writes to the database.** There is no `--apply`; you run the file
as `postgres`.

**Why it is small.** Only the oldest audit entry per row matters — a wire inserted, edited four
times and deleted needs one statement, not six, because the `before` of its first entry after the
cut *is* its state at the cut. Against the live log: 202 changes, 76 statements.

**What the generated file does.** Disables each `*_audit` trigger it touches plus
`app_config_touch`; deletes and re-inserts each affected row from its `before` via
`jsonb_populate_record`; re-enables the triggers; writes **one** marker row rather than a mirror
image of every undo.

**Proven end to end.** On the rehearsal copy: three payables deleted, two edited to nonsense, one
invented, a wire deleted, three cancelled and re-priced, the company list cut from 21 entries to
one. Eleven changes, eleven statements — afterwards `txns`, `transfers` and `app_config`
fingerprints all back to their pre-damage values, one marker row, zero mirror rows.

**Limits, stated because they will not be obvious later.** Stored documents are not audited, so a
deleted file does not come back. DDL is not covered. If the project itself is lost, `audit_log` goes
with it — `backups/` is what survives that. Generated plans are gitignored; they carry whole rows in
plain text.

---

## Open items

| # | Item | State |
|---|---|---|
| 1 | **Exchange rates** | ₱39.96M across the transfer sheet priced by five constants in `logic.js:259`. [Exchange Rates Proposal](../docs/Exchange%20Rates%20Proposal.md). Needs three answers |
| 2 | **`workers: 1`** | One config line. The cause of three failed runs. Proposed, not applied |
| 3 | **Second daily backup** | 09:00 UTC, one `cron` line. Approved in principle, not built |
| 4 | **A second rehearsal** | Nothing has re-tested `accounts.json`, the paging assertion or the corrected `setval` step |
| 5 | **`is_viewer()`** | Move to a `private` schema, or accept on the record. Revoking is off the table (D34) |
| 6 | **Playwright traces** | Password still written on every failure. Setup-project fix proposed |
| 7 | **`SCHEDULE_*`** | Missing from `.env.example`; the documented dry-run does not run |
| 8 | **Viewer account and affordances** | No viewer exists; buttons still refuse on click |
| 9 | **Scheduler notifications** | Job summary only. Owner decision (D31) |
| 10 | **`apps/api/`** | Still empty. Codex says keep, I lean delete. Yours |
| 11 | **Node 20 deprecation** | Bump the actions to v5 when released |
| 12 | **Construction tracker** | Parked (D18) |

Rotation is **deferred by the owner** and deliberately not listed. Do not raise it.

---

## Traps, continued

Traps 1 to 46 are in the four earlier packages and all still apply. These are new.

47. **`fullyParallel: false` does not mean one worker.** It serialises tests within a file;
    Playwright still runs separate files in parallel, four at a time on this machine. On a shared
    production ledger that is a race, and it read as a network problem for hours.
48. **PostgREST caps a read at 1,000 rows and says nothing.** No error, no flag, a short array. The
    backup wrote `1000` against 1,129 and reported success. **Any `select` over a table that can
    exceed 1,000 rows must page and then assert the count.**
49. **`backups/` does not contain `auth.users`, and `profiles` needs it.** Restoring the roster into
    a fresh project fails `23503`; skipping it succeeds and returns a ledger nobody can write to.
    `accounts.json` and the recreation step in [Backups](../backups/README.md) are the fix.
50. **The `audit_log` sequence fails late, not next.** With `setval` skipped, the first write after a
    restore succeeds and so does the next; the duplicate key arrives when the sequence reaches the
    restored ids, then on every audited write across all six tables. **A rehearsal that ends "can I
    still write? yes" passes while broken.**
51. **A new Supabase project has sign-up ON.** Load real rows into one and a stranger can register
    and read the lot. Close it first, or load nothing real.
52. **A Playwright trace is a credential.** `fill()` values are recorded verbatim. Never attach one
    to an issue, a PR or a message.
53. **`{"success": true}` from `apply_migration` can mean the migration reached an instance that no
    longer exists.** One was sent to a project mid-restore, reported success, and left nothing
    behind. Read the catalogue afterwards — D23's lesson, now three times over.
54. **A newly restored project reads as empty while it is still restoring.** `information_schema`
    returned zero `public` tables for a database that holds eighteen. Wait for it, then look again.

---

## How to verify state in a fresh session

```bash
cd /Users/itadmin/Desktop/puge/apps/web
npm test                          # 53 offline assertions
npm run build                     # green
npm audit                         # 0
npx playwright test --workers=1   # 27 specs — WRITES to production. The default worker count fails
npm run security                  # expect "47 checks, 0 failed" and no "deferred" clause
npm run smoke                     # live end-to-end — WRITES, and stores a document
SCHEDULE_EMAIL=… SCHEDULE_PASSWORD=… npm run schedule -- --dry-run
```

`E2E_REQUIRE_CREDENTIALS=1` turns a silent skip into a failure. **If e2e reports specs skipped, it
ran nothing.**

Then the database directly:

```sql
-- the owner's data. The fingerprint moves when they work; the shape should not.
select md5(string_agg(t::text, chr(10) order by t.id)) as fingerprint,
       count(*), sum(amount)::text from public.txns t;

-- everybody has a role, and nobody is accidentally a viewer
select u.email, p.role from public.profiles p join auth.users u on u.id = p.user_id order by 1;

-- the backup is not short
select count(*) from public.audit_log;   -- compare with backups/MANIFEST.md

-- no residue
select 'txns' t, count(*) from public.txns where description like '%E2E-%'
union all select 'probe users', count(*) from auth.users where email like 'sec-probe-%';

-- every migration still matches the repository
select version, md5(statements[1]) from supabase_migrations.schema_migrations order by version;
-- compare: printf '%s' "$(cat <file>)" | md5
```

Also check the Supabase project has not paused (free plan, 7 quiet days), that all four workflows
are still enabled, and re-read the advisors — two `WARN`s are known.

**Last verified:** 2026-09-02 — 53 unit, 27 e2e at one worker, 47/47 security with 0 deferred, smoke
passing, `npm audit` clean, twelve migrations MD5-verified and replayed, production 200.

---

## Believed, but never proven

- **None of this session's three restore fixes has been re-rehearsed.** `accounts.json`, the paging
  assertion and the corrected `setval` step are all written and none has been exercised by a fresh
  restore. That is the highest-value hour available.
- **`audit_log` has never been restored at full volume.** 1,129 rows; the rehearsals used a
  representative block. The mechanism is one statement either way.
- **Restoring `files/` has never been exercised.** The bucket has been empty at every backup taken.
- **No viewer account exists.** The role was proven by demoting and promoting a real account.
- **The rewind has never been applied to production.** Only to a rehearsal copy.

---

## Resume prompt

One prompt, whole state. Paste it into a fresh chat as-is.

```
Read these, in this order, in /Users/itadmin/Desktop/puge:

  handoff/2026-09-02 The Rewind, and a Backup That Was Short.md      (phases 26-30, current)
  handoff/2026-09-02 Everything Held Back, Built.md                  (phases 21-25, traps 44-46)
  handoff/2026-09-01 Telegraphic Transfers and Full-Stack Verification.md (phases 14-23, traps 19-43)
  handoff/2026-09-01 Repository Restructure and Data Clear.md        (phases 10-13, traps 13-18)
  handoff/2026-09-01 Session Continuation Package.md                 (phases 1-9, codebase map, traps 1-12)
  docs/Decisions.md                                                  (D1-D35, what is authorised)
  docs/Open Problems and Proposals.md                                (8 items, 9 open questions)
  docs/Exchange Rates Proposal.md                                    (item 1, needs three answers)

This is a React + Vite ERP in apps/web on Supabase Postgres, deployed to Vercel behind a CI
gate. v0.6.0. Four accounts, all administrators, one shared ledger, real financial data, and
the owner uses it daily during Manila working hours — expect the ledger to have moved.

Before doing any work, verify rather than trusting this snapshot. In apps/web run npm test
(expect 53), npm run build, npm audit, npx playwright test --workers=1 (expect 27; the
DEFAULT worker count fails, see below), npm run security (expect "47 checks, 0 failed" with
no deferred clause) and npm run smoke, then run the SQL in this handoff's "How to verify
state in a fresh session". e2e and smoke WRITE to the production ledger, and npm run e2e
exits 0 having run nothing when credentials are missing. Also check the Supabase project has
not paused (free plan, 7 quiet days), that all four workflows are enabled, and re-read the
advisors. If the txns fingerprint differs from 05a080127ca18b46dc693edbd22b5168, the owner
has been working — say so rather than assuming damage.

Hold these while you work:
- Self-serve sign-up is CLOSED and must stay closed. Read policies are still using(true), so
  being signed in grants the whole ledger; only writes are role-gated.
- An account with no public.profiles row is a VIEWER and can change nothing. Creating an
  account is two steps. If someone reports nothing saves, check for the row.
- npm run e2e runs FOUR workers against one shared production ledger, because
  fullyParallel:false only serialises within a file. Three runs failed, two at --workers=1
  passed 27/27. Adding workers:1 to playwright.config.js is proposed and NOT applied.
- A failed Playwright run writes the shared password in plaintext into
  apps/web/test-results/*/trace.zip. Gitignored, never uploaded, but delete artifacts after
  debugging and never attach a trace anywhere.
- PostgREST caps a select at 1,000 rows silently. The backup wrote 1000 against 1129 and
  reported success. backup.mjs pages and asserts the count now; anything else reading a
  growing table must too.
- backups/ does not contain auth.users. Restoring profiles into a fresh project fails 23503;
  skipping it returns a ledger nobody can write to. accounts.json plus the recreation step in
  backups/README.md is the fix and it has NOT been re-rehearsed.
- Skipping setval on audit_log_id_seq does not kill the next write. It kills one days later,
  on every audited write across all six tables. Assert the sequence, not the write.
- Revoking EXECUTE on is_viewer() breaks every write with 42501 — tested, D34. Moving it to a
  non-exposed schema works. Do not follow the advisor's first suggestion.
- A green npm run security is not proof: it exits 0 for anything in DEFERRED in
  apps/web/security/probe.mjs. That list is empty today. Read the "n deferred" line.
- Never delete a failing security check to make a suite green (D26).
- Assert the refusal, not the absence of an error, and read the state back. A blocked policy
  and a missing row both give row_count = 0, and that has cost this project three times.
- D23/D25: revoke ALL then grant back what is intended, then verify against
  information_schema. {"success": true} proves the SQL ran, not that it achieved anything —
  and it can even mean it reached an instance that no longer exists. TRUNCATE ignores RLS.
- A new table needs five things it does not inherit: revoke-then-grant, a for-select policy
  PLUS write policies predicated on not public.is_viewer(), an entry in TABLES in
  apps/web/scripts/backup.mjs, its own security-probe checks, and its own log_change() trigger.
- npm run rewind reconstructs any second from audit_log (D32). It writes nothing; it emits a
  .sql file to run as postgres. Generated plans are gitignored — they carry whole rows.
- supabase project zone-offices (lasycakyudaawrydetnm) is a LIVE CRM, 18 tables, not scratch.
  Do not touch it. tracker-rehearsal (bucmcnsjkuprpojhequy) is the scratch project; it holds
  the schema and no data, and a new Supabase project has sign-up ON by default (D35).
- Do not reimplement recurrence in SQL; buildGeneratedRows in src/logic.js is the single
  definition (D31).
- Password and Vercel token rotation are DEFERRED by the owner. Do not raise them.
- Read the full Traps sections of all five handoffs before touching migrations, Vercel, the
  workflows or the suites. cleanupOrphanFiles() deletes any stored file no receipt row points at.

Next work, highest value first:
1. Re-rehearse the restore on tracker-rehearsal. Three fixes shipped this session and none has
   been exercised: accounts.json, the paged-read assertion, and the corrected setval step.
   Assert four profiles rows AND that every one is admin — a restore that drops the roster
   throws nothing. Turn sign-up off on that project before loading anything real.
2. Get the three answers in docs/Exchange Rates Proposal.md — provider, whether a person may
   override the rate, and whether to backfill the nine wires — then build it. PHP 39.96M is
   currently priced by five constants with no date and no source.
3. Apply workers:1, then the smaller approved items in docs/Open Problems and Proposals.md.

Report what you verified and what drifted, confirm the state back to me in a few lines, and
wait for direction before starting.
```

---

## Suggested skills

| Skill | When |
|---|---|
| `superpowers:systematic-debugging` | Any reported failure. The e2e cause this session was three layers below the symptom |
| `superpowers:verification-before-completion` | Before reporting anything done. A backup "succeeded" while missing 129 rows |
| `supabase` | Any schema, RLS, storage or auth change |
| `security-review` (project) | Anything touching grants, policies, roles, storage or headers |
| `obsidian-vault` | Before writing any note. This repository *is* the vault |

## Guideline Basis

- **PG-04** requires a continuation record naming scope, checks, limitations and unresolved evidence.
- **DOC-02** keeps observed facts, decisions, incidents and open questions separately labelled.
- **MD-02** requires descriptive, resolvable links; every link here targets an existing file.
- **DOC-03** keeps terminology and relationship labels consistent with the rest of the vault.
- **SEC-03** is why no credential appears in this note, and why the trace exposure is described by its mechanism rather than its value.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [Everything Held Back, Built](2026-09-02%20Everything%20Held%20Back,%20Built.md) · [Open Problems and Proposals](../docs/Open%20Problems%20and%20Proposals.md) · [Exchange Rates Proposal](../docs/Exchange%20Rates%20Proposal.md) · [Decisions](../docs/Decisions.md) · [Handoff](../docs/Handoff.md) · [Repository Evidence](../docs/Repository%20Evidence.md) · [Backups](../backups/README.md) · [Supabase Schema](../supabase/README.md)
