// Pure helpers ported from the prototype's DCLogic class. No React, no state —
// so `npm test` can exercise the recurrence and period rules directly.
import { MON, MAX_OCC, TAG, TODAY } from './data.js'

export const fmt = (n) => '₱' + Math.round(n).toLocaleString('en-US')

export const short = (n) => {
  if (n >= 1000000) return '₱' + (n / 1000000).toFixed(2) + 'M'
  if (n >= 1000) return '₱' + Math.round(n / 1000) + 'K'
  return fmt(n)
}

export const cap = (m) => m.charAt(0) + m.slice(1).toLowerCase()

/** '2026-08-24' -> 'Aug 24'. Empty date renders as an em dash. */
export const dstr = (d) => {
  if (!d) return '—'
  const p = d.split('-')
  return cap(MON[+p[1] - 1]) + ' ' + p[2]
}

/**
 * A lookup on a plain object, keyed by data the database does not constrain.
 *
 * `obj[key]` finds inherited members: `CSYM['constructor']` is the `Object`
 * constructor, not `undefined`, so it is truthy and defeats every `|| fallback`
 * written after it. The result is a function's source text rendered where a
 * currency symbol belongs.
 *
 * Round 32 fixed this in `tagOf`. Round 33's fix for a different defect then
 * wrote three fresh unguarded `CSYM[c]` lookups, and round 34 found them — along
 * with `curFmt`, which had carried the same hole since it was written and which
 * formats the amount on the transfer sheet. Hence one named helper rather than a
 * guard repeated at each site: the sites move, the class should not.
 *
 * `transfers.cur` is free text with no CHECK constraint, so a rogue value is
 * reachable by any PATCH, a restore, or a client that has been told otherwise.
 */
export const own = (obj, key) =>
  (obj != null && Object.prototype.hasOwnProperty.call(obj, key)) ? obj[key] : undefined

/**
 * The symbol for a currency, or nothing at all for one we do not know.
 *
 * Never the raw `CSYM[cur]`. See `own` above.
 */
export const symbolOf = (cur, syms) => own(syms, cur) ?? ''

/**
 * The colours and label for a row's status, for any status at all.
 *
 * `TAG[status]` is a lookup on a plain object and every screen used to do it
 * raw. `Telegraphic.jsx` guarded it with `|| TAG.pending`; `AckRec.jsx` and the
 * shared `Tag` in `ui.jsx` did not, so a receipt carrying any status the
 * dropdown does not offer threw `Cannot read properties of undefined (reading
 * 'bg')` out of render and **unmounted the whole application** — a blank page
 * that a reload does not fix, because the same row loads again. Round 31.
 *
 * `public.receipts.status` is `text` with no CHECK constraint, so the four
 * values are enforced by a `<select>` and nothing else: any PostgREST PATCH, a
 * restore from `backups/receipts.json`, or a value added to the database before
 * the UI knows it will do this. Defect family (d) — a guard on the client
 * instead of in the write.
 *
 * It deliberately does NOT fall back to `pending`. This is a money screen, and
 * labelling an unrecognised status as "Pending" states something false about a
 * receipt. The raw value is shown in a neutral chip instead, so the row stays
 * readable and the operator can see that something is wrong.
 */
export const tagOf = (status, tags = TAG) =>
  // `tags[status]` would be the very shape this function exists to remove: a
  // status of `constructor`, `toString`, `valueOf`, `hasOwnProperty` or
  // `__proto__` finds an inherited member, which is truthy, short-circuits the
  // fallback and yields an object with no `bg`, `fg` or `label` — an empty,
  // unstyled, unlabelled chip. "Cannot throw" was true; "always returns a
  // renderable chip" was not, until this guard. Round 32.
  own(tags, status)
  || { bg: '#EDEAEB', fg: '#9A8A90', label: String(status ?? 'Unknown') }

/**
 * A plain-string option list that can always display the value bound to it.
 *
 * The same rule as `statusOptions` below, for the lists that are arrays of
 * strings rather than `{v, label}` pairs — companies, categories, currencies,
 * frequencies. A `<select>` whose `value` matches no `<option>` does not error:
 * the DOM quietly selects index 0 and the control displays a different value
 * from the one the row holds.
 *
 * That is reachable for every one of those lists. `txns.co`, `txns.cat` and
 * `transfers.cur` are free text in the database with no CHECK constraint, and
 * the company and category lists live in `app_config` — `removeCompany` and
 * `removeCategory` do not check whether a row still uses the value. Delete a
 * company that rows reference and every one of those rows now displays the
 * first company in the list instead, on a screen that edits money.
 */
export const optionsWith = (value, options) =>
  (value == null || value === '' || (options || []).includes(value))
    ? (options || [])
    : [...(options || []), value]

/**
 * The options a status `<select>` must offer so it shows the truth.
 *
 * `tagOf` alone was not enough, and round 32 caught the gap: `AckRec` and
 * `Telegraphic` render the status as a `<select value={row.status}>`, not as a
 * chip, and they never read `tag.label`. When the value matches no `<option>`
 * the DOM falls back to `selectedIndex 0` — so a receipt whose status is
 * `archived` displayed **"Pending"**. That is precisely the false statement
 * [D85] said the design refused to make, made on a money screen, and it is
 * worse than the crash it replaced: a loud failure became a quiet misstatement.
 *
 * Appending the unrecognised value as its own option makes the control show
 * what the row actually holds. `tagOf` still greys it, so it reads as wrong
 * rather than as a fifth legitimate state.
 */
