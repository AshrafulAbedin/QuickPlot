import { parseWithScope, findRoots, findExtrema, findIntersections } from '@quickplot/core';
import type { SpecialPoint } from '@quickplot/renderer';
import type { EquationEntry } from './types';

const RANGE = 25;

function dedupeSpecialPoints(pts: SpecialPoint[], tol = 0.02): SpecialPoint[] {
  const result: SpecialPoint[] = [];
  for (const pt of pts) {
    if (!isFinite(pt.x) || !isFinite(pt.y)) continue;
    const existing = result.find(p => Math.hypot(p.x - pt.x, p.y - pt.y) < tol);
    if (!existing) {
      result.push({
        x: Number(pt.x.toFixed(4)),
        y: Number(pt.y.toFixed(4)),
        kind: pt.kind,
        color: pt.color,
      });
    } else if (existing.kind !== 'intersection' && pt.kind === 'intersection') {
      existing.kind = 'intersection';
      existing.color = '#ffffff';
    }
  }
  return result;
}

function findPolylineIntersections(
  pts1: Array<{ x: number; y: number }>,
  pts2: Array<{ x: number; y: number }>,
): Array<{ x: number; y: number }> {
  const res: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < pts1.length - 1; i++) {
    const p1 = pts1[i], p2 = pts1[i + 1];
    const minX1 = Math.min(p1.x, p2.x), maxX1 = Math.max(p1.x, p2.x);
    const minY1 = Math.min(p1.y, p2.y), maxY1 = Math.max(p1.y, p2.y);

    for (let j = 0; j < pts2.length - 1; j++) {
      const p3 = pts2[j], p4 = pts2[j + 1];
      if (
        maxX1 < Math.min(p3.x, p4.x) ||
        minX1 > Math.max(p3.x, p4.x) ||
        maxY1 < Math.min(p3.y, p4.y) ||
        minY1 > Math.max(p3.y, p4.y)
      ) {
        continue;
      }
      const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
      if (Math.abs(denom) < 1e-12) continue;
      const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
      const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
      if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
        res.push({
          x: p1.x + ua * (p2.x - p1.x),
          y: p1.y + ua * (p2.y - p1.y),
        });
      }
    }
  }
  return res;
}

