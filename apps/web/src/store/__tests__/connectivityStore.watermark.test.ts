// @vitest-environment happy-dom
/**
 * connectivityStore — per-project sync watermark (Phase 3, work-stream A).
 *
 * Pins the two fixes that closed the clock-skew + global-watermark caveats:
 *  - `migrateConnectivity` drops the old GLOBAL scalar `lastSyncedAt` → empty
 *    map (forcing a rev-idempotent epoch re-pull) while PRESERVING the conflict
 *    set, so two projects can no longer clobber each other's changed-since.
 *  - `getLastSyncedAt` / `setLastSyncedAt` are keyed per (local) projectId.
 *  - `selectMostRecentSync` returns a stable primitive max for display chrome.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useConnectivityStore,
  migrateConnectivity,
  selectMostRecentSync,
  COMPOST_SYNC_KEY,
  type ConnectivityState,
} from '../connectivityStore';

beforeEach(() => {
  useConnectivityStore.setState({ lastSyncedAt: {}, conflictedStores: [] });
});

describe('migrateConnectivity', () => {
  it('drops the v0 global scalar watermark and seeds an empty map', () => {
    const out = migrateConnectivity(
      { lastSyncedAt: '2026-06-01T00:00:00.000Z', conflictedStores: ['x'] },
      0,
    );
    expect(out.lastSyncedAt).toEqual({});
  });

  it('preserves conflictedStores through the v0→v1 bump', () => {
    const out = migrateConnectivity(
      { lastSyncedAt: '2026-06-01T00:00:00.000Z', conflictedStores: ['ogden-foo'] },
      0,
    );
    expect(out.conflictedStores).toEqual(['ogden-foo']);
  });

  it('leaves a valid v1 map untouched', () => {
    const map = { 'local-1': '2026-06-02T00:00:00.000Z' };
    const out = migrateConnectivity({ lastSyncedAt: map }, 1);
    expect(out.lastSyncedAt).toEqual(map);
  });

  it('coerces a corrupt non-object v1 watermark to {}', () => {
    const out = migrateConnectivity({ lastSyncedAt: 'oops' as unknown }, 1);
    expect(out.lastSyncedAt).toEqual({});
  });
});

describe('get/setLastSyncedAt — per-project keying', () => {
  it('reads undefined for a project with no watermark', () => {
    expect(useConnectivityStore.getState().getLastSyncedAt('local-1')).toBeUndefined();
  });

  it('advances one project without touching another', () => {
    const { setLastSyncedAt, getLastSyncedAt } = useConnectivityStore.getState();
    setLastSyncedAt('local-1', '2026-06-03T00:00:00.000Z');
    setLastSyncedAt('local-2', '2026-05-01T00:00:00.000Z');
    expect(getLastSyncedAt('local-1')).toBe('2026-06-03T00:00:00.000Z');
    // Advancing local-1 again leaves local-2 alone.
    setLastSyncedAt('local-1', '2026-06-04T00:00:00.000Z');
    expect(useConnectivityStore.getState().getLastSyncedAt('local-2')).toBe(
      '2026-05-01T00:00:00.000Z',
    );
  });
});

describe('selectMostRecentSync', () => {
  it('returns null for an empty map', () => {
    expect(selectMostRecentSync({ lastSyncedAt: {} } as unknown as ConnectivityState)).toBeNull();
  });

  it('returns the lexicographic max across all scopes (incl. compost)', () => {
    const state = {
      lastSyncedAt: {
        'local-1': '2026-01-01T00:00:00.000Z',
        'local-2': '2026-03-01T00:00:00.000Z',
        [COMPOST_SYNC_KEY]: '2026-02-01T00:00:00.000Z',
      },
    } as unknown as ConnectivityState;
    expect(selectMostRecentSync(state)).toBe('2026-03-01T00:00:00.000Z');
  });
});

describe('persist partialize -- dropped ops survive a reload (H2)', () => {
  // A dropped op has already left the IDB queue; `droppedStores` is the ONLY
  // remaining record of the lost write. If it is not persisted, a reload turns
  // the header's unsaved-changes pill back into "All synced" — the exact
  // silent loss H2 exists to prevent.
  it('persists droppedStores (and the existing watermark + conflict set) but not runtime state', () => {
    const partialize = useConnectivityStore.persist.getOptions().partialize!;
    const out = partialize({
      ...useConnectivityStore.getState(),
      lastSyncedAt: { 'local-1': '2026-01-01T00:00:00.000Z' },
      conflictedStores: ['ogden-zones'],
      droppedStores: ['zone:create:z1'],
      isOnline: false,
      syncStatus: 'error',
      pendingChanges: 7,
    }) as Partial<ConnectivityState>;
    expect(out.droppedStores).toEqual(['zone:create:z1']);
    expect(out.conflictedStores).toEqual(['ogden-zones']);
    expect(out.lastSyncedAt).toEqual({ 'local-1': '2026-01-01T00:00:00.000Z' });
    expect(out).not.toHaveProperty('isOnline');
    expect(out).not.toHaveProperty('syncStatus');
    expect(out).not.toHaveProperty('pendingChanges');
  });
});