export const statusOptions = (status, known) =>
  known.some((s) => s.v === status)
    ? known
    : [...known, { v: status ?? '', label: String(status ?? 'Unknown') }]

/** Overdue is derived, never stored: a pending row past its due date. */
export const eff = (t, today = TODAY) => (t.status === 'pending' && t.due < today ? 'overdue' : t.status)

/** Strips currency formatting off a typed amount. NaN when nothing numeric is left. */

/**
 * A money amount off a form field.
 *
 * Strips currency symbols, commas and spaces, and **keeps a leading minus** so
 * a negative survives to be rejected. It used to strip the sign, which meant a
 * field reading `-50` was stored as `50`: the screen and the ledger disagreeing
 * with nothing in between to notice. Every caller that validates an amount
 * requires it to be greater than zero, so a negative now stops at the form
 * with a message instead of being laundered into a positive.
 *
 * Returns NaN for anything with no digits at all, which is what the `> 0`
 * checks read as "no amount given".
 */
export const amountOf = (v) => {
  const raw = String(v).trim()
  const n = parseFloat(raw.replace(/[^0-9.]/g, ''))
  return raw.startsWith('-') && Number.isFinite(n) ? -n : n
}

/**
 * A user-entered amount that is only valid when positive. NaN otherwise.
 *
 * Every writer that accepts a typed amount uses this rather than `amountOf`,
 * because `amountOf` deliberately preserves a negative so it can be caught —
 * and a caller testing `!amt` accepts a negative, since `-25` is truthy. That
 * combination is how a negative e-cash charge could reduce a payable and a
 * negative liquidation could be stored. One helper, so a new writer inherits
 * the guard instead of having to remember it.
 *
 * `amountOf` stays for intermediate arithmetic, where a negative is a signal
 * rather than an input.
 */
export const positiveAmountOf = (v) => {
  const n = amountOf(v)
  return n > 0 ? n : NaN
}

/**
 * The 'YYYY-MM' key a period label names — the inverse of `monthLabel`.
 *
 * This lived inline in `coverageFor` as `MON.indexOf(m[1])` until round 27.
 * `monthLabel` caps its output to 'Oct' while `MON` holds 'OCT', so `indexOf`
 * returned -1 for all twelve months, the key came out null, and the caller's
 * month filter was written to treat null as "no scope" — silently counting
 * every linked row of a payable, from every month, as coverage for the month
 * being generated. A monthly payable was generated once, ever.
 *
 * It throws instead of returning null, deliberately. The old failure was a
 * coverage filter that quietly matched everything, and under-generating a
 * payable is invisible: no screen contradicts it, because the Dashboard, the
 * sync bar and the nightly job all read this same function. Over-generating at
 * least hits a unique index. A label that cannot be parsed is a bug, and a bug
 * about money should stop rather than guess.
 */
export const monthKeyOf = (label) => {
  const m = String(label).match(/^([A-Za-z]{3}) (\d{4})$/)
  const i = m ? MON.indexOf(m[1].toUpperCase()) + 1 : 0
  if (!i) throw new Error('monthKeyOf: not a period label: ' + label)
  return m[2] + '-' + String(i).padStart(2, '0')
}

export const monthLabel = (key) => {
  const p = String(key).split('-')
  return cap(MON[+p[1] - 1]) + ' ' + p[0]
}

/** The 13 months the Generate menu offers, starting at the current one. */
export const monthKeys = (today = TODAY) => {
  const p = today.split('-')
  let y = +p[0]
  let m = +p[1]
  const out = []
  for (let i = 0; i < 13; i++) {
    out.push(y + '-' + String(m).padStart(2, '0'))
    m++
    if (m > 12) { m = 1; y++ }
  }
  return out
}

export const daysIn = (key) => {
  const p = key.split('-')
  return new Date(+p[0], +p[1], 0).getDate()
}

export const ord = (n) => {
  const s = n % 100
  if (s >= 11 && s <= 13) return n + 'th'
  return n + (['th', 'st', 'nd', 'rd'][n % 10] || 'th')
}

export const weekday = (d) =>
  ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(d + 'T00:00:00').getDay()]

/** Plain-English restatement of a recurrence, shown under the due-date field. */
export const ruleLabel = (freq, date) => {
  if (!date) return 'pick a due date'
  const day = +date.split('-')[2]
  switch (freq) {
    case 'Once': return 'once, on ' + dstr(date)
    case 'Daily': return 'every day'
    case 'Weekly': return 'every ' + weekday(date)
    case 'Bi-weekly': return 'every other ' + weekday(date)
    case 'Bi-monthly': return day + 15 > 28 ? ord(day) + ' & month-end' : ord(day) + ' & ' + ord(day + 15) + ' of the month'
    case 'Quarterly': return ord(day) + ', every 3 months'
    case 'Yearly': return dstr(date) + ', once a year'
    default: return ord(day) + ' of the month'
  }
}

