import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth'
import { useWorkspace } from './useWorkspace'
import { useWorkspaceList } from './useWorkspaceList'
import { downloadWorkspace, parseWorkspaceJson } from '../../lib/workspace-io'
import type { CreateWorkspaceInput, Workspace } from '@quickplot/types'

export function WorkspacePanel() {
  const { user } = useAuth()
  const { workspace, create, load, removeById, setPublic, loading, error } = useWorkspace()
  const { workspaces, fetchList, removeLocal, addLocal, loading: listLoading } = useWorkspaceList()
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) fetchList()
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
      title,
      equations: [],
      viewport: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
      sliders: [],
    }
    const created = await create(input)
    if (created) addLocal(created)
  }

  async function handleLoad(ws: Workspace) {
    await load(ws.id)
  }

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  async function handleDelete(ws: Workspace) {
    setDeleteConfirmId(null)
    removeLocal(ws.id)
    const ok = await removeById(ws.id)
    if (!ok) fetchList()
  }

  function shareUrlFor(shareToken: string) {
    return `${window.location.origin}/shared/${shareToken}`
  }

  async function copyToClipboard(url: string) {
    setShareUrl(url)
    try { await navigator.clipboard.writeText(url) } catch { /* shown on screen */ }
  }

  async function handleShare() {
    if (!workspace) return
    const shareToken = await setPublic(true)
    if (shareToken) await copyToClipboard(shareUrlFor(shareToken))
  }

  async function handleCopyLink() {
    if (!workspace) return
    await copyToClipboard(shareUrlFor(workspace.shareToken))
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
        title: parsed.title,
        equations: parsed.equations,
        viewport: parsed.viewport,
        sliders: parsed.sliders,
        theme: parsed.theme,
      })
      if (created) addLocal(created)
    } catch (err) {
      window.alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-pixel tracking-widest text-neutral-300">WORKSPACES</h3>
        <div className="flex gap-2">
          <button
            onClick={handleImportClick}
            className="px-2.5 py-1 text-xs font-mono rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-amber-300 border border-neutral-700/80 transition-all shadow-sm active:scale-95"
          >
            Import
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-gradient-to-b from-amber-400 to-amber-500 text-neutral-950 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 transition-all shadow-sm shadow-amber-500/20 active:scale-95"
          >
            Save New
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

      {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

      {workspace && (
        <div className="p-2.5 rounded-lg bg-neutral-800/80 border border-neutral-700/80 shadow-sm">
          <p className="text-xs font-mono text-neutral-300">
            Active: <span className="text-amber-400 font-semibold">{workspace.title}</span>
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {workspace.isPublic ? (
              <button onClick={handleCopyLink} className="text-xs font-mono px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-all shadow-sm active:scale-95">Copy link</button>
            ) : (
              <button onClick={handleShare} disabled={loading} className="text-xs font-mono px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-all shadow-sm active:scale-95 disabled:opacity-50">Share</button>
            )}
            <button onClick={handleExport} className="text-xs font-mono px-2.5 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700/80 transition-all shadow-sm active:scale-95">Export</button>
          </div>
          {workspace.isPublic && (
            <p className="mt-1.5 text-[10px] font-mono text-emerald-400/80">Anyone with the link can view this workspace.</p>
          )}
          {shareUrl && <p className="mt-1.5 text-xs font-mono text-emerald-300 break-all">Link copied: {shareUrl}</p>}
        </div>
      )}

      <div className="space-y-1">
        {listLoading && <p className="text-xs text-neutral-500 font-mono">Loading...</p>}
        {workspaces.map(ws => (
          <div key={ws.id} className="flex items-center justify-between p-2 rounded-md hover:bg-neutral-800/60 border border-transparent hover:border-neutral-700/50 transition-colors group">
            <button onClick={() => handleLoad(ws)} className="text-xs font-mono text-neutral-300 hover:text-amber-300 text-left truncate flex-1 transition-colors">
              <span className="truncate block">{ws.title}</span>
              <span className="block text-[10px] text-neutral-500">{new Date(ws.updatedAt).toLocaleDateString()}</span>
            </button>
            {deleteConfirmId === ws.id ? (
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <button
                  type="button"
                  onClick={() => handleDelete(ws)}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-600 hover:bg-red-500 text-white font-semibold shadow-sm"
                  title="Confirm delete"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-1 py-0.5 rounded text-[10px] font-mono bg-neutral-700 hover:bg-neutral-600 text-neutral-300"
                  title="Cancel"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDeleteConfirmId(ws.id)}
                className="w-5 h-5 rounded-md flex items-center justify-center text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 opacity-0 group-hover:opacity-100 transition-all ml-1"
                title="Delete"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {!listLoading && workspaces.length === 0 && (
          <p className="text-xs text-neutral-500">No saved workspaces yet.</p>
        )}
      </div>
    </div>
  )
}
