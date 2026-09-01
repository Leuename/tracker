---
title: Telegraphic Transfers and Full-Stack Verification
tags: [handoff, continuation, erp, tracker, supabase, vercel, telegraphic, verification, security]
created: 2026-09-01
status: current
supersedes: "[Repository Restructure and Data Clear](2026-09-01%20Repository%20Restructure%20and%20Data%20Clear.md) as the entry point; that note remains the record of phases 10 to 13 and is not repeated here"
related:
  - "[Decisions](../docs/Decisions.md) — D1 to D27, the authority on what is authorised"
  - "[Audit Trail Plan](../docs/Audit%20Trail%20Plan.md) — built in phase 21; the note records the departures"
  - "[Continuous Integration Plan](../docs/Continuous%20Integration%20Plan.md) — written in phase 21, awaiting two dashboard changes"
  - "[Handoff](../docs/Handoff.md) — the per-pass record"
  - "[Repository Evidence](../docs/Repository%20Evidence.md) — the factual baseline"
up: "[AI Agent Context](../docs/AI%20Agent%20Context.md)"
---

# Telegraphic Transfers and Full-Stack Verification

**This is the current entry point.** It covers phases 14 to 23 and carries the live facts.

**Updated 2026-09-01, later the same day.** Phase 21 built both remaining held-backs — the audit
trail and the CI gate — and phase 22 deferred the sign-up check and took `main` off Vercel's git
hook. The rows below are corrected in place and the changes are marked **Phase 21** or **Phase 22**;
both passes are written up in [Handoff](../docs/Handoff.md).

**Read in this order.**

1. This note — *Where everything stands*, *Open items*, *Traps*, *Resume prompt*.
2. [Repository Restructure and Data Clear](2026-09-01%20Repository%20Restructure%20and%20Data%20Clear.md) — phases 10 to 13, traps 13 to 18.
3. [Session Continuation Package](2026-09-01%20Session%20Continuation%20Package.md) — phases 1 to 9, the codebase map, traps 1 to 12.
4. [Decisions](../docs/Decisions.md) — D1 to D27.

Nothing in the two earlier packages is repeated here. Their traps all still apply.

---

## The one thing to read if you read nothing else

**Self-serve sign-up is now closed** (2026-09-02), and that is what holds this whole access model
up. Every RLS policy is `for all to authenticated using (true) with check (true)`, so being signed
in *is* the authorization — account creation is the only boundary there is. Verified directly:

```
POST /auth/v1/signup
422 {"code":422,"error_code":"signup_disabled","msg":"Signups not allowed for this instance"}
```

For the day before that, anyone reaching `https://tracker-six-flax.vercel.app` could register and
hold full read, write and **delete** over real financial data. The owner deferred it on 2026-09-01
on timing rather than on the merits, and closed it the next day. The toggle lives at
Authentication → Providers → Email → *Allow new users to sign up*:
`https://supabase.com/dashboard/project/jusifpditdigqdjiwdaj/auth/providers`

**If it is ever turned back on, the access model is gone**, not weakened. `npm run security` is the
check that notices; it reports 41 checks, 0 failed today, the first fully clean run this project
has had. The probe no longer leaves `sec-probe-*` accounts behind either, because it can no longer
create one.

---

## What happened this session, in order

Ten phases. Each is written up in [Handoff](../docs/Handoff.md); this is the sequence and why.

