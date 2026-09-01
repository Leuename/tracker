import { useActions } from '../actions.js'
import { CSYM } from '../data.js'
import { Modal } from '../ui.jsx'
import { curFmt } from '../logic.js'
import { IconTrash } from '../icons.jsx'

/**
 * Cancelling a wire and deleting one are different acts: the design keeps
 * cancelled transfers on the sheet precisely so the audit trail survives.
 * Deleting removes that record, so it asks first and says which it is.
 */
export default function DeleteTransfer() {
  const { state, cancelRemoveTransfer, confirmRemoveTransfer } = useActions()
  const w = state.transfers.find((x) => x.id === state.delTelId)
  if (!w) return null

  return (
    <Modal onClose={cancelRemoveTransfer} width={460} align="center">
      <h2>Delete this transfer?</h2>
      <div className="sub">{w.co} · {w.name} · {curFmt(w.cur, w.amount, CSYM)}</div>

      <p style={{ fontSize: 13, color: 'var(--ink-mid)', lineHeight: 1.55, margin: '14px 0 0' }}>
        {w.status === 'cancelled'
          ? 'This transfer is already cancelled, so it is on the sheet only as a record. Deleting it removes that record for good.'
          : 'This removes the wire from the sheet entirely. To stop it without losing the record, set its status to Cancelled instead.'}
      </p>

      <div className="modal-actions ruled">
        <div className="spacer" />
        <button type="button" className="btn" onClick={cancelRemoveTransfer}>Cancel</button>
        <button type="button" className="btn danger" onClick={confirmRemoveTransfer}>
          Delete transfer <IconTrash size={15} />
        </button>
      </div>
    </Modal>
  )
}
