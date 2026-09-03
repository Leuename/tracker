---
title: Decisions
tags: [decisions, scope, activation-gates]
status: active
---

# Decisions

## D1 — Authored Tracker Activated

Only Markdown and AI-agent context may change in the current documentation phase. Generated exports, styles, assets, binaries, dependencies, settings, and tooling require an explicit later request.

## D2 — Generated Output Is Not Source

Do not patch `support.js`, the nested `_ds_bundle.js`, `.dc.html`, thumbnails, or any discovered export payload as a substitute for missing source. No `uploads/` directory is present in this checkout. Escalate with the missing source path and evidence.

## D3 — Commands Must Be Evidence-Based

Do not invent build, test, dev, CI, deploy, release, or rollback commands. Activate those workflows only after their checked-in configuration exists and the user authorizes that work.

## D4 — Turbo Tools Are Conditional

Turborepo requires real workspace/package tasks that benefit from dependency orchestration or caching. Turbopack requires a Next.js application. See [Turborepo and Turbopack](Turborepo%20and%20Turbopack.md).

## D5 — Knowledge Must Remain Navigable

Canonical facts belong in [Repository Evidence](Repository%20Evidence.md); decisions here; continuation state in [Handoff](Handoff.md). Leaf guidance links upward and records path evidence instead of duplicating policy. Preserve artifact filenames; use Title Case for knowledge notes and lowercase kebab-case for CSS variables.

## D6 — External Guidance Requires Traceability

[Awesome Guidelines Integration](Awesome%20Guidelines%20Integration.md) is the adoption ledger. A principle is enforceable only when its status is adopted and its activation evidence is present. Deferred or excluded guidance cannot be treated as a current repository capability.

## D7 — Supabase Is the Persistence Layer

The owner asked for Supabase on 2026-08-31, which is the explicit later request D1 requires. Project `baby` (`jusifpditdigqdjiwdaj`, `ap-southeast-1`) holds `txns`, `receipts`, `recurring`, and a per-account `app_config` jsonb row. Email sign-in gates the app; row-level security, not client code, decides what an account can read or write.

This activates a hosted database and an authentication provider as real runtime dependencies. It does not activate deployment, CI, a repository-root workspace, or an `apps/api/` backend — those remain ungated and unbuilt.

## D8 — One Shared Ledger, Equal Issued Accounts

The owner stated on 2026-08-31 that this app is used by a small fixed group with equal powers — an admin and an executive at first, a third account added the same day. That supersedes the per-account ownership D7 shipped with, which would have given each of them a separate private copy of the data and no way to see the others'.

Migration `shared_workspace_two_users` dropped `user_id` from `txns`, `receipts`, and `recurring`, and made `app_config` a single shared row. There is now one dataset. Every policy reads `for all to authenticated using (true) with check (true)`.

**Being signed in is therefore the whole of the authorization**, and there is no role column to grant. A new account needs nothing done to it: the moment it can sign in it can read and write everything. Creating an account *is* the access-control decision, and the only one available.

That is only safe while self-serve registration stays disabled in the project's auth settings, so no stranger can mint an account and read the ledger. The app has no sign-up form, but a form is cosmetic — the server setting is the control. Treat re-enabling sign-up as a change that requires new policies first.

A narrower role — read-only, or approve-but-not-delete — goes in the policy predicates, keyed off `raw_app_meta_data` rather than `raw_user_meta_data`, which users can edit themselves. Do not express it only in the interface: a hidden button is not an authorization boundary. The cost of the current shape rises with each account added, since every one of them can delete any row.

## D9 — Deployed to Vercel on a Public URL

The owner asked on 2026-08-31 for the app to be deployed as `tracker`. `apps/web/` became a Git repository, pushed to the private `Leuename/tracker`, linked to Vercel project `tracker` on the hobby plan. Production is `https://tracker-six-flax.vercel.app`, redeployed on every push to `main`.

The two Supabase values live in a committed `apps/web/.env.production`. That is deliberate, not an oversight: both are public by design and ship inside the browser bundle regardless, so withholding them from the repository would protect nothing. **A `service_role` or any other secret key must never join them**, there or in any `VITE_`-prefixed variable.

The URL is publicly reachable. Vercel's deployment password protection is a paid feature and this is a hobby account, so the app's own sign-in is the entire perimeter — which makes password strength, deferred by the owner and recorded in [Handoff](Handoff.md), the outstanding risk rather than a theoretical one.

## D10 — Controls Must Do What They Say

Testing on 2026-09-01 found several controls that were drawn, stored and ignored. The rule that came out of it: a setting, button or drop zone is either wired to real behaviour or it is removed. A control that lies is worse than a missing feature, because it is trusted.

Applied: the add-receipt form was built; the liquidation drop zone became a real upload into a private Supabase Storage bucket; `ackRequirePhoto` now blocks a liquidation without a file; `warnDuplicate`, `trkGroupDefault`, `dashDefaultScope` and `dashWindow` were wired.

Removed instead: `autoGen` ("on the 1st of each month") and `ackAutoNotify` ("a reminder goes out after 14 days"). Both describe work that must happen while nobody has the app open, and there is no scheduler or mail sender. They return when a scheduled backend exists — see [Handoff](Handoff.md).

