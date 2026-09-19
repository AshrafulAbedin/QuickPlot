import { useState, useRef, useCallback } from 'react';
import { Renderer3D, type Renderer3DHandle } from './features/canvas-3d/Renderer3D';
import type { Surface } from './features/canvas-3d/Renderer3D';
import { validate3DExpression } from '@quickplot/core-3d';
import { SurfaceRow } from './features/canvas-3d/SurfaceRow';
import { ThemePicker } from './features/theme/ThemePicker';
import { DEFAULT_SURFACE_THEME, type SurfaceTheme } from '@quickplot/renderer-3d';

const PALETTE = [
  '#E05252', '#4A9EE0', '#52C77C', '#E0A030',
  '#B860D0', '#E07850', '#50C8D0', '#A8C020',
];

const DEFAULT_SURFACES: Surface[] = [
  { type: 'cartesian', expr: 'sin(x) + cos(y)', color: '#52C77C' },
];

const EXAMPLES = [
  'sin(x) + cos(y)',
  '0.2*(x^2 + y^2)',
  'sin(sqrt(x^2+y^2))',
  'x*y / 10',
  'cos(x) * sin(y)',
];

// ── URL hash codec ────────────────────────────────────────────────────────
interface HashSurface { e: string; c?: string; h?: boolean }