/** Every due date a recurring payable lands on inside one month. */
export const occurrences = (p, monthKey) => {
  const y = +monthKey.slice(0, 4)
  const m = +monthKey.slice(5, 7)
  const dim = daysIn(monthKey)
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(String(p.dueDate || '')) ? p.dueDate : monthKey + '-15'
  const am = +anchor.slice(5, 7)
  const ay = +anchor.slice(0, 4)
  const ad = +anchor.slice(8, 10)
  const mk = (d) => monthKey + '-' + String(Math.max(1, Math.min(dim, d))).padStart(2, '0')
  const day = Math.min(dim, ad)
  switch (p.freq) {
    case 'Once':
      return anchor.slice(0, 7) === monthKey ? [anchor] : []
    case 'Daily': {
      const out = []
      for (let d = 1; d <= dim && out.length < MAX_OCC; d++) out.push(mk(d))
      return out
    }
    case 'Weekly':
    case 'Bi-weekly': {
      // Stepped from the anchor date itself, not from the first matching
      // weekday of each month.
      //
      // The old version found the first weekday matching the anchor and stepped
      // from there, which is right for a 7-day cadence and wrong for a 14-day
      // one: the phase reset every month. A Bi-weekly payable due Fri 11 Sep
      // generated the 4th and the 18th — never the date the owner actually
      // entered — and produced a 7-day gap across a month boundary, so "every
      // other Friday" silently became weekly for one cycle.
      //
      // Arithmetic in UTC on purpose. Local-time date maths crosses a DST
      // boundary badly, and `addDays` in this file already learned that.
      const step = (p.freq === 'Weekly' ? 7 : 14) * 86400000
      const anchorMs = Date.UTC(ay, am - 1, ad)
      const first = Date.UTC(y, m - 1, 1)
      const skip = Math.ceil((first - anchorMs) / step)
      const out = []
      for (let t = anchorMs + skip * step; out.length < MAX_OCC; t += step) {
        const iso = new Date(t).toISOString().slice(0, 10)
        if (iso.slice(0, 7) !== monthKey) break
        out.push(iso)
      }
      return out
    }
    case 'Bi-monthly': {
      const second = Math.min(dim, day + 15)
      return second === day ? [mk(day)] : [mk(day), mk(second)]
    }
    case 'Quarterly': {
      const diff = (y - ay) * 12 + (m - am)
      return (((diff % 3) + 3) % 3) === 0 ? [mk(day)] : []
    }
    case 'Yearly':
      return m === am ? [mk(day)] : []
    default:
      return [mk(day)]
  }
}

/**
 * Is this occurrence already on the sheet?
 *
 * Keyed on the payable and the due date whenever a row records its parent,
 * because a description is not stable: the Masterlist pushes an edited
 * description down onto its open rows, and the old description-based key then
 * stopped matching — so re-running Generate wrote duplicates of rows already on
 * the ledger, and the Tracker's sync line counted them as missing.
 *
 * Rows with no parent — hand-entered, or generated before `src` existed — keep
 * the original key, so nothing already on the ledger stops deduplicating.
 *
 * `buildGeneratedRows` and `forecast` both call this. They have to agree
 * exactly: the sync line promises "what Generate would write", and one rule is
 * the only way that stays true.
 */
/**
 * Rows already on the sheet for this payable and month, and which of them still
 * sit on one of its occurrences.
 *
 * The old rule asked only "is there a linked row with exactly this due date",
 * which is also the key of the D63 unique index — so the index could not catch
 * what the index and the client agreed to disagree about. **Move a generated
 * row's due date and the original occurrence looks missing again**, so the
 * unattended 22:00 job re-created it: one ₱5,000 bill, ₱10,000 of liability,
 * reported as `Added 1 payable(s)`. The Dashboard and the Tracker sync line
 * invited a human to do the same thing by hand.
 *
 * A rescheduled row is still a row for that occurrence. Coverage is therefore
 * counted per payable per period: exact matches first, then any remaining
 * linked row covers a remaining occurrence.
 */
export const coverageFor = (existing, p, label) => {
  const linked = (existing || []).filter((t) => t.src != null && t.src === p.id)
  const unresolved = linked.filter((t) => !t.occurrenceDue)
  const month = monthKeyOf(label)
  const inMonth = linked.filter((t) => t.occurrenceDue && t.occurrenceDue.slice(0, 7) === month)
  const dues = new Set(inMonth.map((t) => t.occurrenceDue))
  return { dues, count: inMonth.length, unresolved, unresolvedIdentity: unresolved.length > 0 }
}

/**
 * The legacy path, for rows generated before `txns.src` existed and so carrying
 * no link back to the payable. Matched on the shape they were written with.
 *
 * `t.src == null` is the whole guard. This used to fall through to the shape
 * match for any row whose `src` was set but belonged to a *different* payable,
 * so two payables sharing a company, category, description and period silently
 * suppressed each other's generation. A linked row is accounted for by
 * `coverageFor`; only an unlinked one is matched on shape.
 */
export const alreadyOnSheet = (existing, p, label, due, desc) =>
  (existing || []).some((t) => t.src == null
    && t.co === p.co && t.cat === p.cat && t.period === label && t.desc === desc)

/**
 * Expands the masterlist into Tracker rows for one month.
 * An occurrence already on the sheet is skipped rather than duplicated, so
 * re-running Generate is safe. `alreadyOnSheet` owns that rule — it is not a
 * description match any more, because a description can be edited.
 */
/** The four states the Dashboard tiles partition by, and the Tracker filters on. */
export const TILE_KEYS = ['completed', 'pending', 'overdue', 'hold']

