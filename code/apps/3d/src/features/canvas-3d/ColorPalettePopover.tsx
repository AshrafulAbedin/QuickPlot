import { useEffect, useRef, useState } from 'react';

export const CURATED_PALETTE = [
  { name: 'Red', hex: '#EF4444' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Green', hex: '#10B981' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Lime', hex: '#84CC16' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Rose', hex: '#F43F5E' },
];

interface Props {
  color: string;
  onChange: (color: string) => void;
  onClose: () => void;
}

export function ColorPalettePopover({ color, onChange, onClose }: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [hexInput, setHexInput] = useState(color);
  const [copied, setCopied] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);

  useEffect(() => {
    if (popoverRef.current) {
      const rect = popoverRef.current.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - 20) {
        setOpenUpward(true);
      }
    }
  }, []);

  useEffect(() => {
    setHexInput(color);
  }, [color]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleHexChange = (val: string) => {
    let formatted = val;
    if (!formatted.startsWith('#') && formatted.length > 0) {
      formatted = '#' + formatted;
    }
    setHexInput(formatted);
    if (/^#[0-9A-Fa-f]{6}$/.test(formatted)) {
      onChange(formatted);
    }
  };

  const copyHex = async () => {
    try {
      await navigator.clipboard.writeText(color);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  const isCurrent = (hex: string) => hex.toLowerCase() === color.toLowerCase();

  return (
    <div
      ref={popoverRef}
      className={[
        'absolute left-0 z-50 w-64 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl select-none',
        'bg-neutral-900/95 border-neutral-700/80 ring-1 ring-white/10 shadow-black/80',
        openUpward ? 'bottom-full mb-2 origin-bottom-left' : 'top-full mt-2 origin-top-left',
        'transition-all duration-150',
      ].join(' ')}
      style={{ filter: 'drop-shadow(0 20px 25px rgba(0,0,0,0.6))' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-neutral-800">
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a7 7 0 0 0-7 7c0 2 1.5 3 2.5 4s1.5 2 1.5 3.5a3 3 0 0 0 6 0c0-1.5.5-2.5 1.5-3.5s2.5-2 2.5-4a7 7 0 0 0-7-7z" />
          </svg>
          <span className="font-pixel text-amber-400 text-xs tracking-widest">PALETTE</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Active color preview pill */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-800/90 border border-neutral-700/60">
            <span
              className="w-2.5 h-2.5 rounded-full shadow-sm"
              style={{ background: color }}
            />
            <span className="font-mono text-[10px] text-neutral-300 font-semibold uppercase">
              {color}
            </span>
          </div>

          <button
            title="Close palette"
            onClick={onClose}
            className="w-5 h-5 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors text-xs leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Preset Swatches Grid */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {CURATED_PALETTE.map(({ name, hex }) => {
          const active = isCurrent(hex);
          return (
            <button
              key={hex}
              title={`${name} (${hex})`}
              onClick={() => {
                onChange(hex);
                setHexInput(hex);
              }}
              style={{ background: hex }}
              className={[
                'w-11 h-8 rounded-lg transition-all duration-150 flex items-center justify-center shadow-md',
                'hover:scale-105 active:scale-95 group relative',
                active
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 shadow-lg scale-105 z-10'
                  : 'hover:ring-1 hover:ring-white/50 opacity-90 hover:opacity-100',
              ].join(' ')}
            >
              {active ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Color Input & Eyedropper Row */}
      <div className="pt-2.5 border-t border-neutral-800 flex items-center gap-2">
        {/* Rainbow / native picker button */}
        <button
          title="Open system color wheel"
          onClick={() => colorInputRef.current?.click()}
          className="relative w-8 h-8 rounded-lg border border-neutral-700/80 hover:border-amber-400/60 p-0.5 shadow-sm active:scale-95 transition-all overflow-hidden shrink-0 group"
          style={{
            background: 'conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
          }}
        >
          <div className="w-full h-full rounded flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white drop-shadow" fill="currentColor">
              <path d="M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z" />
            </svg>
          </div>
        </button>
        <input
          ref={colorInputRef}
          type="color"
          className="sr-only"
          value={color}
          onChange={(e) => {
            onChange(e.target.value);
            setHexInput(e.target.value);
          }}
        />

        {/* Custom Hex input */}
        <div className="flex-1 min-w-0 relative">
          <input
            type="text"
            spellCheck={false}
            autoComplete="off"
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
            placeholder="#3B82F6"
            className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-800/90 border border-neutral-700/80 hover:border-neutral-600 focus:border-amber-400 text-neutral-200 font-mono text-xs outline-none transition-colors uppercase"
            maxLength={7}
          />
        </div>

        {/* Copy hex button */}
        <button
          title="Copy hex code"
          onClick={copyHex}
          className={[
            'h-8 px-2.5 rounded-lg border text-xs font-mono transition-all flex items-center justify-center gap-1 active:scale-95 shrink-0',
            copied
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-500/10'
              : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-amber-300 border-neutral-700/80',
          ].join(' ')}
        >
          {copied ? (
            <svg viewBox="0 0 24 24" className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
