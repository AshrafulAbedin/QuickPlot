import { useState, useCallback } from 'react'
import type { Workspace } from '@quickplot/types'
import { getUserWorkspaces } from '../../lib/db'

interface UseWorkspaceListReturn {
  workspaces: Workspace[]
  loading: boolean
  error: string | null
  fetchList: (uid: string) => Promise<void>
  removeLocal: (id: string) => void
  addLocal: (ws: Workspace) => void
}

export function useWorkspaceList(): UseWorkspaceListReturn {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchList = useCallback(async (uid: string) => {
    setLoading(true)
    setError(null)
    try {
      const list = await getUserWorkspaces(uid)
      setWorkspaces(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workspaces')
    } finally {
      setLoading(false)
    }
  }, [])

  const removeLocal = useCallback((id: string) => {
    setWorkspaces(prev => prev.filter(w => w.id !== id))
  }, [])

  const addLocal = useCallback((ws: Workspace) => {
    setWorkspaces(prev => [ws, ...prev])
  }, [])

  return { workspaces, loading, error, fetchList, removeLocal, addLocal }
}
