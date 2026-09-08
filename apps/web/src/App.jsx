import { useActions } from './actions.js'
import { own } from './logic.js'
import { SETTINGS_TABS } from './data.js'
import { IconAck, IconDashboard, IconMaster, IconSettings, IconSignOut, IconTelegraphic, IconTracker } from './icons.jsx'
import { supabase } from './supabase.js'
import Dashboard from './screens/Dashboard.jsx'
import Tracker from './screens/Tracker.jsx'
import AckRec from './screens/AckRec.jsx'
import Telegraphic from './screens/Telegraphic.jsx'
import Masterlist from './screens/Masterlist.jsx'
import Settings from './screens/Settings.jsx'
import AddTransaction from './modals/AddTransaction.jsx'
import EditTransaction from './modals/EditTransaction.jsx'
import PayMethod from './modals/PayMethod.jsx'
import Liquidate from './modals/Liquidate.jsx'
import AddRecurring from './modals/AddRecurring.jsx'
import AddReceipt from './modals/AddReceipt.jsx'
import DeleteReceipt from './modals/DeleteReceipt.jsx'
import EditReceipt from './modals/EditReceipt.jsx'
import AddTransfer from './modals/AddTransfer.jsx'
import EditTransfer from './modals/EditTransfer.jsx'
import DeleteTransfer from './modals/DeleteTransfer.jsx'
import Filters from './modals/Filters.jsx'

const NAV = [
  { k: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
  { k: 'tracker', label: 'Tracker', Icon: IconTracker },
  { k: 'ackrec', label: 'AckRec', Icon: IconAck },
  { k: 'telegraphic', label: 'Telegraphic', Icon: IconTelegraphic },
  { k: 'masterlist', label: 'Masterlist', Icon: IconMaster },
]

const SCREENS = { dashboard: Dashboard, tracker: Tracker, ackrec: AckRec, telegraphic: Telegraphic, masterlist: Masterlist, settings: Settings }

export default function App() {
  const { state, set, go, goSettings } = useActions()
  // `own` rather than `SCREENS[...]`: a `screen` of `constructor` would find
  // the Object constructor, defeat the `|| Dashboard` fallback, and hand React a
  // value it cannot render. Same class as the currency symbols (D88).
  const Screen = own(SCREENS, state.screen) || Dashboard

  return (
    <div className="app">
      <nav className="rail" aria-label="Sections">
        <div className="rail-logo" aria-hidden="true">Z</div>
        {NAV.map(({ k, label, Icon }) => (
          <button key={k} type="button" title={label}
                  className={'rail-item' + (state.screen === k ? ' on' : '')}
                  aria-current={state.screen === k ? 'page' : undefined}
                  onClick={go(k)}>
            <Icon /><span>{label}</span>
          </button>
        ))}
        <button type="button" title="Settings"
                className={'rail-item' + (state.screen === 'settings' ? ' on' : '')}
                aria-expanded={state.settingsMenuOpen}
                onClick={() => set((s) => ({ settingsMenuOpen: !s.settingsMenuOpen }))}>
          <IconSettings /><span>Settings {state.settingsMenuOpen ? '▾' : '▸'}</span>
        </button>
        <div className="spacer" />
        {/* `scope: 'global'` is the library default, written out because it is a
            choice rather than an accident: signing out here revokes this account
            on every device it is signed in on. For a shared ledger that is the
            point — a lost phone is killed from any other device. Decided by the
            owner, see Decisions D47. `src/store.jsx` carries the same scope. */}
        <button type="button" title="Sign out" className="rail-item"
                onClick={() => supabase.auth.signOut({ scope: 'global' })}>
          <IconSignOut /><span>Sign out</span>
        </button>
      </nav>

      {state.settingsMenuOpen ? (
        <>
          <div className="settings-scrim" onClick={() => set({ settingsMenuOpen: false })} />
          <div className="settings-flyout">
            <div className="eyebrow" style={{ padding: '0 8px 9px' }}>Settings</div>
            {SETTINGS_TABS.map((t) => (
              <button key={t.k} type="button"
                      className={state.screen === 'settings' && state.settingsTab === t.k ? 'on' : ''}
                      onClick={goSettings(t.k)}>{t.label}</button>
            ))}
            <div className="spacer" />
          </div>
        </>
      ) : null}

      <div className="main"><Screen /></div>

      {state.editOpen ? <EditTransaction /> : null}
      {state.filtersOpen && state.screen === 'tracker' ? <Filters /> : null}
      {state.addOpen ? <AddTransaction /> : null}
      {state.payOpen ? <PayMethod /> : null}
      {state.liqOpen ? <Liquidate /> : null}
      {state.recOpen ? <AddRecurring /> : null}
      {state.rcpOpen ? <AddReceipt /> : null}
      {state.delRcpId ? <DeleteReceipt /> : null}
      {state.rcpEditOpen ? <EditReceipt /> : null}
      {state.telOpen ? <AddTransfer /> : null}
      {state.telEditOpen ? <EditTransfer /> : null}
      {state.delTelId ? <DeleteTransfer /> : null}
      {state.readOnly ? (
        <div className="viewing-only" role="status">
          Viewing only — this account can read the ledger but not change it.
        </div>
      ) : null}
      {state.toast ? <div className="toast" role="status">{state.toast}</div> : null}
    </div>
  )
}
