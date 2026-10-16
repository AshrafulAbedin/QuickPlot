import { useEffect, useRef, useState } from 'react';
import type { Slider } from './SliderPanel';

interface Props {
  slider: Slider;
  animating: boolean;
  onChange: (value: number) => void;
  onRangeChange: (min: number, max: number) => void;
  onStepChange?: (step: number) => void;
  onToggleAnimation: () => void;
  onLoopModeChange: (mode: 'pingpong' | 'wrap') => void;
}

function fmt(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(4).replace(/\.?0+$/, '');
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden focusable="false">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden focusable="false">
      <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
    </svg>
  );
}

function IconPingpong() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none" strokeWidth="2.2" aria-hidden focusable="false">
      <path d="M4 12h16M4 12l3.5-3.5M4 12l3.5 3.5M20 12l-3.5-3.5M20 12l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconWrap() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none" strokeWidth="2.2" aria-hidden focusable="false">
      <path d="M4 8a4 4 0 014-4h8a4 4 0 014 4v8a4 4 0 01-4 4H8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 20l-3-3M8 20l3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InlineSliderRow({
  slider, animating, onChange, onRangeChange, onStepChange, onToggleAnimation, onLoopModeChange,
}: Props) {
  const pct = slider.max === slider.min
    ? 0
    : Math.min(100, Math.max(0, ((slider.value - slider.min) / (slider.max - slider.min)) * 100));
  const loopMode = slider.loopMode ?? 'pingpong';

  // Local draft for the inline value input
  const [valueDraft, setValueDraft] = useState(fmt(slider.value));
  const editingRef = useRef(false);
  useEffect(() => {
    if (!editingRef.current) setValueDraft(fmt(slider.value));
  }, [slider.value]);

  const commitValue = () => {
    editingRef.current = false;
    const n = parseFloat(valueDraft);
    if (Number.isFinite(n)) {
      const clamped = Math.min(slider.max, Math.max(slider.min, n));
      onChange(clamped);
      setValueDraft(fmt(clamped));
    } else {
      setValueDraft(fmt(slider.value));
    }
  };

  const handleMinChange = (raw: string) => {
    const val = parseFloat(raw);
    if (Number.isFinite(val)) {
      onRangeChange(val, slider.max);
    }
  };

  const handleMaxChange = (raw: string) => {
    const val = parseFloat(raw);
    if (Number.isFinite(val)) {
      onRangeChange(slider.min, val);
    }
  };

  const handleStepChange = (raw: string) => {
    const val = parseFloat(raw);
    if (Number.isFinite(val) && val > 0 && onStepChange) {
      onStepChange(val);
    }
  };

  return (
    <div className="pt-2 pb-1.5 pl-3 pr-2 my-1 rounded-md bg-[#1d1b18]/60 border border-neutral-800/80 shadow-sm space-y-1.5 transition-colors hover:border-neutral-700/80">
      {/* Header: animation controls + label + current value */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title={animating ? 'Pause animation' : 'Play animation'}
            onClick={onToggleAnimation}
            className={[
              'w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95',
              animating
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 hover:bg-amber-400'
                : 'bg-neutral-800 text-neutral-400 hover:text-amber-300 hover:bg-neutral-700',
            ].join(' ')}
          >
            {animating ? <IconPause /> : <IconPlay />}
          </button>

          <button
            type="button"
            title={loopMode === 'pingpong' ? 'Loop mode: Ping-pong (click to switch to Wrap)' : 'Loop mode: Wrap (click to switch to Ping-pong)'}
            onClick={() => onLoopModeChange(loopMode === 'pingpong' ? 'wrap' : 'pingpong')}
            className={[
              'w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 active:scale-95',
              loopMode === 'wrap'
                ? 'text-amber-400 bg-amber-500/10 border border-amber-500/30'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800',
            ].join(' ')}
          >
            {loopMode === 'pingpong' ? <IconPingpong /> : <IconWrap />}
          </button>

          <div className="flex items-center gap-1 font-mono text-xs">
            <span className="text-amber-400 font-pixel font-bold">{slider.name}</span>
            <span className="text-neutral-500">=</span>
          </div>
        </div>

        {/* Editable current value with focus glow */}
        <input
          type="text"
          value={valueDraft}
          onFocus={() => { editingRef.current = true; }}
          onChange={(e) => setValueDraft(e.target.value)}
          onBlur={commitValue}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
            else if (e.key === 'Escape') {
              editingRef.current = false;
              setValueDraft(fmt(slider.value));
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="w-16 bg-neutral-900/90 text-neutral-200 text-xs font-mono rounded px-1.5 py-0.5 border border-neutral-700/80 outline-none text-right focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
        />
      </div>

      {/* Styled track with active gradient fill */}
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
          min={slider.min}
          max={slider.max}
          step={slider.step}
          value={slider.value}
          className="custom-range-slider"
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </div>

      {/* Range constraints: min bound, step size, max bound */}
      <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono gap-1.5 pt-0.5">
        <div className="flex items-center gap-1">
          <span className="text-neutral-500 text-[9px] uppercase tracking-wider">min</span>
          <input
            type="number"
            defaultValue={slider.min}
            key={`min-${slider.min}`}
            step={0.5}
            onBlur={(e) => handleMinChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className="w-11 bg-neutral-900/80 text-neutral-300 rounded px-1 py-0.5 border border-neutral-800 text-center outline-none focus:border-amber-400/60"
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-neutral-500 text-[9px] uppercase tracking-wider">step</span>
          <input
            type="number"
            defaultValue={slider.step}
            key={`step-${slider.step}`}
            step={0.01}
            min={0.0001}
            onBlur={(e) => handleStepChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className="w-12 bg-neutral-900/80 text-neutral-300 rounded px-1 py-0.5 border border-neutral-800 text-center outline-none focus:border-amber-400/60"
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-neutral-500 text-[9px] uppercase tracking-wider">max</span>
          <input
            type="number"
            defaultValue={slider.max}
            key={`max-${slider.max}`}
            step={0.5}
            onBlur={(e) => handleMaxChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className="w-11 bg-neutral-900/80 text-neutral-300 rounded px-1 py-0.5 border border-neutral-800 text-center outline-none focus:border-amber-400/60"
          />
        </div>
      </div>
    </div>
  );
}
