import { useState } from 'react';
import { FunctionPopover } from './FunctionPopover';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Insert a token at the currently focused equation input's caret. */
  onInsert: (token: string) => void;
  onBackspace: () => void;
  onMoveCaret: (delta: number) => void;
}

interface Key {
  label: string;
  token?: string;      // insertion string; falls back to label when omitted
  action?: 'back' | 'left' | 'right' | 'enter' | 'fn';
  wide?: boolean;      // spans two columns in the numeric block
}

/** Variable / symbol keys column. */
const VAR_KEYS: Key[] = [
  { label: 'x' }, { label: 'y' }, { label: 'a²', token: '^2' }, { label: 'aᵇ', token: '^' },
  { label: '(' }, { label: ')' }, { label: '<' }, { label: '>' },
  { label: '|a|', token: 'abs(' },
  { label: ',' }, { label: '≤', token: '<=' }, { label: '≥', token: '>=' },
  { label: 'π', token: 'pi' }, { label: '√', token: 'sqrt(' }, { label: 'e' }, { label: 'θ', token: 'theta' },
];

/** Numeric keypad + basic operators. */
const NUM_KEYS: Key[] = [
  { label: '7' }, { label: '8' }, { label: '9' }, { label: '÷', token: '/' },
  { label: '4' }, { label: '5' }, { label: '6' }, { label: '×', token: '*' },
  { label: '1' }, { label: '2' }, { label: '3' }, { label: '−', token: '-' },
  { label: '0' }, { label: '.' }, { label: '=' }, { label: '+' },
];

/** Cursor/edit cluster on the right. */
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
  return (
    <button
      onClick={onClick}
      title={k.token ?? k.label}
      className={[
        'py-2 rounded font-mono text-sm transition-colors',
        active
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-200',
        k.wide ? 'col-span-2' : '',
      ].join(' ')}
    >
      {k.label}
    </button>
  );
}

export function Calculator({ open, onClose, onInsert, onBackspace, onMoveCaret }: Props) {
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
      // Slide-up panel from the bottom-left. `motion-reduce` disables the
      // transform transition for users who opted out of animation.
      className={[
        'absolute bottom-4 left-4 z-30 origin-bottom-left transition-transform duration-200',
        'motion-reduce:transition-none',
        open ? 'translate-y-0 opacity-100 pointer-events-auto'
             : 'translate-y-8 opacity-0 pointer-events-none',
      ].join(' ')}
      aria-hidden={!open}
    >
      <div className="relative rounded-lg border border-[#161412] bg-neutral-800 shadow-xl p-3 w-[26rem]">
        {/* header */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-pixel text-neutral-400 text-xs tracking-widest">KEYBOARD</span>
          <button
            title="Close keyboard"
            onClick={onClose}
            className="text-neutral-500 hover:text-amber-300 text-sm leading-none"
          >
            ×
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
