import { useStore } from './store.jsx'
import { createPending } from './pending.js'
import { CUR, TODAY, blankForm, bare } from './data.js'
import { db } from './db.js'
import { applyMasterlistEdit, recEffects } from './masterlist.js'
import { addToList, alphabetical, amountOf, buildGeneratedRows, fmt, isMonthKey, longDate, monthLabel, parsePeriod, periodLabel, positiveAmountOf, summaryHTML, unpricedFor, viewerActions, own } from './logic.js'

// The masterlist and the transfer sheet both edit in place, so their text
// fields fire on every keystroke. One pending write per row, coalesced,
// instead of one per character. Config slices are handled the same way inside
// the store.
//
// Keys carry the table name because ids are Date.now() and two tables can
// mint the same millisecond; a bare id would let one row's pending write
// cancel an unrelated row's.
// The debounced-write registry lives in `pending.js` so it can be tested:
// three defects in this session were cancellation bugs in it, and the last fix
// could be deleted with the whole suite still green (D68, trap 91).
const pending = createPending()
const { queueRow, queueCall, cancelRow, cancelPush, cancelForRecurring } = pending

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
    const statuses = bare({ pending: false, overdue: false, completed: false, hold: false })
    if (key === 'all') Object.keys(statuses).forEach((k) => { statuses[k] = true })
    else statuses[key] = true
    set({
      screen: 'tracker', statuses, coFilter: 'All companies', catFilter: 'All categories',
      search: '', collapsed: bare({}), filtersOpen: false, settingsMenuOpen: false,
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
    const amt = positiveAmountOf(f.amount)
    if (!f.co || !f.cat || !f.desc || !amt) {
      set({ formError: 'Company, category, description and a positive amount are required.' })
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
      fee: t.fee || 0,
    }
    set({ editOpen: true, editId: t.id, edit: e, editOrig: e })
  }
  const setE = (k) => (e) => {
    const v = e.target.value
    set((s) => ({ edit: { ...s.edit, [k]: v } }))
  }

  /**
   * Everything the payment dialog needs, seeded from the row being edited.
   *
   * There are three ways into that dialog — choosing Completed on the edit
   * form, the "change" link beside an existing payment, and Mark as paid on the
   * sheet — and each used to write these keys itself. One of them never wrote
   * `payFee`, so the dialog opened carrying whatever the *previous* dialog had
   * left in it: empty after a reload, which silently deleted a recorded charge
   * on confirm, or another row's charge mid-session, which moved it onto this
   * row. Both wrote a wrong amount to a live ledger with nothing on screen
   * saying so.
   *
   * Seeding lives here now so a fourth caller cannot reintroduce it. Every key
   * the dialog reads is set on every open, from the row, never inherited.
   */
  const paySeedFor = (e, prev) => ({
    payOpen: true, payFor: 'edit', payPrev: prev,
    payType: e.payType || 'Cash',
    payCheck: e.checkNo || '',
    payFee: e.fee ? String(e.fee) : '',
    payErr: false,
  })

  /**
   * Choosing Completed in the edit form routes through the payment-method
   * dialog. Choosing anything else gives the e-cash charge back **here**, on
   * screen, rather than silently at save time.
   *
   * That subtraction used to live in `saveEdit`, which was wrong in a way no
   * test caught: it assumed `amount` still contained the charge, and the user
   * can retype Amount in between. Setting a paid ₱550 row (₱500 + ₱50) back to
   * Pending and typing 2000 saved **1950** — a number the screen never showed.
   * Doing it at the moment the charge stops being recorded means the field
   * updates in front of the user, and what is on screen is what gets written.
   */
  const setEditStatus = (ev) => {
    const v = ev.target.value
    if (v !== 'completed') {
      set((s) => {
        const e = s.edit || {}
        const charge = e.fee || 0
        const shown = amountOf(e.amount)
        // Only take the charge out of an amount that still contains it. If the
        // field has been cleared or already typed below the charge, the charge
        // is not in there to remove, and subtracting anyway produced a negative
        // — which `amountOf` then stripped the sign from, storing the absolute
        // value. Leaving the field alone means `saveEdit` refuses it and says
        // so, instead of writing a number nobody saw.
        const removable = charge > 0 && Number.isFinite(shown) && shown >= charge
        return {
          edit: {
            ...e, status: v, payType: '', checkNo: '', fee: null,
            // Left byte-for-byte as typed whenever there is nothing to remove,
            // so switching status never silently reformats what was entered.
            amount: removable ? String(shown - charge) : e.amount,
          },
        }
      })
      return
    }
    set((s) => ({
      edit: { ...s.edit, status: 'completed' },
      ...paySeedFor(s.edit || {}, (s.edit || {}).status || 'pending'),
    }))
  }

  /**
   * The "change" link beside a recorded payment, on the edit form. The row is
   * already completed, so cancelling has to leave it that way.
   */
  const openPayForEdit = () => set((s) => paySeedFor(s.edit || {}, 'completed'))

  const saveEdit = () => {
    const e = state.edit
    const id = state.editId
    const amt = positiveAmountOf(e.amount)
    if (!e.desc || !amt) { flash('Description and a positive amount are required'); return }
    const next = {
      ...state.txns.find((t) => t.id === id),
      co: e.co, cat: e.cat, desc: e.desc, period: e.period, due: e.due, amount: amt, status: e.status,
      payType: e.status === 'completed' ? (e.payType || 'Cash') : '',
      checkNo: e.status === 'completed' ? (e.checkNo || '') : '',
      // No arithmetic here. `setEditStatus` already took the charge out of the
      // amount when the row left completed, in front of the user, so this saves
      // exactly what the form is showing. Subtracting again here would take it
      // out twice; subtracting from a retyped amount is what made this wrong
      // before.
      fee: e.status === 'completed' ? (e.fee || null) : null,
      amount: amt,
      done: e.status === 'completed' ? (e.done || TODAY) : '',
      notes: e.notes,
    }
    const before = state.txns.find((t) => t.id === id)
    set((s) => ({ txns: s.txns.map((t) => t.id === id ? next : t), editOpen: false }))

    // Awaited, and reverted on failure. Every other write here is
    // fire-and-forget, which is the honest trade for an instant screen — but
    // this one can be *refused* rather than merely fail: the unique index from
    // D63 rejects a due date that would collide with another generated row for
    // the same payable. Announcing "Transaction updated" while Postgres kept
    // the old date is exactly the screen-versus-record divergence D60 was
    // about, and the toast that carried the error was overwritten seconds later.
    db.updateTxn(next).then(
      () => flash('Transaction updated'),
      (e) => {
        console.error('[supabase]', 'the transaction', e)
        set((s) => ({ txns: s.txns.map((t) => t.id === id ? before : t) }))
        flash(String(e && e.code) === '23505'
          ? 'Another row for this payable already has that due date — the change was not saved'
          : "Couldn't save the transaction — the change was undone")
      },
    )
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
    set({ payOpen: true, payFor: 'row', payId: t.id, payType: 'Cash', payCheck: '', payFee: '', payErr: false })
  }

  /**
   * A check number is no longer required to mark a row paid. It was the only
   * hard stop in this dialog, and it stopped the wrong thing: a check written
   * today often has no number to hand yet, and refusing the payment left the
   * row reading pending when it had actually gone out.
   *
   * An e-cash charge is added *into* `amount`, so the row totals what really
   * left the account, and kept in `fee` so the line can still say how much of
   * that was the charge. Re-opening a paid row and changing the charge has to
   * replace the old one rather than stack on it, which is what `base` is for:
   * every recalculation starts from the amount with any previous fee removed.
   */
  const confirmPay = () => {
    const { payId: id, payType: type } = state
    const num = String(state.payCheck).trim()
    const check = type === 'Check' ? num : ''
    // A charge below zero is not a charge, and adding one would *reduce* the
    // payable. Left blank means no charge, which is 0; anything negative is
    // refused rather than quietly clamped, so the field and the ledger agree.
    const typedFee = String(state.payFee).trim()
    const fee = type === 'E-cash' ? (typedFee === '' ? 0 : amountOf(typedFee)) : 0
    if (type === 'E-cash' && !(fee >= 0)) {
      set({ payErr: true })
      flash('An additional charge cannot be negative')
      return
    }
    if (state.payFor === 'edit') {
      // This path stages into the edit form; `saveEdit` is what reaches the
      // database. If the form is gone there is nothing to stage into, and
      // closing quietly would swallow a payment the user just confirmed. The
      // dialog can no longer outlive the form (see the modal stack in ui.jsx),
      // so this should be unreachable — it is here because the failure it
      // guards is silent, and a silent one on a money path is the worst kind.
      if (!state.editOpen || !state.edit) {
        set({ payOpen: false, payErr: false })
        flash('That payment was not recorded — reopen the transaction and set it again')
        return
      }
      set((s) => {
        const base = (amountOf(s.edit.amount) || 0) - (s.edit.fee || 0)
        return {
          edit: {
            ...s.edit, status: 'completed', done: s.edit.done || TODAY,
            payType: type, checkNo: check, fee: fee || null, amount: String(base + fee),
          },
          payOpen: false, payErr: false,
        }
      })
      return
    }
    const row = state.txns.find((t) => t.id === id)
    const base = row.amount - (row.fee || 0)
    const paid = { ...row, status: 'completed', done: TODAY, payType: type, checkNo: check, fee: fee || null, amount: base + fee }
    set((s) => ({ txns: s.txns.map((t) => t.id === id ? paid : t), payOpen: false, payErr: false }))
    save(db.updateTxn(paid), 'the payment')
    flash('Paid by ' + type.toLowerCase() + (type === 'Check' && num ? ' #' + num : '')
      + (fee ? ' — ' + fmt(fee) + ' charge added to the amount' : '')
      + ' — date completed filled in as ' + longDate(TODAY))
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
      // Seeded identically to `openLiquidate`, `liqFile` included. It was the
      // one key this call site omitted — the same two-call-site drift as D52,
      // and one stray close away from attaching one receipt's document to
      // another. Both openers now set every key the dialog reads.
      set({ liqOpen: true, liqId: r.id, liqDate: TODAY, liqAmount: String(r.amount), liqErr: false, liqFile: null })
      return
    }
    const next = { ...r, status: v, date: '', actual: null }
    set((s) => ({ receipts: s.receipts.map((x) => x.id === r.id ? next : x) }))
    save(db.updateReceipt(next), 'the receipt')
  }

  // The status dropdown starts on whatever `ackDefaultStatus` says — the
  // setting was stored but unwired until this form existed to honour it.
  const ACK_STATUS = bare({ Pending: 'pending', Released: 'released', 'On hold': 'hold' })

  const openReceipt = () => set((s) => ({
    rcpOpen: true,
    rcpError: '',
    // `own`: `ackDefaultStatus` comes from the free-form `app_config` blob, and
    // an inherited key is TRUTHY — so `ACK_STATUS['constructor']` would defeat
    // the `|| 'pending'` and seed the form with a function. `JSON.stringify`
    // then drops it, so the row would save with no status at all. Round 35.
    rcp: { co: '', name: '', desc: '', amount: '', status: own(ACK_STATUS, s.settings.ackDefaultStatus) || 'pending' },
  }))

  const closeReceipt = () => set({ rcpOpen: false, rcpError: '' })

  const setRcp = (k) => (e) => {
    const v = e.target.value
    set((s) => ({ rcp: { ...s.rcp, [k]: v }, rcpError: '' }))
  }

  const saveReceipt = () => {
    const r = state.rcp
    const amt = positiveAmountOf(r.amount)
    if (!r.co || !r.name.trim() || !amt) {
      set({ rcpError: 'Company, who received the cash, and a positive amount are required.' })
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
    const amt = positiveAmountOf(state.liqAmount)
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

  // ---- editing a receipt ----------------------------------------------
  // The Tracker has always opened a row into a form; the AckRec sheet only
  // ever let you change the status and liquidate. Every other field — who the
  // cash went to, what it was for, how much — was fixed at the moment it was
  // typed, and a typo meant deleting the row and starting again.
  const RCP_EMPTY = { co: '', name: '', desc: '', amount: '', status: 'pending', date: '', actual: '' }

  const openReceiptRow = (r) => () => {
    const e = {
      co: r.co, name: r.name, desc: r.desc, amount: String(r.amount), status: r.status,
      date: r.date || '', actual: r.actual == null ? '' : String(r.actual),
    }
    set({ rcpEditOpen: true, rcpEditId: r.id, rcpEdit: e, rcpEditOrig: e, rcpEditError: '' })
  }

  const setRcpE = (k) => (ev) => {
    const v = ev.target.value
    set((s) => ({ rcpEdit: { ...(s.rcpEdit || RCP_EMPTY), [k]: v }, rcpEditError: '' }))
  }

  const saveReceiptEdit = () => {
    const e = state.rcpEdit || RCP_EMPTY
    const id = state.rcpEditId
    const amt = positiveAmountOf(e.amount)
    if (!e.co || !e.name.trim() || !amt) {
      set({ rcpEditError: 'Company, who received the cash, and a positive amount are required.' })
      return
    }

    // Liquidated is the one status that carries figures with it. Letting a row
    // claim it without a date and an actual amount would put a receipt in the
    // settled column with nothing to reconcile against.
    const liquidated = e.status === 'liquidated'
    const actual = positiveAmountOf(e.actual)
    if (liquidated && (!e.date || !actual)) {
      set({ rcpEditError: 'A liquidated receipt needs both the date and the actual amount.' })
      return
    }

    const next = {
      ...state.receipts.find((r) => r.id === id),
      co: e.co, name: e.name.trim(), desc: e.desc.trim() || 'Cash advance', amount: amt,
      status: e.status,
      date: liquidated ? e.date : '',
      actual: liquidated ? actual : null,
    }
    set((s) => ({ receipts: s.receipts.map((r) => r.id === id ? next : r), rcpEditOpen: false, rcpEditError: '' }))
    save(db.updateReceipt(next), 'the receipt')
    flash('Receipt updated')
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

  // ---- telegraphic transfers -------------------------------------------
  // The sheet edits currency, status and note in place, the way the masterlist
  // does, so those go through the same coalescing queue: one write per row
  // after typing stops, not one per keystroke in the note field.
  const TEL_BLANK = () => ({ co: '', name: '', cur: 'USD', amount: '', status: 'pending', inv: '', note: '', rate: '', rate_as_of: '' })

  /**
   * The rate a form should open with, from the stored `fx_latest` map.
   *
   * Pre-filled as a real value rather than shown as a placeholder, so what is
   * on screen is what gets stored. A wire that saved with no rate would fall
   * back to the feed on every later render and quietly re-price itself when the
   * peso moved — the exact problem storing a rate exists to prevent.
   *
   * Empty when the feed has no row for that currency. The wire then saves
   * unpriced and falls through to TRANSFER_RATES, which is honest: the app has
   * no rate to offer and should not invent one.
   */
  const rateDefault = (cur) => {
    const live = own(state.fxRates, cur)
    return live && live.rate != null
      ? { rate: String(live.rate), rate_as_of: live.as_of || '' }
      : { rate: '', rate_as_of: '' }
  }

  const openTransfer = () => set({ telOpen: true, telError: '', tel: { ...TEL_BLANK(), ...rateDefault('USD') } })
  const closeTransfer = () => set({ telOpen: false, telError: '' })

  /**
   * Two keys are not plain text boxes.
   *
   * Changing the currency re-defaults the rate: a rate typed for USD is
   * meaningless against EUR, so carrying it across would be worse than
   * discarding it.
   *
   * Typing a rate re-dates it to today. The number is no longer the ECB fix it
   * was pre-filled with, so it must stop claiming that fix's date — a
   * hand-entered bank rate is a rate applying now.
   */
  const telPatch = (k, v, cur) => {
    if (k === 'cur') return { cur: v, ...rateDefault(v) }
    if (k === 'rate') return { rate: v, rate_as_of: TODAY }
    return { [k]: v }
  }

  const setTel = (k) => (e) => {
    const v = e.target.value
    set((s) => ({ tel: { ...(s.tel || TEL_BLANK()), ...telPatch(k, v) }, telError: '' }))
  }

  const saveTransfer = () => {
    const w = state.tel || TEL_BLANK()
    const amt = positiveAmountOf(w.amount)
    if (!w.co || !w.name.trim() || !amt) {
      set({ telError: 'Company, beneficiary and a positive amount are required.' })
      return
    }
    if (CUR.indexOf(w.cur) < 0) {
      set({ telError: 'Pick a currency.' })
      return
    }
    // `transfers.rate` carries `>= 0` (D65). Caught here so the form says so,
    // rather than the sheet keeping a rate Postgres refused.
    if (w.rate !== '' && w.rate != null && !(Number(w.rate) >= 0)) {
      set({ telError: 'A rate cannot be negative.' })
      return
    }
    const row = {
      id: Date.now(), co: w.co, name: w.name.trim(), cur: w.cur,
      amount: amt, status: w.status, inv: (w.inv || '').trim(), note: w.note.trim(),
      // Empty stays empty rather than becoming 0: `rows.js` turns '' into null,
      // meaning "never priced", while a stored 0 would mean "worth nothing".
      rate: w.rate, rate_as_of: w.rate_as_of,
    }
    set((s) => ({ transfers: [...s.transfers, row], telOpen: false, telError: '' }))
    save(db.insertTransfer(row), 'the new transfer')
    flash(row.co + ' \u00b7 ' + row.name + ' — transfer added')
  }

  const updTel = (id, k, v) => {
    const next = { ...state.transfers.find((w) => w.id === id), [k]: v }
    set((s) => ({ transfers: s.transfers.map((w) => w.id === id ? next : w) }))
    queueRow('transfers', next, save, db.updateTransfer, 'the transfer')
  }

  const openTransferRow = (w) => () => {
    // A wire priced already opens with its own rate. One that was never priced
    // — every wire that existed before rates shipped — opens with today's feed
    // rate offered, so pricing the backlog is opening a row and saving it. The
    // offer is only stored if somebody saves, and it is editable first.
    const priced = w.rate != null && w.rate !== ''
    const e = {
      co: w.co, name: w.name, cur: w.cur, amount: String(w.amount), status: w.status, inv: w.inv || '', note: w.note || '',
      ...(priced ? { rate: String(w.rate), rate_as_of: w.rate_as_of || '' } : rateDefault(w.cur)),
    }
    set({ telEditOpen: true, telEditId: w.id, telEdit: e, telEditOrig: e, telEditError: '' })
  }

  const setTelE = (k) => (e) => {
    const v = e.target.value
    set((s) => ({ telEdit: { ...(s.telEdit || TEL_BLANK()), ...telPatch(k, v) }, telEditError: '' }))
  }

  const saveTransferEdit = () => {
    const e = state.telEdit || TEL_BLANK()
    const id = state.telEditId
    const amt = positiveAmountOf(e.amount)
    if (!e.co || !e.name.trim() || !amt) {
      set({ telEditError: 'Company, beneficiary and a positive amount are required.' })
      return
    }
    if (e.rate !== '' && e.rate != null && !(Number(e.rate) >= 0)) {
      set({ telEditError: 'A rate cannot be negative.' })
      return
    }
    const next = {
      ...state.transfers.find((w) => w.id === id),
      co: e.co, name: e.name.trim(), cur: e.cur, amount: amt, status: e.status,
      inv: (e.inv || '').trim(), note: e.note.trim(),
      rate: e.rate, rate_as_of: e.rate_as_of,
    }
    cancelRow('transfers', id)
    set((s) => ({ transfers: s.transfers.map((w) => w.id === id ? next : w), telEditOpen: false, telEditError: '' }))
    save(db.updateTransfer(next), 'the transfer')
    flash('Transfer updated')
  }

  const askRemoveTransfer = (w) => () => set({ delTelId: w.id })
  const cancelRemoveTransfer = () => set({ delTelId: null })

  const confirmRemoveTransfer = () => {
    const id = state.delTelId
    const w = state.transfers.find((x) => x.id === id)
    if (!w) { set({ delTelId: null }); return }
    cancelRow('transfers', id)
    set((s) => ({ transfers: s.transfers.filter((x) => x.id !== id), delTelId: null }))
    save(db.deleteTransfer(id), 'the deletion')
    flash(w.co + ' \u00b7 ' + w.name + ' — transfer deleted')
  }

  // ---- masterlist ------------------------------------------------------
  /**
   * The four fields a Tracker row inherits from the payable that generated it.
   * `freq` and `dueDate` are deliberately absent: they decide what future rows
   * Generate writes, and rewriting the due date of a row already on the sheet
   * would move a real deadline nobody asked to move.
   */

  /**
   * Editing a payable reaches the open rows it produced.
   *
   * Only rows still linked (`src`) and not yet completed. A completed row is a
   * record of what was actually paid, so a later correction to the masterlist
   * must not rewrite history — it applies from the next Generate onward.
   */
  /**
   * Leaving an inline cell drops the draft, so the field goes back to showing
   * what is actually stored — and a half-typed `1250.` settles to `1250`.
   */
  const blurRec = () => set({ recDraft: null })

  const updRec = (id, k, v) => applyMasterlistEdit(state.recurring.find((p) => p.id === id), k, v,
    recEffects({ set, save, db, queueRow, queueCall, cancelPush, flash, id, key: k }))

  /**
   * Removing a payable unlinks its rows rather than taking them with it.
   *
   * The Tracker rows are real payables that were really due; the masterlist
   * only says they recur. Postgres does the unlink itself — `txns.src` is a
   * foreign key with ON DELETE SET NULL — so the local state is mirroring the
   * database here, not driving it.
   */
  const removeRec = (p) => () => {
    // Everything armed for this payable, not just its own row write — see
    // `cancelForRecurring`. A push-down that survives the delete writes an
    // amount to the ledger for a payable that is gone.
    cancelForRecurring(p.id)
    const kept = state.txns.filter((t) => t.src === p.id).length
    set((s) => ({
      recurring: s.recurring.filter((x) => x.id !== p.id),
      txns: s.txns.map((t) => t.src === p.id ? { ...t, src: null } : t),
    }))
    save(db.deleteRecurring(p.id), 'the removal')
    flash(p.co + ' · ' + p.cat + ' removed'
      + (kept ? ' — ' + kept + ' Tracker ' + (kept === 1 ? 'row stays' : 'rows stay') + ', now unlinked' : ''))
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
    const amt = positiveAmountOf(r.amount)
    if (!r.co || !r.cat || !amt) { flash('Company, category and a positive amount are required'); return }
    const row = { id: Date.now(), co: r.co, cat: r.cat, freq: r.freq, desc: r.desc || r.cat, dueDate: r.dueDate || TODAY, amount: amt }
    set((s) => ({ recurring: [...s.recurring, row], recOpen: false }))
    save(db.insertRecurring(row), 'the recurring payable')
    flash('Recurring payable added')
  }

  /**
   * Generate re-reads the ledger before deciding what to write.
   *
   * `alreadyOnSheet` is the dedupe rule, and it was being asked about
   * `state.txns` — the page-load snapshot. The scheduler writes this same month
   * unattended, so a tab opened in the morning could be hours stale, see none
   * of those rows, and duplicate a whole month of liability on one click. Same
   * family as D61 and D62: a guard evaluated against a snapshot is advisory.
   *
   * Re-reading costs one query and makes the "idempotent by construction" claim
   * in `scripts/schedule.mjs` true against concurrent writers rather than only
   * against itself.
   */
  const generate = (key) => async () => {
    const month = isMonthKey(key) ? key : state.genMonth
    if (!isMonthKey(month)) { flash('Pick a valid month first'); return }

    if (state.generating) return
    // Claimed BEFORE the await, not after it. Setting it only once the re-read
    // returned left a whole round trip in which a second click passed this
    // guard and both buttons were still enabled.
    set({ generating: true })
    let existing
    try {
      existing = await db.freshTxns()
    } catch (e) {
      console.error('[supabase]', 'the ledger re-read before Generate', e)
      set({ generating: false })
      flash("Couldn't check what is already on the sheet — nothing was generated")
      return
    }
    set({ txns: existing })
    const { rows, skipped, label, unresolved } = buildGeneratedRows(state.recurring, existing, month)
    // Reported, not refused. `buildGeneratedRows` already excludes an unpriced
    // payable, so nothing here can violate `txns.amount > 0` — the guard that
    // used to stand here blocked work it did not need to block, and because a
    // Monthly payable has an occurrence in every month, one unpriced row
    // refused Generate for all thirteen months the menu offers, priced siblings
    // included.
    const unpriced = unpricedFor(state.recurring, month)
    if (!rows.length) {
      flash(unresolved.length
        ? unresolved.length + ' linked Tracker ' + (unresolved.length === 1 ? 'row has' : 'rows have') + ' no occurrence identity; generation was refused for those payables'
        : unpriced.length
        ? unpriced.length + ' ' + label + ' ' + (unpriced.length === 1 ? 'payable needs' : 'payables need')
          + ' an amount before ' + (unpriced.length === 1 ? 'it' : 'they') + ' can be generated'
        : 'Every recurring payable already exists for ' + label)
      set({ genMenuOpen: false, generating: false })
      return
    }
    // Painted only after the insert commits. Postgres aborts a multi-row insert
    // whole when the unique index refuses one row (D63), so an optimistic paint
    // put a phantom month on screen with a banner that does not expire — and
    // Undo could not clear it, because `generatedIds` named rows that had never
    // existed. Same lesson as D60: never paint what has not been written.
    set({ genMenuOpen: false, genMonth: month })
    try {
      await db.insertTxns(rows)
    } catch (e) {
      console.error('[supabase]', 'the generated payables', e)
      set({ generating: false })
      flash(String(e && e.code) === '23505'
        ? 'Someone generated ' + label + ' first — nothing was written. Reopen the month to see it.'
          + (unresolved.length ? ' ' + unresolved.length + ' linked Tracker ' + (unresolved.length === 1 ? 'row has' : 'rows have') + ' no occurrence identity; generation remains paused.' : '')
        : "Couldn't generate " + label + ' — nothing was written')
      return
    }
    set((s) => ({
      txns: [...rows, ...s.txns],
      generatedIds: rows.map((r) => r.id),
      bannerOpen: true, generating: false,
      bannerText: rows.length + ' ' + label + ' payables were added to the Tracker' +
        (skipped ? ' — ' + skipped + ' skipped as duplicates' : '') +
        (unpriced.length ? ' — ' + unpriced.length + ' skipped for having no amount yet' : '') +
        (unresolved.length ? ' — ' + unresolved.length + ' linked rows lack occurrence identity' : '') + '.',
    }))
  }

  /**
   * Undo removes the rows Generate just wrote — but only the ones nobody has
   * acted on since.
   *
   * `generatedIds` outlives the rows it names, and the banner's own "Review
   * them" link walks the user to the Tracker without dismissing it. So the
   * sequence Generate → Review them → Mark as paid → Undo was reachable, and
   * it deleted a transaction that had been paid, taking the recorded payment
   * with it and saying only "Generated rows removed".
   *
   * A completed row is a record of money that moved; Generate's convenience
   * does not get to erase one. This is the same rule `updRec` already applies
   * when a masterlist edit pushes down, for the same reason.
   */
  const undoGenerate = () => {
    const ids = state.generatedIds
    const mine = state.txns.filter((t) => ids.indexOf(t.id) >= 0)
    const removable = mine.filter((t) => t.status !== 'completed' && !t.done)
    const removableIds = removable.map((t) => t.id)

    // The client filter above is a first pass over a page-load snapshot and
    // cannot see a row another session has paid since — `deleteTxns` carries
    // the real guard, and the screen and the toast are painted from what it
    // actually removed (D61/D62, trap 88).
    if (!removableIds.length) {
      set({ generatedIds: [], bannerOpen: false })
      flash('Nothing to undo — every generated row has been paid')
      return
    }

    // The banner is the ONLY way to reach this action, so it is dismissed on
    // success rather than on click. Clearing it first meant a failed delete —
    // a dropped connection, a session past `retryOnce`'s one refresh — left the
    // rows in the ledger and Undo permanently unreachable, because
    // `generatedIds` had already gone.
    save(db.deleteTxns(removableIds).then((removed) => {
      set((s) => ({
        txns: s.txns.filter((t) => removed.indexOf(t.id) < 0),
        generatedIds: [], bannerOpen: false,
      }))
      // How many were left behind, without claiming why. `removable` was chosen
      // from a stale snapshot, so a row missing from `removed` may have been
      // paid by another session — or deleted by one. Asserting "already paid"
      // would be the toast promising something the database never said.
      const spared = removableIds.length - removed.length
      flash(spared
        ? removed.length + ' removed — ' + spared + ' left in place, ' +
          (spared === 1 ? 'it changed' : 'they changed') + ' in another session'
        : 'Generated rows removed')
    }), 'the undo')
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

  const hoverNote = (i) => () => set({ noteHover: i })
  const unhoverNote = (i) => () => set((s) => ({ noteHover: s.noteHover === i ? null : s.noteHover }))

  const editNote = (i) => () => set((s) => ({ noteEditing: i, noteEditDraft: s.notes[i].t }))
  const cancelNote = () => set({ noteEditing: null, noteEditDraft: '' })

  /** An empty reminder is a deletion nobody asked for, so it is refused. */
  const saveNote = (i) => () => {
    const v = String(state.noteEditDraft).trim()
    if (!v) { flash('A reminder needs some text'); return }
    set((s) => ({
      notes: s.notes.map((x, j) => j === i ? { ...x, t: v } : x),
      noteEditing: null, noteEditDraft: '',
    }))
  }

  const removeNote = (i) => () => {
    set((s) => ({ notes: s.notes.filter((x, j) => j !== i), noteEditing: null, noteHover: null }))
    flash('Reminder deleted')
  }

  // ---- tracker sort ----------------------------------------------------
  const toggleSort = () => set((s) => ({ sortOpen: !s.sortOpen, exportOpen: false }))
  const flipSort = () => set((s) => ({ sortDir: s.sortDir === 'desc' ? 'asc' : 'desc' }))

  /** Picking the key already in use flips the direction, the way a column header does. */
  const pickSort = (k) => () => set((s) => (s.sortKey === k
    ? { sortDir: s.sortDir === 'desc' ? 'asc' : 'desc', sortOpen: false }
    : { sortKey: k, sortOpen: false }))

  // ---- tracker export --------------------------------------------------
  const toggleExport = () => set((s) => ({ exportOpen: !s.exportOpen, sortOpen: false }))

  /**
   * Renders the summary to a PNG and downloads it.
   *
   * `html2canvas` rasterises a real DOM node, so the node has to exist and be
   * laid out — hence a detached-looking element parked far off-screen rather
   * than `display:none`, which has no dimensions to measure. It is removed
   * again in a `finally`, so a failed render leaves nothing behind.
   *
   * The import is dynamic on purpose. The library is ~200 kB and only matters
   * to somebody who clicks Export, so Vite splits it into its own chunk and the
   * app's first paint carries none of it. It is bundled rather than loaded from
   * a CDN because the deployment sends `script-src 'self'`, which blocks the
   * prototype's jsdelivr tag outright.
   */
  const exportPng = async () => {
    set({ exportOpen: false })
    const node = document.createElement('div')
    node.style.cssText = 'position:fixed;left:-12000px;top:0;width:940px;background:#fff'
    node.innerHTML = summaryHTML(state)
    document.body.appendChild(node)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' })
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = 'tracker-summary-' + TODAY + '.png'
      a.click()
      flash('Summary PNG downloaded')
    } catch (e) {
      console.error('[export]', e)
      flash('Could not render the PNG — try Save as PDF')
    } finally {
      node.remove()
    }
  }

  /**
   * Prints the summary from a popup and lets the browser's own print dialog
   * save the PDF.
   *
   * No rendering library on this path: the page is written into a window this
   * app opened, and `print()` is the one PDF writer already installed on every
   * machine.
   */
  const exportPdf = () => {
    set({ exportOpen: false })
    const w = window.open('', '_blank', 'width=980,height=760')
    if (!w) { flash('Allow pop-ups to save the PDF'); return }
    w.document.write('<!DOCTYPE html><html><head><title>Tracker summary ' + TODAY + '</title>'
      + '<style>@page{margin:14mm}body{margin:0;font-family:Inter,system-ui,sans-serif}</style>'
      + '</head><body>' + summaryHTML(state) + '</body></html>')
    w.document.close()
    setTimeout(() => { w.focus(); w.print() }, 450)
    flash('Print dialog opened — choose “Save as PDF”')
  }

  // ---- masterlist settings lists --------------------------------------
  const addCompany = () => {
    const r = addToList(state.companies, state.coDraft, { upper: true })
    if (r.reason === 'empty') return
    if (r.reason === 'duplicate') { flash(r.clash + ' is already in the list'); return }
    set({ companies: r.list, coDraft: '' })
  }
  const addCategory = () => {
    const r = addToList(state.categories, state.catDraft)
    if (r.reason === 'empty') return
    // Named rather than silent: the duplicate that matters is a case variant,
    // which is exactly the one the person typing it cannot see.
    if (r.reason === 'duplicate') { flash(r.clash + ' is already in the list'); return }
    set({ categories: r.list, catDraft: '' })
  }
  const removeCompany = (c) => () => set((s) => ({ companies: s.companies.filter((x) => x !== c) }))
  const removeCategory = (c) => () => set((s) => ({ categories: s.categories.filter((x) => x !== c) }))

  // ---- tracker filters -------------------------------------------------
  const toggleStatus = (k) => () =>
    // `bare(...)`, not `{...}`: spreading a null-prototype object produces an
    // ORDINARY one, so without this the guarantee lasted until the first toggle
    // and no longer. Round 37.
    set((s) => ({ statuses: bare({ ...s.statuses, [k]: !s.statuses[k] }) }))

  const toggleGroup = (name) => () =>
    // Keyed by a company or category name, both free text. See `own`.
    set((s) => ({ collapsed: bare({ ...s.collapsed, [name]: !own(s.collapsed, name) }) }))

  const clearFilters = () => set({
    coFilter: 'All companies', catFilter: 'All categories', search: '',
    statuses: bare({ pending: true, overdue: true, completed: false, hold: false }),
  })

  const field = (k) => (e) => set({ [k]: e.target.value })

  const actions = {
    state, set, flash, go, goSettings, setS, tileFilter, field,
    openAdd, closeAdd, setF, pickFormStatus, commit,
    openRow, setE, setEditStatus, openPayForEdit, saveEdit, deleteEdit,
    openPay, confirmPay, cancelPay,
    openPeriod, applyPeriod,
    setReceiptStatus, openLiquidate, saveLiq, pickLiqFile, openReceiptFile,
    askRemoveReceipt, cancelRemoveReceipt, confirmRemoveReceipt,
    openReceiptRow, setRcpE, saveReceiptEdit,
    openTransfer, closeTransfer, setTel, saveTransfer, updTel,
    openTransferRow, setTelE, saveTransferEdit,
    askRemoveTransfer, cancelRemoveTransfer, confirmRemoveTransfer,
    openReceipt, closeReceipt, setRcp, saveReceipt,
    updRec, blurRec, removeRec, openRecurring, setR, saveRecurring,
    generate, undoGenerate, generatedFor,
    addNote, toggleNote, hoverNote, unhoverNote, editNote, saveNote, cancelNote, removeNote,
    addCompany, addCategory, removeCompany, removeCategory,
    toggleStatus, toggleGroup, clearFilters,
    toggleSort, flipSort, pickSort, toggleExport, exportPng, exportPdf,
  }

  return state.readOnly ? viewerActions(actions, flash) : actions
}
