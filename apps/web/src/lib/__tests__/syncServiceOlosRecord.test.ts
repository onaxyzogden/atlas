// @vitest-environment happy-dom
/**
 * Phase 3B — the olos record sync transport (observations / proofs /
 * verifications) and its reconnect catch-up.
 *
 * Three things are pinned here, deterministically:
 *  1. The guarded server→local apply (`applyIncomingRecord`) honours the SAME
 *     three guards for olos storeKeys as it does for Act records — rev/echo,
 *     version-skew, and the §6 init-clobber guard — proving the olos domains
 *     reuse the storeKey-generic apply path, not a forked copy.
 *  2. `pullOlosRecordDelta` pulls all three olos `changed-since` streams, applies
 *     each row, and advances an INDEPENDENT `::olos` watermark sub-key. This is
 *     the deliberate deviation from the original plan's single shared scalar: the
 *     Act and olos streams advance from different rows, so a shared watermark
 *     would let one stream's advance skip the other's un-pulled gap. The
 *     independent-watermark test below is the regression guard for that bug.
 *  3. The olos-only id-transition: a local draft (obs-/proof-/verify-) POSTs and
 *     rekeys to the server uuid; a stale uuid PATCH 409s, escalates (olos has no
 *     auto_resolved tier), and is never clobbered.
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

const { obsChanged, proofChanged, verifChanged, obsCreate, obsUpdate } = vi.hoisted(
  () => ({
    obsChanged: vi.fn(),
    proofChanged: vi.fn(),
    verifChanged: vi.fn(),
    obsCreate: vi.fn(),
    obsUpdate: vi.fn(),
  }),
);
vi.mock('../apiClient.js', async (orig) => {
  const actual = await orig<typeof import('../apiClient.js')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      olos: {
        ...actual.api.olos,
        observations: {
          ...actual.api.olos.observations,
          changedSince: obsChanged,
          create: obsCreate,
          update: obsUpdate,
        },
        proofs: { ...actual.api.olos.proofs, changedSince: proofChanged },
        verifications: { ...actual.api.olos.verifications, changedSince: verifChanged },
      },
    },
  };
});

import { useProjectStore } from '../../store/projectStore.js';
import { useConnectivityStore } from '../../store/connectivityStore.js';
import { recordLocalId } from '../recordSync.js';
import {
  applyIncomingRecord,
  pullOlosRecordDelta,
  executeTypedRecordOp,
  getRecordBaseRevForTest,
} from '../syncService.js';

const OBS_STORE = 'ogden-olos-observation-records';
const PROOF_STORE = 'ogden-olos-proof-records';

/** A minimal injected olos descriptor with a spy applier, isolated from the
 *  real Zustand stores — mirrors the Act suite's fakeDescriptors. */
function fakeOlosDescriptors(
  applySpy: ReturnType<typeof vi.fn>,
  storeKey: string = OBS_STORE,
): SyncedStoreDescriptor[] {
  return [
    {
      storeKey,
      classification: 'typed-record',
      schemaVersion: 1,
      store: { getState: () => ({}), setState: () => {} },
      applyRecordForProject: applySpy,
    } as unknown as SyncedStoreDescriptor,
  ];
}

beforeEach(() => {
  warnMock.mockReset();
  getAllMock.mockReset();
  getAllMock.mockResolvedValue([]); // no pending ops unless a test says so
  obsChanged.mockReset();
  proofChanged.mockReset();
  verifChanged.mockReset();
  obsCreate.mockReset();
  obsUpdate.mockReset();
  // Empty streams by default so a test only wires the domains it cares about.
  obsChanged.mockResolvedValue({ data: [] });
  proofChanged.mockResolvedValue({ data: [] });
  verifChanged.mockResolvedValue({ data: [] });
  useConnectivityStore.setState({ lastSyncedAt: {}, conflictedStores: [] });
  useProjectStore.setState({
    projects: [{ id: 'local-1', serverId: 'srv-1', name: 'P', attachments: [] } as never],
  });
});

