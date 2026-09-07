import { editRecurring, pushPlan } from './logic.js'
import { pushKey } from './pending.js'

export function recEffects({ set, save, db, queueRow, queueCall, cancelPush, flash, id, key }) {
  return {
    draft: (v) => set({ recDraft: { id, k: key, text: v } }),
    paint: (next) => set((s) => ({ recurring: s.recurring.map((p) => (p.id === id ? next : p)) })),
    saveRow: (next) => queueRow('recurring', next, save, db.updateRecurring, 'the masterlist row'),
    cancelPush: (rowId, field) => cancelPush(rowId, field),
    queuePush: (pendingKey, patch, src, field, val) => queueCall(pendingKey, () => {
      save(db.patchTxns(patch, src).then((written) => {
        if (!written.length) return
        set((s) => ({ txns: s.txns.map((t) => (written.indexOf(t.id) >= 0 ? { ...t, [field]: val } : t)) }))
        flash(written.length + ' open Tracker ' + (written.length === 1 ? 'row' : 'rows') + ' updated to match')
      }), 'the linked Tracker rows')
    }),
  }
}

/**
 * What one masterlist keystroke does, with the effects passed in.
 *
 * This lived inline in `updRec` until 2026-09-06, and `actions.js` cannot be
 * imported by a test — it pulls in `store.jsx` and React through it. Rounds 19
 * through 24 each found a surviving mutant in that function, and the source-text
 * assertions written to compensate were defeated three separate ways: a
 * commented-out copy of a pinned line, a string literal holding the same text,
 * and `if (state.readOnly)` prefixed to a pinned statement. A regex over source
 * cannot tell a statement from a statement that never runs.
 *
 * So the decisions live here instead, where a test drives them with spies:
 *
 * - `cancelPush(id, k)` when the value stops being pushable, or the write armed
 *   by the previous keystroke fires with the value the user just took back.
 * - `paint(next)` and `saveRow(next)` always — the payable saves whether or not
 *   anything travels with it.
 * - `queuePush(...)` only when there is something to write.
 *
 * The caller supplies the effects; it holds no logic of its own.
 */
export function applyMasterlistEdit(row, k, v, fx) {
  // The raw keystrokes, before anything is parsed. The screen shows these while
  // the cell is being typed into; the ledger gets the sanitised value below.
  fx.draft(v)
  const next = editRecurring(row, k, v)
  const val = next[k]
  const plan = pushPlan(k, val)

  // Retract first: this must run whether or not anything is pushed, and it must
  // run before the early return below, which tests the same predicate.
  if (plan.retract) fx.cancelPush(row.id, k)

  // The payable itself moves now; the push-down onto linked rows happens inside
  // the debounced callback, alongside its database write, so one cancel stops
  // both and the rows update when they are actually written rather than before.
  fx.paint(next)
  fx.saveRow(next)

  if (!plan.patch) return { next, val, plan, pushed: false }
  fx.queuePush(pushKey(row.id, k), plan.patch, row.id, k, val)
  return { next, val, plan, pushed: true }
}
