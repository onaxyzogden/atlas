// observationLogStore.ts
//
// observationLogStore -- append-only ledger of flag-closure ObservationLogRecords.
// Structural twin of proofEventStore: flat array, add-only, projectId-tagged,
// persisted. NO update/remove -- retention is unbounded and orphans are by
// design (the history is the asset; mirrors the proofEvent audit covenant).
//
// Persist key: 'ogden-observation-log', version 1. Registered in syncManifest
// as projectId-tagged. Written to ONLY by reviewFlagStore's resolve/dismiss
// closures; read by the (later) chronic co-occurrence detector.

import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import type { ObservationLogRecord } from '@ogden/shared';
import {
  detectChronicVerdicts,
  chronicProtectedRecordIds,
  partitionExpiredRecords,
  OBSERVATION_LOG_RETENTION_CYCLES,
} from '@ogden/shared';

interface ObservationLogState {
  records: ObservationLogRecord[];
  append: (r: ObservationLogRecord) => void;
  getProjectRecords: (projectId: string) => ObservationLogRecord[];
  /**
   * Steward-INITIATED, chronic-safe retention sweep for one project (T3.6). A
   * deliberate amendment of slice #2's unbounded-retention covenant: it bounds
   * ledger growth WITHOUT erasing an undated audit row or any record still
   * contributing to a detectable chronic verdict. Returns the pruned rows so the
   * action is observable. NEVER auto-triggered -- call explicitly only.
   */
  pruneProjectRecords: (
    projectId: string,
    keepWithinCycles?: number,
  ) => ObservationLogRecord[];
}

export const useObservationLogStore = create<ObservationLogState>()(
  persist(
    (set, get) => ({
      records: [],
      append: (r) => set((s) => ({ records: [...s.records, r] })),
      getProjectRecords: (projectId) =>
        get().records.filter((r) => r.projectId === projectId),
      pruneProjectRecords: (projectId, keepWithinCycles) => {
        const all = get().records;
        const projectRecords = all.filter((r) => r.projectId === projectId);
        const others = all.filter((r) => r.projectId !== projectId);
        // Pruning reads ONLY the ledger (no live clusters) -- protect against the
        // chronic verdicts still derivable from history alone.
        const verdicts = detectChronicVerdicts([], projectRecords);
        const protectedIds = chronicProtectedRecordIds(projectRecords, verdicts);
        const { kept, pruned } = partitionExpiredRecords(
          projectRecords,
          keepWithinCycles ?? OBSERVATION_LOG_RETENTION_CYCLES,
          protectedIds,
        );
        set({ records: [...others, ...kept] });
        return pruned;
      },
    }),
    {
      name: 'ogden-observation-log',
      version: 1,
      partialize: (state) => ({ records: state.records }),
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
