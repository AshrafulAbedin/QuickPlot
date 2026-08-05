import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom'
import App from './App'
import { SharedWorkspaceView } from './features/workspace'
import Login from './pages/Login'
import Register from './pages/Register'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/shared/:shareId" element={<SharedWorkspaceViewWrapper />} />
      </Routes>
    </BrowserRouter>
  )
}

function SharedWorkspaceViewWrapper() {
  const { shareId } = useParams<{ shareId: string }>()
  if (!shareId) {
    return <Navigate to="/" replace />
  }
  return <SharedWorkspaceView shareId={shareId} />
}
