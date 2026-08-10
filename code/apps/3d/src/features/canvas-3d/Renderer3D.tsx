import {
  useMemo, useRef, useImperativeHandle, forwardRef,
} from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { buildSurfaceGeometry, DEFAULT_SURFACE_THEME } from '@quickplot/renderer-3d';
import { evaluate3D } from '@quickplot/core-3d';
import type { Surface, SurfaceTheme } from '@quickplot/renderer-3d';
export type { Surface };

export interface Renderer3DHandle {
  resetView(): void;
  copyImage(): Promise<void>;
}

function CartesianSurface(
  { expr, color = '#4A9EE0', wireframe }: { expr: string; color?: string; wireframe: boolean },
) {
  const fn = useMemo(() => evaluate3D(expr), [expr]);
  const geometry = useMemo(() => {
    if (!fn) return new THREE.BufferGeometry();
    return buildSurfaceGeometry(fn);
  }, [fn]);

  if (!fn) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} side={THREE.DoubleSide} wireframe={wireframe} />
    </mesh>
  );
}

interface Renderer3DProps {
  surfaces: Surface[];
  theme?: SurfaceTheme;
  wireframe?: boolean;
  showAxes?: boolean;
}

export const Renderer3D = forwardRef<Renderer3DHandle, Renderer3DProps>(function Renderer3D(
  { surfaces, theme = DEFAULT_SURFACE_THEME, wireframe = false, showAxes = true },
  ref,
) {
  const wrapRef     = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<{ reset: () => void } | null>(null);

  useImperativeHandle(ref, () => ({
    resetView() {
      controlsRef.current?.reset();
    },
    async copyImage() {
      const canvas = wrapRef.current?.querySelector('canvas');
      if (!canvas) return;
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      } catch {
        // Clipboard image writes are blocked in some browsers — fall back to a download.
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'quickplot-3d.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    },
  }), []);

  return (
    <div ref={wrapRef} className="h-full w-full">
      <Canvas
        // Surfaces span a 50-unit grid, so the camera has to sit far enough
        // back to frame the whole thing at this field of view.
        camera={{ position: [38, 38, 38], fov: 55 }}
        // Required so the drawing buffer still holds the frame when we snapshot it.
        gl={{ preserveDrawingBuffer: true }}
        style={{ background: theme.background, width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <Grid
          args={[50, 50]}
          cellColor={theme.gridColor}
          sectionColor={theme.axisColor}
          fadeDistance={80}
          position={[0, 0, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        {showAxes && <axesHelper args={[25]} />}
        {surfaces.map((s, i) => (
          <CartesianSurface
            key={`${s.expr}-${i}`}
            expr={s.expr}
            color={s.color}
            wireframe={wireframe}
          />
        ))}
        <OrbitControls ref={controlsRef as never} enablePan enableZoom enableRotate makeDefault />
      </Canvas>
    </div>
  );
});
