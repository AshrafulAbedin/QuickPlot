import { useAuth } from './useAuth'

export function AuthButton() {
  const { user, loading, signIn, signOut } = useAuth()

  if (loading) {
    return <span className="text-sm text-gray-400">Loading…</span>
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <img
          src={user.photoURL ?? ''}
          alt={user.displayName ?? 'User avatar'}
          className="w-8 h-8 rounded-full"
        />
        <span className="text-sm">{user.displayName}</span>
        <button
          onClick={signOut}
          className="text-sm px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
        >
          Log out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={signIn}
      className="flex items-center gap-2 px-4 py-2 rounded bg-white text-gray-800 font-medium hover:bg-gray-100 shadow"
    >
      <img src="https://www.google.com/favicon.ico" alt="" className="w-4 h-4" />
      Sign in with Google
    </button>
  )
}
