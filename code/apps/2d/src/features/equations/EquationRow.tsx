import { useRef, useEffect, useState } from 'react';
import type { EquationEntry, EquationType } from './types';
import { detectEquationType } from './detectType';
import { InlineSliderRow } from '../sliders/InlineSliderRow';
import type { Slider } from '../sliders/SliderPanel';
import { ColorPalettePopover } from './ColorPalettePopover';

interface Props {
  entry: EquationEntry;
  index?: number;
  autoFocus?: boolean;
  onChange: (patch: Partial<EquationEntry>) => void;
  onDelete: () => void;
  onEnter?: () => void;
  onTrace?: () => void;
  isTracing?: boolean;
  /** Sliders whose parameter names appear in this equation. Rendered inline. */
  inlineSliders?: Slider[];
  animating?: Set<string>;
  onSliderChange?: (name: string, value: number) => void;
  onSliderRangeChange?: (name: string, min: number, max: number) => void;
  onSliderStepChange?: (name: string, step: number) => void;
  onToggleSliderAnimation?: (name: string) => void;
  onSliderLoopModeChange?: (name: string, mode: 'pingpong' | 'wrap') => void;
  /**
   * Called on every input mount so the on-screen calculator can target the
   * last-focused equation input without racing `document.activeElement`.
   */
  registerInput?: (el: HTMLInputElement | null) => (() => void) | void;
}

const TYPE_LABELS: Record<EquationType, string> = {
  cartesian:  'y =',
  polar:      'r =',
  parametric: 'parametric',
  implicit:   'f(x,y)',
  points:     'data',
};

const TYPE_BADGE: Record<EquationType, string> = {
  cartesian:  'y=',
  polar:      'r=',
  parametric: 'xy',
  implicit:   'f=',
  points:     'pts',
};

const TYPE_OPTIONS: EquationType[] = ['cartesian', 'polar', 'parametric', 'implicit', 'points'];

/**
 * When a row is in auto-detect mode we render a single input; its value
 * comes from `rawInput` when present, otherwise it is reconstructed from
 * the stored type + expression so hash-loaded entries display cleanly.
 */
function reconstructInput(entry: EquationEntry): string {
  if (entry.rawInput !== undefined) return entry.rawInput;
  switch (entry.type) {
    case 'polar':
      return entry.expression ? `r = ${entry.expression}` : '';
    case 'parametric':
      return `(${entry.expression || ''}, ${entry.expressionY || ''})`;
    case 'points':
      if (entry.expression && entry.expression !== '__manual__') return entry.expression;
      if (entry.points && entry.points.length > 0) {
        return entry.points.map(p => `(${p.x}, ${p.y})`).join(', ');
      }
      return '';
    default:
      return entry.expression;
  }
}

function Inp({
  value,
  placeholder,
  error,
  autoFocus,
  onChange,
  onEnter,
  prefix,
  register,
}: {
  value: string;
  placeholder: string;
  error: string | null | undefined;
  autoFocus?: boolean;
  onChange: (v: string) => void;
  onEnter?: () => void;
  prefix?: string;
  register?: (el: HTMLInputElement | null) => (() => void) | void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  useEffect(() => {
    if (!register) return;
    const cleanup = register(ref.current);
    return typeof cleanup === 'function' ? cleanup : undefined;
  }, [register]);

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
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onEnter?.();
            }
          }}
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

