import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { ValidEquationResult } from './equationValidator';

interface Props {
  equation: ValidEquationResult;
  onClose: () => void;
}

export function GraphModal({ equation, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  // Coordinate boundaries: base range 5 fits Heart curves and common curves cleanly
  const baseRange = 5;
  const rangeX = baseRange / zoom;

  // Draw graph on canvas
  const renderGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const aspectRatio = width / height;
    const rangeY = rangeX / aspectRatio;

    const xMin = -rangeX + pan.x;
    const xMax = rangeX + pan.x;
    const yMin = -rangeY + pan.y;
    const yMax = rangeY + pan.y;

    // Coordinate conversion
    const toScreenX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
    const toScreenY = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;

    // 1. Clear background
    ctx.fillStyle = '#161412';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw subtle grid
    const roughSteps = 6;
    const stepRaw = rangeX / roughSteps;
    const magnitude = Math.pow(10, Math.floor(Math.log10(stepRaw)));
    const residual = stepRaw / magnitude;
    let step = magnitude;
    if (residual > 5) step = 5 * magnitude;
    else if (residual > 2) step = 2 * magnitude;

    ctx.strokeStyle = '#22201d';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const startX = Math.floor(xMin / step) * step;
    for (let x = startX; x <= xMax; x += step) {
      const sx = toScreenX(x);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
    }

    const startY = Math.floor(yMin / step) * step;
    for (let y = startY; y <= yMax; y += step) {
      const sy = toScreenY(y);
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
    }
    ctx.stroke();

    // 3. Draw Main Axes
    ctx.strokeStyle = '#4a463e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    // Y Axis (x = 0)
    if (xMin <= 0 && xMax >= 0) {
      const yAxisX = toScreenX(0);
      ctx.moveTo(yAxisX, 0);
      ctx.lineTo(yAxisX, height);
    }
    // X Axis (y = 0)
    if (yMin <= 0 && yMax >= 0) {
      const xAxisY = toScreenY(0);
      ctx.moveTo(0, xAxisY);
      ctx.lineTo(width, xAxisY);
    }
    ctx.stroke();

    // 4. Tick Labels
    ctx.fillStyle = '#78716c';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const xAxisY = Math.max(12, Math.min(height - 18, toScreenY(0)));
    for (let x = startX; x <= xMax; x += step) {
      if (Math.abs(x) < 0.0001) continue;
      const sx = toScreenX(x);
      ctx.fillText(x.toFixed(x % 1 === 0 ? 0 : 1), sx, xAxisY + 3);
    }

    const yAxisX = Math.max(16, Math.min(width - 24, toScreenX(0)));
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = startY; y <= yMax; y += step) {
      if (Math.abs(y) < 0.0001) continue;
      const sy = toScreenY(y);
      ctx.fillText(y.toFixed(y % 1 === 0 ? 0 : 1), yAxisX - 4, sy);
    }

    // 5. Plot the Function Curve based on equation type
    if (equation.type === 'cartesian' && equation.evalCartesian) {
      ctx.strokeStyle = '#fbbf24'; // QuickPlot Amber-400
      ctx.lineWidth = 2.2;
      ctx.beginPath();

      const samples = 400;
      let isFirst = true;

      for (let i = 0; i <= samples; i++) {
        const sx = (i / samples) * width;
        const x = xMin + (i / samples) * (xMax - xMin);
        try {
          const y = equation.evalCartesian(x);
          if (isNaN(y) || !isFinite(y)) {
            isFirst = true;
            continue;
          }
          const sy = toScreenY(y);
          if (sy < -500 || sy > height + 500) {
            isFirst = true;
            continue;
          }
          if (isFirst) {
            ctx.moveTo(sx, sy);
            isFirst = false;
          } else {
            ctx.lineTo(sx, sy);
          }
        } catch {
          isFirst = true;
        }
      }
      ctx.stroke();
    } else if (equation.type === 'polar' && equation.evalPolar) {
      // Polar curve: parametric sweep theta in [0, 2*pi]
      ctx.strokeStyle = '#f43f5e'; // Vibrant Rose / Red for Heart & Polar Curves
      ctx.lineWidth = 2.4;
      ctx.beginPath();

      const samples = 800;
      let isFirst = true;
      const twoPi = Math.PI * 2;

      for (let i = 0; i <= samples; i++) {
        const theta = (i / samples) * twoPi;
        try {
          const r = equation.evalPolar(theta);
          if (isNaN(r) || !isFinite(r)) {
            isFirst = true;
            continue;
          }
          const x = r * Math.cos(theta);
          const y = r * Math.sin(theta);
          const sx = toScreenX(x);
          const sy = toScreenY(y);

          if (isFirst) {
            ctx.moveTo(sx, sy);
            isFirst = false;
          } else {
            ctx.lineTo(sx, sy);
          }
        } catch {
          isFirst = true;
        }
      }
      ctx.stroke();
    } else if (equation.type === 'implicit' && equation.evalImplicit) {
      // Implicit equation: 2D Marching Squares zero-crossing contouring
      ctx.strokeStyle = '#f43f5e'; // Vibrant Rose
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();

      const RES_X = 140;
      const RES_Y = 105;
      const dx = (xMax - xMin) / RES_X;
      const dy = (yMax - yMin) / RES_Y;

      const W = RES_X + 1;
      const H = RES_Y + 1;
      const vals = new Float64Array(W * H);

      for (let j = 0; j < H; j++) {
        const wy = yMin + j * dy;
        for (let i = 0; i < W; i++) {
          const wx = xMin + i * dx;
          try {
            const v = equation.evalImplicit(wx, wy);
            vals[j * W + i] = isFinite(v) ? v : NaN;
          } catch {
            vals[j * W + i] = NaN;
          }
        }
      }

      const refine = (
        x0: number, y0: number,
        x1: number, y1: number,
        v0: number, v1: number
      ): [number, number] => {
        let t = v0 / (v0 - v1);
        if (!isFinite(t) || t < 0 || t > 1) t = 0.5;
        let loX = x0, loY = y0, fLo = v0;
        let hiX = x1, hiY = y1;
        for (let k = 0; k < 3; k++) {
          const midX = loX + t * (hiX - loX);
          const midY = loY + t * (hiY - loY);
          let fMid: number;
          try {
            fMid = equation.evalImplicit!(midX, midY);
          } catch {
            break;
          }
          if (!isFinite(fMid) || Math.abs(fMid) < 1e-9) return [midX, midY];
          if (Math.sign(fLo) !== Math.sign(fMid)) {
            hiX = midX;
            hiY = midY;
          } else {
            loX = midX;
            loY = midY;
            fLo = fMid;
          }
          t = 0.5;
        }
        return [(loX + hiX) * 0.5, (loY + hiY) * 0.5];
      };

      for (let j = 0; j < RES_Y; j++) {
        for (let i = 0; i < RES_X; i++) {
          const v00 = vals[j * W + i];
          const v10 = vals[j * W + (i + 1)];
          const v01 = vals[(j + 1) * W + i];
          const v11 = vals[(j + 1) * W + (i + 1)];
          if (isNaN(v00) || isNaN(v10) || isNaN(v01) || isNaN(v11)) continue;

          const wx0 = xMin + i * dx;
          const wx1 = wx0 + dx;
          const wy0 = yMin + j * dy;
          const wy1 = wy0 + dy;

          const pts: [number, number][] = [];
          if (Math.sign(v00) !== Math.sign(v10)) pts.push(refine(wx0, wy0, wx1, wy0, v00, v10));
          if (Math.sign(v10) !== Math.sign(v11)) pts.push(refine(wx1, wy0, wx1, wy1, v10, v11));
          if (Math.sign(v11) !== Math.sign(v01)) pts.push(refine(wx1, wy1, wx0, wy1, v11, v01));
          if (Math.sign(v01) !== Math.sign(v00)) pts.push(refine(wx0, wy1, wx0, wy0, v01, v00));

          if (pts.length === 2) {
            ctx.moveTo(toScreenX(pts[0][0]), toScreenY(pts[0][1]));
            ctx.lineTo(toScreenX(pts[1][0]), toScreenY(pts[1][1]));
          } else if (pts.length === 4) {
            const vCentre = equation.evalImplicit(wx0 + dx / 2, wy0 + dy / 2);
            const pairs: [[number, number], [number, number]][] =
              vCentre > 0 ? [[pts[0], pts[3]], [pts[1], pts[2]]] : [[pts[0], pts[1]], [pts[2], pts[3]]];
            for (const [a, b] of pairs) {
              ctx.moveTo(toScreenX(a[0]), toScreenY(a[1]));
              ctx.lineTo(toScreenX(b[0]), toScreenY(b[1]));
            }
          }
        }
      }
      ctx.stroke();
    }

    // 6. Draw hover coordinate crosshair
    if (hoverCoord && equation.type === 'cartesian' && equation.evalCartesian) {
      const hx = hoverCoord.x;
      const hy = equation.evalCartesian(hx);
      if (!isNaN(hy) && isFinite(hy)) {
        const sx = toScreenX(hx);
        const sy = toScreenY(hy);

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const label = `(${hx.toFixed(2)}, ${hy.toFixed(2)})`;
        ctx.font = '10px monospace';
        const metrics = ctx.measureText(label);
        const pw = metrics.width + 10;
        const ph = 18;
        const px = Math.min(width - pw - 6, Math.max(6, sx + 8));
        const py = Math.min(height - ph - 6, Math.max(6, sy - 24));

        ctx.fillStyle = 'rgba(24, 22, 20, 0.9)';
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, px + 5, py + ph / 2);
      }
    }
  }, [rangeX, pan, equation, hoverCoord]);

  useEffect(() => {
    renderGraph();
  }, [renderGraph]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const aspectRatio = canvas.width / canvas.height;
    const rangeY = rangeX / aspectRatio;

    const xMin = -rangeX + pan.x;
    const xMax = rangeX + pan.x;
    const wx = xMin + (mx / canvas.width) * (xMax - xMin);

    setHoverCoord({ x: wx, y: 0 });

    if (isDragging) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const worldDx = -(dx / canvas.width) * (2 * rangeX);
      const worldDy = (dy / canvas.height) * (2 * rangeY);
      setPan({
        x: dragStart.current.panX + worldDx,
        y: dragStart.current.panY + worldDy,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((z) => Math.max(0.2, Math.min(20, z * factor)));
  };

  const handleOpenFull = () => {
    const rawEq = equation.cleanedExpr;
    const domain =
      equation.type === 'polar'
        ? 'polar'
        : equation.type === 'implicit'
        ? 'implicit'
        : 'cartesian';

    const payload = {
      eqs: [{ e: rawEq, t: domain, d: domain, c: '#4A9EE0', v: true }],
    };
    const hash = btoa(encodeURIComponent(JSON.stringify(payload)));
    const url = `http://localhost:5174/2d/#${hash}`;
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-[400px] bg-[#1a1816] border border-amber-500/40 rounded-xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-amber-500/20">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#221f1b] border-b border-neutral-800">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${
                equation.type === 'polar' || equation.type === 'implicit'
                  ? 'bg-rose-500'
                  : 'bg-amber-400'
              }`}
            />
            <h3 className="font-pixel text-amber-300 text-[11px] truncate tracking-wider">
              {equation.displayTitle}
            </h3>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 uppercase">
              {equation.type}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center text-xs transition-colors"
            title="Close graph popup"
          >
            ✕
          </button>
        </div>

        {/* Canvas view */}
        <div className="relative w-full aspect-[4/3] bg-[#161412] overflow-hidden">
          <canvas
            ref={canvasRef}
            width={380}
            height={285}
            className="w-full h-full cursor-grab active:cursor-grabbing block"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setIsDragging(false);
              setHoverCoord(null);
            }}
            onWheel={handleWheel}
          />

          {/* Canvas Floating Controls */}
          <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1 bg-neutral-900/90 border border-neutral-700/80 rounded-lg p-1 shadow-lg">
            <button
              onClick={() => setZoom((z) => Math.min(20, z * 1.3))}
              className="w-6 h-6 rounded hover:bg-neutral-800 text-neutral-300 font-mono text-xs flex items-center justify-center active:scale-95 transition-transform"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.2, z / 1.3))}
              className="w-6 h-6 rounded hover:bg-neutral-800 text-neutral-300 font-mono text-xs flex items-center justify-center active:scale-95 transition-transform"
              title="Zoom Out"
            >
              -
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="w-6 h-6 rounded hover:bg-neutral-800 text-neutral-300 font-mono text-xs flex items-center justify-center active:scale-95 transition-transform"
              title="Reset View"
            >
              ↺
            </button>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#1e1b18] border-t border-neutral-800/80">
          <button
            onClick={handleOpenFull}
            className="text-[10px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline transition-colors"
            title="Open in full QuickPlot 2D grapher"
          >
            <span>↗ Open in QuickPlot 2D</span>
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-mono transition-colors active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
