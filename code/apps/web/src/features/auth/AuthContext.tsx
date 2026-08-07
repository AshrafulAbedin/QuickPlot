import { createContext, useEffect, useState, type ReactNode } from 'react'
import { type User } from 'firebase/auth'
import authService from '../../lib/authService'

export interface AuthContextValue {
  user: User | null
  loading: boolean
  error: Error | null
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const unsubscribe = authService.onAuthChange((currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function login(email: string, password: string) {
    setError(null)
    try {
      await authService.login({ email, password })
    } catch (err) {
      const error = err as Error
      setError(error)
      throw error
    }
  }

  async function loginWithGoogle() {
    setError(null)
    try {
      await authService.loginWithGoogle()
    } catch (err) {
      const error = err as Error
      setError(error)
      throw error
    }
  }

  async function register(email: string, password: string, fullName: string) {
    setError(null)
    try {
      await authService.register({ email, password, fullName })
    } catch (err) {
      const error = err as Error
      setError(error)
      throw error
    }
  }

  async function handleSignOut() {
    await authService.logout()
    setUser(null)
  }

  async function resetPassword(email: string) {
    setError(null)
    try {
      await authService.sendPasswordResetEmail(email)
    } catch (err) {
      const error = err as Error
      setError(error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        loginWithGoogle,
        register,
        signOut: handleSignOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
