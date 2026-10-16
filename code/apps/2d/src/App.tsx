import {
  useState, useMemo, useRef, useCallback, useEffect,
} from 'react';
import {
  validateExpression,
  findRoots, findExtrema, findIntersections,
  parseWithScope,
  parseJsonData, parseCsvData,
  detectParameters,
} from '@quickplot/core';
import {
  Canvas2D, type Canvas2DHandle,
} from './features/canvas-2d';
import { useTraceAnimation } from './features/canvas-2d/useTraceAnimation';
import { EquationRow } from './features/equations/EquationRow';
import type { EquationType } from './features/equations/types';
import { useEquations, toCurve, uid } from './features/equations/useEquations';
import { SliderPanel } from './features/sliders/SliderPanel';
import type { Slider } from './features/sliders/SliderPanel';
import { useSliders } from './features/sliders/useSliders';
import { ThemePicker } from './features/theme/ThemePicker';
import {
  WorkspaceTitle,
  DEFAULT_WORKSPACE_NAME,
  WORKSPACE_NAME_STORAGE_KEY,
  DashboardModal,
  useLocalWorkspaces,
} from './features/workspace';
import { Calculator, type CalcCorner } from './features/calculator/Calculator';
import { useFocusedInput } from './features/calculator/useFocusedInput';
import { AuthButton } from './features/auth/AuthButton';
import { useAuth } from '@quickplot/auth';
import type { PlotCurve, SpecialPoint, CanvasTheme } from '@quickplot/renderer';
import { DEFAULT_THEME, THEMES } from '@quickplot/renderer';

import { useCustomToolbar2D, type ToolId2D } from './features/toolbar/useCustomToolbar';

export type DockableTool = ToolId2D;

const CORNER_TOGGLE_CLASSES: Record<CalcCorner, string> = {
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
};

function get3DUrl(): string {
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      return 'http://localhost:5175/3d/';
    }
  }
  const envUrl = import.meta.env.VITE_URL_3D;
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl;
  }
  return '/3d/';
}

// ── URL hash codec ────────────────────────────────────────────────────────
interface HashPayload {
  eqs: Array<{ e: string; ey?: string; t: EquationType; c: string; v: boolean; mn: number; mx: number }>;
  // `sp` (animation speed) is optional so links shared before it existed still load.
  sliders?: Record<string, { value: number; min: number; max: number; step: number; sp?: number }>;
  // `name` is optional so pre-title share links still load.
  name?: string;
}

const PALETTE = [
  '#E05252', '#4A9EE0', '#52C77C', '#E0A030',
  '#B860D0', '#E07850', '#50C8D0', '#A8C020',
  '#F06090', '#70D060',
];