`TODAY` was also unfrozen. It had been pinned to 2026-08-30 by the prototype, which meant overdue was judged against a fixed day forever and a row marked paid was stamped with a date in the past. Real dates now, built from local parts rather than UTC.

## D11 — Receipt Documents Live in a Private Bucket

Liquidation documents go to the `receipts` bucket: private, 10 MB limit, images and PDF only. Rows store the object key, never a URL; links are signed on demand and expire in an hour. Access matches the ledger — any signed-in account, nothing for `anon`.

Server-managed columns are enforced by column-level grants rather than convention. `created_at` and `app_config.updated_at` cannot be set by a client, and `id` cannot be updated. A consequence worth remembering: **an update must not send the primary key**, or the write is refused. `forUpdate()` in `apps/web/src/rows.js` is what enforces that, and `rows.test.js` pins it.

## D12 — The Ledger Holds Only Real Data

The owner cleared the demo data on 2026-09-01, and the seed was removed with it. A workspace with
no config row now opens empty rather than filling itself with 32 invented rows.

Two consequences worth keeping in mind. The config row is deliberately preserved when clearing
data: `load()` reads its absence as "never used", so deleting it is what would trigger a fresh
start, not deleting the payables. And the company and category lists survive a clear, because
emptying them would blank every dropdown in the app — they are configuration, not content.

Tests may no longer assume the ledger contains anything. A spec that needs a receipt or a rule
creates it, tagged, and the sweep removes it. This is why `e2e/db.js` grew `makeReceipt` and
`makeRecurring`.

## D13 — Backups Are a Committed Snapshot, Taken Nightly

The Supabase free plan takes backups and will not let you download them, and it pauses a project
after seven quiet days. Real payables arrived in the ledger on 2026-09-01, so there was live data
with no restore path.

`.github/workflows/backup.yml` runs `apps/web/scripts/backup.mjs` nightly and commits the result
to [backups/](../backups/README.md). Three choices inside that are deliberate.

It signs in as an **ordinary account** and reads through RLS rather than using a `service_role`
key. A backup is not worth storing a full-access credential in GitHub for; this credential can do
nothing the three people cannot already do by hand.

It keeps **one snapshot, overwritten**, because Git is already a history. `git log -p backups/`
is every state the workspace has been in.

Its manifest carries the **run timestamp**, so every night produces a real commit. GitHub disables
a scheduled workflow after 60 days without one, and a backup that stops silently is worse than no
backup at all.

Not yet proven: nobody has restored from this into an empty project. Until somebody has, it is a
backup that is believed to work.

## D14 — The Schema Is Versioned in the Repository

The five migrations existed only inside the hosted project, so losing it lost the shape of the
data as well as the data. They are now in [supabase/migrations/](../supabase/README.md), read back
out of `supabase_migrations.schema_migrations` and verified byte-for-byte by MD5.

They are a **record**, not a tested rebuild. The Supabase CLI is not installed and the folder is
not CLI-managed. A schema change applied through the dashboard must be copied here afterwards, or
the repository is back where it started.

## D15 — Company Codes and Categories Are Real, and Held A–Z

The 21 company codes and 13 expense categories are the owner's own, confirmed on 2026-09-01 — not
prototype placeholders, and not to be replaced. They are sorted alphabetically instead.

`alphabetical` in `logic.js` is applied at the two points a list enters state: the config row on
load, and the Masterlist's add buttons. Sorting on load means the stored row needed no migration.
Note that `Other` therefore sits between `Legal Services` and `Petty Cash Fund` rather than last;
a–z was the instruction.

## D16 — Receipts Can Be Deleted, and Ask First

Transactions could always be deleted; receipts could not, anywhere. They can now, from the AckRec
row.

This is the one deletion in the app that asks for confirmation. A receipt can carry cash already
released and a scanned document that exists nowhere else, and the storage object goes with the
row. The row is deleted first and the file after it: the other order risks a row pointing at a
document that is gone, which breaks its File button, where this order can at worst orphan a file
nothing references.

No schema change was needed — `authenticated` already held table `DELETE`, an `ALL` policy, and a
storage `DELETE` policy.

## D17 — `ackRequirePhoto` Stays Off

Confirmed off on 2026-09-01, on the grounds that most payables and transactions have no receipt to
attach. The control genuinely blocks liquidation without a file when it is on (D10), which is
exactly why it stays off.

## D18 — The Construction Tracker Is Parked

`construction_tracker/construction.csv` specifies a separate tracker alongside this web app, not a
part of it. Parked by the owner on 2026-09-01, to be started only on an explicit instruction. Do
not scope, design, or build any of its screens before then.

## D19 — Releases Are Hand-Cut Annotated Tags

`main` deploys to production on push and nothing else marks a version, so a release had no name
but a commit hash and a rollback had nothing to point at.

Releases are annotated tags, `vMAJOR.MINOR.PATCH`, matching `apps/web/package.json` on the same
commit. Cut by hand: there is no cadence yet, and release automation before a cadence is
scaffolding for later.

