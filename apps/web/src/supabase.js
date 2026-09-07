import { createClient } from '@supabase/supabase-js'

// Read the two variables by name, never `import.meta.env` as a whole object:
// Vite statically replaces each named member access, but any reference to the
// object itself inlines EVERY VITE_-prefixed variable into the browser bundle —
// on Vercel that means the repository owner, slug, ids, branch, SHAs and the
// full commit message, served to anyone who fetches the sign-in page.
// `import.meta.env` is undefined under Node, where the process.env fallback is
// what lets `npm run smoke` and the scripts use this same module.
const penv = typeof process === 'undefined' ? {} : process.env

const url = import.meta.env?.VITE_SUPABASE_URL ?? penv.VITE_SUPABASE_URL
const key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? penv.VITE_SUPABASE_PUBLISHABLE_KEY

// Fail loudly at boot rather than letting every query return a confusing 401.
if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. ' +
    'Copy apps/web/.env.example to .env.local and fill both in.',
  )
}

export const supabase = createClient(url, key)
