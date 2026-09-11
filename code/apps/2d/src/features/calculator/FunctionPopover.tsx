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
}

export function FunctionPopover({ onInsert, onClose }: Props) {
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
      className="absolute bottom-full mb-2 left-0 w-72 max-h-80 overflow-y-auto rounded border border-[#161412] bg-neutral-800 shadow-lg"
    >
      {GROUPS.map((g, i) => (
        <div key={g.title} className={i > 0 ? 'border-t border-[#161412]' : ''}>
          <p className="font-pixel text-neutral-500 text-[10px] tracking-widest px-3 pt-2 pb-1">
            {g.title.toUpperCase()}
          </p>
          <div className="grid grid-cols-3 gap-1 px-2 pb-2">
            {g.keys.map(k => (
              <button
                key={k.label}
                disabled={k.unsupported}
                title={k.unsupported ? 'Not supported by the parser yet' : k.token}
                onClick={() => onInsert(k.token)}
                className={[
                  'py-1.5 rounded font-mono text-xs transition-colors',
                  k.unsupported
                    ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                    : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-200',
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
