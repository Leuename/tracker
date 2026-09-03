import { useActions } from '../actions.js'
import { CSYM, CUR } from '../data.js'
import { Field, Modal, Select } from '../ui.jsx'
import RateField from './RateField.jsx'

const EMPTY = { co: '', name: '', cur: 'USD', amount: '', status: 'pending', note: '', rate: '', rate_as_of: '' }

const STATUSES = [
  { v: 'pending', label: 'Pending' },
  { v: 'released', label: 'Released' },
  { v: 'onhold', label: 'Onhold' },
  { v: 'cancelled', label: 'Cancelled' },
]

/**
 * The amount is entered in the wire's own currency, not in pesos. Nothing
 * converts on the way in — the row stores exactly what was sent.
 */
export default function AddTransfer() {
  const { state, setTel, saveTransfer, closeTransfer } = useActions()
  const w = state.tel || EMPTY
  const bad = (k) => !!state.telError && !String(w[k]).trim()

  return (
    <Modal onClose={closeTransfer} width={600}>
      <h2>Add a telegraphic transfer</h2>
      <div className="sub">an outbound wire, in the currency it is sent in</div>

      <div className="row-2">
        <Field label="Company">
          <Select value={w.co} onChange={setTel('co')} options={state.companies}
                  placeholder="Select a company" invalid={bad('co')} />
        </Field>
        <Field label="Beneficiary">
          <input className={'field' + (bad('name') ? ' invalid' : '')}
                 placeholder="Who is being paid" value={w.name} onChange={setTel('name')} />
        </Field>
      </div>

      <div className="row-3">
        <Field label="Currency">
          <select className="field" value={w.cur} onChange={setTel('cur')}>
            {CUR.map((c) => <option key={c} value={c}>{CSYM[c] + '  ' + c}</option>)}
          </select>
        </Field>
        <Field label="Amount" hint={CSYM[w.cur] || ''}>
          <input className={'field num' + (bad('amount') ? ' invalid' : '')}
                 placeholder="0.00" value={w.amount} onChange={setTel('amount')} />
        </Field>
        <Field label="Status">
          <select className="field" value={w.status} onChange={setTel('status')}>
            {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </Field>
      </div>

      <RateField w={w} cur={w.cur} live={(state.fxRates || {})[w.cur]} onChange={setTel('rate')} />

      <Field label="Note" hint="optional">
        <input className="field" placeholder="Reference, purchase order, or why it is waiting"
               value={w.note} onChange={setTel('note')} />
      </Field>

      <div className="modal-actions ruled">
        {state.telError ? (
          <span style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 600 }}>{state.telError}</span>
        ) : null}
        <div className="spacer" />
        <button type="button" className="btn" onClick={closeTransfer}>Cancel</button>
        <button type="button" className="btn primary" onClick={saveTransfer}>Save</button>
      </div>
    </Modal>
  )
}
