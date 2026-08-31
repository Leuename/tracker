import { useEffect } from 'react'
import { periodLabel } from './logic.js'
import { useActions } from './actions.js'

/** Modal shell: click-outside and Escape both close. */
export function Modal({ onClose, width, align = 'top', children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={'scrim' + (align === 'center' ? ' centered' : '')} onMouseDown={onClose}>
      <div className="modal" style={{ width }} role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export function Check({ on, onClick, small, label }) {
  return (
    <button type="button" aria-pressed={on} aria-label={label}
            className={'check' + (on ? ' on' : '') + (small ? ' sm' : '')} onClick={onClick}>
      {on ? '✓' : ''}
    </button>
  )
}

export function Switch({ on, onClick, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label}
            className={'switch' + (on ? ' on' : '')} onClick={onClick}><i /></button>
  )
}

export function Field({ label, hint, children }) {
  return (
    <div>
      <div className="label">{label}{hint ? <span className="optional"> {hint}</span> : null}</div>
      {children}
    </div>
  )
}

export function Select({ value, onChange, options, placeholder, invalid, className = 'field' }) {
  return (
    <select className={className + (invalid ? ' invalid' : '')} value={value} onChange={onChange}>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

export function Tag({ status, tags }) {
  const t = tags[status]
  return <span className="tag" style={{ background: t.bg, color: t.fg }}>{t.label}</span>
}

/**
 * Month / month-range picker behind the "Period covered" field.
 * `which` is 'add' or 'edit' — the two forms share one picker state, exactly as
 * the prototype did, so only one can be open at a time.
 */
export function PeriodPicker({ which, value }) {
  const { state, set, openPeriod, applyPeriod } = useActions()
  const open = state.periodOpen === which

  return (
    <div className="period-anchor">
      <div className="label">Period covered</div>
      <button type="button" className="period-trigger" onClick={openPeriod(which, value)}>
        <span className="value">{value}</span>
        <span className="caret">▾</span>
      </button>

      {open ? (
        <div className="period-pop">
          <button type="button" className="range-toggle" onClick={() => set((s) => ({ periodRange: !s.periodRange }))}>
            <span className={'check sm' + (state.periodRange ? ' on' : '')}>{state.periodRange ? '✓' : ''}</span>
            Date range
          </button>

          <div>
            <div className="eyebrow" style={{ marginBottom: 5 }}>
              {state.periodRange ? 'From' : 'Month & year'}{' '}
              <span style={{ fontWeight: 600, letterSpacing: 0, textTransform: 'none', color: 'var(--faint)' }}>day optional</span>
            </div>
            <div className="split">
              <input type="month" className="field compact sunken" value={state.periodFrom}
                     onChange={(e) => set({ periodFrom: e.target.value || state.periodFrom })} />
              <input className="field compact sunken day" placeholder="Day" value={state.periodFromDay}
                     onChange={(e) => set({ periodFromDay: e.target.value.replace(/[^0-9]/g, '').slice(0, 2) })} />
            </div>
          </div>

          {state.periodRange ? (
            <div>
              <div className="eyebrow" style={{ marginBottom: 5 }}>To</div>
              <div className="split">
                <input type="month" className="field compact sunken" value={state.periodTo}
                       onChange={(e) => set({ periodTo: e.target.value || state.periodTo })} />
                <input className="field compact sunken day" placeholder="Day" value={state.periodToDay}
                       onChange={(e) => set({ periodToDay: e.target.value.replace(/[^0-9]/g, '').slice(0, 2) })} />
              </div>
            </div>
          ) : null}

          <div className="hint">Will read {periodLabel(state)}</div>
          <div className="foot">
            <button type="button" className="btn quiet" onClick={() => set({ periodOpen: null })}>Cancel</button>
            <button type="button" className="btn primary" onClick={applyPeriod}>Apply</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