Rolling back is a `git revert` and a push, or promoting an earlier deployment from the Vercel
dashboard when speed matters — Vercel keeps every successful build. A pushed tag is never moved.
A version that means two different things is worse than an ugly version number.

`v0.2.0` is the first, covering D13 to D19.

## D20 — Four Equal Accounts, With a Read-Only Role Coming

Confirmed on 2026-09-01: all four accounts stay admin-equivalent. Every one can read, write and
delete every row, receipts included. This supersedes nothing in D8; it re-affirms it against a
larger account list and a deletion capability that did not exist when D8 was written.

**A fifth account with consumer-only privilege is planned.** The current schema cannot express it.
Every policy reads `for all to authenticated using (true) with check (true)`, so being signed in
*is* the authorization — there is no per-account distinction to hang a restriction on, and column
grants are role-wide rather than per-user.

Adding a read-only user is therefore a schema change, not a settings change. It needs a place to
record what an account is — a `profiles` table keyed on `auth.uid()`, or a JWT claim — and every
policy rewritten to consult it. Expect a migration, a matching change in
`supabase/migrations/`, and security specs that prove the read-only account is actually refused a
write rather than merely lacking a button.

Do not build it before it is asked for. Do not describe the app as having roles until it does.

## D21 — Telegraphic Transfers Are a Fourth Entity

Built on 2026-09-01 from the updated `ERP Prototype.dc.html`. `public.transfers` sits beside
`txns`, `receipts` and `recurring` under the same shared-workspace rules.

A wire is stored **in the currency it is sent in**. `amount` is in `cur`, never in pesos, so every
figure on the row itself is exact and nothing is converted on the way into the database.

The design's `+ Add transfer` was a stub that raised a toast. It is a real form now, with an edit
form on row click for the fields the sheet cannot reach — company, beneficiary, amount — matching
the Tracker, as asked. Currency, status and note stay editable in place per the design.

**Cancelled and on-hold wires stay on the sheet and drop out of the totals.** A cancelled wire is a
record, not money moving; deleting one destroys the audit trail, so the delete dialog says so and
points at Cancelled instead.

## D22 — Cross-Currency Totals Are Indicative, Not Accounting

The design totals across currencies with a fixed table — `{PHP:1, USD:58, GBP:74, EUR:63, AUD:38}`.
Kept, as `TRANSFER_RATES` in `logic.js`, with three qualifications.

Only the two strip totals convert. Every per-row figure prints in its own currency and is exact.
The screen says in plain words that the totals are a sense of scale rather than an accounting
figure. And the design's "Released this month" label was cut to "Released", because the calculation
it sits above has no month filter and the label claimed something the code did not do.

**The correct fix, when these totals start being used as figures:** store the rate on each transfer
at the time it is sent. A wire sent last quarter should be valued at last quarter's rate, not at
whatever constant this file happens to hold. That is a column and a migration, deliberately not
built before it is asked for.

## D23 — A Column Grant Cannot Carve Out of a Table Grant

`20260901092715_telegraphic_transfers` granted explicit column lists on the new table but did not
first revoke the table-wide INSERT and UPDATE that Supabase's default privileges on `public` had
already given `authenticated`. Column grants only add. The table shipped for thirty seconds with
`created_at` insertable and `id` updatable — the exact hole `lock_server_managed_columns` had
closed for the other three tables, reopened on a new one.

Caught by querying `role_column_grants` after applying, rather than trusting the migration's
`{"success": true}`. Fixed by `20260901092751_lock_transfer_server_managed_columns`.

**Any future table repeats this or repeats the bug.** Revoke first, then grant columns, then verify
against `information_schema.role_column_grants` — the verification is the part that found it.

## D24 — Attribution Lives in a Trigger, Not in the App

Built 2026-09-01: `public.audit_log`, a `security definer` trigger function `public.log_change()`,
and one `after insert or update or delete` trigger on each of the five tables.

The client talks straight to Postgres through PostgREST, with nothing in between (D7). Anything
written in `apps/web/src/` can be skipped by anyone holding the publishable key and a session, so
application-level logging would record what the app did rather than what happened to the database.
A trigger is the only place in this architecture that cannot be bypassed.

The log is **read-only to clients and append-only in practice**: `authenticated` holds `SELECT` and
nothing else, there is deliberately no policy for INSERT, UPDATE or DELETE, and only the definer
function writes. `actor_email` is resolved once at write time inside that function rather than
joined, because `auth.users` must stay unreachable from a client and the security probe asserts it.

**This is attribution, not authorization.** All four accounts keep full delete rights by decision
(D20). The log records who did it; it does not stop anyone.

Retention is **unbounded, on purpose**. At four people and this volume it is years from mattering,
and `pg_cron` 1.6.4 is available on the project if it ever does. The table is in `TABLES` in
`apps/web/scripts/backup.mjs`, so it is in the nightly snapshot; that snapshot therefore grows
monotonically, which is the intended cost.

