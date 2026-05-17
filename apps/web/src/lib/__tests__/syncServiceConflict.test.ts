// @vitest-environment happy-dom
/**
 * P4.4 — the visible conflict surface.
 *
 * A stale (409) blob write must NOT be silently swallowed. The store key
 * lands in the Connectivity panel's `conflictedStores` badge and a single
 * user-facing toast fires — never a silent clobber, never an infinite
 * retry (that contract is already pinned in syncServiceBlob.test.ts).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QueuedOperation } from '../syncQueue.js';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('../blobSync.js', async (orig) => {
  const actual = await orig<typeof import('../blobSync.js')>();
  return { ...actual, pushProjectStateBlob: push };
});

const { warnMock } = vi.hoisted(() => ({ warnMock: vi.fn() }));
vi.mock('../../components/Toast', async (orig) => {
  const actual = await orig<typeof import('../../components/Toast')>();
  return { ...actual, toast: { ...actual.toast, warning: warnMock } };
});

import { useProjectStore } from '../../store/projectStore.js';
import { useConnectivityStore } from '../../store/connectivityStore.js';
import { executeStateBlobOp } from '../syncService.js';

function blobOp(): QueuedOperation {
  return {
    id: 'op-1',
    timestamp: 0,
    storeType: 'state-blob',
    action: 'update',
    localId: 'ogden-vision:local-1',
    payload: {
      projectLocalId: 'local-1',
      storeKey: 'ogden-vision',
      schemaVersion: 3,
      baseRev: 7,
      payload: { foo: 'bar' },
    },
    retryCount: 0,
  };
}

beforeEach(() => {
  push.mockReset();
  warnMock.mockReset();
  useConnectivityStore.setState({ conflictedStores: [] });
  useProjectStore.setState({
    projects: [{ id: 'local-1', serverId: 'srv-1', attachments: [] } as never],
  });
});

describe('executeStateBlobOp — 409 conflict surface (P4.4)', () => {
  it('records the conflicted store and warns the user (no silent clobber)', async () => {
    push.mockResolvedValue({ status: 'conflict', serverRev: 12, serverPayload: { x: 1 } });

    await executeStateBlobOp(blobOp());

    expect(useConnectivityStore.getState().conflictedStores).toContain('ogden-vision');
    expect(warnMock).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate a store key already in conflict', async () => {
    push.mockResolvedValue({ status: 'conflict', serverRev: 12, serverPayload: {} });

    await executeStateBlobOp(blobOp());
    await executeStateBlobOp(blobOp());

    expect(
      useConnectivityStore.getState().conflictedStores.filter((k) => k === 'ogden-vision'),
    ).toHaveLength(1);
  });

  it('leaves conflictedStores empty on a clean push', async () => {
    push.mockResolvedValue({ status: 'ok', rev: 8 });

    await executeStateBlobOp(blobOp());

    expect(useConnectivityStore.getState().conflictedStores).toEqual([]);
  });
});
