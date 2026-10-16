import { useEffect, useRef } from 'react';
import { SURFACE_THEMES, type SurfaceTheme } from '@quickplot/renderer-3d';

interface Props {
  current: SurfaceTheme;
  onChange: (theme: SurfaceTheme) => void;
  onClose: () => void;
}

export function ThemePicker({ current, onChange, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={[
        'absolute top-full right-0 mt-2 z-50 w-64 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl select-none',
        'bg-neutral-900/95 border-neutral-700/80 ring-1 ring-white/10 shadow-black/80',
        'animate-in fade-in zoom-in-95 duration-150',
      ].join(' ')}
      style={{ filter: 'drop-shadow(0 20px 25px rgba(0,0,0,0.6))' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-neutral-800">
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a10 10 0 0 1 0 20v-20z" fill="currentColor" fillOpacity="0.4" />
          </svg>
          <span className="font-pixel text-amber-400 text-xs tracking-widest">3D THEME</span>
        </div>
        <button
          onClick={onClose}
          className="w-5 h-5 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors text-xs leading-none"
          title="Close theme picker"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {Object.values(SURFACE_THEMES).map(theme => {
          const isSelected = current.name === theme.name;
          return (
            <button
              key={theme.name}
              title={`Switch to ${theme.name} theme`}
              onClick={() => { onChange(theme); onClose(); }}
              className={[
                'relative rounded-xl border p-2 transition-all duration-150 flex flex-col gap-2 group text-left',
                isSelected
                  ? 'border-amber-400/90 ring-2 ring-amber-400/40 bg-neutral-800/90 shadow-lg scale-[1.02]'
                  : 'border-neutral-700/80 hover:border-neutral-500 bg-neutral-800/50 hover:bg-neutral-800/80 hover:scale-[1.02]',
              ].join(' ')}
            >
              {/* Miniature 3D scene preview */}
              <div
                className="w-full h-11 rounded-lg border border-black/20 overflow-hidden relative shadow-inner flex items-center justify-center"
                style={{ background: theme.background }}
              >
                {/* 3D wireframe / axes preview */}
                <svg className="w-full h-full absolute inset-0 opacity-80" viewBox="0 0 100 40">
                  <line x1="50" y1="20" x2="80" y2="35" stroke={theme.axisColor} strokeWidth="1.5" />
                  <line x1="50" y1="20" x2="20" y2="35" stroke={theme.axisColor} strokeWidth="1.5" />
                  <line x1="50" y1="20" x2="50" y2="4" stroke={theme.axisColor} strokeWidth="1.5" />
                </svg>

                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shadow-md">
                    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Theme name & color dot */}
              <div className="flex items-center justify-between px-0.5">
                <span className="font-mono text-xs font-semibold text-neutral-200 group-hover:text-amber-300 transition-colors">
                  {theme.name}
                </span>
                <span
                  className="w-2 h-2 rounded-full border border-white/20 shadow-xs"
                  style={{ background: theme.axisColor }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
