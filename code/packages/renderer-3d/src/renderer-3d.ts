import * as THREE from 'three';

export interface Surface {
  type: 'cartesian';
  expr: string;
  color?: string;
  hidden?: boolean;
}

export interface SurfaceTheme {
  name: string;
  background: string;
  gridColor: string;
  axisColor: string;
}

/** Mirrors the 2D canvas themes so both graphers read as one product. */
export const SURFACE_THEMES: Record<string, SurfaceTheme> = {
  dark: {
    name: 'Dark',
    background: '#1a1a2e',
    gridColor:  '#2a2a4a',
    axisColor:  '#4a4a8a',
  },
  midnight: {
    name: 'Midnight',
    background: '#0d0d0d',
    gridColor:  'rgba(255,100,50,0.18)',
    axisColor:  '#ff6432',
  },
  blueprint: {
    name: 'Blueprint',
    background: '#0a2a5e',
    gridColor:  'rgba(100,160,255,0.28)',
    axisColor:  '#80b4ff',
  },
  chalk: {
    name: 'Chalk',
    background: '#1e3a1e',
    gridColor:  'rgba(255,255,255,0.14)',
    axisColor:  '#ccffcc',
  },
  paper: {
    name: 'Paper',
    background: '#fdf6e3',
    gridColor:  'rgba(0,0,0,0.12)',
    axisColor:  '#333333',
  },
  cork: {
    name: 'Cork',
    background: '#C9A87C',
    gridColor:  'rgba(110,72,28,0.38)',
    axisColor:  '#4E2E10',
  },
};

export const DEFAULT_SURFACE_THEME: SurfaceTheme = SURFACE_THEMES.midnight;

const GRID_SIZE = 60;
const SEGMENTS  = 120;

/** Side length of the plot volume. Domain is ±PLOT_SIZE / 2 on every axis. */
export const PLOT_SIZE = GRID_SIZE;

/** Half-extent — the domain runs from -PLOT_BOUND to +PLOT_BOUND. */
export const PLOT_BOUND = GRID_SIZE / 2;

export function buildSurfaceGeometry(
  fn: (x: number, y: number) => number,
  /**
   * Heights are clamped to this so a steep surface stays inside the bounding
   * box instead of shooting past the camera. Matches how Desmos clips a graph
   * at the edge of its viewing cube.
   */
  zLimit = PLOT_BOUND,
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE, SEGMENTS, SEGMENTS);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = fn(x, y);
    // Non-finite (poles, log of a negative) flattens to 0, as before.
    pos.setZ(i, isFinite(z) ? Math.max(-zLimit, Math.min(zLimit, z)) : 0);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function buildAxesHelper(length = PLOT_BOUND): THREE.AxesHelper {
  return new THREE.AxesHelper(length);
}

/**
 * Wireframe cube framing the plot volume — the 12 edges only, no faces, so it
 * reads as an axis frame rather than a solid that hides the surface.
 */
export function buildBoundingBox(size = GRID_SIZE): THREE.BufferGeometry {
  const box = new THREE.BoxGeometry(size, size, size);
  const edges = new THREE.EdgesGeometry(box);
  box.dispose();
  return edges;
}