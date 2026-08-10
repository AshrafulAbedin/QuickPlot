import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * Advances through a word list on a timer, pausing entirely when the OS asks
 * for reduced motion. Returned separately from the rendering components so the
 * word and its spark burst stay on the same beat.
 */
export function useWordCycle(length: number, interval = 2600): number {
  const [index, setIndex] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion || length < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % length), interval);
    return () => window.clearInterval(id);
  }, [length, interval, reducedMotion]);

  return index;
}
