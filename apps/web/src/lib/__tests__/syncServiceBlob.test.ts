// @vitest-environment happy-dom
/**
 * P2.5 — the `state-blob` queue-executor path.
 *
 * Pins the transport contract the multi-device fix depends on:
 *  - a queued state-blob op resolves the project's serverId, builds the
 *    pinned envelope, and pushes through blobSync;
 *  - a not-yet-synced project (no serverId) keeps the op queued (throws);
 *  - a 409 conflict is NOT thrown — it must not retry forever or clobber;
 *    Phase 4 owns the visible conflict surface.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QueuedOperation } from '../syncQueue.js';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('../blobSync.js', async (orig) => {
  const actual = await orig<typeof import('../blobSync.js')>();
  // Assign the vi.fn directly as the export (no wrapper indirection) so
  // vitest does not double-track its settled result.
  return { ...actual, pushProjectStateBlob: push };
});

import { useProjectStore } from '../../store/projectStore.js';
import { executeStateBlobOp } from '../syncService.js';

function blobOp(over: Partial<QueuedOperation> = {}): QueuedOperation {
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
    ...over,
  };
}

beforeEach(() => {
  push.mockReset();
  useProjectStore.setState({
    projects: [{ id: 'local-1', serverId: 'srv-1', attachments: [] } as never],
  });
});

describe('executeStateBlobOp', () => {
  it('resolves serverId, builds the pinned envelope, and pushes', async () => {
    push.mockResolvedValue({ status: 'ok', rev: 8 });
    await executeStateBlobOp(blobOp());
    expect(push).toHaveBeenCalledWith('srv-1', 'ogden-vision', {
      envelopeSchema: 1,
      schemaVersion: 3,
      baseRev: 7,
      payload: { foo: 'bar' },
    });
  });

  it('keeps the op queued (throws) when the project has no serverId yet', async () => {
    await expect(
      executeStateBlobOp(blobOp({ payload: {
        projectLocalId: 'unknown',
        storeKey: 'ogden-vision',
        schemaVersion: 1,
        baseRev: 0,
        payload: {},
      } })),
    ).rejects.toThrow(/serverId/i);
    expect(push).not.toHaveBeenCalled();
  });

  it('does not throw on a 409 conflict (no infinite retry, no clobber)', async () => {
    push.mockResolvedValue({ status: 'conflict', serverRev: 12, serverPayload: { x: 1 } });
    await expect(executeStateBlobOp(blobOp())).resolves.toBeUndefined();
  });
});
