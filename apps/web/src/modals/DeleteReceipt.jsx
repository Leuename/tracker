import { useActions } from '../actions.js'
import { Modal } from '../ui.jsx'
import { fmt } from '../logic.js'
import { IconTrash } from '../icons.jsx'

/**
 * A receipt is the only row that can take a stored document with it, and a
 * liquidated one is a record of cash already accounted for. Both are gone for
 * good, so the amount and the file are spelled out before the button is armed.
 */
export default function DeleteReceipt() {
  const { state, cancelRemoveReceipt, confirmRemoveReceipt } = useActions()
  const r = state.receipts.find((x) => x.id === state.delRcpId)
  if (!r) return null

  return (
    <Modal onClose={cancelRemoveReceipt} width={460} align="center">
      <h2>Delete this receipt?</h2>
      <div className="sub">{r.co} · {r.name} · {fmt(r.amount)}</div>

      <p style={{ fontSize: 13, color: 'var(--ink-mid)', lineHeight: 1.55, margin: '14px 0 0' }}>
        {r.status === 'liquidated'
          ? 'This receipt is liquidated, so deleting it removes a settled record of ' + fmt(r.actual) + '.'
          : 'This receipt is still open, so the cash it records will no longer be tracked.'}
        {r.filePath ? ' Its stored document is deleted too, and cannot be recovered.' : ''}
      </p>

      <div className="modal-actions ruled">
        <div className="spacer" />
        <button type="button" className="btn" onClick={cancelRemoveReceipt}>Cancel</button>
        <button type="button" className="btn danger" onClick={confirmRemoveReceipt}>
          Delete receipt <IconTrash size={15} />
        </button>
      </div>
    </Modal>
  )
}
