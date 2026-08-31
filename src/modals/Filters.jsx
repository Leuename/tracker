import { useActions } from '../actions.js'
import { eff, visibleRows } from '../logic.js'
import { Check, Select } from '../ui.jsx'

const STATUSES = [
  { k: 'pending', label: 'Pending' },
  { k: 'overdue', label: 'Overdue' },
  { k: 'completed', label: 'Completed' },
  { k: 'hold', label: 'On hold' },
]

export default function Filters() {
  const { state, set, field, toggleStatus, clearFilters } = useActions()
  const close = () => set({ filtersOpen: false })
  const shown = visibleRows(state).length

  return (
    <div className="scrim anchor-right" onMouseDown={close}>
      <aside className="drawer" onMouseDown={(e) => e.stopPropagation()} aria-label="Filters">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Show me</div>
          <div className="spacer" />
          <button type="button" className="icon-btn" aria-label="Close filters" onClick={close}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 9 }}>
          <button type="button" className="dashed" style={{ flex: 1, cursor: 'pointer' }} onClick={clearFilters}>Clear all</button>
          <button type="button" className="btn primary" style={{ flex: 1 }} onClick={close}>Show results</button>
        </div>

        <div className="hint" style={{ marginTop: -8 }}>Showing {shown} of {state.txns.length} transactions</div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 7 }}>Company</div>
          <Select className="field compact" value={state.coFilter} onChange={field('coFilter')}
                  options={['All companies', ...state.companies]} />
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 7 }}>Expense category</div>
          <Select className="field compact" value={state.catFilter} onChange={field('catFilter')}
                  options={['All categories', ...state.categories]} />
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 7 }}>Status</div>
          {STATUSES.map((s) => (
            <div key={s.k} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
              <Check on={state.statuses[s.k]} onClick={toggleStatus(s.k)} label={s.label} />
              <span style={{ fontSize: 13.5 }}>{s.label}</span>
              <span className="spacer" />
              <span className="hint">{state.txns.filter((t) => eff(t) === s.k).length}</span>
            </div>
          ))}
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 7 }}>Group rows by</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className={'pill' + (state.groupBy === 'company' ? ' on' : '')}
                    style={{ flex: 1 }} onClick={() => set({ groupBy: 'company', collapsed: {} })}>Company</button>
            <button type="button" className={'pill' + (state.groupBy === 'category' ? ' on' : '')}
                    style={{ flex: 1 }} onClick={() => set({ groupBy: 'category', collapsed: {} })}>Category</button>
          </div>
        </div>

        <div className="spacer" />
      </aside>
    </div>
  )
}
