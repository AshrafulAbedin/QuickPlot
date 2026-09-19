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

export const DEFAULT_SURFACE_THEME: SurfaceTheme = SURFACE_THEMES.dark;

const GRID_SIZE = 50;
const SEGMENTS  = 100;

export function buildSurfaceGeometry(
  fn: (x: number, y: number) => number,
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE, SEGMENTS, SEGMENTS);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = fn(x, y);
    pos.setZ(i, isFinite(z) ? z : 0);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function buildAxesHelper(length = GRID_SIZE / 2): THREE.AxesHelper {
  return new THREE.AxesHelper(length);
}