| # | Phase | Trigger | Outcome |
|---|---|---|---|
| 14 | Verification sweep | "run the suites and check supabase" | Found real user data in a ledger believed empty; found the e2e suite exiting 0 having run nothing |
| 15 | Owner's decisions | Six answers in one message | D13 to D19; backups, schema versioning, receipt deletion, sorted lists, release tags |
| 16 | Backups made real | Secrets set, workflow run | Four defects, four patch releases, first snapshot committed |
| 17 | Editable receipts | "editable like in tracker" | D16 extended: click a receipt to edit it, as a Tracker row has always worked |
| 18 | Telegraphic transfers | Updated design in Claude Design | D21 to D23; a fourth table, a screen, three modals, two migrations |
| 19 | Full-stack verification | "looped end-to-end verification of everything" | Two more defects: smoke had never passed; the probe did not know the new table existed |
| 20 | Documentation pass | "map, note, write everything" | Two forward plans and this package |
| 21 | Audit trail and CI | "create the audit trail and CI pipeline" | Both held-backs built; D24, D25; a TRUNCATE grant that `revoke insert, update, delete` had left behind |
| 22 | Deferral and the Vercel hook | "remove the deferred sign-up toggle from the check-pass" | D26, D27; the probe exits 0 with the failure still printed, and `main` comes off Vercel's git hook in `vercel.json` |
| 23 | Sign-up closed, first release | "self-serve signup is done" | 41/41 clean, `DEFERRED` emptied, v0.5.0 cut and pushed — the first run of the CI gate |

### Phase 14 — the sweep that changed the priorities

The previous package described the ledger as empty after the demo-data clear. It was not:

```
receipts id 1788235691367 | GTOI | EUNICE | "Cash advance" | ₱1,000 | pending
created 2026-09-01 04:08:11 UTC
```

No `E2E-` tag, not `smoke holder`, no probe note — **real, entered by a person.** The owner
confirmed it and it was left untouched. That single row moved backups from "highest priority open
item" to "there is live data with no restore path", which set the agenda for everything after.

The same sweep found that `npm run e2e` reports `24 skipped` and **exits 0** when `E2E_EMAIL` and
`E2E_PASSWORD` are absent. This is also the cause of the previous package's "one unexplained
observation" — a run reporting `6 passed` was `haveCredentials()` quietly gating
`functional.spec.js`. Not a mystery any more.

### Phase 16 — every defect was in the gap between "passes locally" and "runs elsewhere"

Backups took four attempts. None of the failures were reachable by reading the code.

| Release | Failure | Cause |
|---|---|---|
| v0.2.1 | `node: .env.local: not found`, exit 9 | `--env-file` aborts on a missing file; the file is gitignored, so CI never has it. `--env-file-if-exists` |
| v0.2.2 | `Error: Node.js detected but native WebSocket not found` | CI ran Node 20; `supabase-js` needs 22+. Never seen locally, where Node is 24 |
| — | `Cannot convert argument to a ByteString … value of 8230` | A literal `…` pasted into the `VITE_SUPABASE_PUBLISHABLE_KEY` secret, copied from a truncated value in chat rather than from the file |
| v0.2.3 | Backup commit **redeployed production** | A push to `main` is a deploy. `[skip ci]` was tried — **Vercel ignores it**, confirmed against the deployment list |
| v0.2.4 | — | `ignoreCommand` in `apps/web/vercel.json` is the mechanism that works. Verified: the next backup commit produced a `CANCELED` deployment |

Character 8230 is `…`. The lesson stands generally: never hand a secret through prose. The command
that works reads it from the file and never displays it:

```bash
gh secret set VITE_SUPABASE_PUBLISHABLE_KEY --repo Leuename/tracker \
  --body "$(grep '^VITE_SUPABASE_PUBLISHABLE_KEY=' apps/web/.env.local | cut -d= -f2-)"
```

### Phase 18 — the design, and where it was departed from

Read from `ERP Prototype.dc.html` in Claude Design project
`9996e477-0bfc-4941-a9dc-affa12f70bcf`, via `DesignSync` after the owner ran `/design-login`. The
remote file differs from `company_tracker/ERP Prototype.dc.html` by 137 lines, all telegraphic —
plus, as confirmation of D15, the design itself now does `CO.sort()` and sorts on `addCompany`.

Two deliberate departures, both [Decisions](../docs/Decisions.md) D22:

- The design's `+ Add transfer` was a **stub**: `flash('Add-transfer form comes next — say the word
  and I will build it')`. It is a real form now, plus an edit form and a delete confirmation.
