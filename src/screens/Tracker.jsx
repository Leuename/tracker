import { useActions } from '../actions.js'
import { TAG } from '../data.js'
import { dstr, eff, fmt, visibleRows } from '../logic.js'
import { Check, Tag } from '../ui.jsx'
import { IconFilter } from '../icons.jsx'

const COLS = '150px minmax(190px,1fr) 100px 92px 104px 108px 100px 104px'

export default function Tracker() {
  const { state, set, openAdd, openRow, openPay, toggleGroup, clearFilters } = useActions()

  const rows = visibleRows(state)
  const byCompany = state.groupBy === 'company'
  const keyOf = (t) => (byCompany ? t.co : t.cat)

  // Groups keep the order rows first appear in, so filtering never reshuffles them.
  const order = []
  rows.forEach((t) => { if (order.indexOf(keyOf(t)) < 0) order.push(keyOf(t)) })
  const allOpen = order.every((k) => !state.collapsed[k])

  const defaultStatuses = state.statuses.pending && state.statuses.overdue && !state.statuses.completed && !state.statuses.hold
  const filterCount =
    (state.coFilter !== 'All companies' ? 1 : 0) +
    (state.catFilter !== 'All categories' ? 1 : 0) +
    (defaultStatuses ? 0 : 1) +
    (state.search ? 1 : 0)

  const toggleAll = () => set(() => {
    if (!allOpen) return { collapsed: {} }
    const c = {}
    order.forEach((k) => { c[k] = true })
    return { collapsed: c }
  })

  const shown = 'Showing ' + rows.length + ' of ' + state.txns.length + ' transactions'

  return (
    <div className="screen">
      <header className="topbar">
        <h1>Tracker</h1>
        <div className="sub">{order.length} groups · {rows.length} rows</div>
        <div className="spacer" />
        <input className="field compact sunken" style={{ width: 200 }} placeholder="Search descriptions…"
               value={state.search} onChange={(e) => set({ search: e.target.value })} />
        <button type="button" className="btn" style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => set({ filtersOpen: true })}>
          <IconFilter size={15} /> Filters
          {filterCount ? <span className="count-badge">{filterCount}</span> : null}
        </button>
        <button type="button" className="btn primary" onClick={openAdd}>+ Add transaction</button>
      </header>

      <div className="sheet">
        <div style={{ minWidth: 1010 }}>
          <div className="sheet-head" style={{ gridTemplateColumns: COLS }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <Check small on={allOpen} onClick={toggleAll} label="Expand or collapse every group" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {byCompany ? 'Category' : 'Company'}
              </span>
            </div>
            <div>Description</div><div>Period</div><div>Due date</div>
            <div className="right">Amount</div><div className="center">Status</div>
            <div>Completed</div><div />
          </div>

          {order.map((name) => {
            const rs = rows.filter((t) => keyOf(t) === name)
            const open = !state.collapsed[name]
            return (
              <div key={name}>
                <button type="button" className="group-head" onClick={toggleGroup(name)} aria-expanded={open}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{open ? '▾' : '▸'}</span>
                  <span className="name">{name}</span>
                  <span className="meta">{rs.length} rows{open ? '' : ', hidden'}</span>
                  <span className="spacer" />
                  <span className="sum">{fmt(rs.reduce((a, t) => a + t.amount, 0))}</span>
                </button>

                {open ? rs.map((t) => {
                  const e = eff(t)
                  const overdue = e === 'overdue' && state.settings.trkOverdueRed
                  const payLabel = t.done && t.payType ? (t.payType === 'Check' ? 'Check #' + t.checkNo : t.payType) : ''
                  return (
                    <div key={t.id} className="sheet-row clickable" role="button" tabIndex={0}
                         style={{ gridTemplateColumns: COLS }}
                         onClick={openRow(t)}
                         onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openRow(t)() } }}>
                      <div className="bold">{byCompany ? t.cat : t.co}</div>
                      <div style={{ paddingRight: 14 }}>{t.desc}</div>
                      <div className="dim">{t.period}</div>
                      <div className={overdue ? 'over' : ''} style={overdue ? undefined : { color: 'var(--ink-mid)' }}>{dstr(t.due)}</div>
                      <div className="right bold">{fmt(t.amount)}</div>
                      <div className="center"><Tag status={e} tags={TAG} /></div>
                      <div style={{ minWidth: 0, color: t.done ? 'var(--ink-mid)' : 'var(--faint)' }}>
                        {t.done ? dstr(t.done) : '—'}
                        {payLabel ? (
                          <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {payLabel}
                          </div>
                        ) : null}
                      </div>
                      <div className="right">
                        {e !== 'completed' ? (
                          <button type="button" className="btn sm" onClick={openPay(t)}>Mark as paid</button>
                        ) : null}
                      </div>
                    </div>
                  )
                }) : null}
              </div>
            )
          })}

          {rows.length === 0 ? (
            <div className="empty">
              Nothing matches these filters.{' '}
              <button type="button" className="link" onClick={clearFilters}>Clear them</button>
            </div>
          ) : null}
        </div>
      </div>

      {state.settings.trkShowGrandTotal ? (
        <div className="sheet-foot">
          <span className="dim">{shown}</span>
          <span className="spacer" />
          <span className="dim">Grand total</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{fmt(rows.reduce((a, t) => a + t.amount, 0))}</span>
        </div>
      ) : (
        <div className="sheet-foot"><span className="dim">{shown}</span></div>
      )}
    </div>
  )
}
