// chronicDetection.ts
//
// Pure CHRONIC structural-verdict detection (T3).
//
// Slice #1 (coOccurrence.ts) surfaces single-cycle "structural verdict"
// clusters over the OPEN review-flag set (the present). Slice #2
// (observationLogRecord.schema.ts) records an append-only ledger of every flag
// CLOSURE (the past). THIS module unions those two -- live clusters + the
// historical ledger -- to surface CHRONIC verdicts: the same protocol PAIR
// co-deviating in the SAME season across >= 2 distinct rotation cycles.
//
// A chronic verdict is the strongest "redesign, not retune" signal in the
// protocol layer: a one-off co-occurrence might be noise, but the SAME pair
// recurring season-over-season across cycles is structural.
//
// This is a DERIVED VIEW type -- TS interface only, never persisted, so no zod
// schema (contrast ObservationLogRecord, the persisted ledger row; mirror
// CoOccurrenceCluster, the never-persisted derived interface). Pure,
// store-free, time-free: the CALLER owns open/dormant filtering, store access,
// and history retrieval.

import type { SeasonName } from '../../schemas/protocol/protocol.schema.js';
import type { FlagDepth } from '../../schemas/protocol/reviewFlag.schema.js';
import type { ObservationLogRecord } from '../../schemas/protocol/observationLogRecord.schema.js';
import {
  DEPTH_RANK,
  DEPTH_THEME,
  type CoOccurrenceCluster,
} from './coOccurrence.js';
import { temporalBucketKey } from './deviationPolicy.js';

// ---------------------------------------------------------------------------
// ChronicVerdict
// ---------------------------------------------------------------------------

/**
 * A protocol PAIR that co-deviated in the SAME season across >= 2 distinct
 * rotation cycles. Derived, never persisted.
 */
export interface ChronicVerdict {
  /** `${season ?? 'unknown'}:${[a,b].sort().join('+')}` -- stable React key. */
  signatureKey: string;
  /** Season the pattern recurs in (absent only when the bucket has no season). */
  season?: SeasonName;
  /** The two distinct sourceTemplateIds, sorted ascending. */
  templatePair: [string, string];
  /** The pair as an array (surface convenience; === [...templatePair]). */
  templateIds: string[];
  /** Distinct union of objectiveIds across contributing occurrences, sorted. */
  objectiveIds: string[];
  /** Sorted distinct cycles where BOTH templates co-occur (length >= 2). */
  cycleNumbers: number[];
  /** = cycleNumbers.length. */
  occurrenceCount: number;
  /** True when cycleNumbers form a contiguous run (max - min + 1 === length). */
  consecutive: boolean;
  /** max - min + 1 over cycleNumbers. */
  spanCycles: number;
  /** Deepest depth by DEPTH_RANK across contributing occurrences. */
  dominantDepth: FlagDepth;
  /** DEPTH_THEME[dominantDepth]. */
  theme: string;
  /** True when any contributing occurrence had an existential deviation. */
  containsExistential: boolean;
  /** True when any contributing occurrence is a live/open cluster. */
  containsOpen: boolean;
  /** Diagnostic weight only -- NOT the sort key (the sort is a tuple). */
  weight: number;
  /** ASCII reason string (buildChronicSummary). */
  summary: string;
}

/** A pair must recur across at least this many distinct cycles to be chronic. */
export const CHRONIC_RECURRENCE_THRESHOLD = 2;

// IHSAN_PREFIX is module-private (not exported) in coOccurrence.ts, so it cannot
// be imported. Replicate its literal value verbatim here. Keep in sync.
const IHSAN_PREFIX =
  'Animal welfare implicated (ihsan): a carrying-capacity assumption ' +
  'may have cost stock. ';

// ---------------------------------------------------------------------------
// Occurrence (internal): one (season, cycle) bucket with >= 2 co-deviating
// templates.
// ---------------------------------------------------------------------------

/** Per-template contribution within one (season, cycle) bucket. */
interface TemplateEntry {
  objectiveIds: Set<string>;
  depth: FlagDepth;
  existential: boolean;
}

interface Occurrence {
  season?: SeasonName;
  cycleNumber: number;
  /**
   * Per-template breakdown so pair enumeration pulls ONLY the two templates'
   * data. Keys are the templateIds in this bucket (= the old templateIds set).
   */
  templates: Map<string, TemplateEntry>;
  hasOpen: boolean;
}

