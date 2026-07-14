/**
 * syncService — tests for the write-through sync service lifecycle
 * and pure helper functions.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mock objects (accessible from vi.mock factories) ───────────────

const { mockApi, mockQueue, mockProjectStore, mockZoneStore, mockBuiltEnvV2Store } = vi.hoisted(() => {
  const mockApi = {
    projects: {
      create: vi.fn().mockResolvedValue({ data: { id: 'srv-p1', name: 'Test' } }),
      update: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockResolvedValue({ data: null }),
      list: vi.fn().mockResolvedValue({ data: [] }),
      setBoundary: vi.fn().mockResolvedValue({ data: {} }),
    },
    designFeatures: {
      create: vi.fn().mockResolvedValue({ data: { id: 'srv-df1' } }),
      update: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockResolvedValue({ data: null }),
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
  };

  const mockQueue = {
    enqueue: vi.fn(),
    dequeueByLocalId: vi.fn(),
    flush: vi.fn().mockResolvedValue([]),
    getPendingCount: vi.fn().mockReturnValue(0),
  };

  const createMockStore = () => {
    const subscribers: ((state: unknown) => void)[] = [];
    return Object.assign(vi.fn(), {
      getState: vi.fn(() => ({ projects: [], zones: [], entities: [] })),
      setState: vi.fn(),
      subscribe: vi.fn((cb: (state: unknown) => void) => {
        subscribers.push(cb);
        return () => {
          const idx = subscribers.indexOf(cb);
          if (idx >= 0) subscribers.splice(idx, 1);
        };
      }),
      _subscribers: subscribers,
    });
  };

  return {
    mockApi,
    mockQueue,
    mockProjectStore: createMockStore(),
    mockZoneStore: createMockStore(),
    mockBuiltEnvV2Store: createMockStore(),
  };
});

// ─── Module mocks ───────────────────────────────────────────────────────────

vi.mock('../lib/apiClient.js', () => ({ api: mockApi }));
vi.mock('../lib/syncQueue.js', () => ({ syncQueue: mockQueue }));
vi.mock('../store/projectStore.js', () => ({ useProjectStore: mockProjectStore }));
vi.mock('../store/zoneStore.js', () => ({ useZoneStore: mockZoneStore }));
vi.mock('../store/builtEnvironmentStoreV2.js', () => ({
  useBuiltEnvironmentStoreV2: mockBuiltEnvV2Store,
}));

import { syncService, applyServerAcreage, syncProjectNow, executeQueuedOp } from '../lib/syncService.js';

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset call history without clearing implementations
  mockApi.projects.list.mockClear().mockResolvedValue({ data: [] });
  mockApi.projects.create.mockClear().mockResolvedValue({ data: { id: 'srv-p1' } });
  mockApi.projects.update.mockClear().mockResolvedValue({ data: {} });
  mockApi.projects.delete.mockClear().mockResolvedValue({ data: null });
  mockApi.designFeatures.list.mockClear().mockResolvedValue({ data: [] });
  mockApi.designFeatures.create.mockClear().mockResolvedValue({ data: { id: 'srv-df1' } });
  mockApi.designFeatures.update.mockClear().mockResolvedValue({ data: {} });
  mockApi.designFeatures.delete.mockClear().mockResolvedValue({ data: null });
  mockQueue.enqueue.mockClear();
  mockQueue.dequeueByLocalId.mockClear();
  mockQueue.flush.mockClear().mockResolvedValue([]);
  mockQueue.getPendingCount.mockClear().mockReturnValue(0);
  mockProjectStore.subscribe.mockClear();
  mockZoneStore.subscribe.mockClear();
  mockBuiltEnvV2Store.subscribe.mockClear();
});

afterEach(() => {
  syncService.stop();
});

describe('syncService lifecycle', () => {
  it('starts without errors', async () => {
    await expect(syncService.start()).resolves.not.toThrow();
  });

  it('stops cleanly', async () => {
    await syncService.start();
    expect(() => syncService.stop()).not.toThrow();
  });

  it('getPendingCount delegates to syncQueue', async () => {
    mockQueue.getPendingCount.mockReturnValue(5);
    const count = await syncService.getPendingCount();
    expect(count).toBe(5);
  });

  it('getPendingCount returns 0 when queue empty', async () => {
    mockQueue.getPendingCount.mockReturnValue(0);
    const count = await syncService.getPendingCount();
    expect(count).toBe(0);
  });
});

describe('initial sync', () => {
  it('fetches server projects on start', async () => {
    await syncService.start();
    expect(mockApi.projects.list).toHaveBeenCalled();
  });

  it('handles API failure gracefully', async () => {
    mockApi.projects.list.mockRejectedValue(new Error('Network error'));
    await expect(syncService.start()).resolves.not.toThrow();
  });
});

describe('store subscriptions', () => {
  it('subscribes to all stores on start', async () => {
    await syncService.start();
    expect(mockProjectStore.subscribe).toHaveBeenCalled();
    expect(mockZoneStore.subscribe).toHaveBeenCalled();
    expect(mockBuiltEnvV2Store.subscribe).toHaveBeenCalled();
  });
});

describe('queue flush', () => {
  it('flushes queue during initial sync when ops are pending', async () => {
    mockQueue.getPendingCount.mockResolvedValue(3);
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    await syncService.start();
    expect(mockQueue.flush).toHaveBeenCalled();
  });

  it('does not flush when queue is empty', async () => {
    mockQueue.getPendingCount.mockResolvedValue(0);
    await syncService.start();
    expect(mockQueue.flush).not.toHaveBeenCalled();
  });
});

describe('applyServerAcreage guard', () => {
  let updateProject: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    updateProject = vi.fn();
    mockProjectStore.getState.mockReturnValue({
      projects: [],
      zones: [],
      entities: [],
      updateProject,
    } as unknown as ReturnType<typeof mockProjectStore.getState>);
  });

  it('ignores a non-positive server acreage (the FeatureCollection-bug signature)', () => {
    applyServerAcreage('local-1', { acreage: 0 });
    applyServerAcreage('local-1', { acreage: -5 });
    expect(updateProject).not.toHaveBeenCalled();
  });

  it('ignores a missing / non-finite acreage', () => {
    applyServerAcreage('local-1', undefined);
    applyServerAcreage('local-1', { acreage: null });
    applyServerAcreage('local-1', { acreage: NaN });
    expect(updateProject).not.toHaveBeenCalled();
  });

  it('applies a valid positive server acreage', () => {
    applyServerAcreage('local-1', { acreage: 12.3 });
    expect(updateProject).toHaveBeenCalledWith('local-1', { acreage: 12.3 });
  });
});

describe('project create idempotency', () => {
  // A bare unsynced project: no boundary, no notes, so syncProjectCreateInner
  // touches only api.projects.create + getState().updateProject.
  const P1 = {
    id: 'p1',
    name: 'Test',
    projectType: 'homestead',
    country: 'US',
    units: 'metric',
    isBuiltin: false,
  };

  function setProjects(projects: unknown[]) {
    mockProjectStore.getState.mockReturnValue({
      projects,
      zones: [],
      entities: [],
      updateProject: vi.fn(),
    } as unknown as ReturnType<typeof mockProjectStore.getState>);
  }

  it('short-circuits an already-synced project without POSTing', async () => {
    setProjects([{ ...P1, serverId: 'srv-existing' }]);

    const res = await syncProjectNow('p1');

    expect(res).toEqual({ ok: true, serverId: 'srv-existing' });
    expect(mockApi.projects.create).not.toHaveBeenCalled();
  });

  it('POSTs exactly once for concurrent syncProjectNow calls, carrying clientLocalId', async () => {
    setProjects([{ ...P1, serverId: undefined }]);

    // Both calls share the inFlightProjectSync lock: the second awaits the
    // first's create instead of firing a second POST (root-cause #1).
    await Promise.all([syncProjectNow('p1'), syncProjectNow('p1')]);

    expect(mockApi.projects.create).toHaveBeenCalledTimes(1);
    expect(mockApi.projects.create).toHaveBeenCalledWith(
      expect.objectContaining({ clientLocalId: 'p1' }),
    );
  });

  it('does not POST from the queue executor when the live row already has a serverId', async () => {
    // Stale queued snapshot (no serverId) but the live row has since synced —
    // the executor re-reads live and short-circuits before any POST.
    setProjects([{ ...P1, serverId: 'srv-existing' }]);
    const op = {
      id: 'op-1',
      storeType: 'project',
      action: 'create',
      localId: 'p1',
      payload: { ...P1, serverId: undefined },
    };

    await executeQueuedOp(op as unknown as Parameters<typeof executeQueuedOp>[0]);

    expect(mockApi.projects.create).not.toHaveBeenCalled();
  });
});
