import { useRef, useEffect } from 'react';
import type { EquationEntry, EquationType } from './types';

interface Props {
  entry: EquationEntry;
  autoFocus?: boolean;
  onChange: (patch: Partial<EquationEntry>) => void;
  onDelete: () => void;
  onTrace?: () => void;
  isTracing?: boolean;
}

const TYPE_LABELS: Record<EquationType, string> = {
  cartesian:  'y =',
  polar:      'r =',
  parametric: 'parametric',
  implicit:   'f(x,y)',
  points:     'data',
};

const TYPE_OPTIONS: EquationType[] = ['cartesian', 'polar', 'parametric', 'implicit', 'points'];

function Inp({
  value,
  placeholder,
  error,
  autoFocus,
  onChange,
  prefix,
}: {
  value: string;
  placeholder: string;
  error: string | null | undefined;
  autoFocus?: boolean;
  onChange: (v: string) => void;
  prefix?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);

  return (
    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {prefix && <span className="text-neutral-500 text-xs font-mono shrink-0">{prefix}</span>}
        <input
          ref={ref}
          type="text"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          placeholder={placeholder}
          value={value}
          className={[
            'flex-1 min-w-0 bg-neutral-700 text-neutral-100 text-xs font-mono',
            'rounded px-2 py-1.5 border outline-none transition-colors placeholder:text-neutral-500',
            error ? 'border-red-500 focus:border-red-400' : 'border-transparent focus:border-amber-400',
          ].join(' ')}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {error && (
        <p className="text-red-400 text-[10px] font-mono px-1 leading-tight truncate" title={error}>
          {error}
        </p>
      )}
    </div>
  );
}

export function EquationRow({ entry, autoFocus, onChange, onDelete, onTrace, isTracing }: Props) {
  const colorRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1 pb-2 border-b border-[#161412]/50 last:border-0">
      {/* row 1: color + type + actions + delete */}
      <div className="flex items-center gap-1.5">
        {/* color swatch */}
        <button
          title="Change colour"
          className="w-3 h-3 rounded-full shrink-0 border border-white/20 hover:scale-125 transition-transform"
          style={{ background: entry.color }}
          onClick={() => colorRef.current?.click()}
        />
        <input
          ref={colorRef}
          type="color"
          className="sr-only"
          value={entry.color}
          onChange={(e) => onChange({ color: e.target.value })}
        />

        {/* type selector */}
        {entry.type !== 'points' && (
          <select
            value={entry.type}
            className="bg-neutral-700 text-neutral-300 text-xs rounded px-1 py-0.5 border-none outline-none cursor-pointer hover:bg-neutral-600"
            onChange={(e) => onChange({ type: e.target.value as EquationType })}
          >
            {TYPE_OPTIONS.filter(t => t !== 'points').map(t => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        )}
        {entry.type === 'points' && (
          <span className="text-neutral-500 text-xs font-pixel">data</span>
        )}

        <div className="flex-1" />

        {/* trace animation (non-points curves only) */}
        {entry.type !== 'points' && onTrace && (
          <button
            title={isTracing ? 'Tracing…' : 'Animate draw (manim-style)'}
            onClick={onTrace}
            className={[
              'text-xs transition-colors leading-none',
              isTracing ? 'text-amber-400 animate-pulse' : 'text-neutral-600 hover:text-neutral-300',
            ].join(' ')}
          >
            {isTracing ? '◈' : '▷'}
          </button>
        )}

        {/* derivative overlay (cartesian only) */}
        {entry.type === 'cartesian' && (
          <button
            title="Toggle f′ derivative overlay"
            className={[
              'text-xs transition-colors font-pixel leading-none',
              entry.showDerivative ? 'text-amber-400' : 'text-neutral-600 hover:text-neutral-400',
            ].join(' ')}
            onClick={() => onChange({ showDerivative: !entry.showDerivative })}
          >
            f′
          </button>
        )}

        {/* visibility */}
        <button
          title={entry.visible ? 'Hide' : 'Show'}
          className="text-xs w-4 text-center transition-colors"
          style={{ color: entry.visible ? entry.color : '#555' }}
          onClick={() => onChange({ visible: !entry.visible })}
        >
          {entry.visible ? '●' : '○'}
        </button>

        {/* delete */}
        <button
          title="Remove"
          className="text-neutral-600 hover:text-red-400 transition-colors text-base leading-none w-4 text-center"
          onClick={onDelete}
        >
          ×
        </button>
      </div>

      {/* row 2: expression(s) */}
      {entry.type === 'cartesian' && (
        <Inp
          value={entry.expression}
          placeholder="Input"
          error={entry.error}
          autoFocus={autoFocus}
          onChange={(v) => onChange({ expression: v })}
        />
      )}

      {entry.type === 'polar' && (
        <Inp
          value={entry.expression}
          placeholder="2 + cos(t)"
          error={entry.error}
          autoFocus={autoFocus}
          onChange={(v) => onChange({ expression: v })}
        />
      )}

      {entry.type === 'implicit' && (
        <Inp
          value={entry.expression}
          placeholder="x^2 + y^2 = 25"
          error={entry.error}
          autoFocus={autoFocus}
          onChange={(v) => onChange({ expression: v })}
        />
      )}

      {entry.type === 'parametric' && (
        <>
          <Inp
            value={entry.expression}
            placeholder="cos(t)"
            error={entry.error}
            autoFocus={autoFocus}
            prefix="x ="
            onChange={(v) => onChange({ expression: v })}
          />
          <Inp
            value={entry.expressionY ?? ''}
            placeholder="sin(t)"
            error={entry.errorY}
            prefix="y ="
            onChange={(v) => onChange({ expressionY: v })}
          />
          {/* t range */}
          <div className="flex items-center gap-1 text-xs text-neutral-500 font-mono">
            <span>t ∈ [</span>
            <input
              type="number"
              className="w-14 bg-neutral-700 text-neutral-300 rounded px-1 py-0.5 outline-none text-center"
              value={entry.tMin}
              step={0.1}
              onChange={(e) => onChange({ tMin: parseFloat(e.target.value) || 0 })}
            />
            <span>,</span>
            <input
              type="number"
              className="w-14 bg-neutral-700 text-neutral-300 rounded px-1 py-0.5 outline-none text-center"
              value={entry.tMax}
              step={0.1}
              onChange={(e) => onChange({ tMax: parseFloat(e.target.value) || 0 })}
            />
            <span>]</span>
          </div>
        </>
      )}

      {entry.type === 'points' && (
        <div className="text-xs text-neutral-500 font-mono truncate px-1">
          {entry.expression === '__manual__' ? 'manual points' : entry.expression}
          {' '}({entry.points?.length ?? 0} pts)
        </div>
      )}
    </div>
  );
}
