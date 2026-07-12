import { useState } from 'react';
import { Renderer3D } from './features/canvas-3d/Renderer3D';
import type { Surface } from './features/canvas-3d/Renderer3D';
import { validate3DExpression } from '@quickplot/core';

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

export default function App() {
  const [surfaces, setSurfaces]       = useState<Surface[]>(DEFAULT_SURFACES);
  const [newExpr,  setNewExpr]        = useState('');
  const [error,    setError]          = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const addSurface = (expr = newExpr) => {
    const trimmed = expr.trim();
    if (!trimmed) return;
    const err = validate3DExpression(trimmed);
    if (err) { setError(err); return; }
    setSurfaces(prev => [
      ...prev,
      { type: 'cartesian', expr: trimmed, color: PALETTE[prev.length % PALETTE.length] },
    ]);
    setNewExpr('');
    setError(null);
  };

  const removeSurface  = (i: number) => setSurfaces(prev => prev.filter((_, idx) => idx !== i));
  const toggleVisible  = (i: number) =>
    setSurfaces(prev =>
      prev.map((s, idx) =>
        idx === i ? { ...s, hidden: !('hidden' in s && (s as any).hidden) } : s,
      ),
    );

  return (
    <div className="flex flex-col h-full bg-neutral-900">

      {/* ── header ── */}
      <header className="flex items-center gap-3 px-4 py-3 bg-neutral-800 border-b border-neutral-700 shrink-0">
        <span className="font-pixel text-amber-400 text-sm tracking-widest">QuickPlot</span>
        <span className="font-pixel text-neutral-500 text-sm">/&nbsp;3D</span>
        <div className="ml-auto">
          <span className="font-pixel text-neutral-600 text-xs">Drag · Scroll · Right-drag pan</span>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">

        {/* ── 3D canvas ── */}
        <div className="flex-1 min-w-0">
          <Renderer3D surfaces={surfaces.filter(s => !('hidden' in s && (s as any).hidden))} />
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
              className="w-7 h-7 flex items-center justify-center text-neutral-500 hover:text-amber-400 font-pixel text-[10px] transition-colors"
            >
              {sidebarOpen ? '»' : '«'}
            </button>
          </div>

          {sidebarOpen && <>

            {/* surfaces list */}
            <div className="p-3">
              <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-3">SURFACES</p>

              <div className="space-y-1">
                {surfaces.map((s, i) => {
                  const hidden = 'hidden' in s && (s as any).hidden;
                  return (
                    <div key={i} className="flex items-center gap-2 py-1 px-2 rounded bg-neutral-900/50 group">
                      <button onClick={() => toggleVisible(i)} className="shrink-0">
                        <span
                          className={['block w-3 h-3 rounded-full border border-white/20 transition-opacity', hidden ? 'opacity-25' : 'opacity-100'].join(' ')}
                          style={{ background: s.color ?? '#4A9EE0' }}
                        />
                      </button>
                      <span className={['flex-1 font-mono text-xs truncate', hidden ? 'text-neutral-600' : 'text-neutral-200'].join(' ')}>
                        {s.expr}
                      </span>
                      <button
                        onClick={() => removeSurface(i)}
                        className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-400 text-xs transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* input */}
              <div className="mt-3 flex gap-1">
                <input
                  type="text"
                  placeholder="sin(x) + cos(y)"
                  value={newExpr}
                  onChange={e => { setNewExpr(e.target.value); setError(null); }}
                  onKeyDown={e => e.key === 'Enter' && addSurface()}
                  className={[
                    'flex-1 bg-neutral-700 text-neutral-200 text-xs rounded px-2 py-1.5 font-mono outline-none focus:ring-1 transition-colors',
                    error ? 'ring-1 ring-red-500 focus:ring-red-500' : 'focus:ring-amber-500',
                  ].join(' ')}
                />
                <button
                  onClick={() => addSurface()}
                  className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors text-sm font-bold"
                >
                  +
                </button>
              </div>
              {error && <p className="mt-1 font-mono text-[10px] text-red-400">{error}</p>}
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

            {/* controls */}
            <div className="px-3 pt-1 pb-3 border-t border-neutral-700 mt-auto">
              <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2 mt-2">CONTROLS</p>
              <div className="rounded border border-neutral-600 bg-neutral-900/60 overflow-hidden">
                {([
                  ['Left drag',  'Rotate'],
                  ['Scroll',     'Zoom in / out'],
                  ['Right drag', 'Pan'],
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
            </div>

          </>}
        </aside>
      </div>
    </div>
  );
}
