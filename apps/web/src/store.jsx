import { createContext, useContext, useReducer, useRef, useState, useCallback, useEffect } from 'react'
import { initialState } from './data.js'
import { db, load } from './db.js'
import { configOf } from './rows.js'
import { createConfigSync } from './config-save.js'
import { openingView } from './logic.js'
import { supabase } from './supabase.js'
import { Splash } from './Auth.jsx'

// One reducer standing in for the prototype's this.setState: accepts a patch
// object or an updater function, exactly as the class component did.
const reduce = (s, patch) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })

const Ctx = createContext(null)

/** The slices that go into the `app_config` row, as one comparable string. */

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

  // `attempt` exists so the splash's Retry button can re-run this effect.
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    setLoadError('')
    load().then(
      (data) => {
        if (cancelled) return
        // Apply the saved opening view here rather than in the reducer's
        // initial state, which is built before any settings have been read.
        set({ ...data, ...openingView(data.settings) })
        setReady(true)
      },
      (e) => {
        if (cancelled) return
        // The session is gone for good, so drop it: the gate then shows the
        // sign-in form, which is the only thing that can help. Leaving a dead
        // session in place would strand the user on an error screen.
        //
        // Same explicit scope as the Sign out button in `App.jsx` (D47). This
        // is the same browser and the same user, so the two must not disagree.
        // In practice a dead session has no usable refresh token left to revoke,
        // which is why this reads as belt-and-braces rather than as the control.
        if (e.sessionExpired) { supabase.auth.signOut({ scope: 'global' }); return }
        setLoadError(e.message || String(e))
      },
    )
    return () => { cancelled = true }
  }, [attempt])

  // Config is a single shared row of lists and toggles, so it saves by
  // comparison rather than through each of the eight actions that touch it.
  // Debounced because the settings screen fires on every keystroke and switch.
  //
  // What goes to the database is the DIFF against what this tab last saved, not
  // the whole config. Four people share this row; sending all of it meant the
  // second save of any pair was built from a config loaded before the first and
  // silently discarded it. `merge_app_config` folds patches together instead.
  // Every decision about what to send and what the baseline becomes lives in
  // `config-save.js`, where a test can drive it without React. Three rounds in
  // a row put a defect in these twelve lines and the suite stayed green each
  // time, because nothing offline imports this file. What is left here is the
  // debounce and the effect wiring.
  const sync = useRef(null)
  if (!sync.current) sync.current = createConfigSync({ write: db.saveConfig })
  useEffect(() => {
    if (!ready) return undefined
    // A viewer's config never leaves the tab. Without this the effect would
    // fire on the settings screen and hand merge_app_config a patch it is
    // certain to refuse, turning a greyed-out screen into a toast storm.
    if (readOnly) return undefined
    const next = JSON.parse(configKey)
    if (sync.current.current() === null) { sync.current.seed(next); return undefined }
    if (!sync.current.pending(next)) return undefined
    const t = setTimeout(() => {
      // `send` recomputes the diff NOW rather than using the one `pending`
      // returned above. A rejection landing inside this debounce rolls the
      // baseline back, and a patch frozen when the effect ran would not see it.
      const writing = sync.current.send(next)
      if (writing) save(writing, 'the settings')
    }, 600)
    return () => clearTimeout(t)
  }, [ready, readOnly, configKey, save])

  if (loadError) {
    return (
      <Splash onRetry={() => setAttempt((n) => n + 1)}>
        Couldn&rsquo;t load the data — {loadError}
      </Splash>
    )
  }
  if (!ready) return <Splash>Loading the payables…</Splash>

  return <Ctx.Provider value={{ state, set, flash, save }}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore must be used inside <StoreProvider>')
  return v
}
