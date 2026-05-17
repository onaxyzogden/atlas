// @vitest-environment happy-dom
/**
 * P4.1/4.2/4.3 — blob hydration on initialSync (the read side that makes
 * device B actually restore; P0-1's other half).
 *
 * Contract pinned here:
 *  - every `versioned-blob` server row is written back into its store via
 *    the descriptor's `applyForProject` (other projects untouched);
 *  - the adopted server `rev` becomes the next push's baseRev (no instant
 *    409 storm after restore);
 *  - version-skew guard: a blob whose `schemaVersion` is NEWER than this
 *    client's descriptor is SKIPPED (not downcast through a stale migrate),
 *    a single "update Atlas" warning is shown, and the stale local slice is
 *    NOT pushed back;
 *  - `temporal()` stores get their undo history cleared after hydrate so the
 *    restore is not a user-undoable frame.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { listMock } = vi.hoisted(() => ({ listMock: vi.fn() }));
vi.mock('../apiClient.js', async (orig) => {
  const actual = await orig<typeof import('../apiClient.js')>();
  return {
    ...actual,
    api: { ...actual.api, projectState: { ...actual.api.projectState, list: listMock } },
  };
});

const { warnMock } = vi.hoisted(() => ({ warnMock: vi.fn() }));
vi.mock('../../components/Toast', async (orig) => {
  const actual = await orig<typeof import('../../components/Toast')>();
  return { ...actual, toast: { ...actual.toast, warning: warnMock } };
});

import { hydrateProjectStateBlobs, getBlobBaseRevForTest } from '../syncService.js';
import type { SyncedStoreDescriptor } from '../syncManifest.js';

function makeStore(initial: Record<string, unknown>) {
  let state: Record<string, unknown> = { ...initial };
  const cleared = { count: 0 };
  return {
    handle: {
      getState: () => state,
      setState: (p: unknown) => {
        const patch = typeof p === 'function' ? (p as (s: unknown) => object)(state) : p;
        state = { ...state, ...(patch as object) };
      },
      temporal: { getState: () => ({ clear: () => { cleared.count++; } }) },
    },
    get state() {
      return state;
    },
    cleared,
  };
}

function desc(over: Partial<SyncedStoreDescriptor>): SyncedStoreDescriptor {
  return {
    storeKey: 'ogden-hazards',
    classification: 'versioned-blob',
    scope: 'byProject',
    schemaVersion: 1,
    usesTemporal: false,
    selectForProject: (s, pid) => (s as any).byProject?.[pid]?.hazards ?? [],
    applyForProject: (store, pid, incoming) =>
      store.setState((st: any) => ({
        byProject: { ...st.byProject, [pid]: { ...st.byProject?.[pid], hazards: incoming } },
      })),
    ...over,
  };
}

beforeEach(() => {
  listMock.mockReset();
  warnMock.mockReset();
});

describe('hydrateProjectStateBlobs', () => {
  it('writes each server blob back via applyForProject and adopts its rev', async () => {
    const store = makeStore({ byProject: { B: { hazards: [{ id: 'b1' }] } } });
    const d = desc({ store: store.handle as never });
    listMock.mockResolvedValue({
      data: [{ storeKey: 'ogden-hazards', payload: [{ id: 'a1' }], schemaVersion: 1, rev: 7 }],
    });

    await hydrateProjectStateBlobs({ id: 'A', serverId: 'srv-A' } as never, [d]);

    expect((store.state as any).byProject.A.hazards).toEqual([{ id: 'a1' }]);
    expect((store.state as any).byProject.B.hazards).toEqual([{ id: 'b1' }]); // untouched
    expect(getBlobBaseRevForTest('ogden-hazards', 'A')).toBe(7);
  });

  it('skips a NEWER-schema blob, warns once, and does not adopt its rev', async () => {
    const store = makeStore({ byProject: {} });
    const d = desc({ store: store.handle as never, schemaVersion: 1 });
    listMock.mockResolvedValue({
      data: [{ storeKey: 'ogden-hazards', payload: [{ id: 'x' }], schemaVersion: 99, rev: 5 }],
    });

    await hydrateProjectStateBlobs({ id: 'SKEW', serverId: 'srv-SKEW' } as never, [d]);

    expect((store.state as any).byProject.SKEW).toBeUndefined(); // not applied
    expect(warnMock).toHaveBeenCalledTimes(1);
    expect(getBlobBaseRevForTest('ogden-hazards', 'SKEW')).toBe(0); // rev NOT adopted
  });

  it('clears temporal undo history after hydrating a temporal store', async () => {
    const store = makeStore({ byProject: {} });
    const d = desc({ store: store.handle as never, usesTemporal: true });
    listMock.mockResolvedValue({
      data: [{ storeKey: 'ogden-hazards', payload: [{ id: 'a1' }], schemaVersion: 1, rev: 2 }],
    });

    await hydrateProjectStateBlobs({ id: 'A', serverId: 'srv-A' } as never, [d]);

    expect(store.cleared.count).toBe(1);
  });
});
