import { createContext, useContext, useReducer, useRef, useState, useCallback, useEffect } from 'react'
import { initialState } from './data.js'
import { db, load } from './db.js'
import { configOf, configPatch } from './rows.js'
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
  const savedConfig = useRef(null)
  // The effect keys on the config's VALUE, not on `state`.
  //
  // It used to depend on `state`, and `reduce` returns a new object every time,
  // so anything at all that touched state re-ran it — including `flash`, which
  // is what `save` calls to report a failed write. That was harmless only while
  // a failure left the baseline advanced: the next run computed a null patch and
  // stopped. Adding the rollback below closed the circle — write fails, toast
  // sets state, effect re-runs, baseline is back so the patch is non-null again,
  // same write re-issued. Measured at 85 writes and 85 toasts in 500ms against
  // one toggle on a failing connection, and it would not stop until the network
  // returned or the tab was closed. Round 29, and family (c) exactly: the fix
  // for a silently dropped setting bought an unbounded retry loop.
  //
  // Keying on the serialised config means a toast cannot re-trigger a write,
  // because a toast does not change the config.
  const configKey = JSON.stringify(configOf(state))
  const readOnly = state.readOnly
  useEffect(() => {
    if (!ready) return undefined
    // A viewer's config never leaves the tab. Without this the effect would
    // fire on the settings screen and hand merge_app_config a patch it is
    // certain to refuse, turning a greyed-out screen into a toast storm.
    if (readOnly) return undefined
    const next = JSON.parse(configKey)
    if (savedConfig.current === null) { savedConfig.current = next; return undefined }
    const patch = configPatch(savedConfig.current, next)
    if (!patch) return undefined
    const t = setTimeout(() => {
      // Advance the baseline optimistically, then put it back if the write is
      // refused. `save` only reports the failure; it does not undo it. Leaving
      // the baseline advanced means the NEXT patch is a diff against a value the
      // database never received, so the refused change is dropped silently and
      // for good — the screen keeps showing a setting the ledger does not have.
      // `ackRequirePhoto` is one of these, and it is the setting that once
      // stopped the owner liquidating a receipt.
      //
      // Rolled back unconditionally, NOT only when the baseline still equals
      // what this write sent. Guarding on that skipped the rollback in the one
      // case it was written for — a refusal overlapping a later edit, where the
      // later patch carries only its own delta and the refused one is lost.
      // Re-sending a value the row already holds is a no-op merge, so recomputing
      // a superset patch next time costs nothing and recovers the lost change.
      const prev = savedConfig.current
      savedConfig.current = next
      const writing = db.saveConfig(patch)
      writing.catch(() => { savedConfig.current = prev })
      save(writing, 'the settings')
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