- Its cross-currency totals use a fixed rate table. Kept, but only the two strip totals convert,
  the screen says they are indicative, and `"Released this month"` was cut to `"Released"` because
  the calculation beneath it has no month filter and the label claimed something the code did not do.

### Phase 19 — two defects that had been hiding

**`npm run smoke` had never actually passed.** `const first = await load()` sits inside the `try`;
the `finally` block restores the shared config from it and cannot see it:

```
ReferenceError: first is not defined  at src/smoke.mjs:92:42
```

It hid because `if (restoreConfig)` short-circuits before evaluating its argument — so it only
fires on runs that get far enough to touch the category list. The assertions had been passing; the
script then died tidying up. Every prior claim that smoke passed, including one made earlier the
same day, was wrong.

**The security probe did not know `transfers` existed.** The new table shipped with zero security
checks. Three added, 33 → 36, two of them a regression test for D23. The primary-key check
initially reported a **pass without testing anything**, because it skipped the UPDATE whenever the
preceding insert was refused; it inserts a clean row first now and gets a real `42501`.

---

## Where everything stands

### Services

| Thing | Value |
|---|---|
| Supabase project | `jusifpditdigqdjiwdaj`, name `baby`, `ap-southeast-1`, **free plan**, Postgres 17.6.1, `ACTIVE_HEALTHY` |
| Vercel project | `tracker`, `prj_7Nn67JEsbpVL98GZssRteALD7i7L`, team `team_b28zdgmC8juoUYma2pUpdZPA` |
| GitHub | `Leuename/tracker`, private, **Pro plan** (education benefits) — 3,000 Actions minutes/month |
| **Vercel Root Directory** | **`apps/web`** — unsetting it breaks every build |
| Production | `https://tracker-six-flax.vercel.app` |
| Accounts | 4, all administrator-equivalent. One (`millaveemmanuel15@`) exists only to run the backup |
| Claude Design project | `9996e477-0bfc-4941-a9dc-affa12f70bcf`, "ERP Dashboard Overview Wireframes" |

### Schema — six tables, nine migrations

`txns`, `receipts`, `recurring`, `transfers`, `app_config`, **`audit_log`** (Phase 21).

All nine migrations are in `supabase/migrations/`, each **MD5-verified byte-for-byte** against
`supabase_migrations.schema_migrations`. Note that Postgres `length()` counts characters while
`wc -c` counts bytes, so files containing em dashes are longer than their character count; the MD5
is the check that matters.

```sql
select version, md5(statements[1]) from supabase_migrations.schema_migrations order by version;
-- compare against: printf '%s' "$(cat <file>)" | md5
-- the stored statements carry no trailing newline, so strip yours before hashing
```

### Releases

| Tag | What |
|---|---|
| `v0.2.0` | Backups, versioned schema, receipt deletion, sorted lists |
| `v0.2.1` | `--env-file-if-exists` |
| `v0.2.2` | Node 24 in CI, `engines: >=22` |
| `v0.2.3` | `[skip ci]` on backup commits — did not work |
| `v0.2.4` | `ignoreCommand` in `vercel.json` — does work |
| `v0.3.0` | Editable receipts |
| `v0.4.0` | Telegraphic transfers |
| `v0.4.1` | Smoke fix, transfers security coverage |

### The ledger, verified 2026-09-01 after the final run

| Table | Rows |
|---|---:|
| `txns` | 1 — `BAR / Accounting Services / "aedfs" / ₱1,133`, entered by the owner |
| `receipts` | 1 — the EUNICE row |
| `recurring`, `transfers` | 0 |
| `app_config` | 1 — 21 companies, 13 categories, 0 notes, `ackRequirePhoto: false` |
| storage objects | 0 |
| `auth.users` | 4, no probe accounts |

No `E2E-`, `smoke`, or `SEC ` residue of any kind.

### Test counts

