import { useActions } from '../actions.js'
import { TAG } from '../data.js'
import { SORTS, dstr, eff, fmt, forecast, groupKey, monthKeys, monthLabel, sortRows, unresolvedFor, unpricedFor, visibleRows, own } from '../logic.js'
import { Check, Tag, stopRowKeys } from '../ui.jsx'
import { IconExport, IconFilter, IconSort } from '../icons.jsx'

// Wider on the two columns that carry words and narrower on the six that carry
// dates and figures, so a long description stops being the first thing to
// truncate. Total is 1080, which is what `min-width` below has to clear.
const COLS = '228px minmax(300px,1fr) 88px 84px 96px 96px 92px 96px'

export default function Tracker() {
  const {
    state, set, go, openAdd, openRow, openPay, toggleGroup, clearFilters,
    toggleSort, flipSort, pickSort, toggleExport, exportPng, exportPdf, generate,
  } = useActions()

  const rows = sortRows(visibleRows(state), state.sortKey, state.sortDir)
  const byCompany = state.groupBy === 'company'
  const keyOf = groupKey(state.groupBy)

  // Groups keep the order rows first appear in, so filtering never reshuffles them.
  const order = []
  rows.forEach((t) => { if (order.indexOf(keyOf(t)) < 0) order.push(keyOf(t)) })
  // Group names are company or category values — free text. See `own`.
  const allOpen = order.every((k) => !own(state.collapsed, k))

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

  // What Generate would write today. The sheet says so rather than leaving the
  // reader to notice that a payable they expected is simply not here.
  const due = forecast(state)
  const unresolved = unresolvedFor(state)
  // `forecast` deliberately excludes a payable with no amount — it could not be
  // generated. Counting them separately is what stops the bar announcing "in
  // sync" while a payable sits due and unwritable, which is what the previous
  // fix left it saying.
  const needAmount = monthKeys().slice(0, 2).flatMap((m) => unpricedFor(state.recurring, m))
    .filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i)
  const sortLabel = (SORTS.find((o) => o.k === state.sortKey) || SORTS[0]).label

  return (
    <div className="screen">
      <header className="topbar">
        <h1>Tracker</h1>
        <div className="sub ellipsis">{order.length} groups · {rows.length} rows</div>
        <div className="spacer" style={{ minWidth: 8 }} />
        <input className="field compact sunken" style={{ width: 180, flex: 'none' }} placeholder="Search descriptions…"
               value={state.search} onChange={(e) => set({ search: e.target.value })} />

        <div className="menu-anchor">
          <button type="button" className={'btn row-btn' + (state.sortOpen ? ' on' : '')}
                  aria-expanded={state.sortOpen} onClick={toggleSort}>
            <IconSort size={15} /> Sort <span className="dim" style={{ fontWeight: 500 }}>{sortLabel}</span>
          </button>
          {state.sortOpen ? (
            <div className="menu drop" style={{ width: 232 }}>
              {SORTS.map((o) => {
                const on = state.sortKey === o.k
                return (
                  <button key={o.k} type="button" className={on ? 'on' : ''} onClick={pickSort(o.k)}>
                    <span className="label">{o.label}</span>
                    <span className="note">{on && o.k !== 'none' ? (state.sortDir === 'desc' ? '↓' : '↑') : ''}</span>
                  </button>
                )
              })}
              {state.sortKey !== 'none' ? (
                <>
                  <div className="menu-rule" />
                  <button type="button" className="accent" onClick={flipSort}>
                    <span className="label">{state.sortDir === 'desc' ? 'Ascending' : 'Descending'} order</span>
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <button type="button" className="btn row-btn" style={{ flex: 'none' }}
                onClick={() => set({ filtersOpen: true })}>
          <IconFilter size={15} /> Filters
          {filterCount ? <span className="count-badge">{filterCount}</span> : null}
        </button>

        <div className="menu-anchor">
          <button type="button" className={'btn row-btn' + (state.exportOpen ? ' on' : '')}
                  aria-expanded={state.exportOpen} onClick={toggleExport}>
            <IconExport size={15} /> Export
          </button>
          {state.exportOpen ? (
            <div className="menu drop" style={{ width: 250 }}>
              <div className="eyebrow" style={{ padding: '8px 10px 6px' }}>Summary of the filtered rows</div>
              <button type="button" onClick={exportPng}><span className="label">Download PNG</span></button>
              <button type="button" onClick={exportPdf}><span className="label">Save as PDF</span></button>
            </div>
          ) : null}
        </div>

        <button type="button" className="btn primary" style={{ flex: 'none' }} onClick={openAdd}>+ Add transaction</button>
      </header>

      <div className={'sync-bar' + (due.length || needAmount.length || unresolved.length ? ' pending' : '')}>
        <span className="dot" />
        <span>
          {unresolved.length
            ? unresolved.length + ' linked Tracker ' + (unresolved.length === 1 ? 'row has' : 'rows have') + ' no occurrence identity; generation is paused for those payables'
            : due.length
            ? due.length + ' masterlist ' + (due.length === 1 ? 'payable is' : 'payables are')
              + ' due in the next 30 days and not in the Tracker yet'
              + (needAmount.length ? ', and ' + needAmount.length + ' more still needs an amount' : '')
            : needAmount.length
              ? needAmount.length + ' masterlist ' + (needAmount.length === 1 ? 'payable has' : 'payables have')
                + ' no amount yet, so ' + (needAmount.length === 1 ? 'it cannot' : 'they cannot') + ' be generated'
              : 'In sync with the Masterlist — every recurring payable due in the next 30 days is on the sheet'}
        </span>
        {due.length ? (
          <button type="button" className="sync-action" disabled={state.generating}
                  onClick={generate(due[0].month)}>
            {state.generating ? "Generating…" : "Generate " + monthLabel(due[0].month)}
          </button>
        ) : null}
        <span className="spacer" />
        <button type="button" className="link" onClick={go('masterlist')}>Open Masterlist</button>
      </div>

      <div className="sheet tight">
        <div style={{ minWidth: 1080 }}>
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
            const open = !own(state.collapsed, name)
            return (
              <div key={name}>
                <button type="button" className="group-head" onClick={toggleGroup(name)} aria-expanded={open}>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>{open ? '▾' : '▸'}</span>
                  <span className="name">{name}</span>
                  <span className="meta">{rs.length} rows{open ? '' : ', hidden'}</span>
                  <span className="spacer" />
                  <span className="sum">{fmt(rs.reduce((a, t) => a + t.amount, 0))}</span>
                </button>

                {open ? rs.map((t) => {
                  const e = eff(t)
                  const overdue = e === 'overdue' && state.settings.trkOverdueRed
                  const payLabel = t.done && t.payType
                    ? (t.payType === 'Check' ? (t.checkNo ? 'Check #' + t.checkNo : 'Check') : t.payType)
                      + (t.fee ? ' · incl. ' + fmt(t.fee) + ' charge' : '')
                    : ''
                  return (
                    <div key={t.id} className="sheet-row clickable" role="button" tabIndex={0}
                         style={{ gridTemplateColumns: COLS }}
                         onClick={openRow(t)}
                         onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openRow(t)() } }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        {t.src ? <span className="from-master" title="Comes from the Masterlist" /> : null}
                        <span className="bold ellipsis">{byCompany ? t.cat : t.co}</span>
                      </div>
                      <div style={{ paddingRight: 14 }}>{t.desc}</div>
                      <div className="dim">{t.period}</div>
                      <div className={overdue ? 'over' : ''} style={overdue ? undefined : { color: 'var(--ink-mid)' }}>{dstr(t.due)}</div>
                      <div className="right bold">{fmt(t.amount)}</div>
                      <div className="center"><Tag status={e} tags={TAG} /></div>
                      <div style={{ minWidth: 0, color: t.done ? 'var(--ink-mid)' : 'var(--faint)' }}>
                        {t.done ? dstr(t.done) : '—'}
                        {payLabel ? (
                          <div style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {payLabel}
                          </div>
                        ) : null}
                      </div>
                      <div className="right">
                        {e !== 'completed' ? (
                          <button type="button" className="btn sm" onClick={openPay(t)}
                                  onKeyDown={stopRowKeys}>Mark as paid</button>
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
