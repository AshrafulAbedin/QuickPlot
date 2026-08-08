import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as updateFirebaseProfile,
  type User,
} from 'firebase/auth'
import { auth, googleProvider } from './firebase'

/**
 * Register a new user with email and password
 */
async function register({
  email,
  password,
  fullName,
}: {
  email: string
  password: string
  fullName: string
}): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password)

  // Update Firebase profile with display name
  if (fullName && credential.user) {
    await updateFirebaseProfile(credential.user, {
      displayName: fullName,
    })
  }

  return credential.user
}

/**
 * Sign in with email and password
 */
async function login({
  email,
  password,
}: {
  email: string
  password: string
}): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

/**
 * Sign in with Google popup
 */
async function loginWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider)
  return credential.user
}

/**
 * Sign out the current user
 */
async function logout(): Promise<void> {
  await firebaseSignOut(auth)
}

/**
 * Subscribe to Firebase auth state changes
 */
function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

/**
 * Get the current Firebase user
 */
function getCurrentUser(): User | null {
  return auth.currentUser
}

const authService = {
  register,
  login,
  loginWithGoogle,
  logout,
  onAuthChange,
  getCurrentUser,
}

export default authService
export { register, login, loginWithGoogle, logout, onAuthChange, getCurrentUser }
