import { useEffect, useRef } from 'react';

interface Example {
  expr: string;
  label: string;
}

interface Group {
  title: string;
  items: Example[];
}

/**
 * Reference surfaces, kept out of the workspace so the app opens empty.
 * Scaled to sit inside the ±25 grid rather than shooting off-screen.
 */
const GALLERY: Group[] = [
  {
    title: 'Waves',
    items: [
      { expr: 'sin(x) + cos(y)', label: 'Egg carton' },
      { expr: 'cos(x) * sin(y)', label: 'Cross wave' },
      { expr: '3*sin(sqrt(x^2 + y^2))', label: 'Ripple' },
    ],
  },
  {
    title: 'Quadrics',
    items: [
      { expr: '0.05*(x^2 + y^2)', label: 'Paraboloid' },
      { expr: '0.05*(x^2 - y^2)', label: 'Saddle' },
      { expr: 'x*y / 20', label: 'Hyperbolic' },
    ],
  },
  {
    title: 'Advanced',
    items: [
      { expr: '12*exp(-(x^2 + y^2)/40)', label: 'Gaussian bell' },
      { expr: '20*sin(sqrt(x^2+y^2))/sqrt(x^2+y^2+1)', label: 'Sombrero' },
      { expr: '(x^3 - 3*x*y^2)/150', label: 'Monkey saddle' },
    ],
  },
];

const SYNTAX: [string, string][] = [
  ['x, y', 'the two inputs'],
  ['^', 'power — x^2'],
  ['* /', 'multiply, divide'],
  ['sqrt abs', 'root, magnitude'],
  ['sin cos tan', 'trig, in radians'],
  ['exp log', 'e^x, natural log'],
  ['pi, e', 'constants'],
];

interface Props {
  /** Adds the expression as a new surface. */
  onInsert: (expr: string) => void;
  onClose: () => void;
}

export function HelpPanel({ onInsert, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Help and examples"
      className={[
        'absolute top-full right-0 mt-1 z-50 w-[300px] max-h-[70vh] overflow-y-auto',
        'bg-neutral-800 border border-neutral-600 rounded-lg p-3 shadow-2xl',
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="font-pixel text-neutral-400 text-xs tracking-widest">HELP</p>
        <button
          onClick={onClose}
          title="Close"
          className="text-neutral-600 hover:text-neutral-300 text-base leading-none w-4 text-center transition-colors"
        >
          ×
        </button>
      </div>

      <p className="text-neutral-400 text-[11px] font-mono leading-relaxed mb-3">
        Type any <span className="text-amber-300">f(x, y)</span> into a surface row — the result
        becomes the height <span className="text-amber-300">z</span>. Pick one below to add it.
      </p>

      {GALLERY.map(group => (
        <div key={group.title} className="mb-3">
          <p className="font-pixel text-neutral-500 text-[10px] tracking-widest mb-1.5">
            {group.title.toUpperCase()}
          </p>
          <div className="space-y-1">
            {group.items.map(ex => (
              <button
                key={ex.expr}
                onClick={() => { onInsert(ex.expr); onClose(); }}
                title={`Add ${ex.expr}`}
                className={[
                  'w-full text-left rounded px-2 py-1.5 transition-colors',
                  'bg-neutral-700 hover:bg-neutral-600 group',
                ].join(' ')}
              >
                <span className="block text-neutral-300 group-hover:text-amber-300 text-[10px] font-mono truncate transition-colors">
                  {ex.expr}
                </span>
                <span className="block text-neutral-500 text-[9px] font-mono mt-0.5">
                  {ex.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="border-t border-[#161412] pt-2 mt-1">
        <p className="font-pixel text-neutral-500 text-[10px] tracking-widest mb-1.5">SYNTAX</p>
        <div className="rounded border border-neutral-600 bg-neutral-900/60 overflow-hidden">
          {SYNTAX.map(([token, desc], i) => (
            <div
              key={token}
              className={[
                'flex items-center justify-between gap-2 px-2.5 py-1 text-[10px]',
                i < SYNTAX.length - 1 ? 'border-b border-[#161412]/60' : '',
              ].join(' ')}
            >
              <span className="font-mono text-amber-400/80 shrink-0">{token}</span>
              <span className="font-mono text-neutral-400 text-right">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
