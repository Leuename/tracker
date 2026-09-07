import { useActions } from '../actions.js'
import { Field, Modal, PeriodPicker, Select } from '../ui.jsx'
import { IconTrash } from '../icons.jsx'

const EMPTY = { co: '', cat: '', desc: '', period: '', due: '', amount: '', status: 'pending', done: '', notes: '' }

export default function EditTransaction() {
  const { state, set, setE, setEditStatus, openPayForEdit, saveEdit, deleteEdit } = useActions()
  const e = state.edit || EMPTY
  const close = () => set({ editOpen: false })

  const payLabel = e.status === 'completed' && e.payType
    ? (e.payType === 'Check' ? 'Paid by check #' + e.checkNo : 'Paid by ' + e.payType.toLowerCase())
    : ''

  return (
    <Modal onClose={close} width={600}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <h2>Transaction details</h2>
          <div className="sub">{e.co} · {e.cat}</div>
        </div>
        <div className="spacer" />
        <button type="button" className="btn danger" onClick={deleteEdit}>
          Delete transaction <IconTrash size={15} />
        </button>
        <button type="button" className="btn" onClick={close}>Cancel</button>
      </div>

      <div className="row-2">
        <Field label="Company">
          <Select value={e.co} onChange={setE('co')} options={state.companies} />
        </Field>
        <Field label="Expense category">
          <Select value={e.cat} onChange={setE('cat')} options={state.categories} />
        </Field>
      </div>

      <Field label="Description">
        <input className="field" value={e.desc} onChange={setE('desc')} />
      </Field>

      <div className="row-3">
        <PeriodPicker which="edit" value={e.period} />
        <Field label="Due date">
          <input type="date" className="field" value={e.due} onChange={setE('due')} />
        </Field>
        <Field label="Amount">
          <input className="field num" value={e.amount} onChange={setE('amount')} />
        </Field>
      </div>

      <div className="row-2">
        <Field label="Status">
          <select className="field" value={e.status} onChange={setEditStatus}>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="hold">On hold</option>
          </select>
        </Field>
        <Field label="Date completed">
          <input type="date" className="field" value={e.done} onChange={setE('done')} />
          {payLabel ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5, fontSize: 11.5, color: 'var(--muted)' }}>
              <span>{payLabel}</span>
              {/* Seeded by `paySeedFor` in actions.js, never inline: this call
                  site once forgot `payFee` and the dialog opened carrying the
                  previous one's charge. */}
              <button type="button" className="link" onClick={openPayForEdit}>change</button>
            </div>
          ) : null}
        </Field>
      </div>

      <Field label="Notes" hint="optional">
        <input className="field" value={e.notes} onChange={setE('notes')} />
      </Field>

      <div className="modal-actions ruled">
        <div className="spacer" />
        <button type="button" className="btn quiet" onClick={() => set((s) => ({ edit: s.editOrig }))}>Discard changes</button>
        <button type="button" className="btn primary" onClick={saveEdit}>Save</button>
      </div>
    </Modal>
  )
}
