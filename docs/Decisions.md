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

## Guideline Basis

- **AGENT-03** ensures adapter workflows stop rather than invent authorization.
- **PG-05** defers tools and architecture until a demonstrated need and repository evidence exist; D7 met that bar by explicit request.
- **SEC-05** places the D7 and D8 trust boundary in the database, where row-level security is enforced, not in the interface.
- **MD-04** keeps decisions canonical and links leaf workflows back to them.
- **DOC-02** separates decisions here from observed facts in Repository Evidence.

implements: [Awesome Guidelines Integration](Awesome%20Guidelines%20Integration.md)

Related: [AI Agent Context](AI%20Agent%20Context.md) · [Repository Evidence](Repository%20Evidence.md) · [Guideline ledger](Awesome%20Guidelines%20Integration.md)
