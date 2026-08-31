import { createClient } from '@supabase/supabase-js'

// Vite injects `import.meta.env` in the browser bundle; the process.env
// fallback is what lets `npm run smoke` exercise this same module under Node.
const env = import.meta.env || process.env

const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY

// Fail loudly at boot rather than letting every query return a confusing 401.
if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. ' +
    'Copy apps/web/.env.example to .env.local and fill both in.',
  )
}

export const supabase = createClient(url, key)
