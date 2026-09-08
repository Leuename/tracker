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
- The app's sign-out passes `scope: 'global'`, so the sign-out spec revokes **every** refresh token
  the account holds — isolation included. Only ordering defends against that. It was the library's
  unread default until 2026-09-04; it is now written out deliberately (D47), which changes nothing
  at runtime and everything about whether the next reader can tell it was chosen.

The refresh spec therefore runs **before** the sign-out spec. Declaration order plus
`fullyParallel: false` makes that a guarantee rather than an accident. `functional.spec.js` runs
after the revocation and survives on an access token minted minutes earlier; it would break if a run
exceeded the token's hour or a new spec forced a refresh.

Do not reorder `app.spec.js` casually. Changing the scope to `local` would remove the constraint —
that is a live, user-visible behaviour change and was put to the owner rather than taken as a
test-suite convenience. The owner chose to keep it global on 2026-09-04 (D47), so this ordering
stands and stays load-bearing.

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

**Raised again 2026-09-04, and deferred again.** The condition the owner set had been met — the
exchange-rates work was finished and stable — so the reminder was delivered with the blast radius
restated (writes `fx_rates` only; reads the entire ledger, because every read policy is
`using(true)`) and a costed rotation procedure attached. The owner chose to defer once more. D44
therefore stays active and this remains an open item, not a closed one. The procedure is written up
and ready in `docs/superpowers/plans/2026-09-04-c1-c4-c5-resolution.md`, Task 2; executing it needs
nothing but the word. Keep reminding.

## D45 — Released Wires Carry Their Historical Rate

The owner authorized a one-time backfill on 2026-09-03 for only the six released wires. They now
carry the ECB 2026-09-02 PHP-per-unit rates — EUR `72.415`, USD `62.545345`, and GBP `84.330965` —
with `rate_as_of = 2026-09-02`. The three pending wires keep `rate` and `rate_as_of` null until
release; a pending amount has not moved and must not acquire historical provenance early.

Applied as six guarded, ID-scoped authenticated updates and recorded by the database trigger as
`audit_log` ids 1475–1480. Reversal is setting those two columns back to null on the same six rows,
or generating the corresponding rewind plan. The purpose is narrow: released totals use the rate
that belonged to the wire when it became real, rather than today's rate or a prototype constant.

## D46 — Preserve the Storage-Restore Proof, Remove the Empty API Placeholder

The owner chose to retain receipt `1788471059637`, the live proof that a receipt document survives
backup and restore. Its sole user-facing identifier is `DO NOT DELETE — backup proof`; it remains
released at ₱0.00 and retains its linked stored object. The exact authenticated read and storage
download succeeded on 2026-09-04. The name is intentionally not an `E2E-` tag, so test cleanup
cannot delete the row and orphan its evidence.

`apps/api/` was confirmed empty and removed on 2026-09-04. No API implementation exists; recreate
the directory only when an implemented backend actually needs it.

## D47 — Browser Sign-Out Is Explicitly Global

`supabase.auth.signOut()` was called bare in both browser paths, so it inherited the library's
`scope: 'global'` default: signing out on one device revoked that account's session on **every**
device it was signed in on. Nobody had chosen that. It was raised as an owner decision on
2026-09-04 with both branches stated neutrally, including the cost of the alternative — under
`scope: 'local'`, a lost or stolen phone can no longer be revoked from another device and a password
reset becomes the only lever.

**The owner chose global**, and it is now written out at both call sites rather than inherited:
`apps/web/src/App.jsx:63` (the Sign out button) and `apps/web/src/store.jsx:67` (the session-expiry
handler). Runtime behaviour is unchanged — `global` is what the default already did — so this is a
legibility change, not a functional one. The point is that the next reader cannot mistake a decision
for an accident, and cannot "fix" one call site without noticing the other.

Both same-browser callers must carry the **same** scope. They are one user in one browser, and two
different scopes there would be an accidental policy rather than a considered one. The Node-script
callers in `backup.mjs`, `smoke.mjs`, `schedule.mjs` and `security/probe.mjs` are deliberately left
bare: a script that signs in, works and exits has a different lifecycle, and normalising them would
imply a shared rule that does not exist. `scripts/fx.mjs:203` already passes `local` for its own
reasons and is unaffected.

The e2e consequence is unchanged and still load-bearing: the sign-out spec revokes both saved test
sessions, so the forced-refresh spec must keep running before it (D41).

## D48 — The Scheduler Has No External Notification Channel, by Owner Decision

`npm run schedule` reports what is overdue to `GITHUB_STEP_SUMMARY` and to stdout, and nothing else.
That was a gap rather than a choice until 2026-09-04: D31 deferred the decision because picking a
provider means choosing a service and handing it an address list, which is not an implementation
detail.

A Telegram design was specified in full — one dedicated bot, one private chat, an explicit
`TELEGRAM_NOTIFICATIONS` on/off repository variable as the kill switch, and an **aggregate-only**
payload carrying the date, the overdue count and total, and the awaiting-liquidation count, with no
company, beneficiary, description, due date or per-row amount. It was costed and offered.

**The owner chose no external channel.** The GitHub Actions job summary and the workflow-failure
notification GitHub already sends are the accepted delivery paths. This closes the question rather
than deferring it again: `apps/web/scripts/schedule.mjs` stays as it is, no `TELEGRAM_*` secret or
variable exists, the repository secret count stays at thirteen, and this is not an open item.

Revisit only on a fresh request. The specification above is recorded here so that reopening it is a
decision to build something already designed, not a redesign — see
`docs/superpowers/plans/2026-09-04-c1-c4-c5-resolution.md`, Tasks 4 and 5, which remain unexecuted
on purpose.

## D49 — The Updated Prototype Is Ported to `apps/web`, With Three Named Departures

On 2026-09-05 the owner supplied an updated `ERP Prototype.dc.html` through the Claude Design
project `9996e477-0bfc-4941-a9dc-affa12f70bcf` and asked for it to be implemented against the
running app. The change set was derived by diffing it against `company_tracker/ERP Prototype.dc.html`
— the 2026-08-31 export the app was originally transcribed from — and then re-checked against the
current source, because the app had been built past that export and much of the raw diff was already
shipped.

Ported as drawn: the Tracker's Sort menu and Export menu; the Masterlist sync line; the retuned
Tracker and Masterlist grids and type sizes; a masterlist-origin dot on generated rows; inline edit
and delete on dashboard reminders; deadlines bucketed by due date and category with a `MASTERLIST`
badge and a "+N more" line; an optional rather than mandatory check number; the e-cash additional
charge; six new expense categories; and a backdrop that no longer dismisses a dialog.

Three departures, each because copying the prototype exactly would ship something worse:

1. **No PNG export.** The prototype renders one with `html2canvas` loaded from `cdn.jsdelivr.net`.
   The deployment's `script-src 'self'` blocks that outright, so the button could never work. Save
   as PDF needs no library — it writes the summary into a popup and calls `print()` — and is the
   whole Export menu. Offered as a dependency add and declined in favour of PDF only.
2. **The export summary escapes what a user typed.** The prototype interpolates the search string
   and every company and category name straight into a string it hands to `document.write`. The app
   already treats a description as text rather than markup, with an e2e spec pinning it, so the one
   screen that prints could not be the one screen that executes.
3. **Escape still closes a dialog.** The prototype removed the backdrop-click close from every
   modal, which is kept — a mis-aimed click beside a form over a live ledger should not discard it.
   Removing the keyboard path as well would leave a keyboard user with no exit but the Cancel
   button, so `Escape` stays.

## D50 — `txns.src` and `txns.fee`, and What They May Rewrite

The three prototype behaviours the schema could not express needed two nullable columns, added by
`supabase/migrations/20260904155131_masterlist_link_and_ecash_fee.sql` under explicit request. Both
were applied to `tracker-rehearsal` first and verified there before production. Neither wrote to an
existing row: all 49 read back `NULL`.

`src` is the recurring payable a generated row came from, a foreign key with **ON DELETE SET NULL**.
Removing a payable therefore unlinks its Tracker rows rather than deleting them — they are real
payables that were really due, and the database performs the unlink whether or not a client is still
running. `fee` is the e-cash charge, folded **into** `amount` so the row totals what actually left
the account, and kept separately so the sheet can still name it. `amount` is always base + fee, so
every recalculation starts from the amount with any prior fee removed, and a row that stops being
completed gives its charge back rather than keeping an inflated total nothing mentions.

Two limits are deliberate. A masterlist edit pushes down onto `co`, `cat`, `desc` and `amount` of
linked rows **that are not completed** — a completed row records what was actually paid, so a later
correction applies from the next Generate onward and never rewrites history. And `freq` and
`dueDate` never push down: they decide what future rows Generate writes, and moving the due date of
a row already on the sheet would move a real deadline nobody asked to move.

## D51 — The Three Requirements the Prototype Diff Missed

D49 was built by diffing the updated prototype against the 2026-08-31 export. On 2026-09-05 the
owner supplied the **client's own written requirements**, which the prototype was drawn from, and
three of the twelve had not been delivered. The lesson is recorded because it is the interesting
part: a design file shows what a screen looks like, not what was asked for, and the gap between
them is invisible from the file alone.

**Invoice number on the wire sheet.** Asked for twice — as a column, and again as "alphanumeric
inputs for inv no and will act as notes but for invoice. Notes should remain." It was missed
because the prototype draws a whole Telegraphic screen, the app already had one, and the entire
block was triaged as already shipped without reading down its columns. `transfers.inv` is added by
`supabase/migrations/20260904204252_transfer_invoice_number.sql`: text, NOT NULL, defaulting to the
empty string, modelled on `note` rather than on `rate` — `rate` uses null to mean "never priced",
and an invoice number has no such state. The grant is purely additive, because `transfers` holds no
table-wide INSERT or UPDATE for `authenticated`; re-listing the columns would have risked dropping
`rate` and `rate_as_of` on the way past. `note` is unchanged and keeps its own job.

**PNG export.** The requirement says "PNG/PDF"; D49 shipped PDF alone, on the reasoning that the
prototype loads `html2canvas` from a CDN that `script-src 'self'` blocks. That reasoning was sound
about the CDN and wrong about the conclusion — **bundled**, the library is same-origin and the
header is satisfied. `html2canvas ^1.4.1` is now a dependency under this explicit request, imported
dynamically so Vite emits it as a separate 199 kB chunk that only a click on Export ever fetches;
the entry bundle grew 3.3 kB.

**A space bar opened the transaction.** Reported from the live app: typing into a note on the wire
sheet opened the transfer mid-sentence. The cause is that a sheet row is deliberately operable by
keyboard — `role="button"`, `tabIndex={0}`, opening on Enter **or** Space — while every control
inside it stopped clicks from reaching the row and none stopped keystrokes. The fix is the same
guard applied to keys, on five controls in `Telegraphic.jsx` and four in `AckRec.jsx` and the pay
button in `Tracker.jsx`. **The row keeps its keyboard handler**: removing it would strand anyone not
using a mouse, which trades a typing bug for an accessibility one.

The regression test was proven by removing the fix and watching it fail with the reported symptom —
a dialog appearing — then restoring it. A guard that swallowed the keystroke would stop the dialog
and lose the space, so the spec asserts both that no dialog opened and that the typed text arrived
intact.

Also confirmed by the requirements: the backdrop-close removal in D49 is **not** a styling choice.
It answers "pag nagfill up ako ng New Tele Transfer, mapindot ko lang yung outside ng box,
nag-eexit agad."

## D52 — The Payment Dialog Is Seeded From One Place

A fresh-context adversarial review on 2026-09-05 found a money defect in the D51 work and
reproduced it end to end against production. It is recorded in full because the shape of it
generalises.

The payment dialog has **three** ways in: choosing Completed on the edit form, the "change" link
beside a recorded payment, and Mark as paid on the sheet. Each wrote the dialog's state itself.
When `payFee` was added for the e-cash charge, two of the three were updated and the third — the
inline `onClick` at `apps/web/src/modals/EditTransaction.jsx` — was not, because it did not look
like an opener; it looked like a link.

The dialog therefore opened carrying whatever the *previous* dialog had left in `payFee`:

- **After a page reload** it is `''`, so reopening a row paid by e-cash with a ₱25 charge showed an
  empty charge field and a "Recorded amount" of ₱500 rather than ₱525. Confirming wrote ₱500 and
  `fee` null — **the recorded charge silently deleted, with the wrong figure displayed while it
  happened**.
- **Mid-session** it holds another row's charge. Mark row A paid by e-cash ₱40, then open completed
  row B through "change", and the dialog offers ₱40. Confirming rewrites **row B** to base + 40. A
  charge typed for one transaction lands on a different one.

The fix is not a fourth copy of the seeding. `paySeedFor(edit, prev)` in `actions.js` is now the
only thing that opens the dialog for an edit, and it sets **every** key the dialog reads, from the
row, on every open. `openPayForEdit` wraps it for the "change" link. A fifth caller cannot
reintroduce the bug by forgetting a field, because there is no field list to forget.

**The generalisation, carried as trap 78: state seeded at more than one call site will drift, and
the drift is invisible until the two paths disagree.** The three openers had been correct for as
long as they shared a field list; adding one field to a dialog is what broke them apart.

