import { useState, useEffect } from 'react'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth, googleProvider } from '../../lib/firebase'

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  async function handleLogin() {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  async function handleLogout() {
    await signOut(auth)
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <img src={user.photoURL ?? ''} className="w-8 h-8 rounded-full" />
        <span className="text-sm">{user.displayName}</span>
        <button
          onClick={handleLogout}
          className="text-sm px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
        >
          Log out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleLogin}
      className="flex items-center gap-2 px-4 py-2 rounded bg-white text-gray-800 font-medium hover:bg-gray-100 shadow"
    >
      <img src="https://www.google.com/favicon.ico" className="w-4 h-4" />
      Sign in with Google
    </button>
  )
}