import {
  useState, useMemo, useRef, useCallback,
} from 'react';
import {
  validateExpression,
  findRoots, findExtrema, findIntersections,
  parseWithScope,
  parseJsonData, parseCsvData,
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
import type { PlotCurve, SpecialPoint, CanvasTheme } from '@quickplot/renderer';
import { DEFAULT_THEME } from '@quickplot/renderer';

// ── URL hash codec ────────────────────────────────────────────────────────
interface HashPayload {
  eqs: Array<{ e: string; ey?: string; t: EquationType; c: string; v: boolean; mn: number; mx: number }>;
  sliders?: Record<string, { value: number; min: number; max: number; step: number }>;
}

const PALETTE = [
  '#E05252', '#4A9EE0', '#52C77C', '#E0A030',
  '#B860D0', '#E07850', '#50C8D0', '#A8C020',
  '#F06090', '#70D060',
];

function encodeHash(
  eqs: ReturnType<typeof useEquations>['equations'],
  sliders: Record<string, Slider>,
): string {
  const payload: HashPayload = {
    eqs: eqs
      .filter(e => e.type !== 'points')
      .map(e => ({ e: e.expression, ey: e.expressionY, t: e.type, c: e.color, v: e.visible, mn: e.tMin, mx: e.tMax })),
    sliders: Object.fromEntries(
      Object.values(sliders).map(s => [s.name, { value: s.value, min: s.min, max: s.max, step: s.step }]),
    ),
  };
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

function loadFromHash(): { equations: ReturnType<typeof useEquations>['equations']; sliders: Record<string, Slider> } | null {
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
        sliders[name] = { name, value: s.value, min: s.min, max: s.max, step: s.step };
      }
    }
    return { equations, sliders };
  } catch { return null; }
}

// ── App ───────────────────────────────────────────────────────────────────
const _fromHash = loadFromHash();
const DEFAULTS: ReturnType<typeof useEquations>['equations'] = [];