| Command | Result |
|---|---|
| `npm test` | **43/43** — was 33; `alphabetical` and transfer-total cases added |
| `npm run e2e` | **27/27** — was 24; receipt delete, receipt edit, transfer lifecycle added |
| `npm run security` | **47/47** — Phase 21 added five audit-log checks; phase 23 closed sign-up and deleted its `DEFERRED` entry. First fully clean run |
| `npm run smoke` | Passing, and now covers all four entity tables |
| `npm run backup` | Six tables, `audit_log` included (Phase 21) |
| `npm run build`, `npm audit` | Green, clean |
| Local markdown links | 506/506 resolve |

---

## Open items

| # | Item | State |
|---|---|---|
| 1 | Backups | **Closed.** Nightly 18:00 UTC, verified, covers all six tables |
| 2 | Password rotation | **Deferred by the owner.** Five characters, shared across four accounts — and as of phase 22 also held in GitHub secrets, reachable through a workflow by anyone with write access |
| 3 | Company codes and categories | **Closed.** Confirmed real, sorted a–z (D15) |
| 4 | `ackRequirePhoto` | **Closed.** Stays off (D17); verified still off |
| 5 | Receipt deletion | **Closed.** Built, plus editing (D16) |
| 6 | Roles | **Closed and built** (D29). `profiles` + `is_viewer()`, every write policy behind it, the app reflecting it. An account with no profile row is a viewer |
| 7 | Construction tracker | **Parked** until explicitly requested (D18) |

## Held back, and what each would take

| | Why still out | Grade |
|---|---|---|
| ~~**Audit trail**~~ | **Built in Phase 21.** Live in the database: `audit_log`, `log_change()`, five triggers. [Decisions](../docs/Decisions.md) D24, D25 | — |
| ~~**CI**~~ | **Closed.** Built in Phase 21, wired in 22, proven in 23: `v0.5.0` went out through `ci.yml` run `33530246170`, both jobs green, no competing deployment from Vercel. `verify.yml` proven too — run `33530924458`, 27 e2e, 41 checks, smoke, no residue | — |
| **Scheduler** (`autoGen`, `ackAutoNotify`) | `pg_cron` 1.6.4 is available but not installed; notification delivery has no channel | C |
| ~~**Last write wins**~~ | **Closed.** `merge_app_config` folds patches server-side and the client sends diffs ([Decisions](../docs/Decisions.md) D28). Two people editing the *same* key still resolve last-write-wins, deliberately | — |
| **`apps/api/`** | Empty directory declaring an intent. Deleting it is also a documentation change | A |
| **Per-wire FX rate** | D22. The correct fix for cross-currency totals | — |
| ~~**Read-only role**~~ | **Built.** `profiles`, `is_viewer()`, every write policy rewritten, the app reflecting it ([Decisions](../docs/Decisions.md) D29) | — |

Grades are from an external consultation (`codex exec`, `gpt-5.6-sol`, low effort) on 2026-09-01,
re-graded against this repository. Two of its six answers were usable as written; three would have
misled if followed. Its scheduler answer missed `pg_cron`; its CI answer put the credentialed
security probe on pull-request checks, where it cannot run.

---

## Traps, continued

Traps 1 to 18 are in the two earlier packages and all still apply. These are new.

19. **`[skip ci]` does not stop a Vercel deploy.** Tested. `ignoreCommand` in
    `apps/web/vercel.json` is the mechanism that works, and a skipped build shows as `CANCELED`,
    not as an absent deployment.
20. **A column grant cannot carve a column out of a table grant.** Supabase's default privileges on
    `public` grant table-wide INSERT/UPDATE to `authenticated`. Revoke first, then grant columns,
    then **verify against `information_schema.role_column_grants`.** `{"success": true}` from
    `apply_migration` proves the SQL ran, not that it achieved anything. (D23)
21. **Every new table needs four things a new table does not inherit:** the revoke-then-grant
    above, its own RLS policy, an entry in `TABLES` in `apps/web/scripts/backup.mjs`, and its own
    security-probe checks. `transfers` nearly shipped missing the last two.
22. **`npm run smoke` and `npm run e2e` write to the production ledger.** There is one Supabase
    project; `E2E_BASE_URL` changes the site, not the database. The sweep is tag-scoped and safe,
    but `cleanupOrphanFiles()` is **not** — it deletes any stored file no receipt row points at.
