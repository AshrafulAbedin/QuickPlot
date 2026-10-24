import { useState, useRef, useCallback, useEffect } from 'react';
import { Renderer3D, type Renderer3DHandle } from './features/canvas-3d/Renderer3D';
import type { Surface, PointDataset } from './features/canvas-3d/Renderer3D';
import {
  validate3DExpression,
  evaluate3D,
  parseJsonData3D, parseCsvData3D, boundsOf,
  type DataPoint3D,
} from '@quickplot/core-3d';
import { useToast } from './components/toast';
import { SurfaceRow } from './features/canvas-3d/SurfaceRow';
import { ThemePicker } from './features/theme/ThemePicker';
import { HelpPanel } from './features/help/HelpPanel';
import {
  DEFAULT_SURFACE_THEME,
  PLOT_BOUND,
  SURFACE_THEMES,
  type SurfaceTheme,
} from '@quickplot/renderer-3d';
import {
  WorkspaceTitle,
  DEFAULT_WORKSPACE_NAME_3D,
  WORKSPACE_NAME_STORAGE_KEY_3D,
  DashboardModal3D,
  useLocalWorkspaces3D,
  type LocalWorkspace3D,
} from './features/workspace';
import { AuthButton } from './features/auth/AuthButton';
import { useAuth } from '@quickplot/auth';
import { Calculator, type CalcCorner } from './features/calculator/Calculator';
import { useFocusedInput } from './features/calculator/useFocusedInput';
import { useCustomToolbar3D, type ToolId3D } from './features/toolbar/useCustomToolbar3D';

const PALETTE = [
  '#EF4444', '#3B82F6', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#6366F1',
];

const DEFAULT_SURFACES: Surface[] = [];

// ── URL hash codec ────────────────────────────────────────────────────────
interface HashSurface { e: string; c?: string; h?: boolean }
interface HashPayload3D {
  surfaces: HashSurface[];
  name?: string;
  wireframe?: boolean;
  theme?: string;
}

function encodeHash(surfaces: Surface[], name?: string, wireframe?: boolean, theme?: string): string {
  const payload: HashPayload3D = {
    surfaces: surfaces.map(s => ({ e: s.expr, c: s.color, h: s.hidden })),
    name,
    wireframe,
    theme,
  };
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

function loadFromHash(): { surfaces: Surface[]; name?: string; wireframe?: boolean; theme?: string } | null {
  try {
    const h = window.location.hash.slice(1);
    if (!h) return null;
    const raw = JSON.parse(decodeURIComponent(atob(h)));
    if (Array.isArray(raw)) {
      return {
        surfaces: raw.map((d, i) => ({
          type: 'cartesian' as const,
          expr: d.e ?? '',
          color: d.c ?? PALETTE[i % PALETTE.length],
          hidden: d.h ?? false,
        })),
      };
    }
    if (raw && typeof raw === 'object' && Array.isArray(raw.surfaces)) {
      return {
        surfaces: raw.surfaces.map((d: any, i: number) => ({
          type: 'cartesian' as const,
          expr: d.e ?? '',
          color: d.c ?? PALETTE[i % PALETTE.length],
          hidden: d.h ?? false,
        })),
        name: raw.name,
        wireframe: raw.wireframe,
        theme: raw.theme,
      };
    }
    return null;
  } catch { return null; }
}

const _fromHash = loadFromHash();

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function get2DUrl(): string {
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      return 'http://localhost:5174/2d/';
    }
  }
  const envUrl = import.meta.env.VITE_URL_2D;
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl;
  }
  return '/2d/';
}

function loadStoredName3D(): string {
  try {
    return window.localStorage.getItem(WORKSPACE_NAME_STORAGE_KEY_3D) || DEFAULT_WORKSPACE_NAME_3D;
  } catch {
    return DEFAULT_WORKSPACE_NAME_3D;
  }
}

const CORNER_TOGGLE_CLASSES: Record<CalcCorner, string> = {
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
};