/**
 * Rows whose effective status is none of the four the tiles account for.
 *
 * The Dashboard prints "Payables is the total — the four beside it add up to
 * it." A row whose `eff` is outside `TILE_KEYS` counts in the total and in no
 * bucket, so that sentence becomes false by exactly that row's amount, silently.
 * Round 32 measured it: one injected row of PHP 1,234,567 put the total
 * 1,234,567 above the sum of the four, with the row absent from the Tracker
 * sheet as well and unreachable by any filter, because the status checkboxes
 * only offer the same four keys.
 *
 * Nothing the application writes can produce one — `status` is `text` with no
 * CHECK constraint, so a PostgREST PATCH, a restore, or a value added to the
 * database ahead of the UI can. The Dashboard names the discrepancy now rather
 * than printing a claim that is not true.
 */
export const unaccountedRows = (rows, today = TODAY) =>
  (rows || []).filter((t) => !TILE_KEYS.includes(eff(t, today)))

/**
 * The occurrences of one payable in one month that nothing on the sheet covers.
 *
 * `buildGeneratedRows` and `forecast` both need this and each used to compute
 * it inline. That is the shape of D67 and D68 — the sync line promises "what
 * Generate would write", and a rule added to one and not the other made the bar
 * offer a row Generate refused. One function now, so they cannot drift.
 */
export const uncoveredOccurrences = (existing, p, monthKey) => {
  const label = monthLabel(monthKey)
  const occ = occurrences(p, monthKey)
  const cover = coverageFor(existing, p, label)
  if (cover.unresolvedIdentity) {
    return { label, uncovered: [], skipped: occ.length, unresolvedIdentity: cover.unresolved }
  }
  // Linked rows whose due date matches no occurrence: each is a row that was
  // rescheduled, and it still covers the occurrence it came from.
  let spare = cover.count - occ.filter((d) => cover.dues.has(d)).length
  const uncovered = []
  occ.forEach((due) => {
    const desc = occ.length > 1 ? p.desc + ' — ' + dstr(due) : p.desc
    if (cover.dues.has(due)) return
    if (spare > 0) { spare--; return }
    if (alreadyOnSheet(existing, p, label, due, desc)) return
    uncovered.push({ due, desc })
  })
  return { label, uncovered, skipped: occ.length - uncovered.length }
}

export const buildGeneratedRows = (recurring, existing, monthKey, now = Date.now()) => {
  const label = monthLabel(monthKey)
  const rows = []
  let skipped = 0
  let n = 0
  const unresolved = []
  recurring.forEach((p) => {
    const coverage = uncoveredOccurrences(existing, p, monthKey)
    if (coverage.unresolvedIdentity?.length) unresolved.push(...coverage.unresolvedIdentity)
    // A payable with no amount yet is not ready to become a Tracker row:
    // `txns.amount` carries `> 0` (D65) and would refuse it with 23514,
    // aborting the whole batch — including in the unattended 22:00 job. 0 is a
    // legal *payable* state, meaning "not decided", and never a legal row.
    const amt = Number(p.amount) || 0
    if (!(amt > 0)) return
    const { uncovered, skipped: covered } = coverage
    skipped += covered
    uncovered.forEach(({ due, desc }) => {
      rows.push({ id: now + n++, src: p.id, occurrenceDue: due, co: p.co, cat: p.cat, desc, period: label, due, amount: amt, status: 'pending', done: '' })
    })
  })
  return { rows, skipped, label, unresolved }
}

/**
 * Payables that fall due in `monthKey` but carry no amount yet.
 *
 * One function because five places encoded this idea and drifted apart: the
 * generator skipped them, `forecast` did not, `generate` blocked on a
 * whole-masterlist scan, the scheduler reported them for months they were never
 * candidates in, and the sync line said "in sync" while one sat unwritable.
 * That is trap 90 twice over — so the rule lives here, and every caller asks.
 *
 * `0` is a legal payable state meaning "not decided yet" (D66); it is simply
 * not something Generate can turn into a row.
 */
export const unpricedFor = (recurring, monthKey) =>
  (recurring || []).filter((p) => !(Number(p.amount) > 0) && occurrences(p, monthKey).length > 0)

/** Linked rows from before occurrence identity was stored; never infer their month. */
export const unresolvedFor = (st) =>
  (st?.txns || []).filter((t) => t.src != null && !t.occurrenceDue)

/**
 * Masterlist payables falling due inside `days` that no Tracker row covers yet.
 *
 * The horizon is a parameter, not a constant. It defaults to the 30 days the
 * Tracker's sync line promises, but the Dashboard passes its own window — which
 * the owner can set to 7 or 90 — and a hard-coded 30 made the masterlist half
 * of that list stop early while the Tracker-row half honoured the setting.
 *
 * `alreadyOnSheet` decides "already there?" for both this and
 * `buildGeneratedRows`, so what this returns is exactly what Generate would
 * write. That is the
 * point: the Tracker's sync line and the Generate button have to agree, and
 * they only do if one rule decides both.
 *
 * Three months of keys are scanned because a 30-day horizon crosses a month
 * boundary for most of any given month, and a quarterly rule can land in the
 * third.
 */
export const forecast = (st, today = TODAY, days = 30) => {
  const horizon = addDays(today, days)
  const out = []
  // Enough months to cover the horizon plus the month it starts in. This was
  // three, which is right for the Tracker's fixed 30-day line and wrong for the
  // Dashboard, whose window the owner can set to 90 — the scan has to follow
  // the horizon or the far end of a wide window is silently empty.
  const months = Math.max(3, Math.ceil(days / 28) + 1)
  monthKeys(today).slice(0, months).forEach((month) => {
    const label = monthLabel(month)
    ;(st.recurring || []).forEach((p) => {
      // The same skip `buildGeneratedRows` applies. These two have to agree
      // exactly — the sync line promises "what Generate would write" — and the
      // zero rule was added to one of them and not the other, so the bar
      // counted a payable Generate would refuse to write.
      if (!(Number(p.amount) > 0)) return
      uncoveredOccurrences(st.txns, p, month).uncovered.forEach(({ due, desc }) => {
        if (due < today || due > horizon) return
        out.push({ src: p.id, co: p.co, cat: p.cat, desc, due, period: label, month, amount: Math.max(0, Number(p.amount) || 0) })
      })
    })
  })
  return out.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0))
}

