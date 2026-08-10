import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

/** Each ember is thrown along `angle` for `distance`, tumbling as it goes. */
interface Ember {
  style: CSSProperties;
}

/** Embers fan out across the top half of the word: -170deg to -10deg. */
function buildEmbers(count: number): Ember[] {
  return Array.from({ length: count }, () => {
    const size = 2 + Math.random() * 3;
    return {
      style: {
        '--x': `${15 + Math.random() * 70}%`,
        '--y': `${20 + Math.random() * 60}%`,
        '--angle': `${-170 + Math.random() * 160}deg`,
        '--distance': `${18 + Math.random() * 26}px`,
        '--rotation': `${-180 + Math.random() * 360}deg`,
        '--duration': `${900 + Math.random() * 700}ms`,
        '--width': `${size}px`,
        '--height': `${size}px`,
      } as CSSProperties,
    };
  });
}

interface SparksProps {
  /** Change this to fire a fresh burst. */
  trigger: number;
  count?: number;
  children: ReactNode;
}

/** Wraps content and throws a burst of embers off it whenever `trigger` changes. */
export function Sparks({ trigger, count = 5, children }: SparksProps) {
  const reducedMotion = usePrefersReducedMotion();
  // Rebuilt per burst so every round gets fresh angles and speeds.
  const embers = useMemo(() => buildEmbers(count), [count, trigger]);

  return (
    <span className="sparks">
      {children}
      {!reducedMotion && (
        // `key` remounts the layer so the one-shot animations replay.
        <span key={trigger} aria-hidden className="sparks__layer">
          {embers.map((ember, i) => (
            <span key={i} className="sparks__spark" style={ember.style}>
              <span className="sparks__shape" />
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
