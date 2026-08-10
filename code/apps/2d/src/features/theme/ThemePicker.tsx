import { useEffect, useRef } from 'react';
import { THEMES, type CanvasTheme } from '@quickplot/renderer';

interface Props {
  current: CanvasTheme;
  onChange: (theme: CanvasTheme) => void;
  onClose: () => void;
}

export function ThemePicker({ current, onChange, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-1 z-50 bg-neutral-800 border border-neutral-600 rounded-lg p-3 shadow-2xl"
      style={{ minWidth: '160px' }}
    >
      <p className="font-pixel text-neutral-400 text-xs tracking-widest mb-3">THEME</p>
      <div className="grid grid-cols-3 gap-2">
        {Object.values(THEMES).map(theme => (
          <button
            key={theme.name}
            title={theme.name}
            onClick={() => { onChange(theme); onClose(); }}
            className={[
              'w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 flex items-end justify-center pb-1',
              current.name === theme.name
                ? 'border-amber-400 scale-105'
                : 'border-neutral-600 hover:border-neutral-400',
            ].join(' ')}
            style={{ background: theme.bg }}
          >
            <span
              className="text-[7px] font-pixel leading-none"
              style={{ color: theme.label }}
            >
              {theme.name.slice(0, 2).toUpperCase()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
