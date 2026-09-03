/**
 * Row mapping between the app's in-memory shapes and Postgres.
 *
 * Two vocabularies have to meet here. The app inherited `desc`, `payType`,
 * `checkNo` and `dueDate` from the prototype, and represents "no date" as the
 * empty string. Postgres wants `description` (`desc` is a reserved word),
 * snake_case, and NULL. Everything that translates between the two lives in
 * this file, which imports nothing, so it can be tested without a database.
 */

const nz = (v) => (v === '' || v === undefined ? null : v)
const ns = (v) => (v == null ? '' : v)
const num = (v) => (v == null ? null : Number(v))

// PostgREST serialises numeric as a JSON number; Number() keeps the read path
// honest if that ever changes to a string. Amounts are whole pesos well inside
// the exact-integer range, so no precision is lost either way.

export const toTxn = (t) => ({
  id: t.id, co: t.co, cat: t.cat, description: t.desc, period: t.period,
  due: nz(t.due), amount: t.amount, status: t.status, done: nz(t.done),
  pay_type: nz(t.payType), check_no: nz(t.checkNo), notes: nz(t.notes),
})

export const fromTxn = (r) => ({
  id: Number(r.id), co: r.co, cat: r.cat, desc: r.description, period: r.period,
  due: ns(r.due), amount: Number(r.amount), status: r.status, done: ns(r.done),
  payType: ns(r.pay_type), checkNo: ns(r.check_no), notes: ns(r.notes),
})

export const toReceipt = (r) => ({
  id: r.id, co: r.co, name: r.name, description: r.desc,
  amount: r.amount, status: r.status, date: nz(r.date), actual: r.actual,
  // The object key in the private `receipts` bucket, or null when none was
  // attached. Never a URL: those are signed on demand and expire.
  file_path: nz(r.filePath),
})

export const fromReceipt = (r) => ({
  id: Number(r.id), co: r.co, name: r.name, desc: r.description,
  amount: Number(r.amount), status: r.status, date: ns(r.date), actual: num(r.actual),
  filePath: ns(r.file_path),
})

export const toRecurring = (p) => ({
  id: p.id, co: p.co, cat: p.cat, freq: p.freq,
  description: p.desc, due_date: nz(p.dueDate), amount: p.amount,
})

export const fromRecurring = (r) => ({
  id: Number(r.id), co: r.co, cat: r.cat, freq: r.freq,
  desc: r.description, dueDate: ns(r.due_date), amount: Number(r.amount),
})

/**
 * An update payload: the same row without its key.
 *
 * Editing a payable never means rewriting its primary key, and the database
 * agrees — `UPDATE` on `id` is not granted to clients. Sending it anyway makes
 * every edit fail with a column-privilege error.
 */
export const forUpdate = (row) => {
  const { id, ...rest } = row
  return rest
}

/** The slices that live in the single `app_config` jsonb row. */
/**
 * A wire is stored in the currency it is actually sent in, so `amount` is in
 * `cur` and not in pesos. Nothing here converts; see TRANSFER_RATES in
 * logic.js for the display-only conversion the totals use.
 */
/**
 * `rate` and `rate_as_of` are nullable and null is meaningful: this wire has
 * never been priced, so it falls back to the feed and then to the constants.
 * An empty string off a form is the same thing, so it is normalised to null
 * rather than written as 0 — a stored 0 means "worth nothing", which is a
 * different claim entirely.
 */
const nrate = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

export const toTransfer = (w) => ({
  id: w.id, co: w.co, name: w.name, cur: w.cur,
  amount: w.amount, status: w.status, note: ns(w.note),
  rate: nrate(w.rate), rate_as_of: w.rate_as_of || null,
})

export const fromTransfer = (r) => ({
  id: Number(r.id), co: r.co, name: r.name, cur: r.cur,
  amount: Number(r.amount), status: r.status, note: ns(r.note),
  rate: nrate(r.rate), rate_as_of: r.rate_as_of || null,
})

export const CONFIG_KEYS = ['notes', 'companies', 'categories', 'settings']

export const configOf = (s) => Object.fromEntries(CONFIG_KEYS.map((k) => [k, s[k]]))

/**
 * What actually changed between two configs, or null if nothing did.
 *
 * The config row is shared by four people, so sending the whole thing on every
 * save means the last writer silently discards whatever the others changed in
 * the meantime. Sending only the changed keys lets `merge_app_config` combine
 * two people's edits instead of picking one.
 *
 * `settings` is descended into, because that is where the collisions actually
 * happen — two toggles on one screen, saved seconds apart. Everything else is
 * compared whole: a company list is one value, and two people editing *it* at
 * the same time still resolves last-write-wins. That is a real limit, not an
 * oversight; per-item merging is a bigger change than the problem has earned.
 *
 * A settings key that disappears is not reported. Nothing removes one today,
 * and a patch that cannot express deletion is easier to reason about than one
 * that half can.
 */
export function configPatch(prev, next) {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  const patch = {}

  for (const key of CONFIG_KEYS) {
    if (key === 'settings') continue
    if (!same(prev[key], next[key])) patch[key] = next[key]
  }

  const settings = {}
  for (const key of Object.keys(next.settings || {})) {
    if (!same((prev.settings || {})[key], next.settings[key])) settings[key] = next.settings[key]
  }
  if (Object.keys(settings).length) patch.settings = settings

  return Object.keys(patch).length ? patch : null
}
