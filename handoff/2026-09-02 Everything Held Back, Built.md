---
title: Everything Held Back, Built
tags: [handoff, continuation, erp, tracker, supabase, vercel, audit-trail, ci, roles, restore, scheduler, security]
created: 2026-09-02
status: current
supersedes: "[Telegraphic Transfers and Full-Stack Verification](2026-09-01%20Telegraphic%20Transfers%20and%20Full-Stack%20Verification.md) as the entry point; that note remains the record of phases 14 to 23 and its traps 1 to 43 all still apply"
related:
  - "[Decisions](../docs/Decisions.md) — D1 to D31, the authority on what is authorised"
  - "[Audit Trail Plan](../docs/Audit%20Trail%20Plan.md) — built; the note records where the plan was wrong"
  - "[Continuous Integration Plan](../docs/Continuous%20Integration%20Plan.md) — built and active"
  - "[Backups](../backups/README.md) — the restore procedure, now performed rather than described"
  - "[Supabase Schema](../supabase/README.md) — twelve migrations, all MD5-verified"
  - "[Handoff](../docs/Handoff.md) — the per-pass record"
  - "[Repository Evidence](../docs/Repository%20Evidence.md) — the factual baseline"
up: "[AI Agent Context](../docs/AI%20Agent%20Context.md)"
---

# Everything Held Back, Built

**This is the current entry point.** It covers phases 21 to 25 and carries the live facts.

Every item on the held-back list is built, released and exercised. What is left is smaller, and
most of it is somebody's decision rather than somebody's work.

**Read in this order.**

1. This note — *The state in one screen*, *Open items*, *Traps*, *Resume prompt*.
2. [Telegraphic Transfers and Full-Stack Verification](2026-09-01%20Telegraphic%20Transfers%20and%20Full-Stack%20Verification.md) — phases 14 to 23, traps 19 to 43.
3. [Repository Restructure and Data Clear](2026-09-01%20Repository%20Restructure%20and%20Data%20Clear.md) — phases 10 to 13, traps 13 to 18.
4. [Session Continuation Package](2026-09-01%20Session%20Continuation%20Package.md) — phases 1 to 9, the codebase map, traps 1 to 12.
5. [Decisions](../docs/Decisions.md) — D1 to D31.

Nothing in the three earlier packages is repeated here. Their traps all still apply.

---

## The one thing to read if you read nothing else

**Self-serve sign-up is closed, and it has to stay closed.** Every read policy is
`using (true)`, so being signed in is still what grants access to the whole ledger; only *writes*
are now role-gated. Account creation is the boundary the model rests on.

```
POST /auth/v1/signup → 422 {"error_code":"signup_disabled"}
```

Second: **an account with no `public.profiles` row is a viewer and can change nothing.** Creating
an account is two steps now. The second one is the one that grants anything:

```sql
insert into public.profiles (user_id, role)
select id, 'admin' from auth.users where email = 'someone@example.com';
```

Third: **a green `npm run security` is not proof.** It exits 0 for anything listed in `DEFERRED`
in `apps/web/security/probe.mjs`. That list is empty today and the suite is genuinely 47/47 — but
read the `n deferred` line, not the exit code.

---

## The state in one screen

| | |
|---|---|
| Supabase | `jusifpditdigqdjiwdaj`, name `baby`, `ap-southeast-1`, **free plan**, Postgres 17.6.1 |
| Vercel | project `tracker`, `prj_7Nn67JEsbpVL98GZssRteALD7i7L`, team `team_b28zdgmC8juoUYma2pUpdZPA`, slug `grade-fit-s-projects`, **hobby plan** |
| GitHub | `Leuename/tracker`, private, Pro (3,000 Actions minutes/month) |
| Production | `https://tracker-six-flax.vercel.app` — 200, 7 of 7 security headers |
| Accounts | 4, **all `admin`**, 0 viewers. Sign-up closed |
| Release | `v0.6.0` |
| Tables | `txns`, `receipts`, `recurring`, `transfers`, `app_config`, `audit_log`, `profiles` |
| Migrations | 12, every one MD5-identical to what was applied |
| Workflows | `ci.yml`, `verify.yml`, `backup.yml`, `schedule.yml` — all active, all last-green |
| Secrets | 11 |

