import { useActions } from '../actions.js'
import { dstr, fmt } from '../logic.js'
import { Field, Modal } from '../ui.jsx'

const TYPES = ['Cash', 'Check', 'E-cash']

export default function PayMethod() {
  const { state, set, confirmPay, cancelPay } = useActions()

  const row = state.txns.find((t) => t.id === state.payId)
  const e = state.edit || {}
  const subtitle = state.payFor === 'edit'
    ? [e.co || '', e.cat || '', e.desc || ''].join(' · ')
    : (row ? row.co + ' · ' + row.cat + ' · ' + fmt(row.amount) + ' due ' + dstr(row.due) : '')

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
          <Field label={<>Check number <span className="required">required</span></>}>
            <input className={'field sunken' + (state.payErr ? ' invalid' : '')} placeholder="e.g. 004821"
                   value={state.payCheck} onChange={(ev) => set({ payCheck: ev.target.value, payErr: false })} />
          </Field>
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
