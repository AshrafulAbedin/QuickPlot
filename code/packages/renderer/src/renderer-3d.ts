import * as THREE from 'three';

export interface Surface {
  type: 'cartesian';
  expr: string;
  color?: string;
}

export interface SurfaceTheme {
  background: string;
  gridColor: string;
  axisColor: string;
}

export const DEFAULT_SURFACE_THEME: SurfaceTheme = {
  background: '#1a1a2e',
  gridColor:  '#2a2a4a',
  axisColor:  '#4a4a8a',
};

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