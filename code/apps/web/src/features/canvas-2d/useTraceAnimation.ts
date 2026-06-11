import { useState, useRef, useEffect, useCallback } from 'react';

export function useTraceAnimation() {
  const [activeTraces, setActiveTraces] = useState<Set<string>>(new Set());
  const progressRef = useRef<Record<string, number>>({});
  const [traceSnap, setTraceSnap] = useState<Record<string, number>>({});
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeTraces.size === 0) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const tick = () => {
      const done: string[] = [];
      activeTraces.forEach(id => {
        const p = Math.min(1, (progressRef.current[id] ?? 0) + 1 / 160);
        progressRef.current[id] = p;
        if (p >= 1) done.push(id);
      });
      setTraceSnap({ ...progressRef.current });
      if (done.length > 0) {
        setActiveTraces(prev => {
          const next = new Set(prev);
          done.forEach(id => next.delete(id));
          return next;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [activeTraces]);

  const startTrace = useCallback((id: string) => {
    progressRef.current[id] = 0;
    setTraceSnap(prev => ({ ...prev, [id]: 0 }));
    setActiveTraces(prev => new Set([...prev, id]));
  }, []);

  return { activeTraces, traceSnap, startTrace };
}
