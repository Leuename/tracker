---
title: Exchange Rates Proposal
tags: [proposal, fx, transfers, erp, tracker, supabase]
created: 2026-09-02
status: awaiting approval
related:
  - "[Open Problems and Proposals](Open%20Problems%20and%20Proposals.md) — item 1, which this replaces in full"
  - "[Decisions](Decisions.md) — D21 and D22 govern transfers and their totals"
  - "[Everything Held Back, Built](../handoff/2026-09-02%20Everything%20Held%20Back,%20Built.md) — the current handoff"
up: "[AI Agent Context](AI%20Agent%20Context.md)"
---

# Exchange Rates Proposal

Re-proposed on request, standalone. This replaces item 1 of
[Open Problems and Proposals](Open%20Problems%20and%20Proposals.md); read this one.

## The situation, as of this afternoon

Nine telegraphic transfers were entered this morning. At **10:32 UTC — 18:32 Manila, a few hours
ago — six of them were marked `released`.** Real money has moved.

| Status | Currency | Wires | Amount |
|---|---|---:|---:|
| Released | EUR | 2 | 161,500.00 |
| Released | USD | 3 | 399,531.10 → *241,676.10 released* |
| Released | GBP | 1 | 4,290.00 |
| Pending | EUR | 1 | 100,000.00 |
| Pending | USD | 2 | 157,855.00 |

Converted by the app's own table, the two figures above the transfer sheet now read:

```
Pending    ₱15,455,590.00
Released   ₱24,509,173.80
                          ₱39,964,763.80 across the sheet
```

Every peso of that is produced by five numbers written into a source file:

```js
// apps/web/src/logic.js:259
export const TRANSFER_RATES = { PHP: 1, USD: 58, GBP: 74, EUR: 63, AUD: 38 }
```

No date. No source. No way to change them without a deploy. **If they are 5% off, the sheet is
₱2.0M wrong.** For comparison, the entire rest of the ledger — every payable in `txns` — is
₱226,000.00. The screen driven by constants is now **177 times** the screen driven by data.

## The answer to your question, and why it is only half an answer

An exchange-rate API is the right upgrade. It is not the whole fix, and used alone it makes one
thing worse.

Two different problems wear the same symptom:

**Stale defaults.** Today's rate is a guess inherited from a prototype. Nobody has checked it
against a bank. *An API fixes this completely.*

**Revalued history.** A wire released this morning should be worth what this morning's rate said —
in a month, in a year, when somebody reconciles it. With a live API and nothing stored on the row,
**every wire on the sheet re-prices itself whenever the peso moves.** Last week's released
transfer quietly changes value overnight. *An API makes this worse,* because the numbers now move
daily instead of never. Today's staleness is at least stable.

So: **the API supplies the rate; the row remembers it.** The API is the part
[Decisions](Decisions.md) D22 did not anticipate; the stored rate is the part D22 named and
deferred. They are not alternatives, and doing only the first is the one combination that is
worse than doing nothing.

## Two constraints that decide the shape

**The browser cannot call a rate API.** The deployed Content-Security-Policy is:

```
connect-src 'self' https://jusifpditdigqdjiwdaj.supabase.co wss://jusifpditdigqdjiwdaj.supabase.co
```

Verified again in today's security run, which passes 7 of 7 header checks. A `fetch()` from the
app to any other origin is blocked, and blocked *silently* — no error a user would report.
Allowing one means widening a control the probe measures, on a page that holds the whole ledger.

**A key in the bundle is not a key.** Vite ships every `VITE_`-prefixed variable to the browser,
and D9 forbids anything there but the two public Supabase values. A keyed API called from the
client publishes its key to anyone who opens the page source.

Both constraints point one way: **fetch it server-side, store it in Postgres, and let the app read
it the way it reads everything else.** No CSP change, no key in the bundle, and rates gain a date
and a provenance — which is the actual problem.

## The proposal

### 1. A table for rates

```sql
create table public.fx_rates (
  cur        text        not null,
  as_of      date        not null,
  rate       numeric(18,6) not null,
  source     text        not null,
  fetched_at timestamptz not null default now(),
  primary key (cur, as_of)
);
```

A new table takes all five obligations it does not inherit, none of which are optional:
`revoke all from anon, authenticated` then grant back only `select` (D25 — `revoke insert, update,
delete` leaves TRUNCATE behind, and RLS does not restrict TRUNCATE); a `for select` policy;
an entry in `TABLES` in `apps/web/scripts/backup.mjs`; its own security-probe checks; and its own
`log_change()` trigger.

**No client write policy at all.** Only the scheduler writes rates, as `postgres` or through a
dedicated function — a rate a user can edit is not a rate, for the same reason a role a user can
edit is not a role (D29).

### 2. The scheduler fetches them

