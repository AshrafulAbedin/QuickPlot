import { describe, it, expect } from 'vitest';
import { findRoots, findExtrema, findIntersections } from '../src/evaluator';

const sin = (x: number) => Math.sin(x);
const cos = (x: number) => Math.cos(x);
const parabola = (x: number) => x * x - 4; // roots at ±2, minimum at x=0

describe('findRoots', () => {
  it('finds root of sin(x) at 0 on [-π/2, π/2]', () => {
    const roots = findRoots(sin, -Math.PI / 2, Math.PI / 2);
    expect(roots).toHaveLength(1);
    expect(roots[0].x).toBeCloseTo(0, 4);
    expect(roots[0].y).toBeCloseTo(0, 4);
  });

  it('finds roots of sin(x) at 0, π on [−0.5, π+0.5]', () => {
    const roots = findRoots(sin, -0.5, Math.PI + 0.5);
    expect(roots.length).toBeGreaterThanOrEqual(2);
    const xs = roots.map(r => r.x).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(0, 3);
    expect(xs[1]).toBeCloseTo(Math.PI, 3);
  });

  it('finds roots of x²-4 at ±2', () => {
    const roots = findRoots(parabola, -3, 3);
    expect(roots).toHaveLength(2);
    const xs = roots.map(r => r.x).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(-2, 3);
    expect(xs[1]).toBeCloseTo(2, 3);
  });

  it('returns empty for a function with no sign changes', () => {
    const positive = (x: number) => x * x + 1;
    expect(findRoots(positive, -10, 10)).toHaveLength(0);
  });
});

describe('findExtrema', () => {
  it('finds maximum of sin(x) near π/2', () => {
    const extrema = findExtrema(sin, 0, Math.PI);
    expect(extrema).toHaveLength(1);
    expect(extrema[0].x).toBeCloseTo(Math.PI / 2, 3);
    expect(extrema[0].y).toBeCloseTo(1, 3);
  });

  it('finds minimum of x²-4 at x=0', () => {
    const extrema = findExtrema(parabola, -3, 3);
    expect(extrema).toHaveLength(1);
    expect(extrema[0].x).toBeCloseTo(0, 3);
    expect(extrema[0].y).toBeCloseTo(-4, 3);
  });

  it('finds both min and max of sin on full period', () => {
    const extrema = findExtrema(sin, 0, 2 * Math.PI);
    expect(extrema.length).toBeGreaterThanOrEqual(2);
    const ys = extrema.map(e => e.y).sort((a, b) => a - b);
    expect(ys[0]).toBeCloseTo(-1, 3);
    expect(ys[ys.length - 1]).toBeCloseTo(1, 3);
  });
});

describe('findIntersections', () => {
  it('finds intersection of sin and cos at π/4', () => {
    const pts = findIntersections(sin, cos, 0, Math.PI / 2);
    expect(pts).toHaveLength(1);
    expect(pts[0].x).toBeCloseTo(Math.PI / 4, 3);
    expect(pts[0].y).toBeCloseTo(Math.sqrt(2) / 2, 3);
  });

  it('finds intersections of x² and x+2 at x=−1 and x=2', () => {
    const f1 = (x: number) => x * x;
    const f2 = (x: number) => x + 2;
    const pts = findIntersections(f1, f2, -3, 3);
    expect(pts).toHaveLength(2);
    const xs = pts.map(p => p.x).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(-1, 3);
    expect(xs[1]).toBeCloseTo(2, 3);
  });

  it('returns empty for non-intersecting functions', () => {
    const above = (x: number) => x * x + 5;
    const below = (x: number) => x * x;
    expect(findIntersections(above, below, -5, 5)).toHaveLength(0);
  });
});
