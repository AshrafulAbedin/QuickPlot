import { Link } from 'react-router-dom'
import { useAuth } from './useAuth'

export function AuthButton() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return <span className="text-sm text-neutral-400">Loading...</span>
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt={user.displayName ?? 'User avatar'}
            className="w-8 h-8 rounded-full"
          />
        )}
        <span className="text-sm">{user.displayName || user.email}</span>
        <button
          onClick={signOut}
          className="text-sm px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition"
        >
          Log out
        </button>
      </div>
    )
  }

  return (
    <Link
      to="/login"
      className="px-4 py-2 rounded-lg bg-amber-400 text-neutral-950 font-medium hover:bg-amber-300 transition text-sm"
    >
      Sign in
    </Link>
  )
}
