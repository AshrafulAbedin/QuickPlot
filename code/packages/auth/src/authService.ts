import type { User } from '@supabase/supabase-js';
import { getSupabase, hasAuthConfig } from './supabaseClient';

/**
 * Provider-neutral view of the signed-in user. UI code depends on this shape
 * only, so the auth backend can change without touching components.
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

function toAuthUser(user: User): AuthUser {
  const meta = user.user_metadata ?? {};
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: (meta.full_name ?? meta.name ?? null) as string | null,
    photoURL: (meta.avatar_url ?? meta.picture ?? null) as string | null,
  };
}

export async function register({ email, password, fullName }: { email: string; password: string; fullName: string }): Promise<AuthUser | null> {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data.user ? toAuthUser(data.user) : null;
}

export async function login({ email, password }: { email: string; password: string }): Promise<AuthUser> {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return toAuthUser(data.user);
}

/**
 * Starts the Google OAuth redirect. The page navigates away, so there is no
 * user to return — `onAuthChange` fires once Supabase lands us back here.
 */
export async function loginWithGoogle(): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.href,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
}

export async function logout(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}

export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  if (!hasAuthConfig()) {
    callback(null);
    return () => undefined;
  }
  // Fires INITIAL_SESSION synchronously-ish on subscribe, so callers can use
  // the first call to clear their loading state.
  const { data: { subscription } } = getSupabase().auth.onAuthStateChange((_event, session) => {
    callback(session?.user ? toAuthUser(session.user) : null);
  });
  return () => subscription.unsubscribe();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!hasAuthConfig()) return null;
  const { data } = await getSupabase().auth.getSession();
  return data.session?.user ? toAuthUser(data.session.user) : null;
}
