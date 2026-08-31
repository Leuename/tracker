import { useActions } from '../actions.js'
import { amountOf, fmt } from '../logic.js'
import { Field, Modal } from '../ui.jsx'

export default function Liquidate() {
  const { state, set, saveLiq, pickLiqFile } = useActions()
  const close = () => set({ liqOpen: false, liqFile: null, liqErr: false })
  const required = state.settings.ackRequirePhoto

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

      {/* A real upload: the file goes to a private bucket and the row records
          its key. The prototype drew this zone but stored nothing. */}
      <div>
        <label className="label" htmlFor="liq-file">
          Receipt file {required ? <span className="required">required</span> : <span className="optional">optional</span>}
        </label>
        <input id="liq-file" type="file" className="field" onChange={pickLiqFile}
               accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" />
        <div className="hint" style={{ marginTop: 5 }}>
          {state.liqFile
            ? state.liqFile.name + ' · ' + Math.ceil(state.liqFile.size / 1024) + ' KB'
            : 'JPEG, PNG, WebP, HEIC or PDF, up to 10 MB.'}
        </div>
      </div>

      <div style={{ background: 'var(--sunken)', borderRadius: 'var(--radius-md)', padding: 12, fontSize: 13, display: 'flex', alignItems: 'center' }}>
        <span className="dim">Difference</span>
        <span className="spacer" />
        <span style={{ fontWeight: 700, color: diff == null ? 'var(--muted)' : (diff >= 0 ? '#5C8F72' : 'var(--danger)') }}>
          {diff == null ? '—' : (diff === 0 ? 'exact' : fmt(Math.abs(diff)) + (diff > 0 ? ' to return' : ' overspent'))}
        </span>
      </div>

      <div className="modal-actions">
        {typeof state.liqErr === 'string' && state.liqErr ? (
          <span role="alert" style={{ fontSize: 12.5, color: 'var(--danger)', fontWeight: 600 }}>{state.liqErr}</span>
        ) : null}
        <div className="spacer" />
        <button type="button" className="btn quiet" onClick={close} disabled={state.liqBusy}>Cancel</button>
        <button type="button" className="btn primary" onClick={saveLiq} disabled={state.liqBusy}>
          {state.liqBusy ? 'Uploading…' : 'Save'}
        </button>
      </div>
    </Modal>
  )
}
