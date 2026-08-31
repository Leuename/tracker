import { useStore } from './store.jsx'
import { TODAY, blankForm } from './data.js'
import { db } from './db.js'
import { amountOf, buildGeneratedRows, isMonthKey, longDate, monthLabel, parsePeriod, periodLabel } from './logic.js'

// The masterlist edits in place, so its description and amount fields fire on
// every keystroke. One pending write per row, coalesced, instead of one per
// character. Config slices are handled the same way inside the store.
const pendingRec = new Map()

const queueRec = (row, save) => {
  clearTimeout(pendingRec.get(row.id))
  pendingRec.set(row.id, setTimeout(() => {
    pendingRec.delete(row.id)
    save(db.updateRecurring(row), 'the masterlist row')
  }, 500))
}

const cancelRec = (id) => {
  clearTimeout(pendingRec.get(id))
  pendingRec.delete(id)
}

/**
 * Every mutation in one hook, ported from the prototype's DCLogic methods.
 * Screens read `state` and call these; nothing else writes.
 *
 * Each one updates the reducer first and then hands the matching row to
 * `save`, so the screen never waits on the network.
 */
export function useActions() {
  const { state, set, flash, save } = useStore()

  const go = (screen) => () => set({ screen, settingsMenuOpen: false, filtersOpen: false })

  const goSettings = (tab) => () =>
    set({ screen: 'settings', settingsTab: tab, settingsMenuOpen: true, filtersOpen: false })

  const setS = (k, v) => set((s) => ({ settings: { ...s.settings, [k]: v } }))

  /** Tile click: jump to the Tracker already filtered to that status, filters cleared. */
  const tileFilter = (key) => () => {
    const statuses = { pending: false, overdue: false, completed: false, hold: false }
    if (key === 'all') Object.keys(statuses).forEach((k) => { statuses[k] = true })
    else statuses[key] = true
    set({
      screen: 'tracker', statuses, coFilter: 'All companies', catFilter: 'All categories',
      search: '', collapsed: {}, filtersOpen: false, settingsMenuOpen: false,
    })
  }

  // ---- add transaction -------------------------------------------------
  const openAdd = () => set({ addOpen: true, form: blankForm(), formError: '' })
  const closeAdd = () => set({ addOpen: false, formError: '' })
  const setF = (k) => (e) => {
    const v = e.target.value
    set((s) => ({ form: { ...(s.form || blankForm()), [k]: v }, formError: '' }))
  }
  const pickFormStatus = (k) => () => set((s) => ({ form: { ...(s.form || blankForm()), status: k } }))

  const commit = (keepOpen) => () => {
    const f = state.form || blankForm()
    const amt = amountOf(f.amount)
    if (!f.co || !f.cat || !f.desc || !amt) {
      set({ formError: 'Company, category, description and amount are required.' })
      return
    }
    const row = {
      id: Date.now(), co: f.co, cat: f.cat, desc: f.desc, period: f.period, due: f.due,
      amount: amt, status: f.status, done: f.status === 'completed' ? TODAY : '',
      // The add form collects notes; without this they were typed and dropped.
      notes: f.notes || '',
    }
    set((s) => ({
      txns: [row, ...s.txns],
      form: keepOpen ? { ...blankForm(), co: f.co, cat: f.cat, period: f.period } : null,
      addOpen: !!keepOpen, formError: '', screen: 'tracker',
    }))
    save(db.insertTxn(row), 'the new transaction')
    flash(f.co + ' · ' + f.desc + ' added to the Tracker')
  }

  // ---- edit transaction ------------------------------------------------
  const openRow = (t) => () => {
    const e = {
      co: t.co, cat: t.cat, desc: t.desc, period: t.period, due: t.due, amount: String(t.amount),
      status: t.status, done: t.done || '', notes: t.notes || '', payType: t.payType || '', checkNo: t.checkNo || '',
    }
    set({ editOpen: true, editId: t.id, edit: e, editOrig: e })
  }
  const setE = (k) => (e) => {
    const v = e.target.value
    set((s) => ({ edit: { ...s.edit, [k]: v } }))
  }

  /** Choosing Completed in the edit form routes through the payment-method dialog. */
  const setEditStatus = (ev) => {
    const v = ev.target.value
    if (v !== 'completed') {
      set((s) => ({ edit: { ...s.edit, status: v, payType: '', checkNo: '' } }))
      return
    }
    const e = state.edit || {}
    set((s) => ({
      edit: { ...s.edit, status: 'completed' },
      payOpen: true, payFor: 'edit', payPrev: (s.edit || {}).status || 'pending',
      payType: e.payType || 'Cash', payCheck: e.checkNo || '', payErr: false,
    }))
  }

  const saveEdit = () => {
    const e = state.edit
    const id = state.editId
    const amt = amountOf(e.amount)
    if (!e.desc || !amt) { flash('Description and amount are required'); return }
    const next = {
      ...state.txns.find((t) => t.id === id),
      co: e.co, cat: e.cat, desc: e.desc, period: e.period, due: e.due, amount: amt, status: e.status,
      payType: e.status === 'completed' ? (e.payType || 'Cash') : '',
      checkNo: e.status === 'completed' ? (e.checkNo || '') : '',
      done: e.status === 'completed' ? (e.done || TODAY) : '',
      notes: e.notes,
    }
    set((s) => ({ txns: s.txns.map((t) => t.id === id ? next : t), editOpen: false }))
    save(db.updateTxn(next), 'the transaction')
    flash('Transaction updated')
  }

  const deleteEdit = () => {
    const id = state.editId
    set((s) => ({ txns: s.txns.filter((t) => t.id !== id), editOpen: false }))
    save(db.deleteTxn(id), 'the deletion')
    flash('Transaction deleted')
  }

  // ---- payment method --------------------------------------------------
  const openPay = (t) => (ev) => {
    if (ev && ev.stopPropagation) ev.stopPropagation()
    set({ payOpen: true, payFor: 'row', payId: t.id, payType: 'Cash', payCheck: '', payErr: false })
  }

  const confirmPay = () => {
    const { payId: id, payType: type } = state
    const num = String(state.payCheck).trim()
    if (type === 'Check' && !num) { set({ payErr: true }); return }
    const check = type === 'Check' ? num : ''
    if (state.payFor === 'edit') {
      set((s) => ({
        edit: { ...s.edit, status: 'completed', done: s.edit.done || TODAY, payType: type, checkNo: check },
        payOpen: false, payErr: false,
      }))
      return
    }
    const paid = { ...state.txns.find((t) => t.id === id), status: 'completed', done: TODAY, payType: type, checkNo: check }
    set((s) => ({ txns: s.txns.map((t) => t.id === id ? paid : t), payOpen: false, payErr: false }))
    save(db.updateTxn(paid), 'the payment')
    flash('Paid by ' + type.toLowerCase() + (type === 'Check' ? ' #' + num : '') + ' — date completed filled in as ' + longDate(TODAY))
  }

  /** Cancelling from the edit form rolls the status back to what it was. */
  const cancelPay = () => {
    if (state.payFor === 'edit') {
      set((s) => ({ edit: { ...s.edit, status: state.payPrev }, payOpen: false, payErr: false }))
      return
    }
    set({ payOpen: false, payErr: false })
  }

  // ---- period picker ---------------------------------------------------
  const openPeriod = (which, current) => () =>
    set({ periodOpen: which, ...parsePeriod(current) })

  const applyPeriod = () => {
    const label = periodLabel(state)
    const which = state.periodOpen
    if (which === 'edit') set((s) => ({ edit: { ...s.edit, period: label }, periodOpen: null }))
    else set((s) => ({ form: { ...(s.form || blankForm()), period: label }, periodOpen: null }))
  }

  // ---- acknowledgement receipts ---------------------------------------
  const setReceiptStatus = (r) => (e) => {
    const v = e.target.value
    if (v === 'liquidated') {
      set({ liqOpen: true, liqId: r.id, liqDate: TODAY, liqAmount: String(r.amount), liqErr: false })
      return
    }
    const next = { ...r, status: v, date: '', actual: null }
    set((s) => ({ receipts: s.receipts.map((x) => x.id === r.id ? next : x) }))
    save(db.updateReceipt(next), 'the receipt')
  }

  // The status dropdown starts on whatever `ackDefaultStatus` says — the
  // setting was stored but unwired until this form existed to honour it.
  const ACK_STATUS = { Pending: 'pending', Released: 'released', 'On hold': 'hold' }

  const openReceipt = () => set((s) => ({
    rcpOpen: true,
    rcpError: '',
    rcp: { co: '', name: '', desc: '', amount: '', status: ACK_STATUS[s.settings.ackDefaultStatus] || 'pending' },
  }))

  const closeReceipt = () => set({ rcpOpen: false, rcpError: '' })

  const setRcp = (k) => (e) => {
    const v = e.target.value
    set((s) => ({ rcp: { ...s.rcp, [k]: v }, rcpError: '' }))
  }

  const saveReceipt = () => {
    const r = state.rcp
    const amt = amountOf(r.amount)
    if (!r.co || !r.name.trim() || !amt) {
      set({ rcpError: 'Company, who received the cash, and amount are required.' })
      return
    }
    const row = {
      id: Date.now(), co: r.co, name: r.name.trim(), desc: r.desc.trim() || 'Cash advance',
      amount: amt, status: r.status, date: '', actual: null,
    }
    set((s) => ({ receipts: [...s.receipts, row], rcpOpen: false, rcpError: '' }))
    save(db.insertReceipt(row), 'the new receipt')
    flash(row.co + ' · ' + row.name + ' — receipt added')
  }

  const openLiquidate = (r) => () =>
    set({ liqOpen: true, liqId: r.id, liqDate: TODAY, liqAmount: String(r.amount), liqErr: false })

  const saveLiq = () => {
    const amt = amountOf(state.liqAmount)
    if (!amt || !state.liqDate) { set({ liqErr: true }); return }
    const id = state.liqId
    const next = { ...state.receipts.find((r) => r.id === id), status: 'liquidated', date: state.liqDate, actual: amt }
    set((s) => ({ receipts: s.receipts.map((r) => r.id === id ? next : r), liqOpen: false, liqErr: false }))
    save(db.updateReceipt(next), 'the liquidation')
    flash('Receipt liquidated')
  }

  // ---- masterlist ------------------------------------------------------
  const updRec = (id, k, v) => {
    const val = k === 'amount' ? (amountOf(v) || 0) : v
    const next = { ...state.recurring.find((p) => p.id === id), [k]: val }
    set((s) => ({ recurring: s.recurring.map((p) => p.id === id ? next : p) }))
    queueRec(next, save)
  }

  const removeRec = (p) => () => {
    cancelRec(p.id)
    set((s) => ({ recurring: s.recurring.filter((x) => x.id !== p.id) }))
    save(db.deleteRecurring(p.id), 'the removal')
    flash(p.co + ' · ' + p.cat + ' removed from the masterlist')
  }

  const openRecurring = () => set({
    recOpen: true,
    rec: { co: '', cat: '', desc: '', freq: state.settings.mlDefaultFreq || 'Monthly', dueDate: TODAY, amount: '' },
  })

  const setR = (k) => (e) => {
    const v = e.target.value
    set((s) => ({ rec: { ...s.rec, [k]: v } }))
  }

  const saveRecurring = () => {
    const r = state.rec
    const amt = amountOf(r.amount)
    if (!r.co || !r.cat || !amt) { flash('Company, category and amount are required'); return }
    const row = { id: Date.now(), co: r.co, cat: r.cat, freq: r.freq, desc: r.desc || r.cat, dueDate: r.dueDate || TODAY, amount: amt }
    set((s) => ({ recurring: [...s.recurring, row], recOpen: false }))
    save(db.insertRecurring(row), 'the recurring payable')
    flash('Recurring payable added')
  }

  const generate = (key) => () => {
    const month = isMonthKey(key) ? key : state.genMonth
    if (!isMonthKey(month)) { flash('Pick a valid month first'); return }
    const { rows, skipped, label } = buildGeneratedRows(state.recurring, state.txns, month)
    if (!rows.length) {
      flash('Every recurring payable already exists for ' + label)
      set({ genMenuOpen: false })
      return
    }
    save(db.insertTxns(rows), 'the generated payables')
    set((s) => ({
      txns: [...rows, ...s.txns],
      generatedIds: rows.map((r) => r.id),
      bannerOpen: true, genMenuOpen: false, genMonth: month,
      bannerText: rows.length + ' ' + label + ' payables were added to the Tracker' +
        (skipped ? ' — ' + skipped + ' skipped as duplicates' : '') + '.',
    }))
  }

  const undoGenerate = () => {
    const ids = state.generatedIds
    set((s) => ({ txns: s.txns.filter((t) => ids.indexOf(t.id) < 0), generatedIds: [], bannerOpen: false }))
    save(db.deleteTxns(ids), 'the undo')
    flash('Generated rows removed')
  }

  /** How many Tracker rows already carry a given month's period label. */
  const generatedFor = (key) => state.txns.filter((t) => t.period === monthLabel(key)).length

  // ---- dashboard notes -------------------------------------------------
  const addNote = () => {
    const v = state.noteDraft.trim()
    if (!v) return
    set((s) => ({ notes: [...s.notes, { t: v, done: false, linked: false }], noteDraft: '' }))
  }

  const toggleNote = (i) => () =>
    set((s) => ({ notes: s.notes.map((x, j) => j === i ? { ...x, done: !x.done } : x) }))

  // ---- masterlist settings lists --------------------------------------
  const addCompany = () => {
    const v = state.coDraft.trim()
    if (!v) return
    set((s) => ({ companies: [...s.companies, v.toUpperCase()], coDraft: '' }))
  }
  const addCategory = () => {
    const v = state.catDraft.trim()
    if (!v) return
    set((s) => ({ categories: [...s.categories, v], catDraft: '' }))
  }
  const removeCompany = (c) => () => set((s) => ({ companies: s.companies.filter((x) => x !== c) }))
  const removeCategory = (c) => () => set((s) => ({ categories: s.categories.filter((x) => x !== c) }))

  // ---- tracker filters -------------------------------------------------
  const toggleStatus = (k) => () =>
    set((s) => ({ statuses: { ...s.statuses, [k]: !s.statuses[k] } }))

  const toggleGroup = (name) => () =>
    set((s) => ({ collapsed: { ...s.collapsed, [name]: !s.collapsed[name] } }))

  const clearFilters = () => set({
    coFilter: 'All companies', catFilter: 'All categories', search: '',
    statuses: { pending: true, overdue: true, completed: false, hold: false },
  })

  const field = (k) => (e) => set({ [k]: e.target.value })

  return {
    state, set, flash, go, goSettings, setS, tileFilter, field,
    openAdd, closeAdd, setF, pickFormStatus, commit,
    openRow, setE, setEditStatus, saveEdit, deleteEdit,
    openPay, confirmPay, cancelPay,
    openPeriod, applyPeriod,
    setReceiptStatus, openLiquidate, saveLiq,
    openReceipt, closeReceipt, setRcp, saveReceipt,
    updRec, removeRec, openRecurring, setR, saveRecurring,
    generate, undoGenerate, generatedFor,
    addNote, toggleNote,
    addCompany, addCategory, removeCompany, removeCategory,
    toggleStatus, toggleGroup, clearFilters,
  }
}
