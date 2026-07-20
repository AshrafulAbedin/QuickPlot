import { useState, useCallback } from 'react'
import type { Workspace } from '@quickplot/types'
import { getUserWorkspaces } from '../../lib/db'

interface UseWorkspaceListReturn {
  /** List of the user's workspaces (most recently updated first). */
  workspaces: Workspace[]
  /** Loading state. */
  loading: boolean
  /** Last error, or null. */
  error: string | null
  /** Fetch/refresh the list for a given user ID. */
  fetchList: (uid: string) => Promise<void>
  /** Remove a workspace from the local list immediately (optimistic UI). */
  removeLocal: (id: string) => void
  /** Add a workspace to the top of the local list immediately (optimistic UI). */
  addLocal: (ws: Workspace) => void
}

/**
 * Hook for listing a user's saved workspaces.
 *
 * Call `fetchList(uid)` after auth is confirmed to populate the list.
 */
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
