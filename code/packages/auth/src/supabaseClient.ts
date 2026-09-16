import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getFirebaseAuth, hasAuthConfig } from './firebase';

// The Supabase project URL is the bare host (https://<ref>.supabase.co). People
// copy the REST endpoint from the dashboard by mistake, so tolerate that.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

let client: SupabaseClient | null = null;

/** True when workspace storage can work. Sign-in is governed by `hasAuthConfig()`. */
export function hasDatabaseConfig(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * The one Supabase client for the whole app. Identity comes from Firebase:
 * every request carries the current Firebase ID token, which Supabase verifies
 * (Authentication -> Third-Party Auth -> Firebase) and exposes to RLS as
 * `auth.jwt()`. Created lazily so a guest with no `.env` can still plot.
 */
export function getSupabase(): SupabaseClient {
  if (!hasDatabaseConfig()) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to code/.env.');
  }
  client ??= createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => {
      if (!hasAuthConfig()) return null;
      const user = getFirebaseAuth().currentUser;
      return user ? await user.getIdToken() : null;
    },
  });
  return client;
}

/**
 * Upserts the signed-in user's row in `profiles` from the verified token
 * claims. Firebase users never appear in Supabase's auth.users, so there is no
 * trigger to do this — the client asks for it once per sign-in instead.
 */
export async function ensureProfile(): Promise<void> {
  if (!hasDatabaseConfig()) return;
  const { error } = await getSupabase().rpc('ensure_profile');
  if (error) throw new Error(error.message);
}
