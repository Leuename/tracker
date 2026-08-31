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

## Guideline Basis

- **AGENT-03** ensures adapter workflows stop rather than invent authorization.
- **PG-05** defers tools and architecture until a demonstrated need and repository evidence exist; D7 met that bar by explicit request.
- **SEC-05** places the D7 and D8 trust boundary in the database, where row-level security is enforced, not in the interface.
- **MD-04** keeps decisions canonical and links leaf workflows back to them.
- **DOC-02** separates decisions here from observed facts in Repository Evidence.

implements: [Awesome Guidelines Integration](Awesome%20Guidelines%20Integration.md)

Related: [AI Agent Context](AI%20Agent%20Context.md) · [Repository Evidence](Repository%20Evidence.md) · [Guideline ledger](Awesome%20Guidelines%20Integration.md)
