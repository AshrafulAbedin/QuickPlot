import { useState, useCallback } from 'react';
import { validateExpression, parseWithScope, normalizeImplicit } from '@quickplot/core';
import type { PlotCurve } from '@quickplot/renderer';
import type { EquationEntry, EquationType } from './types';

const PALETTE = [
  '#E05252', '#4A9EE0', '#52C77C', '#E0A030',
  '#B860D0', '#E07850', '#50C8D0', '#A8C020',
  '#F06090', '#70D060',
];

let _id = 0;
export const uid = () => String(++_id);

export function toCurve(eq: EquationEntry, scope: Record<string, number>): PlotCurve | null {
  if (!eq.visible) return null;
  try {
    switch (eq.type) {
      case 'cartesian': {
        if (!eq.expression.trim() || eq.error) return null;
        const fn = parseWithScope(eq.expression);
        return { kind: 'cartesian', fn: (x) => fn({ ...scope, x }), color: eq.color, label: eq.expression };
      }
      case 'polar': {
        if (!eq.expression.trim() || eq.error) return null;
        const fn = parseWithScope(eq.expression);
        return {
          kind: 'polar',
          fn: (t) => fn({ ...scope, t }),
          thetaMin: eq.tMin, thetaMax: eq.tMax,
          color: eq.color, label: eq.expression,
        };
      }
      case 'parametric': {
        if (!eq.expression.trim() || !eq.expressionY?.trim()) return null;
        if (eq.error || eq.errorY) return null;
        const fnX = parseWithScope(eq.expression);
        const fnY = parseWithScope(eq.expressionY);
        return {
          kind: 'parametric',
          fnX: (t) => fnX({ ...scope, t }),
          fnY: (t) => fnY({ ...scope, t }),
          tMin: eq.tMin, tMax: eq.tMax,
          color: eq.color, label: `(${eq.expression}, ${eq.expressionY})`,
        };
      }
      case 'implicit': {
        if (!eq.expression.trim() || eq.error) return null;
        const normalized = normalizeImplicit(eq.expression);
        const fn = parseWithScope(normalized);
        const _scope: Record<string, number> = { x: 0, y: 0 };
        return {
          kind: 'implicit',
          fn: (x, y) => { _scope.x = x; _scope.y = y; return fn(_scope); },
          color: eq.color, label: eq.expression,
        };
      }
      case 'points': {
        if (!eq.points?.length) return null;
        return { kind: 'points', pts: eq.points, connected: true, color: eq.color, label: eq.expression };
      }
    }
  } catch { return null; }
}

export function useEquations(initial: EquationEntry[]) {
  const [equations, setEquations] = useState<EquationEntry[]>(initial);

  const update = useCallback((id: string, patch: Partial<EquationEntry>) => {
    setEquations(prev =>
      prev.map(eq => {
        if (eq.id !== id) return eq;
        const next = { ...eq, ...patch };
        if ('expression' in patch) {
          next.error = next.type === 'implicit'
            ? validateExpression(normalizeImplicit(next.expression))
            : validateExpression(next.expression);
        }
        if ('expressionY' in patch) next.errorY = validateExpression(next.expressionY ?? '');
        return next;
      }),
    );
  }, []);

  const add = useCallback((type: EquationType = 'cartesian') => {
    setEquations(prev => [...prev, {
      id: uid(), type,
      expression: '', expressionY: type === 'parametric' ? '' : undefined,
      tMin: 0, tMax: Math.PI * 2,
      color: PALETTE[prev.length % PALETTE.length],
      visible: true, error: null,
    }]);
  }, []);

  const remove = useCallback((id: string) => {
    setEquations(prev => prev.filter(eq => eq.id !== id));
  }, []);

  const addPoints = useCallback((pts: Array<{ x: number; y: number }>, name: string) => {
    setEquations(prev => {
      const manualIdx = name === '__manual__'
        ? prev.findIndex(eq => eq.type === 'points' && eq.expression === '__manual__')
        : -1;
      if (manualIdx >= 0) {
        return prev.map((eq, i) =>
          i === manualIdx ? { ...eq, points: [...(eq.points ?? []), ...pts] } : eq,
        );
      }
      return [...prev, {
        id: uid(), type: 'points' as EquationType,
        expression: name,
        tMin: 0, tMax: 0,
        color: PALETTE[prev.length % PALETTE.length],
        visible: true, error: null, points: pts,
      }];
    });
  }, []);

  return { equations, setEquations, update, add, remove, addPoints };
}
