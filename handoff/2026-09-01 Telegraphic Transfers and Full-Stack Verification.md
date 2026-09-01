---
title: Telegraphic Transfers and Full-Stack Verification
tags: [handoff, continuation, erp, tracker, supabase, vercel, telegraphic, verification, security]
created: 2026-09-01
status: current
supersedes: "[Repository Restructure and Data Clear](2026-09-01%20Repository%20Restructure%20and%20Data%20Clear.md) as the entry point; that note remains the record of phases 10 to 13 and is not repeated here"
related:
  - "[Decisions](../docs/Decisions.md) — D1 to D23, the authority on what is authorised"
  - "[Audit Trail Plan](../docs/Audit%20Trail%20Plan.md) — the next thing to build"
  - "[Continuous Integration Plan](../docs/Continuous%20Integration%20Plan.md) — the one after that"
  - "[Handoff](../docs/Handoff.md) — the per-pass record"
  - "[Repository Evidence](../docs/Repository%20Evidence.md) — the factual baseline"
up: "[AI Agent Context](../docs/AI%20Agent%20Context.md)"
---

# Telegraphic Transfers and Full-Stack Verification

**This is the current entry point.** It covers phases 14 to 20 and carries the live facts.

**Read in this order.**

1. This note — *Where everything stands*, *Open items*, *Traps*, *Resume prompts*.
2. [Repository Restructure and Data Clear](2026-09-01%20Repository%20Restructure%20and%20Data%20Clear.md) — phases 10 to 13, traps 13 to 18.
3. [Session Continuation Package](2026-09-01%20Session%20Continuation%20Package.md) — phases 1 to 9, the codebase map, traps 1 to 12.
4. [Decisions](../docs/Decisions.md) — D1 to D23.

Nothing in the two earlier packages is repeated here. Their traps all still apply.

---

## The one thing to read if you read nothing else

**Self-serve sign-up is enabled on the Supabase project.** Every RLS policy is
`for all to authenticated using (true) with check (true)`, so being signed in *is* the
authorization. Anyone who reaches `https://tracker-six-flax.vercel.app` can register and hold full
read, write and **delete** over real financial data.

One toggle: Authentication → Providers → Email → *Allow new users to sign up* → off.
`https://supabase.com/dashboard/project/jusifpditdigqdjiwdaj/auth/providers`

**The owner deferred it on 2026-09-01**, on timing rather than on the merits — the Supabase
dashboard appeared unavailable to them at the time. It is the reason `npm run security` reports
35 of 36 rather than 36 of 36. **Do not treat that failure as a code defect, and do not "fix" it in
code.** Raise it, then move on.

Each probe run mints a real `sec-probe-<timestamp>@zoneoffice.ph` account that outlives the run.
Delete them afterwards or they accumulate:

```sql
delete from auth.users where email like 'sec-probe-%';
```

---

## What happened this session, in order

Seven phases. Each is written up in [Handoff](../docs/Handoff.md); this is the sequence and why.

| # | Phase | Trigger | Outcome |
|---|---|---|---|
| 14 | Verification sweep | "run the suites and check supabase" | Found real user data in a ledger believed empty; found the e2e suite exiting 0 having run nothing |
| 15 | Owner's decisions | Six answers in one message | D13 to D19; backups, schema versioning, receipt deletion, sorted lists, release tags |
| 16 | Backups made real | Secrets set, workflow run | Four defects, four patch releases, first snapshot committed |
| 17 | Editable receipts | "editable like in tracker" | D16 extended: click a receipt to edit it, as a Tracker row has always worked |
| 18 | Telegraphic transfers | Updated design in Claude Design | D21 to D23; a fourth table, a screen, three modals, two migrations |
| 19 | Full-stack verification | "looped end-to-end verification of everything" | Two more defects: smoke had never passed; the probe did not know the new table existed |
| 20 | This documentation pass | "map, note, write everything" | Two forward plans and this package |

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

### Schema — five tables, seven migrations

`txns`, `receipts`, `recurring`, **`transfers`** (new), `app_config`.

All seven migrations are in `supabase/migrations/`, each **MD5-verified byte-for-byte** against
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
| `npm test` | **39/39** — was 33; `alphabetical` and transfer-total cases added |
| `npm run e2e` | **27/27** — was 24; receipt delete, receipt edit, transfer lifecycle added |
| `npm run security` | **35/36** — was 33 checks; three transfer checks added. The one failure is sign-up |
| `npm run smoke` | Passing, and now covers all four entity tables |
| `npm run build`, `npm audit` | Green, clean |
| Local markdown links | 506/506 resolve |

---

## Open items

| # | Item | State |
|---|---|---|
| 1 | Backups | **Closed.** Nightly 18:00 UTC, verified, covers all five tables |
| 2 | Password rotation | **Deferred by the owner.** Five characters, shared across four accounts |
| 3 | Company codes and categories | **Closed.** Confirmed real, sorted a–z (D15) |
| 4 | `ackRequirePhoto` | **Closed.** Stays off (D17); verified still off |
| 5 | Receipt deletion | **Closed.** Built, plus editing (D16) |
| 6 | Roles | **Closed as a decision** (D20). A consumer-only fifth account is planned and costed |
| 7 | Construction tracker | **Parked** until explicitly requested (D18) |

