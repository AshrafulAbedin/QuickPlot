/**
 * Auth entry points for the landing page.
 *
 * Google is the only sign-in method: there are no passwords to collect, so the
 * sign-in and register screens both funnel into the Firebase auth service used
 * by the authenticated web app.
 */

import { loginWithGoogle } from './authService';
import { hasFirebaseConfig } from './firebase';

export type AuthIntent = 'signin' | 'register';

export function isAuthConfigured(): boolean {
  return hasFirebaseConfig();
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
