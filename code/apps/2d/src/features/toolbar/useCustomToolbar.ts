import { useState, useCallback, useEffect } from 'react';

export type ToolId2D =
  | 'help'
  | 'themes'
  | '3d'
  | 'reset'
  | 'clear'
  | 'data'
  | 'share';

export const DEFAULT_TOPBAR_2D: ToolId2D[] = [
  'help',
  'themes',
  '3d',
  'reset',
  'clear',
];

export const DEFAULT_SIDEBAR_2D: ToolId2D[] = [
  'data',
  'share',
];

const STORAGE_KEY_TOPBAR = 'qp_toolbar_topbar_2d_v3';
const STORAGE_KEY_SIDEBAR = 'qp_toolbar_sidebar_2d_v3';

export interface DropIndicator {
  zone: 'topbar' | 'sidebar';
  index: number;
}

export function useCustomToolbar2D() {
  const [topbarTools, setTopbarTools] = useState<ToolId2D[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TOPBAR);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((t: string) => t !== 'special-pts') as ToolId2D[];
        }
      }
    } catch { /* ignore */ }
    return DEFAULT_TOPBAR_2D;
  });

  const [sidebarTools, setSidebarTools] = useState<ToolId2D[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SIDEBAR);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_SIDEBAR_2D;
  });

  const [activeDragTool, setActiveDragTool] = useState<{ toolId: ToolId2D; fromZone: 'topbar' | 'sidebar' } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TOPBAR, JSON.stringify(topbarTools));
      localStorage.setItem(STORAGE_KEY_SIDEBAR, JSON.stringify(sidebarTools));
    } catch { /* ignore */ }
  }, [topbarTools, sidebarTools]);

  const moveOrReorderTool = useCallback((
    toolId: ToolId2D,
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
    setTopbarTools(DEFAULT_TOPBAR_2D);
    setSidebarTools(DEFAULT_SIDEBAR_2D);
    try {
      localStorage.removeItem(STORAGE_KEY_TOPBAR);
      localStorage.removeItem(STORAGE_KEY_SIDEBAR);
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