export default function App() {
  const canvasHandle = useRef<Canvas2DHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { equations, update, add, remove, addPoints } = useEquations(_fromHash?.equations ?? DEFAULTS);
  const { sliders, sliderScope, animating, onChange: sliderChange, onRangeChange: sliderRangeChange, toggleAnimation } =
    useSliders(equations, _fromHash?.sliders);
  const { activeTraces, traceSnap, startTrace } = useTraceAnimation();

  const [showSpecial,   setShowSpecial]   = useState(false);
  const [flash,         setFlash]         = useState<'image' | 'link' | null>(null);
  const [theme,         setTheme]         = useState<CanvasTheme>(DEFAULT_THEME);
  const [showThemePick, setShowThemePick] = useState(false);
  const [ptX,           setPtX]           = useState('');
  const [ptY,           setPtY]           = useState('');
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);

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
    const hash = encodeHash(equations, sliders);
    window.history.replaceState(null, '', `#${hash}`);
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    try { await navigator.clipboard.writeText(url); }
    catch { window.prompt('Copy this share link:', url); }
    brief('link');
  }, [equations, sliders]);

  return (
    <div className="flex flex-col h-full bg-neutral-900">
      {/* ── header ── */}
      <header className="flex items-center gap-3 px-4 py-3 bg-neutral-800 border-b border-[#161412] shrink-0">
        <span className="font-pixel text-amber-400 text-sm tracking-widest">QuickPlot</span>
        <span className="font-pixel text-neutral-500 text-sm">/&nbsp;2D</span>
        <div className="ml-auto flex items-center gap-3">
          {/* special-points toggle */}
          <button
            title="Show roots, extrema & intersections"
            onClick={() => setShowSpecial(v => !v)}
            className={[
              'font-pixel text-xs px-2 py-1 rounded transition-colors',
              showSpecial
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-neutral-500 hover:text-neutral-300',
            ].join(' ')}
          >
            ◉ special pts
          </button>

          {/* theme picker */}
          <div className="relative">
            <button
              title="Change canvas theme"
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
                style={{ background: theme.bg }}
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

          {/* switch to 3D */}
          <a
            title="Switch to 3D"
            href={import.meta.env.VITE_URL_3D ?? 'http://localhost:5175'}
            className="font-pixel text-neutral-500 hover:text-amber-400 text-xs transition-colors flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden focusable="false"><path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7L12 2.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 21.2V11.6M12 11.6 20.5 7M12 11.6 3.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
            3D
          </a>

          {/* reset view */}
          <button
            title="Reset view (or double-click canvas)"
            onClick={() => canvasHandle.current?.resetView()}
            className="font-pixel text-neutral-600 hover:text-neutral-300 text-xs transition-colors"
          >
            ⌂
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ── canvas ── */}
        <div className="flex-1 min-w-0">
          <Canvas2D
            ref={canvasHandle}
            curves={curves}
            specialPoints={specialPoints}
            theme={theme}
          />
        </div>

        {/* ── sidebar ── */}
        <aside className={[
          'relative shrink-0 bg-neutral-800 border-l border-[#161412] flex flex-col',
          'transition-[width] duration-200',
          sidebarOpen ? 'w-60 overflow-y-auto' : 'w-7 overflow-hidden',
        ].join(' ')}>

          {/* ── collapse / expand toggle ── */}
          <div className="sticky top-0 z-20 bg-neutral-800 border-b border-[#161412]/60 shrink-0">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              title={sidebarOpen ? 'Collapse panel' : 'Expand panel'}
              className="w-7 h-7 flex items-center justify-center text-neutral-500 hover:text-amber-400 font-pixel text-[10px] transition-colors"
            >
              {sidebarOpen ? '»' : '«'}
            </button>
          </div>

          {/* ── panel content (hidden when collapsed) ── */}
          {sidebarOpen && <>

            {/* equations */}
            <div className="p-3">
              <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-3">EQUATIONS</p>
              <div className="space-y-0">
                {equations.map((eq, i) => (
                  <EquationRow
                    key={eq.id}
                    entry={eq}
                    autoFocus={i === equations.length - 1 && eq.expression === ''}
                    onChange={patch => update(eq.id, patch)}
                    onDelete={() => remove(eq.id)}
                    onTrace={() => startTrace(eq.id)}
                    isTracing={activeTraces.has(eq.id)}
                  />
                ))}
              </div>
              {/* add buttons */}
              <div className="flex gap-1 mt-3">
                {([
                  ['cartesian',  'y='],
                  ['polar',      'r='],
                  ['parametric', 'xy'],
                  ['implicit',   'f='],
                ] as [EquationType, string][]).map(([t, label]) => (
                  <button
                    key={t}
                    onClick={() => add(t)}
                    title={`Add ${t} equation`}
                    className="flex-1 py-1 rounded border border-dashed border-neutral-600 text-neutral-500 hover:text-amber-400 hover:border-amber-400 transition-colors text-xs font-pixel"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* sliders */}
            <SliderPanel
              sliders={sliders}
              onChange={sliderChange}
              onRangeChange={sliderRangeChange}
              animating={animating}
              onToggleAnimation={toggleAnimation}
            />

            {/* manual point input */}
            <div className="px-3 pt-1 pb-3 border-t border-[#161412]">
              <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2 mt-2">ADD POINT</p>
              <div className="flex items-center gap-1">
                <span className="text-neutral-600 text-xs font-mono">(</span>
                <input
                  type="number"
                  placeholder="x"
                  value={ptX}
                  onChange={e => setPtX(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addManualPoint()}
                  className="w-14 bg-neutral-700 text-neutral-200 text-xs rounded px-1 py-1 font-mono outline-none text-center focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-neutral-600 text-xs font-mono">,</span>
                <input
                  type="number"
                  placeholder="y"
                  value={ptY}
                  onChange={e => setPtY(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addManualPoint()}
                  className="w-14 bg-neutral-700 text-neutral-200 text-xs rounded px-1 py-1 font-mono outline-none text-center focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-neutral-600 text-xs font-mono">)</span>
                <button
                  onClick={addManualPoint}
                  className="ml-auto px-2 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors text-sm leading-none font-bold"
                  title="Plot point"
                >
                  +
                </button>
              </div>
            </div>

            {/* data upload */}
            <div className="px-3 pt-1 pb-3 border-t border-[#161412]">
              <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2 mt-2">DATA</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.tsv"
                className="sr-only"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-300 text-xs font-pixel transition-colors"
              >
                ↑ Upload JSON / CSV
              </button>
            </div>

            {/* shortcuts */}
            <div className="px-3 pt-1 pb-2 border-t border-[#161412] mt-auto">
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
                      <span className="font-pixel text-amber-400/80">{key}</span>
                      <span className="font-mono text-neutral-300">{desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* share */}
            <div className="px-3 pt-1 pb-3 border-t border-[#161412]">
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
