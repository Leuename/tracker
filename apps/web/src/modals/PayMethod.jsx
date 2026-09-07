import { useActions } from '../actions.js'
import { amountOf, dstr, fmt } from '../logic.js'
import { Field, Modal } from '../ui.jsx'

const TYPES = ['Cash', 'Check', 'E-cash']

export default function PayMethod() {
  const { state, set, confirmPay, cancelPay } = useActions()

  const row = state.txns.find((t) => t.id === state.payId)
  const e = state.edit || {}
  const subtitle = state.payFor === 'edit'
    ? [e.co || '', e.cat || '', e.desc || ''].join(' · ')
    : (row ? row.co + ' · ' + row.cat + ' · ' + fmt(row.amount) + ' due ' + dstr(row.due) : '')

  // What the row is worth before any charge. Re-opening a paid e-cash row has
  // to show the new total replacing the old charge, not stacked on top of it.
  const base = state.payFor === 'edit'
    ? (amountOf(e.amount) || 0) - (e.fee || 0)
    : (row ? row.amount - (row.fee || 0) : 0)

  return (
    <Modal onClose={cancelPay} width={420} align="center">
      <div>
        <h2>How was it paid?</h2>
        <div className="sub" style={{ marginTop: 3 }}>{subtitle}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TYPES.map((p) => {
          const on = state.payType === p
          return (
            <button key={p} type="button" className={'choice' + (on ? ' on' : '')}
                    aria-pressed={on} onClick={() => set({ payType: p, payErr: false })}>
              <span className={'check' + (on ? ' on' : '')} style={{ width: 17, height: 17, borderRadius: 9 }}>
                {on ? '✓' : ''}
              </span>
              {p}
            </button>
          )
        })}
      </div>

      {state.payType === 'Check' ? (
        <div style={{ animation: 'pop 140ms ease-out' }}>
          {/* A check written today often has no number to hand yet, and refusing
              the payment over it left the row reading pending when the money had
              already gone out. The number can be filled in later from the row. */}
          <Field label={<>Check number <span className="optional">optional</span></>}>
            <input className="field sunken" placeholder="e.g. 004821"
                   value={state.payCheck} onChange={(ev) => set({ payCheck: ev.target.value })} />
          </Field>
        </div>
      ) : null}

      {state.payType === 'E-cash' ? (
        <div style={{ animation: 'pop 140ms ease-out' }}>
          {/* Folded into the amount, so the row totals what actually left the
              account, and kept separately so the sheet can still name it. */}
          <Field label={<>Additional charge <span className="optional">optional</span></>}>
            {/* `payErr` had no reader at all between the check number becoming
                optional and round 27: the state was still set on a negative
                charge, and the field it described was no longer on screen. The
                flash still fired, so the user was told — but nothing pointed at
                the input that was wrong. */}
            <input className={'field sunken num' + (state.payErr ? ' invalid' : '')}
                   type="number" min="0" step="0.01" placeholder="0.00"
                   aria-invalid={state.payErr || undefined}
                   value={state.payFee} onChange={(ev) => set({ payFee: ev.target.value, payErr: false })} />
          </Field>
          <div style={{ display: 'flex', gap: 6, fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>
            <span>Recorded amount</span>
            <span className="spacer" />
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{fmt(base + (amountOf(state.payFee) || 0))}</span>
          </div>
        </div>
      ) : null}

      <div className="modal-actions">
        <div className="spacer" />
        <button type="button" className="btn quiet" onClick={cancelPay}>Cancel</button>
        <button type="button" className="btn primary" onClick={confirmPay}>Mark as paid</button>
      </div>
    </Modal>
  )
}
