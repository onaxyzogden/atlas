// @vitest-environment happy-dom
/**
 * Phase 2 — the server→local apply path for typed-record Act stores.
 *
 * `applyIncomingRecord` is the single guarded apply shared by the live WS
 * `record_upserted` handler and the reconnect delta-pull. It owns the
 * per-record rev bookkeeping and three guards that this suite pins:
 *  - rev / echo: a message whose rev is NOT strictly newer than what we hold is
 *    dropped — this is what makes the author's own broadcast echo a no-op and
 *    discards out-of-order delivery (the gate's "author never double-applies").
 *  - version-skew: a record saved by a newer client is dropped, never downcast.
 *  - §6 init-clobber: a record with a pending un-synced local push is never
 *    overwritten by the server copy (its queued push reconciles instead).
 *
 * `pullActRecordDelta` is the reconnect catch-up: it fetches changed-since rows,
 * applies each through the same path, and advances the watermark to the newest
 * SERVER `updatedAt` seen (so the changed-since contract is immune to client
 * clock skew) — and leaves the watermark untouched when nothing changed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SyncedStoreDescriptor } from '../syncManifest.js';

const { warnMock } = vi.hoisted(() => ({ warnMock: vi.fn() }));
vi.mock('../../components/Toast', async (orig) => {
  const actual = await orig<typeof import('../../components/Toast')>();
  return { ...actual, toast: { ...actual.toast, warning: warnMock } };
});

const { getAllMock } = vi.hoisted(() => ({ getAllMock: vi.fn() }));
vi.mock('../syncQueue.js', async (orig) => {
  const actual = await orig<typeof import('../syncQueue.js')>();
  return { ...actual, syncQueue: { ...actual.syncQueue, getAll: getAllMock } };
});

const { changedSinceMock } = vi.hoisted(() => ({ changedSinceMock: vi.fn() }));
vi.mock('../apiClient.js', async (orig) => {
  const actual = await orig<typeof import('../apiClient.js')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      actRecords: { ...actual.api.actRecords, changedSince: changedSinceMock },
    },
  };
});

import { useProjectStore } from '../../store/projectStore.js';
import { useConnectivityStore } from '../../store/connectivityStore.js';
import { recordLocalId } from '../recordSync.js';
import {
  applyIncomingRecord,
  pullActRecordDelta,
  getRecordBaseRevForTest,
} from '../syncService.js';

const STORE_KEY = 'ogden-field-actions';

/** A minimal injected descriptor with a spy applier, isolated from real stores. */
function fakeDescriptors(
  applySpy: ReturnType<typeof vi.fn>,
): SyncedStoreDescriptor[] {
  return [
    {
      storeKey: STORE_KEY,
      classification: 'typed-record',
      schemaVersion: 2,
      store: { getState: () => ({}), setState: () => {} },
      applyRecordForProject: applySpy,
    } as unknown as SyncedStoreDescriptor,
  ];
}

beforeEach(() => {
  warnMock.mockReset();
  getAllMock.mockReset();
  getAllMock.mockResolvedValue([]); // no pending ops unless a test says so
  changedSinceMock.mockReset();
  useConnectivityStore.setState({ lastSyncedAt: null });
  useProjectStore.setState({
    projects: [{ id: 'local-1', serverId: 'srv-1', name: 'P', attachments: [] } as never],
  });
});

