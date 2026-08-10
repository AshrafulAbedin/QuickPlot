import { useRef, useEffect } from 'react';
import type { Surface } from './Renderer3D';

interface Props {
  surface: Surface;
  autoFocus?: boolean;
  onChange: (patch: Partial<Surface>) => void;
  onDelete: () => void;
  error?: string | null;
}

export function SurfaceRow({ surface, autoFocus, onChange, onDelete, error }: Props) {
  const colorRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);

  const hidden = surface.hidden ?? false;

  return (
    <div className="space-y-1 pb-2 border-b border-[#161412]/50 last:border-0">
      <div className="flex items-center gap-1.5">
        <button
          title="Change colour"
          className="w-3 h-3 rounded-full shrink-0 border border-white/20 hover:scale-125 transition-transform"
          style={{ background: surface.color ?? '#4A9EE0' }}
          onClick={() => colorRef.current?.click()}
        />
        <input
          ref={colorRef}
          type="color"
          className="sr-only"
          value={surface.color ?? '#4A9EE0'}
          onChange={(e) => onChange({ color: e.target.value })}
        />

        <span className="text-neutral-500 text-xs font-mono shrink-0">z =</span>

        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            spellCheck={false}
            autoComplete="off"
            placeholder="f(x,y)"
            value={surface.expr}
            className={[
              'w-full bg-neutral-700 text-neutral-100 text-xs font-mono',
              'rounded px-2 py-1.5 border outline-none transition-colors placeholder:text-neutral-500',
              error ? 'border-red-500 focus:border-red-400' : 'border-transparent focus:border-amber-400',
            ].join(' ')}
            onChange={(e) => onChange({ expr: e.target.value })}
          />
        </div>

        <button
          title={hidden ? 'Show' : 'Hide'}
          className="text-xs w-4 text-center transition-colors"
          style={{ color: hidden ? '#555' : (surface.color ?? '#4A9EE0') }}
          onClick={() => onChange({ hidden: !hidden })}
        >
          {!hidden ? '●' : '○'}
        </button>

        <button
          title="Remove"
          className="text-neutral-600 hover:text-red-400 transition-colors text-base leading-none w-4 text-center"
          onClick={onDelete}
        >
          ×
        </button>
      </div>
      {error && (
        <p className="text-red-400 text-[10px] font-mono px-1 leading-tight truncate" title={error}>
          {error}
        </p>
      )}
    </div>
  );
}