## Held back, and what each would take

| | Why still out | Grade |
|---|---|---|
| **Audit trail** | Four accounts, no record of who changed or deleted what. **[Plan written](../docs/Audit%20Trail%20Plan.md)** | **A** |
| **CI** | Push to `main` deploys unchecked. **[Plan written](../docs/Continuous%20Integration%20Plan.md)** | C+ |
| **Scheduler** (`autoGen`, `ackAutoNotify`) | `pg_cron` 1.6.4 is available but not installed; notification delivery has no channel | C |
| **Last write wins** | The real hotspot is `app_config` — one jsonb row rewritten whole, so two people editing *different* settings already collide | C |
| **`apps/api/`** | Empty directory declaring an intent. Deleting it is also a documentation change | A |
| **Per-wire FX rate** | D22. The correct fix for cross-currency totals | — |
| **Read-only role** | D20. Needs a `profiles` table or JWT claim and every policy rewritten | — |

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

## How to verify state in a fresh session

```bash
cd /Users/itadmin/Desktop/puge/apps/web
npm test          # 39 offline assertions
npm run build     # green
npm audit         # 0
npm run e2e       # 27 specs — WRITES to the production ledger
npm run security  # 36 checks, expect 35 pass while sign-up is open
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

**Last verified green:** 2026-09-01 — 39 unit, 27 e2e, 35/36 security, smoke passing, `npm audit`
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

## Resume prompts

Paste one into a fresh chat. Each names this file and tells the session to verify before acting.

### Straight continuation

```
Read "handoff/2026-09-01 Telegraphic Transfers and Full-Stack Verification.md" in
/Users/itadmin/Desktop/puge, then docs/Decisions.md D1-D23. Confirm the current
state back to me in a few lines — including anything you find stale — before doing
any work. Note that self-serve sign-up is deliberately still open and deferred; do
not treat the one failing security check as a code defect. Then wait.
```

### Build the audit trail

```
Read "handoff/2026-09-01 Telegraphic Transfers and Full-Stack Verification.md" and
"docs/Audit Trail Plan.md" in /Users/itadmin/Desktop/puge. Build the audit trail to
that plan. Apply the migration through the Supabase MCP, then VERIFY the grants with
a direct information_schema.role_column_grants query rather than trusting the success
response — Decisions D23 is why. Mirror the migration into supabase/migrations/ and
MD5-verify it. Add the five probe checks, add audit_log to TABLES in
apps/web/scripts/backup.mjs, and run npm test, npm run e2e and npm run security
before telling me it is done.
```

### Build CI

```
Read "handoff/2026-09-01 Telegraphic Transfers and Full-Stack Verification.md" and
"docs/Continuous Integration Plan.md" in /Users/itadmin/Desktop/puge. Build CI to
that plan. Start with the prerequisite: npm run e2e currently exits 0 having run
nothing when credentials are missing, and any gate built on that is worthless. Then
remember that GitHub checks do NOT gate Vercel — deployment has to move behind the
workflow or the gate is decorative. Do not put the e2e or security suites on push;
they write to the production ledger.
```

### Pick up a specific piece of work

```
Read "handoff/2026-09-01 Telegraphic Transfers and Full-Stack Verification.md" in
/Users/itadmin/Desktop/puge for context, then <TASK>. Respect docs/Decisions.md —
D8 and D20 (one shared ledger, four equal accounts), D12 (the ledger holds only real
data), D22 (cross-currency totals are indicative) and D23 (revoke before granting
columns, then verify) constrain most changes. Read the Traps section before touching
migrations, Vercel, or the test suites. Run npm test, npm run e2e and npm run
security in apps/web before telling me it is done.
```

### Something is broken in production

```
Read "handoff/2026-09-01 Telegraphic Transfers and Full-Stack Verification.md" in
/Users/itadmin/Desktop/puge and its Traps section, plus the two earlier packages'.
<SYMPTOM>. Check the Vercel deployment list and the Supabase project state before
assuming a code fault — a failed Vercel build never replaces a working deployment,
and a skipped one shows as CANCELED. Reproduce it before proposing a fix, and give
me the root cause, not the symptom.
```

### After a long gap

```
Read "handoff/2026-09-01 Telegraphic Transfers and Full-Stack Verification.md" in
/Users/itadmin/Desktop/puge. Verify the state still matches: run npm test, npm run
e2e, npm run security and npm run smoke in apps/web, check the Supabase project has
not paused (free plan, pauses after 7 quiet days), confirm the nightly backup
workflow is still enabled — GitHub disables a schedule after 60 days without a
commit — and delete any sec-probe-* accounts that have accumulated. Report what
drifted.
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