`.github/workflows/schedule.yml` already runs daily and already signs in as an administrator
(D31). It gains one step: fetch today's rates, upsert one row per currency. One call a day fits
inside every free tier, no key ever reaches a browser, and a failed fetch turns the run red rather
than leaving a stale number on screen pretending to be current.

**Provider: `frankfurter.app`, recommended.** European Central Bank reference rates. No API key,
no account, no signup. PHP, USD, GBP, EUR and AUD all published. Daily.

The reason to prefer it is not the data — several free APIs are fine — it is that **no key means
no secret to store, leak, or rotate.** This project has already burned one credential by putting
it in the wrong argument position, and rotation is deferred by you. A design that needs no key
cannot repeat that. `exchangerate.host` and `open.er-api.com` are the keyed alternatives if ECB's
once-a-day fix turns out to be too coarse.

### 3. The wire remembers its rate

```sql
alter table public.transfers
  add column rate    numeric(18,6),
  add column rate_at timestamptz;
```

`rate` is set by the client. `rate_at` is **server-managed and must be left out of the
`authenticated` column grant**, exactly as `created_at` is — D23 exists because a table shipped
for thirty seconds with that mistake, and the check that found it was reading
`information_schema.role_column_grants` afterwards rather than trusting the migration's
`{"success": true}`.

### 4. One function, three fallbacks

`inPesos` in `apps/web/src/logic.js` prefers the rate stored on the wire, falls back to the newest
`fx_rates` row for that currency, and falls back again to `TRANSFER_RATES`. The constants stay, as
the last resort rather than the only resort.

The consequence worth stating: **nothing on screen moves on the day this deploys.** The nine
existing wires have no stored rate and no `fx_rates` row older than deployment, so they land on
the constants and read exactly what they read today. Any change to those figures is then a
decision somebody makes, not a side effect of shipping.

### 5. The strip shows the date

`Pending ₱15,455,590.00 · at ECB rates of 2 Sep 2026`. A number whose provenance is invisible is
how this started. With a date on it, a stale rate looks stale.

The screen keeps saying the totals are indicative. A stored rate makes them **reproducible**, not
audited — a real accounting figure needs a bank's advice, not a reference rate.

## Cost

One migration, one workflow step, one changed function, two form fields, unit tests on the
fallback chain, and a probe check proving `rate_at` is refused from a client. One working pass —
the API adds a step to the plan, not a project.

## What this deliberately does not do

- **No backfill.** The nine existing wires keep the value they have today unless you say
  otherwise, because only you know what rate they were actually sent at.
- **No intraday rates.** ECB publishes once a working day. A wire sent Saturday takes Friday's
  rate, and that is the normal convention rather than a gap.
- **No accounting claim.** The screen still says indicative, because a reference rate is not the
  rate a bank charged.

## The three questions

Approval alone does not unblock this. Each of these changes what gets built.

**1. Provider — keyless or keyed?**
Recommend `frankfurter.app`, no key. The alternative is a keyed provider with more frequent
updates, which means a secret in GitHub Actions and something else to rotate. *If you have no
preference, I will take frankfurter.*

**2. May a person override the rate on the form?**
- **Yes:** the form defaults to today's fetched rate and anyone can type over it, so a wire sent at
  a bank's actual rate can record that rate. Truer figures, and one more field to get wrong.
- **No:** the fetched rate is authoritative and the field is read-only. Simpler, and it means a
  wire sent at a materially different rate is recorded wrongly with no way to correct it.

*Recommend yes, editable.* Six wires released this morning were sent at some bank's real rate, not
at the ECB's, and the person entering them is the only one who knows it.

**3. Backfill the nine existing wires?**
- **No (default):** they stay on the constants. Nothing moves, nothing is claimed.
- **Yes:** you supply the rate each of the six released wires was actually sent at, and I stamp
  them. The three still pending can take the fetched rate when they are released.

*This is the one I cannot answer for you at all.* Without the real numbers, a backfill would be
inventing figures for money that has already moved — which is worse than leaving them on constants
that are at least honestly labelled.

## Guideline Basis

- **PG-02** ties every figure here to a file path or a query run today, with no invented commands.
- **PG-04** names the check behind each claim; the totals were recomputed from the live rows, not carried forward.
- **PG-05** adds a table and a workflow step only because real cross-currency money is now on the screen.
- **DOC-02** keeps the observed state, the constraints, and the proposal separately labelled.
- **SEC-03** is why the recommended provider is the one that needs no credential at all.

implements: [Awesome Guidelines Integration](Awesome%20Guidelines%20Integration.md)

Related: [Open Problems and Proposals](Open%20Problems%20and%20Proposals.md) · [Decisions](Decisions.md) · [Repository Evidence](Repository%20Evidence.md) · [AI Agent Context](AI%20Agent%20Context.md)
