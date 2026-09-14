/**
 * Auth entry points for the landing page.
 *
 * Google is the only sign-in method: there are no passwords to collect, so the
 * sign-in and register screens both funnel into the Firebase auth service used
 * by the authenticated web app.
 */

import { loginWithGoogle } from './authService';

export type AuthIntent = 'signin' | 'register';

const configured = [
  import.meta.env.VITE_FIREBASE_API_KEY,
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  import.meta.env.VITE_FIREBASE_PROJECT_ID,
  import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  import.meta.env.VITE_FIREBASE_APP_ID,
].every(Boolean);

export function isAuthConfigured(): boolean {
  return configured;
}

/**
 * Starts the same Firebase Google popup flow used by the graphers.
 */
export async function startGoogleAuth(_intent: AuthIntent): Promise<boolean> {
  if (!isAuthConfigured()) return false;

  await loginWithGoogle();
  window.location.assign(import.meta.env.VITE_URL_2D ?? 'http://localhost:5174');
  return true;
}
