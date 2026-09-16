import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The Supabase project URL is the bare host (https://<ref>.supabase.co). People
// copy the REST endpoint from the dashboard by mistake, so tolerate that.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

let client: SupabaseClient | null = null;

/** True when the env has enough for auth *and* database access to work. */
export function hasAuthConfig(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * The one Supabase client for the whole app. Created lazily so a guest with
 * no `.env` can still open the graphers — nothing throws until something
 * actually needs the backend.
 */
export function getSupabase(): SupabaseClient {
  if (!hasAuthConfig()) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to code/.env.');
  }
  client ??= createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