The regression spec (`e2e/functional.spec.js`, "reopening a paid row through \"change\" keeps its
recorded charge") was proven by restoring the defective inline opener and watching it fail with the
reported symptom — the charge field reading `""` where `"25"` was expected — then restoring the fix.
The reload in that spec is load-bearing: it is what resets the leaked field to empty.

Two smaller findings from the same review, both closed:

- **`modals/Filters.jsx` still closed on a backdrop click** while every other dialog had stopped,
  leaving two dismissal contracts side by side. The prototype removes it there too. Removed, with
  an `Escape` handler added in the same change — taking the mouse route away while leaving no
  keyboard one would have replaced a stray-click problem with a trapped-drawer problem.
- **The `-- rollback:` convention in `supabase/README.md` was failed by its own first two test
  cases.** Neither new migration carries a block. They are not retrofitted, because byte-identity
  against the stored statement is the stronger rule and editing a file destroys it; the rollbacks
  are recorded in that README instead, with the cost of the gap stated plainly.

## D53 — Only the Innermost Dialog Answers Escape

A second adversarial review, run on the D52 fix, confirmed the fix and then found a worse defect
underneath it — one that predates this session and that D49 had quietly made harder to escape from.

Dialogs stack: the edit form opens the payment dialog on top of itself, rendered as siblings at
`apps/web/src/App.jsx:85` and `:88`. Both bound a `keydown` listener on `window`, and the **outer**
one won, because it mounted first. Pressing Escape therefore closed the edit form and left the
payment dialog sitting over an empty screen.

That orphan is where the money went. `confirmPay`'s edit path stages into `state.edit` and returns —
`saveEdit` is what reaches the database — so confirming a payment from a dialog whose form has gone
wrote **nothing at all**. The dialog closed. No toast, no error, no alert. The review reproduced it
against production: a ₱500 row, E-cash, a ₱100 charge, a displayed "Recorded amount ₱600", and a
database still reading `status='pending', amount=500, fee=null`.

The mechanism is worth recording because it is not obvious. React ran the outer listener first; its
`set` re-rendered synchronously enough that the inner dialog's effect cleanup **removed its own
listener during the same event dispatch**, and per the DOM specification a listener removed
mid-dispatch is skipped. `cancelPay` never ran. The two handlers could not both fire, and the one
that lost was the one that mattered.

**D49 made it worse rather than better.** Removing backdrop-close means the orphaned dialog can no
longer be dismissed by clicking beside it.

The fix is a module-level stack in `apps/web/src/ui.jsx`: every `Modal` registers on mount, and a
`Modal` answers Escape only when it is the innermost one open. Registration is a separate effect
from the listener, because `onClose` is a fresh function on every render and re-pushing per render
would corrupt the order the rule depends on. `EditTransaction` + `PayMethod` is the only stacked pair of
**`Modal`s**, so the money-path instance was the whole of it — but see D54: the Filters drawer is
also a dialog, was not a `Modal`, and had been left outside the stack.

`confirmPay` also gained a guard: if the edit path finds no form to stage into, it says so instead of
closing quietly. The stack makes that unreachable — it is there because the failure it guards is
silent, and a silent failure on a money path is the worst kind.

The same review found the **second instance of D52's trap 78**, latent rather than exploitable:
`setReceiptStatus` opened the Liquidate dialog without `liqFile`, while `openLiquidate` set it. Every
close path happens to clear it today, so no leak could be constructed — but it was one stray
`set({ liqOpen: false })` away from attaching one receipt's document to another. Both openers now
seed every key the dialog reads.

## D54 — The Charge Comes Off Where the User Can See It, and Nothing Binds Escape by Hand

A third adversarial review found a third defect, and this one was in the departure D51 §6 records —
the change made on judgement rather than copied from the prototype. The improvement was right about
the problem and wrong about where to solve it.

`saveEdit` subtracted the e-cash charge from the amount when a row left `completed`. That assumed
`amount` still contained the charge. **The user can retype Amount in between.** Reproduced against
production: a ₱500 row paid by e-cash with a ₱50 charge reads ₱550; set it back to Pending, retype
the amount as `2000`, save — and **1950** reaches the database, under a "Transaction updated" toast.
A number the screen never displayed, written to a live ledger. `state.edit.fee` was seeded at
`openRow` and never cleared when the status changed, and it is not rendered anywhere once the row
leaves `completed`, so nothing on screen could have warned anyone.

The subtraction now happens in `setEditStatus`, at the moment the charge stops being recorded, and
the Amount field updates in front of the user. `saveEdit` does no arithmetic at all: **what the form
shows is what gets written.** The amount is left byte-for-byte as typed when there is no charge to
remove, so changing status never silently reformats an entry.

This is the third instance of one family across three reviews — **state that outlives the thing it
was a component of.** Round 1: `payFee` outliving the dialog that set it. Round 2: the payment
dialog outliving the form that saves it. Round 3: `edit.fee` outliving the amount it was part of.
Carried as trap 80: **when a value is derived from another, either recompute it or clear it at the
moment the source changes — never subtract it back out later, because "later" is after the user has
edited the source.**

The same review refuted part of D53. `modals/Filters.jsx` is a dialog with its own shell, not a
`Modal`, and the `Escape` handler added to it bound `window` directly — leaving it outside the
stack and reintroducing the swallowed-Escape bug through the one door left open. Tracker rows are
`role="button" tabIndex={0}` and nothing traps focus, so a keyboard user can reach a row behind the
drawer's scrim, open the edit form on top, and the drawer then eats the form's Escape. No money is
lost — the stack means only the top `Modal` ever closes — but the claim in D53 that the payment pair
was the only stack was false.

`useEscapeToClose` is now exported from `ui.jsx` and used by both `Modal` and the Filters drawer.
**Nothing binds Escape on `window` by hand any more**, which is the rule that keeps the next dialog
from repeating this.

Two coverage gaps the review named, both now closed: no spec confirmed and saved through the status
dropdown → payment dialog → save path (the path the D53 guard sits on, and the one the defect above
rides), and no spec covered the retyped-amount case at all.

## D55 — A Sign Is Data, and Undo Does Not Outrank a Payment

A fourth adversarial review found two more, both trap 80, both reproduced against the live app.

### The fix in D54 reintroduced the symptom in D54

`setEditStatus` subtracted the charge from whatever was in the Amount field, which can be **less than
the charge, or empty**. `amountOf('') || 0` is `0`, so clearing the field on a ₱550 row carrying a
₱50 charge produced `-50` — and `amountOf` stripped the minus, so `saveEdit` stored **50**. The
screen said `-50`. D54's own contract, *what the form shows is what gets written*, was false for
every negative intermediate, and no exotic input was needed: an empty field was enough.

Nothing caught it because sign-stripping means a negative can never reach Postgres, so
`amount < fee` stayed at 0, every suite stayed green, and `saveEdit`'s `!amt` guard is truthiness,
which `50` passes.

Two changes, because there were two faults. `amountOf` now **keeps a leading minus**, so a negative
survives to be rejected instead of being laundered into a positive — and every writer that validates
an amount (`commit`, `saveEdit`, `saveRecurring`, `saveTransfer`, `saveTransferEdit`) now requires
`amt > 0` rather than `!amt`, because a negative is truthy. And `setEditStatus` only removes the
charge from an amount that still contains it: if the field has been cleared or typed below the
charge, the charge is not in there, the field is left exactly as entered, and saving is refused with
a message.

**A sign is data.** Silently discarding it is how a screen and a ledger come to disagree.

### Undo deleted a transaction that had been paid

`generatedIds` outlives the rows it names, and the Generate banner's own **"Review them"** link
navigates to the Tracker *without dismissing the banner*. So Generate → Review them → Mark as paid →
Undo was not only reachable, the interface walked the user into it — and `undoGenerate` deleted by
id with no check, taking a recorded payment with it and reporting only "Generated rows removed".
Cash leaves no `fee`, so every ledger invariant stayed clean.

`undoGenerate` now removes only rows that are still untouched, keeps anything completed, and says how
many it kept and why. This is the rule `updRec` already applied when a masterlist edit pushes down,
for the same reason: **a completed row is a record of money that moved, and a convenience does not
get to erase one.**

### On the spec that had to be rewritten

The first version of the Undo spec passed against the defect, because it read the database
immediately after clicking Undo and the delete is fire-and-forget — the row had not been deleted
*yet*. It now generates two payables, pays one, and polls until the untouched one is gone before
asserting the paid one survived. **A regression test has to be falsified against the broken code, and
this one had to be rewritten twice before it genuinely was.** Passing is not evidence; failing for
the right reason is.

## D56 — One Helper Carries the Positive-Amount Rule

A fifth pass found the defect **D55's own fix created**, which makes three fixes in a row that
introduced the next defect. The loop is the finding as much as any individual bug is.

D55 made `amountOf` sign-aware so a negative could be *rejected* instead of laundered into a
positive. That was right for the two call sites it guarded and wrong for the seven it did not.
Before the change, sign-stripping made a negative structurally impossible **everywhere**; after it,
a negative reached every writer that tested `!amt` — and `-25` is truthy.

Three were live money paths, all confirmed by running them:

- **`confirmPay`** — `amountOf(state.payFee) || 0` accepted `-25`, and the charge is *added* to the
  amount, so a negative charge **reduced the payable**.
- **`saveLiq`** — `if (!amt)` accepted `-500`, storing a negative actual and corrupting the
  difference the AckRec sheet reports.
- **`updRec`** — `amountOf(v) || 0` accepted a negative into the masterlist amount, which then
  **pushes down onto linked Tracker rows**.

`saveReceipt`, `saveReceiptEdit` (amount and actual) were the same shape.

The fix is not seven more guards. Scattered guards are what produced every defect in this loop.
`positiveAmountOf` in `logic.js` returns the number only when it is greater than zero and NaN
otherwise, and **every writer that accepts a typed amount now calls it** — so `!amt` is correct
again at all of them, and a writer added later inherits the rule instead of having to remember it.
`amountOf` stays as the parser for intermediate arithmetic, where a negative is a signal rather than
an input.

Two sites keep bespoke handling, deliberately:

- **`confirmPay`'s charge** is refused rather than clamped, with a message. Blank still means no
  charge, which is 0. Clamping a typed `-25` to `0` would put a number on screen that differs from
  the one stored — the exact fault this whole sequence keeps producing.
- **`updRec`'s amount** clamps to 0, because that field saves on every keystroke and blank already
  meant 0. The field re-renders from state, so the clamp is visible rather than silent.

**Trap 81: widening what a shared parser accepts widens it for every caller, including the ones you
did not look at.** A change that makes a value *possible* is a change to every consumer of that
value. Enumerate them before shipping it — `grep` for the function, not for the bug.

### One recorded side effect

`receipts` row `1788471059637`, the backup-storage proof, carries `amount 0.00`. The new guard means
that row can no longer be saved through the receipt edit form. It needs to exist, not to be edited,
so nothing is broken — but a future session should not read the refusal as a bug.

## D57 — Generate Deduplicates on the Payable, Not on a Description That Can Change

A sixth review round found three more, two of them money. It also found one in the *first attempt at
the third fix*, which is now the fourth time in this sequence that a fix created the next defect.

### Generate wrote duplicate ledger rows after a Masterlist description edit

`buildGeneratedRows` and `forecast` both keyed "is this already on the sheet?" on the row's
**description**. For a payable with more than one occurrence in a month the description carries a
date suffix (`'Meralco — Sep 05'`), while `updRec`'s push-down writes the payable's **bare**
description onto every linked open row. The suffix vanished, the key stopped matching, and
re-running Generate wrote a second copy of rows already on the ledger.

Reproduced: a bi-monthly ₱5,000 payable generated two rows, the description was edited on the
Masterlist, and the next Generate reported `written = 2, skipped = 0` — **₱10,000 of phantom
liability**. The Tracker's sync line said "3 due" when two of the three were already there, which
made its own docstring ("what this returns is exactly what Generate would write") false. It affects
every frequency that can produce more than one occurrence in a month: Daily, Weekly, Bi-weekly and
Bi-monthly. `co`, `cat` and `amount` push-down safely, because those move on both sides together.

Fixed by `alreadyOnSheet` in `logic.js`, which both callers now share. A row that records its parent
is matched on **`src` and the due date** — neither of which a description edit can move. Rows with
no parent, meaning hand-entered ones and everything generated before `src` existed, keep the
original key, so nothing already on the ledger stops deduplicating. **This is the first thing
`txns.src` has been load-bearing for beyond the dot on the sheet.**

### A fortnightly payable was not fortnightly

`Weekly` and `Bi-weekly` shared one branch that found the first weekday of the *month* matching the
anchor and stepped from there. Correct for a 7-day cadence; wrong for 14, because the phase reset
every month. Verified against the committed original rather than a mutation: a Bi-weekly payable
anchored Friday 2026-09-11 generated

```
2026-09-04 2026-09-18 2026-10-02 2026-10-16 2026-10-30 2026-11-06
gaps:              14         14         14         14          7
```

Two faults in one — **the date the owner actually entered is never generated**, and a 7-day gap
appears at a month boundary, so "every other Friday" silently becomes weekly for one cycle. Both
`forecast` and `buildGeneratedRows` were consistently wrong, so no suite could catch it by
comparing them.

Now stepped from the anchor date itself, in UTC, for both frequencies.

### The reminder controls were mouse-only, and the first fix kept them that way

The new Edit and Delete buttons rendered only while `noteHover` was set, and that state is written
by `onMouseEnter` alone — so they were **absent from the DOM**, not hidden. Tab went from one
reminder's checkbox straight to the next, and no touch device could reach them.

The first fix rendered them always and hid them with `visibility: hidden`. **That removes an element
from the accessibility tree and the tab order**, which is the same defect expressed in CSS. It was
caught because Playwright's `getByRole` could not find the buttons at all while a raw DOM query found
sixteen of them — the discrepancy *was* the evidence. `opacity` is the correct tool: it keeps the
element focusable and announced, and `:hover, :focus-within` reveals it.

**Trap 82: `display: none` and `visibility: hidden` remove an element from the accessibility tree
and the tab order; `opacity: 0` does not.** Hiding a control for visual tidiness is an accessibility
decision, not a styling one.

## D58 — A Default List Is Not the Owner's List, and Requirement 8 Is Not Fully Delivered

Found by the main session while checking `app_config`, a table every previous round's ledger
assertions had left out.

Client requirement 8 asked for six new expense categories. [D49](#) recorded them as delivered
because they were added to `CAT` in `apps/web/src/data.js`. **`CAT` is only the default for a
workspace that has never been opened.** `apps/web/src/db.js:149` reads
`alphabetical(cfg.categories || initialState.categories)` — when a stored list exists it wins
outright, and the default is never consulted. The owner's workspace has had a stored list since
2026-08-31.

Read live from production: the stored list holds **18** categories and already contains five of the
six — Communications, Final Pay, Repairs & Maintenance, Security Deposit and Subscription. Somebody
typed those into Settings. **`Refund` is absent**, and no transaction uses it.

So requirement 8 stands at **five of six in production, and none of it delivered by this session's
code.** The `CAT` change is correct and worth keeping — it is the right default for a fresh
workspace and for the seed data — but it does nothing for the account the client actually uses.

Adding `Refund` is a write to the shared `app_config` row using an issued account's credentials. It
was attempted through `merge_app_config`, the same RPC the app uses, so that a concurrent editor's
settings would merge rather than be clobbered — and the attempt was **refused by the permission
layer**, correctly: it is a production data write that nobody explicitly authorised. It was not
routed around. **It remains open**, and it needs one of two things:

- somebody signed in adds `Refund` under **Settings → Masterlist settings → Categories**, which
  takes a few seconds and is the intended path; or
- explicit permission for a one-off scripted write.

**Trap 84: a constant named like a default *is* only a default.** Before reporting a list, a
setting, or a threshold as delivered, read what the running system actually holds — the stored value
usually predates your change and silently outranks it.

The same shape applies to `CO` (companies) and `SETTINGS`: production holds 21 companies, matching
the constant, so nothing is outstanding there — but it matches by coincidence of history, not
because the code makes it so.

## D59 — Cancel Every Armed Write, Follow the Caller's Window, and Assert Opacity

Round 7 refuted three claims. Two are behaviour, one is a test that could not fail.

### A delete left a money write armed

`updRec` arms **two** debounced timers: `recurring:<id>` for the payable's own row, and
`push:<id>:<field>` for each pushed-down field. `removeRec` cancelled only the first. Deleting a
payable within the 500 ms window let the push-down fire afterwards — `db.patchTxns` writing an
**amount** onto live ledger rows whose payable no longer existed, immediately after the toast said
those rows had been unlinked. Two contradictory messages, one wrong number.

`cancelForRecurring(id)` now clears the row key and prefix-scans for every `push:<id>:` key.
Prefix-scanned rather than tracked in a second structure, because a second structure kept in step
with the map is the failure this exists to prevent. Falsified: with the old single cancel, the spec
observes `999999` reaching the ledger for a payable that was already deleted.

### `forecast`'s horizon ignored the caller's window

`forecast` was written for the Tracker's fixed 30-day sync line, then reused by the Dashboard, whose
window the owner sets to 7, 30 or **90** days. The horizon was hard-coded at 30, so under "Next 90
days" the Tracker-row half of the deadline list honoured the setting while the masterlist half
stopped at 30 — the exact gap the feature exists to close, still open across two thirds of the
widest window. The "+N more due dates in the next 30 days" caption was hard-coded too.

`forecast(st, today, days = 30)` now takes the horizon, the Dashboard passes `windowDays(...)`, and
the month scan widens with it (`Math.max(3, ceil(days / 28) + 1)`) — a longer horizon with a
three-month scan would have been silently empty at the far end.

This is trap 81 again, in the other direction: **a helper written for one caller acquires a second
caller whose assumptions differ.** The default preserves the original caller; the parameter serves
the new one.

### A spec that could not fail

The keyboard-reachability spec asserted `toBeVisible()`, which checks the bounding box and
`visibility` and **does not look at `opacity`**. It passed green with the `:focus-within` reveal
deleted and the button fully transparent — shipping the exact regression it existed to catch. It now
asserts `toHaveCSS('opacity', '1')`, and deleting the reveal fails it with `Expected "1", Received
"0"`.

**Trap 85: `toBeVisible()` does not consider opacity.** Assert the computed property when the
property is the point.

Also corrected from the same round: `buildGeneratedRows` and `forecast` carried docstrings still
describing the description-based dedupe key that D57 replaced, and the "weekly payable" unit test is
a **no-regression guard, not a defect-pinning test** — 7-day steps land on the same weekday under
both the old and new implementations, so only the bi-weekly test genuinely falsifies.

## D60 — The Push-Down Commits With Its Write, Not Before It

Round 8 found that D59's fix had traded one failure for a worse one.

`updRec` painted the pushed-down value onto `state.txns` **optimistically**, then queued the
database write. D59 taught `removeRec` to cancel that queued write — and cancelled only the write.
The optimistic paint stayed. So deleting a payable mid-edit now left the Tracker showing an amount
that had never been saved, with the database correct underneath it and **nothing on screen
contradicting it until a reload**.

Reproduced live: payable at ₱700, amount retyped to `999999`, Remove clicked inside the 500 ms
window. Database `700` — the cancel worked. Screen `₱999,999`. The shipped spec asserted only the
database side, so it could not see it.

The fix removes state rather than adding it. **The push-down is applied inside the debounced
callback, alongside its own database write**, so screen and ledger move together and one cancel
stops both. Nothing needs to remember a pre-push value in order to revert it — the revert is not
needed, because nothing was painted early. Linked rows now update when they are actually written,
which is half a second later and correct rather than immediate and provisional.

**Trap 87: an optimistic write and its commit must be cancellable as one thing.** Cancelling half of
a pair leaves the screen and the record disagreeing, which is worse than the failure being
cancelled — a wrong number in the database is at least discoverable by every other reader.

### The count, settled

Eight rounds have produced **fourteen findings**: thirteen code defects and one false delivery
claim. Two documents disagreed about this and round 8 was right to flag it. The tally, by decision:

| Decision | Code defects |
|---|---|
| D52, D53, D54, D56 | 1 each — 4 |
| D55 | 2 |
| D57 | 3 |
| D59 | 3 |
| D60 | 1 |
| **Total** | **13** |

Plus **D58**, a false delivery claim rather than a defect, for **14 findings**. Six of the fixes
introduced the next defect: D54→D55→D56, D57's own first attempt, D59's unfailable spec, and
D59→D60. Any document stating a different number is stale, and this table is the source.

## D61 — A Guard That Reads a Client Snapshot Is Not a Guard

The most serious defect of the sequence, found in round 9. Recorded in full because the shape of it
invalidates a rule this repository had been relying on since D50.

`updRec` refused to push a masterlist edit onto a **completed** row — the rule D50 records as "a
completed row is a record of money that moved". That guard read `state.txns`, a snapshot taken at
page load. `grep -rn "realtime\|subscribe\|channel(" src/` finds exactly one hit, the auth
listener: **there is no subscription and no re-read.** A row another session completed is therefore
still `pending` in this tab, passes the filter, and has its **amount** overwritten by the next
masterlist keystroke.

The exposure is not the 500 ms debounce. It is **however long the tab has been open**, and the app
is used daily by four administrators on one shared ledger with a scheduler writing to it nightly.
Reproduced live: a payable at ₱700, generated, then completed by a second session at ₱700 — and a
`98765` typed into the stale tab's Masterlist left the database holding a **completed** row claiming
₱98,765 was paid. `fee` is untouched by the push, so an e-cash row also loses the
`amount = base + fee` invariant D54 established.

The fix moves the condition into the statement that writes:

```js
supabase.from('txns').update(patch)
  .in('id', ids).eq('src', src).neq('status', 'completed').select('id')
```

The database evaluates it against the row's real current state rather than against whatever this tab
last read. `src` is checked too, so a row unlinked by ON DELETE SET NULL or re-parented since is left
alone. `select('id')` returns the rows actually written, and the caller paints **only those** and
reports a count that is true — which also closes the "toast over-reports" question round 8 raised.

**Trap 88: a guard that reads a client snapshot is not a guard.** In a shared-ledger app with no
realtime subscription, every client-side "never do X to a row in state Y" check is advisory. Put the
condition in the write.

### Two lesser observations, recorded rather than fixed

Neither is a defect on today's evidence; both are named so a later reader does not rediscover them
as if new.

- **`store.jsx` advances the config diff baseline before its write resolves.** A failed
  `saveConfig` toasts, but `savedConfig.current` has already moved, so the lost keys never appear in
  a later patch — it diverges until a reload rather than self-healing the way every other `save`
  does.
- **`generate` inserts a month as one batch.** If a payable exists in `state.recurring` but not in
  Postgres, the whole insert fails `23503 txns_src_fkey` while the success banner stays up and the
  Tracker shows rows the database does not have. Same fire-and-forget trade as everywhere else, but
  the blast radius is a month of rows rather than one.

### The tally, restated

Nine rounds, **fifteen findings**: fourteen code defects and one false delivery claim. Six of the
fixes introduced the next defect. The per-decision table in [D60](#) still applies, plus **D61 = 1**.

## D62 — Undo's Promise Is Kept by Postgres, Not by a Snapshot

Round 10 applied D61's lesson systematically — enumerating every client-side guard that decides
whether a write is allowed, and asking whether the database would reach the same verdict. One did
not, and it is the worst kind: a **bulk delete**.

`undoGenerate` filtered `state.txns` for rows that were not `completed`, then handed the survivors
to `db.deleteTxns`, which carried no condition at all. Its own comment claimed parity with the
fixed push-down — *"the same rule `updRec` already applies"* — and that had stopped being true the
moment D61 moved `updRec`'s rule into the statement. A row another session had paid was still
`pending` in this tab's snapshot, so Undo deleted it, payment record and all, while its toast said
paid rows had been kept.

**Deleting is worse than the mis-write D61 fixed: there is nothing left to discover afterwards.** A
wrong amount is visible to the next reader; a removed row is not.

`deleteTxns` now carries `.neq('status', 'completed').is('done', null).select('id')` and resolves to
the ids actually removed. `undoGenerate` drops exactly those from the screen and counts what was
really deleted, so the toast can no longer promise something the database did not do. When
everything has been paid it says so instead of silently removing nothing.

Round 10 checked the other client-side guards and cleared them, which is worth recording so the
question is not reopened: `confirmPay`, `saveEdit`, `saveLiq`, `saveTransferEdit`,
`setReceiptStatus`, `removeRec`, `deleteEdit`, `confirmRemoveReceipt` and `confirmRemoveTransfer`
each act on **one row the user is looking at and explicitly targeting**, so a stale snapshot loses a
last-write race rather than destroying a record the user was told would be spared. `commit`'s
duplicate warning is advisory by design. **`undoGenerate` was the only one that made a promise about
rows it would not touch, in bulk, by deleting — and could not keep it.**

### Two observations from the same round, recorded not fixed

- **A masterlist edit whose targets were all completed elsewhere now produces no toast at all.** It
  used to lie ("3 rows updated"); silence is better, but the edit that did not reach the ledger still
  says nothing.
- **Paint order is now response order, not keystroke order.** Two edits more than 500 ms apart, both
  in flight, with responses returning inverted, would leave the screen on the older value while
  Postgres holds the newer. Not reproduced; recorded because the pre-D61 synchronous paint could not
  produce it.

### The tally

Ten rounds, **seventeen findings**: fifteen code defects, one false delivery claim, and one
documentation contradiction that outranked a file anyone can open. Six of the fixes introduced the
next defect. D60's table plus D61 = 1 and D62 = 1.

## D63 — Generate's Idempotence Is Enforced by an Index, Not by a Snapshot

Round 11 applied family four to the one bulk write [D62](#) forgot to enumerate. D62 listed nine
client-side guards it had cleared; **`generate` / `db.insertTxns` was not among them** — and it is
bulk, it is unattended (the 22:00 scheduler calls the same builder), and its guard,
`alreadyOnSheet(existing, …)`, was asking `state.txns`: the page-load snapshot.

Reproduced live and swept: a snapshot taken before a second writer generated, then replayed through
the app's own `buildGeneratedRows` → `insertTxns` path. **Postgres accepted the duplicate** — two
identical payables, same company, category, period, due date and amount. `pg_constraint` showed only
the primary key and the `src` foreign key; there was no unique index of any kind. The dedupe lived
entirely in JavaScript.

The production path is not exotic. The scheduler writes the month unattended, and GitHub queues this
repository's crons 2.5–5 hours late ([D43](#), C6), so the slot is unpredictable. An administrator's
tab opened that morning holds a snapshot with none of those rows: **one click on Generate duplicates
a whole month of liability**, with no warning and a toast reporting nothing skipped.

Two changes, in that order of importance:

1. **`generate` re-reads the ledger before deciding.** One query, and it makes the dedupe a decision
   about the database rather than about a belief. `db.freshTxns()`.
2. **A partial unique index is the backstop**, `20260905094348_one_generated_row_per_due_date`:
   `on public.txns (src, due) where src is not null`. Proven on `tracker-rehearsal` before
   production by inserting a duplicate and watching `23505` refuse it, then confirming a *different*
   due date for the same parent still inserts.

**The index is deliberately narrow.** It covers generated rows only. A row carrying `src` was
produced by a machine from one payable for one due date, so a second copy is always wrong. There is
**no equivalent index for hand-entered rows**, because the duplicate warning there is advisory and
dismissible by design — "save again to add it anyway" — and two genuine payments for the same thing
in one period are a real thing a person may record. A unique index would turn a feature into an
error. Verified zero existing violations of either shape before applying.

`npm run schedule` was documented as "Idempotent" without qualification, and `scripts/schedule.mjs`
still claims idempotency "by construction" using the pre-D57 dedupe key. It was idempotent against
itself and never against a concurrent writer. Both policy files now say what enforces it.

### Two secondary findings from the same round, both fixed

- **Undo's banner was cleared before its delete resolved**, and the banner is the only way to reach
  `undoGenerate`. A failed delete therefore left the rows in the ledger and Undo **permanently
  unreachable**, because `generatedIds` had already been discarded. Recoverability had regressed as
  a side effect of moving the delete off the optimistic path in D62. The banner is now dismissed on
  success.
- **The "kept" count asserted a reason it could not know.** `spared` was computed against a stale
  snapshot, so a row another session had *deleted* was reported as "already been paid". D62's stated
  goal was a toast that cannot promise what the database did not say; it now reports that rows
  "changed in another session" without claiming how. A dead `kept` binding from the D62 rewrite was
  removed with it — nothing lints this repository, so it would have sat there.

### The tally

Eleven rounds, **twenty findings**: seventeen code defects, one false delivery claim, two
documentation contradictions. Six were introduced by the fix for the previous defect.

## D64 — A Constraint Is Only Half a Feature Until the Screen Tells the Truth About It

Round 12 attacked the unique index D63 added to production. It could not make the index refuse a
generated batch that should succeed — 8,584 combinations of frequency, month and anchor day produced
**zero** repeated due dates within one call, so `alreadyOnSheet` and the constraint agree exactly.
What it found instead is that the index constrains **every** writer, and two paths lied about it.

### A refused edit was reported as saved

The index refuses a due date that would collide with another generated row for the same payable —
and moving one is legitimate: *"we settled both on the 18th."* `saveEdit` painted the change, called
`save(db.updateTxn(next))` fire-and-forget, and flashed **"Transaction updated"** regardless. The
Tracker showed the new deadline, Postgres kept the old one, and the only evidence was a raw
Postgres string in a toast that the success message had already replaced and that expires in 2.6 s.

`saveEdit` now awaits its write and **reverts the row on failure**, naming the collision when the
code is `23505`. It is the one write in this file that is not fire-and-forget, because it is the one
that can be *refused* rather than merely fail. The refusal itself is kept: it is correct, and the
message is actionable.

### Making `generate` async opened a phantom month

D63 made `generate` await a re-read. Neither button that calls it had a busy state, so a second
click could re-read before the first insert committed, rebuild the identical `(src, due)` set with
fresh ids, and hand Postgres a batch the index refuses — **aborting the whole multi-row insert**.
The optimistic paint had already run: a full month of phantom rows on screen, under a banner that
does not expire, with `generatedIds` naming rows that never existed. Undo then deleted nothing,
cleared the banner, and reported "0 removed". Only a reload healed it.

`generate` now inserts **before** it paints, sets a `generating` flag that disables both call sites,
and reports a `23505` as *"someone generated this month first — nothing was written."* Same lesson
as D60, third time: **never paint what has not been written.**

### The stale counts

`supabase/README.md` said eighteen migrations in one place and fifteen in two others;
`docs/Repository Evidence.md` still said the folder held twelve. All corrected against the live
count of eighteen on both projects.

### On a spec of mine that passed against its own defect

The first version of the new regression spec asserted the on-screen date using `.first()` on rows
matched by the payable's **base** description. A Weekly payable generates several rows whose
descriptions differ only by a date suffix, so that locator could land on a row the spec never
edited — and it passed with the revert removed. It now targets the edited row by its own full
description and asserts both that the stored date is shown **and** that the refused one is not;
removing the revert then fails it with `Received: "…Sep 12…"`.

**Trap 89: a locator that can match more than one row is an assertion about the wrong row.** This is
the round-8 half-asserting shape reappearing in a spec written to catch a round-12 defect — the
fourth time in this session a test has needed rewriting before it could fail honestly.

### Recorded, not fixed

- `scripts/schedule.mjs` has a bare top-level `await db.insertTxns(rows)`. One `23505` now exits the
  job **1** before the overdue report, the step summary or the sign-out — the nightly run loses its
  whole purpose, not just a duplicate row. Reachable only if the script's own read misses a row, for
  which the concrete route is `read()`'s un-paged `select('*')` against PostgREST's 1,000-row cap
  (49 rows today; the same file documents that cap four lines away and does not apply it to `txns`).
- **No money constraint exists in the database.** `amount > 0`, `fee >= 0` and `actual >= 0` are
  enforced only in the browser; `pg_constraint` carries none of them on any ledger table. The
  invariants this session has been asserting after every run are defended by nothing but the client.
- `db.updateTxn` has no server-side completed-guard while `patchTxns` and `deleteTxns` do. Checked
  and deliberately left: the user picks those field values in a form and is looking at the row, so
  last-write-wins is defensible there in a way an incidental push-down never was.

## D65 — The Money Rules Now Live in the Database, and Two Reads That Could Lie Were Closed

Three items round 12 recorded as observations rather than defects. They are defects; they are fixed.

### Every money rule was enforced only in the browser

`pg_constraint` carried **no CHECK on any ledger table**. `amount > 0`, `fee >= 0` and
`actual >= 0` existed solely in `positiveAmountOf` and `confirmPay`. Twelve rounds of review asserted
`amount <= 0 → 0` after every single run, and **nothing in Postgres was defending it** — the
invariant held because the client happened to be right, which is the definition of trap 88 applied
to the whole money surface rather than to one guard.

`20260905143255_money_constraints` adds seven CHECKs across `txns`, `receipts`, `recurring` and
`transfers`. Proven on rehearsal before production: a `-5` insert is refused with `23514`, and a
`0.00` receipt is still allowed.

Two bounds are deliberately looser than the client's, chosen against the data as it is:
`receipts.amount >= 0` rather than `> 0`, because row `1788471059637` — the backup-storage proof —
legitimately carries `0.00` and must keep existing; and `recurring.amount >= 0`, because `updRec`
clamps a cleared field to 0 mid-edit by design (D56). Null stays meaningful for `fee`, `actual` and
`rate`: each check only constrains a value that is present.

### A read that silently truncated

`read()` and `freshTxns()` used a plain `.select('*')`. PostgREST caps that at **1,000 rows and
returns no error**, so the app would simply believe the ledger was smaller than it is. This file had
documented that cap for `fx_rates` four lines away and not applied it to the tables that grow.

The consequence is not a short list. `alreadyOnSheet` decides what Generate writes by comparing
against what was read, so rows past the cap become invisible and Generate duplicates them — and
since D63 the unique index turns that into a `23505` that aborts the whole batch. At roughly 30
generated rows a month the cap is about two and a half years out, and what it produces is a nightly
job that stops working.

`readAll()` pages with `count: 'exact'` and stops when it holds as many rows as the server says
exist, so a short page is **detected** rather than assumed to be the end.

### A scheduler that died whole over a row that was already correct

`scripts/schedule.mjs` had a bare top-level `await db.insertTxns(rows)`. One `23505` — exactly what
a concurrent writer produces — exited the process before the overdue report, the job summary and the
sign-out. **The 22:00 run lost its entire purpose over a row the ledger already held correctly.**

Generation is now wrapped: `23505` is reported as the benign outcome it is, the exit code stays 0,
and the run continues to the report it exists to produce. Any other error still fails loudly,
because an unexplained write failure is not benign.

### The tally

Twelve rounds, **twenty-six findings**: twenty-two code defects, one false delivery claim, three
documentation contradictions. Eight were introduced by the fix for the previous defect.

## D66 — Zero Means "Not Decided" on a Payable and Is Never a Row

Round 13 attacked the CHECK constraints D65 had just put on a live money table, and found that
**two of them disagreed with each other** — a disagreement D65's own header had written down without
noticing.

`recurring.amount >= 0` permits zero, deliberately: `updRec` clamps a cleared Amount field to 0 so
the field stays editable mid-keystroke. `txns.amount > 0` forbids it. Nothing reconciled the two, so
two ordinary actions now raised `23514`:

- **`updRec`'s push-down** carried the clamped 0 straight into `txns.amount`. Clearing a masterlist
  Amount — the documented mid-edit case — raised a raw Postgres string in a toast. Before D65 the
  same keystroke silently wrote 0 onto live ledger rows; neither is right.
- **`buildGeneratedRows` emitted a 0-amount row**, so a single unpriced payable would make Postgres
  refuse the whole month — in the browser, and in the unattended 22:00 job, where `schedule.mjs`
  rethrows anything that is not 23505. That is verbatim the failure D65's try/catch was added to
  prevent, re-achievable through the constraint added in the same decision. **Ninth fix-induced
  defect.**

The rule, stated once and applied in both places: **0 is a legal state for a *payable*, meaning "no
amount decided yet", and is never a legal state for a *row on the ledger*.** So a non-positive
amount does not push down, and a non-positive payable generates nothing — Generate says which
payables need an amount instead of failing opaquely.

Three more from the same round:

- **A negative `transfers.rate` had no form validation**, so `23514` arrived through fire-and-forget
  `save()` and the sheet kept showing a rate Postgres had refused — the divergence `saveEdit` was
  given a revert for in D64, on the sibling path. Both transfer forms now refuse it.
- **`readAll` used offset paging.** Verified stable today, but a row inserted between two pages
  shifts everything after it: one row returns twice, another is never seen, **and the exact count
  still matches**, so the loop believes it is complete. The missing row is precisely what the pager
  exists to prevent. Now keyset — `.gt`/`.lt` on the last id read — which names a position rather
  than a distance.
- **The `generating` flag was claimed after the await it guards**, leaving a full round trip in
  which a second click passed the check with both buttons still enabled. Claimed before the await
  now.

### The tally

Thirteen rounds, **thirty-two findings**: twenty-seven code defects, one false delivery claim, four
documentation contradictions. Nine were introduced by the fix for the previous defect.

## D67 — The Zero Rule Applies to Every Reader of It

Round 14 confirmed the keyset pager correct against live data at five page sizes, and then found
**four defects, all of them consequences of D66 being applied to one caller and not its siblings.**
That is the "shared helper acquiring a caller whose assumptions differ" family, four times over,
from a single change.

- **`forecast` did not skip an unpriced payable** while `buildGeneratedRows` did, so the Tracker's
  sync line and the Dashboard counted a payable Generate would refuse to write. The comment in
  `logic.js` asserting the two "have to agree exactly" had become false in the same edit that
  wrote it.
- **`generate`'s unpriced guard scanned the whole masterlist**, not the month being generated. One
  unpriced *yearly December* payable blocked September, October and November permanently, and made
  the "every recurring payable already exists" message unreachable whenever anything anywhere
  lacked an amount.
- **`scripts/schedule.mjs` had no guard at all.** The unattended 22:00 job dropped unpriced payables
  silently and reported *"Every recurring payable already exists"* for a month in which the only
  payable had been skipped. It now names what it did not generate.
- **`updRec` stopped pushing a non-positive amount but never cancelled the push already armed.**
  Typing `7000` and then clearing the field left the payable at 0, the linked rows at 7000, and the
  toast asserting they matched — the exact shape `cancelForRecurring` documents for the delete path,
  reopened through the clear path.

**Trap 90: when you add a rule to a shared helper, find every caller and every sibling that encodes
the same rule.** D66 changed `buildGeneratedRows`; `forecast`, `generate` and `schedule.mjs` all
encoded the same idea and none of them heard about it.

Round 14 also found a spec of mine **passing for a reason that no longer generalised** — the
forecast/Generate agreement test used a fully priced fixture, so it could not see the divergence it
was written to guard. Its fixture now carries an unpriced payable, and removing the skip fails it.
That is the third spec this session to need rewriting before it could fail honestly.

Two things recorded rather than fixed: `readAll`'s cursor reads `page[last].id`, so a future caller
passing a projection without `id` would page once and stop silently (every current caller passes
`'*'`); and there is still **no test covering the pager itself**, which would need `readAll`
exported or `PAGE` injectable.

### The tally

Fourteen rounds, **thirty-seven findings**: thirty-one code defects, one false delivery claim, five
documentation contradictions. **Thirteen were introduced by the fix for the previous defect** — more
than a third.

## D68 — One Function Owns the Zero Rule, and Generate Reports Instead of Refusing

Round 15 confirmed `forecast` and `buildGeneratedRows` agree exhaustively — 4,000 randomised cases,
zero mismatches — and then found the same rule wrong in **four more places**, all of them consequences
of D67. Trap 90, one round after trap 90 was written down.

The most useful correction is that **the guard D67 added to `generate` was never necessary.**
`buildGeneratedRows` already excludes an unpriced payable, so `txns.amount > 0` could not fire. The
guard refused work it did not need to refuse — and because a Monthly payable has an occurrence in
*every* month, one unpriced row blocked Generate for **all thirteen months the menu offers**, priced
siblings included, and made "every recurring payable already exists" unreachable.

Then, from round 14's own fix:

- **The sync bar announced "In sync with the Masterlist"** while a payable sat due and unwritable.
  `forecast` skipping unpriced payables traded an over-count for a **false all-clear** on the one
  screen whose job is to say "something you expected is not here".
- **The sync bar's Generate button became a dead end** — it counted 1 writable payable, offered the
  button, and the click was refused over a payable the bar deliberately did not show. Count and
  guard used different predicates on the same screen.
- **`schedule.mjs`'s filter stayed unscoped** while `generate`'s became month-scoped, so the 22:00
  job reported an unpriced *December* payable as "skipped, not generated" during a *September* run.

`unpricedFor(recurring, monthKey)` in `logic.js` is now the single rule, asked by `generate`, the
sync bar and the scheduler. Generate **reports** rather than refuses: unpriced payables are named in
the banner and in the "nothing to do" message, and priced siblings are written normally.

### The coverage finding, which matters more than any of them

Round 15 deleted `if (!pushable) cancelPush(id, k)` from `updRec` and re-ran everything:

```
ℹ pass 114   ℹ fail 0        48 passed
```

**Three of D67's four fixes had no test at all.** They were reasoned, falsified by hand, described in
a decision record — and nothing in the suite would have noticed their removal. Only the `forecast`
fix was honestly covered. `unpricedFor` now has four unit tests, and unscoping it fails two of them.

**Trap 91: a fix you falsified by hand is not a fix the suite protects.** Hand-falsification proves
the fix works today; only a committed test proves the next person cannot delete it.

Two gaps remain open and are recorded rather than closed: `readAll` still has **no coverage at all**
(it is module-private, and testing it needs the function exported or `PAGE` injectable), and
`cancelPush` is covered only by reasoning.

### The tally

Fifteen rounds, **forty-three findings**: thirty-five code defects, one false delivery claim, seven
documentation contradictions. **Seventeen were introduced by the fix for the previous defect** — two
fifths.

## D69 — A Test That Reads the Wall Clock Reports the Calendar, Not the Code

Found on 2026-09-06 by the date changing, not by a review round. `npm test` went from 118/118 to
117/118 overnight **with no code change and no commit.**

`eff(t, today = TODAY)` takes `today` as a parameter precisely so it can be pinned. The assertion did
not pass one:

```js
assert.equal(eff({ status: 'pending', due: '2026-09-05' }), 'pending')
```

That is true on 2026-09-05 and false on 2026-09-06 — the row is overdue the moment the day turns.
The date is now pinned, and the behaviour the failure demonstrated is captured as its own case:
*a row becomes overdue by the calendar advancing, not by being written to.*

**Trap 92: a test that reads the wall clock reports the calendar, not the code.** Every function in
`logic.js` that depends on today already accepts it as a parameter — `eff`, `visibleRows`,
`forecast`, `occurrences` via its month key, `monthKeys`, `addDays`. Pass it. This one had been
green for a week and would have failed the CI gate on the first push after midnight, with a diff
that touched nothing related.

Worth noting what this says about the fifteen rounds: **no adversarial round found it.** It took a
clock. Sixteen rounds of attacking the code did not surface a defect that one day of real time did,
which is the argument for the suite being run repeatedly over time rather than only under scrutiny.

### The tally

Fifteen rounds plus the calendar, **forty-four findings**: thirty-six code defects, one false
delivery claim, seven documentation contradictions. Seventeen were introduced by the fix for the
previous defect. **Round 16 is unrun.**

## D70 — The Suite Starts From a Known State, Because a Killed Process Skips `finally`

Found on 2026-09-06 when an e2e spec failed that had passed for the whole session. The cause was not
in the code under test.

`requiring a receipt file actually blocks the liquidation` turns `ackRequirePhoto` **on** in the
shared `app_config` row and restores it in a `finally`. That is correct for a failing assertion and
useless for a **killed process** — and round 16's verifier was killed mid-run by a session rate
limit. The setting stayed on.

**This was not a test problem.** `app_config` is the owner's live configuration: with that flag on,
**nobody could liquidate a receipt without attaching a file**, a rule the owner never chose and had
no reason to look for. It sat that way until the next run happened to fail on it. The suite had been
mutating a real setting on a shared production row and relying on its own process surviving to put
it back.

`normaliseToggledSettings()` now runs in `beforeAll`: it puts the settings a spec is known to toggle
back to their documented defaults, writes **only** when one is already wrong, and logs which it
reset. An ordinary run writes nothing; a run after a crash repairs the damage before it starts, and
says so. Deliberate owner changes to anything else are untouched.

**Trap 93: cleanup in a `finally` protects against a failing assertion, not against a killed
process.** Anything a suite mutates outside its own tagged rows needs a *starting* guarantee, not
only an ending one — and on a shared production row, "the next run will fix it" means "the owner
lives with it until then".

Closed with it, both gaps round 15 named and D68 recorded as open:

- **`readAll` had no coverage at all.** Its keyset loop is now `pageAll` in `pending.js`, testable
  without a database. Six tests, including the insert-between-pages shift the loop exists to survive.
  Falsified two ways: making the cursor static fails it, and stopping only on an empty page fails
  the request-count assertion.
- **`cancelPush` was covered by reasoning only.** The debounce registry is now `createPending` in
  `pending.js`, with injectable timers. Six tests. Falsified two ways: dropping the trailing colon
  from the prefix scan fails the `push:5:` versus `push:50:` case, and making `cancelPush` a no-op
  fails the retraction case.

`npm test` reached 134 assertions across six files at this point; D72 takes it to 147 across seven.

## D71 — a cleanup restores what a setting WAS, never what it should be

Rounds 16, 17 and 18 (2026-09-06). Round 16's subagent was dispatched twice and died twice — the
session rate limit, then the weekly one — so these three rounds were run by the main session by
hand. That is weaker evidence than a fresh-context verifier and is recorded as such.

**Finding 46.** The D70 fix for trap 93 forced `ackRequirePhoto: false` at the start of every e2e
run. But `src/data.js` states that turning that setting on **is a policy decision**. An owner who
had deliberately turned it on would have had the nightly `verify.yml` run quietly turn it off — so
the fix for a killed run's residue would have silently overridden a deliberate choice. A suite
cannot distinguish residue from policy by inspecting a value.

`normaliseToggledSettings` is therefore replaced in `apps/web/e2e/db.js` by `hold(keys)`, which a
spec calls **before** changing anything and which records the current value into
`app_config.data.settings.__e2eHeld`, and `releaseHeldSettings()`, called from `beforeAll`, which
gives back exactly what was recorded and clears the marker. No marker means no write. Verified live
against production in four cases: owner-off, **owner-on**, no marker, and a setting absent from the
stored config.

**Finding 47.** Mutation testing of the twelve tests D70 added showed **three surviving mutants**:
`keyOf` could drop the table name entirely and still pass, though `transfers` and `recurring` carry
independent id sequences — so two rows sharing an id would share a debounce key and one keystroke
would cancel the other's unsaved write — and nothing pinned `DELAY`, because every test imports it.
Three tests added; `npm test` is 134.

**Finding 48.** The finding-46 fix wrote the marker with a whole-document read-modify-write, the
exact lost update `merge_app_config` exists to prevent and which `src/db.js` documents. Both marker
writes now go through the merge function.

**Finding 49.** Two silent no-op paths in the new `hold`: a missing config row threw a bare
`TypeError`, and a `merge_app_config` call that touched no row was never checked. Either leaves a
setting held with nothing recording it — trap 93 again. Both now throw with a message that says so.

All four findings were introduced by the fix for the finding before them.

## D72 — a fresh context found in one pass what self-review missed in three rounds

Round 19 (2026-09-06), the first fresh-context `verifier` subagent available after the weekly rate
limit reset. Rounds 16-18 had been run by the main session by hand and had reported the work green.
Round 19 **refuted that with six findings**, five of them inside the fixes those three rounds had
just written. This is the decision record's clearest evidence that a main-session review round is a
stopgap and never a substitute.

**Findings 50 and 51 — the live config.** A *third* spec changed `dashWindow` through the Settings
UI without calling `hold`, so a killed run left the owner's dashboard stuck on `Next 7 days`,
hiding every payable due 8-30 days out. A *fourth* added an `E2E###` code to the shared `companies`
list — and that one was unrecoverable by design, because `hold` recorded settings only, `cleanup`
never touches `app_config`, and nothing in the suite could have removed the code.

`hold` now takes **config paths**: either `settings.<key>` or a top-level section name such as
`companies`. `releaseHeldSettings` becomes `releaseHeld`, and `restoreConfig` is **deleted** — it
did a whole-document write, the lost update `merge_app_config` exists to prevent, and every one of
its call sites is now `releaseHeld()`. All four config-mutating specs hold what they change.

**Finding 52 — the money path.** `actions.js` built the push-down key `'push:' + id + ':' + k` by
hand while both cancel paths used `pending.js`'s exported `pushKey`. Changing `pushKey`'s format
left the suite entirely green with `cancelPush` and `cancelForRecurring` matching nothing —
reinstating D59 and D67 verbatim, so a payable deleted mid-edit still had its push-down fire 500ms
later onto live ledger rows. `actions.js` now imports `pushKey`, and a test fails if the literal is
rebuilt (trap 96).

**Finding 53.** Two more surviving mutants in `pending.js`: removing `timers.delete(key)` from the
fired callback, and moving it after `run()`, both left 134/134 green.

**Finding 54.** `hold` and `releaseHeld` had **zero tests** — deleting either body left the suite
green. `apps/web/e2e/held.test.js` now drives them offline against a fake client that models
`merge_app_config`'s actual SQL, through a new `useClient()` seam.

**Finding 55.** `updRec`'s `pushable` guard covered only `amount`. Clearing a payable's Description
pushed `description: ''` onto every linked open Tracker row — accepted silently, because
`txns.description` is `not null default ''` with no emptiness check — and the toast then claimed
the rows had been updated to match. The field *without* a database constraint was the dangerous
one; the guard existed only for the field whose CHECK made the omission fail loudly (trap 97).
`pushable(k, val)` is now in `src/logic.js`, guarded for every field, and tested.

`npm test` reached **147 assertions across seven files** at this point; D73 takes it to 156.

## D73 — a predicate proved right, with nothing proving the caller asked

Round 20 (2026-09-06), a fresh-context `verifier` dispatched against round 19's own six fixes. It
**refuted them**, with five findings — four inside those fixes. Two rounds in a row have now found
that the previous round's work was under-tested in the same way.

**Findings 56 and 57 — the shape worth naming.** Round 19 extracted `pushable` to `src/logic.js`
and tested it there. Round 20 deleted `&& pushable` from `updRec`'s target selection, and deleted
the `if (!pushable) cancelPush(id, k)` retraction beside it, and `npm test` stayed at **147 pass**
both times. The predicate was proved correct while nothing proved the caller consulted it — which
is exactly the hole round 19 had itself found in `pushKey`, closed there with a source-text
assertion, and left open in the sibling call site.

Testing one input to a decision is not testing the decision. `pushPlan(txns, id, k, val)` now
returns the whole thing — `column`, `retract` and `targets` — so a test pins what `updRec` does
rather than what it could do. `PUSH_DOWN` moved to `logic.js` with it.

**Finding 58 — `hold(['settings'])` wedged the marker permanently.** `'settings' in cfg` is true,
so the path validated; `releaseHeld` then assigned the held settings object over the very object
carrying `__e2eHeld: null`, restoring the marker while **returning a success list**. Every later run
would warn that it was giving back a hold that never ends. `hold` now refuses the section as a
whole, and the marker clear is merged in **last** so no top-level path can overwrite it.

**Finding 59 — a swallowed read error.** Both functions discarded `error` from their `app_config`
read, while every other reader in the file throws. A transient 5xx or an expired token made
`releaseHeld()` return `null` and the spec pass green — leaving `ackRequirePhoto` **on** in the
owner's live config with nothing reporting it. Trap 93, reached by a different road.

**Finding 60 — the whole-document write survived in a spec.** Round 19 deleted `restoreConfig`
because it wrote the entire config document; the duplicate-warning spec was still doing the same
write inline, bypassing `merge_app_config` and its viewer guard. It now goes through the RPC.

**Secondary.** The `if (!touched) throw` guards D71 added could both be deleted with the suite
green: the fake client always claimed a row written. The fake now has a failure channel —
`readError`, `writeError`, `touched: 0`, and a missing config row — and each guard has a test.

Also closed, from round 20's observations: `keyOf` was duplicated verbatim between `summaryHTML` and
the Tracker screen. The PNG export claims to summarise exactly what the screen shows, so a drift
would have been a lie nobody would notice. One exported `groupKey`, one test.

`npm test` reached **156 assertions across seven files** at this point; D74 takes it to 161.

## D74 — the sweep that could have deleted the owner's receipts

Round 21 (2026-09-06), a fresh-context `verifier` dispatched against round 20's fixes. **REFUTED**,
with three findings, **one of them destructive**. Twenty-one rounds, twenty-one that found something.

**Finding 61 — `cleanupOrphanFiles` could delete every receipt file in the owner's live bucket.**
It read `receipts` for the set of `file_path`s to keep, **discarded the read's `error`**, and fell
back to `[]`. A transient 5xx or an expired token therefore produced an empty keep-set, after which
every key enumerated from the storage bucket was classified an orphan and removed — the owner's
attachments included, and the backup-proof receipt's file with them. The `remove()` error was
discarded too, so it reported success. The `E2E-` tag rule that protects every other table protected
nothing here, because orphans were identified by **absence from a list**, not by tag.

**Finding 62 — the same read was unpaged.** A plain `.select()` truncates at 1000 rows. `src/db.js`
already routes receipts through `pageAll` precisely because the table can outgrow that cap; the
sweep did not. At 1001 receipts, every attachment past the cut becomes an "orphan" and is deleted on
the next `npm run e2e`, silently, and worse every day the ledger grows.

`cleanupOrphanFiles` is **deleted**. `cleanup()` now runs each tagged delete with `.select(...)`,
collects the `file_path` of the receipt rows it actually removed, and deletes exactly those files.
It enumerates no bucket and every read, delete and remove throws on error. Deletion by absence is
gone: the sweep can only remove a file whose row it just deleted by tag.

**Finding 63 — trap 98 was not closed.** No test imports `src/actions.js` (it pulls in `store.jsx`
and React), so two mutants at the push-down call site survived at 156/156: deleting the `cancelPush`
retraction, and rebuilding the patch as `{ [k]: val }` — where `k` is the state key `desc` and the
column is `description`, so every description push-down would have returned 400. `pushPlan(k, val)`
now returns `{column, retract, patch}` so the call site assembles nothing, and `src/pending.test.js`
pins that call site by source text, the way the `pushKey` contract already was.

**Acted on round 21's observation as well.** `pushPlan` was fed `state.txns`, a page-load snapshot,
so a linked open row another session created after this tab mounted was never written while the
toast said the rows had been updated to match. The client no longer chooses the rows: `patchTxns`
changed from `(ids, patch, src)` with `.in('id', ids)` to `(patch, src)` selecting
`.eq('src', src).neq('status','completed')` **in the write**, returning the ids it actually wrote.
Defect family 4, closed at its source rather than papered over with a fresh read.

`npm test` reached **161 assertions across seven files** at this point; D75 takes it to 164 across eight.

## D75 — the guard was moved out of the only layer that had coverage

Round 22 (2026-09-06), a fresh-context `verifier` against round 21's fixes. **REFUTED**, three
findings. Twenty-two rounds, twenty-two that found something.

**Finding 64 — a source-text pin cannot see statement order.** `pushPlan` sets `retract: !ok` and
`patch: column && ok ? … : null`, so `retract === true` implies `patch === null` — the two guards
test the same predicate. Moving `if (!plan.patch) return` above `if (plan.retract) cancelPush(id, k)`
makes the cancellation **unreachable for every field and every value**, and all four source
assertions still match. That reinstates D67: the write armed by the keystroke before a field was
cleared fires anyway, with the value the user took back. A second mutant survived the same way —
the optimistic repaint changed from `{ ...t, [k]: val }` to `{ ...t, [plan.column]: val }`, which
spreads a `description` key onto local state so `desc` never repaints while the toast claims the
rows match. Both pinned now, one by an `indexOf` **ordering** assertion, one by an expression pin.

**Finding 65 — and this is a criticism of D74's own fix.** Round 21 moved the "never rewrite a
completed row" guard from the client into the write, which was right in principle. But it moved it
**out of the only layer that had test coverage and into the one with none**: nothing imports
`src/db.js`, because it constructs the live Supabase client at module scope. Deleting *both*
`.eq('src', src)` and `.neq('status','completed')` from `patchTxns` left `npm test` green. In that
state one keystroke in a masterlist Amount field issues `PATCH /txns` **with no filter at all** —
every transaction in the shared ledger, completed rows included, set to that amount, and the toast
reporting "49 open Tracker rows updated to match".

New `src/queries.js` holds `pushDownTxns(from, patch, src)` and `deleteGeneratedTxns(from, ids)`.
They take `from` rather than reaching for the client, so `src/queries.test.js` drives them with a
recorder and asserts the exact filter chain. `db.js` supplies the real `from` and delegates. The
`deleteTxns` guards, never covered either, came along with it.

**Finding 66 — the leak D74 accepted is now written down.** If the storage remove fails, or the
process is killed between the row delete and the file remove, those files are orphaned permanently:
the rows naming them are gone. That is the deliberate trade — bucket bloat is recoverable by hand
and data loss is not — and the comment in `e2e/db.js` now says so rather than implying the sweep is
complete.

`npm test` reached **164 assertions across eight files** at this point; D76 takes it to 169.

## D76 — the restore tool could not read past a thousand rows

Round 23 (2026-09-06), a fresh-context `verifier`. **REFUTED**, five findings. Twenty-three rounds,
twenty-three that found something. Two of the five were in code no round had ever examined.

**Finding 67 — `scripts/rewind.mjs` read `audit_log` unpaged.** PostgREST caps a plain `.select()`
at 1,000 rows and reports no error. `backup.mjs` carries the scar in its own comment — `audit_log`
crossed a thousand on 2026-09-02 and the snapshot wrote exactly `1000` while the table held 1,129 —
and pages with `.range()`. `src/db.js` pages every ledger read through `pageAll`. The **restore**
tool did neither, which is where it matters most: `planRewind` keys on the first audit entry per
row, so a row whose first post-cut change fell past the cut-off produces **no step at all**. The
plan comes out short, prints a confident count, and the operator applies it believing the rewind is
complete. Measured against production: a cut at `2026-09-01T20:00:00Z` qualifies **7,419** rows; the
old code reported 1000. It now uses `pageAll` with keyset paging and reports 7419.

**Finding 68 — the round-22 recorder inspected only `select()`'s first argument.** `select('id',
{ head: true })` therefore passed every assertion while making both builders return nothing: the
push-down updates the ledger and the screen never repaints, and `undoGenerate` leaves deleted rows
on screen flashing "0 removed — N left in place, they changed in another session" about rows the
database did delete. The assertions now compare the whole call.

**Finding 69 — the `indexOf` ordering assertion was defeated by a comment.** Commenting out the real
`cancelPush` and re-inserting it below the early return kept the ordering true while the statement
became unreachable. The source is now comment-stripped before any assertion runs.

**Finding 70 — three more `updRec` mutants.** Dropping `Math.max(0, …)` put a **negative payable**
in the ledger and the totals; storing the raw input instead of the sanitised value sent a string to
a numeric column; deleting `if (!written.length) return` produced a toast reading "0 open Tracker
rows updated to match". `recValue(k, v)` and `editRecurring(row, k, v)` are now in `src/logic.js`
with tests, and `updRec` reads the pushed value back off the row it stores, so the two cannot
diverge.

**Finding 71 — the "bloat versus data loss" dichotomy D75 accepted was false.** A third ordering
leaks nothing and risks nothing: read the tagged rows' `file_path`s, remove the files, *then* delete
the rows. A kill between the last two leaves the rows in place, still tagged, and the next sweep
retries — removing an absent key is not an error. `cleanup()` does that now. `src/smoke.mjs` had the
same delete-then-remove ordering, with a comment claiming the opposite of what the code did; fixed
alongside.

`npm test` reached **169 assertions across eight files** at this point; D77 takes it to 179 across nine.

## D77 — the backup was paged the way this codebase calls broken, and the Masterlist could not take a decimal

Round 24 (2026-09-06), a fresh-context `verifier`. **REFUTED**, six findings. Twenty-four rounds,
twenty-four that found something.

**Finding 72 — a root-cause miss on D76's own fix.** Round 23 patched the *restore* tool's unpaged
read and left the *backup* tool paging by `OFFSET` with no `ORDER BY` — the method `src/pending.js`
describes in its own comment as broken: *"a row inserted between two pages shifts everything after
it: one row comes back twice, another is never seen, **and an exact count still matches**."* That
last clause is why `backup.mjs`'s exact-count assertion — the thing its comment calls "the point of
the function" — could not catch it. The owner uses the ledger while the 06:00 and 18:00 snapshots
run, and a corrupted backup is only discovered when it is needed. `readAll` now uses `pageAll` with
keyset paging and an explicit order. A real run reads 7,902 audit rows with zero duplicates.

**Finding 73 — `pageAll` hard-coded `row.id` as its cursor.** `profiles` is keyed by `user_id`, so
paging it carried `undefined` forward and the reader looped forever, growing `rows` without bound.
It now takes a `key`, and **throws** when a full page's last row cannot supply a cursor.

**Finding 74 — the source-text pins were defeated three ways.** A commented-out copy of a pinned
line; a string literal holding the same text; `if (state.readOnly)` prefixed to a pinned statement.
Each left the suite green while the push-down cancellation became unreachable, reinstating D67. A
fourth mutant — `db.updateRecurring` → `db.insertRecurring` — was never pinned at all.

The answer was not a better regex. `applyMasterlistEdit(row, k, v, fx)` now lives in
`src/masterlist.js` and takes its effects as callbacks, so `src/masterlist.test.js` drives the real
decisions with spies. **Both source-text tests were deleted**, deliberately: a pin that cannot fail
reads as coverage, and this one had been carrying the correctness of a money path for three rounds.

**Finding 75 — the recorder was blind to appended builder methods.** `.single()` makes the caller's
`written.length` undefined, so every push-down is swallowed silently; `.limit(1)` updates one linked
row instead of all of them. Both builders' entire call lists are now matched exactly.

**Finding 76 — the Masterlist Amount field could not accept a typed decimal.** It is controlled from
the stored row and the store holds a *number*: typing `1250.50` one key at a time meant `1250.`
parsed to `1250`, state did not change, React restored `"1250"`, and the remaining keystrokes
produced **125050** — a hundredfold payable, which then pushed down onto every linked Tracker row.
Pasting worked; typing did not. **Twenty-three rounds missed it.** `state.recDraft` now holds the raw
keystrokes for the cell being edited and `draftText` decides what the field shows; a new e2e spec
types the value key by key and was verified to fail when the fix is reverted.

`npm test` reached **179 assertions across nine files** at this point; D78 takes it to 183.

## D78 — moving a due date made the nightly job re-create the payable

Round 25 (2026-09-07), a fresh-context `verifier`, the last round of the session. **REFUTED**, four
findings. Twenty-five rounds, twenty-five that found something.

**Finding 78 — money, unattended, with no code change needed to trigger it.** `alreadyOnSheet`
decided a generated row covered an occurrence only when `t.due === due` — which is also the key of
the D63 unique index `txns (src, due)`. The index therefore could not catch what the index and the
client agreed to disagree about: **move a due date and the original occurrence looks missing
again.** Reschedule a generated Tracker row from the 15th to the 20th — or edit the payable's own
due date — and at 22:00 UTC `scripts/schedule.mjs` sees an uncovered occurrence, inserts a second
row, and reports `Added 1 payable(s)`. One ₱5,000 bill becomes ₱10,000 of liability. Undo cannot
help: it only knows the ids from the last click in that tab. The Dashboard's deadline list and the
Tracker sync line both showed the payable as uncovered, so a human was actively invited to do the
same thing by hand.

Coverage is now counted **per payable per period** rather than per exact date: exact matches first,
then any remaining linked row covers a remaining occurrence, because a rescheduled row is still a
row for the occurrence it came from. `uncoveredOccurrences` holds that rule once and both
`buildGeneratedRows` and `forecast` call it — the sync line promises "what Generate would write",
and D67 and D68 exist because that rule had drifted between them before.

Fixing it exposed a second defect the old code hid: `alreadyOnSheet`'s shape-match fired for any row
whose `src` belonged to a **different** payable, so two payables sharing a company, category,
description and period silently suppressed each other's generation. It is now the legacy path only —
`t.src == null`.

**Finding 79 — the `fx_rates` exception was justified by a claim its own ordering made false.** D77
kept ordered offset paging for the one table with a composite key, on the grounds that it is
append-only so no row moves beneath the cursor. But the order was `cur` then `as_of`, and `fx.mjs`
writes one row per currency per day — so each run inserts at four points spread through the
ordering, every later page shifts, and `rows.length` still equals `count` so the assertion passes on
a corrupt snapshot. Ordering by `as_of` first makes the claim true. A table added to `TABLES`
without a `KEY` entry now throws rather than falling silently into that branch.

**Finding 80 — the decimal fix was unpinned offline.** `if (fx.draft) fx.draft(v)` is
optional-guarded and the spy factory did not build `draft`, so the call was never exercised:
deleting the line left the suite green and restored the hundredfold bug, defended only by a
Playwright spec that costs a production write to run. The spies now include `draft` and two tests
assert it receives the raw text before anything is parsed.

**Finding 81 — the adapter in `src/actions.js` still holds `db.updateRecurring`,** which no offline
test imports. Rather than assert that gap away, it was measured: mutating it to `db.insertRecurring`
was run against the live suite and the decimal spec **failed**, so the adapter is covered by e2e and
not by `npm test`. That is the honest description, and it is recorded rather than closed.

`npm test` is **183 assertions across nine files**; the e2e suite is **49**.

### The tally

Twenty-five rounds, one calendar day and one killed process: **eighty-one findings** — forty-one code
— seventy-three code
defects, one false delivery claim, seven documentation contradictions. **Forty-two were introduced by
the fix for the previous defect.** **All twenty-five rounds found something; the loop has never
returned clean, and no round has ever survived the next one.**

## D79 — A Generated Liability Keeps Its Original Occurrence Identity

**Decision, 2026-09-07. Supersedes D63's `(src, due)` identity.** A generated transaction belongs
to the scheduled occurrence that created it. Editing its visible `due` or `period` changes payment
timing; it does not relinquish the original occurrence and does not authorize another liability.
The durable key is therefore `(src, occurrence_due)`. Both values are written when the row is
generated and the identity-aware application update mapper omits both. Phase 1 is additive: it
revokes authenticated UPDATE only on `occurrence_due` and deliberately preserves UPDATE(`src`) so
the deployed old bundle still works. Phase 2, only after deployment, revokes UPDATE(`src`).
Hand-entered rows remain outside this constraint, preserving their deliberately advisory duplicate
warning.

**The rollout is complete as of 2026-09-08 ([D80](#d80--the-occurrence-identity-rollout-is-applied)).**
Both migrations are applied to production, the identity-aware application is deployed, and D63's
`(src, due)` index is dropped. The steps below are kept as the record of the order that was
followed, because that order is load-bearing and any future environment must repeat it:

1. Re-run the identity/collision preflight, then rehearse and apply phase 1,
   `20260907181000_generated_occurrence_identity`. It adds the nullable column, grants INSERT but
   not UPDATE for `occurrence_due`, preserves the old bundle's UPDATE(`src`), backfills only provable
   identities, and creates the new unique index alongside D63's. It scrutinizes every **currently linked** row's `src` and `due`
   history and aborts for an explicit mapping when that history is ambiguous. Historical `src`
   transitions on rows that are now unlinked do not block: those rows require no occurrence
   identity.
2. Deploy the identity-aware application and run the new occurrence-identity e2e spec, which skips
   itself until the hosted column exists. Verify generated writes, edits and scheduling. The
   security probe must receive exact `42501` for `occurrence_due` while confirming `src` remains
   updateable.
3. Rehearse and apply phase 2,
   `20260907182000_enforce_generated_occurrence_identity`. It revokes authenticated UPDATE(`src`),
   asserts no linked row lacks identity,
   validates the one-way check `src is null or occurrence_due is not null`, and only then drops
   D63's old index. The one-way check preserves `ON DELETE SET NULL`: deleting a recurring parent
   unlinks its generated transactions without discarding their historical occurrence date.

The order is load-bearing. Deploying code before phase 1 produces PostgREST unknown-column errors.
Applying phase 2 before every writer understands the column rejects stale clients. The phase-1
preflight observed **43 historical `src` transitions and zero currently linked production rows** on
2026-09-07, hence no linked-row mapping ambiguity or collision. Those are timestamped observations,
not permission to skip the next preflight or guess an ambiguous mapping.

This also creates a rewind boundary. Once `occurrence_due` exists, a rewind plan must refuse a
linked `txns` before-image that predates the column and has no occurrence identity. Reconstruct that
state against the pre-migration schema or provide an explicit owner-approved mapping; never emit a
confident plan that silently invents which liability occurrence the row represented.

The offline acceptance surface is now **191 assertions across 11 files**. The e2e manifest has
**50 tests: two setup tests and 48 specs**; the new hosted occurrence-identity spec skips safely
before phase 1 and has not run against the column. The security probe has **57 checks** with staged
semantics selected explicitly by `OCCURRENCE_IDENTITY_PHASE`. Use `=1` before and after phase 1:
pre-phase-1 unknown column is `DEFER`, then exact `42501` is required only for `occurrence_due` and
`src` must remain allowed. That deferral exists only while phase 1 is unapplied or phase-1
compatibility is being verified. Set `=2` only after phase 2; the check is removed from `DEFERRED`,
requires exact `42501` for both, and any `src` or `occurrence_due` failure is fatal/nonzero.

## D80 — The Occurrence Identity Rollout Is Applied

**Decision and record, 2026-09-08. Completes [D79](#d79--a-generated-liability-keeps-its-original-occurrence-identity).**
Both migrations are applied to production, the identity-aware application is deployed, and the
rollout order D79 describes was followed exactly.

| Step | Evidence |
|---|---|
| Rehearsal, both phases, on `tracker-rehearsal` | Seeded the three cases production lacks — a linked row never moved, one rescheduled with its insert audit, one rescheduled with only an update audit. The backfill chose `t.due`, the insert audit's `after.due` and the update audit's `before.due` respectively: every rescheduled row kept its **original** occurrence. A second insert at an existing `(src, occurrence_due)` was refused and nothing was written. Deleting the recurring parent unlinked three rows keeping `occurrence_due`, with no constraint failure. Seed removed. |
| Production preflight | `linked_rows=0`, `rescheduled_linked=0`, `relinks=0`, `collisions=0` — so the backfill was a no-op and `audit_log` stayed at 8496. |
| Phase 1 applied | Registered as version `20260907181000`; stored statement md5 `1d164ba0be70f52f709ec3facef2b48f` matches the file byte-for-byte, which also proves the executed text was the file. |
| Deployment | CI gate green (`4e5529e` follows `9cc27af`); live bundle moved `index-DQlFRu57.js` to `index-D1mhlrBq.js`, carrying `occurrence_due` and the optional check-number label. |
| Phase 2 applied | Registered as `20260907182000`; md5 `69cf1c0b932287d1710966c65e375d2e` matches. 21 migrations applied. |
| Probe | 57 checks, 0 failed, **0 deferred**, at `=1` after phase 1 (`occurrence_due: 42501, src: UPDATE allowed`) and at `=2` after phase 2 (`occurrence_due: 42501, src: 42501`). |
| e2e | 50/50 against the deployed bundle, run once before phase 2 and again after it. |

The ledger did not move: 49 rows and PHP 2,226,438.00 throughout, with the identity fingerprint
`id:amount:status` constant at `a76686384422360d47403627c35f4f7f`. The whole-row fingerprint
changed from `f9f84adad1c9b5c4fa3e3495712ac09f` to `08a747319f890079f3e107ec258bec51` **because a
column was added, not because data changed** — the second time that has happened for that reason.
Read the whole-row value as a moving baseline and the `id:amount:status` value as a narrower one.

> **Corrected 2026-09-08 by the owner's ordinary work.** This sentence originally called
> `id:amount:status` **"the invariant"**. It is not one, and the correction matters more than the
> fingerprint does. At 19:26–19:28 Manila `aepinza@gmail.com` marked **nine payables paid** — every
> amount identical before and after, only `status` moving `pending` → `completed` — so the
> `id:amount:status` value changed from `a76686384422360d47403627c35f4f7f` to
> `0c5dee50b9f39d0e115f2c392dcf3612` while the count and the total stayed at 49 and PHP 2,226,438.00.
>
> **There is no invariant here, only baselines read fresh.** The narrow fingerprint is useful for the
> thing it was built for — asserting that a suite of *my* writes changed nothing — and it says
> nothing at all across a gap in which a person used the application. Ninth record in this loop to
> state a claim wider than the check that produced it, and the shape is identical every time: verify
> under one condition, then write the sentence without it.

**Two defects surfaced only by running the suite after phase 2, and both are recorded here because
the plan's own ordering hid them.**

1. A month locator, `/Dec 2026/`, matched both the month-picker entry and the `Generate Dec 2026`
   button. It is ambiguous only once a row exists, so only a second pass reaches it, and the
   occurrence-identity spec is the first to make one — that spec had never executed before this
   rollout, because it skipped itself until the column existed. All four month locators are now
   anchored with `^`.
2. `a refused due-date change is undone on screen` drew its refusal from D63's `(src, due)` index,
   which phase 2 drops **on purpose**. Moving a generated row onto a sibling's due date is now
   legal: the visible due is payment timing and `occurrence_due` is what keeps the two rows
   distinct occurrences. The spec asserted the rule this change exists to remove. It now pins the
   new rule instead — the move is accepted, neither identity moves, and the sheet shows the date
   the ledger holds. Honest surfacing of writes the database really does refuse stays covered by
   the two paid-row specs.

**The ordering gap is the durable lesson.** The plan runs e2e once, between the deploy and phase 2,
so nothing in the prescribed sequence exercises the application against the final grant set. Both
defects above were invisible until the suite was run a second time, after phase 2. Any future
staged grant change must re-run its acceptance suite **after the last phase**, not only between
phases; otherwise the nightly `verify.yml` is the first thing to discover the breakage, unattended.
This is trap 101 in its sharpest form: phase 2 moved a guard out of the place that tested it.

## D81 — A Filter That Fails Open Is Worse Than One That Throws

**Decision and record, 2026-09-08. Round 27.** `coverageFor` scoped coverage to the month being
generated by parsing the month back out of the period label:

```js
const i = MON.indexOf(m[1]) + 1        // monthLabel emits 'Oct'; MON holds 'OCT'
return i ? … : null                     // → null, for all twelve months
```

The caller then read `null` as *no scope*, so every linked row of a payable — from any month —
counted as coverage for whatever month was being generated. **A monthly payable was generated once,
ever.** Month two onward wrote nothing and reported "already exists": on the Generate button, in the
unattended 22:00 job, and on the Dashboard deadline list and the Tracker sync bar, which agree with
it because all four read this one function. No screen contradicted it.

This is the inverse of [finding 78](#d79--a-generated-liability-keeps-its-original-occurrence-identity)
and worse. That defect double-billed, loudly, and a unique index eventually caught it. This one
silently stopped billing, and nothing anywhere would have caught it. Live exposure was nil only
because production holds no recurring payables yet; it would have broken on the owner's first one.

**The decision: `monthKeyOf` is the named inverse of `monthLabel`, and it throws.** Returning null
was the defect — not the wrong lookup, which was merely how null got produced. A parse failure now
stops rather than guesses, because under-generating a payable is invisible while over-generating
hits a constraint. The root cause is also removed at the seam: `uncoveredOccurrences` already holds
the month key and was discarding it so that `coverageFor` could rebuild it from a string.

**Hunt for the shape, not the instance.** The dangerous property was not the case mismatch. It was a
lookup whose failure mode is *filter disabled* rather than *error*, in a function every screen
shares. `|| null`, `!x ||`, `?? []`, and a `catch` that returns empty are all this shape.

### Why nothing caught it

Every offline coverage assertion used a single month, and so did every e2e spec. Deleting the month
filter outright left all 191 tests green. The suite is now 197 and the same mutation turns **23**
assertions red; a new e2e spec generates two consecutive months against the deployed bundle.

**Three further mutations survived round 27 and are now pinned**: `buildGeneratedRows` dropping
`occurrenceDue` (which in production makes every generated row violate the new CHECK with `23514`,
aborting the batch), `fromTxn` dropping its `occurrence_due` read mapping (every linked row reads as
unresolved and generation pauses permanently), and `unresolvedFor` returning `[]` (the owner's only
signal that it has). Each left the whole suite green. Trap 98, three times in one commit.

### Also from round 27

- **`payErr` had no reader.** Its only consumer was the check-number input's `invalid` class, removed
  when that field became optional; the new E-cash input never picked it up. The flash still fired,
  so the user was told, but nothing marked the field that was wrong. Now wired, with `aria-invalid`.
- **`schedule.mjs` reported a successful generation twice** — it printed the summary itself and then
  let `classifySchedule` print it again. The classifier owns the summary now and carries the skipped
  count the hand-written line had been the only source of.
- **Two comments still named the `(src, due)` index** that phase 2 dropped.

### On the probe default

Round 27 independently found what [D80](#d80--the-occurrence-identity-rollout-is-applied) records:
`OCCURRENCE_IDENTITY_PHASE` defaulted to `1`, so a bare `npm run security` — which is how
`verify.yml` invokes it — failed against a correctly locked database. The default is now `2` and
`verify.yml` states it explicitly. Deliberately **not** auto-detected from the grants: a check that
reads the database and then asserts what it read cannot fail.

## D82 — Two Directions, Two Pins; and the Bundle Is a Publication

**Decision and record, 2026-09-08. Round 28**, which refuted round 27. Four findings, two of them
introduced by round 27's own fixes.

### A mapping has two directions and needs two pins

`toTxn` writing `occurrence_due` was pinned. `fromTxn` reading it back was not — and
[D81](#d81--a-filter-that-fails-open-is-worse-than-one-that-throws)'s commit message **claimed it
was**. Deleting the read spread left all 197 tests green while, in production, every linked row
would come back with no identity: `coverageFor` classifies them all unresolved, `uncoveredOccurrences`
returns nothing to generate, and generation is refused permanently for every payable that has a
linked row. The same silent under-generation as round 27, one file over, behind a false claim of
coverage.

**The rule: pin both directions and the round trip, in one test file, so neither can be dropped
while the other keeps the suite green.** And never state coverage in a commit message without
running the mutation that proves it — that claim has now been wrong twice.

### A test that cannot fail is worse than no test, and I wrote one while fixing that exact trap

The new two-month e2e spec contained `.not.toBeVisible().catch(() => {})`. The `catch` swallows the
rejection, so the assertion guarding the actual regression could never fail. Trap 104, introduced
by the fix for trap 104.

Replacing it was not enough, and this is the part worth keeping: **the replacement failed twice, for
two different real reasons, before it went green.** The banner from the previous generate is still on
screen, so `toBeVisible()` returns instantly against stale text; and matching only
`/added to the Tracker/` passes on that stale banner too, because both months produce the same
sentence. The assertion now waits for the banner to name **its own month**, and the repeat-generate
check reads the ledger rather than the screen, because a no-op generate raises no banner at all.

A spec that has never failed has never been tested. Make a new assertion fail on purpose before
trusting it.

### `TODAY` is not frozen

The notes said `TODAY` was frozen at `2026-08-30`, conflating it with `SEED_TODAY`.
`src/data.js:24` is `export const TODAY = localToday()`. The Generate menu is therefore a rolling
thirteen months and any hardcoded month eventually falls out of it — the spec would have failed on
an unresolvable locator months later, for a reason nobody would remember. Months now come from
`monthKeys()`.

### Ordering that lives where no test can reach it

Removing round 27's duplicated summary line left the two callers disagreeing: the dry run printed
summary-then-rows, the live 22:00 job printed rows-then-summary, so in the GitHub job summary — the
only channel this project has — the indented rows hung off whatever preceded them and their header
arrived after them. `schedule.mjs` is not in `npm test`, so the order was untestable where it lived.
`formatScheduleReport` owns it now and both callers share it. Trap 98: the round-27 pin asserted
"exactly one summary line" against the classifier in isolation, while the call site could re-add the
duplicate with the suite green.

### The browser bundle is a publication

`src/supabase.js` read `import.meta.env` as a **whole object**. Vite statically replaces named member
accesses, but a reference to the object itself inlines **every** `VITE_`-prefixed variable — and
Vercel injects its system variables with that prefix. The production bundle was therefore publishing
the private repository's owner, slug, repo and project ids, branch, commit SHAs, committer name and
GitHub login, and the **full text of the latest commit message**, to anyone who fetched the sign-in
page before authenticating. The commit messages in this repository describe defect mechanisms in
detail.

No credential was exposed — the two Supabase values are public by design and the probe's four
key-shape checks pass. This is metadata disclosure, and it is recorded at that severity.

Fixed by reading each variable by name. **Proved by canary, not by argument:** a `VITE_`-prefixed
variable exported into the build appears in the bundle before the change and is absent after, and
the live bundle now contains no `VITE_` names at all.

**Residual exposure, measured rather than assumed.** Vercel keeps older immutable deployments and
those bundles still contain the old commit text, so the first read of this was that retiring them
was an outstanding act. It is not. The project runs `ssoProtection` at
`all_except_custom_domains`, and every older deployment URL answers **302 to `vercel.com/sso-api`**;
following the redirect returns an SSO page carrying no bundle and no commit text. Only the
production alias `tracker-six-flax.vercel.app` is anonymous, and it now serves the fixed bundle.
Checked on 2026-09-08 against two of the leaky deployments.

**What does stay open** is the cause rather than the effect: the Vercel project setting that exposes
system variables to the framework prefix is still on. The code no longer reads them, which is the
durable fix and does not depend on that setting — but a future file that touches `import.meta.env`
as an object would reopen this, so the setting is worth turning off as well.

### A refused write must not advance the baseline

`store.jsx` set `savedConfig.current = next` before the write resolved. `save()` only reports a
failure; it does not undo one. So a refused config write left the baseline claiming success, the
next patch was a diff against a value the database never received, and the refused change was
dropped **permanently** while the screen kept showing it. `ackRequirePhoto` is one of these settings,
and it is the one that once stopped the owner liquidating a receipt.

It now rolls back on rejection, guarded by `savedConfig.current === next` so a later save's baseline
is not clobbered. **This has no automated coverage** — `store.jsx` is React and nothing offline
imports it. Recorded as a gap rather than described as covered.

## D83 — The Fix That Retried Forever

**Decision and record, 2026-09-08. Round 29**, which refuted round 28. Three findings; the first is
the clearest example of defect family (c) this loop has produced, and it was introduced by
[D82](#d82--two-directions-two-pins-and-the-bundle-is-a-publication)'s own fix.

### A rollback closed a feedback loop

D82 made a refused config write roll its baseline back, so the dropped change would be recomputed.
That was right in isolation and wrong in context:

1. `save` reports a failure by calling `flash`.
2. `flash` does `set({ toast })`, and `reduce` returns a **new** state object.
3. The config effect depended on `state`, so it re-ran.
4. The baseline had just been rolled back, so `configPatch` was non-null again — and the same
   refused write went out once more.

The loop was invisible before D82 only because a failure used to leave the baseline advanced: the
next run computed a null patch and stopped. **A harness driving the real `configOf`/`configPatch`
with the effect body copied verbatim measures 79 writes and 79 toasts from a single toggle in 500ms**,
against 1 and 1 after the fix. It would not stop until the network returned or the tab was closed.
A session demoted to `viewer` mid-flight reaches it too, because the client still holds
`readOnly: false` from page load while `merge_app_config` refuses every patch — the toast storm the
`readOnly` guard exists to prevent, arriving through the other door.

**The decision: the effect keys on the config's VALUE, not on `state`.** A toast does not change the
config, so it cannot trigger a write. Depending on a whole reducer state object means depending on
everything that has ever touched it.

### A guard that skipped the case it was written for

The rollback was guarded on `savedConfig.current === next` — "do not clobber a later save's
baseline". Sound as written, and it meant the rollback never fired in the one situation it existed
for: a refusal that overlaps a following edit, where the later patch carries only its own delta and
the refused change is lost for good.

It is unconditional now. `merge_app_config` merges, so re-sending a value the row already holds is a
no-op, which makes recomputing a superset patch free. Measured: the refused change reappears in the
next patch, where under the guard it did not.

**The general shape: a guard added to prevent a rare harm must be checked against the common case it
now also blocks.**

### Detail attached to the wrong line

`formatScheduleReport` appended the row detail after **all** summary lines, and a run is routinely
more than one outcome — `generated` alongside `unpriced` or `unresolved-identity`. So the generated
rows rendered underneath "have no amount and were skipped": the same misreading in the GitHub job
summary that splitting this function out was meant to fix. The rows hang off the `generated` line
now. The round-28 test could not see it because it only ever built a single-outcome report.

### What round 29 cleared

The migrations, read adversarially for the first time: column grants are exhaustive lists after
`20260831155259` revokes the table-level `insert, update`, so phase 2's `revoke update (src)` is
effective rather than the no-op a surviving table grant would have made it. `log_change` is
`security definer` with `search_path = ''`, every reference schema-qualified, `EXECUTE` revoked from
client roles; `audit_log` has a SELECT-only policy. The phase-2 CHECK and the partial unique index
are consistent, and `ON DELETE SET NULL` cannot violate the CHECK.

Also cleared: `monthKeys().slice(6, 8)` is always two consecutive months inside the rolling menu,
including across a year boundary; the `supabase.js` canary holds in both directions; and every path
through `schedule.mjs` prints exactly the rows it wrote.

**Still uncovered, and stated rather than glossed:** the retry loop and the rollback have no
automated test. `store.jsx` is React and nothing offline imports it. Both behaviours were proved by
harness, which is evidence, not coverage — a future edit can reintroduce either with the suite green.

## D84 — The Untestable Caller, and Ten Minutes of Blank Screen

**Decision and record, 2026-09-08. Round 30**, which refuted round 29, plus the outage that followed
the fix.

### The rollback still lost the change it was written to recover

[D83](#d83--the-fix-that-retried-forever) made the rollback unconditional so that a refusal
overlapping a later edit would be recovered. It was not. `configPatch` was evaluated **when the
effect ran** and the result frozen in the 600ms debounce closure, so rolling the baseline back
afterwards changed nothing about what had already been decided to send.

Toggle `ackRequirePhoto`; toggle `warnDuplicate` a moment later; let the first write be refused
inside the second's debounce. The second sends only its own delta. The baseline and the screen both
say the setting is on, the database says off, and **no later edit ever recovers it**, because the
diff is computed against a baseline that already contains the value. That is verbatim the sentence
the code comment warns about, on the setting that once stopped the owner liquidating a receipt.

### The whole of D83's fix could be deleted with the suite green

Round 30 reverted both halves — the dependency change and the rollback — and 201 tests passed. Trap
98. And the excuse in D83 (*"store.jsx is React and nothing offline imports it"*) was wrong: the
verifier drove the effect body in a sixty-line harness with no React and no DOM.

**The decision: `src/config-save.js` owns the baseline, the diff and the rollback.** `store.jsx`
keeps the debounce and the wiring. `send` takes the config, never a patch, so the frozen-patch defect
is **unrepresentable** rather than merely fixed. Eight tests drive it; the mutations go red — no
rollback → 4 failures, D83's guarded rollback → 1, a patch frozen across time → 1.

### And then the fix blanked the application

The commit that did all that (`c480f3e`) replaced a span beginning above the `configKey` and
`readOnly` declarations and never re-declared them. `ReferenceError: readOnly is not defined`, thrown
from `StoreProvider`'s render, so React unmounted the tree and every signed-in user got a blank page.

**`npm run build` passed. All 209 offline tests passed. The gate went green and deployed.** Nothing
in `npm test` imports `store.jsx`, `App.jsx` or any screen — the exact gap the commit was written to
close, biting on the commit that closes it.

Production was blank from **03:49:29Z to 04:00:04Z, about ten and a half minutes**, ended by
`git revert` and a push. The last human write was 02:15Z and none fell inside the window, so most
likely nobody was affected — but a blank page leaves no audit row, so that cannot be proved.

**The rule, now in `AGENTS.md` and `CLAUDE.md`: run the Playwright suite against a local dev server
before pushing anything under `apps/web/src/`.** It drives the real UI and is the only check here
that does. Two and a half minutes against a production outage. The reland was verified that way
first — console clean, Dashboard rendering, 51/51 against localhost — and only then pushed.

### Two smaller findings from the same round

- `scripts/schedule-plan.test.js` asserted ordering with `indexOf(find(...))`, which returns `-1`
  when there is no detail row, and `-1 < anything` passes. A pin that cannot fail, inside the test
  written to close a finding about pins that cannot fail. Positional now, with an explicit assertion
  that the detail row exists at all.
- `scripts/backup.mjs` read `count || 0` twice. `countError` is thrown first, so it should be
  unreachable — but a null count with no error would page zero times, compare `0 !== 0`, pass, and
  write an **empty snapshot while calling it a backup**. The round-27 shape again. Fails closed now.

### What round 30 cleared

The serialisation is faithful — every config value is a boolean, string, string array or plain note
object, with no `undefined`, `NaN`, `Date` or function anywhere, so nothing collapses or is lost
through `JSON.parse`. Every config writer in `actions.js` and `Settings.jsx` replaces rather than
mutates, so no edit can fail to change the key. The loop is genuinely gone: `toast` is not in
`CONFIG_KEYS`. And the "re-sending a held value is a no-op merge" claim is true of the content, with
one caveat worth knowing — the `UPDATE` still runs, so `updated_at` moves and an audit row is written
for every superset re-send.

## D85 — A Status the Dropdown Does Not Offer

**Decision and record, 2026-09-08. Round 31**, the first round to audit the `.jsx` layer — which
[D84](#d84--the-untestable-caller-and-ten-minutes-of-blank-screen) had just proved has no offline
coverage at all. It found two defects there immediately.

### The crash

`AckRec.jsx` rendered a receipt's status chip with `TAG[r.status]`, unguarded. Any value outside the
four the dropdown offers threw `Cannot read properties of undefined (reading 'bg')` out of render,
React unmounted the whole tree, and the user got a **blank page that a reload does not fix** — the
same row loads again. `Telegraphic.jsx` wrote the identical expression **with** the guard, and the
shared `Tag` in `ui.jsx` without it. One pattern, three copies, one guarded: trap 98.

`Tag`'s only caller does not crash today, but only because `visibleRows` drops such a row before it
reaches the chip. That is not safety, it is a different bug wearing safety's coat — the row vanishes
from the Tracker sheet and from the grand total.

**Decision: one `tagOf(status, tags)` in `logic.js`, and all three sites route through it.** It
deliberately does **not** fall back to `pending`. This is a money screen; labelling an `archived`
receipt "Pending" states something false about it.

> **Corrected 2026-09-08 by round 32 ([D86](#d86--the-tenth-site-and-a-decision-record-that-was-not-true)).**
> The paragraph that stood here claimed "the raw value is shown in a neutral chip, so the row stays
> readable and the operator can see that something is wrong." **That was false on the screen it was
> written for.** `AckRec` renders the status as a `<select value={r.status}>` and never reads
> `tag.label` at all; an unmatched value falls to `selectedIndex 0`, so an `archived` receipt
> displayed **"Pending"** — the exact statement this decision says it refused to make. `tagOf`
> delivered only a grey tint on a control that was lying. Fixed by `statusOptions`, which appends the
> unrecognised value as its own `<option>`; the correction and its evidence are in D86.

### Why it was reachable at all

`public.receipts.status` is `text` with **no CHECK constraint**, and so are `txns.status` and
`transfers.status`. The four values are enforced by a `<select>` in the browser and by nothing else.
Defect family (d) in its plainest form: the guard lives on the client instead of in the write, so any
PostgREST `PATCH`, any restore from `backups/`, or any status added to the database before the UI
knows it produces one. The database half is [C8](Remaining%20Work%20and%20Owner%20Decisions.md) — a
production schema change, and therefore the owner's. Every stored value is in range today, so the
constraint would validate cleanly whenever it is added.

### Escape was dead for half the dialogs

Controls inside a sheet row carried `onKeyDown={stop}`, where `stop` was
`(ev) => ev.stopPropagation()`. The intent was to keep a Space press from reaching the row, which
opens on Enter or Space. It stopped **every** key. React listens at the root container, so that also
stopped the native event before the `window` listener in `useEscapeToClose` — and focus stays on the
control after it opens the dialog. Escape was therefore dead for the entire lifetime of any modal
opened from a row control; ten presses left the Liquidate dialog open. The `openModals` stack carries
a twenty-line comment explaining how it guarantees Escape works, and for these dialogs it did not.

Split into `stop` for `onClick`, where there is no key to inspect, and `stopRowKeys` for `onKeyDown`,
which stops Enter and Space and nothing else. Pinned by an e2e spec that asserts the toolbar path as
well, so a regression says which half broke, and that also asserts Escape **cancels** rather than
confirms — a dialog that closes and acts would be worse than one that will not close.

### The method note

Both defects are invisible to `npm test` and `npm run build`. Round 31 found them by driving a real
browser against a local dev server and listening for `pageerror`, then proving each with a real key
press and a rewritten read response — no database write. That sweep, across every screen and a dozen
modals, had never been done. It should be part of any round that touches a component.

And the new rule earned its keep immediately: running the suite locally before pushing caught my own
wrong locator, because the Remove button's accessible name is its `aria-label` rather than the word
printed on it.

## D86 — The Tenth Site, and a Decision Record That Was Not True

**Decision and record, 2026-09-08. Round 32**, which refuted round 31. Four findings. Both halves of
round 31's fix were incomplete, and [D85](#d85--a-status-the-dropdown-does-not-offer)'s central
justification was **factually false about the screen it was written for**.

### A decision record that stated the opposite of what the code did

D85 said `tagOf` shows the raw value "in a neutral chip, so the row stays readable and the operator
can see that something is wrong." `AckRec` has no chip. It renders the status as a
`<select value={r.status}>` and reads only `tag.bg` and `tag.fg` — never `tag.label`. When the value
matches no `<option>`, the DOM falls to `selectedIndex 0`, so an `archived` receipt displayed
**"Pending"**: precisely the false statement D85 congratulated itself on refusing, on a money screen.

Round 32 proved it by rewriting the `receipts` GET in flight and reading the live DOM:
`{"value":"pending","selectedIndex":0,"shown":"Pending"}`.

**Round 31 therefore made things worse, not better.** It converted a loud, unmissable crash into a
quiet, plausible misstatement about money. A blank page gets reported in minutes; a receipt that
reads "Pending" does not get reported at all.

**Fixed by `statusOptions(status, known)`**, which appends the unrecognised value as its own
`<option>` so the control can show what the row actually holds; `tagOf` still greys it so it reads as
wrong rather than as a fifth legitimate state. Both screens use it. The mutation — never appending —
turns the test red.

**The lesson is about the record, not the code.** D85's claim was written from the design intent and
never checked against the rendered output. A decision record that describes what the author meant
rather than what the software does is worse than none, because the next reader trusts it. D85 now
carries the correction inline.

### The tenth site

Round 31 fixed nine `onKeyDown={stop}` sites across the two files it was pointed at, and defined the
helper **twice, locally**, in those two files. `Tracker.jsx:197` had a tenth — an inline anonymous
`(ev) => ev.stopPropagation()` — so a grep for the helper name could not find it.

It is the worst of the eleven. It guards the button that opens the **payment** dialog, the
money-writing one, on the control an operator uses dozens of times a day. Escape was still dead
there, by both mouse and keyboard, ten presses leaving it open.

`stopRowKeys` and `stopRowClick` now live once, in `ui.jsx`, and all three screens import them.
**Copying a helper into the files you know about is how the file you do not know about gets missed** —
trap 98, in the fix for trap 98.

### A guard that was itself the shape it removed

`tagOf` did `tags[status]`, an unguarded plain-object lookup — exactly the pattern it exists to
eliminate. A status of `constructor`, `toString`, `valueOf`, `hasOwnProperty` or `__proto__` finds an
inherited member, which is truthy, short-circuits the fallback, and yields an object with no `bg`,
`fg` or `label`: an empty, unstyled, unlabelled chip. "Cannot throw" was true; "always returns a
renderable chip" was not. Guarded with `Object.prototype.hasOwnProperty.call`.

Its test was one string short of catching this — `assert.ok(typeof t.bg === 'string')` was the right
assertion attached to an incomplete input list. The prototype keys are in the list now.

### An invariant the screen prints, and a row that makes it false

The Dashboard prints "Payables is the total — the four beside it add up to it." `of(k)` partitions by
`eff(t)`, so a row whose status is outside the four counts in the total and in no bucket. Round 32
injected one row of PHP 1,234,567: the total came out exactly that much above the sum of the four,
the row was absent from the Tracker sheet, and **no filter state could reach it**, because the status
checkboxes only offer the same four keys.

`unaccountedRows` is now a tested helper, and the Dashboard names the discrepancy — count and amount
— instead of printing a claim that is not true. Related: [C8](Remaining%20Work%20and%20Owner%20Decisions.md),
the missing database CHECK that makes any of this reachable.

Also fixed while there: `state.settings.dashWindow.toLowerCase()` was called bare at two points, so
an explicit `null` in the stored settings would throw out of render. Same family (d).

### What round 32 cleared

`tagOf` against objects, arrays, `0`, `false`, `NaN`, `Symbol` — no throw, and `String(status ??
'Unknown')` is right for the falsy-but-present cases. Markup in a status is escaped by React and is
not exploitable. A 300-character status does not break the layout. `ev.key === ' '` is correct for
Chromium. `App.jsx`'s `SCREENS[state.screen] || Dashboard`, `Settings.jsx`'s `ROWS[tab.k]` and
`CSYM[cur]` at four call sites are all guarded. And the new Escape spec is genuinely falsifiable.

## D87 — The Same Defect, Three Rounds Running, In Whichever Files Were Named

**Decision and record, 2026-09-08. Round 33**, which refuted round 32.

Round 32 diagnosed a habit: *a round fixes the sites it was told about, so the instance in a file
nobody named survives.* Round 33 found that the fix for that finding **did it again**.
`statusOptions` was applied to the two sheet-row `<select>`s in `AckRec.jsx` and `Telegraphic.jsx`
and to nothing else. The identical defect stood in every edit modal:

| Site | What it displayed |
|---|---|
| `EditTransaction.jsx` status | "Pending" for a row that is completed or held — in the dialog used to edit its amount and due date |
| `EditReceipt.jsx` status | "Pending", **and** it hid the liquidated-only Date and Actual fields, concealing real liquidation data |
| `EditTransfer.jsx` status | "Pending" for a released wire |
| `EditTransfer.jsx` / `AddTransfer.jsx` currency | the first currency in the list, while `RateField`'s maths kept using the real one — a display/reality split on money |
| `Masterlist.jsx` company / category / frequency | the first entry in the list |

The company and category cases are the most reachable of all, and need no rogue write:
`removeCompany` and `removeCategory` do not check whether a row still uses the value. **Delete a
company from Settings and every row that referenced it silently displays a different company.**

### The decision: guard the component, not the call sites

`optionsWith(value, options)` is the plain-string half of the rule `statusOptions` already carried
for `{v, label}` lists, and **`ui.jsx`'s shared `Select` now calls it internally**. That covers
sixteen call sites at once and, more importantly, covers the seventeenth that nobody has written yet.
The nine raw `<select>` elements are converted individually because they are raw.

**Guarding a shared component is a different act from guarding its callers, and only the first
one ends the class.** Three rounds fixed callers. This one fixes the component.

Verified by enumeration rather than by belief: every `<select>` and `<Select>` in `src/` was listed
and checked, and the check is repeatable —

```
grep -rn "<select " src/ | while IFS=: read f l rest; do
  sed -n "${l},$((l+9))p" "$f" | grep -q "optionsWith\|statusOptions" || echo "UNGUARDED $f:$l"
done
```

Nine raw elements, all guarded; sixteen component usages, covered centrally.

### What round 33 cleared

Nine `stopPropagation` hits, all correctly paired click-only with `stopRowKeys` after
[D86](#d86--the-tenth-site-and-a-decision-record-that-was-not-true). No new unguarded bracket lookup
on row data. No unguarded `.toLowerCase()`/`.trim()`/`.split()`/`.map()` on a nullable value in the
modals, `rewind.mjs` or `fx.mjs`. No other screen printing a totals claim a dropped row could
falsify.

### Recorded separately: the scheduled jobs now run the current code

`backup.mjs` gained a fail-closed row-count guard in [D84](#d84--the-untestable-caller-and-ten-minutes-of-blank-screen)
and **had never executed since** — the job last ran two commits earlier. That is the D84 shape
exactly: unexercised code in an unattended job. Rather than reason about it, the count call was run
read-only against all eight tables (every one returns a `number`, including `recurring` at `0`, the
empty-table case the guard could have broken), and then `backup.yml` was dispatched manually. It
completed green and the snapshot it wrote is complete: 49 / 3 / 0 / 12 / 1 / 11164 / 5 / 12, matching
the database row for row, with `audit_log` at 11,164 exercising the keyset pager over twelve pages.

`schedule.yml`, `fx.yml` and `ci.yml` were confirmed to have run on the current code already.

## D88 — One Guard For The Class, Because The Sites Keep Moving

**Decision and record, 2026-09-08. Round 34**, which refuted round 33.

[D86](#d86--the-tenth-site-and-a-decision-record-that-was-not-true) guarded `tagOf` against inherited
keys: `obj[key]` finds `Object.prototype` members, which are **truthy**, so they defeat every
`|| fallback` written after them. Round 33's fix for a different defect then wrote **three fresh
unguarded `CSYM[c]` lookups**, and round 34 found them.

It also found that `curFmt` had carried the same hole since it was written, unnoticed by
thirty-three rounds:

```js
((symbols || {})[cur] || '') + Math.round(...)   // guarded against a missing MAP, not an inherited KEY
```

That is the figure printed on the transfer sheet. A wire whose currency is `constructor` rendered a
function's source text in front of its amount, **beside the money**. `transfers.cur` is free text
with no CHECK constraint, so it is reachable by any PATCH, a restore, or a client told otherwise.

### The decision

One `own(obj, key)` in `logic.js`, and everything routes through it — `tagOf`, the new
`symbolOf(cur, syms)`, `curFmt`, `rateFor`'s `TRANSFER_RATES` lookup, and `App.jsx`'s
`SCREENS[state.screen]` (where an inherited key would have handed React the `Object` constructor and
defeated its `|| Dashboard` fallback). > **Corrected 2026-09-08 by round 35 ([D89](#d89--a-ratchet-instead-of-a-promise)).** This paragraph
> claimed "no raw bracket lookup on row-shaped data anywhere in `src/`", **verified by a grep for
> `CSYM[`**. The claim was about a class; the check was about one name. Round 35 found four more —
> `ACK_STATUS[settings.ackDefaultStatus]`, the status filter, `rateFor`'s live-rate lookup, and the
> group-collapse map — and the ratchet written afterwards found three more again. A record that
> states more than its check establishes is the same defect as D85's, which round 32 caught. The
> claim is now enforced by `src/lookups.test.js` rather than asserted here.

**This is the third round in a row where the previous fix was correct and incomplete**, so the shape
of the fix has changed: not a guard at each site, but a named helper the sites call. Round 33 learned
to guard the shared *component* rather than its callers; round 34 extends it to the shared *lookup*.
Sites move. A class ends when there is one place to change.

### Coverage

`own`, `symbolOf` and `curFmt` are pinned against all six `Object.prototype` keys plus unknown,
empty, null and undefined. Three mutations — unguarding `own`, restoring the raw `symbolOf`,
restoring the raw `curFmt` — turn 4, 2 and 1 assertions red respectively. 215 to 218 assertions.

### What round 34 cleared

`optionsWith` against non-string values, duplicate `<option>` keys, and the `value ?? ''` /
`placeholder` interaction in `AddRecurring` (an empty value short-circuits before the append, so the
placeholder still matches). All sixteen `<Select>` call sites read: none relied on the old index-0
fallback, and `Filters`' `All companies` sentinel is a member of its own list, so the guard correctly
extends to filters. `Masterlist` read in full.

## D89 — A Ratchet Instead Of A Promise

**Decision and record, 2026-09-08. Round 35**, which refuted round 34.

Round 34 introduced `own(obj, key)` and routed the lookups it knew about through it.
[D88](#d88--one-guard-for-the-class-because-the-sites-keep-moving) then declared the class closed.
Round 35 found four more, and **the check behind the claim was a grep for one identifier**:

| Site | Effect |
|---|---|
| `actions.js` `ACK_STATUS[settings.ackDefaultStatus]` | An inherited key defeats `\|\| 'pending'` and seeds the receipt form with a **function**. `JSON.stringify` then drops it, so the row saves with no status at all |
| `logic.js` `st.statuses[eff(t)]` | The status filter **passed** a row it was meant to hold — inherited keys are truthy, so `!truthy` is false |
| `logic.js` `(rates \|\| {})[w.cur]` | Harmless — a function has no `.rate` — but raw, while D88 said otherwise |
| `actions.js` / `Tracker.jsx` `collapsed[name]` | Keyed by a company or category name, both free text |

### The decision: stop promising, start ratcheting

`src/lookups.test.js` walks every `.js`/`.jsx` under `src/` and fails on any bracket lookup keyed by
a non-literal, unless it is in an `ALLOWED` list where **every entry carries the reason it is safe** —
an own-key iteration, an array index, a write to a fresh object, a numeric month. It is the check
that would have caught rounds 33, 34 and 35 before they were written.

**Writing it immediately found three more instances nobody had reported**:
`(state.fxRates || {})[cur]` in `actions.js` and both transfer modals, feeding the exchange-rate
field. Harmless downstream, raw in form.

**And the first version of the ratchet was itself the trap it exists to catch.** Its matcher required
an *identifier* before the bracket, so `((symbols || {})[cur] || '')` — the exact shape `curFmt` had
carried through thirty-three rounds, and the reason D88 was written — did not match. Its
"can-this-fail" test used only identifier examples, so it passed while the matcher was blind. The
matcher now accepts a closing paren, its self-test includes the parenthesised shape, and restoring
`curFmt`'s old body turns it red.

**The general rule: a claim about a class needs a check that runs over the class.** A grep for one
name is evidence about that name. Three decision records in this loop have now overstated what their
check established — D85, D88, and the ratchet's own first draft. The difference here is that the
claim is executable, so the next round does not have to take it on trust.

221 assertions across 13 files.

## D90 — Make The Shape Impossible, Not Detectable

**Decision and record, 2026-09-08. Round 36**, which refuted round 35.

Five consecutive rounds found the same class: `obj[key]` finds `Object.prototype` members, those are
truthy, and they defeat every `|| fallback` written after them. The answers escalated —
[D86](#d86--the-tenth-site-and-a-decision-record-that-was-not-true) guarded one function,
[D88](#d88--one-guard-for-the-class-because-the-sites-keep-moving) added `own()` and claimed the
class closed, [D89](#d89--a-ratchet-instead-of-a-promise) replaced the claim with a source ratchet.

**Round 36 defeated the ratchet with ordinary code**, live against the real suite:

| Bypass | Result |
|---|---|
| the lookup split across two lines | 221/221 still passed |
| `rates?.[key]` | 221/221 still passed |
| a fresh `TAG[prev.status]` appended to an already-allowed line | both tests passed |
| `Reflect.get`, a template-literal key, a destructured computed key | never matched |

It also found the ratchet's self-test duplicated the regex literal instead of importing it, so the
two could drift and the self-test would keep validating a pattern the real check no longer used —
trap 104, inside the file written to prevent this class.

### The decision: `Object.create(null)`

`bare(o)` in `data.js`, and **every map this app indexes by row data is built with it**: `TAG`,
`CSYM`, `TRANSFER_RATES`, `PUSH_DOWN`, `SCREENS`, `ROWS`, `ACK_STATUS`, and the data-derived
`fxRates`, `statuses` and `collapsed`. There is no prototype to inherit from, so the lookup is safe
**however it is spelled** — raw, optional-chained, reflected, destructured, template-keyed, or split
across lines.

> **Corrected 2026-09-08 by round 37 ([D91](#d91--a-guarantee-that-did-not-survive-its-own-lifecycle)).**
> That paragraph was true of eight of the ten maps and false of two. `statuses` and `collapsed` are
> reducer state, and **a spread of a null-prototype object produces an ordinary one** — so the
> guarantee lasted until the first status toggle and no longer. `bare()` was applied where the maps
> are *constructed*; the test written to prove it checked only `TAG` and `CSYM`, which are constants
> and never change. Every construction site is re-bared now and the lifecycle is pinned. **The two
> guarantees are not the same strength and D91 states which is which.**

**A regex over source text can always be out-written. A missing prototype cannot.** The guard moved
from the spelling of the access into the data itself, which is the only version of this fix that does
not need a sixth round to find the site it missed.

Proven rather than asserted: a probe exercised all six prototype keys through every one of round 36's
bypass spellings against the real modules, and `rateFor` end to end — everything returns `undefined`
and the rate stays numeric. `logic.test.js` pins it, and reverting `bare` to a spread turns three
assertions red.

### The ratchet stays, demoted and honest

`own()` is now the second belt and `lookups.test.js` the third. The file's header states plainly
which bypasses it cannot see, and names `bare()` as the actual guarantee, so a green run is not
mistaken for proof. Three of round 36's findings are fixed there anyway: the matcher accepts `?.[`,
the regex is defined once and exported so the self-test cannot drift from it, and an allowance now
covers only the snippet it names — the whole line is no longer skipped.

**That last fix immediately found a real one:** `(prev.settings || {})[key]` in `rows.js`, shielded
until now by an allowance for a different lookup on the same line. A settings blob is JSON and can
carry an own key named `constructor`, which would have made a spurious patch. Routed through `own`.

### Scope, stated because D88's was not

The ratchet walks `src/`. `scripts/backup.mjs` and `scripts/rewind-plan.js` also index objects, by
table names from a fixed app-controlled enumeration rather than user text. That is a weaker risk, it
is **not** covered by this check, and no claim is made that it is.

224 assertions across 13 files.

## D91 — A Guarantee That Did Not Survive Its Own Lifecycle

**Decision and record, 2026-09-08. Round 37**, which refuted round 36.

[D90](#d90--make-the-shape-impossible-not-detectable) said the inherited-key class was closed
structurally, because every map indexed by row data is built with `Object.create(null)`. Round 37
ran the reducer's own expressions and printed the answer:

```
initial statuses proto null? true
after one toggle, proto null? false
statuses.constructor now: [Function: Object]
```

**A spread of a null-prototype object produces an ordinary one.** `{ ...s.statuses, [k]: v }` is how
every status toggle and every group collapse works, so the guarantee held until the user's first
interaction — which is to say, in practice, not at all. It was true of eight maps and false of the
two that are actually mutable.

The proof test could not catch it because it checked `TAG` and `CSYM`: constants, which never spread.
**`bare()` was applied at construction and verified at construction, while the defect lives in the
lifecycle.** Trap 101 in fresh clothes — the guard was placed where it belonged and tested where it
was placed, not where the value goes.

### The decision, and an honest statement of two different strengths

Every construction site is re-bared — the two spreads, the `tileFilter` reset, the Dashboard
deadline reset, both group-by buttons in `Filters.jsx`, and `Tracker.jsx`'s expand-all. **Four of
those seven were not in round 37's report**; a grep for `collapsed: {}` and `statuses: {` found them,
which is the same lesson as [D87](#d87--the-same-defect-three-rounds-running-in-whichever-files-were-named):
fix the pattern, not the sites you were handed.

But the two guarantees are **not** equally strong, and saying so is the point of this record:

| Map | Guarantee | Strength |
|---|---|---|
| `TAG`, `CSYM`, `TRANSFER_RATES`, `PUSH_DOWN`, `SCREENS`, `ROWS`, `ACK_STATUS`, `fxRates` | built once with `bare()`, never spread | **structural** — cannot be undone by later code |
| `statuses`, `collapsed` | `bare()` at every construction site | **conventional** — any future spread that forgets re-bares nothing, silently |

So for the mutable pair the load-bearing guard remains `own()` at the point of access, which is
immune to a prototype whether or not the object has one — `logic.js:541`, `Tracker.jsx:26,156`. The
`bare()` calls there are defence in depth. A test now pins the lifecycle rather than the
construction: toggling through the exact reducer expressions must leave the prototype null, and a
plain spread turns it red.

### Five records have now overstated their evidence

D85, D88, D89's ratchet, D90, and D90's own correction scope. The pattern is consistent enough to
name: **a fix is verified where it is written, and the claim is then stated for where the value
travels.** The remedy that has actually worked is to write the check so it runs over the thing being
claimed — `lookups.test.js` for the class, and now the lifecycle test for the reducer.

225 assertions across 13 files.

## D92 — The Write Half, And Why A Grep Could Not Have Found It

**Decision and record, 2026-09-08. Round 38**, which refuted round 37. Seventh consecutive round on
one defect class, and the first to find a genuinely different half of it.

### The site the sweep could not see

[D91](#d91--a-guarantee-that-did-not-survive-its-own-lifecycle) re-bared every construction site of
`collapsed`, found by grepping `collapsed: {}` and `statuses: {`. Round 38 found one three lines
below the branch that fix edited:

```js
if (!allOpen) return { collapsed: bare({}) }   // fixed by D91
const c = {}                                   // not — a different literal shape
order.forEach((k) => { c[k] = true })
```

`const c = {}` does not match either grep pattern. **A grep finds the shapes you thought of**, which
is the same lesson as [D87](#d87--the-same-defect-three-rounds-running-in-whichever-files-were-named)
arriving by a new route: there, the sites were in files nobody named; here, the site was in the file
that had just been edited, in a spelling nobody had listed.

### The write half, which no round had looked for

Rounds 32 to 37 all chased `obj[key]` **reading** an inherited member. Round 38's site is an
assignment, and that is a different failure with a different mechanism:

```
o = {};  o['__proto__'] = v   →  Object.keys(o) is []      the value is LOST
b = bare({}); b['__proto__'] = v  →  Object.keys(b) is ['__proto__']   kept
```

Assigning `__proto__` on an ordinary object hits the `Object.prototype` **accessor** and creates no
own property. Sweeping for it found two more in `configPatch`: `const patch = {}` and
`const settings = {}`, the accumulators that build the config diff. `JSON.parse` **does** produce an
own `__proto__` key, so a settings blob that has been through the database can carry one — and that
setting would then be silently absent from the patch, never reach `merge_app_config`, and be lost
with no error anywhere.

Worse, [D89](#d89--a-ratchet-instead-of-a-promise)'s ratchet had `settings[key] = next.settings[key]`
in its `ALLOWED` list. **The allowance was on the buggy line.**

### What the fix changed beyond its intent, and how the tests were corrected

`configPatch` now returns a prototype-less object, and six assertions began failing on
`deepStrictEqual` — which compares prototypes. That is a real consequence, not a test nit. The
assertions were changed to compare **what the database actually receives**:
`JSON.parse(JSON.stringify(patch))`. A patch is only ever consumed by being serialised and sent to
`merge_app_config`, so the serialised form is the contract, and asserting it is stronger than
asserting the object.

**And the test for this class is itself booby-trapped.** The obvious expected value,
`{ settings: { __proto__: '…' } }`, is an object literal — so `__proto__` there *sets the prototype*
and the expectation is an empty object. The assertion would have passed for the wrong reason. It
compares the serialised string and the own-key list instead.

226 assertions across 13 files. The mutation — plain accumulators — turns it red.

### An honest note on this round's scope

Round 38 stopped after this finding and explicitly declined to audit `rewind.mjs`, `fx.mjs`,
`errors.js`, `icons.jsx` and the remaining modals, flagging them back as still-unaudited rather than
claiming coverage it had not done. That is the right behaviour and it is recorded here so the next
round does not read this decision as evidence those files are clean.

## D93 — A Pasted Number That Was Seven Orders Of Magnitude Wrong

**Decision and record, 2026-09-08. Round 39**, which refuted round 38 — and the first round in eight
to find something outside the prototype class, because it was forbidden from reporting one.

### The finding

`amountOf` stripped everything outside `[0-9.]`. That deletes the `E` and the `+` from a pasted
`1.20E+07` and splices the surviving digits together:

```
amountOf('1.20E+07')  ->  1.2007      (intended 12,000,000)
amountOf('1.5e6')     ->  1.56
amountOf('12.34.56')  ->  12.34       silently truncated
```

**A spreadsheet renders a number in scientific notation whenever the column is too narrow.** Copying
the displayed cell is an ordinary thing to do, and the resulting value cleared every guard in the
system: it is positive, so `positiveAmountOf` accepted it, and D65's `amount > 0` CHECK accepted it
too. **The client and the database agreed on a number seven orders of magnitude from what the person
meant** — which is exactly the gap the round was told to hunt for, and one no constraint could have
caught, because the value is perfectly legal.

Live on eight money paths: the edit form's amount, the e-cash fee, the liquidation base, the payment
dialog's running total, and the masterlist's recurring amount.

### The decision: refuse, do not guess

`amountOf` now strips only decoration — spaces, a leading currency symbol — and then requires a
strict decimal shape. Anything else returns `NaN` and the existing validation rejects it. `1.` and
`.5` are deliberately still accepted: both are states a field passes through while somebody types a
decimal, and refusing them mid-keystroke is trap 105, which took twenty-three rounds to find.

A comma is treated as a thousands separator **only in a valid grouping position**. Blind stripping
read `1 234,56` — European for 1234.56 — as `123456`, a hundred times out: the same silent
misreading in a different costume, found while testing the first fix. This app prints `1,234.56`
through `toLocaleString('en-US')`, so that is the shape a paste-back has; anything else is refused
rather than guessed at.

All 226 existing assertions passed unchanged against the stricter parser.

> **Corrected 2026-09-08 by round 40 ([D94](#d94--a-minus-sign-that-was-not-a-minus-sign)).** The
> sentence that followed here read "which says no behaviour depended on the mangling." That is not
> what a green suite says. The suite contained no assertion about a sign before a currency symbol, so
> `-$5` — the standard accounting form, and read as `-5` by the old parser — began returning `NaN`
> and nothing went red. **A passing suite is evidence about what it covers, and silence about the
> rest.** Seventh record in this loop to claim more than its check established.

### The rewind footnote, fixed because of what that file is

`rewind.mjs` emits SQL a human applies as `postgres`. `actor_email` was interpolated raw into a `--`
comment line, so a newline in it would end the comment and put the remainder on a **live line**.
GoTrue validates email syntax before it reaches `auth.users`, so this was never a live path — and it
is fixed anyway, because "the other system validates it" is precisely the assumption that stops
being true quietly, and this file's output is applied to real money by hand. Every interpolated
value is flattened to one line now, and a test asserts no `drop table` can reach a non-comment line.

### What round 39 cleared

`rewind.mjs` and `rewind-plan.js` read in full: `--since` rejects a non-ISO and a future date, paging
is keyset, a DELETE-then-reinsert of one id collapses to the oldest post-cut entry, and row payloads
go through `JSON.stringify` → `lit()` → `jsonb_populate_record`, which is injection-safe — verified
with a payload carrying quotes, a semicolon, `--`, newlines and a NUL byte. `fx.mjs` read in full:
idempotence is exact comparison against a deterministically rounded value, EUR is self-checked
against the ECB's own PHP figure, a malformed response fails loudly, and the write is read back.
`errors.js` and `icons.jsx` are static and clear.

**Not covered, and stated rather than implied:** the six unaudited modals, `pending.js`/`queries.js`
concurrency, and the Manila/UTC date boundary. Round 39 stopped once it had a concrete defect and
flagged the rest back, which is the same discipline round 38 used.

229 assertions across 13 files.

## D94 — A Minus Sign That Was Not A Minus Sign

**Decision and record, 2026-09-08. Round 40**, which refuted round 39 by attacking its fix from both
sides: something it wrongly accepted, and something it wrongly refused.

### The pre-existing one, and the worse of the two

`−` is the real MINUS SIGN. macOS Calculator emits it, and so do many renderers and
spreadsheets. It is **not** the ASCII hyphen, so both the old parser and round 39's rewrite stripped
it as leading decoration and read the digits behind it as **positive**:

```
amountOf('−5')      ->  5      (both before and after round 39)
positiveAmountOf('−500') -> 500
```

`positiveAmountOf` exists for exactly one purpose — to stop a negative reaching a charge or a
liquidation field — and this walked straight past it, leaving a positive value on screen and in the
database that nobody typed. Pre-existing, missed by thirty-nine rounds, and worse than a refusal
because it is silent.

Fixed by normalising the minus lookalikes — `−`, en dash, em dash, fullwidth hyphen — before
anything else happens.

### The one round 39 introduced

`-$5` is the standard accounting form for a negative amount; `$-5` is what this app's own `fmt`
prints. The old parser read both as `-5`. Round 39's stricter shape check accepted only the second,
so `-$5` and `-₱1,234.56` started returning `NaN` — a legitimate paste refused on a money field.

The sign is now taken from **either side** of the currency symbol before the symbol is dropped.

### The correction that matters more than either fix

[D93](#d93--a-pasted-number-that-was-seven-orders-of-magnitude-wrong) said the unchanged suite
"says no behaviour depended on the mangling." It does not say that. The suite had **no assertion
about a sign before a currency symbol**, so the regression passed it in silence.

**A passing suite is evidence about what it covers, and silence about everything else.** That is the
seventh record in this loop to claim more than its check established, and the shape is always the
same: the check is real, the sentence written about it is wider than the check. The remedy that
keeps working is to make the claim executable — and where it cannot be, to state the claim no wider
than the evidence.

Both fixes are mutation-checked: dropping the lookalike normalisation, and accepting a sign only
before the symbol, each turn an assertion red. 231 assertions across 13 files.

### Still unaudited, and stated rather than implied

Round 40 spent its whole budget attacking round 39's fix, which is what it was asked to do first and
which produced two findings. It did not reach the six modals, `pending.js`/`queries.js` concurrency,
the Manila/UTC date boundary, or `store.jsx`'s load path. Three consecutive rounds have now flagged
those back untouched.

## D95 — The Scheduler Was Living In A Different Day

**Decision and record, 2026-09-08. Round 41**, which refuted round 40 — and the first round in ten to
reach an area three consecutive rounds had deferred, because both mined-out classes were explicitly
closed to it in its brief.

### The defect

`scripts/schedule.mjs` computed `today` as `new Date().toISOString().slice(0, 10)` — the **UTC**
date. `schedule.yml` fires at 22:00 UTC, which is **06:00 the next day in Manila**. The owner's
browser gets its `TODAY` from the device clock, so the job's idea of the date was a full Manila day
behind the owner's, on every run, all year. Not an edge case: a fixed run time makes it deterministic.

Two consequences:

**The overdue digest was chronically blind.** `eff(t, today)` with a UTC `today` called a payable due
"yesterday by the owner's clock" *pending*, while the owner's own Dashboard showed it *overdue*. The
one report this project has said the opposite of the screen, every night.

**And at a month end it generated for the wrong month.** Verified across four boundaries:

| Run (22:00 UTC) | Month it used | Month the owner was in |
|---|---|---|
| 2026-08-31 | 2026-08 | **2026-09** |
| 2026-01-31 | 2026-01 | **2026-02** |
| 2026-12-31 | 2026-12 | **2027-01** |

September's payables were not created until 06:00 Manila on the **2nd** — a full day late — and a
payable due on the 1st was therefore inserted already satisfying `due < TODAY`: **overdue at the
instant it was created**, every month, including the year boundary.

### The decision

`todayIn(zone, now)` lives in `schedule-plan.js`, which `npm test` imports, rather than inline in a
script nothing imports — the same move as [D84](#d84--the-untestable-caller-and-ten-minutes-of-blank-screen)'s
lesson about untestable callers. The zone is **named and overridable** (`SCHEDULE_TZ`, defaulting to
`Asia/Manila`) because where the owner is, is a fact about the business, not about the code. An
unknown zone throws rather than quietly yielding a date from somewhere else, since a wrong date here
writes money rows into the wrong month.

The job now prints both dates in its summary — `Run date 2026-09-08 (Asia/Manila); the runner clock
is 2026-09-08 UTC` — because the entire point is that these can differ, and a reader of the job
summary should be able to see which one was used. Confirmed against production with a dry run.

Pinned across four month boundaries; reverting to the UTC date turns it red.

> **Corrected 2026-09-08 by round 42 ([D96](#d96--a-leap-day-that-crossed-no-month)).** This line
> read "across all four month boundaries **and a leap day**." The leap-day case was
> `2028-02-28T22:00:00Z`, which is 29 February in Manila — the **same month**. It proved a leap day
> exists, not that a leap-year month *end* is handled, which is the thing the sentence claimed. The
> real crossings (`2028-02-29` → March, plus a non-leap February and the non-leap century year 2100)
> are in the test now. **Eighth record in this loop to describe a stronger check than the one that
> ran.**

### What round 41 cleared

The six modals no round had read: no `<form>` wraps any of them, so Enter cannot phantom-submit;
every delete confirmation re-looks-up its row by id and no-ops if it is gone; `saveRecurring` blocks
an empty company, category or amount before writing. Concurrency: both debounced row writes have
matching cancellation on delete, and a cross-tab race degrades to a zero-row `UPDATE` rather than
corruption. `store.jsx`'s load path guards a stale `load()` with a `cancelled` flag and signs out on
an expired session.

232 assertions across 13 files.

## D96 — A Leap Day That Crossed No Month

**Decision and record, 2026-09-08. Round 42**, which refuted round 41 on the one thing that matters
about a fix to an unattended money job: whether the evidence behind it is what the record says.

### The finding

[D95](#d95--the-scheduler-was-living-in-a-different-day) said the timezone fix was "pinned across all
four month boundaries **and a leap day**." The leap-day case was:

```js
['2028-02-28T22:00:00Z', '2028-02'],
```

28 February 2028 at 22:00 UTC is 29 February in Manila — **the same month**. It asserts that a leap
day resolves at all; it asserts nothing about a leap-year month boundary, which is what the sentence
around it claimed and what the rest of that test is about. The genuine crossings are now there:
`2028-02-29` → March, a non-leap February, and **2100** — a century year that is *not* a leap year,
where 28 February does cross.

The code was already right. Only the claim was wrong, which is the eighth time in this loop, and by
now the pattern is worth stating as a rule rather than a note: **a test's name and the comment above
it are not evidence; the inputs are.** When a record says "verified across X", the reviewer's job is
to read the cases, not the sentence.

### What round 42 cleared, and it matters because this job runs unattended

- **Full ICU on the runner.** The real risk with `toLocaleDateString('en-CA')` is a small-icu Node,
  which silently formats as `9/8/2026` — the guard would then throw on **every** run and kill the
  nightly job. Checked directly: `process.config.variables.icu_small === false` on Node 24, the
  version `schedule.yml` pins, and the official distribution `actions/setup-node` installs ships full
  ICU. Not assumed from documentation; read off the runtime.
- **`ZONE` timing.** Read once at module load. Nothing sets `SCHEDULE_TZ`, and an empty string falls
  through to the default, so there is no load-order race in production.
- **The throw path.** `todayIn()` runs at module top level, before sign-in and before any try/catch,
  so an unresolvable zone kills generation *and* the overdue digest together. That is a sharp edge —
  and it is the correct one: if the date cannot be determined, neither generating rows nor reporting
  what is overdue is safe, and it fails **before** authenticating, so nothing is written.
- **No mixed UTC/local pair.** `logic.js`'s `Date.UTC` arithmetic works on calendar components the
  caller already resolved and never re-derives "now"; `buildGeneratedRows`'s `now` is an id seed, not
  a date. `localToday()` in the browser is a separate, pre-existing assumption — that the owner's
  device is in Manila — and is unchanged by this.

232 assertions across 13 files.

## D97 — The Probe Went Greener When The Application Broke

**Decision and record, 2026-09-08. Round 43**, which audited `security/probe.mjs` for the first time
and found seven ways a check could pass while the thing it tests was broken.

### The one that matters

The probe made **seven** `.update()` calls. **Every one asserted a refusal. Not one asserted that a
legitimate update succeeds.**

So `revoke update on all tables in schema public from authenticated` — one statement, after which the
application can no longer edit a transaction, mark a payable paid, liquidate a receipt or save a
setting — would have taken the suite to **57/57 green**. Simulated: all six UPDATE-dependent refusal
checks are satisfied by that revoke. The exact-`42501` pin on `occurrence_due` and `src`, which reads
as the most rigorous check in the file, is the worst of them: it cannot distinguish a column-level
revoke from a table-level one.

This is verbatim the shape the file's own comment says it exists to prevent — *"that revocation and
the intended move look the same: both are 'an error'. Only one of them is the fix."* That reasoning
had been applied to `is_viewer` EXECUTE and to nothing else.

**A positive control now runs first in section 5**: an ordinary edit must succeed and be readable
back. Under the simulated revoke it fails, so the outage is caught. INSERT already had one; DELETE
had an indirect one; UPDATE had none.

### The other six

- **The STALE detector could never fire.** `results.filter((r) => r.ok && DEFERRED[r.name])` — but
  the only deferred name is recorded exclusively on the *failing* branch, so the set was empty by
  construction in all four reachable states. The docblock promised the file "reports a STALE line
  when a deferred check starts passing"; it could not. Trap 100 inside the mechanism written to stop
  exemptions rotting. It now checks whether a deferred name was recorded at all, or recorded passing.
- **The bundle scan passed over zero bytes.** The `catch` only fired when `dist/assets` was *missing*;
  an empty directory gave four green secret checks. And `.claude/rules/git-workflow.md` told people to
  run `npm run security` **before** `npm run build`, so the pre-push scan meant to catch a key you had
  just pasted read the *previous* bundle. The rule is corrected, and the probe now refuses to conclude
  from an empty directory or from a bundle older than the newest source file.
- **`auth.users is not exposed` sent a malformed URL.** `withToken` appends its own query string, so
  `users?select=*` became `users?select=*?select=id&limit=1`. In the very state the check exists to
  detect — a `public.users` view readable by `authenticated` — PostgREST would resolve the table, pass
  the privilege gate, then fail parsing and return 400, satisfying `>= 400`. It now pins 401/403/404.
- **Two `created_at` checks passed whenever the insert failed for any reason.** `data` is null, so
  `!spoofed` is true. The D23 regression guard could have been dropped entirely and they stayed green.
- **An unguarded `.data.data`** would have thrown at top level and taken sections 6-9 with it, so the
  run died without printing what had passed. Same for an unguarded `fetch(ORIGIN)`.

### The correction I had to make to my own fix

Tightening the `created_at` checks to require a landed row turned them **red**: the insert is refused
with `42501`, because `created_at` is not grantable at all. That refusal *is* the protection, and the
strongest possible result. I had converted a vacuous pass into a false failure — the mirror image of
the same mistake. They now distinguish three outcomes: `42501` is the best case, a landed row with a
server-set timestamp is a pass, and an insert refused for any *other* reason is a failure, because it
tests nothing.

**57 checks became 60**, all passing, and three of them can now fail in ways the previous fifty-seven
could not.

### What round 43 cleared

`hold`/`releaseHeld` survived every attack: a double `hold` preserves the first value, `releaseHeld`
with nothing held is idempotent, and the restore and the marker-clear happen in a single
`merge_app_config` call so there is no window where one lands without the other. `undoGenerate`
cannot name a row Generate did not write — the client-side filter is not the guard; the server-side
`deleteGeneratedTxns` is.

## D98 — The Restore Left Out A Table, And The Verifier Agreed With It

**Decision and record, 2026-09-08. Round 44**, dispatched specifically because rounds 39, 40 and 42
had each deferred the same areas back untouched. It reached them and found a data-loss defect in the
one path that exists to prevent data loss.

### `fx_rates` was backed up, audited, and invisible to the restore

`backup.mjs` has snapshotted `fx_rates` since the table existed. It carries an audit trigger. And it
appeared in **neither `backups/README.md` nor `verify-restore.sql`** — zero mentions of `fx` in
either file.

A restore that followed the README would have failed **destructively**:

1. Step 3 disables six audit triggers. `fx_rates_audit` is not among them, so it stays live.
2. Step 4 loads `fx_rates.json` — twelve rows — and the live trigger writes twelve `audit_log` rows,
   taking ids **1 to 12** on a fresh `bigserial`.
3. `audit_log.json` then loads with explicit ids `1…13746` and hits
   `23505 duplicate key value violates unique constraint "audit_log_pkey"`.
4. That is one statement, so **the entire 13,746-row audit history aborts** — taking the per-row undo
   the README documents, the only source of `actor_email` for recreating accounts, and everything
   `npm run rewind` reads.

Loading in the other order fails too: the trigger's first write claims id 1, which the restored block
already holds.

**And the verifier agreed with the broken restore.** It counted seven tables, so a missing `fx_rates`
passed; it asserted seven triggers were back on, so an fx audit trail left permanently disabled
passed. The check written to catch a bad restore was blind to the same table.

### Why it was invisible, which is the transferable part

The only restore rehearsal was 2026-09-02, against twelve migrations. `fx_rates` is migration
**thirteen**, added the next day. **A procedure is only ever as current as its last rehearsal**, and
this one has been describing a twelve-table database for six days while the backup wrote eight files.

Fixed in the inventory, the trigger list, the load step and the verifier's counts and trigger
assertion — and the rule recorded in `backups/README.md`: when a migration adds a table, that file
and `verify-restore.sql` are **part of that change**, not follow-up work. The check is mechanical and
now runs: every table in `backup.mjs`'s `TABLES` must appear in the inventory, in the trigger list if
it is audited, and in the verifier. All eight do.

### Two smaller findings

- **A category could be added twice in different cases.** Companies are upper-cased on entry;
  categories are not; and **neither path checked for a duplicate at all**. So `rent` and `Rent` could
  both live in the one `app_config` row four people share — and that is not cosmetic, because
  `visibleRows` filters on `t.cat !== st.catFilter` and `groupKey` groups on the raw string. A
  transaction filed under `rent` is **invisible** when the filter says `Rent`, and the Tracker shows
  two groups with two subtotals for one category. `addToList` now refuses a case-insensitive
  collision and names the existing entry, because the duplicate that matters is the one the person
  typing it cannot see.
- Two Masterlist inputs lacked the `?? ''` guard their five siblings have; `recurring.due_date` is
  nullable, so a row written by anything other than the app's own modal would render an uncontrolled
  input. Guarded.

### What round 44 cleared

Every one of the ten Settings keys traced end to end: **no key is written under a name it is not read
by**. `removeCompany` not checking for referencing rows is safe *because* `optionsWith` and the
shared `Select` display the row's own value rather than falling to index 0 — the round-33 fix holding
up under a different attack. `applyMasterlistEdit`, `draftText`, `generate`, `undoGenerate` and
`monthKeys` all correct. `store.jsx`'s load path guards both branches with `cancelled`.

233 assertions across 13 files.

## Guideline Basis

- **AGENT-03** ensures adapter workflows stop rather than invent authorization.
- **PG-05** defers tools and architecture until a demonstrated need and repository evidence exist; D7 met that bar by explicit request.
- **SEC-05** places the D7 and D8 trust boundary in the database, where row-level security is enforced, not in the interface.
- **MD-04** keeps decisions canonical and links leaf workflows back to them.
- **DOC-02** separates decisions here from observed facts in Repository Evidence.

implements: [Awesome Guidelines Integration](Awesome%20Guidelines%20Integration.md)

Related: [AI Agent Context](AI%20Agent%20Context.md) · [Repository Evidence](Repository%20Evidence.md) · [Guideline ledger](Awesome%20Guidelines%20Integration.md)
