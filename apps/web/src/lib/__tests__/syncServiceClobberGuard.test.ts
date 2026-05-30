// @vitest-environment happy-dom
/**
 * ADR 7 Phase 3 (§6) — the init-time never-clobber guard.
 *
 * Phase 1 closed the silent clobber on the PUSH path (a stale 409 keeps local).
 * This pins the residual gap ADR 12 handed to Phase 3: the HYDRATE path. On
 * initial sync the client pulls every server record/blob and writes it back
 * into the store — which, for a record the user edited OFFLINE (a pending,
 * un-synced queue op), would silently overwrite that un-synced local edit.
 *
 * Contract pinned here:
 *  - a record/blob WITH a pending un-synced queue op is NOT applied on hydrate
 *    (local edit preserved) and the skip is logged (console.warn), not silent;
 *  - its server rev is NOT adopted — the pending push owns reconciliation (it
 *    will succeed, or 409 → surface, through the normal flush path);
 *  - a record/blob WITHOUT a pending op hydrates normally and adopts its rev;
 *  - merely-dirty does NOT toast (it is not yet a conflict — only a push 409 is).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { actListMock, psListMock } = vi.hoisted(() => ({
  actListMock: vi.fn(),
  psListMock: vi.fn(),
}));
vi.mock('../apiClient.js', async (orig) => {
  const actual = await orig<typeof import('../apiClient.js')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      actRecords: { ...actual.api.actRecords, list: actListMock },
      projectState: { ...actual.api.projectState, list: psListMock },
    },
  };
});

const { getAllMock } = vi.hoisted(() => ({ getAllMock: vi.fn() }));
vi.mock('../syncQueue.js', async (orig) => {
  const actual = await orig<typeof import('../syncQueue.js')>();
  return { ...actual, syncQueue: { ...actual.syncQueue, getAll: getAllMock } };
});

import {
  hydrateActRecords,
  hydrateProjectStateBlobs,
  getRecordBaseRevForTest,
  getBlobBaseRevForTest,
} from '../syncService.js';
import { recordLocalId } from '../recordSync.js';
import { blobLocalId } from '../blobSync.js';
import type { SyncedStoreDescriptor } from '../syncManifest.js';
import type { QueuedOperation } from '../syncQueue.js';

const REC_STORE = 'ogden-field-actions';
const BLOB_STORE = 'ogden-hazards';

function recordOp(projectLocalId: string, recordId: string): QueuedOperation {
  return {
    id: `op-${recordId}`,
    timestamp: 0,
    storeType: 'typed-record',
    action: 'update',
    localId: recordLocalId(REC_STORE, projectLocalId, recordId),
    payload: {},
    retryCount: 0,
  };
}

function blobOp(projectLocalId: string): QueuedOperation {
  return {
    id: `bop-${projectLocalId}`,
    timestamp: 0,
    storeType: 'state-blob',
    action: 'update',
    localId: blobLocalId(BLOB_STORE, projectLocalId),
    payload: {},
    retryCount: 0,
  };
}

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  actListMock.mockReset();
  psListMock.mockReset();
  getAllMock.mockReset();
  getAllMock.mockResolvedValue([]); // default: empty queue → nothing dirty
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('hydrateActRecords — §6 init-clobber guard (typed records)', () => {
  it('skips a record with a pending un-synced push and applies the clean ones', async () => {
    const applyRec = vi.fn();
    const d: SyncedStoreDescriptor = {
      storeKey: REC_STORE,
      classification: 'typed-record',
      schemaVersion: 2,
      store: { getState: () => ({}), setState: () => {} } as never,
      applyRecordForProject: applyRec,
    };
    actListMock.mockResolvedValue({
      data: [
        { recordId: 'rec-dirty', payload: { id: 'rec-dirty', v: 'server' }, schemaVersion: 2, rev: 9 },
        { recordId: 'rec-clean', payload: { id: 'rec-clean', v: 'server' }, schemaVersion: 2, rev: 4 },
      ],
    });
    getAllMock.mockResolvedValue([recordOp('PA', 'rec-dirty')]);

    await hydrateActRecords({ id: 'PA', serverId: 'srv-PA' } as never, [d]);

    // Only the clean record is applied — the dirty one keeps its local edit.
    const appliedRecordIds = applyRec.mock.calls.map((c) => c[2]);
    expect(appliedRecordIds).toEqual(['rec-clean']);
    // Clean rev adopted; dirty rev NOT adopted (its pending push owns that).
    expect(getRecordBaseRevForTest(REC_STORE, 'PA', 'rec-clean')).toBe(4);
    expect(getRecordBaseRevForTest(REC_STORE, 'PA', 'rec-dirty')).toBe(0);
    // The skip is logged, never silent.
    expect(warnSpy).toHaveBeenCalled();
  });

  it('applies every record when the queue holds no pending op for the store', async () => {
    const applyRec = vi.fn();
    const d: SyncedStoreDescriptor = {
      storeKey: REC_STORE,
      classification: 'typed-record',
      schemaVersion: 2,
      store: { getState: () => ({}), setState: () => {} } as never,
      applyRecordForProject: applyRec,
    };
    actListMock.mockResolvedValue({
      data: [
        { recordId: 'r1', payload: { id: 'r1' }, schemaVersion: 2, rev: 3 },
        { recordId: 'r2', payload: { id: 'r2' }, schemaVersion: 2, rev: 5 },
      ],
    });
    getAllMock.mockResolvedValue([]); // nothing dirty

    await hydrateActRecords({ id: 'PB', serverId: 'srv-PB' } as never, [d]);

    expect(applyRec.mock.calls.map((c) => c[2]).sort()).toEqual(['r1', 'r2']);
    expect(getRecordBaseRevForTest(REC_STORE, 'PB', 'r1')).toBe(3);
    expect(getRecordBaseRevForTest(REC_STORE, 'PB', 'r2')).toBe(5);
  });
});

describe('hydrateProjectStateBlobs — §6 init-clobber guard (versioned blobs)', () => {
  it('skips a blob store with a pending un-synced push (no clobber, rev not adopted)', async () => {
    const applyBlob = vi.fn();
    const d: SyncedStoreDescriptor = {
      storeKey: BLOB_STORE,
      classification: 'versioned-blob',
      schemaVersion: 1,
      store: { getState: () => ({}), setState: () => {} } as never,
      applyForProject: applyBlob,
    };
    psListMock.mockResolvedValue({
      data: [{ storeKey: BLOB_STORE, payload: [{ id: 'server' }], schemaVersion: 1, rev: 7 }],
    });
    getAllMock.mockResolvedValue([blobOp('PC')]);

    await hydrateProjectStateBlobs({ id: 'PC', serverId: 'srv-PC' } as never, [d]);

    expect(applyBlob).not.toHaveBeenCalled();
    expect(getBlobBaseRevForTest(BLOB_STORE, 'PC')).toBe(0); // rev NOT adopted
    expect(warnSpy).toHaveBeenCalled();
  });

  it('applies the blob when no pending op exists for that store', async () => {
    const applyBlob = vi.fn();
    const d: SyncedStoreDescriptor = {
      storeKey: BLOB_STORE,
      classification: 'versioned-blob',
      schemaVersion: 1,
      store: { getState: () => ({}), setState: () => {} } as never,
      applyForProject: applyBlob,
    };
    psListMock.mockResolvedValue({
      data: [{ storeKey: BLOB_STORE, payload: [{ id: 'server' }], schemaVersion: 1, rev: 8 }],
    });
    getAllMock.mockResolvedValue([]);

    await hydrateProjectStateBlobs({ id: 'PD', serverId: 'srv-PD' } as never, [d]);

    expect(applyBlob).toHaveBeenCalledTimes(1);
    expect(getBlobBaseRevForTest(BLOB_STORE, 'PD')).toBe(8);
  });
});
