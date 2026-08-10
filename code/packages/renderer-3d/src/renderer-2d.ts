import { type Viewport, worldToScreen, screenToWorld, visibleRange } from './viewport';

// ── curve type system ─────────────────────────────────────────────────────

interface CurveBase {
  color: string;
  lineWidth?: number;
  label?: string;
  dashed?: boolean;
  progress?: number; // 0-1: trace animation progress; undefined = fully drawn
}

export interface CartesianCurve extends CurveBase {
  kind: 'cartesian';
  fn: (x: number) => number;
}

export interface ParametricCurve extends CurveBase {
  kind: 'parametric';
  fnX: (t: number) => number;
  fnY: (t: number) => number;
  tMin: number;
  tMax: number;
}

export interface PolarCurve extends CurveBase {
  kind: 'polar';
  fn: (theta: number) => number;
  thetaMin: number;
  thetaMax: number;
}

export interface PointDataset extends CurveBase {
  kind: 'points';
  pts: Array<{ x: number; y: number }>;
  connected?: boolean;
  pointSize?: number;
}

export interface ImplicitCurve extends CurveBase {
  kind: 'implicit';
  fn: (x: number, y: number) => number;
}

export type PlotCurve = CartesianCurve | ParametricCurve | PolarCurve | PointDataset | ImplicitCurve;

export interface SpecialPoint {
  x: number;
  y: number;
  kind: 'root' | 'extremum' | 'intersection';
  color: string;
}

// ── drawing internals ─────────────────────────────────────────────────────

const SAMPLES = 1500;
const LABEL_FONT = '"Press Start 2P", monospace';

function fmtCoord(n: number): string {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000) return n.toFixed(0);
  if (abs >= 10)   return n.toFixed(1).replace(/\.0$/, '');
  return n.toFixed(3).replace(/\.?0+$/, '');
}

// Draw a small floating label near a canvas point, automatically flipping
// to avoid viewport edges.
function drawLabel(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  sx: number,
  sy: number,
  text: string,
  color: string,
  bgAlpha = 0.72,
) {
  ctx.font = `8px ${LABEL_FONT}`;
  const metrics = ctx.measureText(text);
  const w = metrics.width + 8;
  const h = 14;

  // Default: place label to the right and above the point
  let lx = sx + 10;
  let ly = sy - h - 4;

  // Flip horizontally if too close to right edge
  if (lx + w > vp.width - 4) lx = sx - w - 10;
  // Flip vertically if too close to top edge
  if (ly < 4) ly = sy + 8;

  // Background pill
  ctx.fillStyle = `rgba(0,0,0,${bgAlpha})`;
  ctx.beginPath();
  ctx.roundRect(lx, ly, w, h, 3);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, lx + 4, ly + h / 2);
}

function pathFromXY(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  fnX: (t: number) => number,
  fnY: (t: number) => number,
  tMin: number,
  tMax: number,
  ySpanPx: number,
) {
  const step = (tMax - tMin) / SAMPLES;
  ctx.beginPath();
  let penDown = false;
  let prevWy: number | null = null;

  for (let i = 0; i <= SAMPLES; i++) {
    const t = tMin + i * step;
    let wx: number, wy: number;
    try { wx = fnX(t); wy = fnY(t); } catch { penDown = false; prevWy = null; continue; }

    if (!isFinite(wx) || !isFinite(wy)) { penDown = false; prevWy = null; continue; }

    if (prevWy !== null && Math.abs(wy - prevWy) > ySpanPx * 3) penDown = false;

    const [sx, sy] = worldToScreen(vp, wx, wy);
    if (!penDown) { ctx.moveTo(sx, sy); penDown = true; }
    else          { ctx.lineTo(sx, sy); }
    prevWy = wy;
  }
  ctx.stroke();
}

