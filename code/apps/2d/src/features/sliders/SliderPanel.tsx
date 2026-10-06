interface Slider {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Animation rate multiplier. Undefined is treated as ×1. */
  speed?: number;
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
  animating?: Set<string>;
  onToggleAnimation?: (name: string) => void;
  onSpeedChange?: (name: string, speed: number) => void;
}

export function SliderPanel({
  sliders, onChange, onRangeChange, animating, onToggleAnimation, onSpeedChange,
}: Props) {
  const names = Object.keys(sliders).sort();
  if (!names.length) return null;

  return (
    <div className="px-3 pt-1 pb-3 border-t border-[#161412]">
      <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-3 mt-2">PARAMETERS</p>

      <div className="space-y-3">
        {names.map(name => {
          const s = sliders[name];
          const pct = ((s.value - s.min) / (s.max - s.min)) * 100;
          const isAnimating = animating?.has(name) ?? false;
          const speed = s.speed ?? 1;

          return (
            <div key={name}>
              {/* label + animate + speed + value */}
              <div className="flex justify-between items-center mb-1 gap-1">
                <span className="text-amber-300 font-pixel text-xs shrink-0">{name}</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  {onToggleAnimation && (
                    <button
                      title={isAnimating ? 'Pause' : 'Animate'}
                      onClick={() => onToggleAnimation(name)}
                      className={[
                        'text-xs transition-colors leading-none shrink-0',
                        isAnimating ? 'text-amber-400 hover:text-amber-300' : 'text-neutral-600 hover:text-neutral-400',
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
                      className={[
                        'shrink-0 rounded bg-neutral-700 px-1 py-0.5 font-mono text-[10px]',
                        'outline-none cursor-pointer transition-colors hover:bg-neutral-600',
                        speed === 1 ? 'text-neutral-400' : 'text-amber-300',
                      ].join(' ')}
                    >
                      {SPEEDS.map(sp => (
                        <option key={sp} value={sp}>×{sp}</option>
                      ))}
                    </select>
                  )}

                  <span className="text-neutral-300 text-xs font-mono truncate">
                    = {fmtVal(s.value)}
                  </span>
                </div>
              </div>

              {/* range slider */}
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={s.value}
                className="w-full accent-amber-400 h-1.5 cursor-pointer"
                onChange={(e) => onChange(name, parseFloat(e.target.value))}
              />

              {/* min / max editors */}
              <div className="flex justify-between mt-0.5 gap-1">
                <input
                  type="number"
                  className="w-12 bg-neutral-700 text-neutral-400 text-xs rounded px-1 py-0.5 font-mono outline-none text-center"
                  value={s.min}
                  step={0.5}
                  onChange={(e) => onRangeChange(name, parseFloat(e.target.value) || s.min, s.max)}
                />
                <div
                  className="flex-1 h-0.5 self-center rounded-full bg-neutral-600 relative"
                  style={{ background: `linear-gradient(to right, #f59e0b ${pct}%, #404040 ${pct}%)` }}
                />
                <input
                  type="number"
                  className="w-12 bg-neutral-700 text-neutral-400 text-xs rounded px-1 py-0.5 font-mono outline-none text-center"
                  value={s.max}
                  step={0.5}
                  onChange={(e) => onRangeChange(name, s.min, parseFloat(e.target.value) || s.max)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { Slider };
