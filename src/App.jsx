import { useActions } from './actions.js'
import { SETTINGS_TABS } from './data.js'
import { IconAck, IconDashboard, IconMaster, IconSettings, IconSignOut, IconTracker } from './icons.jsx'
import { supabase } from './supabase.js'
import Dashboard from './screens/Dashboard.jsx'
import Tracker from './screens/Tracker.jsx'
import AckRec from './screens/AckRec.jsx'
import Masterlist from './screens/Masterlist.jsx'
import Settings from './screens/Settings.jsx'
import AddTransaction from './modals/AddTransaction.jsx'
import EditTransaction from './modals/EditTransaction.jsx'
import PayMethod from './modals/PayMethod.jsx'
import Liquidate from './modals/Liquidate.jsx'
import AddRecurring from './modals/AddRecurring.jsx'
import AddReceipt from './modals/AddReceipt.jsx'
import Filters from './modals/Filters.jsx'

const NAV = [
  { k: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
  { k: 'tracker', label: 'Tracker', Icon: IconTracker },
  { k: 'ackrec', label: 'AckRec', Icon: IconAck },
  { k: 'masterlist', label: 'Masterlist', Icon: IconMaster },
]

const SCREENS = { dashboard: Dashboard, tracker: Tracker, ackrec: AckRec, masterlist: Masterlist, settings: Settings }

export default function App() {
  const { state, set, go, goSettings } = useActions()
  const Screen = SCREENS[state.screen] || Dashboard

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
        <button type="button" title="Sign out" className="rail-item"
                onClick={() => supabase.auth.signOut()}>
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
      {state.toast ? <div className="toast" role="status">{state.toast}</div> : null}
    </div>
  )
}
