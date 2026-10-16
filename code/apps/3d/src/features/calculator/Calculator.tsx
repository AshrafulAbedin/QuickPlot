import { useState } from 'react';
import { FunctionPopover } from './FunctionPopover';

export type CalcCorner = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

interface Props {
  open: boolean;
  onClose: () => void;
  onInsert: (token: string) => void;
  onBackspace: () => void;
  onMoveCaret: (delta: number) => void;
  corner?: CalcCorner;
  onDragStart?: () => void;
}

const CORNER_CLASSES: Record<CalcCorner, string> = {
  'bottom-left': 'bottom-4 left-4 origin-bottom-left',
  'bottom-right': 'bottom-4 right-4 origin-bottom-right',
  'top-left': 'top-4 left-4 origin-top-left',
  'top-right': 'top-4 right-4 origin-top-right',
};

interface Key {
  label: string;
  token?: string;
  action?: 'back' | 'left' | 'right' | 'enter' | 'fn';
  wide?: boolean;
}

const VAR_KEYS: Key[] = [
  { label: 'x' }, { label: 'y' }, { label: 'a²', token: '^2' }, { label: 'aᵇ', token: '^' },
  { label: '(' }, { label: ')' }, { label: '<' }, { label: '>' },
  { label: '|a|', token: 'abs(' },
  { label: ',' }, { label: '≤', token: '<=' }, { label: '≥', token: '>=' },
  { label: 'π', token: 'pi' }, { label: '√', token: 'sqrt(' }, { label: 'e' }, { label: 'z' },
];

const NUM_KEYS: Key[] = [
  { label: '7' }, { label: '8' }, { label: '9' }, { label: '÷', token: '/' },
  { label: '4' }, { label: '5' }, { label: '6' }, { label: '×', token: '*' },
  { label: '1' }, { label: '2' }, { label: '3' }, { label: '−', token: '-' },
  { label: '0' }, { label: '.' }, { label: '=' }, { label: '+' },
];

const NAV_KEYS: Key[] = [
  { label: 'fn', action: 'fn' },
  { label: '⌫', action: 'back' },
  { label: '←', action: 'left' },
  { label: '→', action: 'right' },
];

function KeyButton({
  k, onClick, active,
}: {
  k: Key;
  onClick: () => void;
  active?: boolean;
}) {
  const isBack = k.action === 'back';
  return (
    <button
      onClick={onClick}
      title={k.token ?? k.label}
      className={[
        'py-2 rounded font-mono text-sm transition-all active:scale-95 shadow-sm',
        isBack
          ? 'bg-[#241416] hover:bg-[#341b1e] text-[#f87171] hover:text-[#fca5a5] border border-[#7f1d1d] hover:border-[#b91c1c] rounded-lg shadow-sm font-semibold'
          : active
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          : 'bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/60 hover:border-neutral-500',
        k.wide ? 'col-span-2' : '',
      ].join(' ')}
    >
      {k.label}
    </button>
  );
}

export function Calculator({
  open,
  onClose,
  onInsert,
  onBackspace,
  onMoveCaret,
  corner = 'bottom-left',
  onDragStart,
}: Props) {
  const [fnOpen, setFnOpen] = useState(false);

  const press = (k: Key) => {
    if (k.action === 'back')   { onBackspace(); return; }
    if (k.action === 'left')   { onMoveCaret(-1); return; }
    if (k.action === 'right')  { onMoveCaret(1); return; }
    if (k.action === 'fn')     { setFnOpen(v => !v); return; }
    onInsert(k.token ?? k.label);
  };

  return (
    <div
      className={[
        'absolute z-30 transition-transform duration-200 select-none',
        'motion-reduce:transition-none',
        CORNER_CLASSES[corner],
        open ? 'translate-y-0 opacity-100 pointer-events-auto'
             : 'translate-y-8 opacity-0 pointer-events-none',
      ].join(' ')}
      aria-hidden={!open}
    >
      <div className="relative rounded-xl border border-neutral-700/80 bg-neutral-900/95 backdrop-blur-md shadow-2xl p-3 w-[27rem] ring-1 ring-white/5">
        {/* header with drag grip */}
        <div
          draggable={true}
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', 'calc-corner-drag');
            onDragStart?.();
          }}
          className="flex items-center justify-between mb-2.5 pb-1 border-b border-neutral-800 cursor-grab active:cursor-grabbing"
          title="Drag to place in any corner of canvas"
        >
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-neutral-500" fill="currentColor">
              <circle cx="8" cy="6" r="1.5" /><circle cx="16" cy="6" r="1.5" />
              <circle cx="8" cy="12" r="1.5" /><circle cx="16" cy="12" r="1.5" />
              <circle cx="8" cy="18" r="1.5" /><circle cx="16" cy="18" r="1.5" />
            </svg>
            <span className="font-pixel text-amber-400 text-xs tracking-widest">KEYBOARD</span>
            <span className="text-[10px] font-mono text-neutral-500">hold header to place in corner</span>
          </div>

          <button
            title="Close keyboard"
            onClick={onClose}
            className="w-5 h-5 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors text-xs leading-none"
          >
            ✕
          </button>
        </div>

        {/* three-column layout: variables | numeric | nav */}
        <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
          <div className="grid grid-cols-4 gap-1">
            {VAR_KEYS.map(k => (
              <KeyButton key={k.label} k={k} onClick={() => press(k)} />
            ))}
          </div>

          <div className="grid grid-cols-4 gap-1">
            {NUM_KEYS.map(k => (
              <KeyButton key={k.label} k={k} onClick={() => press(k)} />
            ))}
          </div>

          <div className="relative flex flex-col gap-1 w-16">
            {NAV_KEYS.map(k => (
              <KeyButton
                key={k.label}
                k={k}
                onClick={() => press(k)}
                active={k.action === 'fn' && fnOpen}
              />
            ))}
            {fnOpen && (
              <FunctionPopover
                openDownward={corner.startsWith('top')}
                onInsert={(token) => { onInsert(token); }}
                onClose={() => setFnOpen(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
