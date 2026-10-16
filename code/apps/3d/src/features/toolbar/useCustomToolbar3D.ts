import { useState, useCallback, useEffect } from 'react';

export type ToolId3D =
  | 'help'
  | 'wireframe'
  | 'axes'
  | 'themes'
  | '2d'
  | 'reset'
  | 'clear'
  | 'data'
  | 'share';

export const DEFAULT_TOPBAR_3D: ToolId3D[] = [
  'help',
  'wireframe',
  'axes',
  'themes',
  '2d',
  'reset',
  'clear',
];

export const DEFAULT_SIDEBAR_3D: ToolId3D[] = [
  'data',
  'share',
];

const STORAGE_KEY_TOPBAR_3D = 'qp_toolbar_topbar_3d_v2';
const STORAGE_KEY_SIDEBAR_3D = 'qp_toolbar_sidebar_3d_v2';

export interface DropIndicator3D {
  zone: 'topbar' | 'sidebar';
  index: number;
}

export function useCustomToolbar3D() {
  const [topbarTools, setTopbarTools] = useState<ToolId3D[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TOPBAR_3D);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_TOPBAR_3D;
  });

  const [sidebarTools, setSidebarTools] = useState<ToolId3D[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SIDEBAR_3D);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_SIDEBAR_3D;
  });

  const [activeDragTool, setActiveDragTool] = useState<{ toolId: ToolId3D; fromZone: 'topbar' | 'sidebar' } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator3D | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TOPBAR_3D, JSON.stringify(topbarTools));
      localStorage.setItem(STORAGE_KEY_SIDEBAR_3D, JSON.stringify(sidebarTools));
    } catch { /* ignore */ }
  }, [topbarTools, sidebarTools]);

  const moveOrReorderTool = useCallback((
    toolId: ToolId3D,
    fromZone: 'topbar' | 'sidebar',
    toZone: 'topbar' | 'sidebar',
    targetIndex?: number,
  ) => {
    setTopbarTools(prevTop => {
      let newTop = [...prevTop];
      if (fromZone === 'topbar') {
        newTop = newTop.filter(t => t !== toolId);
      }
      if (toZone === 'topbar') {
        const insertAt = typeof targetIndex === 'number'
          ? Math.max(0, Math.min(newTop.length, targetIndex))
          : newTop.length;
        newTop.splice(insertAt, 0, toolId);
      }
      return newTop;
    });

    setSidebarTools(prevSide => {
      let newSide = [...prevSide];
      if (fromZone === 'sidebar') {
        newSide = newSide.filter(t => t !== toolId);
      }
      if (toZone === 'sidebar') {
        const insertAt = typeof targetIndex === 'number'
          ? Math.max(0, Math.min(newSide.length, targetIndex))
          : newSide.length;
        newSide.splice(insertAt, 0, toolId);
      }
      return newSide;
    });
  }, []);

  const resetToolbarLayout = useCallback(() => {
    setTopbarTools(DEFAULT_TOPBAR_3D);
    setSidebarTools(DEFAULT_SIDEBAR_3D);
    try {
      localStorage.removeItem(STORAGE_KEY_TOPBAR_3D);
      localStorage.removeItem(STORAGE_KEY_SIDEBAR_3D);
    } catch { /* ignore */ }
  }, []);

  return {
    topbarTools,
    sidebarTools,
    activeDragTool,
    setActiveDragTool,
    dropIndicator,
    setDropIndicator,
    moveOrReorderTool,
    resetToolbarLayout,
  };
}