function encodeHash(surfaces: Surface[]): string {
  const payload: HashSurface[] = surfaces.map(s => ({ e: s.expr, c: s.color, h: s.hidden }));
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

function loadFromHash(): Surface[] | null {
  try {
    const h = window.location.hash.slice(1);
    if (!h) return null;
    const raw = JSON.parse(decodeURIComponent(atob(h))) as HashSurface[];
    if (!Array.isArray(raw) || !raw.length) return null;
    return raw.map((d, i) => ({
      type: 'cartesian' as const,
      expr: d.e ?? '',
      color: d.c ?? PALETTE[i % PALETTE.length],
      hidden: d.h ?? false,
    }));
  } catch { return null; }
}

const _fromHash = loadFromHash();

export default function App() {
  const canvasHandle = useRef<Renderer3DHandle>(null);

  const [surfaces, setSurfaces]           = useState<Surface[]>(_fromHash ?? DEFAULT_SURFACES);
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [flash, setFlash]                 = useState<'image' | 'link' | null>(null);
  const [theme, setTheme]                 = useState<SurfaceTheme>(DEFAULT_SURFACE_THEME);
  const [showThemePick, setShowThemePick] = useState(false);
  const [wireframe, setWireframe]         = useState(false);
  const [showAxes, setShowAxes]           = useState(true);

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

  const brief = (t: 'image' | 'link') => { setFlash(t); setTimeout(() => setFlash(null), 1800); };

  const copyImage = useCallback(async () => {
    await canvasHandle.current?.copyImage(); brief('image');
  }, []);

  const copyLink = useCallback(async () => {
    const hash = encodeHash(surfaces);
    window.history.replaceState(null, '', `#${hash}`);
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    try { await navigator.clipboard.writeText(url); }
    catch { window.prompt('Copy this share link:', url); }
    brief('link');
  }, [surfaces]);

  return (
    <div className="flex flex-col h-full bg-neutral-900">
      {/* ── header ── */}
      <header className="flex items-center gap-3 px-4 py-3 bg-neutral-800 border-b border-neutral-700 shrink-0">
        <span className="font-pixel text-amber-400 text-sm tracking-widest">QuickPlot</span>
        <span className="font-pixel text-neutral-500 text-sm">/&nbsp;3D</span>
        <div className="ml-auto flex items-center gap-3">
          {/* wireframe toggle */}
          <button
            title="Toggle wireframe rendering"
            onClick={() => setWireframe(v => !v)}
            className={[
              'font-pixel text-xs px-2 py-1 rounded transition-colors',
              wireframe
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-neutral-500 hover:text-neutral-300',
            ].join(' ')}
          >
            ▦ wireframe
          </button>

          {/* axes toggle */}
          <button
            title="Show X / Y / Z axes"
            onClick={() => setShowAxes(v => !v)}
            className={[
              'font-pixel text-xs px-2 py-1 rounded transition-colors',
              showAxes
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-neutral-500 hover:text-neutral-300',
            ].join(' ')}
          >
            ⊹ axes
          </button>

          {/* theme picker */}
          <div className="relative">
            <button
              title="Change scene theme"
              onClick={() => setShowThemePick(v => !v)}
              className={[
                'font-pixel text-xs px-2 py-1 rounded transition-colors flex items-center gap-1.5',
                showThemePick
                  ? 'bg-neutral-700 text-amber-300'
                  : 'text-neutral-500 hover:text-neutral-300',
              ].join(' ')}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full border border-white/20"
                style={{ background: theme.background }}
              />
              Themes
            </button>
            {showThemePick && (
              <ThemePicker
                current={theme}
                onChange={setTheme}
                onClose={() => setShowThemePick(false)}
              />
            )}
          </div>

          {/* reset view */}
          <button
            title="Reset camera"
            onClick={() => canvasHandle.current?.resetView()}
            className="font-pixel text-neutral-600 hover:text-neutral-300 text-xs transition-colors"
          >
            ⌂
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ── 3D canvas ── */}
        <div className="flex-1 min-w-0">
          <Renderer3D
            ref={canvasHandle}
            surfaces={surfaces.filter(s => !s.hidden)}
            theme={theme}
            wireframe={wireframe}
            showAxes={showAxes}
          />
        </div>

        {/* ── sidebar ── */}
        <aside className={[
          'relative shrink-0 bg-neutral-800 border-l border-neutral-700 flex flex-col',
          'transition-[width] duration-200',
          sidebarOpen ? 'w-60 overflow-y-auto' : 'w-7 overflow-hidden',
        ].join(' ')}>

          <div className="sticky top-0 z-20 bg-neutral-800 border-b border-neutral-700/60 shrink-0">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              title={sidebarOpen ? 'Collapse panel' : 'Expand panel'}
              className="w-7 h-7 flex items-center justify-center text-neutral-500 hover:text-amber-400 font-pixel text-[10px] transition-colors"
            >
              {sidebarOpen ? '»' : '«'}
            </button>
          </div>

          {sidebarOpen && <>

            {/* surfaces list */}
            <div className="p-3">
              <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-3">SURFACES</p>
              <div className="space-y-0">
                {surfaces.map((s, i) => (
                  <SurfaceRow
                    key={i}
                    surface={s}
                    autoFocus={i === surfaces.length - 1 && s.expr === ''}
                    error={s.expr.trim() ? validate3DExpression(s.expr) : null}
                    onChange={patch => updateSurface(i, patch)}
                    onDelete={() => removeSurface(i)}
                  />
                ))}
              </div>
              <div className="flex gap-1 mt-3">
                <button
                  onClick={() => addSurface()}
                  className="flex-1 py-1 rounded border border-dashed border-neutral-600 text-neutral-500 hover:text-amber-400 hover:border-amber-400 transition-colors text-xs font-pixel"
                >
                  Add Surface
                </button>
              </div>
            </div>

            {/* examples */}
            <div className="px-3 pt-1 pb-3 border-t border-neutral-700">
              <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2 mt-2">EXAMPLES</p>
              <div className="flex flex-wrap gap-1">
                {EXAMPLES.map(ex => (
                  <button
                    key={ex}
                    onClick={() => addSurface(ex)}
                    className="px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-300 hover:text-amber-300 text-[10px] font-mono transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* shortcuts */}
            <div className="px-3 pt-1 pb-2 border-t border-neutral-700 mt-auto">
              <button
                onClick={() => setShowShortcuts(v => !v)}
                className="w-full flex items-center justify-between mt-2 mb-1 group"
              >
                <p className="font-pixel text-neutral-400 text-xs tracking-widest group-hover:text-neutral-300 transition-colors">
                  SHORTCUTS
                </p>
                <span className="text-neutral-600 text-[10px] font-pixel group-hover:text-neutral-400 transition-colors">
                  {showShortcuts ? '▲' : '▼'}
                </span>
              </button>
              {showShortcuts && (
                <div className="mt-2 mb-1 rounded border border-neutral-600 bg-neutral-900/60 overflow-hidden">
                  {([
                    ['Left drag',  'Rotate'],
                    ['Scroll',     'Zoom in / out'],
                    ['Right drag', 'Pan'],
                    ['⌂',          'Reset camera'],
                  ] as [string, string][]).map(([key, desc], i, arr) => (
                    <div
                      key={key}
                      className={['flex items-center justify-between px-2.5 py-1.5 text-[10px]', i < arr.length - 1 ? 'border-b border-neutral-700/60' : ''].join(' ')}
                    >
                      <span className="font-pixel text-amber-400/80">{key}</span>
                      <span className="font-mono text-neutral-300">{desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* share */}
            <div className="px-3 pt-1 pb-3 border-t border-neutral-700">
              <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2 mt-2">SHARE</p>
              <div className="flex gap-2">
                <button
                  onClick={copyImage}
                  className={[
                    'flex-1 px-2 py-2 rounded text-xs font-pixel transition-colors bg-neutral-700 hover:bg-neutral-600',
                    flash === 'image' ? 'text-green-400' : 'text-neutral-200',
                  ].join(' ')}
                >
                  {flash === 'image' ? '✓ Done' : '⎘ Image'}
                </button>
                <button
                  onClick={copyLink}
                  className={[
                    'flex-1 px-2 py-2 rounded text-xs font-pixel transition-colors bg-neutral-700 hover:bg-neutral-600',
                    flash === 'link' ? 'text-green-400' : 'text-neutral-200',
                  ].join(' ')}
                >
                  {flash === 'link' ? '✓ Done' : '⇗ Link'}
                </button>
              </div>
            </div>

          </>}
        </aside>
      </div>
    </div>
  );
}
