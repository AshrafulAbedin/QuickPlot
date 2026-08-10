import { useState, useRef, useEffect, useCallback } from 'react';

// Smooth cubic easing (ease-in-out) for organic manim-style curve tracing
function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function useTraceAnimation() {
  const [activeTraces, setActiveTraces] = useState<Set<string>>(new Set());
  const progressRef = useRef<Record<string, number>>({});
  const startTimeRef = useRef<Record<string, number>>({});
  const [traceSnap, setTraceSnap] = useState<Record<string, number>>({});
  const rafRef = useRef<number | null>(null);

  const DURATION_MS = 1400; // 1.4 seconds smooth trace animation

  useEffect(() => {
    if (activeTraces.size === 0) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const tick = (now: number) => {
      const done: string[] = [];
      const updated: Record<string, number> = {};

      activeTraces.forEach(id => {
        if (!startTimeRef.current[id]) {
          startTimeRef.current[id] = now;
        }
        const elapsed = now - startTimeRef.current[id];
        const rawProgress = Math.min(1, elapsed / DURATION_MS);
        const easedProgress = easeInOutCubic(rawProgress);
        
        progressRef.current[id] = easedProgress;
        updated[id] = easedProgress;

        if (rawProgress >= 1) done.push(id);
      });

      setTraceSnap(prev => ({ ...prev, ...updated }));

      if (done.length > 0) {
        setActiveTraces(prev => {
          const next = new Set(prev);
          done.forEach(id => {
            next.delete(id);
            delete startTimeRef.current[id];
          });
          return next;
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [activeTraces]);

  const startTrace = useCallback((id: string) => {
    delete startTimeRef.current[id];
    progressRef.current[id] = 0;
    setTraceSnap(prev => ({ ...prev, [id]: 0 }));
    setActiveTraces(prev => new Set([...prev, id]));
  }, []);

  return { activeTraces, traceSnap, startTrace };
}