export function calculateSpecialPoints(
  equations: EquationEntry[],
  sliderScope: Record<string, number>,
): SpecialPoint[] {
  const pts: SpecialPoint[] = [];
  const visibleEqs = equations.filter(eq => eq.visible && !eq.error && eq.expression.trim());

  interface CompiledCartesian {
    eq: EquationEntry;
    fn: (x: number) => number;
  }

  interface CompiledPolar {
    eq: EquationEntry;
    rFn: (t: number) => number;
    xFn: (t: number) => number;
    yFn: (t: number) => number;
    tMin: number;
    tMax: number;
    samples: Array<{ x: number; y: number }>;
  }

  interface CompiledParametric {
    eq: EquationEntry;
    xFn: (t: number) => number;
    yFn: (t: number) => number;
    tMin: number;
    tMax: number;
    samples: Array<{ x: number; y: number }>;
  }

  const cartesians: CompiledCartesian[] = [];
  const polars: CompiledPolar[] = [];
  const parametrics: CompiledParametric[] = [];

  for (const eq of visibleEqs) {
    try {
      if (eq.type === 'cartesian') {
        const compiled = parseWithScope(eq.expression);
        cartesians.push({
          eq,
          fn: (x: number) => compiled({ ...sliderScope, x }),
        });
      } else if (eq.type === 'polar') {
        const compiled = parseWithScope(eq.expression);
        const rFn = (t: number) => compiled({ ...sliderScope, t });
        const xFn = (t: number) => rFn(t) * Math.cos(t);
        const yFn = (t: number) => rFn(t) * Math.sin(t);
        const tMin = eq.tMin ?? 0;
        const tMax = eq.tMax ?? Math.PI * 2;

        const NUM_SAMPLES = 250;
        const dt = (tMax - tMin) / NUM_SAMPLES;
        const samples: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= NUM_SAMPLES; i++) {
          const t = tMin + i * dt;
          try {
            const x = xFn(t);
            const y = yFn(t);
            if (isFinite(x) && isFinite(y)) {
              samples.push({ x, y });
            }
          } catch { /* skip */ }
        }

        polars.push({ eq, rFn, xFn, yFn, tMin, tMax, samples });
      } else if (eq.type === 'parametric' && eq.expressionY && !eq.errorY) {
        const compX = parseWithScope(eq.expression);
        const compY = parseWithScope(eq.expressionY);
        const xFn = (t: number) => compX({ ...sliderScope, t });
        const yFn = (t: number) => compY({ ...sliderScope, t });
        const tMin = eq.tMin ?? 0;
        const tMax = eq.tMax ?? Math.PI * 2;

        const NUM_SAMPLES = 250;
        const dt = (tMax - tMin) / NUM_SAMPLES;
        const samples: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= NUM_SAMPLES; i++) {
          const t = tMin + i * dt;
          try {
            const x = xFn(t);
            const y = yFn(t);
            if (isFinite(x) && isFinite(y)) {
              samples.push({ x, y });
            }
          } catch { /* skip */ }
        }

        parametrics.push({ eq, xFn, yFn, tMin, tMax, samples });
      }
    } catch { /* skip invalid equation */ }
  }

  // 1. Single-curve special points for Cartesian
  for (const { eq, fn } of cartesians) {
    try {
      findRoots(fn, -RANGE, RANGE).forEach(p => pts.push({ ...p, kind: 'root', color: eq.color }));
      findExtrema(fn, -RANGE, RANGE).forEach(p => pts.push({ ...p, kind: 'extremum', color: eq.color }));
      const y0 = fn(0);
      if (isFinite(y0)) {
        pts.push({ x: 0, y: y0, kind: 'root', color: eq.color });
      }
    } catch { /* skip */ }
  }

  // 2. Single-curve special points for Polar
  for (const { eq, rFn, xFn, yFn, tMin, tMax } of polars) {
    try {
      // Pole / origin (r = 0)
      const zeroR = findRoots(rFn, tMin, tMax);
      if (zeroR.length > 0) {
        pts.push({ x: 0, y: 0, kind: 'root', color: eq.color });
      }

      // x-intercepts (y(t) = 0)
      findRoots(yFn, tMin, tMax).forEach(t => {
        try {
          const x = xFn(t.x);
          if (isFinite(x) && Math.abs(x) <= RANGE) {
            pts.push({ x, y: 0, kind: 'root', color: eq.color });
          }
        } catch { /* skip */ }
      });

      // y-intercepts (x(t) = 0)
      findRoots(xFn, tMin, tMax).forEach(t => {
        try {
          const y = yFn(t.x);
          if (isFinite(y) && Math.abs(y) <= RANGE) {
            pts.push({ x: 0, y, kind: 'root', color: eq.color });
          }
        } catch { /* skip */ }
      });

      // Extrema in y (horizontal tangents)
      findExtrema(yFn, tMin, tMax).forEach(t => {
        try {
          const x = xFn(t.x);
          const y = yFn(t.x);
          if (isFinite(x) && isFinite(y) && Math.abs(x) <= RANGE && Math.abs(y) <= RANGE) {
            pts.push({ x, y, kind: 'extremum', color: eq.color });
          }
        } catch { /* skip */ }
      });

      // Extrema in x (vertical tangents)
      findExtrema(xFn, tMin, tMax).forEach(t => {
        try {
          const x = xFn(t.x);
          const y = yFn(t.x);
          if (isFinite(x) && isFinite(y) && Math.abs(x) <= RANGE && Math.abs(y) <= RANGE) {
            pts.push({ x, y, kind: 'extremum', color: eq.color });
          }
        } catch { /* skip */ }
      });

      // Extrema in r
      findExtrema(rFn, tMin, tMax).forEach(t => {
        try {
          const x = xFn(t.x);
          const y = yFn(t.x);
          if (isFinite(x) && isFinite(y) && Math.abs(x) <= RANGE && Math.abs(y) <= RANGE) {
            pts.push({ x, y, kind: 'extremum', color: eq.color });
          }
        } catch { /* skip */ }
      });
    } catch { /* skip */ }
  }

  // 3. Single-curve special points for Parametric
  for (const { eq, xFn, yFn, tMin, tMax } of parametrics) {
    try {
      findRoots(yFn, tMin, tMax).forEach(t => {
        try {
          const x = xFn(t.x);
          if (isFinite(x) && Math.abs(x) <= RANGE) {
            pts.push({ x, y: 0, kind: 'root', color: eq.color });
          }
        } catch { /* skip */ }
      });

      findRoots(xFn, tMin, tMax).forEach(t => {
        try {
          const y = yFn(t.x);
          if (isFinite(y) && Math.abs(y) <= RANGE) {
            pts.push({ x: 0, y, kind: 'root', color: eq.color });
          }
        } catch { /* skip */ }
      });

      findExtrema(yFn, tMin, tMax).forEach(t => {
        try {
          const x = xFn(t.x);
          const y = yFn(t.x);
          if (isFinite(x) && isFinite(y) && Math.abs(x) <= RANGE && Math.abs(y) <= RANGE) {
            pts.push({ x, y, kind: 'extremum', color: eq.color });
          }
        } catch { /* skip */ }
      });
    } catch { /* skip */ }
  }

  // 3b. User-plotted discrete points: show coordinates when hovered
  for (const eq of equations) {
    if (!eq.visible || eq.type !== 'points' || !eq.points) continue;
    for (const p of eq.points) {
      if (isFinite(p.x) && isFinite(p.y)) {
        pts.push({ x: p.x, y: p.y, kind: 'root', color: eq.color });
      }
    }
  }

  // 4. Intersections: Cartesian vs Cartesian
  for (let i = 0; i < cartesians.length; i++) {
    for (let j = i + 1; j < cartesians.length; j++) {
      try {
        findIntersections(cartesians[i].fn, cartesians[j].fn, -RANGE, RANGE).forEach(p =>
          pts.push({ ...p, kind: 'intersection', color: '#ffffff' }),
        );
      } catch { /* skip */ }
    }
  }

  // 5. Intersections: Cartesian vs Polar
  for (const cart of cartesians) {
    for (const pol of polars) {
      try {
        const g = (t: number) => {
          const x = pol.xFn(t);
          if (!isFinite(x) || Math.abs(x) > RANGE * 2) return NaN;
          return pol.yFn(t) - cart.fn(x);
        };
        findRoots(g, pol.tMin, pol.tMax).forEach(t => {
          try {
            const x = pol.xFn(t.x);
            const y = pol.yFn(t.x);
            if (isFinite(x) && isFinite(y) && Math.abs(x) <= RANGE && Math.abs(y) <= RANGE) {
              pts.push({ x, y, kind: 'intersection', color: '#ffffff' });
            }
          } catch { /* skip */ }
        });
      } catch { /* skip */ }
    }
  }

  // 6. Intersections: Cartesian vs Parametric
  for (const cart of cartesians) {
    for (const par of parametrics) {
      try {
        const g = (t: number) => {
          const x = par.xFn(t);
          if (!isFinite(x) || Math.abs(x) > RANGE * 2) return NaN;
          return par.yFn(t) - cart.fn(x);
        };
        findRoots(g, par.tMin, par.tMax).forEach(t => {
          try {
            const x = par.xFn(t.x);
            const y = par.yFn(t.x);
            if (isFinite(x) && isFinite(y) && Math.abs(x) <= RANGE && Math.abs(y) <= RANGE) {
              pts.push({ x, y, kind: 'intersection', color: '#ffffff' });
            }
          } catch { /* skip */ }
        });
      } catch { /* skip */ }
    }
  }

  // 7. Intersections: Polar vs Polar, Polar vs Parametric, Parametric vs Parametric
  const polyCurves = [...polars, ...parametrics];
  for (let i = 0; i < polyCurves.length; i++) {
    for (let j = i + 1; j < polyCurves.length; j++) {
      try {
        findPolylineIntersections(polyCurves[i].samples, polyCurves[j].samples).forEach(p => {
          if (Math.abs(p.x) <= RANGE && Math.abs(p.y) <= RANGE) {
            pts.push({ ...p, kind: 'intersection', color: '#ffffff' });
          }
        });
      } catch { /* skip */ }
    }
  }

  return dedupeSpecialPoints(pts);
}
