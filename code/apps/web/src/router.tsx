import App from './App'
import { SharedWorkspaceView } from './features/workspace'

/**
 * Minimal path-based router.
 *
 * - /shared/:shareId  →  read-only shared workspace view
 * - everything else   →  the main App
 *
 * Intentionally dependency-free to stay merge-friendly with the frontend
 * branch (whose App.tsx remains the default route). If routing needs grow
 * (nested routes, params, guards), swap this for react-router.
 */
export function AppRouter() {
  const match = window.location.pathname.match(/^\/shared\/([A-Za-z0-9]+)\/?$/)
  if (match) {
    return <SharedWorkspaceView shareId={match[1]} />
  }
  return <App />
}
