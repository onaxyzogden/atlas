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

  // ── Actions ──
  setOnline: (online: boolean) => void;
  setLastSyncedAt: (ts: string) => void;
  setPendingChanges: (count: number) => void;
  setSyncStatus: (status: ConnectivityState['syncStatus']) => void;
  addConflictedStore: (storeKey: string) => void;
  clearConflictedStore: (storeKey: string) => void;
}

export const useConnectivityStore = create<ConnectivityState>()(
  persist(
    (set) => ({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      lastSyncedAt: null,
      pendingChanges: 0,
      syncStatus: 'idle',
      conflictedStores: [],

      setOnline: (online) => set({ isOnline: online }),
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
    }),
    {
      name: 'ogden-connectivity',
      // Only persist the last-synced timestamp — runtime state resets on reload
      partialize: (state) => ({ lastSyncedAt: state.lastSyncedAt }),
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
