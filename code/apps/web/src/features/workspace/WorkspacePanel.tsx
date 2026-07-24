import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth'
import { useWorkspace } from './useWorkspace'
import { useWorkspaceList } from './useWorkspaceList'
import { downloadWorkspace, parseWorkspaceJson } from '../../lib/workspace-io'
import type { CreateWorkspaceInput, Workspace } from '@quickplot/types'

export function WorkspacePanel() {
  const { user } = useAuth()
  const { workspace, create, load, removeById, toggleSharing, loading, error } = useWorkspace()
  const { workspaces, fetchList, removeLocal, addLocal, loading: listLoading } = useWorkspaceList()
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) fetchList(user.uid)
  }, [user, fetchList])

  if (!user) {
    return (
      <div className="p-4 text-sm text-neutral-400">
        Sign in to save and load workspaces.
      </div>
    )
  }

  async function handleSave() {
    const title = window.prompt('Workspace name:', 'Untitled')
    if (!title) return
    const input: CreateWorkspaceInput = {
      ownerId: user!.uid,
      title,
      equations: [],
      viewport: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
      sliders: [],
      shared: false,
    }
    const created = await create(input)
    if (created) addLocal(created)
  }

  async function handleLoad(ws: Workspace) {
    await load(ws.id)
  }

  async function handleDelete(ws: Workspace) {
    if (!window.confirm(`Delete "${ws.title}"?`)) return
    removeLocal(ws.id)
    const ok = await removeById(ws.id)
    if (!ok) fetchList(user!.uid)
  }

  function shareUrlFor(shareId: string) {
    return `${window.location.origin}/shared/${shareId}`
  }

  async function copyToClipboard(url: string) {
    setShareUrl(url)
    try { await navigator.clipboard.writeText(url) } catch { /* shown on screen */ }
  }

  async function handleShare() {
    if (!workspace) return
    const shareId = await toggleSharing(true)
    if (shareId) await copyToClipboard(shareUrlFor(shareId))
  }

  async function handleCopyLink() {
    if (!workspace?.shareId) return
    await copyToClipboard(shareUrlFor(workspace.shareId))
  }

  function handleExport() {
    if (workspace) downloadWorkspace(workspace)
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const parsed = parseWorkspaceJson(text)
      const created = await create({
        ownerId: user!.uid,
        title: parsed.title,
        equations: parsed.equations,
        viewport: parsed.viewport,
        sliders: parsed.sliders,
        theme: parsed.theme,
        shared: false,
      })
      if (created) addLocal(created)
    } catch (err) {
      window.alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-200">Workspaces</h3>
        <div className="flex gap-2">
          <button
            onClick={handleImportClick}
            className="px-3 py-1 text-xs rounded bg-neutral-600/50 text-neutral-200 hover:bg-neutral-600"
          >
            Import
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            + Save New
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFile}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      {workspace && (
        <div className="p-2 rounded bg-neutral-700/50 border border-neutral-600">
          <p className="text-xs text-neutral-300">
            Active: <span className="text-amber-400">{workspace.title}</span>
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {workspace.shared ? (
              <button onClick={handleCopyLink} className="text-xs px-2 py-1 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30">Copy link</button>
            ) : (
              <button onClick={handleShare} disabled={loading} className="text-xs px-2 py-1 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30 disabled:opacity-50">Share</button>
            )}
            <button onClick={handleExport} className="text-xs px-2 py-1 rounded bg-neutral-600/40 text-neutral-300 hover:bg-neutral-600/60">Export</button>
          </div>
          {workspace.shared && (
            <p className="mt-1 text-[10px] text-green-400/70">Anyone with the link can view this workspace.</p>
          )}
          {shareUrl && <p className="mt-1 text-xs text-green-300 break-all">Link copied: {shareUrl}</p>}
        </div>
      )}

      <div className="space-y-1">
        {listLoading && <p className="text-xs text-neutral-500">Loading...</p>}
        {workspaces.map(ws => (
          <div key={ws.id} className="flex items-center justify-between p-2 rounded hover:bg-neutral-700/50 group">
            <button onClick={() => handleLoad(ws)} className="text-xs text-neutral-300 hover:text-white text-left truncate flex-1">
              {ws.title}
              <span className="block text-[10px] text-neutral-500">{new Date(ws.updatedAt).toLocaleDateString()}</span>
            </button>
            <button onClick={() => handleDelete(ws)} className="text-xs text-red-400 opacity-0 group-hover:opacity-100 transition-opacity px-1" title="Delete">✕</button>
          </div>
        ))}
        {!listLoading && workspaces.length === 0 && (
          <p className="text-xs text-neutral-500">No saved workspaces yet.</p>
        )}
      </div>
    </div>
  )
}