describe('applyIncomingRecord — guarded server→local apply (Phase 2)', () => {
  it('drops a record saved by a NEWER client (version-skew guard), warning once', async () => {
    // First skew encounter in this file → the one-shot toast fires here.
    const apply = vi.fn();
    const ok = await applyIncomingRecord(
      STORE_KEY, 'local-1', 'rec-skew', 1, 3, { id: 'rec-skew' }, fakeDescriptors(apply),
    );
    expect(ok).toBe(false);
    expect(apply).not.toHaveBeenCalled();
    expect(warnMock).toHaveBeenCalledTimes(1);
  });

  it('applies a fresh record and records its server rev as the next baseRev', async () => {
    const apply = vi.fn();
    const ok = await applyIncomingRecord(
      STORE_KEY, 'local-1', 'rec-fresh', 1, 2, { id: 'rec-fresh' }, fakeDescriptors(apply),
    );
    expect(ok).toBe(true);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(getRecordBaseRevForTest(STORE_KEY, 'local-1', 'rec-fresh')).toBe(1);
  });

  it('drops the author echo and any stale rev (rev not strictly newer)', async () => {
    const apply = vi.fn();
    // Seed rev 5.
    await applyIncomingRecord(STORE_KEY, 'local-1', 'rec-echo', 5, 2, {}, fakeDescriptors(apply));
    apply.mockClear();

    // Same rev (the author's own broadcast echo) → no-op.
    expect(
      await applyIncomingRecord(STORE_KEY, 'local-1', 'rec-echo', 5, 2, {}, fakeDescriptors(apply)),
    ).toBe(false);
    // Older rev (out-of-order delivery) → no-op.
    expect(
      await applyIncomingRecord(STORE_KEY, 'local-1', 'rec-echo', 3, 2, {}, fakeDescriptors(apply)),
    ).toBe(false);

    expect(apply).not.toHaveBeenCalled();
    expect(getRecordBaseRevForTest(STORE_KEY, 'local-1', 'rec-echo')).toBe(5);
  });

  it('applies a strictly-newer rev (a real teammate update)', async () => {
    const apply = vi.fn();
    await applyIncomingRecord(STORE_KEY, 'local-1', 'rec-up', 2, 2, {}, fakeDescriptors(apply));
    apply.mockClear();

    const ok = await applyIncomingRecord(STORE_KEY, 'local-1', 'rec-up', 4, 2, {}, fakeDescriptors(apply));
    expect(ok).toBe(true);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(getRecordBaseRevForTest(STORE_KEY, 'local-1', 'rec-up')).toBe(4);
  });

  it('never overwrites a record with a pending un-synced local push (init-clobber guard)', async () => {
    getAllMock.mockResolvedValue([
      {
        storeType: 'typed-record',
        localId: recordLocalId(STORE_KEY, 'local-1', 'rec-pending'),
      },
    ]);
    const apply = vi.fn();
    const ok = await applyIncomingRecord(
      STORE_KEY, 'local-1', 'rec-pending', 1, 2, {}, fakeDescriptors(apply),
    );
    expect(ok).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });

  it('returns false for an unknown / non-typed-record storeKey', async () => {
    const apply = vi.fn();
    const ok = await applyIncomingRecord(
      'ogden-not-a-record-store', 'local-1', 'x', 1, 1, {}, fakeDescriptors(apply),
    );
    expect(ok).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });
});

describe('pullActRecordDelta — reconnect catch-up (Phase 2 Problem B)', () => {
  it('applies changed-since rows and advances the watermark to the newest server updatedAt', async () => {
    useConnectivityStore.setState({ lastSyncedAt: '2026-06-01T00:00:00.000Z' });
    changedSinceMock.mockResolvedValue({
      data: [
        { storeKey: STORE_KEY, recordId: 'd1', rev: 1, schemaVersion: 2, payload: { id: 'd1' }, updatedAt: '2026-06-02T00:00:00.000Z' },
        { storeKey: STORE_KEY, recordId: 'd2', rev: 1, schemaVersion: 2, payload: { id: 'd2' }, updatedAt: '2026-06-03T00:00:00.000Z' },
      ],
    });

    const applied = await pullActRecordDelta(
      { id: 'local-1', serverId: 'srv-1', name: 'P' } as never,
    );

    expect(applied).toBe(2);
    expect(changedSinceMock).toHaveBeenCalledWith('srv-1', '2026-06-01T00:00:00.000Z');
    // Newest SERVER updatedAt, not client wall-clock → skew-immune.
    expect(useConnectivityStore.getState().lastSyncedAt).toBe('2026-06-03T00:00:00.000Z');
  });

  it('leaves the watermark untouched when nothing changed', async () => {
    useConnectivityStore.setState({ lastSyncedAt: '2026-06-01T00:00:00.000Z' });
    changedSinceMock.mockResolvedValue({ data: [] });

    const applied = await pullActRecordDelta(
      { id: 'local-1', serverId: 'srv-1', name: 'P' } as never,
    );

    expect(applied).toBe(0);
    expect(useConnectivityStore.getState().lastSyncedAt).toBe('2026-06-01T00:00:00.000Z');
  });

  it('does nothing for a project with no serverId (never pushed)', async () => {
    const applied = await pullActRecordDelta({ id: 'local-1', name: 'P' } as never);
    expect(applied).toBe(0);
    expect(changedSinceMock).not.toHaveBeenCalled();
  });
});
