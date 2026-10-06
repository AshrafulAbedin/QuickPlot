import { type Viewport, worldToScreen, screenToWorld } from './viewport';

// ── theme system ──────────────────────────────────────────────────────────
export interface CanvasTheme {
  name: string;
  bg: string;
  minorLine: string;
  majorLine: string;
  axis: string;
  label: string;
}

export const THEMES: Record<string, CanvasTheme> = {
  cork: {
    name: 'Cork',
    bg: '#C9A87C',
    minorLine: 'rgba(150, 105, 45, 0.28)',
    majorLine: 'rgba(110,  72, 28, 0.48)',
    axis: '#4E2E10',
    label: '#3A2008',
  },
  dark: {
    name: 'Dark',
    bg: '#1a1a2e',
    minorLine: 'rgba(255,255,255,0.06)',
    majorLine: 'rgba(255,255,255,0.14)',
    axis: '#aaaacc',
    label: '#8888aa',
  },
  blueprint: {
    name: 'Blueprint',
    bg: '#0a2a5e',
    minorLine: 'rgba(100,160,255,0.20)',
    majorLine: 'rgba(100,160,255,0.40)',
    axis: '#80b4ff',
    label: '#c0d8ff',
  },
  chalk: {
    name: 'Chalk',
    bg: '#1e3a1e',
    minorLine: 'rgba(255,255,255,0.08)',
    majorLine: 'rgba(255,255,255,0.18)',
    axis: '#ccffcc',
    label: '#aaddaa',
  },
  paper: {
    name: 'Paper',
    bg: '#fdf6e3',
    minorLine: 'rgba(0,0,0,0.08)',
    majorLine: 'rgba(0,0,0,0.16)',
    axis: '#333333',
    label: '#555555',
  },
  midnight: {
    name: 'Midnight',
    bg: '#0d0d0d',
    minorLine: 'rgba(255,100,50,0.10)',
    majorLine: 'rgba(255,100,50,0.22)',
    axis: '#ff6432',
    label: '#cc5028',
  },
};

export const DEFAULT_THEME: CanvasTheme = THEMES.paper;

// ── helpers ────────────────────────────────────────────────────────────────
const PIXEL_FONT = '"Press Start 2P", monospace';

function niceStep(unitsPerPx: number, targetPx: number): number {
  const raw  = unitsPerPx * targetPx;
  const pow  = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / pow;
  const step = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
  return step * pow;
}

function fmt(n: number): string {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 10_000) return (n / 1000).toFixed(0) + 'k';
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(abs >= 10 ? 1 : 2).replace(/\.?0+$/, '');
}

// ── main export ────────────────────────────────────────────────────────────
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  theme: CanvasTheme = DEFAULT_THEME,
): void {
  const { width, height, scale } = vp;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  const [xMin]    = screenToWorld(vp, 0,     0);
  const [xMax]    = screenToWorld(vp, width, 0);
  const [, yMin]  = screenToWorld(vp, 0, height);
  const [, yMax]  = screenToWorld(vp, 0,     0);
  const [ox, oy]  = worldToScreen(vp, 0, 0);

  const minorStep  = niceStep(1 / scale, 50);
  const majorStep  = minorStep * 5;
  const xMinorBase = Math.floor(xMin / minorStep) * minorStep;
  const yMinorBase = Math.floor(yMin / minorStep) * minorStep;
  const xMajorBase = Math.floor(xMin / majorStep) * majorStep;
  const yMajorBase = Math.floor(yMin / majorStep) * majorStep;

  // minor verticals
  ctx.strokeStyle = theme.minorLine;
  ctx.lineWidth   = 0.5;
  ctx.beginPath();
  for (let x = xMinorBase; x <= xMax + minorStep; x += minorStep) {
    const [sx] = worldToScreen(vp, x, 0);
    ctx.moveTo(sx, 0); ctx.lineTo(sx, height);
  }
  // minor horizontals (same style — one stroke call)
  for (let y = yMinorBase; y <= yMax + minorStep; y += minorStep) {
    const [, sy] = worldToScreen(vp, 0, y);
    ctx.moveTo(0, sy); ctx.lineTo(width, sy);
  }
  ctx.stroke();

  // major verticals
  ctx.strokeStyle = theme.majorLine;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  for (let x = xMajorBase; x <= xMax + majorStep; x += majorStep) {
    const [sx] = worldToScreen(vp, x, 0);
    ctx.moveTo(sx, 0); ctx.lineTo(sx, height);
  }
  // major horizontals (same style — one stroke call)
  for (let y = yMajorBase; y <= yMax + majorStep; y += majorStep) {
    const [, sy] = worldToScreen(vp, 0, y);
    ctx.moveTo(0, sy); ctx.lineTo(width, sy);
  }
  ctx.stroke();

  // axes
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(0, oy);  ctx.lineTo(width,  oy);
  ctx.moveTo(ox, 0);  ctx.lineTo(ox, height);
  ctx.stroke();

  // tick marks on axes
  ctx.lineWidth = 1.5;
  const tick = 5;
  ctx.beginPath();
  for (let x = xMajorBase; x <= xMax + majorStep; x += majorStep) {
    const [sx] = worldToScreen(vp, x, 0);
    ctx.moveTo(sx, oy - tick); ctx.lineTo(sx, oy + tick);
  }
  for (let y = yMajorBase; y <= yMax + majorStep; y += majorStep) {
    const [, sy] = worldToScreen(vp, 0, y);
    ctx.moveTo(ox - tick, sy); ctx.lineTo(ox + tick, sy);
  }
  ctx.stroke();

  // axis labels — clamp to visible area when axis scrolls off-screen
  const labelY = Math.min(Math.max(oy + 8, 12), height - 16);
  const labelX = Math.min(Math.max(ox - 8, 8),  width  -  8);

  ctx.fillStyle    = theme.label;
  ctx.font         = `9px ${PIXEL_FONT}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  for (let x = xMajorBase; x <= xMax + majorStep; x += majorStep) {
    if (Math.abs(x) < minorStep * 0.1) continue;
    const [sx] = worldToScreen(vp, x, 0);
    if (sx < 4 || sx > width - 4) continue;
    ctx.fillText(fmt(x), sx, labelY);
  }

  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  for (let y = yMajorBase; y <= yMax + majorStep; y += majorStep) {
    if (Math.abs(y) < minorStep * 0.1) continue;
    const [, sy] = worldToScreen(vp, 0, y);
    if (sy < 4 || sy > height - 4) continue;
    ctx.fillText(fmt(y), labelX, sy);
  }

  // origin
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('0', labelX, labelY);
}
