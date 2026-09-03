/**
 * Fetch the day's exchange rates and store them: `npm run fx`.
 *
 *   FX_EMAIL=… FX_PASSWORD=… npm run fx
 *   npm run fx -- --dry-run      # fetch and report, write nothing
 *
 * Why this exists: until 2026-09-03 every cross-currency figure on the transfer
 * sheet came from five constants in `src/logic.js` with no date and no source.
 * Measured against the ECB fix they ran 7% to 15% low, understating a
 * ₱39.96M sheet by ₱4.32M. See docs/Exchange Rates Proposal.md.
 *
 * ## Why a separate job from `schedule.mjs`
 *
 * Different cadence and, more importantly, a different identity. `schedule.mjs`
 * signs in as an administrator because it writes payables. This one must NOT be
 * able to do that: it signs in as a dedicated account whose `profiles.role` is
 * `viewer`, so `is_viewer()` refuses it on every table in the ledger, and one
 * policy naming its uid lets it write `fx_rates` and nothing else. If this
 * credential leaks it can do strictly less than any human account.
 *
 * ## Why the browser does not do this
 *
 * The deployed CSP is `connect-src 'self' + the Supabase origin`. A fetch from
 * the app to any other host is blocked, and blocked silently. Rates are fetched
 * here, stored in Postgres, and read by the app the way it reads everything
 * else — no CSP change, and no API key in a bundle Vite ships to the browser.
 *
 * ## The provider
 *
 * frankfurter.dev — ECB reference rates, no API key, no account. Chosen because
 * no key means no secret to store, leak or rotate.
 *
 * One call with `base=EUR`, because EUR is what the ECB actually publishes
 * against. Every other pair is derived by division from those native figures
 * rather than by inverting a rounded PHP-based response, which loses precision.
 *
 * ## The rates are one working day old, deliberately
 *
 * The ECB publishes once per working day at about 16:00 CET — 14:00 UTC, 22:00
 * in Manila. This job runs at 10:00 and 16:00 Manila (02:00 and 08:00 UTC), so
 * BOTH runs land before that day's publication and both see the previous
 * working day's fix. That is the owner's decision, taken knowingly: a T+1
 * reference rate is a normal convention, and the second run is a retry that
 * repairs a failed first one within six hours rather than a second number.
 *
 * Consequently `as_of` is what the API says it is, never today's date. The
 * response carries the date it resolved to — ask for a weekend and it answers
 * with Friday — and that is the value stored and shown on screen.
 */
import { supabase } from '../src/supabase.js'

const dryRun = process.argv.includes('--dry-run')
const email = process.env.FX_EMAIL
const password = process.env.FX_PASSWORD
if (!email || !password) {
  console.error('Set FX_EMAIL and FX_PASSWORD to the rates account on this project.')
  process.exit(2)
}

// PHP is not stored. It is 1 by definition, and `TRANSFER_RATES.PHP` already
// says so; a row asserting that a peso is worth a peso is noise in a table
// whose whole purpose is provenance.
const WANTED = ['USD', 'GBP', 'EUR', 'AUD']
const SOURCE = 'ECB via frankfurter.dev'
const API = 'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=PHP,' + WANTED.join(',')

const fail = (msg) => { console.error(msg); process.exit(1) }

// ---- fetch -----------------------------------------------------------
// A failed fetch exits non-zero so the run goes red. A stale number left on
// screen pretending to be current is the failure mode this whole job exists to
// remove, so it must never be the quiet outcome of a broken fetch.
let payload
try {
  const res = await fetch(API, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) })
  if (!res.ok) fail('Rate API answered HTTP ' + res.status)
  payload = await res.json()
} catch (e) {
  fail('Could not reach the rate API: ' + e.message)
}

const asOf = payload && payload.date
const perEur = (payload && payload.rates) || {}
if (!asOf || !perEur.PHP) fail('Rate API returned no date or no PHP rate: ' + JSON.stringify(payload).slice(0, 200))

/**
 * Units of `cur` per one EUR.
 *
 * **The API omits the base currency from `rates`.** Asking for `base=EUR` with
 * EUR among the symbols returns no EUR key at all, because one euro is one euro
 * — so reading `perEur.EUR` gives undefined, `PHP / undefined` gives NaN, and
 * the guard below would have quietly dropped EUR from every single run. EUR is
 * ₱18.9M of the sheet. Caught by asserting the derived EUR rate against the
 * ECB's own PHP figure, which must be identical.
 */
const perOneEur = (cur) => (cur === 'EUR' ? 1 : perEur[cur])

/**
 * Pesos per one unit of `cur`, from the ECB's EUR-based figures.
 *
 * PHP-per-EUR divided by cur-per-EUR. Rounded to six decimals to match the
 * column, which is far more precision than a reference rate carries but keeps
 * the stored value identical to the arithmetic rather than to a display format.
 */
const pesosPer = (cur) => Math.round((perEur.PHP / perOneEur(cur)) * 1e6) / 1e6

