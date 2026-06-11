import {
  forwardRef, useImperativeHandle,
  useRef, useEffect, useCallback, useState,
} from 'react';
import {
  type Viewport, DEFAULT_VIEWPORT,
  pan   as panVP,
  zoom  as zoomVP,
  screenToWorld,
  drawGrid, drawCurves,
  type PlotCurve, type SpecialPoint,
  type CanvasTheme, DEFAULT_THEME,
} from '@quickplot/renderer';

// Precision: number of decimal places appropriate for the current zoom level
function coordPrec(scale: number): number {
  return Math.max(0, Math.min(6, Math.round(Math.log10(scale) - 1)));
}

interface Props {
  curves: PlotCurve[];
  specialPoints?: SpecialPoint[];
  theme?: CanvasTheme;
}

export interface Canvas2DHandle {
  copyImage(): Promise<void>;
  resetView(): void;
}

export const Canvas2D = forwardRef<Canvas2DHandle, Props>(function Canvas2D(
  { curves, specialPoints, theme },
  ref,
) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const vpRef      = useRef<Viewport>(DEFAULT_VIEWPORT);
  const dragging   = useRef(false);
  const lastPos    = useRef({ x: 0, y: 0 });

  const [viewport,    setViewport]    = useState<Viewport>(DEFAULT_VIEWPORT);
  const [mouseWorld,  setMouseWorld]  = useState<[number, number] | null>(null);

  useEffect(() => { vpRef.current = viewport; }, [viewport]);

  // ── expose handle ─────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    copyImage() {
      const canvas = canvasRef.current;
      if (!canvas) return Promise.resolve();
      return new Promise<void>(resolve => {
        canvas.toBlob(async blob => {
          if (!blob) { resolve(); return; }
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
          } catch {
            const url = URL.createObjectURL(blob);
            Object.assign(document.createElement('a'), {
              href: url, download: 'quickplot.png',
            }).click();
            URL.revokeObjectURL(url);
          }
          resolve();
        });
      });
    },
    resetView() {
      setViewport(vp => ({ ...DEFAULT_VIEWPORT, width: vp.width, height: vp.height }));
    },
  }));

  // ── resize ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const dpr = window.devicePixelRatio;
        const { width, height } = entry.contentRect;
        canvas.width  = Math.round(width  * dpr);
        canvas.height = Math.round(height * dpr);
        setViewport(vp => ({ ...vp, width, height }));
      }
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // ── font-ready redraw ─────────────────────────────────────────────────
  useEffect(() => {
    document.fonts.ready.then(() => setViewport(vp => ({ ...vp })));
  }, []);

  // ── non-passive wheel ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handle = (e: WheelEvent) => {
      e.preventDefault();
      const rect   = canvas.getBoundingClientRect();
      const cx     = e.clientX - rect.left;
      const cy     = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setViewport(vp => zoomVP(vp, factor, cx, cy));
    };
    canvas.addEventListener('wheel', handle, { passive: false });
    return () => canvas.removeEventListener('wheel', handle);
  }, []);

  // ── draw ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewport.width === 0 || viewport.height === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio;
    ctx.save();
    ctx.scale(dpr, dpr);
    drawGrid(ctx, viewport, theme ?? DEFAULT_THEME);
    drawCurves(ctx, viewport, curves, specialPoints);
    ctx.restore();
  }, [viewport, curves, specialPoints, theme]);

  // ── mouse ─────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    dragging.current = true;
    e.currentTarget.style.cursor = 'grabbing';
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect     = canvas.getBoundingClientRect();
    const [wx, wy] = screenToWorld(vpRef.current, e.clientX - rect.left, e.clientY - rect.top);
    setMouseWorld([wx, wy]);

    if (dragging.current) {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      setViewport(vp => panVP(vp, dx, dy));
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const stopDrag = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    dragging.current = false;
    e.currentTarget.style.cursor = 'crosshair';
  }, []);

  const onMouseLeave = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    dragging.current = false;
    e.currentTarget.style.cursor = 'crosshair';
    setMouseWorld(null);
  }, []);

  const onDoubleClick = useCallback(() => {
    setViewport(vp => ({ ...DEFAULT_VIEWPORT, width: vp.width, height: vp.height }));
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const PAN_PX = 40;
    switch (e.key) {
      case 'ArrowLeft':  e.preventDefault(); setViewport(vp => panVP(vp, -PAN_PX, 0)); break;
      case 'ArrowRight': e.preventDefault(); setViewport(vp => panVP(vp,  PAN_PX, 0)); break;
      case 'ArrowUp':    e.preventDefault(); setViewport(vp => panVP(vp, 0, -PAN_PX)); break;
      case 'ArrowDown':  e.preventDefault(); setViewport(vp => panVP(vp, 0,  PAN_PX)); break;
      case '+': case '=': setViewport(vp => zoomVP(vp, 1.2, vp.width / 2, vp.height / 2)); break;
      case '-': case '_': setViewport(vp => zoomVP(vp, 1 / 1.2, vp.width / 2, vp.height / 2)); break;
    }
  }, []);

  const prec = coordPrec(viewport.scale);

  return (
    <div className="relative w-full h-full select-none">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="w-full h-full cursor-crosshair outline-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={onMouseLeave}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
      />
      {mouseWorld && (
        <div className="absolute bottom-3 left-3 pointer-events-none bg-neutral-900/75 text-amber-300 px-3 py-2 rounded font-pixel text-xs leading-6">
          x&nbsp;{mouseWorld[0].toFixed(prec)}<br />
          y&nbsp;{mouseWorld[1].toFixed(prec)}
        </div>
      )}
    </div>
  );
});
