// Numerical tools: root finding, extrema, intersections.
// All functions operate over a caller-supplied x-range.

const SAMPLES = 600;
const BISECT  = 45;
const H       = 1e-5; // finite-difference step for derivative

// A sign change can mean a root *or* a pole (1/x, tan x). After bisecting we
// re-evaluate: a genuine root sits at ~0, a pole blows up.
const ZERO_TOL = 1e-6;

// Central-difference noise at a true turning point is ~1e-10; a pole is ~1e15.
const DERIV_TOL = 1e-3;

// Two results closer together than this in x are the same feature found twice.
const DEDUPE_TOL = 1e-4;

export interface SpecialPointData {
  x: number;
  y: number;
  kind: 'root' | 'extremum' | 'intersection';
}

export interface Point {
  x: number;
  y: number;
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

/** Merge results that collapse onto the same x, and drop non-finite ones. */
function dedupe(pts: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of [...pts].sort((a, b) => a.x - b.x)) {
    if (!isFinite(p.x) || !isFinite(p.y)) continue;
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev.x - p.x) < DEDUPE_TOL) continue;
    out.push(p);
  }
  return out;
}

/**
 * A constant-zero function (or a derivative that is zero over a whole stretch)
 * makes every sample a hit. Rendering hundreds of markers along a flat line is
 * noise, not information, so treat that as "nothing interesting here".
 */
function tooManyToBeMeaningful(hits: Point[]): boolean {
  return hits.length > SAMPLES / 4;
}

/** Find all real roots of fn(x) = 0 in [xMin, xMax]. */
export function findRoots(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
): Point[] {
  const step  = (xMax - xMin) / SAMPLES;
  const roots: Point[] = [];
  let prevX   = xMin;
  let prevY   = fn(xMin);

  if (prevY === 0) roots.push({ x: xMin, y: 0 });

  for (let i = 1; i <= SAMPLES; i++) {
    const x = xMin + i * step;
    const y = fn(x);

    if (y === 0) {
      // Sample landed exactly on the zero. `prevY * y < 0` cannot see this.
      roots.push({ x, y: 0 });
    } else if (isFinite(prevY) && isFinite(y) && prevY * y < 0) {
      const rx = bisect(fn, prevX, x, prevY);
      const ry = fn(rx);
      // Reject poles: bisection lands on the discontinuity, where |f| is huge.
      if (isFinite(rx) && isFinite(ry) && Math.abs(ry) < ZERO_TOL) {
        roots.push({ x: rx, y: 0 });
      }
    }
    prevX = x; prevY = y;
  }
  return tooManyToBeMeaningful(roots) ? [] : dedupe(roots);
}

/** Find local minima and maxima of fn in [xMin, xMax]. */
export function findExtrema(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
): Point[] {
  const deriv  = (x: number) => (fn(x + H) - fn(x - H)) / (2 * H);
  const step   = (xMax - xMin) / SAMPLES;
  const result: Point[] = [];
  let prevX    = xMin;
  let prevD    = deriv(xMin);

  // A turning point has f finite and f' ~ 0. At a pole (e.g. 1/x^2) the
  // derivative also flips sign, but neither of those holds.
  const keep = (x: number) => {
    const y = fn(x);
    if (!isFinite(x) || !isFinite(y)) return;
    if (Math.abs(deriv(x)) > DERIV_TOL) return;
    result.push({ x, y });
  };

  for (let i = 1; i <= SAMPLES; i++) {
    const x = xMin + i * step;
    const d = deriv(x);

    if (d === 0) {
      // Sample landed exactly on the turning point — true for x^2 at 0 and for
      // sin at pi/2, where the symmetric difference cancels exactly.
      keep(x);
    } else if (isFinite(prevD) && isFinite(d) && prevD * d < 0) {
      keep(bisect(deriv, prevX, x, prevD));
    }
    prevX = x; prevD = d;
  }
  return tooManyToBeMeaningful(result) ? [] : dedupe(result);
}

/** Find intersection points of fn1 and fn2 in [xMin, xMax]. */
export function findIntersections(
  fn1: (x: number) => number,
  fn2: (x: number) => number,
  xMin: number,
  xMax: number,
): Point[] {
  return dedupe(
    findRoots((x) => fn1(x) - fn2(x), xMin, xMax)
      .map(({ x }) => ({ x, y: fn1(x) })),
  );
}