const rows = []
for (const cur of WANTED) {
  if (!perOneEur(cur)) {
    console.log('  ' + cur + ': not published for ' + asOf + ', leaving the previous row in place')
    continue
  }
  const rate = pesosPer(cur)
  // A rate that is not a positive finite number must never reach the table: it
  // would silently value a whole currency at nothing, or at NaN, on a screen
  // showing tens of millions of pesos.
  if (!Number.isFinite(rate) || rate <= 0) fail('Derived a nonsense rate for ' + cur + ': ' + rate)
  rows.push({ cur, as_of: asOf, rate, source: SOURCE })
}

// EUR is the one rate we can check rather than trust: pesos per euro IS the
// ECB's published PHP figure, so any drift means the derivation is wrong.
const eur = rows.find((r) => r.cur === 'EUR')
if (eur && Math.abs(eur.rate - perEur.PHP) > 1e-6) {
  fail('EUR derivation disagrees with the ECB PHP rate: ' + eur.rate + ' vs ' + perEur.PHP)
}
if (!rows.length) fail('The rate API published none of ' + WANTED.join(', '))

console.log('ECB fix of ' + asOf + ' (' + rows.length + ' of ' + WANTED.length + ' currencies)')
for (const r of rows) console.log('  1 ' + r.cur + ' = ₱' + r.rate)

// ---- store -----------------------------------------------------------
const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
if (authError) fail('Sign-in failed: ' + authError.message)

/**
 * Only write what actually changed.
 *
 * Both daily runs see the same ECB fix, so the second one would otherwise
 * re-upsert four identical rows every day. Every table here carries a
 * `log_change()` trigger, so that is ~3,650 audit rows a year recording that
 * nothing happened — against 1,389 rows of real history today. Comparing first
 * keeps the retry genuinely idempotent, in the audit log as well as in the data.
 */
const { data: existing, error: readError } = await supabase
  .from('fx_rates').select('cur, rate').eq('as_of', asOf).in('cur', WANTED)
if (readError) fail('Could not read the existing rates: ' + readError.message)

const before = new Map((existing || []).map((r) => [r.cur, Number(r.rate)]))
const changed = rows.filter((r) => before.get(r.cur) !== r.rate)

if (!changed.length) {
  console.log('\nAlready stored for ' + asOf + ' — nothing to write.')
} else if (dryRun) {
  console.log('\nWould write ' + changed.length + ' row(s): ' + changed.map((r) => r.cur).join(', '))
} else {
  /**
   * Insert new rows, and UPDATE the rest by (cur, as_of) rather than
   * `.upsert()`.
   *
   * `upsert()` compiles to `INSERT … ON CONFLICT DO UPDATE SET` naming every
   * column in the payload, `cur` and `as_of` included. The migration granted
   * column-level UPDATE on only `(rate, source)` — deliberately, so a client
   * cannot rewrite what a rate is FOR, only what it IS — and Postgres checks
   * privilege on every column named in a SET clause even when the value is
   * unchanged. `upsert()` therefore fails 42501 against this schema by design,
   * not by accident: "permission denied for table fx_rates", with Postgres's
   * own hint asking for a table-wide UPDATE grant this migration intentionally
   * withheld. A plain `.update()` naming only `rate` and `source` asks for
   * exactly the privilege that was actually granted.
   */
  const toInsert = changed.filter((r) => !before.has(r.cur))
  const toUpdate = changed.filter((r) => before.has(r.cur))

  if (toInsert.length) {
    const { error } = await supabase.from('fx_rates').insert(toInsert)
    if (error) fail('Could not insert new rates: ' + error.message)
  }
  for (const r of toUpdate) {
    const { error } = await supabase.from('fx_rates')
      .update({ rate: r.rate, source: r.source }).eq('cur', r.cur).eq('as_of', r.as_of)
    if (error) fail('Could not update the rate for ' + r.cur + ': ' + error.message)
  }

  // The write is only believable if it reads back. A refused policy and a
  // successful no-op are indistinguishable from the client's side otherwise:
  // both come back without an error.
  const { data: after, error: backError } = await supabase
    .from('fx_rates').select('cur, rate').eq('as_of', asOf).in('cur', changed.map((r) => r.cur))
  if (backError) fail('Could not read the rates back: ' + backError.message)

  const stored = new Map((after || []).map((r) => [r.cur, Number(r.rate)]))
  const missing = changed.filter((r) => stored.get(r.cur) !== r.rate)
  if (missing.length) {
    fail('Wrote ' + changed.length + ' row(s) but ' + missing.map((r) => r.cur).join(', ') +
      ' did not come back with the value written. The policy may be refusing this account.')
  }
  console.log('\nStored ' + changed.length + ' row(s) for ' + asOf + ': ' + changed.map((r) => r.cur).join(', '))
}

// scope: 'local' — a global sign-out revokes every refresh token this account
// holds, which would kill the other daily run's session mid-flight.
await supabase.auth.signOut({ scope: 'local' })
console.log(dryRun ? 'fx dry run complete' : 'fx complete')
