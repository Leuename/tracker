import { useActions } from '../actions.js'
import { CSYM, CUR } from '../data.js'
import { Field, Modal, Select } from '../ui.jsx'

const EMPTY = { co: '', name: '', cur: 'USD', amount: '', status: 'pending', note: '' }

const STATUSES = [
  { v: 'pending', label: 'Pending' },
  { v: 'released', label: 'Released' },
  { v: 'onhold', label: 'Onhold' },
  { v: 'cancelled', label: 'Cancelled' },
]

/**
 * The sheet already edits currency, status and note in place. This is for the
 * fields it cannot reach — company, beneficiary and amount — so a mistyped
 * wire can be corrected rather than deleted and re-entered.
 */
export default function EditTransfer() {
  const { state, set, setTelE, saveTransferEdit } = useActions()
  const e = state.telEdit || EMPTY
  const close = () => set({ telEditOpen: false, telEditError: '' })

  return (
    <Modal onClose={close} width={600}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <h2>Transfer details</h2>
          <div className="sub">{e.co} · {e.name}</div>
        </div>
        <div className="spacer" />
        <button type="button" className="btn" onClick={close}>Cancel</button>
      </div>

      <div className="row-2">
        <Field label="Company">
          <Select value={e.co} onChange={setTelE('co')} options={state.companies} />
        </Field>
        <Field label="Beneficiary">
          <input className="field" value={e.name} onChange={setTelE('name')} />
        </Field>
      </div>

      <div className="row-3">
        <Field label="Currency">
          <select className="field" value={e.cur} onChange={setTelE('cur')}>
            {CUR.map((c) => <option key={c} value={c}>{CSYM[c] + '  ' + c}</option>)}
          </select>
        </Field>
        <Field label="Amount" hint={CSYM[e.cur] || ''}>
          <input className="field num" value={e.amount} onChange={setTelE('amount')} />
        </Field>
        <Field label="Status">
          <select className="field" value={e.status} onChange={setTelE('status')}>
            {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Note" hint="optional">
        <input className="field" value={e.note} onChange={setTelE('note')} />
      </Field>

      {state.telEditError ? (
        <span style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 600 }}>{state.telEditError}</span>
      ) : null}

      <div className="modal-actions ruled">
        <div className="spacer" />
        <button type="button" className="btn quiet"
                onClick={() => set((s) => ({ telEdit: s.telEditOrig, telEditError: '' }))}>Discard changes</button>
        <button type="button" className="btn primary" onClick={saveTransferEdit}>Save</button>
      </div>
    </Modal>
  )
}
