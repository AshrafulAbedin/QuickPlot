import { useState, useCallback } from 'react'
import type { Workspace, CreateWorkspaceInput, UpdateWorkspaceInput } from '@quickplot/types'
import {
  createWorkspace,
  getWorkspace,
  updateWorkspace as updateWs,
  deleteWorkspace as deleteWs,
  toggleWorkspaceSharing,
} from '../../lib/db'

interface UseWorkspaceReturn {
  workspace: Workspace | null
  loading: boolean
  error: string | null
  create: (input: CreateWorkspaceInput) => Promise<Workspace | null>
  load: (id: string) => Promise<void>
  update: (updates: UpdateWorkspaceInput) => Promise<void>
  remove: () => Promise<void>
  removeById: (id: string) => Promise<boolean>
  toggleSharing: (shared: boolean) => Promise<string | null>
  clear: () => void
}

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

  const removeById = useCallback(async (id: string) => {
    setError(null)
    try {
      await deleteWs(id)
      setWorkspace(prev => (prev?.id === id ? null : prev))
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete workspace')
      return false
    }
  }, [])

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

  return { workspace, loading, error, create, load, update, remove, removeById, toggleSharing, clear }
}
