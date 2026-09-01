import { useStore } from './store.jsx'
import { TODAY, blankForm } from './data.js'
import { db } from './db.js'
import { alphabetical, amountOf, buildGeneratedRows, isMonthKey, longDate, monthLabel, parsePeriod, periodLabel } from './logic.js'

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

  /**
   * Choosing a tab closes the flyout.
   *
   * It used to stay open, and its click-catching scrim covers everything right
   * of the rail — so the settings screen rendered underneath but every switch
   * and dropdown on it was unclickable until the user happened to click
   * somewhere blank first. Reopen the menu from the rail to switch tabs.
   */
  const goSettings = (tab) => () =>
    set({ screen: 'settings', settingsTab: tab, settingsMenuOpen: false, filtersOpen: false })

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
  const openAdd = () => set({ addOpen: true, form: blankForm(), formError: '', formWarning: '' })
  const closeAdd = () => set({ addOpen: false, formError: '', formWarning: '' })
  const setF = (k) => (e) => {
    const v = e.target.value
    // Editing any field clears a standing duplicate warning: the row the user
    // is describing is no longer the one that was flagged.
    set((s) => ({ form: { ...(s.form || blankForm()), [k]: v }, formError: '', formWarning: '' }))
  }
  const pickFormStatus = (k) => () => set((s) => ({ form: { ...(s.form || blankForm()), status: k } }))

  const commit = (keepOpen) => () => {
    const f = state.form || blankForm()
    const amt = amountOf(f.amount)
    if (!f.co || !f.cat || !f.desc || !amt) {
      set({ formError: 'Company, category, description and amount are required.' })
      return
    }

    // "Warn on duplicates" flags a row matching an existing company, category
    // and period. It warns once and then gets out of the way — a company can
    // legitimately owe the same category twice in a period, and a warning that
    // cannot be dismissed would just be a wall.
    if (state.settings.warnDuplicate && !state.formWarning) {
      const clash = state.txns.find((t) => t.co === f.co && t.cat === f.cat && t.period === f.period)
      if (clash) {
        set({
          formWarning: f.co + ' already has a ' + f.cat + ' row for ' + f.period +
            ' (' + clash.desc + '). Save again to add it anyway.',
        })
        return
      }
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
      addOpen: !!keepOpen, formError: '', formWarning: '', screen: 'tracker',
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
    set({ liqOpen: true, liqId: r.id, liqDate: TODAY, liqAmount: String(r.amount), liqErr: false, liqFile: null })

  const pickLiqFile = (e) => set({ liqFile: (e.target.files && e.target.files[0]) || null, liqErr: false })

  /**
   * Unlike every other write here, this one is awaited. The document has to
   * reach storage before the row can record its key, and a liquidation that
   * claims to have a receipt attached when the upload failed would be worse
   * than a slow dialog.
   */
  const saveLiq = async () => {
    const amt = amountOf(state.liqAmount)
    if (!amt || !state.liqDate) { set({ liqErr: true }); return }
    if (state.settings.ackRequirePhoto && !state.liqFile) {
      set({ liqErr: 'A receipt file is required. Settings · AckRec can turn that off.' })
      return
    }
    const id = state.liqId
    const current = state.receipts.find((r) => r.id === id)

    let filePath = current.filePath || ''
    if (state.liqFile) {
      set({ liqBusy: true })
      try {
        filePath = await db.uploadReceiptFile(id, state.liqFile)
      } catch (e) {
        set({ liqBusy: false, liqErr: "Couldn't upload the file — " + (e.message || 'unknown error') })
        return
      }
      set({ liqBusy: false })
    }

    const next = { ...current, status: 'liquidated', date: state.liqDate, actual: amt, filePath }
    set((s) => ({
      receipts: s.receipts.map((r) => r.id === id ? next : r),
      liqOpen: false, liqErr: false, liqFile: null,
    }))
    save(db.updateReceipt(next), 'the liquidation')
    flash('Receipt liquidated')
  }

  // ---- deleting a receipt ---------------------------------------------
  // Unlike a masterlist row, a receipt can carry money already released and a
  // scanned document that exists nowhere else, so this one asks first.
  const askRemoveReceipt = (r) => () => set({ delRcpId: r.id })
  const cancelRemoveReceipt = () => set({ delRcpId: null })

  const confirmRemoveReceipt = () => {
    const id = state.delRcpId
    const r = state.receipts.find((x) => x.id === id)
    if (!r) { set({ delRcpId: null }); return }

    set((s) => ({ receipts: s.receipts.filter((x) => x.id !== id), delRcpId: null }))
    save(db.deleteReceipt(id), 'the deletion')

    // The row goes first and the file after it. The other order risks a row
    // left pointing at a document that is no longer there, which breaks its
    // File button; this order can at worst orphan a file nothing references.
    if (r.filePath) {
      db.removeReceiptFile(r.filePath).catch((e) => {
        console.error('[supabase] the receipt file', e)
        flash('Receipt deleted, but its file is still stored — ' + (e.message || 'unknown error'))
      })
    }
    flash(r.co + ' \u00b7 ' + r.name + ' — receipt deleted')
  }

  /** Open a stored document through a short-lived signed link. */
  const openReceiptFile = (r) => async () => {
    try {
      const url = await db.signedReceiptUrl(r.filePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      flash("Couldn't open the file — " + (e.message || 'unknown error'))
    }
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
    set((s) => ({ companies: alphabetical([...s.companies, v.toUpperCase()]), coDraft: '' }))
  }
  const addCategory = () => {
    const v = state.catDraft.trim()
    if (!v) return
    set((s) => ({ categories: alphabetical([...s.categories, v]), catDraft: '' }))
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
    setReceiptStatus, openLiquidate, saveLiq, pickLiqFile, openReceiptFile,
    askRemoveReceipt, cancelRemoveReceipt, confirmRemoveReceipt,
    openReceipt, closeReceipt, setRcp, saveReceipt,
    updRec, removeRec, openRecurring, setR, saveRecurring,
    generate, undoGenerate, generatedFor,
    addNote, toggleNote,
    addCompany, addCategory, removeCompany, removeCategory,
    toggleStatus, toggleGroup, clearFilters,
  }
}