// Manim-style glowing head dot drawn at the leading edge of a trace animation
function drawTraceDot(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  wx: number,
  wy: number,
  color: string,
) {
  if (!isFinite(wx) || !isFinite(wy)) return;
  const [sx, sy] = worldToScreen(vp, wx, wy);

  // Radial glow
  const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 14);
  grad.addColorStop(0, color + 'bb');
  grad.addColorStop(1, color + '00');
  ctx.beginPath();
  ctx.arc(sx, sy, 14, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // White ring
  ctx.beginPath();
  ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();

  // Colored core
  ctx.beginPath();
  ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawCartesian(ctx: CanvasRenderingContext2D, vp: Viewport, curve: CartesianCurve) {
  const [xMin] = screenToWorld(vp, 0, 0);
  const [xMax] = screenToWorld(vp, vp.width, 0);
  const ySpanPx = vp.height / vp.scale;

  const effectiveMax = curve.progress !== undefined
    ? xMin + curve.progress * (xMax - xMin)
    : xMax;

  ctx.strokeStyle = curve.color;
  ctx.lineWidth   = curve.lineWidth ?? 2.5;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.setLineDash(curve.dashed ? [6, 4] : []);

  pathFromXY(ctx, vp, (x) => x, curve.fn, xMin, effectiveMax, ySpanPx);
  ctx.setLineDash([]);

  if (curve.progress !== undefined && curve.progress < 1) {
    drawTraceDot(ctx, vp, effectiveMax, curve.fn(effectiveMax), curve.color);
  }

  // Label at ~85% across the visible range to avoid the right edge
  drawCurveLabel(ctx, vp, curve.label, curve.color, () => {
    const lx = xMin + 0.85 * (effectiveMax - xMin);
    const ly = curve.fn(lx);
    return isFinite(ly) ? [lx, ly] : null;
  });
}

function drawParametric(ctx: CanvasRenderingContext2D, vp: Viewport, curve: ParametricCurve) {
  const ySpanPx = vp.height / vp.scale;
  const effectiveTMax = curve.progress !== undefined
    ? curve.tMin + curve.progress * (curve.tMax - curve.tMin)
    : curve.tMax;

  ctx.strokeStyle = curve.color;
  ctx.lineWidth   = curve.lineWidth ?? 2.5;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.setLineDash(curve.dashed ? [6, 4] : []);

  pathFromXY(ctx, vp, curve.fnX, curve.fnY, curve.tMin, effectiveTMax, ySpanPx);
  ctx.setLineDash([]);

  if (curve.progress !== undefined && curve.progress < 1) {
    drawTraceDot(ctx, vp, curve.fnX(effectiveTMax), curve.fnY(effectiveTMax), curve.color);
  }

  drawCurveLabel(ctx, vp, curve.label, curve.color, () => {
    const t = curve.tMin + 0.85 * (effectiveTMax - curve.tMin);
    const wx = curve.fnX(t), wy = curve.fnY(t);
    return isFinite(wx) && isFinite(wy) ? [wx, wy] : null;
  });
}

function drawPolar(ctx: CanvasRenderingContext2D, vp: Viewport, curve: PolarCurve) {
  const ySpanPx = vp.height / vp.scale;
  const effectiveTMax = curve.progress !== undefined
    ? curve.thetaMin + curve.progress * (curve.thetaMax - curve.thetaMin)
    : curve.thetaMax;

  ctx.strokeStyle = curve.color;
  ctx.lineWidth   = curve.lineWidth ?? 2.5;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.setLineDash(curve.dashed ? [6, 4] : []);

  pathFromXY(
    ctx, vp,
    (t) => { try { return curve.fn(t) * Math.cos(t); } catch { return NaN; } },
    (t) => { try { return curve.fn(t) * Math.sin(t); } catch { return NaN; } },
    curve.thetaMin, effectiveTMax, ySpanPx,
  );
  ctx.setLineDash([]);

  if (curve.progress !== undefined && curve.progress < 1) {
    const r = curve.fn(effectiveTMax);
    drawTraceDot(ctx, vp, r * Math.cos(effectiveTMax), r * Math.sin(effectiveTMax), curve.color);
  }

  drawCurveLabel(ctx, vp, curve.label, curve.color, () => {
    const t = curve.thetaMin + 0.85 * (effectiveTMax - curve.thetaMin);
    try {
      const r = curve.fn(t);
      return isFinite(r) ? [r * Math.cos(t), r * Math.sin(t)] : null;
    } catch { return null; }
  });
}

// Marching-squares contouring for implicit curves f(x,y) = 0
function drawImplicit(ctx: CanvasRenderingContext2D, vp: Viewport, curve: ImplicitCurve) {
  // Resolution scales with viewport so zoomed-in views stay crisp
  const RES = Math.min(300, Math.max(80, Math.round(Math.min(vp.width, vp.height) / 6)));
  const { xMin, xMax, yMin, yMax } = visibleRange(vp);
  const dx = (xMax - xMin) / RES;
  const dy = (yMax - yMin) / RES;

  // Evaluate f at every grid vertex and store in a flat typed array
  const W = RES + 1;
  const vals = new Float64Array(W * W);
  for (let j = 0; j < W; j++) {
    const wy = yMin + j * dy;
    for (let i = 0; i < W; i++) {
      const wx = xMin + i * dx;
      try {
        const v = curve.fn(wx, wy);
        vals[j * W + i] = isFinite(v) ? v : NaN;
      } catch {
        vals[j * W + i] = NaN;
      }
    }
  }

  ctx.strokeStyle = curve.color;
  ctx.lineWidth   = curve.lineWidth ?? 2;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.beginPath();

  for (let j = 0; j < RES; j++) {
    for (let i = 0; i < RES; i++) {
      const v00 = vals[j * W + i];
      const v10 = vals[j * W + (i + 1)];
      const v01 = vals[(j + 1) * W + i];
      const v11 = vals[(j + 1) * W + (i + 1)];
      if (isNaN(v00) || isNaN(v10) || isNaN(v01) || isNaN(v11)) continue;

      const wx0 = xMin + i * dx;
      const wx1 = wx0 + dx;
      const wy0 = yMin + j * dy;
      const wy1 = wy0 + dy;

      // Collect zero-crossing points on each of the 4 edges
      const pts: [number, number][] = [];

      if (Math.sign(v00) !== Math.sign(v10)) {
        const t = v00 / (v00 - v10);
        pts.push([wx0 + t * dx, wy0]);
      }
      if (Math.sign(v10) !== Math.sign(v11)) {
        const t = v10 / (v10 - v11);
        pts.push([wx1, wy0 + t * dy]);
      }
      if (Math.sign(v11) !== Math.sign(v01)) {
        const t = v11 / (v11 - v01);
        pts.push([wx0 + (1 - t) * dx, wy1]);
      }
      if (Math.sign(v01) !== Math.sign(v00)) {
        const t = v01 / (v01 - v00);
        pts.push([wx0, wy0 + (1 - t) * dy]);
      }

      if (pts.length === 2) {
        const [sx0, sy0] = worldToScreen(vp, pts[0][0], pts[0][1]);
        const [sx1, sy1] = worldToScreen(vp, pts[1][0], pts[1][1]);
        ctx.moveTo(sx0, sy0);
        ctx.lineTo(sx1, sy1);
      } else if (pts.length === 4) {
        // Saddle: use centre value to pick correct pairing
        const vCentre = curve.fn(wx0 + dx / 2, wy0 + dy / 2);
        const pairs: [[number, number], [number, number]][] =
          vCentre > 0
            ? [[pts[0], pts[3]], [pts[1], pts[2]]]
            : [[pts[0], pts[1]], [pts[2], pts[3]]];
        for (const [a, b] of pairs) {
          const [sx0, sy0] = worldToScreen(vp, a[0], a[1]);
          const [sx1, sy1] = worldToScreen(vp, b[0], b[1]);
          ctx.moveTo(sx0, sy0);
          ctx.lineTo(sx1, sy1);
        }
      }
    }
  }

  ctx.stroke();
}

function drawPointDataset(ctx: CanvasRenderingContext2D, vp: Viewport, curve: PointDataset) {
  if (!curve.pts.length) return;
  const r = (curve.pointSize ?? 4);

  if (curve.connected) {
    ctx.strokeStyle = curve.color;
    ctx.lineWidth   = curve.lineWidth ?? 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    let first = true;
    for (const { x, y } of curve.pts) {
      const [sx, sy] = worldToScreen(vp, x, y);
      if (first) { ctx.moveTo(sx, sy); first = false; }
      else         ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }

  ctx.fillStyle = curve.color;
  for (const { x, y } of curve.pts) {
    const [sx, sy] = worldToScreen(vp, x, y);
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSpecialPoints(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  pts: SpecialPoint[],
) {
  for (const pt of pts) {
    const [sx, sy] = worldToScreen(vp, pt.x, pt.y);
    if (sx < -10 || sx > vp.width + 10 || sy < -10 || sy > vp.height + 10) continue;

    // outer white ring
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();

    // coloured inner dot
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fillStyle = pt.color;
    ctx.fill();

    // coordinate label
    const label = `(${fmtCoord(pt.x)}, ${fmtCoord(pt.y)})`;
    drawLabel(ctx, vp, sx, sy, label, '#ffffff');
  }
}

// Draws the curve's expression label near its right terminus (or safe point)
function drawCurveLabel(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  label: string | undefined,
  color: string,
  sampleFn: () => [number, number] | null,
) {
  if (!label) return;
  const pt = sampleFn();
  if (!pt) return;
  const [sx, sy] = worldToScreen(vp, pt[0], pt[1]);
  if (!isFinite(sx) || !isFinite(sy)) return;
  if (sx < 0 || sx > vp.width || sy < 0 || sy > vp.height) return;
  drawLabel(ctx, vp, sx, sy, label, color);
}

// ── public entry point ────────────────────────────────────────────────────

export function drawCurves(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  curves: PlotCurve[],
  specialPoints?: SpecialPoint[],
): void {
  for (const curve of curves) {
    switch (curve.kind) {
      case 'cartesian':  drawCartesian(ctx, vp, curve);     break;
      case 'parametric': drawParametric(ctx, vp, curve);    break;
      case 'polar':      drawPolar(ctx, vp, curve);         break;
      case 'points':     drawPointDataset(ctx, vp, curve);  break;
      case 'implicit':   drawImplicit(ctx, vp, curve);      break;
    }
  }
  if (specialPoints?.length) drawSpecialPoints(ctx, vp, specialPoints);
}
