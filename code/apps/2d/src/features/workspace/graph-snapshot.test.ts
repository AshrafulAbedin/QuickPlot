import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME } from '@quickplot/renderer';
import type { EquationEntry } from '@quickplot/types';
import { restoreEquations, restoreTheme, saveTheme } from './graph-snapshot';
import { parseWorkspaceJson } from '../../lib/workspace-io';

const equation: EquationEntry = {
  id: 'saved', type: 'cartesian', expression: 'a*x', tMin: 0, tMax: 10,
  color: '#123456', visible: true, showDerivative: true,
};
const snapshot = {
  title: 'My graph', equations: [equation],
  viewport: { xMin: -4, xMax: 8, yMin: -2, yMax: 6 },
  sliders: [{ name: 'a', min: -5, max: 5, step: 0.1, value: 2 }],
  theme: saveTheme(DEFAULT_THEME),
};

describe('workspace graph restoration', () => {
  it('preserves saved graph data through JSON and restores renderer theme colors', () => {
    const loaded = parseWorkspaceJson(JSON.stringify(snapshot));
    expect(loaded).toEqual(snapshot);
    expect(restoreTheme(loaded.theme!)).toEqual(DEFAULT_THEME);
    const restored = restoreEquations(loaded.equations);
    expect(restored[0]).toMatchObject({ expression: 'a*x', showDerivative: true, error: null });
  });

  it('gives loaded equations fresh IDs and validates both parametric expressions', () => {
    const saved: EquationEntry[] = [
      { ...equation, type: 'parametric', expression: 'cos(t)', expressionY: '(' },
      { ...equation, type: 'implicit', expression: 'x^2+y^2=4' },
      { ...equation, type: 'points', expression: 'points.csv', points: [{ x: 1, y: 2 }] },
    ];
    const restored = restoreEquations(saved);
    expect(new Set(restored.map(e => e.id)).size).toBe(3);
    expect(restored.every(e => e.id !== 'saved')).toBe(true);
    expect(restored[0].errorY).toBeTruthy();
    expect(restored[1].error).toBeNull();
    expect(restored[2].error).toBeNull();
    expect(restored[2].points).toEqual([{ x: 1, y: 2 }]);
  });

  it('loads legacy theme colors without the optional grid detail', () => {
    expect(restoreTheme({ name: 'Old', bg: 'black', gridColor: 'gray', axisColor: 'white', textColor: 'white' }))
      .toMatchObject({ minorLine: 'gray', majorLine: 'gray', axis: 'white' });
  });

  it.each([
    { viewport: { xMin: 0, xMax: 0, yMin: -1, yMax: 1 } },
    { equations: [null] },
    { sliders: [{ name: 'a', min: 0, max: 1, value: 0, step: 0 }] },
    { theme: { bg: 'black' } },
  ])('rejects malformed saved data before rendering: %j', patch => {
    expect(() => parseWorkspaceJson(JSON.stringify({ ...snapshot, ...patch }))).toThrow();
  });
});
