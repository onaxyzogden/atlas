// observationLogStore.ts
//
// observationLogStore -- append-only ledger of flag-closure ObservationLogRecords.
// Structural twin of proofEventStore: flat array, add-only, projectId-tagged,
// persisted. NO update/remove -- retention is unbounded and orphans are by
// design (the history is the asset; mirrors the proofEvent audit covenant).
//
// Persist key: 'ogden-observation-log', version 2. Registered in syncManifest
// as projectId-tagged. Written to ONLY by reviewFlagStore's resolve/dismiss
// closures; read by the (later) chronic co-occurrence detector.
// v1->v2: archivedRecords cold tier added (archive-not-erase covenant).

import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import type { ObservationLogRecord } from '@ogden/shared';
import {
  detectChronicVerdicts,
  chronicProtectedRecordIds,
  partitionExpiredRecords,
  OBSERVATION_LOG_RETENTION_CYCLES,
} from '@ogden/shared';

interface ObservationLogState {
  records: ObservationLogRecord[];
  /** Recoverable cold tier: rows demoted by a compaction. The chronic detector
   *  never reads this (it reads `records`), so archived rows are dormant until
   *  restored. Slice-2 covenant strengthened: memory is demoted, never erased. */
  archivedRecords: ObservationLogRecord[];
  append: (r: ObservationLogRecord) => void;
  getProjectRecords: (projectId: string) => ObservationLogRecord[];
  /**
   * Read-only DRY-RUN of pruneProjectRecords for one project: returns the same
   * { kept, pruned } partition the prune would apply, WITHOUT mutating state (no
   * set()). pruneProjectRecords composes on top of this so preview and actual
   * prune can never drift. Pure read of the ledger.
   */
  previewProjectPrune: (
    projectId: string,
    keepWithinCycles?: number,
  ) => { kept: ObservationLogRecord[]; pruned: ObservationLogRecord[] };
  /**
   * Steward-INITIATED, chronic-safe retention sweep for one project (T3.6). A
   * deliberate amendment of slice #2's unbounded-retention covenant: it bounds
   * ledger growth WITHOUT erasing an undated audit row or any record still
   * contributing to a detectable chronic verdict. Returns the pruned rows so the
   * action is observable. NEVER auto-triggered -- call explicitly only.
   * Archive-not-erase: pruned rows are DEMOTED to archivedRecords, not dropped.
   */
  pruneProjectRecords: (
    projectId: string,
    keepWithinCycles?: number,
  ) => ObservationLogRecord[];
  /**
   * Un-archive: move every archived row for one project back into the active
   * `records` set. Returns the restored rows (observable). The reverse of the
   * archive step performed by pruneProjectRecords.
   */
  restoreArchivedRecords: (projectId: string) => ObservationLogRecord[];
}

// Partialize shape used by persist v2 (matches migrate return type).
type PersistedShape = {
  records: ObservationLogRecord[];
  archivedRecords: ObservationLogRecord[];
};

export const useObservationLogStore = create<ObservationLogState>()(
  persist(
    (set, get) => ({
      records: [],
      archivedRecords: [],
      append: (r) => set((s) => ({ records: [...s.records, r] })),
      getProjectRecords: (projectId) =>
        get().records.filter((r) => r.projectId === projectId),
      previewProjectPrune: (projectId, keepWithinCycles) => {
        const projectRecords = get().records.filter(
          (r) => r.projectId === projectId,
        );
        // Pruning reads ONLY the ledger (no live clusters) -- protect against the
        // chronic verdicts still derivable from history alone.
        const verdicts = detectChronicVerdicts([], projectRecords);
        const protectedIds = chronicProtectedRecordIds(projectRecords, verdicts);
        return partitionExpiredRecords(
          projectRecords,
          keepWithinCycles ?? OBSERVATION_LOG_RETENTION_CYCLES,
          protectedIds,
        );
      },
      pruneProjectRecords: (projectId, keepWithinCycles) => {
        const { kept, pruned } = get().previewProjectPrune(
          projectId,
          keepWithinCycles,
        );
        // previewProjectPrune is pure (no set), so { kept, pruned } reflect
        // current state. Apply via the functional set form (matches append) so
        // the records/archivedRecords reads cannot observe stale state.
        // Archive-not-erase: pruned rows are DEMOTED to the recoverable cold
        // tier, not dropped. The active ledger shrinks; nothing leaves the store.
        set((s) => ({
          records: [
            ...s.records.filter((r) => r.projectId !== projectId),
            ...kept,
          ],
          archivedRecords: [...s.archivedRecords, ...pruned],
        }));
        return pruned;
      },
      restoreArchivedRecords: (projectId) => {
        const restored = get().archivedRecords.filter(
          (r) => r.projectId === projectId,
        );
        if (restored.length === 0) {
          return [];
        }
        set((s) => ({
          records: [...s.records, ...restored],
          archivedRecords: s.archivedRecords.filter(
            (r) => r.projectId !== projectId,
          ),
        }));
        return restored;
      },
    }),
    {
      name: 'ogden-observation-log',
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 2,
      partialize: (state): PersistedShape => ({
        records: state.records,
        archivedRecords: state.archivedRecords,
      }),
      // v1 -> v2: persisted v1 state had no archive. Seed an empty archive and
      // preserve the existing records (no row is lost or moved). Version-gated so
      // a future v3 adds its own branch above this without re-running v1->v2.
      migrate: (persisted, version): PersistedShape => {
        const prev = (persisted ?? {}) as Partial<PersistedShape>;
        if (version < 2) {
          return {
            records: prev.records ?? [],
            archivedRecords: [],
          };
        }
        return {
          records: prev.records ?? [],
          archivedRecords: prev.archivedRecords ?? [],
        };
      },
    },
  ),
);

rehydrateWithLogging(useObservationLogStore);

/** Stable empty result for null projectId / no matches (referential stability). */
const EMPTY_RECORDS: ReadonlyArray<ObservationLogRecord> = [];

/**
 * Zustand-v5-safe read hook: stable select of the whole array, then derive the
 * per-project slice in useMemo. NEVER an inline-filter selector (fresh array
 * each render -> infinite re-render loop). Mirrors useReviewFlagCountsByObjective.
 */
export function useObservationLog(
  projectId: string | null,
): ReadonlyArray<ObservationLogRecord> {
  const records = useObservationLogStore((s) => s.records);
  return useMemo(() => {
    if (!projectId) return EMPTY_RECORDS;
    return records.filter((r) => r.projectId === projectId);
  }, [records, projectId]);
}

/**
 * Zustand-v5-safe read hook for the archive cold tier. Mirrors useObservationLog
 * exactly: stable whole-array select on archivedRecords, then useMemo slice by
 * projectId. NEVER an inline-filter selector.
 */
export function useArchivedLog(
  projectId: string | null,
): ReadonlyArray<ObservationLogRecord> {
  const archived = useObservationLogStore((s) => s.archivedRecords);
  return useMemo(() => {
    if (!projectId) return EMPTY_RECORDS;
    return archived.filter((r) => r.projectId === projectId);
  }, [archived, projectId]);
}
