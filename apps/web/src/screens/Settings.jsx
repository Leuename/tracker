import { useActions } from '../actions.js'
import { FREQ, SETTINGS_TABS } from '../data.js'
import { Select, Switch } from '../ui.jsx'

const toggle = (k, name, hint) => ({ k, name, hint, kind: 'toggle' })
const select = (k, name, hint, options) => ({ k, name, hint, kind: 'select', options })

const ROWS = {
  // Every control here changes something. Two were removed rather than left
  // switchable: "Generate recurring payables automatically" on the 1st of the
  // month, and "Notify the holder when a receipt ages" after 14 days. Both
  // describe work that has to happen while nobody has the app open, and there
  // is no scheduler or mail sender to do it. They were stored, toggled, and
  // silently ignored. They belong back here the day a scheduled backend exists.
  masterlist: [
    toggle('warnDuplicate', 'Warn on duplicates', 'Flag a new transaction that matches an existing company, category and period.'),
    select('mlDefaultFreq', 'Default frequency for a new payable', 'Pre-selected in the Add payable form.', FREQ),
  ],
  ackrec: [
    toggle('ackRequirePhoto', 'Require a receipt file to liquidate', 'Liquidation cannot be saved without a photo or PDF attached.'),
    select('ackDefaultStatus', 'Status for a new receipt', 'What the status dropdown starts on.', ['Pending', 'Released', 'On hold']),
  ],
  tracker: [
    select('trkGroupDefault', 'Group rows by, on open', 'Which grouping the sheet starts in.', ['Company', 'Category']),
    toggle('trkShowGrandTotal', 'Show the grand total bar', 'The running total of the filtered rows at the bottom of the sheet.'),
    toggle('trkOverdueRed', 'Mark overdue rows in red', 'Colour the due date once the date has passed.'),
  ],
  dashboard: [
    select('dashDefaultScope', 'Company scope on open', 'Which companies the tiles count.', ['All companies', 'GTOI only', 'ZON only']),
    select('dashWindow', 'Deadline window', 'How far ahead Upcoming deadlines looks.', ['Next 7 days', 'Next 30 days', 'Next 90 days']),
    toggle('dashShowNotes', 'Show notes & reminders', 'Keep the reminder list on the dashboard.'),
  ],
}

function Chips({ title, items, count, draft, onDraft, onAdd, onRemove, placeholder }) {
  return (
    <section className="card">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        <div className="hint">{count} in the dropdown</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {items.map((c) => (
          <span className="chip" key={c}>
            {c}<button type="button" aria-label={'Remove ' + c} onClick={onRemove(c)}>✕</button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, maxWidth: 340 }}>
        <input className="field compact sunken" placeholder={placeholder} value={draft}
               onChange={onDraft} onKeyDown={(e) => { if (e.key === 'Enter') onAdd() }} />
        <button type="button" className="btn" onClick={onAdd}>Add</button>
      </div>
    </section>
  )
}

export default function Settings() {
  const { state, setS, field, addCompany, addCategory, removeCompany, removeCategory } = useActions()

  const tab = SETTINGS_TABS.find((t) => t.k === state.settingsTab) || SETTINGS_TABS[0]

  return (
    <div className="screen">
      <header className="topbar">
        <h1>{tab.title}</h1>
        <div className="sub">{tab.sub}</div>
      </header>

      <div className="settings-body">
        {tab.k === 'masterlist' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 21 }}>
            <Chips title="Companies" items={state.companies} count={state.companies.length}
                   draft={state.coDraft} onDraft={field('coDraft')} onAdd={addCompany}
                   onRemove={removeCompany} placeholder="New company code" />
            <Chips title="Expense categories" items={state.categories} count={state.categories.length}
                   draft={state.catDraft} onDraft={field('catDraft')} onAdd={addCategory}
                   onRemove={removeCategory} placeholder="New category" />
          </div>
        ) : null}

        <div className="card" style={{ padding: '8px 21px', gap: 0 }}>
          {ROWS[tab.k].map((r) => (
            <div className="setting-row" key={r.k}>
              <div className="copy">
                <div className="name">{r.name}</div>
                <div className="hint">{r.hint}</div>
              </div>
              {r.kind === 'toggle' ? (
                <Switch on={state.settings[r.k]} label={r.name} onClick={() => setS(r.k, !state.settings[r.k])} />
              ) : (
                <Select value={state.settings[r.k]} options={r.options} label={r.name}
                        onChange={(e) => setS(r.k, e.target.value)} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
