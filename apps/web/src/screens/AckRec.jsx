import { useActions } from '../actions.js'
import { TAG } from '../data.js'
import { dstr, fmt } from '../logic.js'

const COLS = '60px 128px minmax(160px,1fr) 104px 116px 104px 112px 104px 92px'

const STATUSES = [
  { v: 'pending', label: 'Pending' },
  { v: 'released', label: 'Released' },
  { v: 'liquidated', label: 'Liquidated' },
  { v: 'hold', label: 'On hold' },
]

export default function AckRec() {
  const { state, setReceiptStatus, openLiquidate, openReceipt, openReceiptFile } = useActions()

  const open = state.receipts.filter((r) => r.status !== 'liquidated')
  const liquidated = state.receipts.filter((r) => r.status === 'liquidated')
  // Positive means cash came back; negative means the holder overspent.
  const netDiff = liquidated.reduce((a, r) => a + (r.amount - r.actual), 0)

  return (
    <div className="screen">
      <header className="topbar">
        <h1>Acknowledgement receipts</h1>
        <div className="sub">cash released, waiting to be liquidated</div>
        <div className="spacer" />
        <button type="button" className="btn primary" onClick={openReceipt}>
          + Add receipt
        </button>
      </header>

      <div className="strip">
        <span className="dim">Released, not yet liquidated</span>
        <span style={{ fontWeight: 700 }}>{fmt(open.reduce((a, r) => a + r.amount, 0))}</span>
        <span className="dim">·</span>
        <span className="dim">{open.length} receipts open</span>
        <span className="spacer" />
        <span className="dim">Difference on liquidated receipts</span>
        <span style={{ fontWeight: 700, color: netDiff >= 0 ? '#5C8F72' : 'var(--danger)' }}>
          {netDiff === 0 ? 'none' : fmt(Math.abs(netDiff)) + (netDiff > 0 ? ' returned' : ' overspent')}
        </span>
      </div>

      <div className="sheet" style={{ background: 'var(--surface)' }}>
        <div style={{ minWidth: 1160 }}>
          <div className="sheet-head plain" style={{ gridTemplateColumns: COLS, columnGap: 14 }}>
            <div>Company</div><div>Name</div><div>Description</div>
            <div className="right">Amount</div><div className="center">Status</div>
            <div>Liquidated</div><div className="right">Actual</div><div className="right">Difference</div><div />
          </div>

          {state.receipts.map((r) => {
            const diff = r.actual == null ? null : r.amount - r.actual
            const tag = TAG[r.status]
            return (
              <div key={r.id} className="sheet-row" style={{ gridTemplateColumns: COLS, columnGap: 14, padding: '13px 28px' }}>
                <div className="bold">{r.co}</div>
                <div>{r.name}</div>
                <div style={{ paddingRight: 14, color: 'var(--ink-mid)' }}>{r.desc}</div>
                <div className="right bold">{fmt(r.amount)}</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <select value={r.status} onChange={setReceiptStatus(r)} aria-label={'Status for ' + r.name}
                          style={{
                            width: 104, textAlign: 'center', textAlignLast: 'center',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                            padding: '5px 7px', fontSize: 11.5, fontWeight: 600,
                            background: tag.bg, color: tag.fg, outline: 'none', cursor: 'pointer',
                          }}>
                    {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
                  </select>
                </div>
                <div style={{ color: r.date ? 'var(--ink-mid)' : 'var(--faint)' }}>{r.date ? dstr(r.date) : '—'}</div>
                <div className="right" style={{ color: r.date ? 'var(--ink-mid)' : 'var(--faint)' }}>
                  {r.actual == null ? '—' : fmt(r.actual)}
                </div>
                <div className="right bold" style={{ color: diff == null ? 'var(--faint)' : (diff >= 0 ? '#5C8F72' : 'var(--danger)') }}>
                  {diff == null ? '—' : (diff === 0 ? 'exact' : fmt(Math.abs(diff)) + (diff > 0 ? ' back' : ' over'))}
                </div>
                <div className="right" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  {r.filePath ? (
                    <button type="button" className="link" onClick={openReceiptFile(r)}
                            title="Open the stored receipt">File</button>
                  ) : null}
                  {r.status !== 'liquidated' ? (
                    <button type="button" className="btn sm" onClick={openLiquidate(r)}>Liquidate</button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ flex: 'none', padding: '16px 28px', borderTop: '1px solid var(--border)', background: 'var(--sunken)', fontSize: 12.5, color: 'var(--muted)' }}>
        Setting a receipt to <strong style={{ color: 'var(--ink)' }}>Liquidated</strong> opens two required fields — date
        liquidated and actual amount. The difference is worked out for you.
      </div>
    </div>
  )
}