export default function App() {
  const canvasHandle = useRef<Renderer3DHandle>(null);
  const toast = useToast();

  const [surfaces, setSurfaces]           = useState<Surface[]>(_fromHash?.surfaces ?? DEFAULT_SURFACES);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [flash, setFlash]                 = useState<'image' | 'link' | null>(null);
  const [theme, setTheme]                 = useState<SurfaceTheme>(() => {
    if (_fromHash?.theme && SURFACE_THEMES[_fromHash.theme.toLowerCase()]) {
      return SURFACE_THEMES[_fromHash.theme.toLowerCase()];
    }
    return DEFAULT_SURFACE_THEME;
  });
  const [showThemePick, setShowThemePick] = useState(false);
  const [showHelp, setShowHelp]           = useState(false);
  const [wireframe, setWireframe]         = useState(_fromHash?.wireframe ?? false);
  const [showAxes, setShowAxes]           = useState(true);
  const [datasets, setDatasets]           = useState<PointDataset[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalPrompt, setAuthModalPrompt] = useState<string | undefined>(undefined);
  const [pendingSave, setPendingSave] = useState(false);

  // ── Workspaces & Dashboard ────────────────────────────────────────────────
  const [workspaceName, setWorkspaceName] = useState<string>(
    () => _fromHash?.name?.trim() || loadStoredName3D(),
  );
  const [saveFlash, setSaveFlash] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    saveWorkspace: saveLocalWs,
    deleteWorkspace: deleteLocalWs,
    duplicateWorkspace: duplicateLocalWs,
    renameWorkspace: renameLocalWs,
    exportAllWorkspaces,
    importWorkspaces,
  } = useLocalWorkspaces3D(user);

  useEffect(() => {
    try { window.localStorage.setItem(WORKSPACE_NAME_STORAGE_KEY_3D, workspaceName); }
    catch { /* ignore */ }
    document.title = `${workspaceName || DEFAULT_WORKSPACE_NAME_3D} | QuickPlot 3D`;
  }, [workspaceName]);

  // Proactively check for 3D surfaces with empty domain / non-real evaluation
  const warnedSurfacesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    surfaces.forEach(s => {
      const trimmed = s.expr.trim();
      if (!trimmed || s.hidden) return;
      if (warnedSurfacesRef.current.has(trimmed)) return;

      const err = validate3DExpression(trimmed);
      if (err) return;

      const fn = evaluate3D(trimmed);
      if (!fn) return;

      let hasReal = false;
      const step = PLOT_BOUND / 4;
      for (let x = -PLOT_BOUND; x <= PLOT_BOUND; x += step) {
        for (let y = -PLOT_BOUND; y <= PLOT_BOUND; y += step) {
          const z = fn(x, y);
          if (typeof z === 'number' && Number.isFinite(z) && !Number.isNaN(z)) {
            hasReal = true;
            break;
          }
        }
        if (hasReal) break;
      }
      if (!hasReal) {
        warnedSurfacesRef.current.add(trimmed);
        toast.warning(`'z = ${trimmed}' has no real values within plot bounds`);
      }
    });
  }, [surfaces, toast]);

  const copyLink = useCallback(async () => {
    const hash = encodeHash(surfaces, workspaceName, wireframe, theme.name);
    window.history.replaceState(null, '', `#${hash}`);
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Shareable 3D link copied to clipboard');
    } catch {
      window.prompt('Copy this share link:', url);
    }
    setFlash('link');
    setTimeout(() => setFlash(null), 1800);
  }, [surfaces, workspaceName, wireframe, theme, toast]);

  const saveWorkspace = useCallback(async () => {
    if (!user) {
      setPendingSave(true);
      setAuthModalPrompt('Sign in or register to save 3D graphs to your account');
      setShowAuthModal(true);
      return;
    }
    saveLocalWs(workspaceName, surfaces, { wireframe, showAxes, themeName: theme.name });
    await copyLink();
    toast.success(`Saved workspace "${workspaceName}"`);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1400);
  }, [user, workspaceName, surfaces, wireframe, showAxes, theme, saveLocalWs, copyLink, toast]);

  useEffect(() => {
    if (user && pendingSave) {
      setPendingSave(false);
      saveLocalWs(workspaceName, surfaces, { wireframe, showAxes, themeName: theme.name });
      void copyLink();
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1400);
    }
  }, [user, pendingSave, saveLocalWs, workspaceName, surfaces, wireframe, showAxes, theme, copyLink]);

  const handleClearGraph = useCallback(() => {
    setActiveWorkspaceId(null);
    setWorkspaceName(DEFAULT_WORKSPACE_NAME_3D);
    setSurfaces([
      { type: 'cartesian', expr: '', color: PALETTE[0] },
    ]);
    setDatasets([]);
    window.history.replaceState(null, '', window.location.pathname);
    toast.info('Workspace reset to blank state');
  }, [setActiveWorkspaceId, toast]);

  const handleSelectWorkspace = useCallback((ws: LocalWorkspace3D) => {
    setActiveWorkspaceId(ws.id);
    setWorkspaceName(ws.title);
    setSurfaces(ws.surfaces);
    if (ws.wireframe !== undefined) setWireframe(ws.wireframe);
    if (ws.showAxes !== undefined) setShowAxes(ws.showAxes);
    if (ws.themeName) {
      const match = Object.values(SURFACE_THEMES).find(t => t.name.toLowerCase() === ws.themeName?.toLowerCase());
      if (match) setTheme(match);
    }
  }, [setActiveWorkspaceId]);

  const handleApplyTemplate = useCallback((tmpl: Omit<LocalWorkspace3D, 'id' | 'createdAt' | 'updatedAt'>) => {
    setActiveWorkspaceId(null);
    setWorkspaceName(tmpl.title);
    setSurfaces(tmpl.surfaces);
    if (tmpl.wireframe !== undefined) setWireframe(tmpl.wireframe);
    if (tmpl.showAxes !== undefined) setShowAxes(tmpl.showAxes);
    if (tmpl.themeName) {
      const match = Object.values(SURFACE_THEMES).find(t => t.name.toLowerCase() === tmpl.themeName?.toLowerCase());
      if (match) setTheme(match);
    }
  }, [setActiveWorkspaceId]);

  // ── Sidebar Resizing (enforcing min 280px width) ─────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('qp_sidebar_width_3d');
      if (saved) {
        const parsed = Number(saved);
        if (Number.isFinite(parsed) && parsed >= 280 && parsed <= 600) return parsed;
      }
    } catch { /* ignore */ }
    return 300;
  });
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);

  useEffect(() => {
    if (!isDraggingSidebar) return;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(280, Math.min(600, window.innerWidth - e.clientX));
      setSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      setIsDraggingSidebar(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingSidebar]);

  useEffect(() => {
    try {
      localStorage.setItem('qp_sidebar_width_3d', String(sidebarWidth));
    } catch { /* ignore */ }
  }, [sidebarWidth]);

  // ── On-Screen Math Calculator ───────────────────────────────────────────
  const focusedInput = useFocusedInput();
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [calcCorner, setCalcCorner] = useState<CalcCorner>(() => {
    try {
      const saved = localStorage.getItem('qp_calc_corner_3d');
      if (saved && ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(saved)) {
        return saved as CalcCorner;
      }
    } catch { /* ignore */ }
    return 'bottom-left';
  });

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingCalcIcon, setIsDraggingCalcIcon] = useState(false);
  const [calcIconDragPos, setCalcIconDragPos] = useState<{ x: number; y: number } | null>(null);
  const calcDragRef = useRef<{
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    hasMoved: boolean;
    pointerId: number;
  } | null>(null);

  // ── Surface Operations ──────────────────────────────────────────────────
  const addSurface = (expr = '') => {
    setSurfaces(prev => [
      ...prev,
      { type: 'cartesian', expr, color: PALETTE[prev.length % PALETTE.length] },
    ]);
  };

  const removeSurface = (i: number) => setSurfaces(prev => prev.filter((_, idx) => idx !== i));
  const updateSurface = (i: number, patch: Partial<Surface>) => {
    setSurfaces(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  };

  // ── File upload (JSON + CSV) ────────────────────────────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      let pts: DataPoint3D[] = [];
      try {
        if (file.name.endsWith('.csv') || file.name.endsWith('.tsv')) {
          pts = parseCsvData3D(text);
        } else {
          pts = parseJsonData3D(JSON.parse(text));
        }
      } catch {
        pts = parseCsvData3D(text);
      }
      if (!pts.length) {
        toast.error('No valid (x, y, z) data found. CSV requires 3 numeric columns; JSON requires triples or {x, y, z} arrays.');
        return;
      }
      setDatasets(prev => [
        ...prev,
        { name: file.name, color: PALETTE[(prev.length + 3) % PALETTE.length], points: pts },
      ]);
      toast.success(`Imported ${pts.length} 3D data points from "${file.name}"`);
    };
    reader.onerror = () => {
      toast.error(`Failed to read file "${file.name}"`);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [toast]);

  const removeDataset = (i: number) => {
    setDatasets(prev => {
      const target = prev[i];
      if (target) toast.info(`Removed dataset "${target.name}"`);
      return prev.filter((_, idx) => idx !== i);
    });
  };
  const toggleDataset = (i: number) =>
    setDatasets(prev => prev.map((d, idx) => idx === i ? { ...d, hidden: !d.hidden } : d));

  const brief = (t: 'image' | 'link') => { setFlash(t); setTimeout(() => setFlash(null), 1800); };

  const copyImage = useCallback(async () => {
    try {
      await canvasHandle.current?.copyImage();
      toast.success('3D canvas image copied to clipboard');
      brief('image');
    } catch {
      toast.error('Failed to copy 3D image to clipboard');
    }
  }, [toast]);

  const {
    topbarTools,
    sidebarTools,
    activeDragTool,
    setActiveDragTool,
    dropIndicator,
    setDropIndicator,
    moveOrReorderTool,
    resetToolbarLayout,
  } = useCustomToolbar3D();

  const renderTool = (tool: ToolId3D, location: 'topbar' | 'sidebar') => {
    if (tool === 'help') {
      if (location === 'topbar') {
        return (
          <div className="relative">
            <button
              title="Help & 3D shortcuts"
              onClick={() => setShowHelp(v => !v)}
              className={[
                'w-7 h-7 rounded-md transition-all border shadow-sm active:scale-95 cursor-pointer font-pixel text-xs flex items-center justify-center',
                showHelp
                  ? 'bg-neutral-700 text-amber-300 border-neutral-600'
                  : 'bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/60 hover:border-amber-400/40 text-neutral-400 hover:text-amber-300',
              ].join(' ')}
            >
              ?
            </button>
            {showHelp && (
              <HelpPanel
                onInsert={expr => addSurface(expr)}
                onClose={() => setShowHelp(false)}
              />
            )}
          </div>
        );
      }
      return (
        <div className="px-3 pt-2.5 pb-2 border-t border-[#161412] relative w-full">
          <div className="flex items-center justify-between mb-2">
            <p className="font-pixel text-neutral-400 text-xs tracking-widest">HELP & SHORTCUTS</p>
            <button
              onClick={() => setShowHelp(v => !v)}
              className="text-neutral-500 hover:text-amber-400 text-[10px] font-pixel cursor-pointer"
            >
              {showHelp ? '▲ HIDE' : '▼ SHOW'}
            </button>
          </div>
          {showHelp && (
            <div className="mt-2">
              <HelpPanel
                onInsert={expr => addSurface(expr)}
                onClose={() => setShowHelp(false)}
              />
            </div>
          )}
        </div>
      );
    }

    if (tool === 'wireframe') {
      if (location === 'topbar') {
        return (
          <button
            title="Toggle wireframe rendering"
            onClick={() => setWireframe(v => !v)}
            className={[
              'flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-md transition-all border shadow-sm active:scale-95 cursor-pointer',
              wireframe
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/50 shadow-amber-500/10'
                : 'bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-400 hover:text-neutral-200 border-neutral-700/60 hover:border-neutral-500',
            ].join(' ')}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                wireframe ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]' : 'bg-neutral-500'
              }`}
            />
            <span>wireframe</span>
          </button>
        );
      }
      return (
        <div className="px-3 pt-2.5 pb-2 border-t border-[#161412] w-full">
          <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2">WIREFRAME</p>
          <button
            onClick={() => setWireframe(v => !v)}
            className={[
              'w-full flex items-center justify-between px-3 py-2 rounded-md font-mono text-xs transition-all border shadow-sm active:scale-95 cursor-pointer',
              wireframe
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/50 shadow-amber-500/10'
                : 'bg-gradient-to-b from-neutral-800 to-neutral-800/90 hover:from-neutral-700 hover:to-neutral-700/90 text-neutral-300 hover:text-white border-neutral-700/80 hover:border-amber-400/40',
            ].join(' ')}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full transition-colors ${
                  wireframe ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]' : 'bg-neutral-500'
                }`}
              />
              <span>Wireframe Mesh</span>
            </div>
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                wireframe ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]' : 'bg-neutral-600'
              }`}
            />
          </button>
        </div>
      );
    }

    if (tool === 'axes') {
      if (location === 'topbar') {
        return (
          <button
            title="Toggle X / Y / Z axes"
            onClick={() => setShowAxes(v => !v)}
            className={[
              'flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-md transition-all border shadow-sm active:scale-95 cursor-pointer',
              showAxes
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/50 shadow-amber-500/10'
                : 'bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-400 hover:text-neutral-200 border-neutral-700/60 hover:border-neutral-500',
            ].join(' ')}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                showAxes ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]' : 'bg-neutral-500'
              }`}
            />
            <span>axes</span>
          </button>
        );
      }
      return (
        <div className="px-3 pt-2.5 pb-2 border-t border-[#161412] w-full">
          <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2">AXES</p>
          <button
            onClick={() => setShowAxes(v => !v)}
            className={[
              'w-full flex items-center justify-between px-3 py-2 rounded-md font-mono text-xs transition-all border shadow-sm active:scale-95 cursor-pointer',
              showAxes
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/50 shadow-amber-500/10'
                : 'bg-gradient-to-b from-neutral-800 to-neutral-800/90 hover:from-neutral-700 hover:to-neutral-700/90 text-neutral-300 hover:text-white border-neutral-700/80 hover:border-amber-400/40',
            ].join(' ')}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full transition-colors ${
                  showAxes ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]' : 'bg-neutral-500'
                }`}
              />
              <span>Coordinate Axes</span>
            </div>
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                showAxes ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]' : 'bg-neutral-600'
              }`}
            />
          </button>
        </div>
      );
    }

    if (tool === 'themes') {
      if (location === 'topbar') {
        return (
          <div className="relative">
            <button
              title="Change scene theme"
              onClick={() => setShowThemePick(v => !v)}
              className={[
                'flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-md transition-all border shadow-sm active:scale-95 cursor-pointer',
                showThemePick
                  ? 'bg-neutral-700 text-amber-300 border-neutral-600'
                  : 'bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-400 hover:text-neutral-200 border-neutral-700/60 hover:border-neutral-500',
              ].join(' ')}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full border border-white/20 shadow-sm"
                style={{ background: theme.background }}
              />
              <span>Themes</span>
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current opacity-60" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showThemePick && (
              <ThemePicker
                current={theme}
                onChange={setTheme}
                onClose={() => setShowThemePick(false)}
              />
            )}
          </div>
        );
      }
      return (
        <div className="px-3 pt-2.5 pb-2 border-t border-[#161412] relative w-full">
          <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2">SCENE THEME</p>
          <button
            onClick={() => setShowThemePick(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-gradient-to-b from-neutral-800 to-neutral-800/90 hover:from-neutral-700 hover:to-neutral-700/90 border border-neutral-700/80 hover:border-amber-400/40 text-neutral-200 hover:text-amber-300 text-xs font-mono transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full border border-white/20 shadow-sm"
                style={{ background: theme.background }}
              />
              <span>{theme.name} Theme</span>
            </div>
            <span className="text-neutral-500 text-xs">▼</span>
          </button>
          {showThemePick && (
            <div className="mt-2">
              <ThemePicker
                current={theme}
                onChange={setTheme}
                onClose={() => setShowThemePick(false)}
              />
            </div>
          )}
        </div>
      );
    }

    if (tool === '2d') {
      if (location === 'topbar') {
        return (
          <a
            title="Switch to 2D Grapher"
            href={get2DUrl()}
            className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-md bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/60 hover:border-amber-400/40 text-neutral-400 hover:text-amber-300 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true" focusable="false">
              <path d="M4 20V4M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M4 15c3 0 3.5-7 6.5-7S14 17 17 17s3-5 3-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span>2D</span>
          </a>
        );
      }
      return (
        <div className="px-3 pt-2.5 pb-2 border-t border-[#161412] w-full">
          <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2">2D GRAPHING</p>
          <a
            href={get2DUrl()}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-gradient-to-b from-neutral-800 to-neutral-800/90 hover:from-neutral-700 hover:to-neutral-700/90 border border-neutral-700/80 hover:border-amber-400/40 text-neutral-300 hover:text-amber-300 text-xs font-mono transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true" focusable="false">
                <path d="M4 20V4M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M4 15c3 0 3.5-7 6.5-7S14 17 17 17s3-5 3-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <span>Switch to 2D Grapher</span>
            </div>
            <span className="text-neutral-500 text-xs">→</span>
          </a>
        </div>
      );
    }

    if (tool === 'reset') {
      if (location === 'topbar') {
        return (
          <button
            title="Reset 3D camera"
            onClick={() => canvasHandle.current?.resetView()}
            className="w-7 h-7 rounded-md bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/60 hover:border-neutral-500 text-neutral-400 hover:text-amber-300 flex items-center justify-center transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H4a1 1 0 0 1-1-1V9.5z" />
            </svg>
          </button>
        );
      }
      return (
        <div className="px-3 pt-2.5 pb-2 border-t border-[#161412] w-full">
          <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2">RESET CAMERA</p>
          <button
            onClick={() => canvasHandle.current?.resetView()}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-gradient-to-b from-neutral-800 to-neutral-800/90 hover:from-neutral-700 hover:to-neutral-700/90 border border-neutral-700/80 hover:border-amber-400/40 text-neutral-200 hover:text-amber-300 text-xs font-mono transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H4a1 1 0 0 1-1-1V9.5z" />
              </svg>
              <span>Reset Camera Position</span>
            </div>
          </button>
        </div>
      );
    }

    if (tool === 'clear') {
      if (location === 'topbar') {
        return (
          <button
            title="Clear all surfaces & datasets / New Graph"
            onClick={handleClearGraph}
            className="flex items-center gap-1 font-mono text-xs px-2.5 py-1 rounded-md bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/60 hover:border-red-500/40 text-neutral-400 hover:text-red-300 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>Clear</span>
          </button>
        );
      }
      return (
        <div className="px-3 pt-2.5 pb-2 border-t border-[#161412] w-full">
          <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2">CLEAR GRAPH</p>
          <button
            onClick={handleClearGraph}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-gradient-to-b from-neutral-800 to-neutral-800/90 hover:from-neutral-700 hover:to-neutral-700/90 border border-neutral-700/80 hover:border-red-500/40 text-neutral-200 hover:text-red-300 text-xs font-mono transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Clear All Surfaces</span>
            </div>
          </button>
        </div>
      );
    }

    if (tool === 'data') {
      if (location === 'topbar') {
        return (
          <button
            title="Upload 3D Data JSON/CSV"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-md bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/60 hover:border-amber-400/40 text-neutral-400 hover:text-amber-300 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Import</span>
          </button>
        );
      }
      return (
        <div className="px-3 pt-2.5 pb-2 border-t border-[#161412] w-full">
          <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2">DATA IMPORT</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-gradient-to-b from-neutral-800 to-neutral-800/90 hover:from-neutral-700 hover:to-neutral-700/90 border border-neutral-700/80 hover:border-amber-400/40 text-neutral-300 hover:text-amber-300 text-xs font-mono transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Upload JSON / CSV</span>
            </div>
          </button>
        </div>
      );
    }

    if (tool === 'share') {
      if (location === 'topbar') {
        return (
          <div className="flex items-center gap-1.5">
            <button
              title="Copy 3D screenshot"
              onClick={copyImage}
              className={[
                'flex items-center gap-1 font-mono text-xs px-2 py-1 rounded-md transition-all border shadow-sm active:scale-95 cursor-pointer',
                flash === 'image'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-500/10'
                  : 'bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-400 hover:text-amber-300 border-neutral-700/60 hover:border-amber-400/40',
              ].join(' ')}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>{flash === 'image' ? 'Copied!' : 'Image'}</span>
            </button>
            <button
              title="Copy 3D share link"
              onClick={copyLink}
              className={[
                'flex items-center gap-1 font-mono text-xs px-2 py-1 rounded-md transition-all border shadow-sm active:scale-95 cursor-pointer',
                flash === 'link'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-500/10'
                  : 'bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-400 hover:text-amber-300 border-neutral-700/60 hover:border-amber-400/40',
              ].join(' ')}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span>{flash === 'link' ? 'Copied!' : 'Link'}</span>
            </button>
          </div>
        );
      }
      return (
        <div className="px-3 pt-2.5 pb-2 border-t border-[#161412] w-full">
          <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2">SHARE</p>
          <div className="flex gap-2">
            <button
              onClick={copyImage}
              className={[
                'flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-mono transition-all border shadow-sm active:scale-95 cursor-pointer',
                flash === 'image'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-500/10'
                  : 'bg-gradient-to-b from-neutral-800 to-neutral-800/90 hover:from-neutral-700 hover:to-neutral-700/90 text-neutral-200 hover:text-amber-300 border-neutral-700/80 hover:border-amber-400/40',
              ].join(' ')}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>{flash === 'image' ? 'Copied!' : 'Image'}</span>
            </button>
            <button
              onClick={copyLink}
              className={[
                'flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-mono transition-all border shadow-sm active:scale-95 cursor-pointer',
                flash === 'link'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-500/10'
                  : 'bg-gradient-to-b from-neutral-800 to-neutral-800/90 hover:from-neutral-700 hover:to-neutral-700/90 text-neutral-200 hover:text-amber-300 border-neutral-700/80 hover:border-amber-400/40',
              ].join(' ')}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span>{flash === 'link' ? 'Copied!' : 'Link'}</span>
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderToolItem = (tool: ToolId3D, index: number, location: 'topbar' | 'sidebar') => {
    return (
      <div
        key={`${location}-${tool}-${index}`}
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', `tool:${tool}`);
          e.dataTransfer.effectAllowed = 'move';
          setActiveDragTool({ toolId: tool, fromZone: location });
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
          const rect = e.currentTarget.getBoundingClientRect();
          if (location === 'topbar') {
            const isAfter = (e.clientX - rect.left) > (rect.width / 2);
            setDropIndicator({ zone: 'topbar', index: isAfter ? index + 1 : index });
          } else {
            const isAfter = (e.clientY - rect.top) > (rect.height / 2);
            setDropIndicator({ zone: 'sidebar', index: isAfter ? index + 1 : index });
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDropIndicator(null);
          const data = e.dataTransfer.getData('text/plain');
          if (data.startsWith('tool:')) {
            const toolToMove = data.slice(5) as ToolId3D;
            const rect = e.currentTarget.getBoundingClientRect();
            if (location === 'topbar') {
              const isAfter = (e.clientX - rect.left) > (rect.width / 2);
              const targetIndex = isAfter ? index + 1 : index;
              moveOrReorderTool(toolToMove, activeDragTool?.fromZone || 'topbar', 'topbar', targetIndex);
            } else {
              const isAfter = (e.clientY - rect.top) > (rect.height / 2);
              const targetIndex = isAfter ? index + 1 : index;
              moveOrReorderTool(toolToMove, activeDragTool?.fromZone || 'sidebar', 'sidebar', targetIndex);
            }
          }
          setActiveDragTool(null);
        }}
        onDragEnd={() => {
          setDropIndicator(null);
          setActiveDragTool(null);
        }}
        className={[
          'relative group/tool flex items-center select-none',
          location === 'topbar' ? 'cursor-grab active:cursor-grabbing' : 'w-full cursor-grab active:cursor-grabbing',
        ].join(' ')}
      >
        {/* Insertion indicators */}
        {location === 'topbar' && dropIndicator?.zone === 'topbar' && dropIndicator.index === index && (
          <div className="absolute -left-1 top-0.5 bottom-0.5 w-1 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] z-30 pointer-events-none" />
        )}
        {location === 'sidebar' && dropIndicator?.zone === 'sidebar' && dropIndicator.index === index && (
          <div className="absolute left-3 right-3 -top-1 h-1 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] z-30 pointer-events-none" />
        )}

        {renderTool(tool, location)}

        {location === 'topbar' && dropIndicator?.zone === 'topbar' && dropIndicator.index === topbarTools.length && index === topbarTools.length - 1 && (
          <div className="absolute -right-1 top-0.5 bottom-0.5 w-1 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] z-30 pointer-events-none" />
        )}
        {location === 'sidebar' && dropIndicator?.zone === 'sidebar' && dropIndicator.index === sidebarTools.length && index === sidebarTools.length - 1 && (
          <div className="absolute left-3 right-3 -bottom-1 h-1 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] z-30 pointer-events-none" />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 select-none">
      {/* ── header ── */}
      <header className="flex items-center gap-3 px-4 py-3 bg-neutral-800 border-b border-[#161412] shrink-0">
        <span className="font-pixel text-amber-400 text-sm tracking-widest">QuickPlot</span>
        <span className="font-pixel text-neutral-500 text-sm">/&nbsp;3D</span>
        <span className="text-neutral-600 shrink-0">|</span>

        {/* Workspace Title & Quick Save */}
        <WorkspaceTitle
          name={workspaceName}
          onChange={setWorkspaceName}
          onSave={saveWorkspace}
          saveFlash={saveFlash}
        />

        {/* My Graphs / Workspaces Dashboard */}
        <button
          title="Open My 3D Graphs & Workspaces Dashboard"
          onClick={() => setShowDashboard(true)}
          className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-md bg-neutral-800/90 hover:bg-neutral-700/90 border border-neutral-700/70 hover:border-amber-400/50 text-neutral-300 hover:text-amber-300 transition-all shadow-sm active:scale-95 shrink-0"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span>My Graphs</span>
          {workspaces.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {workspaces.length}
            </span>
          )}
        </button>

        {/* Topbar Dock Zone (Draggable & Reorderable Tools) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDropIndicator({ zone: 'topbar', index: topbarTools.length });
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDropIndicator(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDropIndicator(null);
            const data = e.dataTransfer.getData('text/plain');
            if (data.startsWith('tool:')) {
              const tool = data.slice(5) as ToolId3D;
              moveOrReorderTool(tool, activeDragTool?.fromZone || 'topbar', 'topbar', topbarTools.length);
            }
            setActiveDragTool(null);
          }}
          className={[
            'ml-auto flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all',
            dropIndicator?.zone === 'topbar' ? 'bg-amber-400/5 ring-1 ring-amber-400/30' : '',
          ].join(' ')}
          title="Topbar Tools (Drag to reorder or move to sidebar)"
        >
          {topbarTools.map((t, idx) => renderToolItem(t, idx, 'topbar'))}
          <button
            onClick={resetToolbarLayout}
            title="Reset topbar & sidebar layout to default"
            className="w-6 h-6 rounded-md hover:bg-neutral-700/60 text-neutral-500 hover:text-amber-300 flex items-center justify-center transition-colors text-xs font-mono shrink-0 ml-1"
          >
            ↺
          </button>
          <AuthButton
            externalModalOpen={showAuthModal}
            onExternalModalClose={() => {
              setShowAuthModal(false);
              setPendingSave(false);
              setAuthModalPrompt(undefined);
            }}
            externalModalPrompt={authModalPrompt}
          />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ── 3D canvas container ── */}
        <div
          ref={canvasContainerRef}
          className={`flex-1 min-w-0 relative select-none ${isDraggingSidebar ? 'pointer-events-none' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            const data = e.dataTransfer.getData('text/plain');
            if (data === 'calc-corner-drag') {
              const rect = e.currentTarget.getBoundingClientRect();
              const isLeft = (e.clientX - rect.left) < (rect.width / 2);
              const isTop = (e.clientY - rect.top) < (rect.height / 2);
              const newCorner: CalcCorner = `${isTop ? 'top' : 'bottom'}-${isLeft ? 'left' : 'right'}` as CalcCorner;
              setCalcCorner(newCorner);
              try { localStorage.setItem('qp_calc_corner_3d', newCorner); } catch { /* ignore */ }
            }
          }}
        >
          <Renderer3D
            ref={canvasHandle}
            surfaces={surfaces.filter(s => !s.hidden)}
            datasets={datasets}
            theme={theme}
            wireframe={wireframe}
            showAxes={showAxes}
          />

          {/* on-screen keyboard toggle (draggable to any corner) */}
          <button
            title="Drag to place in any corner • Click to toggle math keyboard"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              const target = e.currentTarget;
              try { target.setPointerCapture(e.pointerId); } catch { /* ignore */ }
              const rect = target.getBoundingClientRect();
              const parentRect = canvasContainerRef.current?.getBoundingClientRect();
              if (!parentRect) return;

              calcDragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                offsetX: e.clientX - rect.left,
                offsetY: e.clientY - rect.top,
                hasMoved: false,
                pointerId: e.pointerId,
              };
            }}
            onPointerMove={(e) => {
              if (!calcDragRef.current || calcDragRef.current.pointerId !== e.pointerId) return;
              const dx = e.clientX - calcDragRef.current.startX;
              const dy = e.clientY - calcDragRef.current.startY;
              if (!calcDragRef.current.hasMoved && Math.hypot(dx, dy) > 5) {
                calcDragRef.current.hasMoved = true;
                setIsDraggingCalcIcon(true);
              }

              if (calcDragRef.current.hasMoved) {
                const parent = canvasContainerRef.current;
                if (!parent) return;
                const parentRect = parent.getBoundingClientRect();
                const x = Math.max(12, Math.min(parentRect.width - 52, e.clientX - parentRect.left - calcDragRef.current.offsetX));
                const y = Math.max(12, Math.min(parentRect.height - 52, e.clientY - parentRect.top - calcDragRef.current.offsetY));
                setCalcIconDragPos({ x, y });
              }
            }}
            onPointerUp={(e) => {
              if (!calcDragRef.current || calcDragRef.current.pointerId !== e.pointerId) return;
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }

              const hasMoved = calcDragRef.current.hasMoved;
              calcDragRef.current = null;
              setIsDraggingCalcIcon(false);
              setCalcIconDragPos(null);

              if (!hasMoved) {
                setShowKeyboard(v => !v);
              } else {
                const parent = canvasContainerRef.current;
                if (parent) {
                  const parentRect = parent.getBoundingClientRect();
                  const isLeft = (e.clientX - parentRect.left) < (parentRect.width / 2);
                  const isTop = (e.clientY - parentRect.top) < (parentRect.height / 2);
                  const newCorner: CalcCorner = `${isTop ? 'top' : 'bottom'}-${isLeft ? 'left' : 'right'}` as CalcCorner;
                  setCalcCorner(newCorner);
                  try { localStorage.setItem('qp_calc_corner_3d', newCorner); } catch { /* ignore */ }
                }
              }
            }}
            onPointerCancel={() => {
              calcDragRef.current = null;
              setIsDraggingCalcIcon(false);
              setCalcIconDragPos(null);
            }}
            style={calcIconDragPos ? { left: `${calcIconDragPos.x}px`, top: `${calcIconDragPos.y}px` } : undefined}
            className={[
              'absolute z-30 w-11 h-11 rounded-xl border backdrop-blur-md shadow-lg',
              'flex items-center justify-center select-none touch-none',
              isDraggingCalcIcon
                ? 'cursor-grabbing scale-110 shadow-2xl ring-2 ring-amber-400 z-40 bg-amber-500/30 text-amber-200 border-amber-400'
                : 'cursor-grab active:cursor-grabbing transition-all active:scale-95',
              calcIconDragPos ? '' : CORNER_TOGGLE_CLASSES[calcCorner],
              showKeyboard && !isDraggingCalcIcon
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/20 ring-2 ring-amber-500/20'
                : !isDraggingCalcIcon
                ? 'bg-neutral-900/90 text-neutral-300 hover:text-amber-300 border-neutral-700/80 hover:border-amber-400/40 hover:bg-neutral-800'
                : '',
            ].filter(Boolean).join(' ')}
            aria-pressed={showKeyboard}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 pointer-events-none" fill="none" aria-hidden="true" focusable="false">
              <rect x="2.5" y="6" width="19" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 14h.01M9 14h.01M18 14h.01M12 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <Calculator
            open={showKeyboard}
            onClose={() => setShowKeyboard(false)}
            onInsert={(t) => { focusedInput.insertToken(t); }}
            onBackspace={() => { focusedInput.backspace(); }}
            onMoveCaret={(d) => { focusedInput.moveCaret(d); }}
            corner={calcCorner}
          />
        </div>

        {/* ── resizable sidebar ── */}
        <aside
          style={{ width: `${sidebarWidth}px` }}
          className="relative shrink-0 bg-neutral-800 border-l border-[#161412] flex flex-col transition-[width] duration-75 select-none"
        >
          {/* Drag handle to resize sidebar */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDraggingSidebar(true);
            }}
            className={[
              'absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-col-resize z-30 group flex items-center justify-center',
              isDraggingSidebar ? 'bg-amber-400/40' : 'hover:bg-amber-400/30',
            ].join(' ')}
            title="Drag to resize sidebar width"
          >
            <div className="w-0.5 h-8 bg-neutral-600 group-hover:bg-amber-400 transition-colors rounded-full" />
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,.tsv,.txt"
            className="sr-only"
            onChange={handleFileUpload}
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDropIndicator({ zone: 'sidebar', index: sidebarTools.length });
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDropIndicator(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDropIndicator(null);
              const data = e.dataTransfer.getData('text/plain');
              if (data.startsWith('tool:')) {
                const tool = data.slice(5) as ToolId3D;
                moveOrReorderTool(tool, activeDragTool?.fromZone || 'topbar', 'sidebar', sidebarTools.length);
              }
              setActiveDragTool(null);
            }}
            className="flex-1 flex flex-col min-h-0 overflow-y-auto"
          >
            {/* Surfaces section */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-pixel text-neutral-400 text-xs tracking-widest">SURFACES</p>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {surfaces.length} active
                </span>
              </div>

              <div className="space-y-0.5">
                {surfaces.map((s, i) => (
                  <SurfaceRow
                    key={i}
                    surface={s}
                    autoFocus={i === surfaces.length - 1 && s.expr === ''}
                    error={s.expr.trim() ? validate3DExpression(s.expr) : null}
                    onChange={patch => updateSurface(i, patch)}
                    onDelete={() => removeSurface(i)}
                    registerInput={focusedInput.bind}
                  />
                ))}
              </div>

              {surfaces.length === 0 && (
                <p className="text-neutral-500 text-[10px] font-mono leading-relaxed my-2 p-2 rounded bg-neutral-900/40 border border-neutral-800">
                  Nothing plotted yet. Add a surface and type an
                  <span className="text-neutral-400"> f(x, y)</span>, or open
                  <span className="text-amber-400/80"> Help</span> for examples.
                </p>
              )}

              <div className="mt-3">
                <button
                  onClick={() => addSurface()}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-gradient-to-b from-neutral-800 to-neutral-800/90 hover:from-neutral-700 hover:to-neutral-700/90 border border-neutral-700/80 hover:border-amber-400/40 text-neutral-200 hover:text-amber-300 text-xs font-mono transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <span>Add Surface</span>
                </button>
              </div>
            </div>

            {/* Datasets section (when datasets are loaded) */}
            {datasets.length > 0 && (
              <div className="px-3 pt-2 pb-3 border-t border-[#161412]">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-pixel text-neutral-400 text-xs tracking-widest">DATASETS</p>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {datasets.length} dataset(s)
                  </span>
                </div>

                <div className="space-y-1.5 mb-2.5">
                  {datasets.map((d, i) => {
                    const b = boundsOf(d.points);
                    return (
                      <div
                        key={`${d.name}-${i}`}
                        className="rounded-md border border-neutral-700/80 bg-neutral-900/60 p-2 shadow-sm"
                      >
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleDataset(i)}
                            title={d.hidden ? 'Show dataset' : 'Hide dataset'}
                            className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0 transition-transform hover:scale-125"
                            style={{ background: d.hidden ? 'transparent' : d.color }}
                          />
                          <span
                            className="font-mono text-[10px] text-neutral-300 truncate flex-1 font-semibold"
                            title={d.name}
                          >
                            {d.name}
                          </span>
                          <button
                            onClick={() => removeDataset(i)}
                            title="Remove dataset"
                            className="w-4 h-4 rounded flex items-center justify-center text-neutral-500 hover:text-red-400 hover:bg-red-500/10 text-xs transition-colors shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="font-mono text-[9px] text-neutral-500 mt-1 leading-relaxed">
                          {d.points.length} pts
                          {b && (
                            <>
                              <br />
                              x {fmt(b.min.x)}…{fmt(b.max.x)} · y {fmt(b.min.y)}…{fmt(b.max.y)}
                              <br />
                              z {fmt(b.min.z)}…{fmt(b.max.z)}
                            </>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sidebar Docked Tools — each tool renders as its own section with its own header */}
            <div
              className={[
                'flex flex-col min-h-[40px] transition-all',
                dropIndicator?.zone === 'sidebar' ? 'bg-amber-400/5 ring-1 ring-amber-400/30' : '',
              ].join(' ')}
            >
              {sidebarTools.map((tool, index) => renderToolItem(tool, index, 'sidebar'))}
            </div>
          </div>
        </aside>
      </div>

      {/* ── 3D Dashboard Modal ── */}
      <DashboardModal3D
        open={showDashboard}
        onClose={() => setShowDashboard(false)}
        workspaces={workspaces}
        activeId={activeWorkspaceId}
        onSelect={handleSelectWorkspace}
        onDelete={deleteLocalWs}
        onDuplicate={duplicateLocalWs}
        onRename={renameLocalWs}
        onApplyTemplate={handleApplyTemplate}
        onExport={exportAllWorkspaces}
        onImport={importWorkspaces}
        user={user}
        onOpenAuth={() => {
          setAuthModalPrompt('Sign in or register to view your saved graphs');
          setShowAuthModal(true);
        }}
      />
    </div>
  );
}
