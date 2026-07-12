import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { buildSurfaceGeometry } from '@quickplot/renderer';
import { evaluate3D } from '@quickplot/core';
import type { Surface, SurfaceTheme } from '@quickplot/renderer';
export type { Surface };

function CartesianSurface({ expr, color = '#4A9EE0' }: { expr: string; color?: string }) {
  const fn = useMemo(() => evaluate3D(expr), [expr]);
  const geometry = useMemo(() => {
    if (!fn) return new THREE.BufferGeometry();
    return buildSurfaceGeometry(fn);
  }, [fn]);

  if (!fn) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} side={THREE.DoubleSide} wireframe={false} />
    </mesh>
  );
}

interface Renderer3DProps {
  surfaces: Surface[];
  theme?: SurfaceTheme;
}

export function Renderer3D({ surfaces, theme }: Renderer3DProps) {
  const bg = theme?.background ?? '#1a1a2e';
  return (
    <Canvas camera={{ position: [20, 20, 20], fov: 55 }} style={{ background: bg, width: '100%', height: '100%' }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
      <Grid
        args={[50, 50]}
        cellColor={theme?.gridColor ?? '#2a2a4a'}
        sectionColor={theme?.axisColor ?? '#4a4a8a'}
        fadeDistance={80}
        position={[0, 0, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      {surfaces.map((s, i) => (
        <CartesianSurface key={`${s.expr}-${i}`} expr={s.expr} color={s.color} />
      ))}
      <OrbitControls enablePan enableZoom enableRotate makeDefault />
    </Canvas>
  );
}
