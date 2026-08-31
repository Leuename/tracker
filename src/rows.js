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
})

export const fromReceipt = (r) => ({
  id: Number(r.id), co: r.co, name: r.name, desc: r.description,
  amount: Number(r.amount), status: r.status, date: ns(r.date), actual: num(r.actual),
})

export const toRecurring = (p) => ({
  id: p.id, co: p.co, cat: p.cat, freq: p.freq,
  description: p.desc, due_date: nz(p.dueDate), amount: p.amount,
})

export const fromRecurring = (r) => ({
  id: Number(r.id), co: r.co, cat: r.cat, freq: r.freq,
  desc: r.description, dueDate: ns(r.due_date), amount: Number(r.amount),
})

/** The slices that live in the single `app_config` jsonb row. */
export const CONFIG_KEYS = ['notes', 'companies', 'categories', 'settings']

export const configOf = (s) => Object.fromEntries(CONFIG_KEYS.map((k) => [k, s[k]]))