### The ledger, verified 2026-09-01 23:46 UTC

```
txns fingerprint  f95cd619e877916891cb0f6853f9e041
txns 21 · ₱226,000.00 · receipts 0 · recurring 0 · transfers 0
audit_log 841 · storage objects 0 · residue 0 · probe accounts 0
```

That fingerprint is worth keeping. It has survived a restore test and an accidental deletion, and
matching it is the fastest way to know the owner's data is intact.

### Checks

| Command | Result |
|---|---|
| `npm test` | **43/43** offline |
| `npm run build` | green |
| `npm audit` | 0 |
| `npm run e2e` | **27/27**, three consecutive runs |
| `npm run security` | **47/47**, 0 deferred |
| `npm run smoke` | passing, including a document round-trip |
| `npm run schedule -- --dry-run` | clean |
| Local markdown links | 594/594 resolve |
| `AGENTS.md` vs `CLAUDE.md` | byte-identical |

---

## What happened, in order

| # | Phase | Trigger | Outcome |
|---|---|---|---|
| 21 | Audit trail and CI | "create the audit trail and CI pipeline" | D24, D25; a TRUNCATE grant that `revoke insert, update, delete` had left behind |
| 22 | Deferral and the Vercel hook | "remove the deferred sign-up toggle from the check-pass" | D26, D27; a leaked Vercel token, revoked and reissued |
| 23 | Sign-up closed, first release | "self-serve signup is done" | 41/41 clean, `v0.5.0` shipped through the gate on its first run |
| 24 | The restore, performed | "pause zone-offices and run the restore test" | Migrations proven to replay; a real transaction deleted and recovered |
| 25 | The rest of the list | "build and do everything on the list" | D28 to D31; a sort bug, a role model, a scheduler, and an e2e "flake" that was not one |

### Phase 21 — the audit trail, and a grant that survived a revoke

`public.audit_log`, a `security definer` `log_change()`, one after-row trigger per table. It lives
in the database because there is no server between the client and Postgres (D7): a merge or a log
written in `apps/web/src/` is one any client can skip.

Two places the [plan](../docs/Audit%20Trail%20Plan.md) was wrong, both caught by building it:

- `coalesce((to_jsonb(new)->>'id')::bigint, …)` raises `invalid input syntax for type bigint:
  "true"` on `app_config`, whose primary key is a boolean. Every settings write would have failed.
- On DELETE the `NEW` record is unassigned, so computing `after` inline fails on exactly the
  operation the log exists to record.

Then the part worth remembering. The migration applied clean, and
`information_schema.role_table_grants` still showed `authenticated` holding **TRUNCATE and
TRIGGER**. Supabase's default privileges grant ALL; ALL is wider than three verbs. **Row-level
security does not apply to TRUNCATE**, so the audit log could have been erased in one statement —
the single thing it exists to prevent. [Decisions](../docs/Decisions.md) D25.

### Phase 22 — a deferral mechanism, and a burned token

`DEFERRED` in the probe maps a check name to the decision authorising it. A deferred check still
runs and still prints its real result, tagged `DEFER`; it just does not fail the suite. A deferred
check that starts passing prints `STALE EXEMPTION`, warning rather than failing, because closing a
hole must never turn the nightly run red. D26.

`main` came off Vercel's git hook in `vercel.json` rather than in the dashboard, so the setting is
versioned and reviewable. D27.

**The token incident.** A Vercel API token was set with
`gh secret set <token> --repo …` — the value in the **name** position. GitHub secret names are not
secret; they appear in the settings UI and come back from the API. The token was published, and the
value slot got nothing. It could not be revoked from a session either: Vercel refuses its own
token-management endpoints to an app credential. The owner revoked it in the browser, and it was
confirmed dead rather than assumed:

```
GET https://api.vercel.com/v2/user
{"error":{"code":"forbidden","message":"Not authorized","invalidToken":true}}
```

Traps 33 and 34. The guidance changed with it: set a secret by hand in the GitHub web UI, because
the `!` prefix puts the value in a transcript and its prompt has no usable stdin.

### Phase 23 — sign-up closed, and the gate's first run