23. **Node 22 or newer is required.** `supabase-js` reaches for a native WebSocket at
    `createClient`; Node 20 dies at import. `engines` records it.
24. **Never hand a secret through prose.** A truncated key with a `…` was pasted into a GitHub
    secret and failed with a ByteString error 26 characters in. Read secrets from the file.
25. **A Playwright row click lands on the row's centre.** On the AckRec sheet that is the status
    `<select>`, which deliberately stops propagation. Click a named cell, not the row.
26. **The probe creates a real account each run** while sign-up is open, and it survives the run.

---

27. **`revoke insert, update, delete` does not lock a table down.** Supabase's default privileges
    grant ALL on a new table to `authenticated`, and ALL includes **TRUNCATE**, which row-level
    security does not restrict. `audit_log` shipped for one migration with `authenticated` able to
    erase the whole log in a statement. `revoke all from anon, authenticated`, then grant back the
    one privilege intended, then read `role_table_grants`. ([Decisions](../docs/Decisions.md) D25)
28. **Every new table now needs five things, not four:** the revoke-then-grant, its own RLS policy,
    an entry in `TABLES` in `apps/web/scripts/backup.mjs`, its own security-probe checks, and
    **its own audit trigger**. None of the five is inherited.
29. **The audit log cannot be cleaned up.** Nothing may delete from it, by design, so every
    `npm run e2e`, `npm run security` and `npm run smoke` run leaves its writes there permanently.
    That is correct behaviour, not residue; do not go looking for a way to sweep it.
30. **`ci.yml` gates nothing until Vercel stops deploying on push.** GitHub checks do not gate
    Vercel. With automatic git deployments still on, both deploy the same commit and the workflow
    is decorative.

31. **A green security suite is not necessarily a suite with no failures.** `npm run security`
    exits 0 for anything listed in `DEFERRED` (D26). The list is empty today, so 41/41 means what
    it says — but read the `n deferred` line, not just the exit code, and never add an entry
    without a decision to point at.
32. **`vercel.json`'s `git.deploymentEnabled` takes effect on the commit that introduces it.**
    Expected it to apply one push late; it did not. Vercel reads the setting from the commit it is
    about to deploy, so `v0.5.0` produced exactly one production deployment — the CLI's, from CI.

33. **A GitHub secret's NAME is public; only its value is secret.** On 2026-09-01 a Vercel token
    was pasted into the name position — `gh secret set <token> --repo …` instead of
    `gh secret set VERCEL_TOKEN --repo …` — which published it in the repository settings UI and
    in the API listing, and burned it. The token had to be revoked and reissued. The name always
    comes first and is always a constant; the value never appears on the command line.
34. **Vercel token management is browser-only.** A CLI/OAuth app credential is refused by both
    `POST /v3/user/tokens` and `GET /v5/user/tokens` with `403 forbidden`, so a leaked token cannot
    be revoked from a session either — only at <https://vercel.com/account/tokens>. Plan for that
    before creating one, not after.

35. **A schema fingerprint over a whole database compares the platform too.** A production/rebuild
    comparison read 177 facts against 176 and looked like drift; the extra was
    `realtime.subscription.tr_check_filters`, a Supabase platform trigger, because the query
    excluded `storage%` but not `realtime%`. Scope catalogue comparisons to `public`.
36. **A restore must disable the triggers and then fix the sequence.** Leave the audit triggers on
    and the restore writes history about itself; leave `app_config_touch` on and every restored
    `updated_at` becomes `now()`; skip `setval` on `audit_log_id_seq` and the next audited write
    anywhere in the app dies on a duplicate primary key. Procedure in
    [backups/README.md](../backups/README.md).
37. **A restore cannot run through the application's credentials.** `authenticated` has no INSERT on
    `audit_log` and only column-list grants elsewhere, so a client-credentialed restore silently
    drops `created_at` and the whole audit history. Restore as `postgres`.

