import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { DataPoint3D } from '@quickplot/core-3d';

export interface PointDataset {
  name: string;
  color: string;
  points: DataPoint3D[];
  hidden?: boolean;
}

interface PointCloudProps {
  points: DataPoint3D[];
  color: string;
  /** World units. Surfaces span a 50-unit grid, so ~0.4 reads as a dot. */
  size?: number;
}

/**
 * Draws a dataset as a cloud of dots.
 *
 * Coordinates go in untransformed: `buildSurfaceGeometry` puts a surface's
 * domain on world XY with height on Z, so a data point at (x, y, z) already
 * lands on the same axes as the surfaces.
 */
export function PointCloud({ points, color, size = 0.4 }: PointCloudProps) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      positions[i * 3] = points[i].x;
      positions[i * 3 + 1] = points[i].y;
      positions[i * 3 + 2] = points[i].z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [points]);

  // Geometries hold GPU buffers that React won't reclaim on its own.
  useEffect(() => () => geometry.dispose(), [geometry]);

  if (!points.length) return null;

  return (
    <points geometry={geometry}>
      <pointsMaterial color={color} size={size} sizeAttenuation />
    </points>
  );
}
