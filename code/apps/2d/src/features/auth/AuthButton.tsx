import { useAuth } from './useAuth'

export function AuthButton() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return <span className="text-sm text-neutral-400">Loading...</span>
  }

  if (user) {
    return (
      <div className="plot-account">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName ?? 'User avatar'}
            className="plot-account-avatar"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="plot-account-avatar plot-account-initial" aria-hidden="true">
            {(user.displayName || user.email || 'U').slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="plot-account-name" title={user.displayName || user.email || 'Account'}>{user.displayName || user.email}</span>
        <button
          onClick={signOut}
          className="plot-signout"
          title="Sign out"
          aria-label="Sign out"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Sign out</span>
        </button>
      </div>
    )
  }

  return (
    <a
      href="/"
      className="px-4 py-2 rounded-lg bg-amber-400 text-neutral-950 font-medium hover:bg-amber-300 transition text-sm"
    >
      Sign in
    </a>
  )
}
