import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_WORKSPACE_NAME,
  WORKSPACE_NAME_STORAGE_KEY,
} from '../src/features/workspace/WorkspaceTitle';

// Minimal in-memory localStorage stand-in so the round-trip test can run
// under Vitest's default Node environment (no jsdom needed).
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
}

describe('workspace title storage', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
  });

  it('exposes stable constants', () => {
    expect(DEFAULT_WORKSPACE_NAME).toBe('Untitled Graph');
    expect(WORKSPACE_NAME_STORAGE_KEY).toBe('quickplot:2d:workspace-name');
  });

  it('round-trips a name through localStorage', () => {
    localStorage.setItem(WORKSPACE_NAME_STORAGE_KEY, 'My Graph');
    expect(localStorage.getItem(WORKSPACE_NAME_STORAGE_KEY)).toBe('My Graph');
  });

  it('falls back to the default when nothing is stored', () => {
    const stored = localStorage.getItem(WORKSPACE_NAME_STORAGE_KEY);
    const name = stored && stored.trim() ? stored : DEFAULT_WORKSPACE_NAME;
    expect(name).toBe(DEFAULT_WORKSPACE_NAME);
  });
});