38. **Creating an account is two steps now.** An account with no `public.profiles` row is a
    **viewer** and can change nothing — deliberately, so a forgotten account holds no power. Add
    the row, or the new administrator will report that nothing saves.
39. **A single `for all using (true)` policy on a new table hands viewers full write access.** Since
    D29 a table needs a `for select` policy plus separate write policies predicated on
    `not public.is_viewer()`. The old shape is still all over the earlier migrations; do not copy it.
40. **Assert the refusal, not the absence of an error.** `merge_app_config` returned 0 and no error
    when a viewer called it, because a blocked policy and a missing row both give `row_count = 0`.
    A probe checking "no error came back" passed while the feature was broken. Read the state back.

## How to verify state in a fresh session

```bash
cd /Users/itadmin/Desktop/puge/apps/web
npm test          # 39 offline assertions
npm run build     # green
npm audit         # 0
npm run e2e       # 27 specs — WRITES to the production ledger
npm run security  # 47 checks, expect 47/47 — DEFERRED is empty
npm run smoke     # live end-to-end — WRITES to the production ledger
```

Credentials live in `apps/web/.env.local` (gitignored): `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `E2E_EMAIL`, `E2E_PASSWORD`, `SMOKE_EMAIL`, `SMOKE_PASSWORD`.
Note the prefixes differ — `E2E_*` drives both Playwright and the probe, `SMOKE_*` drives smoke.
**If `npm run e2e` reports specs skipped, it ran nothing.** Check credentials before believing a pass.

Then confirm the database directly, not through the app:

```sql
-- no server-managed column writable by a client, on any table
select table_name, privilege_type, string_agg(column_name, ',' order by column_name)
from information_schema.role_column_grants
where table_schema='public' and grantee='authenticated' and privilege_type in ('INSERT','UPDATE')
group by 1,2 order by 1,2;

-- no residue
select 'txns' t, count(*) from txns union all select 'receipts', count(*) from receipts
union all select 'recurring', count(*) from recurring union all select 'transfers', count(*) from transfers
union all select 'probe users', count(*) from auth.users where email like 'sec-probe-%';
```

**Last verified green:** 2026-09-02, after phase 23 — 39 unit, 27 e2e, 41/41 security, smoke
passing, `npm audit`
clean, 506 links resolving, `AGENTS.md` byte-identical to `CLAUDE.md`, production 200 with 7 of 7
security headers, deployment `dpl_XDJ9fcJUFu1YFPhQnR97FXfKts7S` READY.

---

## Believed, but never proven

- **No restore has ever been performed.** The backup runs and its manifest matches the database,
  but nobody has rebuilt an empty project from it.
- **The migrations have never been replayed.** All seven are byte-identical to what was applied,
  which is not the same as a rebuild known to work.
- **The Telegraphic screen has never been looked at by a human.** It is driven by a passing e2e
  spec; nobody has opened it.

---

## Resume prompt

One prompt, whole state. Paste it into a fresh chat as-is.

```
Read these, in this order, in /Users/itadmin/Desktop/puge:

  handoff/2026-09-01 Telegraphic Transfers and Full-Stack Verification.md   (phases 14-23, current)
  handoff/2026-09-01 Repository Restructure and Data Clear.md               (phases 10-13, traps 13-18)
  handoff/2026-09-01 Session Continuation Package.md                        (phases 1-9, codebase map, traps 1-12)
  docs/Decisions.md                                                          (D1-D23, what is authorised)

This is a React + Vite ERP in apps/web, on Supabase Postgres, deployed to Vercel from
main with no CI gate — a push to main is a production release. One shared ledger, four
equal accounts, real financial data only (D8, D12, D20).

Before doing any work, verify the state rather than trusting the snapshot. In apps/web
run npm test, npm run build, npm audit, npm run e2e, npm run security and npm run smoke,
then query the database directly with the two SQL blocks in the handoff's "How to verify
state in a fresh session". Note that e2e and smoke WRITE to the production ledger, and
that npm run e2e exits 0 having run nothing when credentials are missing — if it reports
specs skipped it did not pass. Also check the Supabase project has not paused (free plan,
7 quiet days), that the nightly backup workflow is still enabled (GitHub disables a
schedule after 60 days without a commit). The probe no longer creates sec-probe-* accounts
now that sign-up is closed, but check for leftovers from before 2026-09-02.

