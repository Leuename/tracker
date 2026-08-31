import { useActions } from '../actions.js'
import { Field, Modal, Select } from '../ui.jsx'

const STATUS_CHOICES = [
  { k: 'pending', label: 'Pending' },
  { k: 'released', label: 'Released' },
  { k: 'hold', label: 'On hold' },
]

export default function AddReceipt() {
  const { state, closeReceipt, setRcp, saveReceipt } = useActions()
  const r = state.rcp
  const bad = (k) => !!state.rcpError && !String(r[k]).trim()

  return (
    <Modal onClose={closeReceipt} width={520} align="center">
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <h2>Add a receipt</h2>
        <div className="spacer" />
        <button type="button" className="icon-btn" aria-label="Close" onClick={closeReceipt}>✕</button>
      </div>

      <div className="row-2">
        <Field label="Company">
          <Select value={r.co} onChange={setRcp('co')} options={state.companies}
                  placeholder="Choose a company" invalid={bad('co')} />
        </Field>
        <Field label="Released to">
          <input className={'field' + (bad('name') ? ' invalid' : '')} placeholder="Who received the cash"
                 value={r.name} onChange={setRcp('name')} />
        </Field>
      </div>

      <Field label="Description" hint="optional">
        <input className="field" placeholder="What the cash is for"
               value={r.desc} onChange={setRcp('desc')} />
      </Field>

      <div className="row-2">
        <Field label="Amount released">
          <input className={'field num' + (bad('amount') ? ' invalid' : '')} placeholder="0.00"
                 value={r.amount} onChange={setRcp('amount')} />
        </Field>
        <Field label="Status">
          <Select value={r.status} onChange={setRcp('status')}
                  options={STATUS_CHOICES.map((s) => s.k)} />
        </Field>
      </div>

      {/* Liquidation is its own step: the date and actual amount are collected
          there, not here, so a new receipt always starts unliquidated. */}
      <div className="hint">
        Date liquidated and actual amount are filled in later, when you liquidate it.
      </div>

      <div className="modal-actions" style={{ paddingTop: 3 }}>
        {state.rcpError ? (
          <span style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 600 }}>{state.rcpError}</span>
        ) : null}
        <div className="spacer" />
        <button type="button" className="btn quiet" onClick={closeReceipt}>Cancel</button>
        <button type="button" className="btn primary" onClick={saveReceipt}>Save</button>
      </div>
    </Modal>
  )
}
