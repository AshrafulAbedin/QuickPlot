import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, getGoogleProvider, hasAuthConfig } from './firebase';

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
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

export async function register({ email, password, fullName }: { email: string; password: string; fullName: string }): Promise<AuthUser> {
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  if (fullName) await updateProfile(credential.user, { displayName: fullName });
  return toAuthUser(credential.user);
}

export async function login({ email, password }: { email: string; password: string }): Promise<AuthUser> {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return toAuthUser(credential.user);
}

export async function loginWithGoogle(): Promise<AuthUser> {
  const credential = await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
  return toAuthUser(credential.user);
}

export async function logout(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}

export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  if (!hasAuthConfig()) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(getFirebaseAuth(), (user) => callback(user ? toAuthUser(user) : null));
}

export function getCurrentUser(): AuthUser | null {
  if (!hasAuthConfig()) return null;
  const user = getFirebaseAuth().currentUser;
  return user ? toAuthUser(user) : null;
}