export const isMonthKey = (k) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(k))

const periodPart = (m, d, withYear) => {
  const mon = cap(MON[+m.slice(5, 7) - 1])
  const day = String(d || '').replace(/[^0-9]/g, '')
  return (day ? day + ' ' : '') + mon + (withYear ? ' ' + m.slice(0, 4) : '')
}

/** Renders the period picker's current selection: 'Aug 2026', '24 Aug 2026', 'Jul–Sep 2026'. */
export const periodLabel = (p, today = TODAY) => {
  const f = /^\d{4}-\d{2}$/.test(String(p.periodFrom)) ? p.periodFrom : today.slice(0, 7)
  const df = String(p.periodFromDay || '').replace(/[^0-9]/g, '')
  if (!p.periodRange) return df ? periodPart(f, df, true) : monthLabel(f)
  let t = /^\d{4}-\d{2}$/.test(String(p.periodTo)) ? p.periodTo : f
  if (t < f) t = f
  const dt = String(p.periodToDay || '').replace(/[^0-9]/g, '')
  if (t === f && !df && !dt) return monthLabel(f)
  if (f.slice(0, 4) === t.slice(0, 4)) return periodPart(f, df, false) + '–' + periodPart(t, dt, true)
  return periodPart(f, df, true) + '–' + periodPart(t, dt, true)
}

/** Reads an existing free-text period ('Jul–Sep 2026') back into picker fields. */
export const parsePeriod = (current) => {
  const out = { periodFromDay: '', periodToDay: '' }
  if (/(\d{4})-(\d{2})/.test(String(current || '')) || typeof current !== 'string') return out
  const yr = /(20\d{2})/.exec(current)
  const mons = current.toUpperCase().match(/JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC/g)
  if (!yr || !mons || !mons.length) return out
  out.periodFrom = yr[1] + '-' + String(MON.indexOf(mons[0]) + 1).padStart(2, '0')
  out.periodRange = mons.length > 1
  if (mons.length > 1) out.periodTo = yr[1] + '-' + String(MON.indexOf(mons[1]) + 1).padStart(2, '0')
  const days = current.match(/\b(\d{1,2})\s+[A-Za-z]{3}/g) || []
  if (days[0]) out.periodFromDay = (days[0].match(/\d{1,2}/) || [''])[0]
  if (days[1]) out.periodToDay = (days[1].match(/\d{1,2}/) || [''])[0]
  return out
}

/** Rows surviving the company, category, status and search filters. */
export const visibleRows = (st, today = TODAY) => {
  const anyStatus = Object.keys(st.statuses).some((k) => st.statuses[k])
  const needle = st.search.toLowerCase()
  return st.txns.filter((t) => {
    if (st.coFilter !== 'All companies' && t.co !== st.coFilter) return false
    if (st.catFilter !== 'All categories' && t.cat !== st.catFilter) return false
    // `own`, not `st.statuses[...]`: `eff` returns `t.status`, which is free
    // text, and an inherited key is truthy — so a rogue status slipped THROUGH
    // the status filter instead of being held by it. Round 35.
    if (anyStatus && !own(st.statuses, eff(t, today))) return false
    if (st.search && (t.desc + ' ' + t.cat + ' ' + t.co).toLowerCase().indexOf(needle) < 0) return false
    return true
  })
}

/** The sort keys the Tracker's Sort menu offers, in menu order. */
export const SORTS = [
  { k: 'none', label: 'Default' },
  { k: 'co', label: 'By Company' },
  { k: 'cat', label: 'By Category' },
  { k: 'due', label: 'By Due date' },
]

/**
 * Sorts the visible rows.
 *
 * 'none' returns a copy in arrival order, so choosing Default really does put
 * the sheet back rather than leaving it in whatever order the last sort left.
 * Company and category compare lowercased, because 'ZON' sorting before 'ang'
 * is a code-point artefact, not an order anyone asked for.
 */
export const sortRows = (rows, key = 'none', dir = 'asc') => {
  const list = [...(rows || [])]
  if (key === 'none') return list
  const sign = dir === 'desc' ? -1 : 1
  const val = (t) =>
    key === 'co' ? String(t.co || '').toLowerCase()
      : key === 'cat' ? String(t.cat || '').toLowerCase()
        : String(t.due || '')
  return list.sort((a, b) => {
    const x = val(a)
    const y = val(b)
    return (x < y ? -1 : x > y ? 1 : 0) * sign
  })
}

/** How many days ahead the Upcoming deadlines list reaches. */
export const windowDays = (label) => {
  const m = /(\d+)/.exec(String(label || ''))
  return m ? Number(m[1]) : 30
}

/**
 * '2026-08-30' plus n days, as a date string.
 *
 * Built in UTC on purpose. Parsing as local time and formatting with
 * toISOString() shifts the result by a day everywhere east of Greenwich —
 * here, in UTC+8, it returned the 5th for the 6th.
 */
export const addDays = (d, n) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day + n)).toISOString().slice(0, 10)
}

