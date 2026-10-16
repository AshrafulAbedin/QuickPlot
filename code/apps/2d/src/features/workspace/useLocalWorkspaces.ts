import { useState, useEffect, useCallback } from 'react';
import type { EquationEntry } from '../equations/types';
import type { Slider } from '../sliders/SliderPanel';

export interface LocalWorkspace {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  equations: EquationEntry[];
  sliders: Record<string, Slider>;
  themeName?: string;
}

const STORAGE_KEY = 'quickplot:workspaces:v2';

// Built-in starter templates for quick exploration
export const STARTER_TEMPLATES: Array<Omit<LocalWorkspace, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    title: 'Heart Curve (Implicit)',
    themeName: 'Default',
    equations: [
      {
        id: 'tmpl-heart-1',
        type: 'implicit',
        expression: '(x^2 + y^2 - 1)^3 = x^2 * y^3',
        color: '#E05252',
        visible: true,
        error: null,
        tMin: 0,
        tMax: 6.28,
      },
    ],
    sliders: {},
  },
  {
    title: 'Harmonic Wave (with Sliders)',
    themeName: 'Default',
    equations: [
      {
        id: 'tmpl-wave-1',
        type: 'cartesian',
        expression: 'a * sin(b * x)',
        color: '#4A9EE0',
        visible: true,
        error: null,
        tMin: 0,
        tMax: 6.28,
      },
      {
        id: 'tmpl-wave-2',
        type: 'cartesian',
        expression: 'a * cos(b * x)',
        color: '#E0A030',
        visible: true,
        error: null,
        tMin: 0,
        tMax: 6.28,
      },
    ],
    sliders: {
      a: { name: 'a', value: 2, min: -5, max: 5, step: 0.1, speed: 1 },
      b: { name: 'b', value: 1.5, min: 0.2, max: 4, step: 0.1, speed: 1 },
    },
  },
  {
    title: 'Butterfly Curve (Polar)',
    themeName: 'Default',
    equations: [
      {
        id: 'tmpl-polar-1',
        type: 'polar',
        expression: 'exp(cos(theta)) - 2*cos(4*theta) + sin(theta/12)^5',
        color: '#52C77C',
        visible: true,
        error: null,
        tMin: 0,
        tMax: 24 * Math.PI,
      },
    ],
    sliders: {},
  },
  {
    title: 'Lissajous Knot (Parametric)',
    themeName: 'Default',
    equations: [
      {
        id: 'tmpl-param-1',
        type: 'parametric',
        expression: '3 * sin(3 * t)',
        expressionY: '3 * cos(2 * t)',
        color: '#B860D0',
        visible: true,
        error: null,
        tMin: 0,
        tMax: 2 * Math.PI,
      },
    ],
    sliders: {},
  },
];

import type { AuthUser } from '@quickplot/auth';

function getStorageKey(user: AuthUser | null): string | null {
  return user?.uid ? `quickplot:workspaces:2d:${user.uid}` : null;
}

function loadStoredWorkspaces(user: AuthUser | null): LocalWorkspace[] {
  const key = getStorageKey(user);
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
  } catch {
    /* fallback to empty */
  }
  return [];
}

export function useLocalWorkspaces(user: AuthUser | null = null) {
  const [workspaces, setWorkspaces] = useState<LocalWorkspace[]>(() => loadStoredWorkspaces(user));
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  // When user changes (login, logout, switch account), reload workspaces
  useEffect(() => {
    setWorkspaces(loadStoredWorkspaces(user));
    setActiveWorkspaceId(null);
  }, [user?.uid]);

  // Sync to localStorage whenever workspaces change for the signed-in user
  useEffect(() => {
    const key = getStorageKey(user);
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(workspaces));
    } catch {
      /* localStorage full or quota exceeded */
    }
  }, [workspaces, user?.uid]);

  const saveWorkspace = useCallback(
    (params: {
      id?: string;
      title: string;
      equations: EquationEntry[];
      sliders: Record<string, Slider>;
      themeName?: string;
    }): LocalWorkspace => {
      const now = Date.now();
      const existingId = params.id || activeWorkspaceId;

      let savedWs: LocalWorkspace;

      setWorkspaces((prev) => {
        const existingIdx = existingId ? prev.findIndex((w) => w.id === existingId) : -1;
        if (existingIdx >= 0) {
          const current = prev[existingIdx];
          savedWs = {
            ...current,
            title: params.title.trim() || current.title,
            updatedAt: now,
            equations: params.equations,
            sliders: params.sliders,
            themeName: params.themeName ?? current.themeName,
          };
          const next = [...prev];
          next[existingIdx] = savedWs;
          // Sort by updatedAt descending
          return next.sort((a, b) => b.updatedAt - a.updatedAt);
        } else {
          savedWs = {
            id: `ws-${now}-${Math.random().toString(36).slice(2, 7)}`,
            title: params.title.trim() || 'Untitled Graph',
            createdAt: now,
            updatedAt: now,
            equations: params.equations,
            sliders: params.sliders,
            themeName: params.themeName,
          };
          return [savedWs, ...prev];
        }
      });

      // @ts-expect-error assigned synchronously above in callback
      setActiveWorkspaceId(savedWs?.id ?? existingId);
      // @ts-expect-error assigned synchronously above in callback
      return savedWs;
    },
    [activeWorkspaceId],
  );

  const deleteWorkspace = useCallback(
    (id: string) => {
      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
      if (activeWorkspaceId === id) {
        setActiveWorkspaceId(null);
      }
    },
    [activeWorkspaceId],
  );

  const duplicateWorkspace = useCallback((id: string) => {
    setWorkspaces((prev) => {
      const original = prev.find((w) => w.id === id);
      if (!original) return prev;
      const now = Date.now();
      const copy: LocalWorkspace = {
        ...original,
        id: `ws-${now}-${Math.random().toString(36).slice(2, 7)}`,
        title: `${original.title} (Copy)`,
        createdAt: now,
        updatedAt: now,
      };
      return [copy, ...prev];
    });
  }, []);

  const renameWorkspace = useCallback((id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === id ? { ...w, title: trimmed, updatedAt: Date.now() } : w)),
    );
  }, []);

  const exportAllWorkspaces = useCallback(() => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(workspaces, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `quickplot-workspaces-${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
    dlAnchor.remove();
  }, [workspaces]);

  const importWorkspaces = useCallback((jsonString: string): { count: number; error?: string } => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        return { count: 0, error: 'Invalid file format: Expected an array of workspaces.' };
      }
      const valid: LocalWorkspace[] = [];
      const now = Date.now();
      for (const item of parsed) {
        if (item && typeof item.title === 'string' && Array.isArray(item.equations)) {
          valid.push({
            id: item.id || `ws-${now}-${Math.random().toString(36).slice(2, 7)}`,
            title: item.title,
            createdAt: item.createdAt || now,
            updatedAt: item.updatedAt || now,
            equations: item.equations,
            sliders: item.sliders || {},
            themeName: item.themeName,
          });
        }
      }
      if (valid.length === 0) {
        return { count: 0, error: 'No valid workspaces found in file.' };
      }
      setWorkspaces((prev) => {
        const existingIds = new Set(prev.map((w) => w.id));
        const merged = [...prev];
        for (const item of valid) {
          if (!existingIds.has(item.id)) {
            merged.push(item);
          }
        }
        return merged.sort((a, b) => b.updatedAt - a.updatedAt);
      });
      return { count: valid.length };
    } catch (e) {
      return { count: 0, error: e instanceof Error ? e.message : 'Invalid JSON file.' };
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
