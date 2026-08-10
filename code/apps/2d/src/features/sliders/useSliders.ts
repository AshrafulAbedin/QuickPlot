import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { detectParameters } from '@quickplot/core';
import type { EquationEntry } from '../equations/types';
import type { Slider } from './SliderPanel';

/**
 * Steps advanced per second at speed ×1.
 *
 * The old loop added `step * 2` on every animation frame, which came out at
 * this rate on a 60 Hz display — and at double on a 120 Hz one. Expressing it
 * per second keeps ×1 looking the same as before while making the animation
 * independent of refresh rate.
 */
const STEPS_PER_SECOND = 120;

/** A long frame gap (backgrounded tab, GC pause) must not teleport the value. */
const MAX_FRAME_SECONDS = 0.1;

export function useSliders(
  equations: EquationEntry[],
  initialSliders: Record<string, Slider> = {},
) {
  const [sliders, setSliders] = useState<Record<string, Slider>>(initialSliders);
  const [animating, setAnimating] = useState<Set<string>>(new Set());
  const animDirRef = useRef<Record<string, 1 | -1>>({});
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Auto-detect free parameters from all equations
  const paramKey = useMemo(() => {
    const all = new Set<string>();
    equations.forEach(eq => {
      detectParameters(eq.expression).forEach(p => all.add(p));
      if (eq.expressionY) detectParameters(eq.expressionY).forEach(p => all.add(p));
    });
    return Array.from(all).sort().join(',');
  }, [equations]);

  useEffect(() => {
    const params = new Set(paramKey.split(',').filter(Boolean));
    setSliders(prev => {
      const next: Record<string, Slider> = {};
      let changed = false;
      params.forEach(p => {
        if (prev[p]) { next[p] = prev[p]; }
        else { next[p] = { name: p, value: 1, min: -5, max: 5, step: 0.05, speed: 1 }; changed = true; }
      });
      if (!changed && Object.keys(prev).length === Object.keys(next).length) return prev;
      return next;
    });
  }, [paramKey]);

  // Single RAF loop for all animated sliders
  useEffect(() => {
    if (animating.size === 0) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimeRef.current = null;
      return;
    }

    const tick = (now: number) => {
      // First frame after starting has no previous timestamp to measure against.
      const prevTime = lastTimeRef.current;
      lastTimeRef.current = now;
      const dt = prevTime === null
        ? 0
        : Math.min((now - prevTime) / 1000, MAX_FRAME_SECONDS);

      if (dt > 0) {
        setSliders(prev => {
          const next = { ...prev };
          animating.forEach(name => {
            const s = prev[name];
            if (!s) return;
            const dir = animDirRef.current[name] ?? 1;
            const delta = s.step * STEPS_PER_SECOND * (s.speed ?? 1) * dt;
            const newVal = s.value + dir * delta;
            if (newVal >= s.max) {
              animDirRef.current[name] = -1;
              next[name] = { ...s, value: s.max };
            } else if (newVal <= s.min) {
              animDirRef.current[name] = 1;
              next[name] = { ...s, value: s.min };
            } else {
              next[name] = { ...s, value: newVal };
            }
          });
          return next;
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
    };
  }, [animating]);

  const sliderScope = useMemo(
    () => Object.fromEntries(Object.values(sliders).map(s => [s.name, s.value])),
    [sliders],
  );

  const onChange = useCallback((name: string, value: number) => {
    setSliders(prev => ({ ...prev, [name]: { ...prev[name], value } }));
  }, []);

  const onRangeChange = useCallback((name: string, min: number, max: number) => {
    const step = parseFloat(((max - min) / 200).toPrecision(1));
    setSliders(prev => ({ ...prev, [name]: { ...prev[name], min, max, step: Math.max(step, 1e-6) } }));
  }, []);

  const onSpeedChange = useCallback((name: string, speed: number) => {
    setSliders(prev => ({ ...prev, [name]: { ...prev[name], speed } }));
  }, []);

  const toggleAnimation = useCallback((name: string) => {
    setAnimating(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        if (animDirRef.current[name] === undefined) animDirRef.current[name] = 1;
        next.add(name);
      }
      return next;
    });
  }, []);

  return {
    sliders, setSliders, sliderScope, animating,
    onChange, onRangeChange, onSpeedChange, toggleAnimation,
  };
}
