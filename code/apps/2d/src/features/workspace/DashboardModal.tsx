import { useState, useRef, useMemo } from 'react';
import type { LocalWorkspace } from './useLocalWorkspaces';
import { STARTER_TEMPLATES } from './useLocalWorkspaces';
import type { EquationEntry } from '../equations/types';
import type { Slider } from '../sliders/SliderPanel';
import type { AuthUser } from '@quickplot/auth';

interface Props {
  open: boolean;
  onClose: () => void;
  workspaces: LocalWorkspace[];
  activeId: string | null;
  onSelect: (ws: LocalWorkspace) => void;
  onSaveCurrent: () => void;
  currentTitle: string;
  onNewGraph: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onExportAll: () => void;
  onImport: (jsonString: string) => { count: number; error?: string };
  onLoadTemplate: (template: {
    title: string;
    equations: EquationEntry[];
    sliders: Record<string, Slider>;
    themeName?: string;
  }) => void;
  user?: AuthUser | null;
  onOpenAuth?: () => void;
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function DashboardModal({
  open,
  onClose,
  workspaces,
  activeId,
  onSelect,
  onSaveCurrent,
  currentTitle,
  onNewGraph,
  onDelete,
  onDuplicate,
  onRename,
  onExportAll,
  onImport,
  onLoadTemplate,
  user,
  onOpenAuth,
}: Props) {
  const [tab, setTab] = useState<'saved' | 'templates'>('saved');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredWorkspaces = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((w) => {
      if (w.title.toLowerCase().includes(q)) return true;
      return w.equations.some((e) => e.expression.toLowerCase().includes(q));
    });
  }, [workspaces, search]);

  if (!open) return null;

  const handleStartRename = (ws: LocalWorkspace) => {
    setEditingId(ws.id);
    setEditTitle(ws.title);
  };

  const handleCommitRename = (id: string) => {
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const res = onImport(text);
      if (res.error) {
        setFeedback(`Import error: ${res.error}`);
      } else {
        setFeedback(`Imported ${res.count} workspace(s) successfully!`);
      }
      setTimeout(() => setFeedback(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#161412] border border-neutral-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#1d1b18]/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4v16h16" />
                <path d="M7 15c2-4 4-6 6-6s3 4 6-2" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-pixel text-amber-400 text-sm tracking-widest">MY WORKSPACES</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400">
                  {workspaces.length} saved
                </span>
              </div>
              <p className="text-xs font-mono text-neutral-400 mt-0.5">
                Saved graphs, custom templates, and workspace dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onNewGraph();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-b from-amber-400 to-amber-500 text-neutral-950 font-mono text-xs font-semibold hover:from-amber-300 hover:to-amber-400 transition-all shadow-sm shadow-amber-500/20 active:scale-95"
              title="Create a new blank graph"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>New Graph</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors text-sm"
              title="Close dashboard"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toolbar & Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-neutral-800/80 bg-neutral-900/60 shrink-0">
          <div className="flex items-center gap-1 bg-neutral-950/80 p-1 rounded-lg border border-neutral-800">
            <button
              onClick={() => setTab('saved')}
              className={[
                'px-3 py-1 rounded-md text-xs font-mono transition-all',
                tab === 'saved'
                  ? 'bg-neutral-800 text-amber-300 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200',
              ].join(' ')}
            >
              Saved Graphs ({workspaces.length})
            </button>
            <button
              onClick={() => setTab('templates')}
              className={[
                'px-3 py-1 rounded-md text-xs font-mono transition-all',
                tab === 'templates'
                  ? 'bg-neutral-800 text-amber-300 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200',
              ].join(' ')}
            >
              Templates ({STARTER_TEMPLATES.length})
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-xs ml-auto">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search graphs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-neutral-900 text-neutral-200 text-xs font-mono rounded-md pl-8 pr-3 py-1.5 border border-neutral-700/80 outline-none focus:border-amber-400 transition-all placeholder:text-neutral-500"
              />
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-amber-300 border border-neutral-700/70 text-xs font-mono transition-all active:scale-95 shadow-sm"
              title="Import workspaces from JSON backup"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Import</span>
            </button>
            <button
              onClick={onExportAll}
              disabled={workspaces.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-amber-300 border border-neutral-700/70 text-xs font-mono transition-all active:scale-95 shadow-sm disabled:opacity-40 disabled:pointer-events-none"
              title="Export all workspaces to JSON file"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2 text-xs font-mono text-amber-300 flex items-center justify-between">
            <span>{feedback}</span>
            <button onClick={() => setFeedback(null)} className="text-amber-400 hover:text-amber-200">✕</button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 min-h-[300px]">
          {tab === 'saved' ? (
            !user ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-sm">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current" strokeWidth="1.8">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                </div>
                <h3 className="font-mono text-sm font-semibold text-neutral-200 mb-1">
                  Sign in to view your saved graphs
                </h3>
                <p className="text-xs font-mono text-neutral-500 max-w-sm mb-5">
                  Graphs are saved directly to your account. Sign in or register to access and manage your private workspaces across devices.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAuth?.();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-gradient-to-b from-amber-400 to-amber-500 text-neutral-950 font-mono text-xs font-bold hover:from-amber-300 hover:to-amber-400 transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
                  >
                    <span>Sign in / Register</span>
                  </button>
                  <button
                    onClick={() => setTab('templates')}
                    className="px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-mono transition-all active:scale-95 cursor-pointer"
                  >
                    Explore Templates →
                  </button>
                </div>
              </div>
            ) : filteredWorkspaces.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredWorkspaces.map((ws) => {
                  const isActive = ws.id === activeId;
                  const isEditing = editingId === ws.id;
                  const sliderCount = Object.keys(ws.sliders || {}).length;

                  return (
                    <div
                      key={ws.id}
                      className={[
                        'group relative rounded-xl border p-4 transition-all flex flex-col justify-between',
                        isActive
                          ? 'bg-[#1e1b18] border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30'
                          : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/90 shadow-sm',
                      ].join(' ')}
                    >
                      <div>
                        {/* Title and Active indicator */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editTitle}
                              autoFocus
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={() => handleCommitRename(ws.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCommitRename(ws.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="flex-1 bg-neutral-800 text-neutral-100 text-sm font-semibold font-mono rounded px-2 py-0.5 border border-amber-400 outline-none"
                            />
                          ) : (
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <h3
                                onClick={() => handleStartRename(ws)}
                                className="font-mono text-sm font-semibold text-neutral-100 hover:text-amber-300 cursor-pointer truncate transition-colors flex items-center gap-1.5"
                                title="Click to rename"
                              >
                                {ws.title}
                                <svg viewBox="0 0 24 24" className="w-3 h-3 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                              </h3>
                              {isActive && (
                                <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  Active
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Metadata tags */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[11px] font-mono text-neutral-400">
                            {ws.equations.length} {ws.equations.length === 1 ? 'equation' : 'equations'}
                          </span>
                          {sliderCount > 0 && (
                            <>
                              <span className="text-neutral-600">•</span>
                              <span className="text-[11px] font-mono text-amber-400/90">
                                {sliderCount} {sliderCount === 1 ? 'slider' : 'sliders'}
                              </span>
                            </>
                          )}
                          <span className="text-neutral-600">•</span>
                          <span className="text-[11px] font-mono text-neutral-500">
                            {timeAgo(ws.updatedAt)}
                          </span>
                        </div>

                        {/* Equations preview pills */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {ws.equations.slice(0, 4).map((eq) => (
                            <span
                              key={eq.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-950/80 border border-neutral-800 text-[11px] font-mono text-neutral-300 max-w-[180px] truncate"
                              title={eq.expression}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: eq.color }}
                              />
                              <span className="truncate">{eq.expression || '(blank)'}</span>
                            </span>
                          ))}
                          {ws.equations.length > 4 && (
                            <span className="text-[10px] font-mono text-neutral-500 self-center">
                              {ws.equations.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80 mt-auto">
                        <button
                          onClick={() => {
                            onSelect(ws);
                            onClose();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-amber-300 border border-neutral-700/70 text-xs font-mono font-medium transition-all shadow-sm active:scale-95"
                        >
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          <span>Open Graph</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicate(ws.id);
                            }}
                            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                            title="Duplicate workspace"
                          >
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                          {confirmDeleteId === ws.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(ws.id);
                                  setConfirmDeleteId(null);
                                  setFeedback(`Deleted "${ws.title}"`);
                                  setTimeout(() => setFeedback(null), 2500);
                                }}
                                className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-[10px] font-mono font-bold transition-all active:scale-95"
                                title="Confirm deletion"
                              >
                                Delete?
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(null);
                                }}
                                className="p-1 rounded text-neutral-400 hover:text-neutral-200 text-xs"
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(ws.id);
                              }}
                              className="p-1.5 rounded-md text-neutral-500 hover:text-red-400 hover:bg-red-500/15 transition-colors active:scale-95"
                              title="Delete workspace"
                            >
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-neutral-800/80 border border-neutral-700/80 flex items-center justify-center text-neutral-500 mb-4">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <h3 className="font-mono text-sm font-semibold text-neutral-200 mb-1">
                  {search ? 'No matching workspaces found' : 'No saved graphs yet'}
                </h3>
                <p className="text-xs font-mono text-neutral-500 max-w-sm mb-5">
                  {search
                    ? `No workspaces matched "${search}". Try searching for something else.`
                    : 'Save your current work as a workspace or start exploring with starter templates.'}
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      onSaveCurrent();
                      setFeedback(`Saved "${currentTitle}" to your workspaces!`);
                      setTimeout(() => setFeedback(null), 3000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-gradient-to-b from-amber-400 to-amber-500 text-neutral-950 font-mono text-xs font-semibold hover:from-amber-300 hover:to-amber-400 transition-all shadow-sm shadow-amber-500/20 active:scale-95"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2.5">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    </svg>
                    <span>Save Current as "{currentTitle}"</span>
                  </button>

                  <button
                    onClick={() => setTab('templates')}
                    className="px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-mono transition-all active:scale-95"
                  >
                    Explore Templates →
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Templates tab */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {STARTER_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.title}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 flex flex-col justify-between hover:border-neutral-700 hover:bg-neutral-900/90 transition-all shadow-sm group"
                >
                  <div>
                    <h3 className="font-mono text-sm font-semibold text-neutral-100 group-hover:text-amber-300 transition-colors mb-2">
                      {tmpl.title}
                    </h3>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] font-mono text-neutral-400">
                        {tmpl.equations.length} {tmpl.equations.length === 1 ? 'equation' : 'equations'}
                      </span>
                      {Object.keys(tmpl.sliders).length > 0 && (
                        <>
                          <span className="text-neutral-600">•</span>
                          <span className="text-[11px] font-mono text-amber-400/90">
                            {Object.keys(tmpl.sliders).length} sliders
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {tmpl.equations.map((eq) => (
                        <span
                          key={eq.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-950/80 border border-neutral-800 text-[11px] font-mono text-neutral-300 max-w-[220px] truncate"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: eq.color }}
                          />
                          <span className="truncate">{eq.expression}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                      Preset Template
                    </span>
                    <button
                      onClick={() => {
                        onLoadTemplate(tmpl);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-mono font-medium transition-all shadow-sm active:scale-95"
                    >
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <span>Load Template</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-[#1d1b18]/60 flex items-center justify-between text-xs font-mono text-neutral-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span>Local Browser Storage Active</span>
          </div>
          <span>Tip: Press "Save" anytime to update your active graph.</span>
        </div>
      </div>
    </div>
  );
}
