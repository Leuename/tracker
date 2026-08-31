---
title: Web ERP Application
tags: [apps-web, erp, react, vite, supabase, authored-source]
status: active
implements: ERP Prototype.dc.html
---

# Web ERP Application

A React + Vite implementation of `company_tracker/ERP Prototype.dc.html`. This is **authored
source**, not a Design Component export — it is the first checked-in application in this
repository, and it fills the `apps/web` gap reported in
[company_tracker/AGENTS.md](../../company_tracker/AGENTS.md).

The export it derives from stays untouched. Nothing here reads, patches, or re-runs
`support.js`, `_ds_bundle.js`, or any `.dc.html` file at runtime.

## Commands

Every command below is backed by `package.json` in this directory.

| Command | Does |
|---|---|
| `npm install` | Installs React 18.3.1, ReactDOM 18.3.1, supabase-js 2 and Vite 5. |
| `npm run dev` | Development server on http://localhost:5173. |
| `npm run build` | Production bundle into `dist/`. |
| `npm run preview` | Serves the built bundle. |
| `npm test` | `node --test src/logic.test.js src/rows.test.js` — 22 assertions over the recurrence, period and row-mapping rules. Runs offline. No test framework. |
| `npm run e2e` | Playwright specs in a real browser. Needs `E2E_EMAIL` and `E2E_PASSWORD`; set `E2E_BASE_URL` to run them against a deployment instead of a local dev server. |
| `npm run smoke` | End-to-end check against the live Supabase project. Needs the network and `SMOKE_EMAIL` / `SMOKE_PASSWORD` for one of the two issued accounts. It writes to the shared ledger, so run it before real data goes in. |

## Configuration

Copy `.env.example` to `.env.local` and fill in both values:

| Variable | Is |
|---|---|
| `VITE_SUPABASE_URL` | The project's API URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The publishable (`sb_publishable_…`) key. |

Both ship inside the browser bundle by design. Row access is enforced by row-level security
policies in the database, not by keeping the key secret. **Never put the `service_role` or any
secret key in this file** — Vite sends every `VITE_`-prefixed variable to the client.

## Deployment

Pushed to `Leuename/tracker` (private) and deployed by Vercel to
**https://tracker-six-flax.vercel.app** on every push to `main`.

`.env.production` is committed on purpose — both values are public by design and ship in the
bundle regardless. A `service_role` or any other secret key must never join them.

**There is no gate between a push and production.** No CI, no staging branch. `npm test`,
`npm run e2e`, and `npm run build` are the checks, and they have to pass *before* you push,
because nothing runs them afterwards.

## Persistence

Data lives in Supabase Postgres, in **one ledger shared by both accounts** — an admin and an
executive, with equal powers. Whatever one writes, the other sees.

| Table | Holds |
|---|---|
| `txns` | Tracker payables. |
| `receipts` | Acknowledgement receipts. |
| `recurring` | Masterlist rules. |
| `app_config` | One shared `jsonb` row: notes, the company and category lists, and settings. |

Ids stay client-generated with `Date.now()`. Every table has row-level security on with one
policy — `for all to authenticated using (true) with check (true)` — and `anon` is revoked
outright, because none of this data is public.

**Being signed in is the whole of the authorization.** That is safe only because self-serve
registration is disabled in the project's auth settings and the two accounts are created from the
Supabase dashboard. This app has no sign-up form, but the form was never the control; the server
setting is. Re-enabling sign-up without first giving the policies a real predicate would let
anyone who registers read every payable and salary line. A narrower executive role, if one is
ever wanted, belongs in those predicates — not in a hidden button.

Writes are optimistic. A screen updates from the reducer immediately and the matching row is
sent afterwards; a failure raises a toast rather than rolling the screen back. Masterlist edits
and config changes are debounced, since both fire on every keystroke.

**Expired sessions recover on their own.** Access tokens last an hour, and a tab left open past
that gets `401 PGRST303 JWT expired` — a hard failure rather than an empty result, because `anon`
holds no privilege here. Every query in `db.js` goes through `retryOnce`, which refreshes the
token once and repeats the request. If the refresh fails the session is really gone, so the app
signs out and shows the sign-in form instead of an error the user cannot act on.

**The first sign-in ever seeds the shared ledger** with the prototype's 32 demo rows, so the app
does not open blank. It runs once for the workspace, not once per account. Drop the `seed()` call
in `src/db.js` to start empty — worth doing before real payables go in, since once invented rows
are mixed with genuine ones only the amounts tell them apart.

## What it does

Five screens behind a fixed left rail, all sharing one in-memory store.

- **Dashboard** — five status tiles that total the payables, notes and reminders, and the next
  six deadlines. Every tile opens the Tracker already filtered to that status.
- **Tracker** — the payables sheet, grouped by company or category, with per-group subtotals,
  a filters drawer, search, inline "Mark as paid", and a full edit dialog.
- **AckRec** — acknowledgement receipts: cash released, and the difference once liquidated.
- **Masterlist** — recurring payables, editable in place, and the Generate action that expands
  them into Tracker rows for a chosen month.
- **Settings** — four tabs; the company and category lists feed every dropdown in the app.

## Layout