**Correction, and then a correction to the correction, both 2026-09-01.** It was first recorded
here that unbounded retention would hurt the *backup* long before the table, because the log is
rewritten into version control nightly. That reasoning was right about the symptom and wrong about
the cause: the snapshot was scattering new rows through the file because `backup.mjs` sorted ids as
strings — `1, 10, 100, 101, … 2` — so one night rewrote 6,342 lines and reported 236 deletions in a
table nothing can delete from. Sorting numerically makes a night's rows a pure append with zero
deletions.

So the original judgement stands: retention is years from mattering, for the table and for the
folder. What almost turned a design decision into a real problem was a one-line bug, not the volume.

**Any table added later needs its own trigger**, exactly as D23 says it needs its own revoke. Both
are per-table obligations that a new table silently fails to inherit.

## D25 — `revoke insert, update, delete` Is Not Enough on a New Table

D23's lesson, one layer deeper. After `20260901150411_audit_log` applied cleanly,
`information_schema.role_table_grants` still listed **TRUNCATE and TRIGGER** for `authenticated`:
Supabase's default privileges on `public` grant ALL, and ALL is wider than the three verbs that had
been revoked.

TRUNCATE is the one that matters. **Row-level security does not apply to TRUNCATE**, so a surviving
grant is a grant to erase the whole audit log in one statement — precisely what the table exists to
make impossible. TRIGGER goes with it: a role that can attach its own trigger to the log can change
what lands in it.

Fixed by `20260901150458_lock_audit_log_truncate`: `revoke all`, then grant back the single
privilege intended. **`revoke all from anon, authenticated` then grant, on every new table** — the
narrower revoke leaves privileges behind, and only the catalogue query shows it.


## D26 — A Failing Check May Be Deferred, Never Deleted

`npm run security` reported 40 of 41 for a day, and the one failure was the deferred sign-up
toggle. A suite with a permanent known failure teaches everyone to read red as normal, and the day
a real failure appears nobody looks.

`DEFERRED` in `apps/web/security/probe.mjs` is the answer, with three properties that matter:

- The check **still runs and still prints its real result**, tagged `DEFER` rather than `FAIL`. It
  is exempt from the tally and the exit code, not from execution.
- Every entry **names the decision that authorises it**, in the file, next to the check. An
  unexplained exemption is indistinguishable from a bug someone hid.
- A deferred check that **starts passing prints `STALE EXEMPTION`**, because an exemption that
  outlives its cause is how a suite quietly stops meaning anything. It warns rather than fails:
  closing a hole must never turn the nightly run red.

Deleting the check instead would have been the wrong move and is not authorised. The control still
has to be measured; what changed is only whether a decision the owner already made counts as a
defect.

**`DEFERRED` is empty as of 2026-09-02, and that is the healthy state.** Sign-up was closed and the
entry was deleted the same minute the check went green — the discipline is the deletion, not the
mechanism. `npm run security` now reports 41 checks, 0 failed, the first fully clean run this
project has had.

## D27 — Automatic Git Deployments Are Off in `vercel.json`, Not in the Dashboard

`apps/web/vercel.json` carries `"git": { "deploymentEnabled": { "main": false } }`. Vercel no
longer deploys a push to `main`; `.github/workflows/ci.yml` deploys with the CLI after the checks
pass, and `git.deploymentEnabled` governs Git-triggered deployments only, so the CLI path is
unaffected.

**In the repository rather than in the dashboard, deliberately.** The setting is then reviewable,
versioned, and travels with a checkout — a dashboard toggle is invisible to everyone who was not
in the room. The trade is that it takes effect only once pushed: **the push that introduces it is
itself deployed by Vercel the old way**, and that is expected rather than a failure.

`ignoreCommand` stays alongside it as a second lock, for the case where this key is ever removed.


## D28 — Config Saves Are Patches, Merged in the Database

`app_config` is one jsonb row holding four independent things — notes, companies, categories and
settings — and the client rewrote all four on every save. Two people editing *different* settings
therefore clobbered each other: whoever saved second built `data` from the config they had loaded
and silently discarded the other's change. Nobody had reported it, and it would have been
attributed to "it didn't save" rather than to a collision.

Built 2026-09-01, in two halves that only work together:

- `public.merge_app_config(patch jsonb)`, `security invoker` with a pinned `search_path`, folds a
  patch into the stored row. **Two levels deep**: a shallow `data || patch` would fix the
  notes-versus-companies case and leave the one people actually hit — two toggles on the settings
  screen — still broken, because `settings` is itself an object.
- `configPatch(prev, next)` in `apps/web/src/rows.js` computes what this tab changed since its last
  save, and `store.jsx` sends that instead of the whole config.

The merge lives in the database for the same reason the audit trail does (D7, D24): there is no
server in between, so a merge written in the app is a merge any client can skip.

**What this does not solve, deliberately.** Two people editing the *same* key still resolve
last-write-wins — both editing the company list, one loses. Fixing that needs per-item operations
rather than a document, which is a bigger change than the problem has earned. A settings key that
disappears is also not expressed in a patch; nothing removes one today.

Verified against the live project by replaying the collision: two patches from one starting config,
both changes present afterwards, and the whole-document save it replaces shown to have discarded
one. Covered by unit tests on `configPatch` and by the existing e2e config spec.


