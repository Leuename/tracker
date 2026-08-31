// Pure helpers ported from the prototype's DCLogic class. No React, no state —
// so `npm test` can exercise the recurrence and period rules directly.
import { MON, MAX_OCC, TODAY } from './data.js'

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

/** Overdue is derived, never stored: a pending row past its due date. */
export const eff = (t, today = TODAY) => (t.status === 'pending' && t.due < today ? 'overdue' : t.status)

/** Strips currency formatting off a typed amount. NaN when nothing numeric is left. */
export const amountOf = (v) => parseFloat(String(v).replace(/[^0-9.]/g, ''))

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
      const step = p.freq === 'Weekly' ? 7 : 14
      const target = new Date(anchor + 'T00:00:00').getDay()
      let d = 1
      while (d <= dim && new Date(y, m - 1, d).getDay() !== target) d++
      const out = []
      for (; d <= dim && out.length < MAX_OCC; d += step) out.push(mk(d))
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
 * Expands the masterlist into Tracker rows for one month.
 * A row already carrying the same company, category, period and description is
 * skipped rather than duplicated, so re-running Generate is safe.
 */
export const buildGeneratedRows = (recurring, existing, monthKey, now = Date.now()) => {
  const label = monthLabel(monthKey)
  const rows = []
  let skipped = 0
  let n = 0
  recurring.forEach((p) => {
    const occ = occurrences(p, monthKey)
    const amt = Math.max(0, Number(p.amount) || 0)
    occ.forEach((due) => {
      const desc = occ.length > 1 ? p.desc + ' — ' + dstr(due) : p.desc
      if (existing.some((t) => t.co === p.co && t.cat === p.cat && t.period === label && t.desc === desc)) {
        skipped++
        return
      }
      rows.push({ id: now + n++, co: p.co, cat: p.cat, desc, period: label, due, amount: amt, status: 'pending', done: '' })
    })
  })
  return { rows, skipped, label }
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
    if (anyStatus && !st.statuses[eff(t, today)]) return false
    if (st.search && (t.desc + ' ' + t.cat + ' ' + t.co).toLowerCase().indexOf(needle) < 0) return false
    return true
  })
}

/** '2026-08-30' -> '30 Aug 2026'. Used where the prototype spelled the date out in prose. */
export const longDate = (d) => {
  if (!d) return '—'
  const p = d.split('-')
  return p[2] + ' ' + cap(MON[+p[1] - 1]) + ' ' + p[0]
}
