// chronicVerdicts.ts
//
// useChronicVerdicts -- a derived, cross-store READ seam (hooks only, NO create).
//
// Unions the LIVE co-occurrence clusters (reviewFlagStore.byProject, filtered to
// open + non-dormant EXACTLY as useCoOccurrenceClusters does) with the HISTORICAL
// observation-log ledger (observationLogStore.records, sliced to the project) and
// delegates to the pure detectChronicVerdicts from @ogden/shared. The result is
// the slice #3 chronic-verdict set: a protocol PAIR co-deviating in the same
// season across >= 2 distinct rotation cycles.
//
// Zustand-v5 safety (mirror of reviewFlagStore.useCoOccurrenceClusters):
//   Select TWO STABLE whole roots directly at the top level -- s.byProject and
//   s.records -- never an inline-filter selector (a fresh array each call reads as
//   a state change under Zustand v5 and drives an infinite re-render loop). ALL
//   derivation happens in ONE useMemo to avoid transitive-memo fragility.

import { useMemo } from 'react';
import type { ChronicVerdict } from '@ogden/shared';
import { detectChronicVerdicts, detectCoOccurrenceClusters } from '@ogden/shared';
import {
  isFlagDormantByWindow,
  isOpenReviewFlag,
  useReviewFlagStore,
  type FlagBucket,
} from './reviewFlagStore.js';
import { useObservationLogStore } from './observationLogStore.js';

/** Stable empty result for null projectId / no matches (referential stability). */
const EMPTY_VERDICTS: ChronicVerdict[] = [];

/**
 * useChronicVerdicts -- reactive cross-store hook returning the chronic verdicts
 * for a project. Open + non-dormant live flags only (same filtering as
 * useCoOccurrenceClusters); the historical ledger is taken whole for the project.
 *
 * currentBucket (optional): same semantics as useCoOccurrenceClusters -- when
 * supplied, open flags whose firing pattern has not recurred in a later
 * comparable window are excluded before clustering.
 */
export function useChronicVerdicts(
  projectId: string | null,
  currentBucket?: FlagBucket,
): ChronicVerdict[] {
  const byProject = useReviewFlagStore((s) => s.byProject);
  const records = useObservationLogStore((s) => s.records);
  return useMemo(() => {
    if (!projectId) return EMPTY_VERDICTS;
    const flags = byProject[projectId] ?? [];
    const openFlags = flags.filter((f) => {
      if (!isOpenReviewFlag(f)) return false;
      if (currentBucket !== undefined) {
        const per = f.expectedRate?.per ?? 'season';
        if (isFlagDormantByWindow(f, currentBucket, per)) return false;
      }
      return true;
    });
    const liveClusters = detectCoOccurrenceClusters(openFlags);
    const history = records.filter((r) => r.projectId === projectId);
    return detectChronicVerdicts(liveClusters, history);
  }, [byProject, records, projectId, currentBucket]);
}
