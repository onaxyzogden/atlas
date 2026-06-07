// @vitest-environment happy-dom
/**
 * Sync circuit-breaker — the queue executor must PROPAGATE API failures.
 *
 * Root cause this pins: `executeQueuedOp` used to route create/update through
 * the swallowing live-path handlers (`try { api } catch { enqueue }`). Because
 * those never threw, `syncQueue.flush()`'s retry/backoff/MAX_RETRIES/drop logic
 * never engaged — and worse, after the coalescing-key OOM fix, the handler
 * re-enqueued under the same key that `flush()` then immediately dequeued, so a
 * persistently-failing op was silently dropped after a single pass.
 *
 * The fix: the queue path calls the handlers with `rethrow = true` so a failed
 * API call throws back to `flush()`, which then counts the retry, backs off,
 * and (only at MAX_RETRIES) drops the op via `handleExhaustedOp` — surfaced to
 * the steward instead of vanishing.
 *
 * Contract pinned here:
 *   - the LIVE path still swallows + enqueues (unchanged);
 *   - the QUEUE path (`executeQueuedOp`) throws on API failure and does NOT
 *     re-enqueue (no silent self-drop);
 *   - a successful queue op resolves without enqueuing;
 *   - `handleExhaustedOp` records the give-up once and warns once (dedupe).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QueuedOperation } from '../syncQueue.js';

const { projCreate, projUpdate, projDelete, projBoundary, vegCreate } =
  vi.hoisted(() => ({
    projCreate: vi.fn(),
    projUpdate: vi.fn(),
    projDelete: vi.fn(),
    projBoundary: vi.fn(),
    vegCreate: vi.fn(),
  }));
vi.mock('../apiClient.js', async (orig) => {
  const actual = await orig<typeof import('../apiClient.js')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      projects: {
        ...actual.api.projects,
        create: projCreate,
        update: projUpdate,
        delete: projDelete,
        setBoundary: projBoundary,
      },
      vegetation: { create: vegCreate, update: vi.fn(), delete: vi.fn(), list: vi.fn() },
    },
  };
});

const { enqueue, dequeueByLocalId } = vi.hoisted(() => ({
  enqueue: vi.fn(),
  dequeueByLocalId: vi.fn(),
}));
vi.mock('../syncQueue.js', async (orig) => {
  const actual = await orig<typeof import('../syncQueue.js')>();
  return {
    ...actual,
    syncQueue: { ...actual.syncQueue, enqueue, dequeueByLocalId },
  };
});

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock('../../components/Toast', async (orig) => {
  const actual = await orig<typeof import('../../components/Toast')>();
  return {
    ...actual,
    toast: { ...actual.toast, error: toastError },
  };
});

import { useProjectStore } from '../../store/projectStore.js';
import { useConnectivityStore } from '../../store/connectivityStore.js';
import {
  executeQueuedOp,
  handleExhaustedOp,
  syncVegetationCreate,
} from '../syncService.js';

// A create op's payload is a not-yet-synced local project: it must NOT carry a
// serverId, or syncProjectCreate short-circuits at `if (project.serverId) return`
// (syncService.ts:461) and api.projects.create is never called.
const PROJECT = {
  id: 'local-1',
  name: 'Test Farm',
  projectType: 'permaculture',
  country: 'US',
  units: 'imperial',
  attachments: [],
} as never;

const VEG = {
  id: 'veg-1',
  projectId: 'local-1',
  geometry: { type: 'Polygon', coordinates: [] },
  successionStage: 'climax',
  groundCover: 'forest',
  createdAt: '2026-01-01T00:00:00.000Z',
} as never;

function op(over: Partial<QueuedOperation>): QueuedOperation {
  return {
    id: 'op',
    timestamp: 0,
    storeType: 'project',
    action: 'create',
    localId: 'local-1',
    payload: PROJECT,
    retryCount: 0,
    ...over,
  };
}

beforeEach(() => {
  projCreate.mockReset();
  projUpdate.mockReset();
  projDelete.mockReset();
  projBoundary.mockReset();
  vegCreate.mockReset();
  enqueue.mockReset();
  dequeueByLocalId.mockReset();
  toastError.mockReset();
  useProjectStore.setState({
    projects: [{ id: 'local-1', serverId: 'srv-1', attachments: [] } as never],
    activeProjectId: 'local-1',
  });
  useConnectivityStore.setState({ droppedStores: [] });
});

describe('live path (unchanged): swallow + enqueue', () => {
  it('a failed live create enqueues a retry op and does not throw', async () => {
    vegCreate.mockRejectedValue(new Error('network'));
    await expect(syncVegetationCreate(VEG)).resolves.toBeUndefined();
    expect(enqueue).toHaveBeenCalledTimes(1);
  });
});

describe('queue path (executeQueuedOp): propagate failures', () => {
  it('project create throws on API failure and does NOT re-enqueue', async () => {
    projCreate.mockRejectedValue(new Error('Request validation failed'));
    await expect(executeQueuedOp(op({ storeType: 'project', action: 'create' }))).rejects.toThrow(
      /validation/i,
    );
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('vegetation create throws on API failure and does NOT re-enqueue', async () => {
    vegCreate.mockRejectedValue(new Error('network'));
    await expect(
      executeQueuedOp(op({ storeType: 'vegetation', action: 'create', payload: VEG })),
    ).rejects.toThrow(/network/i);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('project delete (raw API) throws on API failure', async () => {
    projDelete.mockRejectedValue(new Error('boom'));
    await expect(
      executeQueuedOp(op({ storeType: 'project', action: 'delete', payload: { serverId: 'srv-1' } })),
    ).rejects.toThrow(/boom/i);
  });

  it('a successful create resolves without enqueuing', async () => {
    projCreate.mockResolvedValue({ data: { id: 'srv-new' } });
    await expect(executeQueuedOp(op({ storeType: 'project', action: 'create' }))).resolves.toBeUndefined();
    expect(projCreate).toHaveBeenCalledTimes(1);
    expect(enqueue).not.toHaveBeenCalled();
  });
});

describe('handleExhaustedOp: surface the give-up once', () => {
  it('records the dropped op and warns the steward exactly once per op', () => {
    const dropped = op({ id: 'zone:create:z1', storeType: 'zone', action: 'create' });
    handleExhaustedOp(dropped);
    handleExhaustedOp(dropped); // dedupe
    expect(useConnectivityStore.getState().droppedStores).toEqual(['zone:create:z1']);
    expect(toastError).toHaveBeenCalledTimes(1);
  });
});
