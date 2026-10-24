import { useState, useMemo, useEffect, useRef } from 'react';
import type { LocalWorkspace3D } from './useLocalWorkspaces3D';
import { STARTER_TEMPLATES_3D } from './useLocalWorkspaces3D';
import type { Surface } from '../canvas-3d/Renderer3D';
import { useToast } from '../../components/toast';

import type { AuthUser } from '@quickplot/auth';

interface Props {
  open: boolean;
  onClose: () => void;
  workspaces: LocalWorkspace3D[];
  activeId: string | null;
  onSelect: (ws: LocalWorkspace3D) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onApplyTemplate: (tmpl: Omit<LocalWorkspace3D, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onExport: () => void;
  onImport: (json: string) => number;
  user?: AuthUser | null;
  onOpenAuth?: () => void;
}

export function DashboardModal3D({
  open,
  onClose,
  workspaces,
  activeId,
  onSelect,
  onDelete,
  onDuplicate,
  onRename,
  onApplyTemplate,
  onExport,
  onImport,
  user,
  onOpenAuth,
}: Props) {
  const toast = useToast();
  const [tab, setTab] = useState<'saved' | 'templates'>('saved');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const filteredWorkspaces = useMemo(() => {
    if (!search.trim()) return workspaces;
    const q = search.toLowerCase();
    return workspaces.filter(w =>
      w.title.toLowerCase().includes(q) ||
      w.surfaces.some(s => s.expr.toLowerCase().includes(q)),
    );
  }, [workspaces, search]);

  if (!open) return null;

  const handleStartRename = (ws: LocalWorkspace3D) => {
    setEditingId(ws.id);
    setEditTitle(ws.title);
  };

  const handleCommitRename = (id: string) => {
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
      toast.success(`Renamed to "${editTitle.trim()}"`);
    }
    setEditingId(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const count = onImport(text);
      if (count > 0) {
        setImportStatus(`Successfully imported ${count} graph(s)!`);
        toast.success(`Successfully imported ${count} 3D graph(s)!`);
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus('Invalid JSON format for 3D workspaces.');
        toast.error('Invalid JSON format for 3D workspaces.');
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl bg-neutral-900 border border-neutral-700/80 shadow-2xl flex flex-col ring-1 ring-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7L12 2.8Z" strokeLinejoin="round" />
                <path d="M12 21.2V11.6M12 11.6 20.5 7M12 11.6 3.5 7" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>My 3D Graphs</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 font-mono">
                  {workspaces.length}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Manage, export, and explore saved 3D surface workspaces
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Close dashboard"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher + Search */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800/80 bg-neutral-900/60 shrink-0 gap-4">
          <div className="flex rounded-lg bg-neutral-800/80 p-1 border border-neutral-700/60">
            <button
              onClick={() => setTab('saved')}
              className={[
                'px-3 py-1 text-xs font-mono rounded-md transition-all flex items-center gap-1.5',
                tab === 'saved'
                  ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200',
              ].join(' ')}
            >
              <span>Saved Graphs</span>
              <span className="text-[10px] opacity-70">({workspaces.length})</span>
            </button>
            <button
              onClick={() => setTab('templates')}
              className={[
                'px-3 py-1 text-xs font-mono rounded-md transition-all flex items-center gap-1.5',
                tab === 'templates'
                  ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200',
              ].join(' ')}
            >
              <span>3D Templates</span>
              <span className="text-[10px] opacity-70">({STARTER_TEMPLATES_3D.length})</span>
            </button>
          </div>

          {tab === 'saved' && (
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search 3D graphs…"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 focus:border-amber-400 text-white text-xs outline-none transition-colors placeholder:text-neutral-500"
              />
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {importStatus && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
              {importStatus}
            </div>
          )}

          {tab === 'saved' ? (
            !user ? (
              <div className="text-center py-12 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/40">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current" strokeWidth="1.8">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                </div>
                <p className="text-neutral-200 text-sm font-semibold mb-1">
                  Sign in to view your 3D saved graphs
                </p>
                <p className="text-neutral-500 text-xs max-w-sm mx-auto mb-4">
                  Graphs are saved directly to your account. Sign in or register to access and manage your private 3D workspaces across devices.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAuth?.();
                    }}
                    className="px-4 py-2 rounded-lg bg-gradient-to-b from-amber-400 to-amber-500 text-neutral-950 font-bold text-xs font-mono transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
                  >
                    Sign in / Register
                  </button>
                  <button
                    onClick={() => setTab('templates')}
                    className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono transition-all active:scale-95 cursor-pointer"
                  >
                    Explore 3D Templates →
                  </button>
                </div>
              </div>
            ) : filteredWorkspaces.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/40">
                <div className="w-12 h-12 rounded-full bg-neutral-800/80 text-neutral-500 flex items-center justify-center mx-auto mb-3">
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7L12 2.8Z" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-neutral-300 text-sm font-semibold mb-1">
                  {search ? 'No matching 3D graphs found' : 'No saved 3D graphs yet'}
                </p>
                <p className="text-neutral-500 text-xs max-w-sm mx-auto mb-4">
                  {search
                    ? 'Try adjusting your search query.'
                    : 'Save your current 3D surfaces using the Save button in the topbar, or load one of our starter 3D templates.'}
                </p>
                {!search && (
                  <button
                    onClick={() => setTab('templates')}
                    className="px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono transition-all active:scale-95"
                  >
                    Explore 3D Templates →
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredWorkspaces.map((ws) => {
                  const isActive = ws.id === activeId;
                  const isEditing = editingId === ws.id;
                  return (
                    <div
                      key={ws.id}
                      className={[
                        'p-4 rounded-xl border transition-all flex flex-col justify-between group',
                        isActive
                          ? 'border-amber-500/70 bg-gradient-to-br from-amber-500/10 to-neutral-900 ring-1 ring-amber-500/30'
                          : 'border-neutral-800 bg-neutral-850/60 hover:bg-neutral-800/80 hover:border-neutral-700',
                      ].join(' ')}
                    >
                      <div>
                        {/* Title and rename */}
                        <div className="flex items-center justify-between mb-1.5">
                          {isEditing ? (
                            <div className="flex items-center gap-1 flex-1 mr-2">
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCommitRename(ws.id);
                                  else if (e.key === 'Escape') setEditingId(null);
                                }}
                                autoFocus
                                className="w-full px-2 py-0.5 rounded bg-neutral-900 border border-amber-400 text-white text-xs font-semibold outline-none"
                              />
                              <button
                                onClick={() => handleCommitRename(ws.id)}
                                className="px-2 py-0.5 rounded bg-amber-500 text-neutral-950 font-bold text-xs"
                              >
                                ✓
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <h3
                                onClick={() => { onSelect(ws); onClose(); }}
                                className="text-sm font-semibold text-neutral-200 hover:text-amber-300 cursor-pointer truncate transition-colors"
                                title="Click to load"
                              >
                                {ws.title}
                              </h3>
                              {isActive && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                  active
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => handleStartRename(ws)}
                              title="Rename"
                              className="w-6 h-6 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/60 text-xs"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => {
                                onDuplicate(ws.id);
                                toast.success(`Duplicated "${ws.title}"`);
                              }}
                              title="Duplicate"
                              className="w-6 h-6 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/60 text-xs"
                            >
                              ⧉
                            </button>
                            <button
                              onClick={() => {
                                onDelete(ws.id);
                                toast.info(`Deleted "${ws.title}"`);
                              }}
                              title="Delete"
                              className="w-6 h-6 rounded flex items-center justify-center text-neutral-400 hover:text-red-400 hover:bg-red-500/10 text-xs transition-colors"
                            >
                              🗑
                            </button>
                          </div>
                        </div>

                        {/* Surfaces preview */}
                        <div className="space-y-1 my-2.5">
                          {ws.surfaces.slice(0, 3).map((s: Surface, i: number) => (
                            <div key={i} className="flex items-center gap-1.5 text-[11px] font-mono">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color ?? '#4A9EE0' }} />
                              <span className="text-neutral-300 truncate">z = {s.expr || '0'}</span>
                            </div>
                          ))}
                          {ws.surfaces.length > 3 && (
                            <p className="text-[10px] text-neutral-500 font-mono">
                              +{ws.surfaces.length - 3} more surface(s)
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Footer info & Load button */}
                      <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 mt-2">
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {new Date(ws.updatedAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => { onSelect(ws); onClose(); }}
                          className="px-3 py-1 rounded-md bg-neutral-800 hover:bg-amber-500/20 text-neutral-300 hover:text-amber-300 border border-neutral-700 hover:border-amber-400/50 text-xs font-mono transition-all active:scale-95 flex items-center gap-1"
                        >
                          <span>Open</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {STARTER_TEMPLATES_3D.map((tmpl, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-neutral-800 bg-neutral-850/60 hover:border-amber-400/40 hover:bg-neutral-800/60 transition-all flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-200 mb-1.5">
                      {tmpl.title}
                    </h3>
                    <div className="space-y-1 my-2">
                      {tmpl.surfaces.map((s, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] font-mono">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                          <span className="text-neutral-300 truncate">z = {s.expr}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 mt-3">
                    <span className="text-[10px] font-mono text-neutral-500">
                      {tmpl.wireframe ? 'Wireframe' : 'Solid'} · {tmpl.themeName}
                    </span>
                    <button
                      onClick={() => {
                        onApplyTemplate(tmpl);
                        toast.info(`Loaded template "${tmpl.title}"`);
                        onClose();
                      }}
                      className="px-3 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono transition-all active:scale-95"
                    >
                      Use Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-800 bg-neutral-900/90 shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="sr-only"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 text-xs font-mono text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded border border-neutral-700/80 transition-colors flex items-center gap-1.5"
            >
              <span>↑ Import JSON</span>
            </button>
            <button
              onClick={() => {
                onExport();
                toast.success(`Exported ${workspaces.length} 3D workspace(s)`);
              }}
              disabled={workspaces.length === 0}
              className="px-2.5 py-1 text-xs font-mono text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded border border-neutral-700/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <span>↓ Export All</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-mono transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
