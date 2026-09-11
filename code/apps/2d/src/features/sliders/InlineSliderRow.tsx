import { useEffect, useRef, useState } from 'react';
import type { Slider } from './SliderPanel';

interface Props {
  slider: Slider;
  animating: boolean;
  onChange: (value: number) => void;
  onRangeChange: (min: number, max: number) => void;
  onToggleAnimation: () => void;
  onLoopModeChange: (mode: 'pingpong' | 'wrap') => void;
}

function fmt(v: number): string {
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
function IconPingpong() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none" strokeWidth="2" aria-hidden focusable="false">
      <path d="M4 12h16M4 12l3-3M4 12l3 3M20 12l-3-3M20 12l-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconWrap() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none" strokeWidth="2" aria-hidden focusable="false">
      <path d="M4 8a4 4 0 014-4h8a4 4 0 014 4v8a4 4 0 01-4 4H8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 20l-3-3M8 20l3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InlineSliderRow({
  slider, animating, onChange, onRangeChange, onToggleAnimation, onLoopModeChange,
}: Props) {
  const pct = slider.max === slider.min
    ? 0
    : ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  const loopMode = slider.loopMode ?? 'pingpong';

  // Local draft for the inline value input so the user can type freely
  // without every keystroke re-clamping to min/max.
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

  return (
    <div className="pt-1 pb-0.5 pl-4 pr-1 space-y-1">
      {/* label + value */}
      <div className="flex items-center gap-1.5 text-xs">
        <button
          title={animating ? 'Pause' : 'Play'}
          onClick={onToggleAnimation}
          className={[
            'shrink-0 leading-none transition-colors',
            animating ? 'text-amber-400 hover:text-amber-300' : 'text-neutral-500 hover:text-neutral-300',
          ].join(' ')}
        >
          {animating ? <IconPause /> : <IconPlay />}
        </button>

        <button
          title={loopMode === 'pingpong' ? 'Loop: ping-pong (click for wrap)' : 'Loop: wrap (click for ping-pong)'}
          onClick={() => onLoopModeChange(loopMode === 'pingpong' ? 'wrap' : 'pingpong')}
          className={[
            'shrink-0 leading-none transition-colors',
            loopMode === 'wrap' ? 'text-amber-400 hover:text-amber-300' : 'text-neutral-500 hover:text-neutral-300',
          ].join(' ')}
        >
          {loopMode === 'pingpong' ? <IconPingpong /> : <IconWrap />}
        </button>

        <span className="text-amber-300 font-pixel">{slider.name}</span>
        <span className="text-neutral-500 font-mono">=</span>
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
          className="w-16 bg-neutral-700 text-neutral-200 text-xs rounded px-1 py-0.5 font-mono outline-none text-center focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {/* track */}
      <input
        type="range"
        min={slider.min}
        max={slider.max}
        step={slider.step}
        value={slider.value}
        className="w-full accent-amber-400 h-1.5 cursor-pointer"
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />

      {/* min / bar / max */}
      <div className="flex justify-between gap-1">
        <input
          type="number"
          value={slider.min}
          step={0.5}
          className="w-12 bg-neutral-700 text-neutral-400 text-[10px] rounded px-1 py-0.5 font-mono outline-none text-center"
          onChange={(e) => onRangeChange(parseFloat(e.target.value) || slider.min, slider.max)}
        />
        <div
          className="flex-1 h-0.5 self-center rounded-full"
          style={{ background: `linear-gradient(to right, #f59e0b ${pct}%, #404040 ${pct}%)` }}
        />
        <input
          type="number"
          value={slider.max}
          step={0.5}
          className="w-12 bg-neutral-700 text-neutral-400 text-[10px] rounded px-1 py-0.5 font-mono outline-none text-center"
          onChange={(e) => onRangeChange(slider.min, parseFloat(e.target.value) || slider.max)}
        />
      </div>
    </div>
  );
}
