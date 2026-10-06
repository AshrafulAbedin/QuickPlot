import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth'
import { useWorkspace } from './useWorkspace'
import { useWorkspaceList } from './useWorkspaceList'
import { downloadWorkspace, parseWorkspaceJson } from '../../lib/workspace-io'
import type { CreateWorkspaceInput, Workspace } from '@quickplot/types'

type GraphSnapshot = Pick<Workspace, 'equations' | 'viewport' | 'sliders' | 'theme'>

export function WorkspacePanel({ getSnapshot, onLoad }: {
  getSnapshot: () => GraphSnapshot
  onLoad: (workspace: Workspace) => void
}) {
  const { user } = useAuth()
  const { workspace, create, load, update, removeById, toggleSharing, loading, error } = useWorkspace()
  const { workspaces, fetchList, removeLocal, addLocal, loading: listLoading, error: listError } = useWorkspaceList()
  const [notice, setNotice] = useState<string | null>(null)
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
      ...getSnapshot(),
      shared: false,
    }
    const created = await create(input)
    if (created) {
      addLocal(created)
      setShareUrl(null)
      setNotice('Saved.')
    }
  }

  async function handleUpdate() {
    setNotice(null)
    if (await update(getSnapshot())) {
      setNotice('Saved.')
      await fetchList(user!.uid)
    }
  }

  async function handleLoad(ws: Workspace) {
    if (!window.confirm('Open this workspace? Unsaved graph changes will be replaced.')) return
    setNotice(null)
    setShareUrl(null)
    const loaded = await load(ws.id)
    if (loaded) {
      onLoad(loaded)
      setNotice('Loaded.')
    }
  }

  async function handleDelete(ws: Workspace) {
    if (!window.confirm(`Delete "${ws.title}"?`)) return
    removeLocal(ws.id)
    const ok = await removeById(ws.id)
    if (!ok) fetchList(user!.uid)
  }

  function shareUrlFor(shareId: string) {
    return `${window.location.origin}${import.meta.env.BASE_URL}?shared=${encodeURIComponent(shareId)}`
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
      if (created) {
        addLocal(created)
        setShareUrl(null)
        setNotice('Imported and saved. Open it from the list to load its graph.')
      }
    } catch (err) {
      window.alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <section className="plot-workspaces" aria-label="Saved workspaces">
      <div className="plot-workspace-heading">
        <h3>Workspaces</h3>
        <span className="plot-workspace-count">{workspaces.length}</span>
      </div>
      <div className="plot-workspace-actions">
          <button
            onClick={handleImportClick}
            disabled={loading}
            className="plot-workspace-button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Import
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="plot-workspace-button plot-workspace-primary"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
            Save new
          </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFile}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}
      {listError && <p role="alert" className="text-xs text-red-400">{listError}</p>}
      {notice && !error && <p role="status" className="text-xs text-green-300">{notice}</p>}

      {workspace && (
        <div className="plot-workspace-active">
          <p className="text-xs text-neutral-300">
            Active: <span className="text-amber-400">{workspace.title}</span>
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <button onClick={handleUpdate} disabled={loading} className="plot-workspace-button plot-workspace-primary">Save changes</button>
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
          <div key={ws.id} className="plot-workspace-row group">
            <button onClick={() => handleLoad(ws)} disabled={loading} className="text-xs text-neutral-300 hover:text-white text-left truncate flex-1">
              {ws.title}
              <span className="block text-[10px] text-neutral-500">{new Date(ws.updatedAt).toLocaleDateString()}</span>
            </button>
            <button onClick={() => handleDelete(ws)} disabled={loading} className="plot-workspace-delete" title={`Delete ${ws.title}`} aria-label={`Delete ${ws.title}`}>✕</button>
          </div>
        ))}
        {!listLoading && !listError && workspaces.length === 0 && (
          <div className="plot-workspace-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3V7Z" strokeLinejoin="round" /><path d="M9 13h6m-3-3v6" strokeLinecap="round" /></svg>
            <p>Your next idea starts here</p>
            <span>Save a graph to pick it up later.</span>
          </div>
        )}
      </div>
    </section>
  )
}
