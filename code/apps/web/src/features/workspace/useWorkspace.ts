import { useState, useCallback } from 'react'
import type { Workspace, CreateWorkspaceInput, UpdateWorkspaceInput } from '@quickplot/types'
import {
  createWorkspace,
  getWorkspace,
  updateWorkspace as updateWs,
  deleteWorkspace as deleteWs,
  toggleWorkspaceSharing,
} from '../../lib/firestore'

interface UseWorkspaceReturn {
  /** The currently loaded workspace, or null. */
  workspace: Workspace | null
  /** Loading state for any async operation. */
  loading: boolean
  /** Last error message, or null. */
  error: string | null
  /** Create a new workspace and set it as current. */
  create: (input: CreateWorkspaceInput) => Promise<Workspace | null>
  /** Load a workspace by ID and set it as current. */
  load: (id: string) => Promise<void>
  /** Update the current workspace. */
  update: (updates: UpdateWorkspaceInput) => Promise<void>
  /** Delete the current workspace and clear it. */
  remove: () => Promise<void>
  /** Toggle sharing and return the shareId (or null if disabled). */
  toggleSharing: (shared: boolean) => Promise<string | null>
  /** Clear the current workspace from state (does not delete from DB). */
  clear: () => void
}

/**
 * Hook for managing a single workspace — create, load, update, delete, share.
 *
 * Does NOT manage the workspace list. See useWorkspaceList for that.
 */
export function useWorkspace(): UseWorkspaceReturn {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (input: CreateWorkspaceInput) => {
    setLoading(true)
    setError(null)
    try {
      const ws = await createWorkspace(input)
      setWorkspace(ws)
      return ws
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create workspace')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const load = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const ws = await getWorkspace(id)
      if (!ws) {
        setError('Workspace not found')
        return
      }
      setWorkspace(ws)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workspace')
    } finally {
      setLoading(false)
    }
  }, [])

  const update = useCallback(async (updates: UpdateWorkspaceInput) => {
    if (!workspace) return
    setLoading(true)
    setError(null)
    try {
      await updateWs(workspace.id, updates)
      setWorkspace(prev => prev ? { ...prev, ...updates, updatedAt: new Date().toISOString() } : null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update workspace')
    } finally {
      setLoading(false)
    }
  }, [workspace])

  const remove = useCallback(async () => {
    if (!workspace) return
    setLoading(true)
    setError(null)
    try {
      await deleteWs(workspace.id)
      setWorkspace(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete workspace')
    } finally {
      setLoading(false)
    }
  }, [workspace])

  const toggleSharing = useCallback(async (shared: boolean) => {
    if (!workspace) return null
    setLoading(true)
    setError(null)
    try {
      const shareId = await toggleWorkspaceSharing(workspace.id, shared)
      setWorkspace(prev =>
        prev ? { ...prev, shared, shareId: shareId ?? undefined, updatedAt: new Date().toISOString() } : null,
      )
      return shareId
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to toggle sharing')
      return null
    } finally {
      setLoading(false)
    }
  }, [workspace])

  const clear = useCallback(() => {
    setWorkspace(null)
    setError(null)
  }, [])

  return { workspace, loading, error, create, load, update, remove, toggleSharing, clear }
}
