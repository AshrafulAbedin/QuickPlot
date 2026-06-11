export interface Viewport {
  offsetX: number; // world-x at canvas centre
  offsetY: number; // world-y at canvas centre
  scale: number;   // CSS pixels per world unit
  width: number;   // canvas CSS width
  height: number;  // canvas CSS height
}

export const DEFAULT_VIEWPORT: Viewport = {
  offsetX: 0,
  offsetY: 0,
  scale: 80,
  width: 0,
  height: 0,
};

export function worldToScreen(
  vp: Viewport,
  wx: number,
  wy: number,
): [number, number] {
  const sx = (wx - vp.offsetX) * vp.scale + vp.width / 2;
  const sy = vp.height / 2 - (wy - vp.offsetY) * vp.scale;
  return [sx, sy];
}

export function screenToWorld(
  vp: Viewport,
  sx: number,
  sy: number,
): [number, number] {
  const wx = (sx - vp.width / 2) / vp.scale + vp.offsetX;
  const wy = -(sy - vp.height / 2) / vp.scale + vp.offsetY;
  return [wx, wy];
}

export function visibleRange(vp: Viewport) {
  const [xMin, yMax] = screenToWorld(vp, 0, 0);
  const [xMax, yMin] = screenToWorld(vp, vp.width, vp.height);
  return { xMin, xMax, yMin, yMax };
}

export function pan(vp: Viewport, dx: number, dy: number): Viewport {
  return {
    ...vp,
    offsetX: vp.offsetX - dx / vp.scale,
    offsetY: vp.offsetY + dy / vp.scale,
  };
}

// Zoom centred on screen point (cx, cy) — world point under cursor stays fixed.
export function zoom(
  vp: Viewport,
  factor: number,
  cx: number,
  cy: number,
): Viewport {
  const newScale = Math.max(5, Math.min(5000, vp.scale * factor));
  const newOffsetX =
    (cx - vp.width / 2) / vp.scale + vp.offsetX - (cx - vp.width / 2) / newScale;
  const newOffsetY =
    -(cy - vp.height / 2) / vp.scale + vp.offsetY + (cy - vp.height / 2) / newScale;
  return { ...vp, scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY };
}
