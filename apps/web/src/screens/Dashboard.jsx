import { useActions } from '../actions.js'
import { MON, TODAY } from '../data.js'
import { addDays, eff, fmt, longDate, windowDays } from '../logic.js'
import { Check, Select } from '../ui.jsx'
import { IconChevronRight } from '../icons.jsx'

/** Payables is the total; the four beside it partition it by effective status. */
const TILES = [
  { key: 'all', label: 'Payables', color: 'var(--ink)' },
  { key: 'completed', label: 'Completed', color: '#5C8F72' },
  { key: 'pending', label: 'Pending', color: '#BE8A38' },
  { key: 'overdue', label: 'Overdue', color: '#C4566E' },
  { key: 'hold', label: 'On hold', color: '#8B7079' },
]

export default function Dashboard() {
  const { state, set, tileFilter, go, addNote, toggleNote } = useActions()

  const scope = typeof state.scope === 'string' ? state.scope : 'All companies'
  const scoped = scope === 'All companies' ? state.txns : state.txns.filter((t) => t.co === scope)
  const of = (k) => scoped.filter((t) => eff(t) === k)

  // The window setting used to relabel this list without filtering it, so
  // "Next 7 days" still showed something due in three months.
  const horizon = addDays(TODAY, windowDays(state.settings.dashWindow))
  const deadlines = scoped
    .filter((t) => t.status !== 'completed' && t.due && t.due <= horizon)
    .sort((a, b) => (a.due < b.due ? -1 : 1))
    .slice(0, 6)

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
          Payables is the total — the four beside it add up to it. Click any tile to open the Tracker already filtered.
        </div>

        <div className="dash-cols">
          {state.settings.dashShowNotes ? (
            <section className="card">
              <div className="card-title">Notes &amp; reminders</div>
              {state.notes.map((n, i) => (
                <div className="note-row" key={i}>
                  <Check on={n.done} onClick={toggleNote(i)} label={'Mark "' + n.t + '" done'} />
                  <div className={'text' + (n.done ? ' done' : '')}>{n.t}</div>
                  {n.linked ? <span className="tag" style={{ background: '#FADCE6', color: '#C4566E' }}>linked</span> : null}
                </div>
              ))}
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
              <div className="hint">{state.settings.dashWindow.toLowerCase()}</div>
            </div>
            {deadlines.map((t) => {
              const over = t.due < TODAY
              const p = t.due.split('-')
              return (
                <button key={t.id} type="button" className="deadline" onClick={tileFilter(over ? 'overdue' : 'pending')}>
                  <div className={'chip-date' + (over ? ' over' : '')}>
                    <div className="m">{MON[+p[1] - 1]}</div>
                    <div className="d">{p[2]}</div>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="title">{t.co} · {t.cat}</div>
                    <div className={'sub' + (over ? ' over' : '')}>{fmt(t.amount)}{over ? ' · overdue' : ''}</div>
                  </div>
                  <span style={{ color: 'var(--faint)', display: 'flex' }}><IconChevronRight size={14} /></span>
                </button>
              )
            })}
            <div className="spacer" />
            <button type="button" className="link card-foot" onClick={go('tracker')}>Open the Tracker →</button>
          </section>
        </div>
      </div>
    </div>
  )
}
