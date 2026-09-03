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
| `npm test` | `node --test src/logic.test.js src/rows.test.js src/errors.test.js scripts/rewind-plan.test.js` — 53 assertions over the recurrence, period, row-mapping, error and rewind-plan rules. Runs offline. No test framework. |
| `npm run e2e` | 27 Playwright specs, behind a `setup` project that signs in once and saves the session. Needs `E2E_EMAIL` and `E2E_PASSWORD`; `E2E_BASE_URL` points them at a deployment. Without them the suite **skips and exits 0** — set `E2E_REQUIRE_CREDENTIALS=1` to make that a failure instead. They write to the shared ledger, so `playwright.config.js` pins `workers: 1` — `fullyParallel: false` alone only serialises within a file. |
| `npm run security` | 47-check security probe against Supabase and the deployment. Checks named in `DEFERRED` still run and print, tagged `DEFER`, without failing the suite; that list is empty today, so all 47 pass. A green run is not proof on its own — read the deferred count. |
| `npm run schedule` | Generates this month's recurring payables and reports what is overdue. Signs in as an administrator and **writes to the ledger**, so it needs `SCHEDULE_EMAIL` and `SCHEDULE_PASSWORD`. Idempotent — `buildGeneratedRows` skips a payable that already exists. `npm run schedule -- --dry-run` reports what it would do and writes nothing. |
| `npm run backup` | Snapshot every table into `backups/`, paging past PostgREST's 1,000-row cap and asserting the count. Reads only; needs `BACKUP_EMAIL` / `BACKUP_PASSWORD`. Run nightly by `.github/workflows/backup.yml`. |
| `npm run rewind -- --since <ISO>` | Reconstruct the ledger as it stood at any second, from `audit_log`. Writes nothing to the database — it prints the plan and emits a `.sql` file to apply as `postgres`. Generated plans are git-ignored; they carry whole rows in plain text. |
| `npm run smoke` | End-to-end check against the live Supabase project. Needs the network and `SMOKE_EMAIL` / `SMOKE_PASSWORD` for one of the issued accounts. It writes to the shared ledger, so run it before real data goes in. |

## Configuration

Copy `.env.example` to `.env.local`. The two the app itself needs:

| Variable | Is |
|---|---|
| `VITE_SUPABASE_URL` | The project's API URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The publishable (`sb_publishable_…`) key. |

Both ship inside the browser bundle by design. Row access is enforced by row-level security
policies in the database, not by keeping the key secret. **Never put the `service_role` or any
secret key in this file** — Vite sends every `VITE_`-prefixed variable to the client.

The scripts need credentials of their own, which are **not** `VITE_`-prefixed and never reach the
bundle. `.env.example` names them; put the values in `.env.local`, which is git-ignored.

| Variable | For | Privilege |
|---|---|---|
| `SCHEDULE_EMAIL` / `SCHEDULE_PASSWORD` | `npm run schedule` | An administrator. The scheduler **writes** to the ledger; a viewer account makes the run go red with `42501`. |
| `BACKUP_EMAIL` / `BACKUP_PASSWORD` | `npm run backup` | Any account. The backup only reads, through RLS. |
| `E2E_EMAIL` / `E2E_PASSWORD` | `npm run e2e` | An issued account. |

Try the scheduler without touching anything:

```bash
SCHEDULE_EMAIL=… SCHEDULE_PASSWORD=… npm run schedule -- --dry-run
```

**There is no fallback between these credentials, deliberately.** `.github/workflows/schedule.yml`
maps `SCHEDULE_EMAIL`/`SCHEDULE_PASSWORD` from the `BACKUP_EMAIL`/`BACKUP_PASSWORD` repository
secrets, so today one account does both jobs — but that is a mapping written down in the workflow,
not a default in the code. A code-level fallback would hide the fact that one of these credentials
writes to a live financial ledger and the other does not.

### The Playwright sign-in state, and why a trace is a credential

`E2E_PASSWORD` is typed exactly once per run, by the `setup` project in
`e2e/auth.setup.js`, which is the one project with `trace: 'off'`. Every other spec starts from
the session it saves and never touches the form. Two in `app.spec.js` are the deliberate
exceptions — the gate spec and the wrong-password spec, whose whole purpose is the form; they
override the saved state with an empty one, and the wrong-password spec types a literal.

**The saved state file is itself a credential.** It holds an access token and a refresh token in
cleartext, so it is written under `test-results/`, which both `.gitignore` files already cover.
Do not move it somewhere a commit can reach, and do not attach one to anything.

