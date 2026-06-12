// @vitest-environment happy-dom
/**
 * ADR 2026-06-12-atlas-work-items-typed-record-transport — hydrate-side blob
 * fallback for stores promoted from versioned-blob to typed-record
 * (`ogden-work-items` is the only opt-in; see the syncManifest exclusivity pin).
 *
 * Contract pinned here:
 *  - the fallback fires ONLY when the server holds ZERO `synced_records` rows
 *    for the store AND this device holds zero local rows for the project —
 *    a fresh device reads the now-inert pre-promotion `project_state_blobs`
 *    row so it doesn't hydrate an empty schedule;
 *  - any server record row, or any local row (synced or queued), suppresses
 *    the fallback — fresher per-record data always wins over the stale blob;
 *  - the blob is read-only: no blob rev is adopted, no per-record base revs
 *    are seeded (records are born on this device's first push, if ever);
 *  - the version-skew guard applies (a blob saved by a newer client is
 *    skipped, never downcast);
 *  - stores WITHOUT the opt-in keep the abandon-silently precedent
 *    (`ogden-paths`): zero server rows → no blob fetch at all.
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
  hydrateTypedRecords,
  getRecordBaseRevForTest,
  getBlobBaseRevForTest,
} from '../syncService.js';
import type { SyncedStoreDescriptor } from '../syncManifest.js';

const STORE_KEY = 'ogden-work-items';
const SCHEMA_VERSION = 4;

/** A promoted-store descriptor with every seam mockable. */
function workItemsDescriptor(overrides?: {
  localRows?: Array<{ recordId: string; record: unknown; meta: unknown }>;
  withFallback?: boolean;
}) {
  const applyRecord = vi.fn();
  const applyFallback = vi.fn();
  const selectRecords = vi.fn(() => overrides?.localRows ?? []);
  const d: SyncedStoreDescriptor = {
    storeKey: STORE_KEY,
    classification: 'typed-record',
    schemaVersion: SCHEMA_VERSION,
    store: { getState: () => ({ items: [] }), setState: () => {} } as never,
    applyRecordForProject: applyRecord,
    selectRecordsForProject: selectRecords as never,
    ...(overrides?.withFallback === false
      ? {}
      : { applyBlobFallbackForProject: applyFallback }),
  };
  return { d, applyRecord, applyFallback, selectRecords };
}

const BLOB_PAYLOAD = {
  items: [
    {
      id: 'lvw__r1__2026-07-01',
      projectId: 'PA',
      source: 'livestock-plan',
      title: 'Welfare check',
      updatedAt: '2026-06-12T08:00:00.000Z',
    },
  ],
};

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  actListMock.mockReset();
  psListMock.mockReset();
  getAllMock.mockReset();
  getAllMock.mockResolvedValue([]);
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('hydrateTypedRecords — promoted-store blob hydrate fallback', () => {
  it('fires on a fresh device: zero server rows + zero local rows → blob applied read-only', async () => {
    const { d, applyRecord, applyFallback } = workItemsDescriptor();
    actListMock.mockResolvedValue({ data: [] });
    psListMock.mockResolvedValue({
      data: [
        { storeKey: 'ogden-hazards', payload: [], schemaVersion: 1, rev: 3 },
        { storeKey: STORE_KEY, payload: BLOB_PAYLOAD, schemaVersion: SCHEMA_VERSION, rev: 6 },
      ],
    });

    await hydrateTypedRecords({ id: 'PA', serverId: 'srv-PA' } as never, [d]);

    // The matching blob row (and only it) reaches the fallback applier.
    expect(applyFallback).toHaveBeenCalledTimes(1);
    const [, projectId, payload] = applyFallback.mock.calls[0];
    expect(projectId).toBe('PA');
    expect(payload).toEqual(BLOB_PAYLOAD);
    // Per-record apply never runs — there are no records.
    expect(applyRecord).not.toHaveBeenCalled();
    // Read-only: neither the blob rev nor any record rev is adopted.
    expect(getBlobBaseRevForTest(STORE_KEY, 'PA')).toBe(0);
    expect(getRecordBaseRevForTest(STORE_KEY, 'PA', 'lvw__r1__2026-07-01')).toBe(0);
  });

  it('does NOT fire when the server holds record rows — they hydrate normally', async () => {
    const { d, applyRecord, applyFallback } = workItemsDescriptor();
    actListMock.mockResolvedValue({
      data: [
        { recordId: 'w1', payload: { id: 'w1', projectId: 'PA' }, schemaVersion: SCHEMA_VERSION, rev: 2 },
      ],
    });

    await hydrateTypedRecords({ id: 'PA', serverId: 'srv-PA' } as never, [d]);

    expect(applyFallback).not.toHaveBeenCalled();
    expect(psListMock).not.toHaveBeenCalled(); // the blob is never even fetched
    expect(applyRecord).toHaveBeenCalledTimes(1);
    expect(getRecordBaseRevForTest(STORE_KEY, 'PA', 'w1')).toBe(2);
  });

  it('does NOT fire when this device already holds local rows for the project', async () => {
    const { d, applyFallback } = workItemsDescriptor({
      localRows: [{ recordId: 'w-local', record: { id: 'w-local' }, meta: {} }],
    });
    actListMock.mockResolvedValue({ data: [] });

    await hydrateTypedRecords({ id: 'PA', serverId: 'srv-PA' } as never, [d]);

    // The local device is authoritative over the stale blob — no fetch, no apply.
    expect(psListMock).not.toHaveBeenCalled();
    expect(applyFallback).not.toHaveBeenCalled();
  });

  it('skips a blob saved by a newer client (version-skew guard), with a logged warn', async () => {
    const { d, applyFallback } = workItemsDescriptor();
    actListMock.mockResolvedValue({ data: [] });
    psListMock.mockResolvedValue({
      data: [
        { storeKey: STORE_KEY, payload: BLOB_PAYLOAD, schemaVersion: SCHEMA_VERSION + 1, rev: 9 },
      ],
    });

    await hydrateTypedRecords({ id: 'PA', serverId: 'srv-PA' } as never, [d]);

    expect(applyFallback).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('is a quiet no-op when no blob row exists for the store key', async () => {
    const { d, applyFallback } = workItemsDescriptor();
    actListMock.mockResolvedValue({ data: [] });
    psListMock.mockResolvedValue({
      data: [{ storeKey: 'ogden-hazards', payload: [], schemaVersion: 1, rev: 3 }],
    });

    await hydrateTypedRecords({ id: 'PA', serverId: 'srv-PA' } as never, [d]);

    expect(applyFallback).not.toHaveBeenCalled();
  });

  it('stores without the opt-in keep the abandon-silently precedent (no blob fetch)', async () => {
    const { d, applyFallback } = workItemsDescriptor({ withFallback: false });
    actListMock.mockResolvedValue({ data: [] });

    await hydrateTypedRecords({ id: 'PA', serverId: 'srv-PA' } as never, [d]);

    expect(psListMock).not.toHaveBeenCalled();
    expect(applyFallback).not.toHaveBeenCalled();
  });

  it('a blob list failure is logged and contained — hydrate does not throw', async () => {
    const { d, applyFallback } = workItemsDescriptor();
    actListMock.mockResolvedValue({ data: [] });
    psListMock.mockRejectedValue(new Error('offline'));

    await expect(
      hydrateTypedRecords({ id: 'PA', serverId: 'srv-PA' } as never, [d]),
    ).resolves.toBeUndefined();
    expect(applyFallback).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });
});