Verified against the endpoint rather than read off the dashboard. The `DEFERRED` entry was deleted
the same minute — the mechanism stays, the list empties — giving the first fully clean security run
this project has had.

`v0.5.0` went out through `ci.yml` on its first ever run: `check` then `deploy`, 1m11s, both green,
production 200. **Vercel's git integration produced no deployment for that commit**, which had been
an open question written down as a trap: `git.deploymentEnabled` is read from the commit being
deployed, so it applied immediately rather than one push late.

### Phase 24 — the restore, performed

The owner paused `zone-offices` to free a free-tier slot. All nine migrations replayed into an empty
project, and the result was compared by fingerprint rather than by eye:

```
a18b5dd26e148a1e216068023b0e4403   178 facts   production
a18b5dd26e148a1e216068023b0e4403   178 facts   rebuilt from supabase/migrations/
```

A first comparison read 177 against 176 and looked like drift. It was not: the extra fact was
`realtime.subscription.tr_check_filters`, a Supabase platform trigger, because the query excluded
`storage%` but not `realtime%`. **A fingerprint over a whole database compares the platform too.**

The data came back byte-for-byte, and the restored database *worked* — a write afterwards produced
audit row 223, continuing from the restored maximum instead of colliding. Two steps a naive restore
gets wrong, and one thing it cannot do at all, are in [Backups](../backups/README.md) and in traps
36 and 37.

### Phase 25 — the rest of the list

**The backup's biggest file was a sort bug.** `backup.mjs` ordered rows with
`String(a.id).localeCompare(String(b.id))` — `1, 10, 100, … 2` — so each night's audit rows landed
scattered through the file. One snapshot rewrote 6,342 lines and reported **236 deletions in a table
nothing can delete from**, which should have been the tell. Sorted numerically the nightly diff is
`5230 0`: pure append, confirmed on a real run. This corrected an earlier note in D24 that had
blamed retention volume — right symptom, wrong cause.

**Stored documents.** `backup.mjs`'s file path had never run, because the bucket was empty at every
backup ever taken. `npm run smoke` now stores a document of random bytes behind a PDF header,
compares SHA-256 after download, uploads the held copy back and compares again.

**`app_config` stopped losing edits** — the item that was actively costing data rather than risking
it. `merge_app_config(patch)` folds changes server-side, two levels deep so two toggles on one
screen merge; `configPatch()` sends only what changed. Proven by replaying the collision, and by
showing the whole-document write it replaces would have discarded one. D28.

**The read-only role.** D29 and D30, described under *The one thing to read* and in the open items
below.

**The scheduler.** `schedule.yml`, daily, reusing `buildGeneratedRows` — the same function the
Generate button calls — rather than reimplementing recurrence in `pg_cron`, which is available and
was deliberately not used because it would mean a second copy that drifts. D31.

---

## Incidents, and what they cost

Four this session. None of them are hypothetical, and each left something behind.

### A real transaction was deleted, and the audit trail got it back

A role probe's admin pass ran a delete on a real row before the guard meant to skip it — a bug in a
throwaway script, against production. The row was recovered complete from `audit_log`, `created_at`
included:

```sql
insert into public.txns
select * from jsonb_populate_record(null::public.txns,
  (select before from public.audit_log where id = 330));
```

`txns` returned to 21 rows, ₱226,000.00, fingerprint identical to its pre-incident value.

**Two things follow.** The audit trail is worth more than attribution — it is a per-row undo for
exactly the accident nobody plans for, and the recipe now lives in
[Backups](../backups/README.md). And a throwaway probe that writes to production needs the same
care as shipped code; *"it's just a test script"* is how a real row gets deleted.

### A "flake" that was not a flake

The final sweep reported `19 passed, 7 did not run` where every earlier run had been 27/27.
Re-running gave 27/27 — the exact point at which it would have been easy to call it a flake. Two
more runs reproduced it at **roughly every other run**.

A spec asserted `txnsTagged().length === 1`, which quietly depended on every spec before it having
finished cleaning up. It held until `load()` gained one more request — the `is_viewer()` lookup —
and the timing shifted. The application was fine; the spec was counting a shared ledger. Trap 43.