/**
 * What the app opens on, from the saved settings. Without this the Dashboard
 * scope and Tracker grouping controls were stored and then ignored, so the
 * screens always opened the same way whatever the settings said.
 */
export const openingView = (settings = {}) => {
  const scope = String(settings.dashDefaultScope || 'All companies')
  return {
    scope: scope === 'All companies' ? 'All companies' : scope.replace(/ only$/, ''),
    groupBy: String(settings.trkGroupDefault || 'Company').toLowerCase() === 'category' ? 'category' : 'company',
  }
}

/** '2026-08-30' -> '30 Aug 2026'. Used where the prototype spelled the date out in prose. */
export const longDate = (d) => {
  if (!d) return '—'
  const p = d.split('-')
  return p[2] + ' ' + cap(MON[+p[1] - 1]) + ' ' + p[0]
}

/**
 * Companies and categories are shown a–z, so sort them at the two points they
 * enter state: the config row on load, and the Masterlist's add buttons.
 *
 * Copies rather than sorting in place — the arrays it is handed come straight
 * out of the reducer, and Array.prototype.sort mutates.
 */
export const alphabetical = (list) => [...(list || [])].sort((a, b) => String(a).localeCompare(String(b)))

/**
 * Peso value of one unit of each wire currency — the LAST resort, not the only
 * one. `fx_rates` supersedes these daily and a wire's own stored rate
 * supersedes that; see `rateFor` below for the order.
 *
 * They are kept because a rate table that has never been fetched, or a currency
 * the feed does not publish, still has to produce a number. They are stale by
 * construction: measured against the ECB fix of 2026-09-02 they run 7% to 15%
 * low, so anything landing on them understates. That is why `rateFor` reports
 * which rung it used and the strip says so on screen.
 */
export const TRANSFER_RATES = { PHP: 1, USD: 58, GBP: 74, EUR: 63, AUD: 38 }

/**
 * Which rate values a wire, and where it came from.
 *
 * Three rungs, most specific first:
 *
 *   1. the rate stored ON the wire — what it was actually sent at. A released
 *      wire must keep the value it had the day it went out, so once this is set
 *      nothing may re-price it. This is the whole point of storing it.
 *   2. today's `fx_rates` row for that currency — for a wire not yet sent, and
 *      for anything entered before rates existed.
 *   3. `TRANSFER_RATES` — a currency the feed does not carry, or a database
 *      with no rates in it yet.
 *
 * `w.rate` is compared against null rather than truthiness: a stored 0 is a
 * nonsense rate, but so is silently falling through to a constant that values
 * the wire at 58× what somebody deliberately wrote down. Zero is honoured and
 * shows as zero, which is visible; a silent fallback is not.
 */
export const rateFor = (w, rates) => {
  if (w && w.rate != null && w.rate !== '') return { rate: Number(w.rate), src: 'wire', asOf: w.rate_as_of || null }
  // Guarded like every other lookup keyed by `cur`, which is free text. This
  // one happens to be harmless — an inherited member is a function and has no
  // `.rate`, so it falls through — but D88 claimed the whole class was closed
  // while this line was still raw, and a record that overstates is worse than
  // none. Round 35.
  const live = own(rates, w && w.cur)
  if (live && live.rate != null) return { rate: Number(live.rate), src: 'feed', asOf: live.as_of || null }
  return { rate: own(TRANSFER_RATES, w && w.cur) || 1, src: 'constant', asOf: null }
}

/**
 * A wire's amount converted to pesos, for totalling across currencies.
 *
 * `rates` is the `fx_latest` map — `{ USD: { rate, as_of }, … }`. Omitting it
 * is not an error: the chain simply falls to the constants, which is what every
 * caller did before rates existed.
 */
export const inPesos = (w, rates) => Number(w.amount || 0) * rateFor(w, rates).rate

/** '$38,200' — a wire always prints in the currency it is actually sent in. */
export const curFmt = (cur, n, symbols) =>
  // `(symbols || {})[cur]` guarded only against a missing map, not against an
  // inherited key — so a wire in currency `constructor` printed a function's
  // source in front of its amount. This is the figure the transfer sheet shows.
  symbolOf(cur, symbols) + Math.round(Number(n) || 0).toLocaleString('en-US')

/**
 * The two figures above the transfer sheet.
 *
 * Cancelled and on-hold wires are deliberately excluded from both: a cancelled
 * wire stays on the sheet for the audit trail but is not money going anywhere,
 * and one on hold is not yet committed either.
 *
 * `asOf` is the OLDEST date any counted wire was priced at, and null when even
 * one of them fell through to a constant. The strip prints it, so a total
 * carrying one unpriced wire cannot claim a date it does not deserve — the
 * weakest rung decides what the figure may say about itself.
 */
export const transferTotals = (transfers = [], rates) => {
  const pending = transfers.filter((w) => w.status === 'pending')
  const released = transfers.filter((w) => w.status === 'released')
  const counted = [...pending, ...released]
  const sum = (rows) => rows.reduce((a, w) => a + inPesos(w, rates), 0)

  const seen = counted.map((w) => rateFor(w, rates))
  const dates = seen.map((r) => r.asOf)
  const asOf = counted.length && dates.every(Boolean) ? dates.sort()[0] : null

  return { pending: sum(pending), pendingCount: pending.length, released: sum(released), asOf }
}

