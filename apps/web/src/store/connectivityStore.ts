/**
 * Connectivity store — single source of truth for online/offline state,
 * sync status, and last-synced timestamp.
 *
 * Replaces scattered navigator.onLine checks and fieldworkStore.isOnline.
 * Module-level side-effects register window online/offline listeners.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ConnectivityState {
  /** Whether the device currently has network connectivity */
  isOnline: boolean;
  /**
   * Whether the backend API is reachable. Distinct from `isOnline`: the device
   * can be online (navigator.onLine === true) while the server is down, still
   * starting, or on a dead origin. Set false when a request fails with a
   * network-level rejection (NETWORK_ERROR / status 0), true on the next
   * successful response. Drives the global ApiReachabilityWatcher (self-heal)
   * and the ApiReachabilityStatus header chip. Runtime-only
   * (never persisted; defaults true so a cold load assumes reachable).
   */
  apiReachable: boolean;
  /**
   * Per-scope server-clock sync watermark, keyed by **local** projectId (the
   * stable, always-present id; `serverId` can be null/reassigned and is only
   * ever used as the API argument). Each value is the newest server `updated_at`
   * applied for that project — used verbatim as the `changed-since` query param,
   * so it must NEVER be written from the client wall clock (a skewed clock would
   * skip rows stamped in the skew window). The reconnect delta-pull is the only
   * correct writer. The org-scoped compost vertical also parks a display-only
   * value here under the synthetic key `COMPOST_SYNC_KEY` (it does no
   * changed-since pull, so a client-clock value there is harmless).
   */
  lastSyncedAt: Record<string, string>;
  /** Number of queued operations waiting to be synced */
  pendingChanges: number;
  /** Current sync lifecycle state */
  syncStatus: 'idle' | 'syncing' | 'error';
  /**
   * Store keys whose last sync was rejected as stale (409). Drives the
   * Connectivity-panel conflict badge; a stale write is never silently
   * clobbered (P4.4).
   */
  conflictedStores: string[];
  /**
   * Coalescing keys (`storeType:action:localId`) of ops the sync queue gave up
   * on after exhausting MAX_RETRIES. A dropped op is a change that could not be
   * saved to the server — surfaced so it is visible to the steward instead of
   * vanishing silently (the sync circuit-breaker).
   */
  droppedStores: string[];

  // ── Actions ──
  setOnline: (online: boolean) => void;
  setApiReachable: (reachable: boolean) => void;
  /** Read a project's (or scope's) watermark; undefined → never synced → the
   *  next changed-since sends `since: undefined` (full epoch re-pull). */
  getLastSyncedAt: (projectId: string) => string | undefined;
  /** Advance a single project's (or scope's) watermark, keyed by local id. */
  setLastSyncedAt: (projectId: string, ts: string) => void;
  setPendingChanges: (count: number) => void;
  setSyncStatus: (status: ConnectivityState['syncStatus']) => void;
  addConflictedStore: (storeKey: string) => void;
  clearConflictedStore: (storeKey: string) => void;
  /** Replace the whole conflicted-store set — reconcile from the server's
   *  escalated-conflict list (the Phase 4 surface's source of truth). */
  setConflictedStores: (storeKeys: string[]) => void;
  addDroppedStore: (opKey: string) => void;
  clearDroppedStore: (opKey: string) => void;
}

/**
 * Persist migration for `ogden-connectivity`. v0 (unversioned) stored
 * `lastSyncedAt` as a single GLOBAL scalar, but `changed-since` is issued per
 * project — one shared value let project A's pull advance past project B's last
 * real sync (B then silently skipped the gap). Drop the old scalar → empty map →
 * each project's first post-upgrade changed-since sends `since: undefined` (full
 * epoch re-pull), which is rev/updated_at-idempotent so a no-op on
 * already-applied rows. Seeding the map from the old scalar would re-introduce
 * the per-project skip bug. `conflictedStores` is preserved through the bump.
 */
