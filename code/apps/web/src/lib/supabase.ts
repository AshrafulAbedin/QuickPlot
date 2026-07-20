import { createClient } from '@supabase/supabase-js'
import { auth } from './firebase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly and early rather than producing a cryptic runtime crash.
  throw new Error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env ' +
      '(see .env.example). Only required if the DB layer is switched to Supabase in lib/db.ts.',
  )
}

/**
 * Supabase client wired to use the Firebase Auth session as its access token
 * (third-party auth). The Firebase ID token is sent on every request, so
 * Postgres Row Level Security can read the Firebase uid via `auth.jwt()->>'sub'`.
 *
 * Because `accessToken` is provided, do NOT use Supabase's own auth methods —
 * identity is owned entirely by Firebase Auth.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => {
    const user = auth.currentUser
    return user ? await user.getIdToken() : null
  },
})
