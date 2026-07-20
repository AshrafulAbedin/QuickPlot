import { useState, useEffect } from 'react'
import type { Workspace } from '@quickplot/types'
import { getSharedWorkspace } from '../../lib/db'

export type SharedStatus = 'loading' | 'found' | 'not-found' | 'error'

interface UseSharedWorkspaceReturn {
  workspace: Workspace | null
  status: SharedStatus
  error: string | null
}

/**
 * Fetches a publicly-shared workspace by its shareId.
 *
 * Does NOT require authentication — shared workspaces are public-read
 * (enforced by Firestore security rules).
 */
export function useSharedWorkspace(shareId: string): UseSharedWorkspaceReturn {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [status, setStatus] = useState<SharedStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setError(null)

    getSharedWorkspace(shareId)
      .then(ws => {
        if (cancelled) return
        if (!ws) {
          setStatus('not-found')
          return
        }
        setWorkspace(ws)
        setStatus('found')
      })
      .catch(e => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load shared workspace')
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [shareId])

  return { workspace, status, error }
}