/**
 * Everything a viewer must not do, refused in one place.
 *
 * Every mutation in this app updates the reducer first and saves afterwards, so
 * blocking only the save would leave a viewer looking at a change that never
 * reached the database — worse than an error. Wrapping the action stops both
 * halves together.
 *
 * The list below is what a viewer may still use: navigation, filters, opening a
 * row to look at it, opening a stored document. Anything not named here becomes
 * a no-op with an explanation. New actions are therefore blocked by default,
 * which is the right way round — forgetting to add one costs a viewer a button,
 * not the ledger a row.
 *
 * This is the app agreeing with the database, not enforcing anything. The
 * policies in `20260901170544_viewer_role` are the enforcement; a client that
 * skipped this would still be refused.
 */
export const VIEWER_MAY = new Set([
  'state', 'set', 'flash', 'go', 'goSettings', 'tileFilter', 'field',
  'openRow', 'openPeriod', 'openReceiptRow', 'openTransferRow',
  'openReceiptFile', 'generatedFor',
  'toggleStatus', 'toggleGroup', 'clearFilters',
  'closeAdd', 'closeTransfer', 'closeReceipt',
  'cancelPay', 'cancelRemoveReceipt', 'cancelRemoveTransfer',
  // Sorting and exporting rearrange and print what this account can already
  // read. Neither writes anything, so refusing them would only make the
  // read-only account worse at reading.
  'toggleSort', 'flipSort', 'pickSort', 'toggleExport', 'exportPng', 'exportPdf',
  'hoverNote', 'unhoverNote',
])

export function viewerActions(actions, flash) {
  return Object.fromEntries(Object.entries(actions).map(([name, value]) => {
    if (VIEWER_MAY.has(name) || typeof value !== 'function') return [name, value]
    return [name, () => flash('This account can view the ledger but not change it.')]
  }))
}

/**
 * Escapes text going into the export summary.
 *
 * Everything interpolated below is authored by a signed-in user — company and
 * category names come off the Masterlist screen, the search string comes off
 * the toolbar — and the summary is written into a document with `document.write`
 * in a popup on this origin. The prototype interpolated all of it raw. The app
 * already treats a description as text rather than markup (there is an e2e spec
 * pinning exactly that), so the export has to as well or printing a summary
 * becomes the one screen where a stored payload runs.
 */
const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/**
 * The printable summary of whatever the Tracker is currently showing.
 *
 * Built from `visibleRows` and `sortRows`, so the sheet's filters, search and
 * sort are the summary's scope too — a summary of something other than what is
 * on screen would be worse than none. Styles are inline because this string is
 * also written into a bare popup window that has no stylesheet of its own.
 */
/**
 * How the Tracker groups rows. Exported because `summaryHTML` and the Tracker
 * screen both need it and each had its own copy: identical today, and the PNG
 * export claims to summarise exactly what the screen shows, so a drift between
 * the two would be a lie nobody would notice.
 */
export const groupKey = (groupBy) => (t) => (groupBy === 'company' ? t.co : t.cat)

export const summaryHTML = (st, today = TODAY) => {
  const rows = sortRows(visibleRows(st, today), st.sortKey, st.sortDir)
  const byCompany = st.groupBy === 'company'
  const keyOf = groupKey(st.groupBy)

  const order = []
  rows.forEach((t) => { if (order.indexOf(keyOf(t)) < 0) order.push(keyOf(t)) })

  const chips = Object.keys(st.statuses).filter((k) => st.statuses[k]).map(cap).join(', ')
  const scopeBits = [
    st.coFilter, st.catFilter,
    chips ? 'Status: ' + chips : '',
    st.search ? 'Search: “' + st.search + '”' : '',
  ].filter(Boolean).map(esc)

  const th = 'text-align:left;padding:9px 12px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#8B7079;border-bottom:1px solid #EFDCE4'
  const td = 'padding:10px 12px;font-size:13px;border-bottom:1px solid #F5E7EE'

  const groupRows = order.map((name) => {
    const rs = rows.filter((t) => keyOf(t) === name)
    const over = rs.filter((t) => eff(t, today) === 'overdue').length
    return '<tr><td style="' + td + ';font-weight:600">' + esc(name) + '</td>'
      + '<td style="' + td + ';text-align:right">' + rs.length + '</td>'
      + '<td style="' + td + ';text-align:right;color:' + (over ? '#C4566E' : '#8B7079') + '">' + over + '</td>'
      + '<td style="' + td + ';text-align:right;font-weight:600">' + esc(fmt(rs.reduce((a, t) => a + t.amount, 0))) + '</td></tr>'
  }).join('')

  const statusCells = ['pending', 'overdue', 'completed', 'hold'].map((k) => {
    const rs = rows.filter((t) => eff(t, today) === k)
    return '<div style="flex:1;border:1px solid #EFDCE4;border-radius:12px;padding:12px 14px">'
      + '<div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#8B7079">' + esc(cap(k)) + '</div>'
      + '<div style="font-size:17px;font-weight:700;margin-top:4px">' + esc(fmt(rs.reduce((a, t) => a + t.amount, 0))) + '</div>'
      + '<div style="font-size:11px;color:#8B7079">' + rs.length + ' rows</div></div>'
  }).join('')

  const pend = forecast(st, today).length

  return '<div style="font-family:Inter,system-ui,sans-serif;color:#2A1A22;padding:28px;background:#fff">'
    + '<div style="display:flex;align-items:baseline;gap:10px;border-bottom:2px solid #A8577B;padding-bottom:12px">'
    + '<div style="font-size:20px;font-weight:700">Tracker summary</div>'
    + '<div style="font-size:12px;color:#8B7079">grouped by ' + (byCompany ? 'company' : 'category') + ' · ' + esc(dstr(today)) + '</div></div>'
    + '<div style="font-size:12px;color:#8B7079;margin:12px 0 16px">' + (scopeBits.join(' · ') || 'No filters applied') + '</div>'
    + '<div style="display:flex;gap:10px;margin-bottom:18px">' + statusCells + '</div>'
    + '<table style="width:100%;border-collapse:collapse;border:1px solid #EFDCE4;border-radius:12px;overflow:hidden">'
    + '<thead><tr style="background:#FCF5F8"><th style="' + th + '">' + (byCompany ? 'Company' : 'Category') + '</th>'
    + '<th style="' + th + ';text-align:right">Rows</th><th style="' + th + ';text-align:right">Overdue</th>'
    + '<th style="' + th + ';text-align:right">Amount</th></tr></thead><tbody>' + groupRows + '</tbody>'
    + '<tfoot><tr style="background:#FCF5F8"><td style="' + td + ';font-weight:700">Grand total</td>'
    + '<td style="' + td + ';text-align:right;font-weight:700">' + rows.length + '</td><td style="' + td + '"></td>'
    + '<td style="' + td + ';text-align:right;font-weight:700">' + esc(fmt(rows.reduce((a, t) => a + t.amount, 0))) + '</td></tr></tfoot></table>'
    + '<div style="margin-top:14px;font-size:11.5px;color:#8B7079">Masterlist: ' + (st.recurring || []).length + ' recurring payables · '
    + (pend ? pend + ' due in the next 30 days not yet in the Tracker' : 'in sync with the Tracker') + '</div></div>'
}

