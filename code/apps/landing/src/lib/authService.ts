import { signInWithPopup, type User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';

/** Matches the Google popup flow used by apps/web. */
export async function loginWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}