| Path | Holds |
|---|---|
| `src/data.js` | Constants and the seed rows, transcribed from the prototype. `TODAY` is frozen at `2026-08-30`, as the prototype froze it. |
| `src/logic.js` | Pure functions — recurrence expansion, period labels, currency and date formatting, row filtering. No React import, so `npm test` can call them directly. |
| `src/logic.test.js` | Covers all eight recurrence frequencies, the duplicate guard, period rendering and parsing, and the derived overdue status. |
| `src/supabase.js` | The client. Throws at boot if either environment variable is missing, rather than letting every query fail as a confusing 401. |
| `src/errors.js` | Tells a recoverable expired session apart from a real failure. Imports nothing, so it tests offline. |
| `src/rows.js` | Translation between the app's shapes (`desc`, `payType`, `dueDate`, `''` for no date) and the database's (`description`, `pay_type`, `due_date`, `NULL`). Imports nothing, so it tests offline. |
| `src/rows.test.js` | Round-trip assertions over that translation — the check that catches a lost check number or a blanked due date before a reload does. |
| `src/db.js` | Every query, and the first-run seed. |
| `src/smoke.mjs` | The live end-to-end check behind `npm run smoke`. |
| `e2e/app.spec.js` | Playwright specs. Read-only by design: there is one shared ledger and no test database, so a writing spec would edit the rows both users see. |
| `src/Auth.jsx` | The sign-in gate. Nothing below it renders without a session. Sign-in only — accounts are issued from the Supabase dashboard. |
| `src/store.jsx` | A `useReducer` accepting an object or updater patch — the prototype's `this.setState`, unchanged in shape — plus hydration and the debounced config save. |
| `src/actions.js` | Every mutation, in one hook. Screens read state and call these; nothing else writes. |
| `src/ui.jsx` | Modal shell, check, switch, select, and the shared period picker. |
| `src/screens/` | One file per screen. |
| `src/modals/` | The six overlays: add, edit, payment method, liquidate, add recurring, filters. |
| `src/styles.css` | The prototype's inline styles lifted into classes, so `:hover` and focus states work. |
| `src/tokens/` | `spacing.css` and `typography.css`, copied from the CraftUI CRM design-system export — the two token files the prototype itself links. |

### About the tokens

The prototype links the design system's `typography.css` and `spacing.css` but **not** its
`fonts.css` or `colors.css`. Those two unlinked files define `--font-ui` and `--text-primary`,
which `typography.css` depends on, so the kit's `.craft-*` classes resolve to nothing in the
export. `src/styles.css` defines both variables before importing the tokens, which is what makes
the 7px spacing rhythm and the type scale usable here.

The palette is the prototype's own plum scheme, not the design system's Zone-CRM green. That was
the prototype's choice; it is preserved rather than corrected.

## Behaviour worth knowing

- **Overdue is derived, never stored.** A row is overdue when it is `pending` and its due date is
  behind `TODAY`. No status write ever sets it.
- **Marking a row paid asks how.** Choosing Check requires a check number before the dialog will
  close; cancelling from the edit form rolls the status back to what it was.
- **Generate is safe to re-run.** A row already carrying the same company, category, period and
  description is skipped, and the banner reports how many were skipped. Undo removes only the
  rows that run created.
- **A recurrence rule can fire more than once a month.** Bi-monthly produces two dates; daily and
  weekly are capped at `MAX_OCC` (6) so one rule cannot flood a month. Multi-occurrence rows get
  the date appended to their description so the duplicate guard can tell them apart.

## Limits

- **Last write wins, and now there are two people.** If the admin and the executive edit the same
  row at once, one silently overwrites the other. Neither screen refreshes when the other writes;
  there is no conflict detection and no realtime subscription. A reload is the only way to see
  someone else's changes.
- **`TODAY` is still frozen** at `2026-08-30` in `src/data.js`, so completion dates written to
  the database carry that date rather than the real one. Persistence did not change this; it is
  now the more visible of the two.
- **No deployment.** The app runs from `npm run dev` or a locally served `dist/`. Nothing
  publishes it. See [Repository Evidence](../../Repository%20Evidence.md).
- **Two prototype affordances are still inert**, exactly as drawn: the "+ Add receipt" button
  raises a toast rather than a form, and the liquidation drop zone accepts no file.
- **Three settings are decorative.** `trkShowGrandTotal` and `trkOverdueRed` are wired;
  `trkGroupDefault` and the AckRec and Dashboard defaults are stored and shown but do not yet
  change behaviour. The prototype did not wire them either.

## Guideline Basis

- **PG-02** lets this file publish commands only because `package.json` in this directory backs
  every one of them.
- **PG-03** keeps this authored source separate from the read-only exports it was derived from.
- **JS-01** applies here for the first time: this is authored JavaScript, not generated output.
- **SEC-03** keeps the credentials in `.env.local`, which is git-ignored, and out of this file.
- **SEC-05** places the trust boundary at the database: row-level security, not client code,
  decides which rows an account can read or write.
- **MD-02** keeps every cross-reference path-qualified and locally resolvable.

implements: [Awesome Guidelines Integration](../../Awesome%20Guidelines%20Integration.md)

Related: [Repository Evidence](../../Repository%20Evidence.md) · [Decisions](../../Decisions.md) · [Handoff](../../Handoff.md) · [company_tracker scope](../../company_tracker/AGENTS.md)
