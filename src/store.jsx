import { createContext, useContext, useReducer, useRef, useState, useCallback, useEffect } from 'react'
import { initialState } from './data.js'
import { db, load } from './db.js'
import { CONFIG_KEYS } from './rows.js'
import { Splash } from './Auth.jsx'

// One reducer standing in for the prototype's this.setState: accepts a patch
// object or an updater function, exactly as the class component did.
const reduce = (s, patch) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })

const Ctx = createContext(null)

/** The slices that go into the `app_config` row, as one comparable string. */
const configSnapshot = (s) => JSON.stringify(CONFIG_KEYS.map((k) => s[k]))

export function StoreProvider({ children }) {
  const [state, set] = useReducer(reduce, initialState)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState('')
  const timer = useRef(null)

  const flash = useCallback((msg) => {
    if (timer.current) clearTimeout(timer.current)
    set({ toast: msg })
    timer.current = setTimeout(() => set({ toast: '' }), 2600)
  }, [])

  /**
   * Writes are fire-and-forget: the reducer has already updated the screen, so
   * a failure surfaces as a toast rather than a rollback. The local copy is
   * then ahead of the database until the next reload, which is the honest
   * trade for keeping every interaction instant.
   */
  const save = useCallback((promise, what) => {
    Promise.resolve(promise).catch((e) => {
      console.error('[supabase]', what, e)
      flash("Couldn't save " + what + ' — ' + (e.message || 'unknown error'))
    })
  }, [flash])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  useEffect(() => {
    let cancelled = false
    load().then(
      (data) => { if (!cancelled) { set(data); setReady(true) } },
      (e) => { if (!cancelled) setLoadError(e.message || String(e)) },
    )
    return () => { cancelled = true }
  }, [])

  // Config is a single shared row of lists and toggles, so it saves by
  // comparison rather than through each of the eight actions that touch it.
  // Debounced because the settings screen fires on every keystroke and switch.
  const savedConfig = useRef(null)
  useEffect(() => {
    if (!ready) return undefined
    const snapshot = configSnapshot(state)
    if (savedConfig.current === null) { savedConfig.current = snapshot; return undefined }
    if (savedConfig.current === snapshot) return undefined
    const t = setTimeout(() => {
      savedConfig.current = snapshot
      save(db.saveConfig(state), 'the settings')
    }, 600)
    return () => clearTimeout(t)
  }, [ready, state, save])

  if (loadError) {
    return <Splash>Couldn&rsquo;t load the data — {loadError}. Reload to try again.</Splash>
  }
  if (!ready) return <Splash>Loading the payables…</Splash>

  return <Ctx.Provider value={{ state, set, flash, save }}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore must be used inside <StoreProvider>')
  return v
}
