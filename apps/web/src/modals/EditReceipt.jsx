import { useActions } from '../actions.js'
import { statusOptions } from '../logic.js'
import { Field, Modal, Select } from '../ui.jsx'

const EMPTY = { co: '', name: '', desc: '', amount: '', status: 'pending', date: '', actual: '' }

const STATUSES = [
  { v: 'pending', label: 'Pending' },
  { v: 'released', label: 'Released' },
  { v: 'liquidated', label: 'Liquidated' },
  { v: 'hold', label: 'On hold' },
]

/**
 * The Tracker's edit form, for a receipt. Every field the add form collects is
 * editable here, which until now none of them were — a mistyped name or amount
 * could only be fixed by deleting the row and re-entering it.
 *
 * Date and actual appear only for a liquidated receipt, because they are what
 * liquidation means; the Liquidate dialog remains the normal way in, and this
 * is for correcting one after the fact.
 */
export default function EditReceipt() {
  const { state, set, setRcpE, saveReceiptEdit, openReceiptFile } = useActions()
  const e = state.rcpEdit || EMPTY
  const current = state.receipts.find((r) => r.id === state.rcpEditId)
  const close = () => set({ rcpEditOpen: false, rcpEditError: '' })

  const amount = Number(String(e.amount).replace(/[^0-9.-]/g, '')) || 0
  const actual = Number(String(e.actual).replace(/[^0-9.-]/g, '')) || 0
  const diff = e.status === 'liquidated' && e.actual !== '' ? amount - actual : null

  return (
    <Modal onClose={close} width={600}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <h2>Receipt details</h2>
          <div className="sub">{e.co} · {e.name}</div>
        </div>
        <div className="spacer" />
        {current && current.filePath ? (
          <button type="button" className="btn" onClick={openReceiptFile(current)}>View file</button>
        ) : null}
        <button type="button" className="btn" onClick={close}>Cancel</button>
      </div>

      <div className="row-2">
        <Field label="Company">
          <Select value={e.co} onChange={setRcpE('co')} options={state.companies} />
        </Field>
        <Field label="Released to">
          <input className="field" value={e.name} onChange={setRcpE('name')} />
        </Field>
      </div>

      <Field label="Description">
        <input className="field" value={e.desc} onChange={setRcpE('desc')} />
      </Field>

      <div className="row-2">
        <Field label="Amount released">
          <input className="field num" value={e.amount} onChange={setRcpE('amount')} />
        </Field>
        <Field label="Status">
          <select className="field" value={e.status ?? ''} onChange={setRcpE('status')}>
            {statusOptions(e.status, STATUSES).map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </Field>
      </div>

      {e.status === 'liquidated' ? (
        <div className="row-2">
          <Field label="Date liquidated">
            <input type="date" className="field" value={e.date} onChange={setRcpE('date')} />
          </Field>
          <Field label="Actual amount" hint={diff == null || diff === 0 ? '' : (diff > 0 ? 'returned' : 'overspent')}>
            <input className="field num" value={e.actual} onChange={setRcpE('actual')} />
          </Field>
        </div>
      ) : null}

      {state.rcpEditError ? (
        <span style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 600 }}>{state.rcpEditError}</span>
      ) : null}

      <div className="modal-actions ruled">
        <div className="spacer" />
        <button type="button" className="btn quiet"
                onClick={() => set((s) => ({ rcpEdit: s.rcpEditOrig, rcpEditError: '' }))}>Discard changes</button>
        <button type="button" className="btn primary" onClick={saveReceiptEdit}>Save</button>
      </div>
    </Modal>
  )
}
