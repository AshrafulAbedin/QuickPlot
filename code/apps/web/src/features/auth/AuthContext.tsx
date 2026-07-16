import { createContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, googleProvider } from '../../lib/firebase'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  /** Null while loading, null when signed out, User when authenticated. */
  user: User | null
  /** True during the initial Firebase auth state check on page load. */
  loading: boolean
  /** Sign in with Google popup. Throws on failure — callers should catch. */
  signIn: () => Promise<void>
  /** Sign out the current user. */
  signOut: () => Promise<void>
}

// ─── Context ─────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // onAuthStateChanged fires once immediately with the persisted session
    // (or null), then on every future sign-in / sign-out.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function handleSignIn() {
    await signInWithPopup(auth, googleProvider)
    // user state is updated automatically by onAuthStateChanged above
  }

  async function handleSignOut() {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn: handleSignIn,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
