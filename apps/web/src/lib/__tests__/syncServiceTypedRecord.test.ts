// @vitest-environment happy-dom
/**
 * ADR 7 Phase 1 — the per-record no-clobber conflict surface.
 *
 * The per-record parallel of syncServiceConflict.test.ts (the blob version): a
 * stale (409) typed-record write must NOT be silently clobbered. The store key
 * lands in the Connectivity panel's `conflictedStores` badge, a single
 * user-facing toast fires, the authoritative `serverRev` is adopted as the new
 * per-record `baseRev` (so we stop re-pushing a stale base), and the op never
 * throws on 409 (no infinite retry). A clean push records the bumped rev and
 * leaves the conflict surface untouched. Crucially, two records under the SAME
 * store track their revs independently while the conflict badge dedups at store
 * granularity (the Connectivity badge is per-store today; Phase 4 refines it).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QueuedOperation } from '../syncQueue.js';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('../recordSync.js', async (orig) => {
  const actual = await orig<typeof import('../recordSync.js')>();
  return { ...actual, pushSyncedRecord: push };
});

const { warnMock } = vi.hoisted(() => ({ warnMock: vi.fn() }));
vi.mock('../../components/Toast', async (orig) => {
  const actual = await orig<typeof import('../../components/Toast')>();
  return { ...actual, toast: { ...actual.toast, warning: warnMock } };
});

import { useProjectStore } from '../../store/projectStore.js';
import { useConnectivityStore } from '../../store/connectivityStore.js';
import { executeTypedRecordOp, getRecordBaseRevForTest } from '../syncService.js';

const STORE_KEY = 'ogden-field-actions';

function recordOp(recordId: string, baseRev = 3): QueuedOperation {
  return {
    id: `op-${recordId}`,
    timestamp: 0,
    storeType: 'typed-record',
    action: 'update',
    localId: `${STORE_KEY}:local-1:${recordId}`,
    payload: {
      projectLocalId: 'local-1',
      storeKey: STORE_KEY,
      recordId,
      schemaVersion: 2,
      baseRev,
      payload: { id: recordId, note: 'local edit' },
      observedAt: '2026-05-20T10:00:00.000Z',
      sourceType: 'field_survey',
      cycleId: 'baseline',
      taskType: 'field_survey',
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

describe('executeTypedRecordOp — 409 conflict surface (ADR 7 P1, per record)', () => {
  it('records the conflicted store and warns the user once (no silent clobber)', async () => {
    push.mockResolvedValue({ status: 'conflict', serverRev: 9, serverPayload: { id: 'rec-c1' } });

    await executeTypedRecordOp(recordOp('rec-c1'));

    expect(useConnectivityStore.getState().conflictedStores).toContain(STORE_KEY);
    expect(warnMock).toHaveBeenCalledTimes(1);
  });

  it('adopts the authoritative serverRev as the next per-record baseRev on 409', async () => {
    push.mockResolvedValue({ status: 'conflict', serverRev: 12, serverPayload: {} });

    await executeTypedRecordOp(recordOp('rec-c2'));

    expect(getRecordBaseRevForTest(STORE_KEY, 'local-1', 'rec-c2')).toBe(12);
  });

  it('never throws on 409 (the op resolves, so the queue does not retry forever)', async () => {
    push.mockResolvedValue({ status: 'conflict', serverRev: 9, serverPayload: {} });

    await expect(executeTypedRecordOp(recordOp('rec-c3'))).resolves.toBeUndefined();
  });

  it('on a clean push records the bumped rev and leaves the conflict surface empty', async () => {
    push.mockResolvedValue({ status: 'ok', rev: 8 });

    await executeTypedRecordOp(recordOp('rec-ok'));

    expect(getRecordBaseRevForTest(STORE_KEY, 'local-1', 'rec-ok')).toBe(8);
    expect(useConnectivityStore.getState().conflictedStores).toEqual([]);
    expect(warnMock).not.toHaveBeenCalled();
  });

  it('tracks each record’s rev independently within one store', async () => {
    // rec-a conflicts (adopt serverRev 9); rec-b pushes clean (rev 5). The two
    // share a store yet must not share a baseRev — that independence is the
    // reason Act records left the opaque per-store blob.
    push.mockImplementation(
      (_serverId: string, _storeKey: string, recordId: string) =>
        recordId === 'rec-a'
          ? { status: 'conflict', serverRev: 9, serverPayload: {} }
          : { status: 'ok', rev: 5 },
    );

    await executeTypedRecordOp(recordOp('rec-a'));
    await executeTypedRecordOp(recordOp('rec-b'));

    expect(getRecordBaseRevForTest(STORE_KEY, 'local-1', 'rec-a')).toBe(9);
    expect(getRecordBaseRevForTest(STORE_KEY, 'local-1', 'rec-b')).toBe(5);
  });

  it('dedups the conflict badge at store granularity across two conflicting records', async () => {
    push.mockResolvedValue({ status: 'conflict', serverRev: 9, serverPayload: {} });

    await executeTypedRecordOp(recordOp('rec-d1'));
    await executeTypedRecordOp(recordOp('rec-d2'));

    expect(
      useConnectivityStore.getState().conflictedStores.filter((k) => k === STORE_KEY),
    ).toHaveLength(1);
    // Two distinct records conflicted, but the store-granular surface warns once.
    expect(warnMock).toHaveBeenCalledTimes(1);
  });
});
