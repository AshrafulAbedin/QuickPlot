interface Slider {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Animation rate multiplier. Undefined is treated as ×1. */
  speed?: number;
  /**
   * Loop behaviour when the animated value reaches a bound:
   *  - `pingpong` (default): reverse direction.
   *  - `wrap`: jump to the opposite bound.
   */
  loopMode?: 'pingpong' | 'wrap';
}

/** Multipliers offered in the speed dropdown. */
const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

function fmtVal(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(4).replace(/\.?0+$/, '');
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden focusable="false">
      <path d="M7 4l12 8-12 8V4z" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden focusable="false">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );
}

interface Props {
  sliders: Record<string, Slider>;
  onChange: (name: string, value: number) => void;
  onRangeChange: (name: string, min: number, max: number) => void;
  onStepChange?: (name: string, step: number) => void;
  animating?: Set<string>;
  onToggleAnimation?: (name: string) => void;
  onSpeedChange?: (name: string, speed: number) => void;
}

export function SliderPanel({
  sliders, onChange, onRangeChange, onStepChange, animating, onToggleAnimation, onSpeedChange,
}: Props) {
  const names = Object.keys(sliders).sort();
  if (!names.length) return null;

  return (
    <div className="px-3 pt-2 pb-3 border-t border-[#161412]">
      <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-2.5">PARAMETERS</p>

      <div className="space-y-2.5">
        {names.map(name => {
          const s = sliders[name];
          const pct = s.max === s.min
            ? 0
            : Math.min(100, Math.max(0, ((s.value - s.min) / (s.max - s.min)) * 100));
          const isAnimating = animating?.has(name) ?? false;
          const speed = s.speed ?? 1;

          return (
            <div
              key={name}
              className="pt-2 pb-1.5 px-3 rounded-md bg-[#1d1b18]/60 border border-neutral-800/80 shadow-sm space-y-1.5 transition-colors hover:border-neutral-700/80"
            >
              {/* Header: animation + speed + label + value */}
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5">
                  {onToggleAnimation && (
                    <button
                      type="button"
                      title={isAnimating ? 'Pause animation' : 'Play animation'}
                      onClick={() => onToggleAnimation(name)}
                      className={[
                        'w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95',
                        isAnimating
                          ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 hover:bg-amber-400'
                          : 'bg-neutral-800 text-neutral-400 hover:text-amber-300 hover:bg-neutral-700',
                      ].join(' ')}
                    >
                      {isAnimating ? <IconPause /> : <IconPlay />}
                    </button>
                  )}

                  {onToggleAnimation && onSpeedChange && (
                    <select
                      title={`Animation speed for ${name}`}
                      aria-label={`Animation speed for ${name}`}
                      value={speed}
                      onChange={(e) => onSpeedChange(name, parseFloat(e.target.value))}
                      className="shrink-0 rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] text-amber-300 border border-neutral-700/80 outline-none cursor-pointer transition-colors hover:bg-neutral-700"
                    >
                      {SPEEDS.map(sp => (
                        <option key={sp} value={sp}>×{sp}</option>
                      ))}
                    </select>
                  )}

                  <div className="flex items-center gap-1 font-mono text-xs">
                    <span className="text-amber-400 font-pixel font-bold">{name}</span>
                    <span className="text-neutral-500">=</span>
                  </div>
                </div>

                <span className="text-neutral-200 text-xs font-mono font-medium">
                  {fmtVal(s.value)}
                </span>
              </div>

              {/* Styled track */}
              <div className="relative flex items-center py-0.5">
                <div
                  className="absolute left-0 h-1.5 rounded-full pointer-events-none transition-all"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                  }}
                />
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={s.value}
                  className="custom-range-slider"
                  onChange={(e) => onChange(name, parseFloat(e.target.value))}
                />
              </div>

              {/* Range constraints: min, step, max */}
              <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono gap-1.5 pt-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-neutral-500 text-[9px] uppercase tracking-wider">min</span>
                  <input
                    type="number"
                    defaultValue={s.min}
                    key={`min-${s.min}`}
                    step={0.5}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (Number.isFinite(val)) onRangeChange(name, val, s.max);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="w-11 bg-neutral-900/80 text-neutral-300 rounded px-1 py-0.5 border border-neutral-800 text-center outline-none focus:border-amber-400/60"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-neutral-500 text-[9px] uppercase tracking-wider">step</span>
                  <input
                    type="number"
                    defaultValue={s.step}
                    key={`step-${s.step}`}
                    step={0.01}
                    min={0.0001}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (Number.isFinite(val) && val > 0 && onStepChange) onStepChange(name, val);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="w-12 bg-neutral-900/80 text-neutral-300 rounded px-1 py-0.5 border border-neutral-800 text-center outline-none focus:border-amber-400/60"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-neutral-500 text-[9px] uppercase tracking-wider">max</span>
                  <input
                    type="number"
                    defaultValue={s.max}
                    key={`max-${s.max}`}
                    step={0.5}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (Number.isFinite(val)) onRangeChange(name, s.min, val);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="w-11 bg-neutral-900/80 text-neutral-300 rounded px-1 py-0.5 border border-neutral-800 text-center outline-none focus:border-amber-400/60"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { Slider };
