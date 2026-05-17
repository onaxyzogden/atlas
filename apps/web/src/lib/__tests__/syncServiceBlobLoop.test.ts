// @vitest-environment happy-dom
/**
 * P2.5b — the generic versioned-blob subscription/enqueue path.
 *
 * Pins the contract the multi-store fix depends on:
 *  - a manifest `versioned-blob` descriptor's project slice is enqueued as a
 *    `state-blob` op keyed `storeKey:projectLocalId`, with the pinned
 *    schemaVersion and the descriptor's `selectForProject` output;
 *  - no active project, or an active project with no serverId yet, must NOT
 *    enqueue (the op would have no project to key the blob to — the project
 *    create path bootstraps serverId, a later store edit re-enqueues).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { enqueue } = vi.hoisted(() => ({ enqueue: vi.fn() }));
vi.mock('../syncQueue.js', async (orig) => {
  const actual = await orig<typeof import('../syncQueue.js')>();
  return { ...actual, syncQueue: { ...actual.syncQueue, enqueue } };
});

import { useProjectStore } from '../../store/projectStore.js';
import { enqueueVersionedBlob } from '../syncService.js';
import type { SyncedStoreDescriptor } from '../syncManifest.js';

function fakeDesc(over: Partial<SyncedStoreDescriptor> = {}): SyncedStoreDescriptor {
  return {
    storeKey: 'ogden-hazards',
    classification: 'versioned-blob',
    scope: 'byProject',
    schemaVersion: 1,
    usesTemporal: false,
    store: { getState: () => ({ byProject: { 'local-1': { hazards: [{ id: 'h1' }] } } }), subscribe: () => () => {} },
    selectForProject: (s, pid) => (s as any).byProject?.[pid]?.hazards ?? [],
    ...over,
  };
}

beforeEach(() => {
  enqueue.mockReset();
  useProjectStore.setState({
    projects: [{ id: 'local-1', serverId: 'srv-1', attachments: [] } as never],
    activeProjectId: 'local-1',
  });
});

describe('enqueueVersionedBlob', () => {
  it('enqueues the project slice as a pinned state-blob op', async () => {
    await enqueueVersionedBlob(fakeDesc());
    expect(enqueue).toHaveBeenCalledWith({
      storeType: 'state-blob',
      action: 'update',
      localId: 'ogden-hazards:local-1',
      payload: {
        projectLocalId: 'local-1',
        storeKey: 'ogden-hazards',
        schemaVersion: 1,
        baseRev: 0,
        payload: [{ id: 'h1' }],
      },
    });
  });

  it('does not enqueue when there is no active project', async () => {
    useProjectStore.setState({ activeProjectId: null });
    await enqueueVersionedBlob(fakeDesc());
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('does not enqueue when the active project has no serverId yet', async () => {
    useProjectStore.setState({
      projects: [{ id: 'local-1', serverId: undefined, attachments: [] } as never],
      activeProjectId: 'local-1',
    });
    await enqueueVersionedBlob(fakeDesc());
    expect(enqueue).not.toHaveBeenCalled();
  });
});
