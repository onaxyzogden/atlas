// coOccurrence.ts
//
// Pure co-occurrence cluster detection (T1).
//
// When several DISTINCT protocol templates raise review flags inside the same
// temporal bucket (season + rotation cycle), that pattern is worth surfacing:
// it may point to a shared underlying cause one stratum deeper than any single
// flag. This module derives those clusters as a pure function over an
// already-filtered list of open, non-dormant flags.
//
// This is a DERIVED VIEW type -- TS interface only, never persisted, so no zod
// schema. The web layer owns open/dormant filtering and store access; this
// module is store-free and time-free.

import type { SeasonName } from '../../schemas/protocol/protocol.schema.js';
import type {
  ObjectiveReviewFlag,
  FlagDepth,
} from '../../schemas/protocol/reviewFlag.schema.js';
import { temporalBucketKey } from './deviationPolicy.js';

// ---------------------------------------------------------------------------
// CoOccurrenceCluster
// ---------------------------------------------------------------------------

/**
 * A set of >= 2 distinct protocol templates that raised flags within the same
 * temporal bucket. Derived, never persisted.
 */
export interface CoOccurrenceCluster {
  /** temporalBucketKey(season, cycleNumber). */
  bucketKey: string;
  /** Season of the bucket (may be absent). */
  season?: SeasonName;
  /** Rotation cycle index of the bucket (always defined post-filter). */
  cycleNumber?: number;
  /** Distinct sourceTemplateIds contributing (>= 2). */
  templateIds: string[];
  /** Distinct objectiveIds implicated. */
  objectiveIds: string[];
  /** Contributing open flag ids. */
  flagIds: string[];
  /** Deepest flag depth in the bucket, by DEPTH_RANK. */
  dominantDepth: FlagDepth;
  /** DEPTH_THEME[dominantDepth]. */
  theme: string;
  /** True when any contributing flag is deviationSign 'existential'. */
  containsExistential: boolean;
  /** Sort weight: DEPTH_RANK + templateIds.length + (existential ? 100 : 0). */
  weight: number;
  /** ASCII reason string (buildClusterSummary). */
  summary: string;
}

// ---------------------------------------------------------------------------
// Depth ranking + themes
// ---------------------------------------------------------------------------

/**
 * Numeric rank per depth (threshold shallowest 0 .. structural deepest 4).
 * Mirrors the declared order of the FlagDepth zod enum.
 */
export const DEPTH_RANK: Record<FlagDepth, number> = {
  threshold: 0,
  soil: 1,
  water: 2,
  zones: 3,
  structural: 4,
};

/** Human-readable theme label per depth. */
export const DEPTH_THEME: Record<FlagDepth, string> = {
  threshold: 'Operational thresholds',
  soil: 'Soil & ecology',
  water: 'Water strategy',
  zones: 'Zones & sectors',
  structural: 'Structural design',
};

// ---------------------------------------------------------------------------
// buildClusterSummary
// ---------------------------------------------------------------------------

/** Fields buildClusterSummary needs to render its ASCII reason. */
export interface ClusterSummaryInput {
  templateCount: number;
  objectiveCount: number;
  dominantDepth: FlagDepth;
  season?: SeasonName;
  containsExistential: boolean;
}

const IHSAN_PREFIX =
  'Animal welfare implicated (ihsan): a carrying-capacity assumption ' +
  'may have cost stock. ';

/**
 * Pure ASCII summary. No causation laundering: it reports a co-occurrence
 * pattern ("points to") rather than asserting a proven cause.
 */
export function buildClusterSummary(input: ClusterSummaryInput): string {
  const { templateCount, objectiveCount, dominantDepth, season } = input;
  const theme = DEPTH_THEME[dominantDepth];
  const per = season ?? 'cycle';
  const base =
    `${templateCount} protocols deviating together this ${per}: ` +
    `points to ${theme} (${objectiveCount} objective(s)).`;
  return input.containsExistential ? `${IHSAN_PREFIX}${base}` : base;
}

// ---------------------------------------------------------------------------
// detectCoOccurrenceClusters
// ---------------------------------------------------------------------------

/**
 * Derives co-occurrence clusters from an already-filtered list of open,
 * non-dormant review flags. Pure and store-free.
 *
 * Steps:
 *  1. Exclude flags whose window.cycleNumber is undefined (cycleNumber is the
 *     reliable temporal axis; season alone is ambiguous across years).
 *  2. Group by temporalBucketKey(season, cycleNumber).
 *  3. Keep buckets with >= 2 DISTINCT sourceTemplateId.
 *  4. Build a CoOccurrenceCluster per kept bucket.
 *  5. Return sorted by weight DESC (existential-bearing first).
 */
export function detectCoOccurrenceClusters(
  openFlags: ObjectiveReviewFlag[]
): CoOccurrenceCluster[] {
  // 1 + 2. Group eligible flags by bucket key.
  const buckets = new Map<string, ObjectiveReviewFlag[]>();
  for (const flag of openFlags) {
    if (flag.window.cycleNumber === undefined) {
      continue;
    }
    const key = temporalBucketKey(flag.window.season, flag.window.cycleNumber);
    const existing = buckets.get(key);
    if (existing === undefined) {
      buckets.set(key, [flag]);
    } else {
      existing.push(flag);
    }
  }

  const clusters: CoOccurrenceCluster[] = [];

  for (const [bucketKey, flags] of buckets) {
    // 3. Require >= 2 distinct templates.
    const templateIds = distinct(flags.map((f) => f.sourceTemplateId));
    if (templateIds.length < 2) {
      continue;
    }

    const objectiveIds = distinct(flags.map((f) => f.objectiveId));
    const flagIds = distinct(flags.map((f) => f.id));

    // Deepest depth by rank. Reduce never indexes a possibly-undefined value.
    const dominantDepth = flags.reduce<FlagDepth>(
      (deepest, flag) =>
        DEPTH_RANK[flag.depth] > DEPTH_RANK[deepest] ? flag.depth : deepest,
      flags[0]!.depth
    );

    const containsExistential = flags.some(
      (f) => f.deviationSign === 'existential'
    );

    // Representative window: every flag in the bucket shares the key, and
    // cycleNumber is guaranteed defined by step 1.
    const representative = flags[0]!;
    const season = representative.window.season;
    const cycleNumber = representative.window.cycleNumber;

    const weight =
      DEPTH_RANK[dominantDepth] +
      templateIds.length +
      (containsExistential ? 100 : 0);

    const summary = buildClusterSummary({
      templateCount: templateIds.length,
      objectiveCount: objectiveIds.length,
      dominantDepth,
      season,
      containsExistential,
    });

    clusters.push({
      bucketKey,
      season,
      cycleNumber,
      templateIds,
      objectiveIds,
      flagIds,
      dominantDepth,
      theme: DEPTH_THEME[dominantDepth],
      containsExistential,
      weight,
      summary,
    });
  }

  // 5. Heaviest first.
  clusters.sort((a, b) => b.weight - a.weight);
  return clusters;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Returns the distinct values of an array, preserving first-seen order. */
function distinct(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}
