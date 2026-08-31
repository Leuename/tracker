import { useActions } from '../actions.js'
import { FREQ } from '../data.js'
import { ruleLabel } from '../logic.js'
import { Field, Modal, Select } from '../ui.jsx'

export default function AddRecurring() {
  const { state, set, setR, saveRecurring } = useActions()
  const r = state.rec
  const close = () => set({ recOpen: false })

  return (
    <Modal onClose={close} width={520} align="center">
      <h2>Add a recurring payable</h2>

      <div className="row-2">
        <Field label="Company">
          <Select value={r.co} onChange={setR('co')} options={state.companies} placeholder="Choose a company" />
        </Field>
        <Field label="Expense category">
          <Select value={r.cat} onChange={setR('cat')} options={state.categories} placeholder="Choose a category" />
        </Field>
      </div>

      <Field label="Description">
        <input className="field" value={r.desc} onChange={setR('desc')} />
      </Field>

      <div className="row-3">
        <Field label="How often">
          <Select value={r.freq} onChange={setR('freq')} options={FREQ} />
        </Field>
        <Field label="Due date">
          <input type="date" className="field" value={r.dueDate} onChange={setR('dueDate')} />
          <div className="rule" style={{ marginTop: 4 }}>{ruleLabel(r.freq, r.dueDate)}</div>
        </Field>
        <Field label="Amount">
          <input className="field num" placeholder="0.00" value={r.amount} onChange={setR('amount')} />
        </Field>
      </div>

      <div className="modal-actions">
        <div className="spacer" />
        <button type="button" className="btn quiet" onClick={close}>Cancel</button>
        <button type="button" className="btn primary" onClick={saveRecurring}>Save</button>
      </div>
    </Modal>
  )
}
