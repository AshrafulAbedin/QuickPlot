import { signInWithPopup, type User } from 'firebase/auth';
import { getFirebaseAuth, getGoogleProvider } from './firebase';

/** Matches the Google popup flow used by apps/web. */
export async function loginWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
  return credential.user;
}
