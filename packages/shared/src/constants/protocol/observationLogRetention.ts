// observationLogRetention.ts
//
// Pure, store-free retention-partition helper (T3.5).
//
// Slice #2 (observationLogRecord.schema.ts) recorded an append-only ledger with
// an UNBOUNDED-retention covenant: nothing was ever erased. Slice #3 amends that
// covenant deliberately, allowing a steward-INITIATED retention sweep to prune
// stale closure rows. THIS module is the safety mechanism for that amendment: it
// partitions records into { kept, pruned } under two inviolable guarantees --
//   (1) an UNDATED audit row (cycleNumber === undefined) is NEVER pruned (it is
//       pure audit and is already excluded from chronic detection), and
//   (2) a record whose id is in protectedRecordIds is NEVER pruned (the caller
//       seeds that set with every leg that still contributes to a detectable
//       chronic verdict, so a chronic pair with one leg past the recency horizon
//       cannot be erased).
//
// Beyond those guarantees, a record is kept when its cycleNumber falls inside a
// PER-SEASON recency window: the most-recent keepWithinCycles DISTINCT cycles
// for that record's own season. Seasons never cross-protect: recent cycles in
// one season do not rescue an old cycle in another.
//
// Pure, deterministic, time-free: no Date, no Math.random, no store import, no
// zod. The CALLER owns protectedRecordIds derivation and persistence.

import type { ObservationLogRecord } from '../../schemas/protocol/observationLogRecord.schema.js';

/** Default per-season recency window: keep the most-recent 12 distinct cycles. */
export const OBSERVATION_LOG_RETENTION_CYCLES = 12;

/**
 * Partition closure-ledger records into { kept, pruned } for a steward-initiated
 * retention sweep.
 *
 * A record is KEPT if ANY of:
 *  1. cycleNumber === undefined (undated -> pure audit, always kept), OR
 *  2. its cycleNumber is within the most-recent keepWithinCycles DISTINCT
 *     cycleNumbers for its OWN season (season-scoped recency window), OR
 *  3. its id is in protectedRecordIds.
 * Otherwise PRUNED.
 *
 * Input order is preserved (stable) within each of kept and pruned.
 *
 * Guard rails: a negative keepWithinCycles is treated as 0; 0 yields an empty
 * recency window (undated + protected still survive).
 */
export function partitionExpiredRecords(
  records: ObservationLogRecord[],
  keepWithinCycles: number,
  protectedRecordIds: ReadonlySet<string>,
): { kept: ObservationLogRecord[]; pruned: ObservationLogRecord[] } {
  // Clamp the window: negatives collapse to 0 (recency axis keeps nothing).
  const windowSize = keepWithinCycles < 0 ? 0 : keepWithinCycles;

  // Pass 1: per-season set of distinct DATED cycleNumbers. Undated records carry
  // no cycle and are excluded from the windows entirely (handled in pass 2).
  const seasonCycles = new Map<string, Set<number>>();
  for (const record of records) {
    if (record.cycleNumber === undefined) {
      continue;
    }
    const seasonKey = record.season ?? 'unknown';
    const cycles = seasonCycles.get(seasonKey);
    if (cycles === undefined) {
      seasonCycles.set(seasonKey, new Set<number>([record.cycleNumber]));
    } else {
      cycles.add(record.cycleNumber);
    }
  }

  // Derive each season's kept window: distinct cycles sorted descending, top
  // windowSize taken into a fast-lookup Set.
  const seasonKeptWindow = new Map<string, Set<number>>();
  for (const [seasonKey, cycles] of seasonCycles) {
    const sortedDesc = [...cycles].sort((a, b) => b - a);
    const window = new Set<number>();
    const take = windowSize < sortedDesc.length ? windowSize : sortedDesc.length;
    for (let i = 0; i < take; i += 1) {
      const cycle = sortedDesc[i];
      if (cycle === undefined) {
        continue;
      }
      window.add(cycle);
    }
    seasonKeptWindow.set(seasonKey, window);
  }

  // Pass 2: classify each record, preserving input order.
  const kept: ObservationLogRecord[] = [];
  const pruned: ObservationLogRecord[] = [];
  for (const record of records) {
    // Guarantee 1: undated rows are pure audit -> always kept.
    if (record.cycleNumber === undefined) {
      kept.push(record);
      continue;
    }
    // Guarantee 3: explicitly protected ids (e.g. chronic-contributing legs).
    if (protectedRecordIds.has(record.id)) {
      kept.push(record);
      continue;
    }
    // Recency axis: in its OWN season's kept window?
    const seasonKey = record.season ?? 'unknown';
    const window = seasonKeptWindow.get(seasonKey);
    if (window !== undefined && window.has(record.cycleNumber)) {
      kept.push(record);
      continue;
    }
    pruned.push(record);
  }

  return { kept, pruned };
}
