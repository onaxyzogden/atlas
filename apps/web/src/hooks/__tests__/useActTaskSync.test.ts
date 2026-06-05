/**
 * @vitest-environment happy-dom
 *
 * useActTaskSync - pulls a project's ActTasks on mount (addressed by serverId)
 * and no-ops for local-only projects (no serverId).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const h = vi.hoisted(() => ({ listCalls: [] as string[] }));

// Resolves to apps/web/src/lib/apiClient.ts (the store imports it; the hook
// drives the store).
vi.mock('../../lib/apiClient.js', () => ({
  api: {
    olos: {
      tasks: {
        list: vi.fn(async (projectId: string) => {
          h.listCalls.push(projectId);
          return { data: [], error: null };
        }),
      },
    },
  },
}));

import { useActTaskSync } from '../useActTaskSync';

beforeEach(() => {
  localStorage.clear();
  h.listCalls = [];
});

describe('useActTaskSync', () => {
  it('pulls by serverId on mount when both ids are present', async () => {
    renderHook(() => useActTaskSync('local-1', 'srv-1'));
    await Promise.resolve();
    expect(h.listCalls).toEqual(['srv-1']);
  });

  it('does nothing for a local-only project (no serverId)', async () => {
    renderHook(() => useActTaskSync('local-1', undefined));
    await Promise.resolve();
    expect(h.listCalls).toEqual([]);
  });
});