// ---------------------------------------------------------------------------
// buildChronicSummary
// ---------------------------------------------------------------------------

/** Fields buildChronicSummary needs to render its ASCII reason. */
export interface ChronicSummaryInput {
  templatePair: [string, string];
  occurrenceCount: number;
  consecutive: boolean;
  dominantDepth: FlagDepth;
  objectiveCount: number;
  containsExistential: boolean;
}

/**
 * Pure ASCII summary. No causal over-claim: it reports a recurring pattern
 * ("points to") rather than asserting a proven cause.
 */
export function buildChronicSummary(input: ChronicSummaryInput): string {
  const [a, b] = input.templatePair;
  const theme = DEPTH_THEME[input.dominantDepth];
  const runWord = input.consecutive ? 'consecutive ' : '';
  const base =
    `${a} + ${b} co-deviating across ${input.occurrenceCount} ` +
    `${runWord}cycles: points to a structural ${theme} failure ` +
    `(${input.objectiveCount} objective(s)) -- redesign, not retune.`;
  return input.containsExistential ? `${IHSAN_PREFIX}${base}` : base;
}

// ---------------------------------------------------------------------------
// detectChronicVerdicts
// ---------------------------------------------------------------------------

/**
 * Unions live clusters (present) with the historical closure ledger (past) and
 * surfaces chronic verdicts: a protocol pair co-deviating in the same season
 * across >= CHRONIC_RECURRENCE_THRESHOLD distinct cycles. Pure and store-free.
 *
 * Steps (see module head):
 *  1. Build HISTORICAL occurrences from the ledger (group by bucketKey, drop
 *     undated records, keep buckets with >= 2 distinct templates).
 *  2. Build LIVE occurrences from clusters (drop undated, map straight across).
 *  3. UNION by temporalBucketKey(season, cycleNumber) so a live + historical
 *     occurrence of the SAME bucket merge into one.
 *  4. Group by season; within a season accumulate per unordered template pair.
 *  5. Emit one verdict per pair recurring across >= threshold distinct cycles.
 *  6. Sort by a determinism-complete tuple comparator.
 */
