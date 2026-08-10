import {
  useMemo, useEffect, useRef, useImperativeHandle, forwardRef,
} from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import {
  buildSurfaceGeometry, buildBoundingBox, DEFAULT_SURFACE_THEME,
  PLOT_SIZE, PLOT_BOUND,
} from '@quickplot/renderer-3d';
import { evaluate3D } from '@quickplot/core-3d';
import type { Surface, SurfaceTheme } from '@quickplot/renderer-3d';
import { PointCloud, type PointDataset } from './PointCloud';
export type { Surface };
export type { PointDataset };

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

/** Wireframe cube marking the plot bounds. */
function BoundingBox({ color }: { color: string }) {
  const geometry = useMemo(() => buildBoundingBox(PLOT_SIZE), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.45} />
    </lineSegments>
  );
}

interface Renderer3DProps {
  surfaces: Surface[];
  /** Imported point data, drawn alongside the surfaces. */
  datasets?: PointDataset[];
  theme?: SurfaceTheme;
  wireframe?: boolean;
  showAxes?: boolean;
}

export const Renderer3D = forwardRef<Renderer3DHandle, Renderer3DProps>(function Renderer3D(
  { surfaces, datasets = [], theme = DEFAULT_SURFACE_THEME, wireframe = false, showAxes = true },
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
        // Framed off the cube's bounding sphere (r = PLOT_SIZE * sqrt(3)/2 ≈ 52)
        // rather than its flat silhouette: perspective pushes the near corner
        // outward, so a silhouette-based fit clips it. distance = r / sin(fov/2)
        // ≈ 113, plus margin, spread over the (1,1,1) diagonal.
        // `up: [0, 0, 1]` makes this a Z-up scene. buildSurfaceGeometry stores
        // the function's height on Z, so under Three.js's default Y-up the
        // graph rendered on its side — the domain plane stood vertical and
        // peaks pointed at the viewer. Z-up is also what every other plotting
        // tool shows.
        camera={{ position: [68, 68, 68], fov: 55, far: 500, up: [0, 0, 1] }}
        // Required so the drawing buffer still holds the frame when we snapshot it.
        gl={{ preserveDrawingBuffer: true }}
        style={{ background: theme.background, width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <Grid
          args={[PLOT_SIZE, PLOT_SIZE]}
          cellColor={theme.gridColor}
          sectionColor={theme.axisColor}
          fadeDistance={140}
          position={[0, 0, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        {showAxes && (
          <>
            <axesHelper args={[PLOT_BOUND]} />
            <BoundingBox color={theme.axisColor} />
          </>
        )}
        {surfaces.map((s, i) => (
          <CartesianSurface
            key={`${s.expr}-${i}`}
            expr={s.expr}
            color={s.color}
            wireframe={wireframe}
          />
        ))}
        {datasets.filter(d => !d.hidden).map((d, i) => (
          <PointCloud key={`${d.name}-${i}`} points={d.points} color={d.color} />
        ))}
        <OrbitControls ref={controlsRef as never} enablePan enableZoom enableRotate makeDefault />
      </Canvas>
    </div>
  );
});
