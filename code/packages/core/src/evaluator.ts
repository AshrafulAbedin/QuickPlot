// Numerical tools: root finding, extrema, intersections.
// All functions operate over a caller-supplied x-range.

const SAMPLES = 600;
const BISECT  = 45;
const H       = 1e-5; // finite-difference step for derivative

export interface SpecialPointData {
  x: number;
  y: number;
  kind: 'root' | 'extremum' | 'intersection';
}

function bisect(
  f: (x: number) => number,
  lo: number,
  hi: number,
  fLo: number,
): number {
  for (let i = 0; i < BISECT; i++) {
    const mid = (lo + hi) / 2;
    const fm  = f(mid);
    if (!isFinite(fm) || Math.abs(fm) < 1e-12) return mid;
    if (fLo * fm < 0) hi = mid;
    else { lo = mid; fLo = fm; }
  }
  return (lo + hi) / 2;
}

/** Find all real roots of fn(x) = 0 in [xMin, xMax]. */
export function findRoots(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
): Array<{ x: number; y: number }> {
  const step  = (xMax - xMin) / SAMPLES;
  const roots: Array<{ x: number; y: number }> = [];
  let prevX   = xMin;
  let prevY   = fn(xMin);

  for (let i = 1; i <= SAMPLES; i++) {
    const x = xMin + i * step;
    const y = fn(x);
    if (isFinite(prevY) && isFinite(y) && prevY * y < 0) {
      const rx = bisect(fn, prevX, x, prevY);
      roots.push({ x: rx, y: 0 });
    }
    prevX = x; prevY = y;
  }
  return roots;
}

/** Find local minima and maxima of fn in [xMin, xMax]. */
export function findExtrema(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
): Array<{ x: number; y: number }> {
  const deriv  = (x: number) => (fn(x + H) - fn(x - H)) / (2 * H);
  const step   = (xMax - xMin) / SAMPLES;
  const result: Array<{ x: number; y: number }> = [];
  let prevX    = xMin;
  let prevD    = deriv(xMin);

  for (let i = 1; i <= SAMPLES; i++) {
    const x = xMin + i * step;
    const d = deriv(x);
    if (isFinite(prevD) && isFinite(d) && prevD * d < 0) {
      const ex = bisect(deriv, prevX, x, prevD);
      result.push({ x: ex, y: fn(ex) });
    }
    prevX = x; prevD = d;
  }
  return result;
}

/** Find intersection points of fn1 and fn2 in [xMin, xMax]. */
export function findIntersections(
  fn1: (x: number) => number,
  fn2: (x: number) => number,
  xMin: number,
  xMax: number,
): Array<{ x: number; y: number }> {
  return findRoots((x) => fn1(x) - fn2(x), xMin, xMax).map(({ x }) => ({
    x,
    y: fn1(x),
  }));
}