export function detectChronicVerdicts(
  liveClusters: CoOccurrenceCluster[],
  history: ObservationLogRecord[],
): ChronicVerdict[] {
  // 1. Historical occurrences: group ledger records by bucketKey.
  const historyBuckets = new Map<string, ObservationLogRecord[]>();
  for (const record of history) {
    if (record.cycleNumber === undefined) {
      continue; // undated -- cannot anchor to a cycle.
    }
    const existing = historyBuckets.get(record.bucketKey);
    if (existing === undefined) {
      historyBuckets.set(record.bucketKey, [record]);
    } else {
      existing.push(record);
    }
  }

  // Merged occurrences keyed by temporalBucketKey for the live/historical union.
  const occurrences = new Map<string, Occurrence>();

  for (const records of historyBuckets.values()) {
    const distinctTemplates = distinctSet(records.map((r) => r.sourceTemplateId));
    if (distinctTemplates.size < 2) {
      continue;
    }
    // cycleNumber is defined for every surviving record; pick the first.
    const first = records[0];
    if (first === undefined || first.cycleNumber === undefined) {
      continue;
    }
    const season = first.season;
    const cycleNumber = first.cycleNumber;
    // Per-template breakdown: each record contributes its objectiveId, depth,
    // and existential bit to its OWN sourceTemplateId's entry. Multiple records
    // for the same template in this bucket merge into that template's entry.
    const templates = new Map<string, TemplateEntry>();
    for (const r of records) {
      const entry = templates.get(r.sourceTemplateId);
      if (entry === undefined) {
        templates.set(r.sourceTemplateId, {
          objectiveIds: new Set<string>([r.objectiveId]),
          depth: r.depth,
          existential: r.deviationSign === 'existential',
        });
      } else {
        entry.objectiveIds.add(r.objectiveId);
        if (DEPTH_RANK[r.depth] > DEPTH_RANK[entry.depth]) {
          entry.depth = r.depth;
        }
        entry.existential =
          entry.existential || r.deviationSign === 'existential';
      }
    }
    const occurrence: Occurrence = {
      ...(season !== undefined ? { season } : {}),
      cycleNumber,
      templates,
      hasOpen: false,
    };
    mergeOccurrence(occurrences, occurrence);
  }

  // 2 + 3. Live occurrences, merged into the same map.
  for (const cluster of liveClusters) {
    if (cluster.cycleNumber === undefined) {
      continue;
    }
    // LIVE FALLBACK: CoOccurrenceCluster has NO per-template breakdown, so we
    // cannot attribute objectives/depth/existential finer than the cluster.
    // Every templateId maps to an entry carrying the cluster's FULL flat
    // objectiveIds, dominantDepth, and containsExistential. (Documented
    // limitation -- the live path is coarser than the historical path.)
    const templates = new Map<string, TemplateEntry>();
    for (const templateId of cluster.templateIds) {
      templates.set(templateId, {
        objectiveIds: new Set<string>(cluster.objectiveIds),
        depth: cluster.dominantDepth,
        existential: cluster.containsExistential,
      });
    }
    const occurrence: Occurrence = {
      ...(cluster.season !== undefined ? { season: cluster.season } : {}),
      cycleNumber: cluster.cycleNumber,
      templates,
      hasOpen: true,
    };
    mergeOccurrence(occurrences, occurrence);
  }

  // 4. Group occurrences by season, accumulate per unordered template pair.
  interface PairAccumulator {
    season?: SeasonName;
    templatePair: [string, string];
    cycles: Set<number>;
    objectiveIds: Set<string>;
    deepestDepth: FlagDepth;
    existential: boolean;
    hasOpen: boolean;
  }

  // Key combines season scope + pair so different seasons never cross-contaminate.
  const pairs = new Map<string, PairAccumulator>();

  for (const occurrence of occurrences.values()) {
    const templateList = [...occurrence.templates.keys()].sort((a, b) =>
      a.localeCompare(b),
    );
    const seasonScope = occurrence.season ?? 'unknown';
    for (let i = 0; i < templateList.length; i += 1) {
      const a = templateList[i];
      if (a === undefined) {
        continue;
      }
      const entryA = occurrence.templates.get(a);
      if (entryA === undefined) {
        continue;
      }
      for (let j = i + 1; j < templateList.length; j += 1) {
        const b = templateList[j];
        if (b === undefined) {
          continue;
        }
        const entryB = occurrence.templates.get(b);
        if (entryB === undefined) {
          continue;
        }
        // Pair-grain: contribute ONLY the two templates' own data, never a
        // third template C's attributes from the same bucket.
        const pairDepth =
          DEPTH_RANK[entryA.depth] >= DEPTH_RANK[entryB.depth]
            ? entryA.depth
            : entryB.depth;
        const pairExistential = entryA.existential || entryB.existential;
        const pairKey = `${seasonScope}:${a}+${b}`;
        const accumulator = pairs.get(pairKey);
        if (accumulator === undefined) {
          const objectiveIds = new Set<string>(entryA.objectiveIds);
          for (const objectiveId of entryB.objectiveIds) {
            objectiveIds.add(objectiveId);
          }
          pairs.set(pairKey, {
            ...(occurrence.season !== undefined
              ? { season: occurrence.season }
              : {}),
            templatePair: [a, b],
            cycles: new Set<number>([occurrence.cycleNumber]),
            objectiveIds,
            deepestDepth: pairDepth,
            existential: pairExistential,
            hasOpen: occurrence.hasOpen,
          });
        } else {
          accumulator.cycles.add(occurrence.cycleNumber);
          for (const objectiveId of entryA.objectiveIds) {
            accumulator.objectiveIds.add(objectiveId);
          }
          for (const objectiveId of entryB.objectiveIds) {
            accumulator.objectiveIds.add(objectiveId);
          }
          if (DEPTH_RANK[pairDepth] > DEPTH_RANK[accumulator.deepestDepth]) {
            accumulator.deepestDepth = pairDepth;
          }
          accumulator.existential =
            accumulator.existential || pairExistential;
          accumulator.hasOpen = accumulator.hasOpen || occurrence.hasOpen;
        }
      }
    }
  }

  // 5. Emit verdicts for pairs that recur across >= threshold distinct cycles.
  const verdicts: ChronicVerdict[] = [];
  for (const accumulator of pairs.values()) {
    if (accumulator.cycles.size < CHRONIC_RECURRENCE_THRESHOLD) {
      continue;
    }
    const cycleNumbers = [...accumulator.cycles].sort((a, b) => a - b);
    const occurrenceCount = cycleNumbers.length;
    const min = cycleNumbers[0];
    const max = cycleNumbers[occurrenceCount - 1];
    if (min === undefined || max === undefined) {
      continue;
    }
    const spanCycles = max - min + 1;
    const consecutive = spanCycles === occurrenceCount;
    const objectiveIds = [...accumulator.objectiveIds].sort((a, b) =>
      a.localeCompare(b),
    );
    const seasonScope = accumulator.season ?? 'unknown';
    const [a, b] = accumulator.templatePair;
    const weight =
      DEPTH_RANK[accumulator.deepestDepth] +
      occurrenceCount +
      (accumulator.existential ? 100 : 0) +
      (consecutive ? 1 : 0);
    const summary = buildChronicSummary({
      templatePair: accumulator.templatePair,
      occurrenceCount,
      consecutive,
      dominantDepth: accumulator.deepestDepth,
      objectiveCount: objectiveIds.length,
      containsExistential: accumulator.existential,
    });
    verdicts.push({
      signatureKey: `${seasonScope}:${a}+${b}`,
      ...(accumulator.season !== undefined ? { season: accumulator.season } : {}),
      templatePair: accumulator.templatePair,
      templateIds: [...accumulator.templatePair],
      objectiveIds,
      cycleNumbers,
      occurrenceCount,
      consecutive,
      spanCycles,
      dominantDepth: accumulator.deepestDepth,
      theme: DEPTH_THEME[accumulator.deepestDepth],
      containsExistential: accumulator.existential,
      containsOpen: accumulator.hasOpen,
      weight,
      summary,
    });
  }

  // 6. Tuple comparator, descending priority; signatureKey ascending tiebreak.
  verdicts.sort((x, y) => {
    const existentialDelta = bool(y.containsExistential) - bool(x.containsExistential);
    if (existentialDelta !== 0) {
      return existentialDelta;
    }
    const openDelta = bool(y.containsOpen) - bool(x.containsOpen);
    if (openDelta !== 0) {
      return openDelta;
    }
    const countDelta = y.occurrenceCount - x.occurrenceCount;
    if (countDelta !== 0) {
      return countDelta;
    }
    const depthDelta =
      DEPTH_RANK[y.dominantDepth] - DEPTH_RANK[x.dominantDepth];
    if (depthDelta !== 0) {
      return depthDelta;
    }
    const consecutiveDelta = bool(y.consecutive) - bool(x.consecutive);
    if (consecutiveDelta !== 0) {
      return consecutiveDelta;
    }
    const spanDelta = y.spanCycles - x.spanCycles;
    if (spanDelta !== 0) {
      return spanDelta;
    }
    return x.signatureKey.localeCompare(y.signatureKey);
  });

  return verdicts;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Merge an occurrence into the bucket map, unioning into any existing entry. */
function mergeOccurrence(
  occurrences: Map<string, Occurrence>,
  next: Occurrence,
): void {
  const key = temporalBucketKey(next.season, next.cycleNumber);
  const existing = occurrences.get(key);
  if (existing === undefined) {
    occurrences.set(key, next);
    return;
  }
  // Union the per-template maps key-by-key: union objectiveIds, deepen depth,
  // OR existential per template; hasOpen ORs at occurrence level.
  for (const [templateId, nextEntry] of next.templates) {
    const existingEntry = existing.templates.get(templateId);
    if (existingEntry === undefined) {
      existing.templates.set(templateId, nextEntry);
    } else {
      for (const objectiveId of nextEntry.objectiveIds) {
        existingEntry.objectiveIds.add(objectiveId);
      }
      if (DEPTH_RANK[nextEntry.depth] > DEPTH_RANK[existingEntry.depth]) {
        existingEntry.depth = nextEntry.depth;
      }
      existingEntry.existential =
        existingEntry.existential || nextEntry.existential;
    }
  }
  existing.hasOpen = existing.hasOpen || next.hasOpen;
}

/** Boolean -> 1/0 for tuple comparison. */
function bool(value: boolean): number {
  return value ? 1 : 0;
}

/** Distinct values of an array as a Set. */
function distinctSet(values: string[]): Set<string> {
  return new Set(values);
}