describe('applyIncomingRecord — olos guards reuse the generic apply path', () => {
  it('drops an olos record saved by a NEWER client (version-skew), warning once', async () => {
    const apply = vi.fn();
    const ok = await applyIncomingRecord(
      OBS_STORE, 'local-1', 'obs-skew', 1, 2, { id: 'obs-skew' }, fakeOlosDescriptors(apply),
    );
    expect(ok).toBe(false);
    expect(apply).not.toHaveBeenCalled();
    expect(warnMock).toHaveBeenCalledTimes(1);
  });

  it('applies a fresh olos record and records its server rev as the next baseRev', async () => {
    const apply = vi.fn();
    const ok = await applyIncomingRecord(
      OBS_STORE, 'local-1', 'obs-fresh', 1, 1, { id: 'obs-fresh' }, fakeOlosDescriptors(apply),
    );
    expect(ok).toBe(true);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(getRecordBaseRevForTest(OBS_STORE, 'local-1', 'obs-fresh')).toBe(1);
  });

  it('drops the author echo and any stale rev (rev not strictly newer)', async () => {
    const apply = vi.fn();
    await applyIncomingRecord(OBS_STORE, 'local-1', 'obs-echo', 5, 1, {}, fakeOlosDescriptors(apply));
    apply.mockClear();

    expect(
      await applyIncomingRecord(OBS_STORE, 'local-1', 'obs-echo', 5, 1, {}, fakeOlosDescriptors(apply)),
    ).toBe(false); // same rev = author's own broadcast echo
    expect(
      await applyIncomingRecord(OBS_STORE, 'local-1', 'obs-echo', 3, 1, {}, fakeOlosDescriptors(apply)),
    ).toBe(false); // older rev = out-of-order delivery

    expect(apply).not.toHaveBeenCalled();
    expect(getRecordBaseRevForTest(OBS_STORE, 'local-1', 'obs-echo')).toBe(5);
  });

  it('never overwrites an olos record with a pending un-synced local push', async () => {
    getAllMock.mockResolvedValue([
      { storeType: 'typed-record', localId: recordLocalId(OBS_STORE, 'local-1', 'obs-pending') },
    ]);
    const apply = vi.fn();
    const ok = await applyIncomingRecord(
      OBS_STORE, 'local-1', 'obs-pending', 1, 1, {}, fakeOlosDescriptors(apply),
    );
    expect(ok).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });
});

describe('pullOlosRecordDelta — reconnect catch-up across all three domains', () => {
  it('pulls every domain, sums the applied rows, and advances the ::olos watermark', async () => {
    useConnectivityStore.setState({ lastSyncedAt: { 'local-1::olos': '2026-06-01T00:00:00.000Z' } });
    obsChanged.mockResolvedValue({
      data: [{ storeKey: OBS_STORE, recordId: 'po-o1', rev: 1, schemaVersion: 1, payload: { id: 'po-o1', objectiveId: 'obj-1' }, updatedAt: '2026-06-02T00:00:00.000Z' }],
    });
    proofChanged.mockResolvedValue({
      data: [{ storeKey: PROOF_STORE, recordId: 'po-p1', rev: 1, schemaVersion: 1, payload: { id: 'po-p1' }, updatedAt: '2026-06-04T00:00:00.000Z' }],
    });

    const applied = await pullOlosRecordDelta({ id: 'local-1', serverId: 'srv-1', name: 'P' } as never);

    expect(applied).toBe(2);
    // All three domains are pulled from the SAME olos cursor.
    expect(obsChanged).toHaveBeenCalledWith('srv-1', '2026-06-01T00:00:00.000Z');
    expect(proofChanged).toHaveBeenCalledWith('srv-1', '2026-06-01T00:00:00.000Z');
    expect(verifChanged).toHaveBeenCalledWith('srv-1', '2026-06-01T00:00:00.000Z');
    // Watermark advances to the newest server updatedAt seen across all domains.
    expect(useConnectivityStore.getState().lastSyncedAt['local-1::olos']).toBe('2026-06-04T00:00:00.000Z');
  });

  it('leaves the ::olos watermark untouched when nothing changed', async () => {
    useConnectivityStore.setState({ lastSyncedAt: { 'local-1::olos': '2026-06-01T00:00:00.000Z' } });

    const applied = await pullOlosRecordDelta({ id: 'local-1', serverId: 'srv-1', name: 'P' } as never);

    expect(applied).toBe(0);
    expect(useConnectivityStore.getState().lastSyncedAt['local-1::olos']).toBe('2026-06-01T00:00:00.000Z');
  });

  it('does nothing for a project with no serverId (never pushed)', async () => {
    const applied = await pullOlosRecordDelta({ id: 'local-1', name: 'P' } as never);
    expect(applied).toBe(0);
    expect(obsChanged).not.toHaveBeenCalled();
  });

  it('uses an INDEPENDENT ::olos watermark — never reads or advances the Act one', async () => {
    // Act watermark sits far in the future; olos sub-key is unset. A shared
    // scalar would make olos issue `since` = the future Act value and skip every
    // real olos row. The independent sub-key must ignore it.
    useConnectivityStore.setState({ lastSyncedAt: { 'local-1': '2099-01-01T00:00:00.000Z' } });
    obsChanged.mockResolvedValue({
      data: [{ storeKey: OBS_STORE, recordId: 'iw-o1', rev: 1, schemaVersion: 1, payload: { id: 'iw-o1', objectiveId: 'obj-iw' }, updatedAt: '2026-06-02T00:00:00.000Z' }],
    });

    await pullOlosRecordDelta({ id: 'local-1', serverId: 'srv-1', name: 'P' } as never);

    // Reads the (unset) olos sub-key → full epoch pull, NOT the future Act value.
    expect(obsChanged).toHaveBeenCalledWith('srv-1', undefined);
    // Advances ONLY the olos sub-key; the Act watermark is left exactly as it was.
    expect(useConnectivityStore.getState().lastSyncedAt['local-1::olos']).toBe('2026-06-02T00:00:00.000Z');
    expect(useConnectivityStore.getState().lastSyncedAt['local-1']).toBe('2099-01-01T00:00:00.000Z');
  });
});

