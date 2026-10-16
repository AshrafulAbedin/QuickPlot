import { useState, useEffect, useCallback } from 'react';
import type { Surface } from '../canvas-3d/Renderer3D';

export interface LocalWorkspace3D {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  surfaces: Surface[];
  wireframe?: boolean;
  showAxes?: boolean;
  themeName?: string;
}

const STORAGE_KEY = 'quickplot:workspaces:3d:v1';

export const STARTER_TEMPLATES_3D: Array<Omit<LocalWorkspace3D, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    title: 'Saddle Surface (Hyperbolic Paraboloid)',
    themeName: 'Midnight',
    wireframe: false,
    showAxes: true,
    surfaces: [
      { type: 'cartesian', expr: 'x^2 - y^2', color: '#EF4444' },
    ],
  },
  {
    title: 'Ripple Waves',
    themeName: 'Blueprint',
    wireframe: true,
    showAxes: true,
    surfaces: [
      { type: 'cartesian', expr: 'sin(sqrt(x^2 + y^2) * 2)', color: '#3B82F6' },
    ],
  },
  {
    title: 'Sombrero (Bessel-like)',
    themeName: 'Dark',
    wireframe: false,
    showAxes: true,
    surfaces: [
      { type: 'cartesian', expr: 'sin(sqrt(x^2 + y^2) * 2) / (sqrt(x^2 + y^2) + 0.2)', color: '#10B981' },
    ],
  },
  {
    title: 'Egg Crate Surface',
    themeName: 'Midnight',
    wireframe: false,
    showAxes: true,
    surfaces: [
      { type: 'cartesian', expr: 'sin(x) * cos(y)', color: '#F59E0B' },
    ],
  },
];

function generateId(): string {
  return 'ws-3d-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

import type { AuthUser } from '@quickplot/auth';

function getStorageKey3D(user: AuthUser | null): string | null {
  return user?.uid ? `quickplot:workspaces:3d:${user.uid}` : null;
}

function loadInitialWorkspaces3D(user: AuthUser | null): LocalWorkspace3D[] {
  const key = getStorageKey3D(user);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    // Migration: check legacy storage key once
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem(key, legacy);
        localStorage.removeItem(STORAGE_KEY);
        return parsed;
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function useLocalWorkspaces3D(user: AuthUser | null = null) {
  const [workspaces, setWorkspaces] = useState<LocalWorkspace3D[]>(() => loadInitialWorkspaces3D(user));
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    setWorkspaces(loadInitialWorkspaces3D(user));
    setActiveWorkspaceId(null);
  }, [user?.uid]);

  useEffect(() => {
    const key = getStorageKey3D(user);
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(workspaces));
    } catch {
      /* ignore */
    }
  }, [workspaces, user?.uid]);

  const saveWorkspace = useCallback((
    title: string,
    surfaces: Surface[],
    options?: { wireframe?: boolean; showAxes?: boolean; themeName?: string },
  ): string => {
    const now = Date.now();
    let targetId = activeWorkspaceId;

    setWorkspaces((prev) => {
      const existingIdx = targetId ? prev.findIndex(w => w.id === targetId) : -1;
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          title: title.trim() || 'Untitled 3D Graph',
          surfaces,
          wireframe: options?.wireframe ?? updated[existingIdx].wireframe,
          showAxes: options?.showAxes ?? updated[existingIdx].showAxes,
          themeName: options?.themeName ?? updated[existingIdx].themeName,
          updatedAt: now,
        };
        return updated;
      } else {
        const newId = generateId();
        targetId = newId;
        const newWs: LocalWorkspace3D = {
          id: newId,
          title: title.trim() || 'Untitled 3D Graph',
          createdAt: now,
          updatedAt: now,
          surfaces,
          wireframe: options?.wireframe ?? false,
          showAxes: options?.showAxes ?? true,
          themeName: options?.themeName ?? 'Midnight',
        };
        return [newWs, ...prev];
      }
    });

    if (!activeWorkspaceId && targetId) {
      setActiveWorkspaceId(targetId);
    }
    return targetId ?? '';
  }, [activeWorkspaceId]);

  const deleteWorkspace = useCallback((id: string) => {
    setWorkspaces(prev => prev.filter(w => w.id !== id));
    if (activeWorkspaceId === id) {
      setActiveWorkspaceId(null);
    }
  }, [activeWorkspaceId]);

  const duplicateWorkspace = useCallback((id: string): string | null => {
    const target = workspaces.find(w => w.id === id);
    if (!target) return null;
    const now = Date.now();
    const newId = generateId();
    const copy: LocalWorkspace3D = {
      ...target,
      id: newId,
      title: `${target.title} (Copy)`,
      createdAt: now,
      updatedAt: now,
      surfaces: JSON.parse(JSON.stringify(target.surfaces)),
    };
    setWorkspaces(prev => [copy, ...prev]);
    return newId;
  }, [workspaces]);

  const renameWorkspace = useCallback((id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setWorkspaces(prev =>
      prev.map(w => w.id === id ? { ...w, title: trimmed, updatedAt: Date.now() } : w),
    );
  }, []);

  const exportAllWorkspaces = useCallback(() => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(workspaces, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `quickplot_3d_workspaces_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
    dlAnchor.remove();
  }, [workspaces]);

  const importWorkspaces = useCallback((jsonStr: string): number => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) return 0;
      let count = 0;
      setWorkspaces(prev => {
        const existingIds = new Set(prev.map(w => w.id));
        const additions: LocalWorkspace3D[] = [];
        for (const item of parsed) {
          if (item && item.title && Array.isArray(item.surfaces)) {
            const id = (!item.id || existingIds.has(item.id)) ? generateId() : item.id;
            additions.push({
              id,
              title: item.title,
              createdAt: item.createdAt || Date.now(),
              updatedAt: item.updatedAt || Date.now(),
              surfaces: item.surfaces,
              wireframe: item.wireframe,
              showAxes: item.showAxes,
              themeName: item.themeName,
            });
            count++;
          }
        }
        return [...additions, ...prev];
      });
      return count;
    } catch {
      return 0;
    }
  }, []);

  return {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    saveWorkspace,
    deleteWorkspace,
    duplicateWorkspace,
    renameWorkspace,
    exportAllWorkspaces,
    importWorkspaces,
  };
}