## D29 — The Read-Only Role, Built

D20 planned a consumer-only account and costed it. Built 2026-09-01 as
`20260901170544_viewer_role`.

**Roles cannot come from a grant.** Every account is the same `authenticated` role to Postgres, so
the distinction lives in the policy predicates. `public.profiles` maps a user to `admin` or
`viewer`; `public.is_viewer()` — `security definer`, `stable`, pinned `search_path` — answers for
the caller, and every write policy on the five ledger tables and on the receipts bucket now reads
`not public.is_viewer()`. Reads stay open to any signed-in account, which is what D8 always was.

**An account with no profile row is a viewer.** That is the deliberate direction to fail: an account
created in the dashboard and forgotten holds no power at all, rather than silently holding full
delete rights over real financial data. **Creating an account is two steps now**, and the second one
is the one that grants anything:

```sql
insert into public.profiles (user_id, role)
select id, 'admin' from auth.users where email = 'someone@example.com';
```

**Nobody can change their own role.** `profiles` grants `authenticated` nothing but `SELECT`, and
has no write policy, so the roster is editable only from the dashboard or as `postgres`. A role a
client can rewrite is not a role.

The app reflects this; it does not enforce it. `is_viewer()` is read at load, `viewerActions()` in
`apps/web/src/logic.js` turns every mutation into a no-op with an explanation, and a quiet
persistent banner says why. The wrapper blocks **by default** — an action not on the `VIEWER_MAY`
list is refused — so forgetting to classify a new action costs a viewer a button rather than
costing the ledger a row. A client that skipped all of it would still be refused by the policies.

Verified by demoting a real account and asserting both directions: every insert, the delete of an
existing row, the config merge, a document upload and a self-promotion all refused with `42501`,
reads all still working, then promoted back and every one of them allowed again.

## D30 — A Refusal Must Look Different From a No-Op

`merge_app_config` returned `0` and no error when a viewer called it. The policy did block the
update — nothing was written — but `row_count = 0` meant both "you are not allowed" and "there is no
config row yet", and the caller treats the second as a reason to fall through to an INSERT. A
refused save became a confusing second failure instead of a clear first one.

Fixed in `20260901170754_harden_merge_app_config` by raising `42501` explicitly. The policy is still
the enforcement; the function only makes the refusal legible.

**Found because the role probe asserted the refusal rather than assuming it.** A check written as
"no error came back" would have passed. That is the same lesson as the transfers primary-key check
on 2026-09-01, and it keeps costing the same way: assert the *outcome*, then read the state back.


## D31 — The Scheduler Runs in Actions, and Reminders Have One Channel

`autoGen` and `ackAutoNotify` were removed from the app on 2026-09-01 because nothing performed the
work they described. Something does now: `.github/workflows/schedule.yml` runs
`apps/web/scripts/schedule.mjs` daily at 22:00 UTC.

**In a workflow, not in `pg_cron`.** `pg_cron` 1.6.4 is available on the project and was the obvious
answer, but the recurrence rules already exist in `src/logic.js` as `buildGeneratedRows` — the same
function the Tracker's Generate button calls, with tests. Scheduling in Postgres would mean a second
implementation of "which payables are due this month", and the second one would drift silently. One
copy of that rule is worth more than one fewer moving part.

**Daily, not monthly.** `buildGeneratedRows` skips any payable whose company, category, period and
description already exist, so a repeat run adds nothing. Daily is therefore free, and it catches a
recurring rule added mid-month that a monthly run would leave until the next.

**Reminders report to the job summary, and that is the whole channel.** There is no email or SMS
provider on this project. Choosing one is a decision — which provider, which addresses, who is
accountable when it silently stops — and not something to invent inside an implementation. What is
built is the half that does not depend on that choice: knowing what is overdue and what is awaiting
liquidation, computed with `eff()`, the same rule the Tracker colours a row by, so the report cannot
disagree with the screen.

The job writes to the ledger, so it signs in as an administrator. A viewer would be refused and the
run would go red — the correct outcome, if a confusing way to discover a demotion.

**Turning it off is disabling the workflow.** No `autoGen` setting was reintroduced: a toggle in the
app that only a workflow reads is a second source of truth for one boolean, and the Actions tab
already shows whether it is on.


## D32 — Rolling Back a Minute Is the Audit Log, Not Point-in-Time Recovery

The owner asked on 2026-09-02 for "a migration/backup plan that can roll back a minute before".
That is point-in-time recovery, which Supabase sells as a Pro add-on; the free plan takes daily
backups that cannot be downloaded. The answer was: **"since PITR is a Pro add-on, use the
write-ahead log."**

There already was one. `public.audit_log` stores, for every change, the whole row `before`, the
whole row `after`, the timestamp and the actor — and a `pg_trigger` read on 2026-09-02 confirmed
**all six tables carry `log_change()`, `profiles` included**. Nothing that matters is unlogged. The
table had been treated as attribution and as a per-row undo (D24); it is also a complete
reconstruction of any second.

`apps/web/scripts/rewind.mjs` is that, with `scripts/rewind-plan.js` holding the pure logic and
`scripts/rewind-plan.test.js` ten offline assertions.

