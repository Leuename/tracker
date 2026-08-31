import { useEffect, useId, useState } from 'react'
import { supabase } from './supabase.js'

/**
 * Sign-in gate. Nothing below it renders without a session, so every query can
 * assume a signed-in role.
 *
 * There is no sign-up form. Accounts are created in the Supabase dashboard and
 * self-serve registration is off in the project's auth settings. Both halves
 * matter: without the server setting, removing this form only hides the door.
 *
 * Every account that exists has identical, full access to the ledger — there
 * is no role column. Creating an account IS the access-control decision.
 */
export function AuthGate({ children }) {
  const [session, setSession] = useState(undefined) // undefined = still checking

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <Splash>Checking your session…</Splash>
  if (!session) return <SignIn />

  // Both accounts share one dataset, but remounting on account change still
  // discards anything the previous session had in memory but had not written.
  return <div key={session.user.id}>{children}</div>
}

export function Splash({ children, onRetry }) {
  return (
    <div className="auth">
      <div className="card auth-card">
        <div className="hint">{children}</div>
        {onRetry ? <button type="button" className="btn primary" onClick={onRetry}>Try again</button> : null}
      </div>
    </div>
  )
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Real <label for> pairs, not the styled divs the rest of the app uses for
  // its field captions: this form is the one screen a keyboard or screen
  // reader user has to get through before anything else works.
  const emailId = useId()
  const passwordId = useId()

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    // On success onAuthStateChange swaps this form out; nothing to do here.
    if (err) setError(err.message)
  }

  return (
    <div className="auth">
      <form className="card auth-card" onSubmit={submit}>
        <div>
          <div className="eyebrow">Zone ERP</div>
          <h1 className="card-title" style={{ marginTop: 4 }}>Sign in</h1>
          <div className="hint" style={{ marginTop: 6 }}>
            Payables, receipts and settings are shared by everyone with an account.
          </div>
        </div>

        <div>
          <label className="label" htmlFor={emailId}>Email</label>
          <input className="field" id={emailId} type="email" autoComplete="email" required
                 value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div>
          <label className="label" htmlFor={passwordId}>Password</label>
          <input className="field" id={passwordId} type="password" required autoComplete="current-password"
                 value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {error ? <div className="hint required" role="alert">{error}</div> : null}

        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="hint">Accounts are issued by the administrator.</div>
      </form>
    </div>
  )
}
