import { useActions } from '../actions.js'
import { TODAY, blankForm } from '../data.js'
import { longDate } from '../logic.js'
import { Field, Modal, PeriodPicker, Select } from '../ui.jsx'

const STATUS_CHOICES = [
  { k: 'pending', label: 'Pending' },
  { k: 'completed', label: 'Completed' },
  { k: 'hold', label: 'On hold' },
]

export default function AddTransaction() {
  const { state, closeAdd, setF, pickFormStatus, commit } = useActions()
  const f = state.form || blankForm()
  const bad = (k) => !!state.formError && !f[k]

  return (
    <Modal onClose={closeAdd} width={560}>
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <h2>Add a transaction</h2>
        <div className="spacer" />
        <button type="button" className="icon-btn" aria-label="Close" onClick={closeAdd}>✕</button>
      </div>

      <div className="row-2">
        <Field label="Company">
          <Select value={f.co} onChange={setF('co')} options={state.companies}
                  placeholder="Choose a company" invalid={bad('co')} />
        </Field>
        <Field label="Expense category">
          <Select value={f.cat} onChange={setF('cat')} options={state.categories}
                  placeholder="Choose a category" invalid={bad('cat')} />
        </Field>
      </div>

      <Field label="Description">
        <input className={'field' + (bad('desc') ? ' invalid' : '')} placeholder="What is being paid for"
               value={f.desc} onChange={setF('desc')} />
      </Field>

      <div className="row-3">
        <PeriodPicker which="add" value={f.period} />
        <Field label="Due date">
          <input type="date" className="field" value={f.due} onChange={setF('due')} />
        </Field>
        <Field label="Amount">
          <input className={'field num' + (bad('amount') ? ' invalid' : '')} placeholder="0.00"
                 value={f.amount} onChange={setF('amount')} />
        </Field>
      </div>

      <div className="row-2">
        <Field label="Status">
          <div style={{ display: 'flex', gap: 7 }}>
            {STATUS_CHOICES.map((s) => (
              <button key={s.k} type="button" className={'pill' + (f.status === s.k ? ' on' : '')}
                      onClick={pickFormStatus(s.k)}>{s.label}</button>
            ))}
          </div>
        </Field>
        <Field label="Date completed">
          <div className="dashed">{f.status === 'completed' ? longDate(TODAY) : 'fills in when you mark it completed'}</div>
        </Field>
      </div>

      <Field label="Notes" hint="optional">
        <input className="field" value={f.notes} onChange={setF('notes')} />
      </Field>

      <div className="hint">Overdue isn’t on the list — the system marks that for you once the due date passes.</div>

      <div className="modal-actions" style={{ paddingTop: 3 }}>
        {state.formError ? (
          <span style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 600 }}>{state.formError}</span>
        ) : null}
        {!state.formError && state.formWarning ? (
          <span role="alert" style={{ fontSize: 12.5, color: '#BE8A38', fontWeight: 600 }}>{state.formWarning}</span>
        ) : null}
        <div className="spacer" />
        <button type="button" className="btn quiet" onClick={closeAdd}>Cancel</button>
        <button type="button" className="btn quiet" onClick={commit(true)}>Save &amp; add another</button>
        <button type="button" className="btn primary" onClick={commit(false)}>Save</button>
      </div>
    </Modal>
  )
}
