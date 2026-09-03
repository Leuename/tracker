import { useActions } from '../actions.js'
import { CSYM, CUR, TAG } from '../data.js'
import { curFmt, dstr, fmt, transferTotals } from '../logic.js'

const COLS = '84px 172px 92px 132px 124px minmax(200px,1fr) 92px'

const STATUSES = [
  { v: 'pending', label: 'Pending' },
  { v: 'released', label: 'Released' },
  { v: 'onhold', label: 'Onhold' },
  { v: 'cancelled', label: 'Cancelled' },
]

export default function Telegraphic() {
  const { state, openTransfer, updTel, openTransferRow, askRemoveTransfer } = useActions()
  const totals = transferTotals(state.transfers, state.fxRates)

  // A number whose provenance is invisible is how this started: five constants
  // with no date, running 7% to 15% low. `asOf` is null when even one counted
  // wire fell through to those constants, and the strip then says so instead of
  // claiming a date the figure has not earned.
  const priced = totals.asOf
    ? 'at ECB rates of ' + dstr(totals.asOf) + ' ' + totals.asOf.slice(0, 4)
    : 'indicative — not all wires are priced'

  return (
    <div className="screen">
      <header className="topbar">
        <h1>Telegraphic transfers</h1>
        <div className="sub">outbound wires, by company and beneficiary</div>
        <div className="spacer" />
        <button type="button" className="btn primary" onClick={openTransfer}>
          + Add transfer
        </button>
      </header>

      <div className="strip">
        <span className="dim">Pending release</span>
        <span style={{ fontWeight: 700 }}>{fmt(totals.pending)}</span>
        <span className="dim">·</span>
        <span className="dim">{totals.pendingCount} transfers waiting</span>
        <span className="spacer" />
        <span className="dim">Released</span>
        <span style={{ fontWeight: 700, color: '#5C8F72' }}>{fmt(totals.released)}</span>
        <span className="dim">·</span>
        <span className="dim">{priced}</span>
      </div>

      <div className="sheet" style={{ background: 'var(--surface)' }}>
        <div style={{ minWidth: 1152 }}>
          <div className="sheet-head plain" style={{ gridTemplateColumns: COLS, columnGap: 14 }}>
            <div>Company</div><div>Name</div><div>Currency</div>
            <div className="right">Amount</div><div className="center">Status</div>
            <div>Note</div><div />
          </div>

          {state.transfers.map((w) => {
            const tag = TAG[w.status] || TAG.pending
            return (
              <div key={w.id} className="sheet-row clickable" role="button" tabIndex={0}
                   aria-label={'Open the transfer to ' + w.name}
                   style={{ gridTemplateColumns: COLS, columnGap: 14, padding: '11px 28px' }}
                   onClick={openTransferRow(w)}
                   onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openTransferRow(w)() } }}>
                <div className="bold">{w.co}</div>
                <div>{w.name}</div>
                <div>
                  <select value={w.cur} aria-label={'Currency for ' + w.name}
                          onClick={(ev) => ev.stopPropagation()}
                          onChange={(ev) => updTel(w.id, 'cur', ev.target.value)}
                          style={{
                            width: '100%', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                            padding: '6px 5px', fontSize: 12.5, fontWeight: 600, outline: 'none',
                            background: 'var(--sunken)', color: 'var(--ink)', cursor: 'pointer',
                          }}>
                    {CUR.map((c) => <option key={c} value={c}>{CSYM[c] + '  ' + c}</option>)}
                  </select>
                </div>
                {/* The row's own figure is exact: it prints in the currency the
                    wire is actually sent in, never converted. */}
                <div className="right bold">{curFmt(w.cur, w.amount, CSYM)}</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <select value={w.status} aria-label={'Status for ' + w.name}
                          onClick={(ev) => ev.stopPropagation()}
                          onChange={(ev) => updTel(w.id, 'status', ev.target.value)}
                          style={{
                            width: 112, textAlign: 'center', textAlignLast: 'center',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                            padding: '5px 7px', fontSize: 11.5, fontWeight: 600,
                            background: tag.bg, color: tag.fg, outline: 'none', cursor: 'pointer',
                          }}>
                    {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <input className="inline-field" value={w.note} placeholder="Add a note…"
                         aria-label={'Note for ' + w.name}
                         onClick={(ev) => ev.stopPropagation()}
                         onChange={(ev) => updTel(w.id, 'note', ev.target.value)} />
                </div>
                <div className="right">
                  <button type="button" className="remove"
                          onClick={(ev) => { ev.stopPropagation(); askRemoveTransfer(w)() }}
                          aria-label={'Delete the transfer to ' + w.name}>Remove</button>
                </div>
              </div>
            )
          })}

          {state.transfers.length === 0 ? (
            <div className="hint" style={{ padding: '28px' }}>
              No transfers yet. <strong>+ Add transfer</strong> records the first one.
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ flex: 'none', padding: '16px 28px', borderTop: '1px solid var(--border)', background: 'var(--sunken)', fontSize: 12.5, color: 'var(--muted)' }}>
        Currency, status and note are editable in place; click a row for the rest.{' '}
        <strong style={{ color: 'var(--ink)' }}>Cancelled</strong> and{' '}
        <strong style={{ color: 'var(--ink)' }}>Onhold</strong> transfers stay on the sheet for the audit
        trail and drop out of the totals above. Those two totals convert to pesos at fixed rates, so treat
        them as a sense of scale rather than an accounting figure — each row's own amount is exact.
      </div>
    </div>
  )
}