**Only the oldest entry per row matters.** A wire inserted, edited four times and deleted needs one
statement, not six: the `before` of its first entry after the cut *is* its state at the cut. Walking
every entry backwards reaches the same place through five pointless writes and five more chances to
get an order wrong. Measured against the live log: 202 recorded changes, 76 statements.

**It writes nothing, by construction.** There is no `--apply`. It prints the plan and emits a `.sql`
file for an operator to run as `postgres`. `authenticated` holds no INSERT on `audit_log` and only
column-list grants elsewhere, so a client-credentialed rewind would silently drop `created_at` and
the history — the same reason a restore cannot use the app's credentials (trap 37). The alternative
is a `service_role` key living somewhere permanent, which a rare operator action does not justify.
Removing the mode that could do damage is cheaper than guarding it.

**What it does not cover, and this is not a gap to close later by accident.** Stored documents are
not audited, so a deleted file does not come back; DDL is not covered; and if the project itself is
lost, `audit_log` goes with it. This is an undo. [Backups](../backups/README.md) is what survives
losing the project.

Proven end to end on a rehearsal copy: eleven changes, eleven statements, and afterwards the `txns`,
`transfers` and `app_config` fingerprints all back to their pre-damage values, with one marker row
and zero mirror rows.

## D33 — A Backup That Cannot Be Restored Is Not a Backup

Two defects found on 2026-09-02 by rehearsing a restore instead of describing one. Both had been
live for a day or more and neither announced itself.

**The snapshot was short.** `backup.mjs` read every table with a plain `select`, and PostgREST caps
a response at 1,000 rows without an error or a flag. `audit_log` crossed 1,000 that morning, and the
manifest recorded `1000` against a table holding **1,129** — 129 rows of history missing from a
backup reported as a success. The only clue was the round number, and it was read past. Reads are
paged now, counted first, and a short read **fails the run** rather than writing a smaller backup.

**The roster could not be restored at all.** `profiles.user_id` references `auth.users(id)`, and
nothing in `backups/` recorded that the accounts exist — only which of them are administrators.
Restoring into a fresh project failed with `23503`. Skipping `profiles` instead would have been
silent and worse: an account with no profile row is a viewer (D29), so the ledger returns
read-only for everybody and nothing throws.

`accounts.json` fixes it with `user_id`, `role` and `email`, and the emails are **reconstructed from
`audit_log.actor_email`**, which `log_change()` already resolves at write time. That matters: it
needs no new privilege and no `service_role` key, so D13's refusal to hand CI a full-access
credential still stands. An account that has never made an audited change has no recoverable
address; the script names it in a warning rather than shipping a roster with a quiet hole.

**Passwords are not in the backup and must never be.** Storing hashes would put credentials in
version control. Accounts are recreated with their original UUIDs and their passwords reset, which
is the right outcome for a restore anyway.

A third correction went into the procedure rather than the code. [Backups](../backups/README.md)
said skipping `setval` on `audit_log_id_seq` kills the *next* audited write. It does not: the first
write after a restore succeeds, because the sequence sits at 1 and 1 is free. The collision arrives
whenever the sequence climbs into the restored block, then hits every audited write on all six
tables at once. **A restore rehearsal that ends with "can I still write? yes" passes while broken.**
Assert the sequence, not the write.

## D34 — Revoking `EXECUTE` on `is_viewer()` Is Not Available

The Supabase advisory `authenticated_security_definer_function_executable` offers two remediations
for `public.is_viewer()`. Tested on 2026-09-02 in a throwaway schema, never against production:

| | |
|---|---|
| Write with `EXECUTE` granted | succeeds |
| Write with `EXECUTE` revoked | **`42501 permission denied for function is_viewer`** |
| Read with `EXECUTE` revoked | succeeds — the `for select using (true)` policy never calls it |
| Write with the function in a **non-exposed schema** | succeeds |

Postgres checks `EXECUTE` on a function referenced in an RLS policy against the **querying role**.
So the advisory's first suggestion would leave every account able to read the whole ledger and
unable to write a single row, on all six tables and on receipt uploads — the application looking
almost fine, which is worse than an outage.

**This closes a branch, not the item.** D29's `is_viewer()` keeps its grant for as long as the
policies call it, whatever `apps/web/src/db.js` does; changing the client to read `profiles`
directly would change nothing. Two live options remain and neither is chosen: move the function to a
`private` schema PostgREST does not expose — proven to work — or accept the advisory on the record,
on the ground that a signed-in account can already read its own `profiles` row and the RPC therefore
reveals strictly less than a grant made on purpose. See
[Open Problems and Proposals](Open%20Problems%20and%20Proposals.md).

## D35 — A Rehearsal Project Gets Real Data Only Behind a Closed Door

`tracker-rehearsal` (`bucmcnsjkuprpojhequy`) was created on 2026-09-02 for restore work, after the
owner paused `zone-offices` to free a free-plan slot. It was loaded with a copy of the real ledger,
and **a new Supabase project allows self-serve sign-up by default** — verified by registering
against it successfully. Every read policy in this schema is `using (true)`, so an account was all a
stranger would have needed. Anonymous access was correctly refused (`42501`, the migrations'
`revoke all from anon` carrying over), so the exposure required registering, but it existed.