function encodeHash(
  eqs: ReturnType<typeof useEquations>['equations'],
  sliders: Record<string, Slider>,
  name: string,
): string {
  const payload: HashPayload = {
    eqs: eqs
      .filter(e => e.type !== 'points')
      .map(e => ({ e: e.expression, ey: e.expressionY, t: e.type, c: e.color, v: e.visible, mn: e.tMin, mx: e.tMax })),
    sliders: Object.fromEntries(
      Object.values(sliders).map(s => [
        s.name,
        { value: s.value, min: s.min, max: s.max, step: s.step, sp: s.speed ?? 1 },
      ]),
    ),
    name,
  };
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

function loadFromHash(): {
  equations: ReturnType<typeof useEquations>['equations'];
  sliders: Record<string, Slider>;
  name?: string;
} | null {
  try {
    const h = window.location.hash.slice(1);
    if (!h) return null;
    const raw = JSON.parse(decodeURIComponent(atob(h)));
    const payload: HashPayload = Array.isArray(raw) ? { eqs: raw } : raw as HashPayload;

    const equations = payload.eqs.map((d, i) => ({
      id: uid(),
      type: d.t ?? 'cartesian' as EquationType,
      expression: d.e ?? '',
      expressionY: d.ey,
      tMin: d.mn ?? 0,
      tMax: d.mx ?? (Math.PI * 2),
      color: d.c ?? PALETTE[i % PALETTE.length],
      visible: d.v !== false,
      error: validateExpression(d.e ?? ''),
    }));

    const sliders: Record<string, Slider> = {};
    if (payload.sliders) {
      for (const [name, s] of Object.entries(payload.sliders)) {
        sliders[name] = { name, value: s.value, min: s.min, max: s.max, step: s.step, speed: s.sp ?? 1 };
      }
    }
    return { equations, sliders, name: payload.name };
  } catch { return null; }
}

function loadStoredName(): string {
  try {
    const stored = window.localStorage.getItem(WORKSPACE_NAME_STORAGE_KEY);
    if (stored && stored.trim()) return stored;
  } catch { /* localStorage unavailable */ }
  return DEFAULT_WORKSPACE_NAME;
}

// ── App ───────────────────────────────────────────────────────────────────
const _fromHash = loadFromHash();
const DEFAULTS: ReturnType<typeof useEquations>['equations'] = [];

export default function App() {
  const canvasHandle = useRef<Canvas2DHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { equations, setEquations, update, add, remove, addPoints } = useEquations(_fromHash?.equations ?? DEFAULTS);
  const {
    sliders, setSliders, sliderScope, animating,
    onChange: sliderChange, onRangeChange: sliderRangeChange,
    onStepChange: sliderStepChange,
    onSpeedChange: sliderSpeedChange,
    onLoopModeChange: sliderLoopModeChange,
    toggleAnimation,
  } = useSliders(equations, _fromHash?.sliders);
  const { activeTraces, traceSnap, startTrace } = useTraceAnimation();

  const { user } = useAuth();
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
  } = useLocalWorkspaces(user);

  const [showDashboard, setShowDashboard] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalPrompt, setAuthModalPrompt] = useState<string | undefined>(undefined);
  const [pendingSave, setPendingSave] = useState(false);
  const [showSpecial,   setShowSpecial]   = useState(false);
  const [flash,         setFlash]         = useState<'image' | 'link' | null>(null);
  const [theme,         setTheme]         = useState<CanvasTheme>(DEFAULT_THEME);
  const [showThemePick, setShowThemePick] = useState(false);
  const [ptX,           setPtX]           = useState('');
  const [ptY,           setPtY]           = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [saveFlash,     setSaveFlash]     = useState(false);
  const [showKeyboard,  setShowKeyboard]  = useState(false);

  const [calcCorner, setCalcCorner] = useState<CalcCorner>(() => {
    try {
      const saved = localStorage.getItem('qp_calc_corner');
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

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('qp_sidebar_width');
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
      localStorage.setItem('qp_sidebar_width', String(sidebarWidth));
    } catch { /* ignore */ }
  }, [sidebarWidth]);

  const {
    topbarTools,
    sidebarTools,
    activeDragTool,
    setActiveDragTool,
    dropIndicator,
    setDropIndicator,
    moveOrReorderTool,
    resetToolbarLayout,
  } = useCustomToolbar2D();

  const [workspaceName, setWorkspaceName] = useState<string>(
    () => _fromHash?.name?.trim() || loadStoredName(),
  );

  const focusedInput = useFocusedInput();

  useEffect(() => {
    try { window.localStorage.setItem(WORKSPACE_NAME_STORAGE_KEY, workspaceName); }
    catch { /* localStorage unavailable */ }
    document.title = `${workspaceName || DEFAULT_WORKSPACE_NAME} | QuickPlot 2D`;
  }, [workspaceName]);

  const paramsByEq = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const union = new Set<string>();
    equations.forEach(eq => {
      const set = new Set<string>([
        ...detectParameters(eq.expression),
        ...(eq.expressionY ? detectParameters(eq.expressionY) : []),
      ]);
      set.forEach(p => union.add(p));
      map.set(eq.id, set);
    });
    return { byEq: map, union };
  }, [equations]);
  const inlineSliderNames = paramsByEq.union;

  // ── derive PlotCurves ───────────────────────────────────────────────────
  const curves = useMemo<PlotCurve[]>(() =>
    equations.flatMap(eq => {
      const c = toCurve(eq, sliderScope);
      const result: PlotCurve[] = [];

      if (c) {
        const progress = activeTraces.has(eq.id) ? (traceSnap[eq.id] ?? 0) : undefined;
        result.push(progress !== undefined ? { ...c, progress } : c);
      }

      // Derivative overlay for cartesian equations
      if (eq.type === 'cartesian' && eq.showDerivative && eq.visible && !eq.error && eq.expression.trim()) {
        try {
          const h = 1e-5;
          const fn = parseWithScope(eq.expression);
          result.push({
            kind: 'cartesian',
            fn: (x) => {
              const fwd = fn({ ...sliderScope, x: x + h });
              const bwd = fn({ ...sliderScope, x: x - h });
              return (fwd - bwd) / (2 * h);
            },
            color: eq.color,
            dashed: true,
            lineWidth: 1.5,
            label: `${eq.expression}'`,
          });
        } catch { /* skip */ }
      }

      return result;
    }),
    [equations, sliderScope, traceSnap, activeTraces],
  );

  // ── derive SpecialPoints ────────────────────────────────────────────────
  const specialPoints = useMemo<SpecialPoint[]>(() => {
    if (!showSpecial) return [];
    const RANGE = 25;
    const pts: SpecialPoint[] = [];
    const cartesian = equations.filter(
      eq => eq.visible && eq.type === 'cartesian' && !eq.error && eq.expression.trim(),
    );
    // Compile each expression once. Building the evaluator inside the sampling
    // callback would re-parse it on every one of the thousands of probes the
    // root/extremum search makes.
    const compiled = cartesian.map(eq => {
      try {
        const f = parseWithScope(eq.expression);
        return { eq, fn: (x: number) => f({ ...sliderScope, x }) };
      } catch { return null; }
    }).filter((c): c is { eq: typeof cartesian[number]; fn: (x: number) => number } => c !== null);

    for (const { eq, fn } of compiled) {
      try {
        findRoots(fn, -RANGE, RANGE).forEach(p => pts.push({ ...p, kind: 'root', color: eq.color }));
        findExtrema(fn, -RANGE, RANGE).forEach(p => pts.push({ ...p, kind: 'extremum', color: eq.color }));
      } catch { /* skip */ }
    }
    for (let i = 0; i < compiled.length; i++) {
      for (let j = i + 1; j < compiled.length; j++) {
        try {
          findIntersections(compiled[i].fn, compiled[j].fn, -RANGE, RANGE).forEach(p =>
            pts.push({ ...p, kind: 'intersection', color: '#ffffff' }),
          );
        } catch { /* skip */ }
      }
    }
    return pts;
  }, [showSpecial, equations, sliderScope]);

  // ── manual point input ──────────────────────────────────────────────────
  const addManualPoint = useCallback(() => {
    const x = parseFloat(ptX);
    const y = parseFloat(ptY);
    if (!isFinite(x) || !isFinite(y)) return;
    addPoints([{ x, y }], '__manual__');
    setPtX(''); setPtY('');
  }, [ptX, ptY, addPoints]);

  // ── file upload (JSON + CSV) ────────────────────────────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      let pts: Array<{ x: number; y: number }> = [];
      try {
        if (file.name.endsWith('.csv') || file.name.endsWith('.tsv')) {
          pts = parseCsvData(text);
        } else {
          pts = parseJsonData(JSON.parse(text));
        }
      } catch {
        pts = parseCsvData(text);
      }
      if (!pts.length) { alert('No valid x, y pairs found in the file.'); return; }
      addPoints(pts, file.name);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [addPoints]);

  // ── share actions ───────────────────────────────────────────────────────
  const brief = (t: 'image' | 'link') => { setFlash(t); setTimeout(() => setFlash(null), 1800); };

  const copyImage = useCallback(async () => {
    await canvasHandle.current?.copyImage(); brief('image');
  }, []);

  const copyLink = useCallback(async () => {
    const hash = encodeHash(equations, sliders, workspaceName);
    window.history.replaceState(null, '', `#${hash}`);
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    try { await navigator.clipboard.writeText(url); }
    catch { window.prompt('Copy this share link:', url); }
    brief('link');
  }, [equations, sliders, workspaceName]);

  const saveWorkspace = useCallback(async () => {
    if (!user) {
      setPendingSave(true);
      setAuthModalPrompt('Sign in or register to save graphs to your account');
      setShowAuthModal(true);
      return;
    }
    saveLocalWs({
      title: workspaceName,
      equations,
      sliders,
      themeName: theme.name,
    });
    await copyLink();
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1800);
  }, [user, saveLocalWs, workspaceName, equations, sliders, theme.name, copyLink]);

  // Execute pending save as soon as user signs in or registers
  useEffect(() => {
    if (user && pendingSave) {
      setPendingSave(false);
      saveLocalWs({
        title: workspaceName,
        equations,
        sliders,
        themeName: theme.name,
      });
      void copyLink();
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1800);
    }
  }, [user, pendingSave, saveLocalWs, workspaceName, equations, sliders, theme.name, copyLink]);

  const handleLoadWorkspace = useCallback((ws: {
    id?: string;
    title: string;
    equations: typeof equations;
    sliders: Record<string, Slider>;
    themeName?: string;
  }) => {
    if (ws.id) setActiveWorkspaceId(ws.id);
    setWorkspaceName(ws.title);
    setEquations(ws.equations);
    setSliders(ws.sliders || {});
    if (ws.themeName && THEMES[ws.themeName]) {
      setTheme(THEMES[ws.themeName]);
    }
    const hash = encodeHash(ws.equations, ws.sliders || {}, ws.title);
    window.history.replaceState(null, '', `#${hash}`);
  }, [setActiveWorkspaceId, setEquations, setSliders]);

  const handleNewGraph = useCallback(() => {
    setActiveWorkspaceId(null);
    setWorkspaceName(DEFAULT_WORKSPACE_NAME);
    setEquations([
      {
        id: uid(),
        type: 'cartesian',
        expression: '',
        tMin: 0,
        tMax: Math.PI * 2,
        color: PALETTE[0],
        visible: true,
        error: null,
      },
    ]);
    setSliders({});
    window.history.replaceState(null, '', window.location.pathname);
  }, [setActiveWorkspaceId, setEquations, setSliders]);

  const renderTool = (tool: DockableTool, location: 'topbar' | 'sidebar') => {
    if (tool === 'help') {
      if (location === 'topbar') {
        return (
          <div className="relative">
            <button
              title="Help & keyboard shortcuts"
              onClick={() => setShowShortcuts(v => !v)}
              className={[
                'w-7 h-7 rounded-md transition-all border shadow-sm active:scale-95 cursor-pointer font-pixel text-xs flex items-center justify-center',
                showShortcuts
                  ? 'bg-neutral-700 text-amber-300 border-neutral-600'
                  : 'bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/60 hover:border-amber-400/40 text-neutral-400 hover:text-amber-300',
              ].join(' ')}
            >
              ?
            </button>
            {showShortcuts && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-md border border-neutral-700 bg-neutral-900/95 backdrop-blur-md shadow-2xl p-2.5 z-50">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-800">
                  <span className="font-pixel text-[10px] text-amber-400 tracking-wider">SHORTCUTS</span>
                  <button onClick={() => setShowShortcuts(false)} className="text-neutral-500 hover:text-neutral-300 text-xs cursor-pointer">✕</button>
                </div>
                {([
                  ['Drag',        'Pan canvas'],
                  ['Scroll',      'Zoom in / out'],
                  ['Dbl-click',   'Reset view'],
                  ['← → ↑ ↓',    'Pan (keyboard)'],
                  ['+ / -',       'Zoom in / out'],
                ] as [string, string][]).map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between py-1 text-[10px] border-b border-neutral-800/50 last:border-none">
                    <span className="font-pixel text-amber-400/90">{key}</span>
                    <span className="font-mono text-neutral-300">{desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      return (
        <div className="px-3 pt-2.5 pb-2 border-t border-[#161412] w-full">
          <div className="flex items-center justify-between mb-2">
            <p className="font-pixel text-neutral-400 text-xs tracking-widest">HELP & SHORTCUTS</p>
            <button
              onClick={() => setShowShortcuts(v => !v)}
              className="text-neutral-500 hover:text-amber-400 text-[10px] font-pixel cursor-pointer"
            >
              {showShortcuts ? '▲ HIDE' : '▼ SHOW'}
            </button>
          </div>
          {showShortcuts && (
            <div className="rounded-md border border-neutral-800 bg-neutral-900/80 overflow-hidden shadow-inner">
              {([
                ['Drag',        'Pan canvas'],
                ['Scroll',      'Zoom in / out'],
                ['Dbl-click',   'Reset view'],
                ['← → ↑ ↓',    'Pan (keyboard)'],
                ['+ / -',       'Zoom in / out'],
              ] as [string, string][]).map(([key, desc], i, arr) => (
                <div
                  key={key}
                  className={[
                    'flex items-center justify-between px-2.5 py-1.5 text-[10px]',
                    i < arr.length - 1 ? 'border-b border-[#161412]/60' : '',
                  ].join(' ')}
                >
                  <span className="font-pixel text-amber-400/90">{key}</span>
                  <span className="font-mono text-neutral-300">{desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (tool === 'special-pts') {
      if (location === 'topbar') {
        return (
          <button
            title="Toggle roots, extrema & intersections"
            onClick={() => setShowSpecial(v => !v)}
            className={[
              'flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-md transition-all border shadow-sm active:scale-95 cursor-pointer',
              showSpecial
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/50 shadow-amber-500/10'
                : 'bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-400 hover:text-neutral-200 border-neutral-700/60 hover:border-neutral-500',
            ].join(' ')}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                showSpecial ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]' : 'bg-neutral-500'
              }`}
            />
            <span>special pts</span>
          </button>
        );
      }
      return (
        <div className="px-3 pt-2.5 pb-2 border-t border-[#161412] w-full">
          <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2">SPECIAL POINTS</p>
          <button
            onClick={() => setShowSpecial(v => !v)}
            className={[
              'w-full flex items-center justify-between px-3 py-2 rounded-md font-mono text-xs transition-all border shadow-sm active:scale-95 cursor-pointer',
              showSpecial
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/50 shadow-amber-500/10'
                : 'bg-gradient-to-b from-neutral-800 to-neutral-800/90 hover:from-neutral-700 hover:to-neutral-700/90 text-neutral-300 hover:text-white border-neutral-700/80 hover:border-amber-400/40',
            ].join(' ')}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full transition-colors ${
                  showSpecial ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]' : 'bg-neutral-500'
                }`}
              />
              <span>Roots, Extrema & Intersections</span>
            </div>
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                showSpecial ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]' : 'bg-neutral-600'
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
              title="Change canvas theme"
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
                style={{ background: theme.bg }}
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
          <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2">CANVAS THEME</p>
          <button
            onClick={() => setShowThemePick(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-gradient-to-b from-neutral-800 to-neutral-800/90 hover:from-neutral-700 hover:to-neutral-700/90 border border-neutral-700/80 hover:border-amber-400/40 text-neutral-200 hover:text-amber-300 text-xs font-mono transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full border border-white/20 shadow-sm"
                style={{ background: theme.bg }}
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

    if (tool === '3d') {
      if (location === 'topbar') {
        return (
          <a
            title="Switch to 3D mode"
            href={get3DUrl()}
            className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-md bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/60 hover:border-amber-400/40 text-neutral-400 hover:text-amber-300 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden focusable="false">
              <path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7L12 2.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M12 21.2V11.6M12 11.6 20.5 7M12 11.6 3.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
            <span>3D</span>
          </a>
        );
      }
      return (
        <div className="px-3 pt-2.5 pb-2 border-t border-[#161412] w-full">
          <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2">3D GRAPHING</p>
          <a
            href={get3DUrl()}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-gradient-to-b from-neutral-800 to-neutral-800/90 hover:from-neutral-700 hover:to-neutral-700/90 border border-neutral-700/80 hover:border-amber-400/40 text-neutral-300 hover:text-amber-300 text-xs font-mono transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden focusable="false">
                <path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7L12 2.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M12 21.2V11.6M12 11.6 20.5 7M12 11.6 3.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
              <span>Switch to 3D Mode</span>
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
            title="Reset view (or double-click canvas)"
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
          <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2">RESET VIEW</p>
          <button
            onClick={() => canvasHandle.current?.resetView()}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-gradient-to-b from-neutral-800 to-neutral-800/90 hover:from-neutral-700 hover:to-neutral-700/90 border border-neutral-700/80 hover:border-amber-400/40 text-neutral-200 hover:text-amber-300 text-xs font-mono transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H4a1 1 0 0 1-1-1V9.5z" />
              </svg>
              <span>Reset Coordinates & Zoom</span>
            </div>
          </button>
        </div>
      );
    }

    if (tool === 'clear') {
      if (location === 'topbar') {
        return (
          <button
            title="Clear all equations / New Graph"
            onClick={handleNewGraph}
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
            onClick={handleNewGraph}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-gradient-to-b from-neutral-800 to-neutral-800/90 hover:from-neutral-700 hover:to-neutral-700/90 border border-neutral-700/80 hover:border-red-500/40 text-neutral-200 hover:text-red-300 text-xs font-mono transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Clear All Equations</span>
            </div>
          </button>
        </div>
      );
    }

    if (tool === 'data') {
      if (location === 'topbar') {
        return (
          <button
            title="Import CSV or JSON data"
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
              <span>Import CSV / JSON</span>
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
              title="Copy graph image"
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
              title="Copy share link"
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

  const renderToolItem = (tool: ToolId2D, index: number, location: 'topbar' | 'sidebar') => {
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
            const toolToMove = data.slice(5) as ToolId2D;
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
    <div className="flex flex-col h-full bg-neutral-900">
      {/* ── header ── */}
      <header className="flex items-center gap-3 px-4 py-3 bg-neutral-800 border-b border-[#161412] shrink-0">
        <span className="font-pixel text-amber-400 text-sm tracking-widest">QuickPlot</span>
        <span className="font-pixel text-neutral-500 text-sm">/&nbsp;2D</span>
        <span className="text-neutral-600 shrink-0">|</span>
        <WorkspaceTitle
          name={workspaceName}
          onChange={setWorkspaceName}
          onSave={saveWorkspace}
          saveFlash={saveFlash}
        />

        {/* My Graphs / Workspaces Dashboard */}
        <button
          title="Open My Graphs & Workspaces Dashboard"
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
              const tool = data.slice(5) as ToolId2D;
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
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
        {/* ── canvas ── */}
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
              try { localStorage.setItem('qp_calc_corner', newCorner); } catch { /* ignore */ }
            }
          }}
        >
          <Canvas2D
            ref={canvasHandle}
            curves={curves}
            specialPoints={specialPoints}
            theme={theme}
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
                  try { localStorage.setItem('qp_calc_corner', newCorner); } catch { /* ignore */ }
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
            <svg viewBox="0 0 24 24" className="w-5 h-5 pointer-events-none" fill="none" aria-hidden focusable="false">
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

        {/* ── sidebar ── */}
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
              'absolute top-0 bottom-0 -left-1.5 w-3 cursor-col-resize z-30 select-none flex items-center justify-center group',
              isDraggingSidebar ? 'bg-amber-400/20' : 'hover:bg-amber-400/10',
            ].join(' ')}
            title="Drag to resize sidebar width"
          >
            <div
              className={`w-0.5 h-10 rounded-full transition-colors ${
                isDraggingSidebar
                  ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                  : 'bg-neutral-600 group-hover:bg-amber-400/80'
              }`}
            />
          </div>

          {/* Hidden File Input for Data Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,.tsv"
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
                const tool = data.slice(5) as ToolId2D;
                moveOrReorderTool(tool, activeDragTool?.fromZone || 'topbar', 'sidebar', sidebarTools.length);
              }
              setActiveDragTool(null);
            }}
            className="flex-1 overflow-y-auto flex flex-col"
          >
            {/* equations */}
            <div className="p-3">
              <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-3">EQUATIONS</p>
              <div className="space-y-0">
                {equations.map((eq, i) => {
                  const paramNames = paramsByEq.byEq.get(eq.id) ?? new Set<string>();
                  const inlineSliders = Object.values(sliders).filter(s => paramNames.has(s.name));
                  return (
                    <EquationRow
                      key={eq.id}
                      entry={eq}
                      autoFocus={i === equations.length - 1 && eq.expression === ''}
                      onChange={patch => update(eq.id, patch)}
                      onDelete={() => remove(eq.id)}
                      onTrace={() => startTrace(eq.id)}
                      isTracing={activeTraces.has(eq.id)}
                      inlineSliders={inlineSliders}
                      animating={animating}
                      onSliderChange={sliderChange}
                      onSliderRangeChange={sliderRangeChange}
                      onSliderStepChange={sliderStepChange}
                      onToggleSliderAnimation={toggleAnimation}
                      onSliderLoopModeChange={sliderLoopModeChange}
                      registerInput={focusedInput.bind}
                    />
                  );
                })}
              </div>
              {/* add buttons - NO plus sign */}
              <div className="flex gap-1.5 mt-3">
                {([
                  ['cartesian',  'y ='],
                  ['polar',      'r ='],
                  ['parametric', '(x,y)'],
                  ['implicit',   'f(x,y)'],
                ] as [EquationType, string][]).map(([t, label]) => (
                  <button
                    key={t}
                    onClick={() => add(t)}
                    title={`Add new ${t} equation`}
                    className="flex-1 py-1.5 rounded-md bg-gradient-to-b from-neutral-800 to-neutral-800/90 hover:from-neutral-700 hover:to-neutral-700/90 border border-neutral-700/70 hover:border-amber-400/50 text-neutral-300 hover:text-amber-300 font-mono text-[11px] font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* sliders — unlinked fallback */}
            <SliderPanel
              sliders={Object.fromEntries(
                Object.entries(sliders).filter(([name]) => !inlineSliderNames.has(name)),
              )}
              onChange={sliderChange}
              onRangeChange={sliderRangeChange}
              onStepChange={sliderStepChange}
              animating={animating}
              onToggleAnimation={toggleAnimation}
              onSpeedChange={sliderSpeedChange}
            />

            {/* manual point input - button appears only when coordinates typed */}
            <div className="px-3 pt-2 pb-3 border-t border-[#161412]">
              <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2">ADD POINT</p>
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500 text-xs font-mono">(</span>
                <input
                  type="number"
                  placeholder="x"
                  value={ptX}
                  onChange={e => setPtX(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addManualPoint()}
                  className="w-14 bg-neutral-900/90 text-neutral-200 text-xs rounded-md px-1.5 py-1 font-mono border border-neutral-700/80 outline-none text-center focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition-colors shadow-inner"
                />
                <span className="text-neutral-500 text-xs font-mono">,</span>
                <input
                  type="number"
                  placeholder="y"
                  value={ptY}
                  onChange={e => setPtY(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addManualPoint()}
                  className="w-14 bg-neutral-900/90 text-neutral-200 text-xs rounded-md px-1.5 py-1 font-mono border border-neutral-700/80 outline-none text-center focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition-colors shadow-inner"
                />
                <span className="text-neutral-500 text-xs font-mono">)</span>
                {(ptX.trim() !== '' || ptY.trim() !== '') && (
                  <button
                    onClick={addManualPoint}
                    className="ml-auto px-2.5 h-7 rounded-md bg-gradient-to-b from-amber-400 to-amber-500 text-neutral-950 hover:from-amber-300 hover:to-amber-400 transition-all font-mono text-xs font-bold flex items-center gap-1 shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
                    title="Plot point"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-950" />
                    <span>Plot</span>
                  </button>
                )}
              </div>
            </div>

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

      {/* ── Workspaces & Dashboard Modal ── */}
      <DashboardModal
        open={showDashboard}
        onClose={() => setShowDashboard(false)}
        workspaces={workspaces}
        activeId={activeWorkspaceId}
        onSelect={handleLoadWorkspace}
        onSaveCurrent={saveWorkspace}
        currentTitle={workspaceName}
        onNewGraph={handleNewGraph}
        onDelete={deleteLocalWs}
        onDuplicate={duplicateLocalWs}
        onRename={renameLocalWs}
        onExportAll={exportAllWorkspaces}
        onImport={importWorkspaces}
        onLoadTemplate={handleLoadWorkspace}
        user={user}
        onOpenAuth={() => {
          setAuthModalPrompt('Sign in or register to view your saved graphs');
          setShowAuthModal(true);
        }}
      />
    </div>
  );
}
