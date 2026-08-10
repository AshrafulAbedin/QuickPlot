interface Slider {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

function fmtVal(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(4).replace(/\.?0+$/, '');
}

interface Props {
  sliders: Record<string, Slider>;
  onChange: (name: string, value: number) => void;
  onRangeChange: (name: string, min: number, max: number) => void;
  animating?: Set<string>;
  onToggleAnimation?: (name: string) => void;
}

export function SliderPanel({ sliders, onChange, onRangeChange, animating, onToggleAnimation }: Props) {
  const names = Object.keys(sliders).sort();
  if (!names.length) return null;

  return (
    <div className="px-3 pt-1 pb-3 border-t border-neutral-700">
      <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-3 mt-2">PARAMETERS</p>

      <div className="space-y-3">
        {names.map(name => {
          const s = sliders[name];
          const pct = ((s.value - s.min) / (s.max - s.min)) * 100;
          const isAnimating = animating?.has(name) ?? false;

          return (
            <div key={name}>
              {/* label + animate + value */}
              <div className="flex justify-between items-center mb-1">
                <span className="text-amber-300 font-pixel text-xs">{name}</span>
                <div className="flex items-center gap-1.5">
                  {onToggleAnimation && (
                    <button
                      title={isAnimating ? 'Pause' : 'Animate'}
                      onClick={() => onToggleAnimation(name)}
                      className={[
                        'text-xs transition-colors leading-none',
                        isAnimating ? 'text-amber-400 hover:text-amber-300' : 'text-neutral-600 hover:text-neutral-400',
                      ].join(' ')}
                    >
                      {isAnimating ? '⏸' : '▶'}
                    </button>
                  )}
                  <span className="text-neutral-300 text-xs font-mono">
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