The copied data was deleted the same session, the probe account removed and the throwaway sign-in
credential disabled; the schema was kept, so re-seeding from `backups/` is one statement.

**The rule, not the incident:** a project that will hold real rows has sign-up turned off *before*
they are loaded, or it holds no real rows. This is D8's perimeter applied to every copy of the
ledger rather than only to production, and it is now the first line of the restore procedure.

`zone-offices` is separately out of bounds. It holds a live CRM — 18 tables behind 21 of its own
migrations — and is not a scratch project. One migration of ours reached it while it was restoring,
returned `{"success": true}` and **did not land**; it was verified clean four ways afterwards and
left alone.

## D36 — The Second Daily Backup Is at 06:00 UTC

`backup.yml` ran once a day at 18:00 UTC, so the worst-case unbacked-up window was about 24 hours.
A second run was approved in principle on 2026-09-02 at **09:00 UTC**, and the arithmetic behind
that hour was wrong: 18:00 plus 09:00 gives gaps of 9 hours and **15 hours**, so the worst case
becomes 15 — better than 24, but the number quoted was 9.

**06:00 UTC** gives two even 12-hour gaps and is the hour applied. The arithmetic is in the
workflow comment so nobody "improves" it back.

Corrected by an external audit on 2026-09-03 and verified before adopting.

## D37 — An Unapplied Migration May Live in the Folder, Named as Such

`supabase/migrations/` has one invariant: every file is byte-identical to a statement that was
applied, and replaying them in version order rebuilds the schema. Two migrations written on
2026-09-03 — `private_is_viewer` and `drop_public_is_viewer` — break it, because neither has been
run anywhere.

Leaving them uncommitted risked losing them; committing them silently would let a future replay
apply them in order and **drop `public.is_viewer()` while a deployed frontend still calls the RPC**,
breaking sign-in for everyone.

So they are committed, and `supabase/README.md` gains a **Pending, written but not applied**
section that names them, says no database has run them, and spells out the ordering: apply migration
1 → deploy the `db.js` change → then migration 2. The invariant is suspended in writing rather than
broken in silence.

## D38 — The Roster Backup Carries Known Emails Forward

`backup.mjs` derives account emails from `audit_log` actor entries, because it signs in as
`authenticated` and cannot read `auth.users`. An account that has never made an audited change is
therefore named nowhere, and its email was written as `null` on **every** run — permanently, since
no future run can derive it either.

