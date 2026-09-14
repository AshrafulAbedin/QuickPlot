import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, getGoogleProvider, hasFirebaseConfig } from './firebase';

export async function register({ email, password, fullName }: { email: string; password: string; fullName: string }): Promise<User> {
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  if (fullName) await updateProfile(credential.user, { displayName: fullName });
  return credential.user;
}

export async function login({ email, password }: { email: string; password: string }): Promise<User> {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return credential.user;
}

export async function loginWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
  return credential.user;
}

export async function logout(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}

export function onAuthChange(callback: (user: User | null) => void) {
  if (!hasFirebaseConfig()) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export function getCurrentUser(): User | null {
  return hasFirebaseConfig() ? getFirebaseAuth().currentUser : null;
}
