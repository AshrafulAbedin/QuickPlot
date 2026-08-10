/**
 * Auth entry points for the landing page.
 *
 * Google is the only sign-in method: there are no passwords to collect, so the
 * sign-in and register screens both funnel into `startGoogleAuth`. The backend
 * (Neon Postgres) is not wired up yet — this module is deliberately the single
 * place that has to change once it is, so no UI component needs editing.
 */

export type AuthIntent = 'signin' | 'register';

/** Set once the OAuth redirect endpoint exists; until then auth is a no-op. */
const AUTH_ENDPOINT = import.meta.env.VITE_AUTH_URL ?? '';

export function isAuthConfigured(): boolean {
  return AUTH_ENDPOINT.length > 0;
}

/**
 * Sends the browser to the Google OAuth flow.
 *
 * Returns `false` when auth is not configured yet, so callers can show a
 * "coming soon" notice instead of navigating nowhere.
 */
export function startGoogleAuth(intent: AuthIntent): boolean {
  if (!isAuthConfigured()) return false;
  window.location.href = `${AUTH_ENDPOINT}?intent=${intent}`;
  return true;
}
