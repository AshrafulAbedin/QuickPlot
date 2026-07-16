import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './AuthContext'

/**
 * Returns the current auth state and auth actions.
 *
 * Must be called inside <AuthProvider>. Throws immediately if it isn't,
 * so misconfiguration surfaces fast rather than producing silent null bugs.
 *
 * @example
 * const { user, loading, signIn, signOut } = useAuth()
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx === null) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