Without an email an account cannot be recreated, so the restore returns three of four and the
fourth person is locked out, silently ([D33](#d33--a-backup-that-cannot-be-restored-is-not-a-backup),
trap 49).

The script now reads the previous `accounts.json` before writing. What this run derives wins — an
address that changed must not be pinned to a stale one — and anything it cannot derive is carried
forward. **A known email is never overwritten with `null`.** The warning line reports only what is
still missing after the merge.

The fourth address, `mikmiktabs@gmail.com`, was read out of production `auth.users` on 2026-09-03
and written in directly.

## D39 — A Bulk Restore Is an Operator Job, Not an Agent's

`backups/audit_log.json` is 781 KB across 1,129 rows. An agent tool payload takes roughly 35 KB, so
restoring it means about 23 chunks; an attempt on 2026-09-03 failed at five when a session limit
ended it, leaving 250 rows loaded.

The mechanism, the fidelity and the sequence behaviour are all proven at that volume, and the
remaining question — whether a large file transfers — is a property of the **transport**, not of the
procedure. An operator restoring for real uses `psql` with the project's connection string, which an
agent does not have.

**`backups/README.md` should name `psql \copy` for `audit_log`**, and a rehearsal that stops short
of full volume for this reason is complete rather than partial, provided it says so.

## D40 — An External Agent's Report Is Input, Not State

Two consultations now have produced findings that were true when written and false hours later: a
Supabase sign-up setting reported open that was already closed, and a repository HEAD that had moved.
A third, on 2026-09-01, returned six answers of which three would have misled if followed. A fourth,
on 2026-09-02, returned nothing at all at a cost of 47,267 tokens because its code-navigation server
was unreachable and its policy forbade reading files.

The 2026-09-03 audit was genuinely valuable — six material corrections, every checkable one
confirmed against the files, plus a finding nobody was looking for (the storage listing carrying the
same 1,000-row ceiling that truncated `audit_log`).

**The rule:** treat an external report as a hypothesis set. Verify each claim against the repository
or the live system before acting, and specifically before "fixing" something the report says is
broken — it may already be fixed, and a confident correction to a correct state is its own defect.
Inline the evidence in the prompt; the difference between the useless consultation and the useful
ones was entirely whether the agent could read the files.

## D41 — The Session-Mutating e2e Specs Are Ordered, and That Ordering Is Load-Bearing

The e2e suite stopped typing the shared password in 25 of 27 specs on 2026-09-03: a setup project
signs in once with tracing disabled and saves `storageState`. Two things make that state fragile,
and both were found while building it:

- A forced token refresh **rotates** the refresh token, so the saved snapshot goes stale. The
  expired-token spec forces one deliberately. It gets its own session.
- `supabase.auth.signOut()` defaults to `scope: 'global'`, so the sign-out spec revokes **every**
  refresh token the account holds — isolation included. Only ordering defends against that.

The refresh spec therefore runs **before** the sign-out spec. Declaration order plus
`fullyParallel: false` makes that a guarantee rather than an accident. `functional.spec.js` runs
after the revocation and survives on an access token minted minutes earlier; it would break if a run
exceeded the token's hour or a new spec forced a refresh.

Do not reorder `app.spec.js` casually. Changing `App.jsx`'s `signOut()` to `{ scope: 'local' }`
would remove the constraint — that is a live, user-visible behaviour change and is the owner's call,
not a test-suite convenience.

## D42 — Rates Are Written by a Named Account, Not by `not is_viewer()`

Every other write policy in this schema follows one shape: `for insert/update ... with check (not
public.is_viewer())`. `fx_rates`, shipped 2026-09-03, breaks that shape on purpose — its two write
policies name one account's `uid` directly (`(select auth.uid()) = '<uuid>'::uuid`) and grant it
nothing else in the schema. `is_viewer()` was never called.

The reason: `not is_viewer()` means "any administrator," and all four administrators can already
write every other table. A rate a user can edit is not a rate, for the same reason a role a user can
edit is not a role (D29) — so admin status was deliberately made irrelevant to this one table. The
account holding that `uid` has `profiles.role = 'viewer'`, so `is_viewer()` still refuses it
everywhere else in the schema; it can write exactly two columns of one table and nothing more.

Consequence for the "five things a new table needs" rule in `supabase/README.md`: `fx_rates` is the
one documented exception. Copying its policy shape onto an ordinary table would be a bug, not a
pattern — it exists because writing here should be closed to every administrator, which is not true
anywhere else in this schema.

## D43 — The FX Job Runs Twice Daily, Landing Before ECB Publication Both Times, Deliberately

The owner asked for two runs a day, 10:00 and 16:00 Manila. The ECB publishes its one daily
reference fix at roughly 16:00 CET — 14:00 UTC, 22:00 Manila — so **both** requested times land
before that day's publication and both see the *previous* working day's fix. Raised explicitly and
confirmed by the owner rather than silently reinterpreted: `.github/workflows/fx.yml` runs at
`0 2` and `0 8` UTC exactly, and the rate shown in the app is always one working day (T+1) old.

This is a normal accounting convention, not a defect, and the second run is not a second number —
ECB publishes once — it is a **retry**: if the 02:00 UTC run fails or the Action queue is delayed,
08:00 UTC repairs it within six hours instead of leaving a stale rate for a full day. Because
`fx.mjs` writes only when a fetched value differs from what is stored (see D38's carry-forward
reasoning, same shape), a run with nothing new to report writes zero rows and fires no audit
trigger — proven in production on 2026-09-03: a same-day rerun logged
`Already stored for 2026-09-03 — nothing to write.` and left `audit_log` untouched.

## D44 — Password Rotation for the Rates Account Is Deferred, With a Standing Reminder

`admin@admin.com` / `admin` is live on production (`jusifpditdigqdjiwdaj`) as the `fx_rates`-writing
account, `uid 14f0d1af-f37a-4936-b278-e280bcb25129`, created 2026-09-03. Supabase's own sign-in
response already flags it: `"weak_password":{"message":"Password should be at least 6 characters."}`
— accepted anyway, because the dashboard's minimum is advisory, not enforced at the API layer.

The credential pair is the most commonly guessed one on the internet, and while `is_viewer()` keeps
it from writing anything but `fx_rates`, every read policy in this schema is still `using(true)` —
so this login can read the entire ledger, same as any other signed-in account. Rotating it costs
nothing structurally: same `uid`, same policies, only `FX_PASSWORD` in `.env.local` and the
`FX_PASSWORD` GitHub secret change together.

The owner deferred rotating it explicitly — "we are live and testing at the same time, we will not
change password yet" — and asked to be reminded. This joins the existing deferred-rotation list (the
project password and Vercel token, both deferred per the git-workflow rule). **Do not rotate this
password without being asked**; do raise it again once the exchange-rates work has settled.

## Guideline Basis

- **AGENT-03** ensures adapter workflows stop rather than invent authorization.
- **PG-05** defers tools and architecture until a demonstrated need and repository evidence exist; D7 met that bar by explicit request.
- **SEC-05** places the D7 and D8 trust boundary in the database, where row-level security is enforced, not in the interface.
- **MD-04** keeps decisions canonical and links leaf workflows back to them.
- **DOC-02** separates decisions here from observed facts in Repository Evidence.

implements: [Awesome Guidelines Integration](Awesome%20Guidelines%20Integration.md)

Related: [AI Agent Context](AI%20Agent%20Context.md) · [Repository Evidence](Repository%20Evidence.md) · [Guideline ledger](Awesome%20Guidelines%20Integration.md)
