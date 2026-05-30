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
   * successful response. Drives the global ApiReachabilityBanner. Runtime-only
   * (never persisted; defaults true so a cold load assumes reachable).
   */
  apiReachable: boolean;
  /** ISO timestamp of the last successful sync with the server */
  lastSyncedAt: string | null;
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
  setLastSyncedAt: (ts: string) => void;
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

export const useConnectivityStore = create<ConnectivityState>()(
  persist(
    (set) => ({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      apiReachable: true,
      lastSyncedAt: null,
      pendingChanges: 0,
      syncStatus: 'idle',
      conflictedStores: [],
      droppedStores: [],

      setOnline: (online) => set({ isOnline: online }),
      // No-op when unchanged: the apiClient success hook fires this on every
      // successful response, so we must not notify subscribers on each call.
      setApiReachable: (reachable) =>
        set((s) => (s.apiReachable === reachable ? s : { apiReachable: reachable })),
      setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),
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
      // Persist the last-synced timestamp AND the conflict set, so a reload keeps
      // the conflict badge visible until the Phase 4 surface reconciles it from
      // the server. Other runtime state (online / reachable / status) resets.
      partialize: (state) => ({
        lastSyncedAt: state.lastSyncedAt,
        conflictedStores: state.conflictedStores,
      }),
    },
  ),
);

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
