/**
 * syncState — shared sync-status slice for the OLOS record stores.
 *
 * Every record store keeps a per-project sync entry: idle | loading | ready
 * | error. Wired into ObjectiveWorkspace so the steward can see when local
 * state diverges from the server (loading), is in sync (ready), or has
 * failed to round-trip (error). Phase 2.4.
 */

export type SyncStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface SyncState {
  status: SyncStatus;
  error: string | null;
  lastSyncedAt: string | null;
}

export function initialSync(): SyncState {
  return { status: 'idle', error: null, lastSyncedAt: null };
}

export function startSync(): SyncState {
  return { status: 'loading', error: null, lastSyncedAt: null };
}

export function readySync(): SyncState {
  return { status: 'ready', error: null, lastSyncedAt: new Date().toISOString() };
}

export function errorSync(err: unknown): SyncState {
  return {
    status: 'error',
    error: err instanceof Error ? err.message : String(err),
    lastSyncedAt: null,
  };
}
