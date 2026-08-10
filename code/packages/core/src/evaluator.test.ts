import { describe, it, expect } from 'vitest';
import { findRoots, findExtrema, findIntersections } from './evaluator';

const near = (a: number, b: number, tol = 1e-3) => Math.abs(a - b) < tol;

describe('findRoots', () => {
  it('finds the roots of sin(x) over [-4, 4]', () => {
    const roots = findRoots(Math.sin, -4, 4).map(r => r.x);
    expect(roots).toHaveLength(3);
    expect(near(roots[0], -Math.PI)).toBe(true);
    expect(near(roots[1], 0)).toBe(true);
    expect(near(roots[2], Math.PI)).toBe(true);
  });

  it('finds the root of a linear function', () => {
    const roots = findRoots(x => 2 * x - 6, -10, 10);
    expect(roots).toHaveLength(1);
    expect(near(roots[0].x, 3)).toBe(true);
  });

  it('reports no roots for a function that never crosses zero', () => {
    expect(findRoots(x => x * x + 1, -10, 10)).toHaveLength(0);
  });

  it('does not report the pole of 1/x as a root', () => {
    expect(findRoots(x => 1 / x, -5, 5)).toHaveLength(0);
  });

  it('does not report the poles of tan(x) as roots', () => {
    // tan has genuine roots at 0 and +/-pi, and poles at +/-pi/2, +/-3pi/2.
    const roots = findRoots(Math.tan, -4, 4).map(r => r.x);
    expect(roots).toHaveLength(3);
    for (const r of roots) {
      expect(Math.abs(Math.tan(r))).toBeLessThan(1e-3);
    }
  });

  it('does not return duplicate roots', () => {
    const roots = findRoots(Math.sin, -20, 20).map(r => r.x);
    for (let i = 1; i < roots.length; i++) {
      expect(roots[i] - roots[i - 1]).toBeGreaterThan(1e-3);
    }
  });
});

describe('findExtrema', () => {
  it('finds the minimum of a parabola', () => {
    const ext = findExtrema(x => x * x, -5, 5);
    expect(ext).toHaveLength(1);
    expect(near(ext[0].x, 0, 1e-2)).toBe(true);
    expect(near(ext[0].y, 0, 1e-2)).toBe(true);
  });

  it('finds the max and min of sin(x) over one period', () => {
    const ext = findExtrema(Math.sin, -4, 4);
    expect(ext).toHaveLength(2);
    expect(near(ext[0].x, -Math.PI / 2, 1e-2)).toBe(true);
    expect(near(ext[1].x, Math.PI / 2, 1e-2)).toBe(true);
  });

  it('reports no extrema for a monotonic function', () => {
    expect(findExtrema(x => 3 * x + 1, -10, 10)).toHaveLength(0);
  });

  it('does not report the pole of 1/x^2 as an extremum', () => {
    // f' = -2/x^3 flips sign across the pole, but it is not a turning point.
    expect(findExtrema(x => 1 / (x * x), -5, 5)).toHaveLength(0);
  });
});

describe('findIntersections', () => {
  it('finds where x^2 meets x + 2', () => {
    const pts = findIntersections(x => x * x, x => x + 2, -10, 10);
    expect(pts).toHaveLength(2);
    expect(near(pts[0].x, -1, 1e-2)).toBe(true);
    expect(near(pts[1].x, 2, 1e-2)).toBe(true);
    expect(near(pts[1].y, 4, 1e-2)).toBe(true);
  });

  it('reports nothing for parallel lines', () => {
    expect(findIntersections(x => x, x => x + 5, -10, 10)).toHaveLength(0);
  });
});