describe('executeTypedRecordOp → olos transport (server-uuid id-transition)', () => {
  it('POSTs a local draft, strips server-owned fields, and tracks baseRev under the new uuid', async () => {
    obsCreate.mockResolvedValue({ data: { id: 'uuid-new', objectiveId: 'obj-X', status: 'observed', rev: 1 } });
    const op = {
      payload: {
        projectLocalId: 'local-1',
        storeKey: OBS_STORE,
        recordId: 'obs-draft',
        schemaVersion: 1,
        baseRev: 0,
        payload: { id: 'obs-draft', projectId: 'srv-1', objectiveId: 'obj-X', status: 'observed', rev: 0 },
        observedAt: null, sourceType: null, cycleId: null, taskType: null,
      },
    };

    await executeTypedRecordOp(op as never);

    expect(obsCreate).toHaveBeenCalledTimes(1);
    const [calledServerId, body] = obsCreate.mock.calls[0]!;
    expect(calledServerId).toBe('srv-1');
    // Editable slice travels; server-owned identity is stripped.
    expect(body).toMatchObject({ objectiveId: 'obj-X', status: 'observed' });
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('projectId');
    expect(body).not.toHaveProperty('rev');
    // baseRev now tracked under the SERVER uuid (the local draft id is retired).
    expect(getRecordBaseRevForTest(OBS_STORE, 'local-1', 'uuid-new')).toBe(1);
  });

  it('escalates a stale uuid PATCH (409) — adopts serverRev, badges the store, never clobbers', async () => {
    obsUpdate.mockRejectedValue({ status: 409, details: { serverRev: 7 } });
    const op = {
      payload: {
        projectLocalId: 'local-1',
        storeKey: OBS_STORE,
        recordId: 'uuid-stale',
        schemaVersion: 1,
        baseRev: 2,
        payload: { id: 'uuid-stale', objectiveId: 'obj-Y', status: 'observed' },
        observedAt: null, sourceType: null, cycleId: null, taskType: null,
      },
    };

    await executeTypedRecordOp(op as never);

    // Adopt the authoritative rev (stop re-pushing a stale base)…
    expect(getRecordBaseRevForTest(OBS_STORE, 'local-1', 'uuid-stale')).toBe(7);
    // …surface for the steward (olos always escalates — no auto_resolved tier)…
    expect(useConnectivityStore.getState().conflictedStores).toContain(OBS_STORE);
    expect(warnMock).toHaveBeenCalledTimes(1);
    // …and never write the server copy back (no clobber).
    expect(obsCreate).not.toHaveBeenCalled();
  });
});
