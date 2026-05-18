// @vitest-environment happy-dom
/**
 * P3-c3 — typed-table write-through for vegetation + succession.
 *
 * These two stores are `typed-table` (real queryable columns server-side),
 * NOT versioned-blob. They use the same client-supplied-id idiom as
 * machinery_items: the local id is stable from creation, so there is no
 * serverId roundtrip/writeback (which would pollute vegetation's temporal
 * undo). Pins the contract:
 *   - create → POST to the entity collection under the project serverId;
 *   - update → PATCH by the (client) id;
 *   - delete → DELETE by id + dequeue;
 *   - any API failure enqueues a typed retry op (never silently dropped);
 *   - a record whose project has no serverId yet is skipped (hydration/
 *     initialSync pushes it once the project is bootstrapped).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { vegCreate, vegUpdate, vegDelete, succCreate, succUpdate, succDelete } =
  vi.hoisted(() => ({
    vegCreate: vi.fn(),
    vegUpdate: vi.fn(),
    vegDelete: vi.fn(),
    succCreate: vi.fn(),
    succUpdate: vi.fn(),
    succDelete: vi.fn(),
  }));
vi.mock('../apiClient.js', async (orig) => {
  const actual = await orig<typeof import('../apiClient.js')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      vegetation: { create: vegCreate, update: vegUpdate, delete: vegDelete, list: vi.fn() },
      succession: { create: succCreate, update: succUpdate, delete: succDelete, list: vi.fn() },
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

import { useProjectStore } from '../../store/projectStore.js';
import {
  syncVegetationCreate,
  syncVegetationUpdate,
  syncVegetationDelete,
  syncSuccessionCreate,
  syncSuccessionDelete,
} from '../syncService.js';

const VEG = {
  id: 'veg-1',
  projectId: 'local-1',
  geometry: { type: 'Polygon', coordinates: [] },
  successionStage: 'climax',
  groundCover: 'forest',
  createdAt: '2026-01-01T00:00:00.000Z',
} as never;

const MS = {
  id: 'sm-1715900000000-ab12cd',
  projectId: 'local-1',
  year: 2028,
  phase: 'pioneer',
  observation: 'First nitrogen-fixers in.',
} as never;

beforeEach(() => {
  vegCreate.mockReset();
  vegUpdate.mockReset();
  vegDelete.mockReset();
  succCreate.mockReset();
  succUpdate.mockReset();
  succDelete.mockReset();
  enqueue.mockReset();
  dequeueByLocalId.mockReset();
  useProjectStore.setState({
    projects: [{ id: 'local-1', serverId: 'srv-1', attachments: [] } as never],
    activeProjectId: 'local-1',
  });
});

describe('vegetation typed write-through', () => {
  it('creates against the project serverId with the client-supplied id', async () => {
    vegCreate.mockResolvedValue({ data: VEG });
    await syncVegetationCreate(VEG);
    expect(vegCreate).toHaveBeenCalledWith('srv-1', VEG);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('skips when the record project has no serverId yet', async () => {
    useProjectStore.setState({
      projects: [{ id: 'local-1', serverId: undefined, attachments: [] } as never],
    });
    await syncVegetationCreate(VEG);
    expect(vegCreate).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('enqueues a typed retry op when the create API throws', async () => {
    vegCreate.mockRejectedValue(new Error('network'));
    await syncVegetationCreate(VEG);
    expect(enqueue).toHaveBeenCalledWith({
      storeType: 'vegetation',
      action: 'create',
      localId: 'veg-1',
      payload: VEG,
    });
  });

  it('updates by the client id', async () => {
    vegUpdate.mockResolvedValue({ data: VEG });
    await syncVegetationUpdate(VEG);
    expect(vegUpdate).toHaveBeenCalledWith('veg-1', VEG);
  });

  it('deletes by id and dequeues', async () => {
    vegDelete.mockResolvedValue(undefined);
    await syncVegetationDelete(VEG);
    expect(vegDelete).toHaveBeenCalledWith('veg-1');
    expect(dequeueByLocalId).toHaveBeenCalledWith('veg-1');
  });
});

describe('succession typed write-through', () => {
  it('creates against the project serverId with the non-uuid client id', async () => {
    succCreate.mockResolvedValue({ data: MS });
    await syncSuccessionCreate(MS);
    expect(succCreate).toHaveBeenCalledWith('srv-1', MS);
  });

  it('enqueues a typed retry op when the delete API throws', async () => {
    succDelete.mockRejectedValue(new Error('network'));
    await syncSuccessionDelete(MS);
    expect(enqueue).toHaveBeenCalledWith({
      storeType: 'succession',
      action: 'delete',
      localId: 'sm-1715900000000-ab12cd',
      payload: { id: 'sm-1715900000000-ab12cd' },
    });
  });
});
