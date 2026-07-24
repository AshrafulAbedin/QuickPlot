import App from './App'
import { SharedWorkspaceView } from './features/workspace'

export function AppRouter() {
  const match = window.location.pathname.match(/^\/shared\/([A-Za-z0-9]+)\/?$/)
  if (match) {
    return <SharedWorkspaceView shareId={match[1]} />
  }
  return <App />
}
