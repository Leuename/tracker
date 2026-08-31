import { useActions } from '../actions.js'
import { amountOf, fmt } from '../logic.js'
import { Field, Modal } from '../ui.jsx'

export default function Liquidate() {
  const { state, set, saveLiq } = useActions()
  const close = () => set({ liqOpen: false })

  const rec = state.receipts.find((r) => r.id === state.liqId)
  const amt = amountOf(state.liqAmount)
  const diff = rec && amt ? rec.amount - amt : null

  return (
    <Modal onClose={close} width={440} align="center">
      <h2>Liquidate receipt</h2>
      <div className="hint" style={{ fontSize: 13 }}>
        {rec ? rec.co + ' · ' + rec.name + ' · released ' + fmt(rec.amount) : ''}
      </div>

      <div className="row-2">
        <Field label={<>Date liquidated <span className="required">required</span></>}>
          <input type="date" className="field" value={state.liqDate}
                 onChange={(e) => set({ liqDate: e.target.value })} />
        </Field>
        <Field label={<>Actual amount <span className="required">required</span></>}>
          <input className={'field num' + (state.liqErr ? ' invalid' : '')} placeholder="0.00"
                 value={state.liqAmount} onChange={(e) => set({ liqAmount: e.target.value, liqErr: false })} />
        </Field>
      </div>

      {/* Upload is a placeholder here — the prototype draws the drop zone but stores no file. */}
      <div className="dashed" style={{ padding: 14 }}>Drop the receipt photo or PDF here</div>

      <div style={{ background: 'var(--sunken)', borderRadius: 'var(--radius-md)', padding: 12, fontSize: 13, display: 'flex', alignItems: 'center' }}>
        <span className="dim">Difference</span>
        <span className="spacer" />
        <span style={{ fontWeight: 700, color: diff == null ? 'var(--muted)' : (diff >= 0 ? '#5C8F72' : 'var(--danger)') }}>
          {diff == null ? '—' : (diff === 0 ? 'exact' : fmt(Math.abs(diff)) + (diff > 0 ? ' to return' : ' overspent'))}
        </span>
      </div>

      <div className="modal-actions">
        <div className="spacer" />
        <button type="button" className="btn quiet" onClick={close}>Cancel</button>
        <button type="button" className="btn primary" onClick={saveLiq}>Save</button>
      </div>
    </Modal>
  )
}