/**
 * Whether a masterlist edit is in a state fit to travel onto linked Tracker
 * rows. `amount` carries `> 0` in the database (D65), and `description` is
 * `not null default ''` with no emptiness check — so a blank one is accepted
 * silently, which is worse. Empty means "not decided yet" on a payable and is
 * never a state a Tracker row may hold, whichever field it arrives in.
 */
export const pushable = (k, val) => (k === 'amount' ? val > 0 : String(val ?? '').trim() !== '')

/** The masterlist fields that travel onto linked Tracker rows, and the column each becomes. */
export const PUSH_DOWN = { co: 'co', cat: 'cat', desc: 'description', amount: 'amount' }

/**
 * What a masterlist keystroke should do to the linked Tracker rows.
 *
 * Pure, and therefore testable — which is the point. `pushable` was extracted
 * and tested on its own, and `updRec` could still be edited to stop consulting
 * it with the whole suite green: the predicate was proved right while nothing
 * proved the caller asked. This returns the whole decision, so a test pins the
 * decision rather than one input to it.
 *
 * `retract` matters as much as `targets`. Typing `500` arms a push; clearing
 * the field 200ms later must CANCEL that armed write, or it fires anyway with
 * the value the user took back.
 *
 * It returns the `patch` too, so the caller has nothing left to assemble. The
 * state key and the column differ — `desc` is stored in `description` — and a
 * caller building the patch itself wrote `{ desc: … }`, a column that does not
 * exist, with every test still green. Nothing a test cannot see should be left
 * for the call site to get right.
 *
 * It does NOT return the rows to write. Choosing them here would mean choosing
 * from a page-load snapshot, and a linked row another session created after
 * this tab mounted would be left behind while the toast said otherwise. The
 * write selects by `src` server-side instead.
 */
export const pushPlan = (k, val) => {
  const ok = pushable(k, val)
  const column = own(PUSH_DOWN, k)
  return {
    column,
    retract: !ok,
    patch: column && ok ? { [column]: val } : null,
  }
}

/**
 * What a masterlist keystroke actually stores, and the row it produces.
 *
 * Blank means 0 here, because this field saves on every keystroke and a
 * half-typed number is not an error. A negative gets the same treatment: it
 * lands as 0 and the field re-renders showing 0, so the stored value and the
 * screen never disagree. `recurring.amount` would accept a negative, and the
 * value also pushes down onto linked Tracker rows, so a negative must not
 * survive this step.
 *
 * Pure, and separate from `updRec`, because `actions.js` imports React and
 * nothing offline can reach it: three mutations here — dropping `Math.max`,
 * storing the raw input instead of the sanitised value — all passed the whole
 * suite while writing a negative or a string into a numeric column.
 */
export const recValue = (k, v) => (k === 'amount' ? Math.max(0, amountOf(v) || 0) : v)

export const editRecurring = (row, k, v) => ({ ...row, [k]: recValue(k, v) })

/**
 * What an inline masterlist field shows while it is being typed into.
 *
 * The Masterlist edits in place, so its Amount input is controlled from the
 * stored row — and `recValue` stores a **number**. Typing `1250.50` one key at
 * a time meant the `.` keystroke parsed to `1250`, state did not change, and
 * React restored the input to `"1250"`: the decimal point was erased as fast as
 * it was typed, so the next keys produced `125050`. A hundredfold payable, which
 * then pushed down onto the linked Tracker rows.
 *
 * Every other amount field in the app holds raw text and sanitises on save.
 * This does the same for the one cell being edited: the draft is what the user
 * typed, the stored value is what the ledger gets, and they reconcile the
 * moment the field is left.
 */
export const draftText = (draft, id, k, stored) =>
  (draft && draft.id === id && draft.k === k ? draft.text : String(stored ?? ''))