**A Playwright trace is a credential until proven otherwise: never attach one to an issue, a pull
request or a message.** A trace records every `fill()` value verbatim alongside screenshots of the
form, and Playwright has no evidenced way to redact one input while keeping the rest of the trace —
so this is a discipline, not a setting. `trace: 'retain-on-failure'` stays on, because a trace is
how a failure against a live ledger gets diagnosed; what changed is that the password no longer
enters one.

## Deployment

Pushed to `Leuename/tracker` (private) and deployed to
**https://tracker-six-flax.vercel.app**. A push to `main` deploys to production — there is no
staging environment.

`.env.production` is committed on purpose — both values are public by design and ship in the
bundle regardless. A `service_role` or any other secret key must never join them.

**The deploy runs behind a gate, not from Vercel's git integration.** `vercel.json` carries
`"git": { "deploymentEnabled": { "main": false } }`, so Vercel does not deploy pushes to `main`
itself; `.github/workflows/ci.yml` runs `npm ci`, `npm test`, `npm run build` and
`npm audit --audit-level=high`, and only then deploys with the Vercel CLI. GitHub checks cannot
gate Vercel, which is why the deploy had to move here rather than simply being reported on.
`VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are set as repository secrets and the gate
has run green.

The suites that write to the production ledger — `npm run e2e`, `npm run security`,
`npm run smoke` — are deliberately **not** in that gate. There is one Supabase project, and
`E2E_BASE_URL` changes which site the tests drive, not which database they hit. They run in
`.github/workflows/verify.yml`, nightly and on demand. Run `npm test` and `npm run build` before
you push regardless: the gate is a second check, not the first one.

## Persistence

Data lives in Supabase Postgres, in **one ledger shared by every account**. Five accounts exist
today: four administrators, so whatever one writes the others see, and one dedicated `viewer`
account that exists only to fetch exchange rates and can write nothing else in the schema.

| Table | Holds |
|---|---|
| `txns` | Tracker payables. |
| `receipts` | Acknowledgement receipts. |
| `recurring` | Masterlist rules. |
| `transfers` | Telegraphic transfers, and the rate each wire was actually valued at. |
| `app_config` | One shared `jsonb` row: notes, the company and category lists, and settings. |
| `fx_rates` | The daily ECB reference rate for USD, GBP, EUR and AUD, dated and sourced. |
| `audit_log` | Every insert, update and delete on the tables above, written by a trigger. |
| `profiles` | One row per account, carrying `admin` or `viewer`. |

Ids stay client-generated with `Date.now()`. Every table has row-level security on and `anon` is
revoked outright, because none of this data is public. The single
`for all to authenticated using (true)` policy the first migrations used is gone: reads are open
to any signed-in account, and **every write policy is predicated on `not is_viewer()`** —
seventeen of them across `txns`, `receipts`, `recurring`, `transfers`, `app_config` and
`storage.objects`.

**There is a real role, and it defaults closed.** `public.profiles` holds one row per account with
`admin` or `viewer`, and `is_viewer()` is a `security definer` function the policies call. An
account with **no** profile row reads as a viewer, so a missed row costs read-only access rather
than granting anything. `profiles` is readable but not writable from a client — an account that
can edit its own role has no role. Four accounts are `admin`; the fifth, the exchange-rates job's
own sign-in, is `viewer` — the first one this project has issued for real rather than by
demoting and promoting an administrator to prove the path.

`fx_rates` bends that rule one further step. Its two write policies do not gate on `is_viewer()`
at all — they name the rates account's uid directly, so no administrator can write a rate even
though every administrator can write everything else. A rate a user can edit is not a rate, for
the same reason a role a user can edit is not a role.

Self-serve registration stays disabled in the project's auth settings and accounts are created
from the Supabase dashboard. This app has no sign-up form, but the form was never the control; the
server setting is.

Writes are optimistic. A screen updates from the reducer immediately and the matching row is
sent afterwards; a failure raises a toast rather than rolling the screen back. Masterlist edits
and config changes are debounced, since both fire on every keystroke.

**Server-managed columns are enforced by grant, not convention.** `created_at`,
`app_config.updated_at` and `id` are not writable by a client — a probe proved a row could
otherwise be back-dated to 1999. One consequence to remember: **an update must not send the
primary key**, or the write is refused. `forUpdate()` in `src/rows.js` strips it, and
`rows.test.js` pins that.

**Receipt documents go to a private bucket.** Liquidation uploads land in `receipts` (10 MB,
images and PDF). Rows store the object key, never a URL; links are signed on demand and expire in
an hour. Turning on *Require a receipt file to liquidate* genuinely blocks a liquidation without
one.

**Expired sessions recover on their own.** Access tokens last an hour, and a tab left open past
that gets `401 PGRST303 JWT expired` — a hard failure rather than an empty result, because `anon`
holds no privilege here. Every query in `db.js` goes through `retryOnce`, which refreshes the
token once and repeats the request. If the refresh fails the session is really gone, so the app
signs out and shows the sign-in form instead of an error the user cannot act on.

**A new workspace starts empty.** It used to be filled with the prototype's 32 demo rows so the
app did not open blank; that was right for a demo and wrong once real payables went in, since
invented rows beside genuine ones are told apart only by their amounts. The demo data was cleared
on 2026-09-01 and the seed removed. `start()` in `src/db.js` still writes the config row, because
its absence is what marks a workspace as new.

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
| `e2e/auth.setup.js` | The `setup` project: signs in once per run with tracing off and saves the session, so no spec ever types the password into a trace. |
| `e2e/auth-state.js` | Where those saved sessions live, and why the file is a credential. |
| `e2e/app.spec.js` | Session and gate specs. Read-only. |
| `e2e/functional.spec.js` | Every write path, driven through the UI and then verified in Postgres. These do write, so they tag every row and sweep all `E2E-` tags before and after — a failed assertion must not leave residue in a live ledger. |
| `e2e/db.js` | Test-side database access and the cleanup sweep. |
| `security/probe.mjs` | The security probe. |
| `src/Auth.jsx` | The sign-in gate. Nothing below it renders without a session. Sign-in only — accounts are issued from the Supabase dashboard. |
| `src/store.jsx` | A `useReducer` accepting an object or updater patch — the prototype's `this.setState`, unchanged in shape — plus hydration and the debounced config save. |
| `src/actions.js` | Every mutation, in one hook. Screens read state and call these; nothing else writes. |
| `src/ui.jsx` | Modal shell, check, switch, select, and the shared period picker. |
| `src/screens/` | One file per screen. |
| `src/modals/` | The six overlays: add, edit, payment method, liquidate, add recurring, filters. |
| `src/styles.css` | The prototype's inline styles lifted into classes, so `:hover` and focus states work. |
| `src/assets/` | `tracker-background.jpg`, the photo behind the signed-in app and behind every add/edit dialog. EXIF stripped, since the built asset is public. |
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

- **Last write wins, and there are four people.** If two accounts edit the same
  row at once, one silently overwrites the other. Neither screen refreshes when the other writes;
  there is no conflict detection and no realtime subscription. A reload is the only way to see
  someone else's changes.
- **The audit trail is server-side only, and there is no screen for it.** `public.audit_log`
  records every insert, update and delete on all six tables through a `log_change()` trigger, and
  `npm run rewind -- --since <ISO>` reconstructs the ledger as it stood at any second from it.
  Nothing may delete from it, by design. What is missing is a way to read it in the app: rows
  still carry `created_at` and no `updated_by`, so "who changed this row" is a database query, not
  something a screen answers.
- **The scheduler generates, but only half-notifies.** `npm run schedule` runs daily from
  `.github/workflows/schedule.yml`, generates this month's recurring payables through the same
  `buildGeneratedRows` the Generate button uses, and reports what is overdue. The reporting
  channel is the GitHub Actions job summary and nothing else — there is no email or SMS provider
  on this project, so "notify a holder after 14 days" still has no way to reach a person.
- **One environment.** Production is the only deployment and the Supabase project behind it is the
  only database, so `npm run e2e`, `npm run security` and `npm run smoke` all write to the real
  ledger. `E2E_BASE_URL` changes which site the tests drive, not which database they hit.
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

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)

Related: [Repository Evidence](../../docs/Repository%20Evidence.md) · [Decisions](../../docs/Decisions.md) · [Handoff](../../docs/Handoff.md) · [company_tracker scope](../../company_tracker/AGENTS.md)

## Response headers

`vercel.json` sets the headers Vercel does not provide by default. They were added because a
security probe found all four missing, not on principle:

| Header | Stops |
|---|---|
| `Content-Security-Policy` | A script from anywhere but this origin, and any framing at all. `style-src` allows `'unsafe-inline'` because the app uses React `style` attributes; scripts have no such exemption. |
| `X-Frame-Options: DENY` | Clickjacking, for anything that predates `frame-ancestors`. |
| `X-Content-Type-Options: nosniff` | A response being reinterpreted as a script. |
| `Referrer-Policy` | The app's URL leaking to third parties in full. |
| `Permissions-Policy` | Camera, microphone, geolocation, payment and USB, none of which this app uses. |
| `Cross-Origin-Opener-Policy` | A cross-origin opener keeping a handle on this window. |

`connect-src` names the Supabase project explicitly. **Point the app at a different project and
this header has to change with it**, or every query is blocked with no error in the UI.
