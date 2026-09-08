import { useActions } from '../actions.js'
import { MON, TODAY } from '../data.js'
import { addDays, eff, fmt, forecast, longDate, unaccountedRows, unresolvedFor, windowDays } from '../logic.js'
import { Check, Select } from '../ui.jsx'
import { IconChevronRight, IconPencil, IconTrash } from '../icons.jsx'

/** Payables is the total; the four beside it partition it by effective status. */
const TILES = [
  { key: 'all', label: 'Payables', color: 'var(--ink)' },
  { key: 'completed', label: 'Completed', color: '#5C8F72' },
  { key: 'pending', label: 'Pending', color: '#BE8A38' },
  { key: 'overdue', label: 'Overdue', color: '#C4566E' },
  { key: 'hold', label: 'On hold', color: '#8B7079' },
]

export default function Dashboard() {
  const {
    state, set, tileFilter, go, addNote, toggleNote,
    hoverNote, unhoverNote, editNote, saveNote, cancelNote, removeNote,
  } = useActions()

  const scope = typeof state.scope === 'string' ? state.scope : 'All companies'
  const scoped = scope === 'All companies' ? state.txns : state.txns.filter((t) => t.co === scope)
  const unresolved = unresolvedFor(state)
  // Rows the four tiles cannot account for. See `unaccountedRows`: the note
  // below claims the four add up to the total, and one of these makes that
  // false by its own amount, silently.
  const stray = unaccountedRows(scoped)
  const of = (k) => scoped.filter((t) => eff(t) === k)

  // The window setting used to relabel this list without filtering it, so
  // "Next 7 days" still showed something due in three months.
  const horizon = addDays(TODAY, windowDays(state.settings.dashWindow))

  /**
   * One line per due date and category, not per transaction.
   *
   * Two things feed it. Rows already on the Tracker, and masterlist payables
   * that fall due inside the window and have not been generated yet — the list
   * was previously blind to those, so a deadline the owner had recorded but not
   * yet generated simply did not appear. A line built only from the second kind
   * links to the Masterlist ready to generate that month; anything with a real
   * row behind it opens the Tracker filtered to it.
   */
  // The same window the Tracker-row half of this list uses. `forecast` defaults
  // to 30 days for the Tracker's sync line; passing the setting is what stops
  // the masterlist half stopping short under "Next 90 days".
  const windowLen = windowDays(state.settings.dashWindow)
  const scopedForecast = forecast(state, TODAY, windowLen)
    .filter((x) => (scope === 'All companies' || x.co === scope) && x.due <= horizon)
  const byDue = (a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0)

  const items = scoped
    .filter((t) => t.status !== 'completed' && t.due && t.due <= horizon)
    .map((t) => ({ due: t.due, cat: t.cat, amount: t.amount, scheduled: false, month: undefined }))
    .concat(scopedForecast.map((x) => ({ due: x.due, cat: x.cat, amount: x.amount, scheduled: true, month: x.month })))
    .sort(byDue)

  const buckets = new Map()
  items.forEach((t) => {
    const k = t.due + '|' + t.cat
    if (!buckets.has(k)) buckets.set(k, { due: t.due, cat: t.cat, n: 0, amount: 0, sched: 0, month: t.month })
    const b = buckets.get(k)
    b.n += 1
    b.amount += t.amount
    if (t.scheduled) { b.sched += 1; b.month = b.month || t.month }
  })

  const all = [...buckets.values()].sort(byDue)
  const deadlines = all.slice(0, 8)
  const more = all.length - deadlines.length

  return (
    <div className="screen">
      <header className="topbar">
        <h1>Dashboard</h1>
        <div className="sub">as of {longDate(TODAY)}</div>
        <div className="spacer" />
        <Select className="field compact" value={scope} label="Company scope"
                onChange={(e) => set({ scope: e.target.value })}
                options={['All companies', ...state.companies]} />
      </header>

      <div className="dash-body">
        <div className="tiles">
          {TILES.map(({ key, label, color }) => {
            const rows = key === 'all' ? scoped : of(key)
            return (
              <button key={key} type="button" className="tile" onClick={tileFilter(key)}>
                <div className="eyebrow">{label}</div>
                <div className="value" style={{ color }}>{fmt(rows.reduce((a, t) => a + t.amount, 0))}</div>
                <div className="count">{rows.length} items</div>
              </button>
            )
          })}
        </div>
        <div className="dash-note">
          {stray.length
            ? <><strong>Payables is the total, and the four beside it do not add up to it.</strong>{' '}
              {stray.length === 1 ? 'One row carries' : stray.length + ' rows carry'} a status this
              screen does not recognise — {fmt(stray.reduce((a, t) => a + t.amount, 0))} unaccounted
              for, and not shown on the Tracker either. Click any tile to open the Tracker already
              filtered.</>
            : <>Payables is the total — the four beside it add up to it. Click any tile to open the Tracker already filtered.</>}
        </div>
        {unresolved.length ? <div className="dash-note">{unresolved.length} linked Tracker {unresolved.length === 1 ? 'row has' : 'rows have'} no occurrence identity; generation is paused for those payables.</div> : null}

        <div className="dash-cols">
          {state.settings.dashShowNotes ? (
            <section className="card">
              <div className="card-title">Notes &amp; reminders</div>
              {state.notes.map((n, i) => {
                const editing = state.noteEditing === i
                const hover = state.noteHover === i && !editing
                return (
                  <div className={'note-row' + (hover || editing ? ' active' : '')} key={i}
                       onMouseEnter={hoverNote(i)} onMouseLeave={unhoverNote(i)}>
                    <Check on={n.done} onClick={toggleNote(i)} label={'Mark "' + n.t + '" done'} />
                    {editing ? (
                      <>
                        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
                        <input className="note-input" autoFocus value={state.noteEditDraft}
                               aria-label={'Edit reminder: ' + n.t}
                               onChange={(e) => set({ noteEditDraft: e.target.value })}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter') saveNote(i)()
                                 if (e.key === 'Escape') cancelNote()
                               }} />
                        <button type="button" className="link" onClick={saveNote(i)}>Save</button>
                        <button type="button" className="link plain" onClick={cancelNote}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <div className={'text' + (n.done ? ' done' : '')}>{n.t}</div>
                        {n.linked ? <span className="tag" style={{ background: '#FADCE6', color: '#C4566E' }}>linked</span> : null}
                        {/* Always in the DOM, revealed by CSS on hover or focus.
                            Rendering them only while `hover` was true made
                            editing and deleting a reminder mouse-only: Tab went
                            from one reminder's checkbox straight to the next,
                            and a touch device never reached them at all. */}
                        <button type="button" className="row-icon" title="Edit"
                                aria-label={'Edit reminder: ' + n.t} onClick={editNote(i)}>
                          <IconPencil size={14} />
                        </button>
                        <button type="button" className="row-icon danger" title="Delete"
                                aria-label={'Delete reminder: ' + n.t} onClick={removeNote(i)}>
                          <IconTrash size={14} />
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
              <div className="spacer" />
              <div style={{ display: 'flex', gap: 9 }}>
                <input className="field compact sunken" placeholder="Add a reminder…" value={state.noteDraft}
                       onChange={(e) => set({ noteDraft: e.target.value })}
                       onKeyDown={(e) => { if (e.key === 'Enter') addNote() }} />
                <button type="button" className="btn primary" onClick={addNote}>Add</button>
              </div>
            </section>
          ) : <div />}

          <section className="card">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
              <div className="card-title">Upcoming deadlines</div>
              <div className="hint">{String(state.settings.dashWindow || 'Next 30 days').toLowerCase()}</div>
            </div>
            {deadlines.map((b) => {
              const over = b.due < TODAY
              const p = b.due.split('-')
              const allSched = b.sched === b.n
              const open = allSched
                ? () => set({ screen: 'masterlist', genMonth: b.month })
                : () => set({
                  screen: 'tracker', catFilter: b.cat, coFilter: 'All companies', search: '',
                  collapsed: {}, statuses: { pending: true, overdue: true, completed: false, hold: false },
                  filtersOpen: false, settingsMenuOpen: false,
                })
              return (
                <button key={b.due + '|' + b.cat} type="button" className="deadline" onClick={open}>
                  <div className={'chip-date' + (over ? ' over' : allSched ? ' sched' : '')}>
                    <div className="m">{MON[+p[1] - 1]}</div>
                    <div className="d">{p[2]}</div>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div className="title">{b.cat}</div>
                      {b.sched ? <span className="badge">MASTERLIST</span> : null}
                    </div>
                    <div className={'sub' + (over ? ' over' : '')}>
                      {b.n} {b.n === 1 ? 'transaction' : 'transactions'} · {fmt(b.amount)}
                      {over ? ' · overdue' : b.sched ? ' · ' + b.sched + ' not in the Tracker yet' : ''}
                    </div>
                  </div>
                  <span style={{ color: 'var(--faint)', display: 'flex' }}><IconChevronRight size={14} /></span>
                </button>
              )
            })}
            {more > 0 ? (
              <button type="button" className="link" style={{ textAlign: 'left', padding: '2px 4px' }}
                      onClick={go('tracker')}>
                +{more} more due {more === 1 ? 'date' : 'dates'} in {String(state.settings.dashWindow || 'Next 30 days').toLowerCase()}
              </button>
            ) : null}
            <div className="spacer" />
            <button type="button" className="link card-foot" onClick={go('tracker')}>Open the Tracker →</button>
          </section>
        </div>
      </div>
    </div>
  )
}