Hold these while you work:
- Self-serve sign-up is CLOSED as of 2026-09-02 and must stay closed. Every policy is
  using (true), so being signed in is the authorization and account creation is the only
  boundary the model has. If npm run security ever reports that check failing again, treat
  it as the most serious thing on the board.
- Never delete a failing security check to make a suite green. Add it to DEFERRED in
  apps/web/security/probe.mjs with the decision that authorises it, or fix the thing (D26).
- D23: a column grant cannot carve a column out of a table grant. Revoke first, then grant
  columns, then verify against information_schema.role_column_grants — {"success": true}
  from apply_migration proves the SQL ran, not that it achieved anything.
- Every new table needs five things it does not inherit: revoke-then-grant, its own RLS
  policy, an entry in TABLES in apps/web/scripts/backup.mjs, its own security-probe
  checks, and its own audit trigger.
- D25: revoke insert, update, delete is not enough. Supabase grants ALL on a new table to
  authenticated, and ALL includes TRUNCATE, which RLS does not restrict. Revoke all, then
  grant back only what is intended, then read role_table_grants.
- The audit log is append-only and nothing may delete from it. Test-suite writes stay in it
  permanently and that is correct; do not build a sweep for them.
- D22: cross-currency totals are indicative until there is a per-wire FX rate.
- Node 22 or newer. [skip ci] does not stop a Vercel deploy; vercel.json ignoreCommand does.
- Read the full Traps sections of all three handoffs before touching migrations, Vercel or
  the test suites. cleanupOrphanFiles() deletes any stored file no receipt row points at.

Everything held back is built and released as v0.5.0: the audit trail is live, CI
gates production through .github/workflows/ci.yml, self-serve sign-up is closed, both
workflows have run green with 27 e2e specs and 41 security checks really executing
rather than skipping, and the restore was performed end to end — the nine migrations
rebuild production's schema fact-for-fact (fingerprint a18b5dd2 over 178 catalogue
facts) and the ledger comes back byte-for-byte (f95cd619, 21 rows, PHP 226,000.00).
Remaining open items: restoring files/ has never been tested because no stored
documents exist yet, the read-only role (D20), the scheduler, last-write-wins on
app_config, and rotating both the shared five-character password and the tracker-ci
Vercel token.

Report what you verified and what drifted, confirm the state back to me in a few lines,
and wait for direction before starting.
```

---

## Suggested skills

| Skill | When |
|---|---|
| `superpowers:systematic-debugging` | Any reported failure. Every defect this session was invisible until something was actually run |
| `superpowers:verification-before-completion` | Before reporting anything done. Two "passes" this session were not |
| `supabase` | Any schema, RLS, storage or auth change |
| `security-review` (project) | Anything touching grants, policies, storage or headers |
| `obsidian-vault` | Before writing any note. This repository *is* the vault |

## Guideline Basis

- **PG-04** requires a continuation record naming scope, checks, limitations and unresolved evidence.
- **DOC-02** keeps observed facts, decisions and open questions separately labelled.
- **MD-02** requires descriptive, resolvable links; every link here targets an existing file.
- **DOC-03** keeps terminology and relationship labels consistent with the rest of the vault.
- **SEC-03** is why no credential appears in this note.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [Repository Restructure and Data Clear](2026-09-01%20Repository%20Restructure%20and%20Data%20Clear.md) · [Session Continuation Package](2026-09-01%20Session%20Continuation%20Package.md) · [Decisions](../docs/Decisions.md) · [Audit Trail Plan](../docs/Audit%20Trail%20Plan.md) · [Continuous Integration Plan](../docs/Continuous%20Integration%20Plan.md) · [Handoff](../docs/Handoff.md) · [Repository Evidence](../docs/Repository%20Evidence.md)
