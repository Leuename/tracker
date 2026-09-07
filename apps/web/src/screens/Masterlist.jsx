import { useActions } from '../actions.js'
import { FREQ } from '../data.js'
import { draftText, monthKeys, monthLabel, ruleLabel } from '../logic.js'
import { IconCheckCircle, IconChevronDown } from '../icons.jsx'

// Category and description gained the room; how-often, due date, amount and the
// remove button gave it up. Nothing here wraps at the retuned widths.
const COLS = '78px 186px 118px minmax(240px,1fr) 160px 110px 76px'

export default function Masterlist() {
  const { state, set, go, generate, undoGenerate, generatedFor, openRecurring, updRec, blurRec, removeRec } = useActions()

  return (
    <div className="screen">
      <header className="topbar">
        <h1>Masterlist</h1>
        <div className="sub">the payables that repeat, and the lists behind every dropdown</div>
        <div className="spacer" />

        <div className="split-btn">
          <button type="button" className="btn left" disabled={state.generating}
                  onClick={generate(state.genMonth)}>
            {state.generating ? "Generating…" : "Generate " + monthLabel(state.genMonth)}
          </button>
          <button type="button" className="btn right-cap" title="Pick a month"
                  aria-expanded={state.genMenuOpen}
                  onClick={() => set((s) => ({ genMenuOpen: !s.genMenuOpen }))}>
            <IconChevronDown size={13} />
          </button>

          {state.genMenuOpen ? (
            <div className="menu">
              <div className="eyebrow" style={{ padding: '6px 8px 9px' }}>Generate for</div>
              <div className="scroll">
                {monthKeys().map((k) => {
                  const n = generatedFor(k)
                  return (
                    <button key={k} type="button" className={k === state.genMonth ? 'on' : ''}
                            onClick={() => set({ genMonth: k, genMenuOpen: false })}>
                      <span className="label">{monthLabel(k)}</span>
                      <span className="note">{n ? n + ' rows exist' : ''}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        <button type="button" className="btn primary" onClick={openRecurring}>+ Add payable</button>
      </header>

      {state.bannerOpen ? (
        <div className="banner">
          <span style={{ color: 'var(--accent)', display: 'flex' }}><IconCheckCircle size={17} /></span>
          <span style={{ fontWeight: 600 }}>{state.bannerText}</span>
          <span className="spacer" />
          <button type="button" className="link plain" onClick={go('tracker')}>Review them</button>
          <button type="button" className="link plain" onClick={undoGenerate}>Undo</button>
          <button type="button" className="icon-btn" aria-label="Dismiss"
                  onClick={() => set({ bannerOpen: false })}>✕</button>
        </div>
      ) : null}

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div className="hscroll"><div style={{ minWidth: 1000 }}>
          <div className="eyebrow" style={{ padding: '21px 28px 10px' }}>Recurring payables</div>

          <div className="sheet-head compact" style={{ gridTemplateColumns: COLS, columnGap: 9, borderTop: '1px solid var(--border)', position: 'static' }}>
            <div>Company</div><div>Category</div><div>How often</div><div>Description</div>
            <div>Due date</div><div className="right">Amount</div><div />
          </div>

          {state.recurring.map((p) => (
            <div key={p.id} className="sheet-row compact" style={{ gridTemplateColumns: COLS, columnGap: 9, padding: '9px 28px' }}>
              <select className="inline-field bold" value={p.co} onChange={(e) => updRec(p.id, 'co', e.target.value)} aria-label="Company">
                {state.companies.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="inline-field" value={p.cat} onChange={(e) => updRec(p.id, 'cat', e.target.value)} aria-label="Category">
                {state.categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="inline-field" value={p.freq} onChange={(e) => updRec(p.id, 'freq', e.target.value)} aria-label="How often">
                {FREQ.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <input className="inline-field" value={p.desc} onChange={(e) => updRec(p.id, 'desc', e.target.value)} aria-label="Description" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <input type="date" className="inline-field" value={p.dueDate}
                       onChange={(e) => updRec(p.id, 'dueDate', e.target.value)} aria-label="Due date" />
                <span className="rule">{ruleLabel(p.freq, p.dueDate)}</span>
              </div>
              {/* Shows what is being typed, not what is stored: the store holds a
                  number, and rendering the field from it erased a decimal point
                  as fast as it was typed. `blurRec` drops the draft on leaving. */}
              <input className="inline-field right bold"
                     value={draftText(state.recDraft, p.id, 'amount', p.amount)}
                     onChange={(e) => updRec(p.id, 'amount', e.target.value)}
                     onBlur={blurRec} aria-label="Amount" />
              <div className="right">
                <button type="button" className="remove" onClick={removeRec(p)}>Remove</button>
              </div>
            </div>
          ))}

          <div className="hint" style={{ padding: '12px 28px 24px' }}>
            Every field here is editable in place. The due date and how often decide the due dates that Generate writes
            into the Tracker — which is what the dashboard tiles and Upcoming deadlines read.
          </div>
        </div></div>
      </div>
    </div>
  )
}
