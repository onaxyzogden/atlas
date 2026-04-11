/**
 * syncService — tests for the write-through sync service lifecycle
 * and pure helper functions.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mock objects (accessible from vi.mock factories) ───────────────

const { mockApi, mockQueue, mockProjectStore, mockZoneStore, mockStructureStore } = vi.hoisted(() => {
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
      getState: vi.fn(() => ({ projects: [], zones: [], structures: [] })),
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
    mockStructureStore: createMockStore(),
  };
});

// ─── Module mocks ───────────────────────────────────────────────────────────

vi.mock('../lib/apiClient.js', () => ({ api: mockApi }));
vi.mock('../lib/syncQueue.js', () => ({ syncQueue: mockQueue }));
vi.mock('../store/projectStore.js', () => ({ useProjectStore: mockProjectStore }));
vi.mock('../store/zoneStore.js', () => ({ useZoneStore: mockZoneStore }));
vi.mock('../store/structureStore.js', () => ({ useStructureStore: mockStructureStore }));

import { syncService } from '../lib/syncService.js';

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
  mockStructureStore.subscribe.mockClear();
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
    expect(mockStructureStore.subscribe).toHaveBeenCalled();
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