**And the first fix was worse than the bug.** It removed the `const [row]` binding the spec's own
cleanup used two lines later, turning an intermittent failure into `ReferenceError: row is not
defined` on every run. Caught only because the failure rate went from half to all. Deterministic
failures are a gift.

### A refusal that looked like success

`merge_app_config` returned `0` and no error to a viewer. The policy blocked it, but
`row_count = 0` meant both "not allowed" and "no config row yet", and the caller treats the second
as a reason to INSERT. Caught **only because the probe asserted the refusal**; a check written as
"no error came back" would have passed while the feature was broken. Third time that shape has cost
something here. D30.

### The token, above

Phase 22. Named again here because the lesson generalises: a secret's value never goes on a command
line, and never in the name position.

---

## Open items

Rotation is **deferred by the owner** and is deliberately not listed. Do not raise it.

| # | Item | State |
|---|---|---|
| 1 | `is_viewer()` callable over RPC | **Open question.** Supabase advisor `WARN`: a `security definer` function executable by `authenticated` via `/rest/v1/rpc/is_viewer`. It takes no arguments and reveals only the caller's own role, so the exposure is small — but it is unknown whether revoking `EXECUTE` would break RLS policy evaluation, which calls it. **Not tested: it was 07:46 in Manila and a wrong answer means no account can write.** Resolve on a scratch project, or during a quiet window. If policies survive, change `db.js` to read `profiles` directly and revoke the grant |
| 2 | Leaked-password protection | **Deferred, Pro-only.** Supabase advisor `WARN`; not available on the free plan |
| 3 | Three unused indexes | **Expected.** `txns_co_idx`, `transfers_co_idx`, `transfers_status_idx`, INFO-level, on near-empty tables |
| ~~4~~ | ~~`profiles.json` not in `backups/`~~ | **Closed 2026-09-02.** A backup run captured `profiles: 4 rows`; the roster is in the snapshot. Its *restore* is still untested — see *Believed, but never proven* |
| 5 | Viewer UI affordances | Buttons still render for a viewer and refuse on click, with a persistent banner explaining why. Greying them out is a per-screen change across 6 screens and 12 modals |
| 6 | A real notification channel | The scheduler reports to the Actions job summary. Email or SMS needs a provider, addresses and an owner — a decision, not an implementation (D31) |
| 7 | Node 20 deprecation | Every workflow run annotates `actions/checkout@v4` and `actions/setup-node@v4` being forced onto Node 24. Harmless; needs a v5 release of those actions |
| 8 | `apps/api/` | Still an empty directory declaring an intent. Deleting it is also a documentation change |
| 9 | Per-wire FX rate | D22. Cross-currency totals stay indicative until a rate is stored per transfer |
| 10 | Construction tracker | **Parked** until explicitly requested (D18) |

### Closed this session

Audit trail · CI gate · `verify.yml` · the restore · stored-document coverage · `app_config`
last-write-wins · the read-only role · the scheduler · sign-up.

---

## Traps, continued

Traps 1 to 43 are in the three earlier packages and all still apply. These are new.

44. **A tag and the manifest drift silently.** Fourteen commits and four decisions shipped after
    `v0.5.0` with `package.json` still reading `0.5.0`. Nothing warns; D19 is a convention, not a
    check. Bump and tag as part of the release commit, not afterwards.
45. **`start()` must return every key `initialState` sets pessimistically.** `readOnly` defaults to
    `true`, and the never-used-workspace path omitted it, so the first person ever to open a
    workspace would have found every action refused until they reloaded. Anything defaulting to a
    safe-but-useless value has to be answered on *both* load paths.
46. **A partial patch is not a whole config.** `saveConfig`'s insert fallback ran `configOf(patch)`,
    which writes `undefined` into every key a patch omits. It now merges the patch over the
    defaults.

---

## How to verify state in a fresh session

```bash
cd /Users/itadmin/Desktop/puge/apps/web
npm test          # 43 offline assertions
npm run build     # green
npm audit         # 0
npm run e2e       # 27 specs — WRITES to the production ledger
npm run security  # 47 checks, expect 47/47 and 0 deferred
npm run smoke     # live end-to-end — WRITES, and stores a document
npm run schedule -- --dry-run   # reports, writes nothing
```

