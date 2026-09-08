import { cloneElement, isValidElement, useEffect, useId, useRef } from 'react'
import { optionsWith, periodLabel, tagOf } from './logic.js'
import { useActions } from './actions.js'

/**
 * Which dialogs are open, innermost last.
 *
 * Dialogs stack: the edit form opens the payment dialog on top of itself. Both
 * used to listen for Escape on `window`, and the outer one won because it
 * registered first — so Escape closed the form and left the payment dialog
 * sitting over nothing. Confirming from that orphan wrote **nothing at all**,
 * because `confirmPay`'s edit path only stages into the form and the form is
 * what saves. The dialog closed, no toast, no error, and a payment the user had
 * just confirmed did not exist.
 *
 * A module-level stack rather than context: this is one rule about the whole
 * window, and every Modal has to agree on it whether or not it shares a parent.
 */
const openModals = []

/**
 * Modal shell. Escape closes the innermost dialog; clicking the backdrop does
 * not close anything.
 *
 * Every dialog here is a form over a live money ledger, and a mis-aimed click
 * beside one used to discard whatever had been typed into it with no warning
 * and no undo. Escape stays, because a keyboard user needs a way out that does
 * not depend on finding the Cancel button — it is deliberate and reachable in a
 * way a stray click is not.
 */
/**
 * Escape closes this dialog, but only while it is the innermost one open.
 *
 * Exported because `Modal` is not the only dialog: the Filters drawer has its
 * own shell and had its own bare `window` listener, which put it outside the
 * stack and reintroduced exactly the bug the stack exists to prevent — a
 * keyboard user can reach a row behind the drawer's scrim, open the edit form
 * on top, and the drawer's listener then swallowed the form's Escape. Any
 * dialog anywhere uses this; nothing binds Escape on `window` by hand.
 */
export function useEscapeToClose(onClose) {
  const self = useRef({})

  // Registration is its own effect so it does not re-run when `onClose`
  // changes identity, which it does on every render — re-pushing on each
  // render would corrupt the order this depends on.
  useEffect(() => {
    const me = self.current
    openModals.push(me)
    return () => {
      const i = openModals.indexOf(me)
      if (i >= 0) openModals.splice(i, 1)
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      // Only the innermost dialog answers. Without this the outer one closes
      // and orphans the inner one over an empty screen.
      if (openModals[openModals.length - 1] !== self.current) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}

export function Modal({ onClose, width, align = 'top', children }) {
  useEscapeToClose(onClose)

  return (
    <div className={'scrim' + (align === 'center' ? ' centered' : '')}>
      <div className="modal" style={{ width }} role="dialog" aria-modal="true">
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

/**
 * A labelled form control.
 *
 * The caption is a real <label> tied to the control by id, not a styled div.
 * Without that the inputs in every dialog have no accessible name: a screen
 * reader announces "edit text, blank" for the amount on a payment form, and
 * clicking the caption does not focus the field.
 *
 * The id is generated here and handed to the child, so no caller has to invent
 * one. A child that already carries an id keeps it.
 */
export function Field({ label, hint, children }) {
  const id = useId()
  const control = isValidElement(children) && !children.props.id
    ? cloneElement(children, { id })
    : children

  return (
    <div>
      <label className="label" htmlFor={id}>{label}{hint ? <span className="optional"> {hint}</span> : null}</label>
      {control}
    </div>
  )
}

export function Select({ id, label, value, onChange, options, placeholder, invalid, className = 'field' }) {
  // `optionsWith` rather than `options`, so this control can always display the
  // value it is given. A `<select>` whose value matches no option silently shows
  // index 0 instead — the wrong company, category or currency, on a screen that
  // edits money. Guarded here, once, because the same defect has now been found
  // three rounds running in whichever call sites the previous round happened to
  // look at.
  return (
    <select id={id} aria-label={label} className={className + (invalid ? ' invalid' : '')}
            value={value ?? ''} onChange={onChange}>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {optionsWith(value, options).map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

/**
 * Swallow a click inside a sheet row, so the control acts and the row does not.
 */
export const stopRowClick = (ev) => ev.stopPropagation()

/**
 * Swallow only the keys the row itself acts on.
 *
 * A row opens on Enter or Space, so a control inside it must keep those two
 * from reaching the row — and nothing else. Stopping every key also stopped
 * Escape: React listens at the root container, so `stopPropagation` there beats
 * the `window` listener in `useEscapeToClose`, and focus stays on the control
 * after it opens a dialog. Escape was dead for that dialog's whole lifetime.
 *
 * It lives here, once, because round 31 fixed this in `AckRec.jsx` and
 * `Telegraphic.jsx` by defining the helper twice, locally — and round 32 then
 * found the tenth site, an inline anonymous `stopPropagation` in `Tracker.jsx`
 * on the button that opens the **payment** dialog. The worst of the eleven, on
 * a control an operator uses dozens of times a day. A helper copied into the
 * files that were known about is how the one that was not gets missed.
 */
export const stopRowKeys = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') ev.stopPropagation() }

export function Tag({ status, tags }) {
  // `tags[status]` raw would throw out of render on an unrecognised status and
  // take the whole tree down with it. Its one caller does not crash today only
  // because `visibleRows` drops such a row before it gets here — which is its
  // own problem, but it means this is one new caller away from a blank page.
  const t = tagOf(status, tags)
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
      <div className="label" id={'period-' + which}>Period covered</div>
      <button type="button" className="period-trigger" aria-labelledby={'period-' + which}
              onClick={openPeriod(which, value)}>
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