export function migrateConnectivity(
  persisted: unknown,
  version: number,
): ConnectivityState {
  const p = (persisted ?? {}) as Partial<ConnectivityState> & {
    lastSyncedAt?: unknown;
  };
  if (version < 1) {
    return { ...p, lastSyncedAt: {} } as ConnectivityState;
  }
  // Defensive: coerce a corrupt/partial non-object watermark to {}.
  if (typeof p.lastSyncedAt !== 'object' || p.lastSyncedAt === null) {
    return { ...p, lastSyncedAt: {} } as ConnectivityState;
  }
  return p as ConnectivityState;
}

export const useConnectivityStore = create<ConnectivityState>()(
  persist(
    (set, get) => ({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      apiReachable: true,
      lastSyncedAt: {},
      pendingChanges: 0,
      syncStatus: 'idle',
      conflictedStores: [],
      droppedStores: [],

      setOnline: (online) => set({ isOnline: online }),
      // No-op when unchanged: the apiClient success hook fires this on every
      // successful response, so we must not notify subscribers on each call.
      setApiReachable: (reachable) =>
        set((s) => (s.apiReachable === reachable ? s : { apiReachable: reachable })),
      getLastSyncedAt: (projectId) => get().lastSyncedAt[projectId],
      setLastSyncedAt: (projectId, ts) =>
        set((s) => ({ lastSyncedAt: { ...s.lastSyncedAt, [projectId]: ts } })),
      setPendingChanges: (count) => set({ pendingChanges: count }),
      setSyncStatus: (status) => set({ syncStatus: status }),
      addConflictedStore: (storeKey) =>
        set((s) =>
          s.conflictedStores.includes(storeKey)
            ? s
            : { conflictedStores: [...s.conflictedStores, storeKey] },
        ),
      clearConflictedStore: (storeKey) =>
        set((s) => ({
          conflictedStores: s.conflictedStores.filter((k) => k !== storeKey),
        })),
      setConflictedStores: (storeKeys) =>
        set(() => ({ conflictedStores: [...new Set(storeKeys)] })),
      addDroppedStore: (opKey) =>
        set((s) =>
          s.droppedStores.includes(opKey)
            ? s
            : { droppedStores: [...s.droppedStores, opKey] },
        ),
      clearDroppedStore: (opKey) =>
        set((s) => ({
          droppedStores: s.droppedStores.filter((k) => k !== opKey),
        })),
    }),
    {
      name: 'ogden-connectivity',
      version: 1,
      // Persist the per-project watermark map AND the conflict set, so a reload
      // keeps the conflict badge visible until the Phase 4 surface reconciles it
      // from the server. Other runtime state (online / reachable / status) resets.
      partialize: (state) => ({
        lastSyncedAt: state.lastSyncedAt,
        conflictedStores: state.conflictedStores,
      }),
      migrate: migrateConnectivity,
    },
  ),
);

/** Synthetic watermark key for the org-scoped compost vertical's display-only
 *  "last synced" value (it does no project-scoped changed-since pull). Kept
 *  distinct from any local projectId so it never collides with a real project. */
export const COMPOST_SYNC_KEY = 'compost';

/**
 * Display-only selector: the most-recent watermark across all scopes, or null.
 * Returns a primitive so it is referentially stable as a zustand selector.
 * ISO-8601 strings compare lexicographically, so `>` is correct without Date
 * parsing. Used by the global offline chrome ("device last heard from server").
 */
export const selectMostRecentSync = (s: ConnectivityState): string | null => {
  let max: string | null = null;
  for (const ts of Object.values(s.lastSyncedAt)) {
    if (max === null || ts > max) max = ts;
  }
  return max;
};

// ── Module-level side effects: register global online/offline listeners ──

if (typeof window !== 'undefined') {
  const store = useConnectivityStore.getState;

  window.addEventListener('online', () => {
    store().setOnline(true);
    // Sync flush is triggered by syncService (which imports this store)
  });

  window.addEventListener('offline', () => {
    store().setOnline(false);
  });
}