Credentials live in `apps/web/.env.local` (gitignored): `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `E2E_EMAIL`, `E2E_PASSWORD`, `SMOKE_EMAIL`, `SMOKE_PASSWORD`.
**If `npm run e2e` reports specs skipped, it ran nothing** — `E2E_REQUIRE_CREDENTIALS=1` turns that
into a failure, and `verify.yml` sets it.

Then confirm the database directly, not through the app:

```sql
-- the owner's data, unchanged
select md5(string_agg(t::text, chr(10) order by t.id)) as fingerprint,
       count(*), sum(amount)::text from public.txns t;
-- expect f95cd619e877916891cb0f6853f9e041 · 21 · 226000.00

-- everyone has a role, and nobody is accidentally a viewer
select u.email, p.role from public.profiles p join auth.users u on u.id = p.user_id order by 1;

-- no residue, no probe accounts
select 'txns' t, count(*) from public.txns where description like '%E2E-%' or description like '%probe%'
union all select 'probe users', count(*) from auth.users where email like 'sec-probe-%';

-- every migration still matches the repository
select version, md5(statements[1]) from supabase_migrations.schema_migrations order by version;
-- compare: printf '%s' "$(cat <file>)" | md5
```

Also check the Supabase project has not paused (free plan, 7 quiet days), that all four workflows
are still enabled (GitHub disables a schedule after 60 days without a commit), and re-read the
advisors — two `WARN`s are known and listed above.

**Last verified green:** 2026-09-01 23:46 UTC — 43 unit, 27 e2e ×3, 47/47 security, smoke passing,
`npm audit` clean, 594 links resolving, `AGENTS.md` byte-identical to `CLAUDE.md`, 12 migrations
MD5-verified, all four workflows last-green, production 200.

---

## Believed, but never proven

- **`profiles` is in the backup but has never been *restored*.** A run on 2026-09-02 captured all
  four rows. The restore rehearsal predates the table, so the roster's return trip is untested —
  and it is the one whose failure is quiet, because a restore that drops it leaves everybody a
  viewer rather than throwing.
- **Restoring `files/` has never been exercised end to end.** The smoke check proves the bytes
  survive a download and re-upload; nobody has restored a bucket into an empty project.
- **`audit_log` was restored as an 18-row stratified sample**, not all 222. The mechanism is one
  statement either way, but the full-volume restore is untested.
- **No viewer account exists.** The role was proven by demoting and promoting a real account; a
  fifth, permanently read-only account has never been issued.
- **The Telegraphic screen has still never been looked at by a human.** It is driven by a passing
  e2e spec; nobody has opened it.

---

## Resume prompt

One prompt, whole state. Paste it into a fresh chat as-is.

```
Read these, in this order, in /Users/itadmin/Desktop/puge:

  handoff/2026-09-02 Everything Held Back, Built.md                        (phases 21-25, current)
  handoff/2026-09-01 Telegraphic Transfers and Full-Stack Verification.md  (phases 14-23, traps 19-43)
  handoff/2026-09-01 Repository Restructure and Data Clear.md              (phases 10-13, traps 13-18)
  handoff/2026-09-01 Session Continuation Package.md                       (phases 1-9, codebase map, traps 1-12)
  docs/Decisions.md                                                        (D1-D31, what is authorised)

This is a React + Vite ERP in apps/web on Supabase Postgres, deployed to Vercel. It is
at v0.6.0 and everything once held back is built: an audit trail, a CI gate that
actually gates, a proven restore, a config merge, a read-only role and a scheduler.
Four accounts, all administrators, one shared ledger, real financial data only.

Before doing any work, verify rather than trusting this snapshot. In apps/web run
npm test, npm run build, npm audit, npm run e2e, npm run security and npm run smoke,
then run the SQL in this handoff's "How to verify state in a fresh session". The txns
fingerprint should be f95cd619e877916891cb0f6853f9e041 at 21 rows and PHP 226,000.00 —
if it differs, the owner has been working, which is normal; say so rather than
assuming damage. Note that e2e and smoke WRITE to the production ledger, and that
npm run e2e exits 0 having run nothing when credentials are missing. Also check the
Supabase project has not paused (free plan, 7 quiet days), that all four workflows are
still enabled, and re-read the Supabase advisors.

