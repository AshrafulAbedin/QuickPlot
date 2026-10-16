import { useEffect, useRef } from 'react';

interface FnKey {
  label: string;
  token: string;
  /**
   * When true, mathjs's default scope does not expose this function; we
   * render the key disabled with a tooltip rather than silently producing
   * NaN at evaluation time.
   */
  unsupported?: boolean;
}

/**
 * Grouped function palette. All tokens except those flagged `unsupported`
 * resolve inside mathjs's default scope, so pressing a key inserts text
 * that the parser will accept.
 */
const GROUPS: Array<{ title: string; keys: FnKey[] }> = [
  {
    title: 'Trig',
    keys: [
      { label: 'sin', token: 'sin(' },
      { label: 'cos', token: 'cos(' },
      { label: 'tan', token: 'tan(' },
      { label: 'csc', token: 'csc(' },
      { label: 'sec', token: 'sec(' },
      { label: 'cot', token: 'cot(' },
    ],
  },
  {
    title: 'Inverse Trig',
    keys: [
      { label: 'sin⁻¹', token: 'asin(' },
      { label: 'cos⁻¹', token: 'acos(' },
      { label: 'tan⁻¹', token: 'atan(' },
      { label: 'csc⁻¹', token: 'acsc(' },
      { label: 'sec⁻¹', token: 'asec(' },
      { label: 'cot⁻¹', token: 'acot(' },
    ],
  },
  {
    title: 'Statistics',
    keys: [
      { label: 'mean',   token: 'mean(' },
      { label: 'median', token: 'median(' },
      { label: 'min',    token: 'min(' },
      { label: 'max',    token: 'max(' },
      { label: 'sum',    token: 'sum(' },
      { label: 'std',    token: 'std(' },
    ],
  },
  {
    title: 'Logs & Roots',
    keys: [
      { label: 'ln',    token: 'log(' },
      { label: 'log',   token: 'log10(' },
      { label: 'log₂',  token: 'log2(' },
      { label: 'exp',   token: 'exp(' },
      { label: '√',     token: 'sqrt(' },
      { label: '∛',     token: 'cbrt(' },
    ],
  },
  {
    title: 'Round',
    keys: [
      { label: 'abs',   token: 'abs(' },
      { label: 'floor', token: 'floor(' },
      { label: 'ceil',  token: 'ceil(' },
      { label: 'round', token: 'round(' },
      { label: 'sign',  token: 'sign(' },
      { label: 'mod',   token: 'mod(' },
    ],
  },
];

interface Props {
  onInsert: (token: string) => void;
  onClose: () => void;
  openDownward?: boolean;
}

export function FunctionPopover({ onInsert, onClose, openDownward }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={[
        'absolute left-0 w-80 max-h-84 overflow-y-auto rounded-xl border border-neutral-700/80 bg-neutral-900/95 backdrop-blur-md shadow-2xl p-2.5 z-40 ring-1 ring-white/5 space-y-2.5',
        openDownward ? 'top-full mt-2' : 'bottom-full mb-2',
      ].join(' ')}
    >
      <div className="flex items-center justify-between pb-1 border-b border-neutral-800">
        <span className="font-pixel text-amber-400 text-[10px] tracking-widest">FUNCTIONS</span>
        <button
          onClick={onClose}
          className="w-4 h-4 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors text-[10px]"
        >
          ✕
        </button>
      </div>
      {GROUPS.map((g) => (
        <div key={g.title} className="space-y-1">
          <p className="font-pixel text-neutral-400 text-[9px] tracking-wider px-1">
            {g.title.toUpperCase()}
          </p>
          <div className="grid grid-cols-3 gap-1">
            {g.keys.map(k => (
              <button
                key={k.label}
                disabled={k.unsupported}
                title={k.unsupported ? 'Not supported by the parser yet' : k.token}
                onClick={() => onInsert(k.token)}
                className={[
                  'py-1.5 px-2 rounded-md font-mono text-xs transition-all border shadow-sm active:scale-95 select-none',
                  k.unsupported
                    ? 'bg-neutral-900/40 text-neutral-600 border-neutral-800/80 cursor-not-allowed'
                    : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 hover:text-amber-300 border-neutral-700/70 hover:border-amber-400/40',
                ].join(' ')}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