export function EquationRow({
  entry, index, autoFocus, onChange, onDelete, onEnter, onTrace, isTracing,
  inlineSliders, animating,
  onSliderChange, onSliderRangeChange, onSliderStepChange, onToggleSliderAnimation, onSliderLoopModeChange,
  registerInput,
}: Props) {
  const [showPalette, setShowPalette] = useState(false);
  // `autoDetect` defaults to true so existing entries (loaded from hash /
  // localStorage) opt in without a migration.
  const autoDetect = entry.autoDetect !== false;

  const onUnifiedChange = (raw: string) => {
    const det = detectEquationType(raw);
    const patch: Partial<EquationEntry> = {
      rawInput: raw,
      type: det.type,
      expression: det.expression,
    };
    // Keep expressionY consistent with detected shape; clearing it when we
    // leave parametric prevents a stale y-expression from silently plotting.
    patch.expressionY = det.type === 'parametric' ? (det.expressionY ?? '') : undefined;
    if (det.type === 'points') patch.points = det.points;
    onChange(patch);
  };

  return (
    <div className="space-y-1 pb-2 border-b border-[#161412]/50 last:border-0">
      {/* row 1: index + color + type badge/select + actions + delete */}
      <div className="flex items-center gap-1.5">
        {/* Desmos-style row index */}
        {index !== undefined && (
          <span className="text-[11px] font-mono font-bold text-neutral-500 w-3.5 text-center shrink-0 select-none">
            {index + 1}
          </span>
        )}

        {/* modern color swatch with palette popover */}
        <div className="relative shrink-0">
          <button
            title="Choose curve colour"
            className={[
              'w-3.5 h-3.5 rounded-full shrink-0 border border-white/40 hover:scale-115 active:scale-95 transition-all shadow-sm ring-1',
              showPalette ? 'ring-2 ring-amber-400 scale-115 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'ring-white/10 hover:ring-amber-400/50',
            ].join(' ')}
            style={{ background: entry.color }}
            onClick={() => setShowPalette(v => !v)}
          />
          {showPalette && (
            <ColorPalettePopover
              color={entry.color}
              onChange={(color) => onChange({ color })}
              onClose={() => setShowPalette(false)}
            />
          )}
        </div>

        {/* type: auto-detect shows a small badge; manual mode shows a select */}
        {autoDetect ? (
          <span
            title={`Auto-detected: ${TYPE_LABELS[entry.type]}`}
            className="text-neutral-400 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md border border-neutral-700/80 bg-neutral-800/80 shadow-xs"
          >
            {TYPE_BADGE[entry.type]}
          </span>
        ) : entry.type !== 'points' ? (
          <select
            value={entry.type}
            className="bg-neutral-800 border border-neutral-700/80 text-neutral-300 text-xs rounded-md px-1.5 py-0.5 outline-none cursor-pointer hover:border-amber-400/40 transition-colors"
            onChange={(e) => onChange({ type: e.target.value as EquationType, rawInput: undefined })}
          >
            {TYPE_OPTIONS.filter(t => t !== 'points').map(t => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        ) : (
          <span className="text-neutral-500 text-xs font-pixel">data</span>
        )}

        <div className="flex-1" />

        {/* auto/manual mode toggle (gear) */}
        {entry.type !== 'points' && (
          <button
            title={autoDetect ? 'Auto-detection active (click to lock type)' : 'Manual type locked (click for auto)'}
            onClick={() => onChange({
              autoDetect: !autoDetect,
              rawInput: undefined,
            })}
            className={[
              'w-6 h-6 rounded-md flex items-center justify-center transition-all shadow-xs active:scale-90',
              autoDetect
                ? 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/80'
                : 'text-amber-400 bg-amber-500/10 border border-amber-500/30',
            ].join(' ')}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}

        {/* trace animation (non-points curves only) */}
        {entry.type !== 'points' && onTrace && (
          <button
            title={isTracing ? 'Tracing…' : 'Animate curve drawing'}
            onClick={onTrace}
            className={[
              'w-6 h-6 rounded-md flex items-center justify-center transition-all shadow-xs active:scale-90',
              isTracing
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                : 'text-neutral-500 hover:text-amber-300 hover:bg-neutral-800/80',
            ].join(' ')}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}

        {/* derivative overlay (cartesian only) */}
        {entry.type === 'cartesian' && (
          <button
            title="Toggle derivative (f′) overlay"
            className={[
              'w-6 h-6 rounded-md flex items-center justify-center transition-all font-serif font-bold text-xs shadow-xs active:scale-90',
              entry.showDerivative
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/80',
            ].join(' ')}
            onClick={() => onChange({ showDerivative: !entry.showDerivative })}
          >
            f′
          </button>
        )}

        {/* visibility */}
        <button
          title={entry.visible ? 'Hide from canvas' : 'Show on canvas'}
          className="w-6 h-6 rounded-md flex items-center justify-center transition-all text-neutral-400 hover:bg-neutral-800/80 active:scale-90"
          onClick={() => onChange({ visible: !entry.visible })}
        >
          {entry.visible ? (
            <span
              className="w-3 h-3 rounded-full border border-white/30 shadow-sm"
              style={{ background: entry.color }}
            />
          ) : (
            <span className="w-3 h-3 rounded-full border-2 border-neutral-600 bg-transparent" />
          )}
        </button>

        {/* delete */}
        <button
          title="Delete equation"
          className="w-6 h-6 rounded-md flex items-center justify-center text-neutral-500 hover:text-red-400 hover:bg-red-500/15 transition-all active:scale-90"
          onClick={onDelete}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* row 2: expression(s) */}
      {autoDetect && (entry.type !== 'points' || entry.rawInput !== undefined || (!entry.expression && !entry.points?.length)) ? (
        <>
          <Inp
            value={reconstructInput(entry)}
            placeholder="y = x^2, r = 1+cos(t), (cos(t), sin(t)), x^2+y^2=1, (1,2)"
            error={entry.error || entry.errorY || null}
            autoFocus={autoFocus}
            onChange={onUnifiedChange}
            onEnter={onEnter}
            register={registerInput}
          />
          {entry.type === 'parametric' && (
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
          )}
        </>
      ) : entry.type === 'points' && entry.rawInput === undefined && entry.expression ? (
        <div className="text-xs text-neutral-500 font-mono truncate px-1">
          {entry.expression === '__manual__' ? 'manual points' : entry.expression}
          {' '}({entry.points?.length ?? 0} pts)
        </div>
      ) : (
        <>
          {entry.type === 'cartesian' && (
            <Inp
              value={entry.expression}
              placeholder="Input"
              error={entry.error}
              autoFocus={autoFocus}
              onChange={(v) => onChange({ expression: v, rawInput: undefined })}
              onEnter={onEnter}
              register={registerInput}
            />
          )}

          {entry.type === 'polar' && (
            <Inp
              value={entry.expression}
              placeholder="2 + cos(t)"
              error={entry.error}
              autoFocus={autoFocus}
              onChange={(v) => onChange({ expression: v, rawInput: undefined })}
              onEnter={onEnter}
              register={registerInput}
            />
          )}

          {entry.type === 'implicit' && (
            <Inp
              value={entry.expression}
              placeholder="x^2 + y^2 = 25"
              error={entry.error}
              autoFocus={autoFocus}
              onChange={(v) => onChange({ expression: v, rawInput: undefined })}
              onEnter={onEnter}
              register={registerInput}
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
                onChange={(v) => onChange({ expression: v, rawInput: undefined })}
                onEnter={onEnter}
                register={registerInput}
              />
              <Inp
                value={entry.expressionY ?? ''}
                placeholder="sin(t)"
                error={entry.errorY}
                prefix="y ="
                onChange={(v) => onChange({ expressionY: v, rawInput: undefined })}
                onEnter={onEnter}
                register={registerInput}
              />
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
        </>
      )}

      {inlineSliders && inlineSliders.length > 0
        && onSliderChange && onSliderRangeChange
        && onToggleSliderAnimation && onSliderLoopModeChange && (
        <div className="mt-1 border-l border-neutral-700/60">
          {inlineSliders.map(s => (
            <InlineSliderRow
              key={s.name}
              slider={s}
              animating={animating?.has(s.name) ?? false}
              onChange={(v) => onSliderChange(s.name, v)}
              onRangeChange={(mn, mx) => onSliderRangeChange(s.name, mn, mx)}
              onStepChange={onSliderStepChange ? (st) => onSliderStepChange(s.name, st) : undefined}
              onToggleAnimation={() => onToggleSliderAnimation(s.name)}
              onLoopModeChange={(m) => onSliderLoopModeChange(s.name, m)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