Hold these while you work:
- Self-serve sign-up is CLOSED and must stay closed. Read policies are still
  using(true), so being signed in grants the whole ledger; only writes are role-gated.
- An account with no public.profiles row is a VIEWER and can change nothing. Creating
  an account is two steps. If someone reports that nothing saves, check for the row.
- A green npm run security is not proof: it exits 0 for anything in DEFERRED in
  apps/web/security/probe.mjs. That list is empty today. Read the "n deferred" line.
- Never delete a failing security check to make a suite green. Add it to DEFERRED with
  the decision that authorises it, or fix the thing (D26).
- Assert the refusal, not the absence of an error, and read the state back afterwards.
  A blocked policy and a missing row both give row_count = 0, and that has cost this
  project three separate times.
- D23/D25: revoke ALL then grant back what is intended, then verify against
  information_schema. {"success": true} from apply_migration proves the SQL ran, not
  that it achieved anything. TRUNCATE is not restricted by RLS.
- A new table needs five things it does not inherit: revoke-then-grant, a for-select
  policy PLUS write policies predicated on not public.is_viewer(), an entry in TABLES
  in apps/web/scripts/backup.mjs, its own security-probe checks, and its own
  log_change() trigger.
- audit_log is a per-row undo, not just attribution — see backups/README.md. It saved a
  real transaction this session after a probe script deleted it.
- A throwaway script that writes to production deserves the same care as shipped code.
- Do not reimplement recurrence in SQL; buildGeneratedRows in src/logic.js is the single
  definition, shared by the Generate button and the scheduler (D31).
- Password and Vercel token rotation are DEFERRED by the owner. Do not raise them.
- Read the full Traps sections of all four handoffs before touching migrations, Vercel,
  the workflows or the suites. cleanupOrphanFiles() deletes any stored file no receipt
  row points at.

Next work, highest value first:
1. Settle whether is_viewer() still needs EXECUTE granted to authenticated for RLS
   policy evaluation. A Supabase advisor flags it as a security-definer function
   callable over RPC. Test on a scratch project or in a quiet window, NOT during Manila
   working hours: if policies do need it, revoking blocks every write. If they do not,
   change db.js to read profiles directly and revoke it. Note a scratch project costs an
   active one — the free plan allows two and both slots are held.
2. profiles is now in backups/ but its RESTORE is untested, and that failure is quiet: a
   restore that drops the roster leaves everybody a viewer instead of throwing. Fold it
   into the next restore rehearsal.
3. Then the smaller open items in this handoff's table.

Report what you verified and what drifted, confirm the state back to me in a few lines,
and wait for direction before starting.
```

---

## Suggested skills

| Skill | When |
|---|---|
| `superpowers:systematic-debugging` | Any reported failure. Every defect this session was invisible until something was run |
| `superpowers:verification-before-completion` | Before reporting anything done. A "flake" this session was a real 50% failure |
| `supabase` | Any schema, RLS, storage or auth change |
| `security-review` (project) | Anything touching grants, policies, roles, storage or headers |
| `obsidian-vault` | Before writing any note. This repository *is* the vault |

## Guideline Basis

- **PG-04** requires a continuation record naming scope, checks, limitations and unresolved evidence.
- **DOC-02** keeps observed facts, decisions, incidents and open questions separately labelled.
- **MD-02** requires descriptive, resolvable links; every link here targets an existing file.
- **DOC-03** keeps terminology and relationship labels consistent with the rest of the vault.
- **SEC-03** is why no credential appears in this note, and why the burned token is described by its failure rather than its value.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [Telegraphic Transfers and Full-Stack Verification](2026-09-01%20Telegraphic%20Transfers%20and%20Full-Stack%20Verification.md) · [Decisions](../docs/Decisions.md) · [Handoff](../docs/Handoff.md) · [Repository Evidence](../docs/Repository%20Evidence.md) · [Backups](../backups/README.md) · [Supabase Schema](../supabase/README.md) · [Audit Trail Plan](../docs/Audit%20Trail%20Plan.md) · [Continuous Integration Plan](../docs/Continuous%20Integration%20Plan.md)
