// groupChronicVerdicts.ts
//
// Pure display-layer grouping + capping for chronic co-occurrence verdicts (A1).
//
// The chronic detector (detectChronicVerdicts in @ogden/shared) emits one
// ChronicVerdict per co-deviating template PAIR, already sorted by its
// determinism-complete tuple (existential desc, open desc, occurrenceCount desc,
// depthRank desc, consecutive desc, spanCycles desc, signatureKey asc).
//
// Two surfaces (the Plan banner and the Observe synthesis card) render those
// verdicts flat today. This helper groups them by (season, anchor template =
// the common deviant) so a fan like {A+B, B+C, B+D} collapses under one "B"
// header, and caps the total number of rendered verdict ROWS.
//
// Contract:
//  - PURE: no mutation of the input array or any verdict object.
//  - The detector's input order is AUTHORITATIVE. Within a group, verdicts keep
//    input order (stable bucketing); groups never re-sort their verdicts.
//  - Group ordering: season (spring, summer, autumn, winter, then unknown LAST),
//    then by the input position of each group's FIRST verdict.

import type { ChronicVerdict, SeasonName } from '@ogden/shared';

export interface ChronicVerdictGroup {
  /** `${season ?? 'unknown'}::${anchorTemplateId}` -- stable React key. */
  key: string;
  /** Absent only when the verdicts in this group have no season. */
  season?: SeasonName;
  /** The common deviant template anchoring this group. */
  anchorTemplateId: string;
  /** Contributing verdicts, in detector input order (never re-sorted). */
  verdicts: ChronicVerdict[];
}

const UNKNOWN_SEASON = 'unknown';

/** Rank for the undefined-season ('unknown') bucket: sorts LAST. */
const UNKNOWN_RANK = 4;

/**
 * Season display rank. Named seasons first in calendar order; the undefined
 * season bucket ('unknown') sorts LAST.
 */
const SEASON_RANK: Record<string, number> = {
  spring: 0,
  summer: 1,
  autumn: 2,
  winter: 3,
  [UNKNOWN_SEASON]: UNKNOWN_RANK,
};

function seasonRank(seasonScope: string): number {
  return SEASON_RANK[seasonScope] ?? UNKNOWN_RANK;
}

/**
 * Group flat chronic verdicts by (season, anchor template). Pure and
 * deterministic. Input order within a group is preserved; groups are ordered by
 * season then by the input position of each group's first verdict.
 */
export function groupChronicVerdicts(
  verdicts: ChronicVerdict[],
): ChronicVerdictGroup[] {
  if (verdicts.length === 0) {
    return [];
  }

  // 1. Per-season frequency of each member template across that season's
  //    verdicts. seasonScope = season ?? 'unknown'.
  const seasonFrequency = new Map<string, Map<string, number>>();
  for (const verdict of verdicts) {
    const seasonScope = verdict.season ?? UNKNOWN_SEASON;
    let freq = seasonFrequency.get(seasonScope);
    if (freq === undefined) {
      freq = new Map<string, number>();
      seasonFrequency.set(seasonScope, freq);
    }
    const [a, b] = verdict.templatePair;
    freq.set(a, (freq.get(a) ?? 0) + 1);
    freq.set(b, (freq.get(b) ?? 0) + 1);
  }

  // 2 + 3 + 4. Bucket by (seasonScope, anchor). Anchor = the member with the
  //    higher season-frequency; tie -> lexicographically smaller id. Preserve
  //    input order within each bucket; remember the FIRST input index. The
  //    bucket key doubles as the group key (`${seasonScope}::${anchor}`).
  interface Bucket {
    group: ChronicVerdictGroup;
    firstIndex: number;
  }
  const buckets = new Map<string, Bucket>();

  for (let i = 0; i < verdicts.length; i += 1) {
    const verdict = verdicts[i];
    if (verdict === undefined) {
      continue;
    }
    const seasonScope = verdict.season ?? UNKNOWN_SEASON;
    const freq = seasonFrequency.get(seasonScope);
    const [a, b] = verdict.templatePair;
    const freqA = freq?.get(a) ?? 0;
    const freqB = freq?.get(b) ?? 0;
    let anchor: string;
    if (freqA > freqB) {
      anchor = a;
    } else if (freqB > freqA) {
      anchor = b;
    } else {
      anchor = a.localeCompare(b) <= 0 ? a : b;
    }

    const bucketKey = `${seasonScope}::${anchor}`;
    const existing = buckets.get(bucketKey);
    if (existing === undefined) {
      buckets.set(bucketKey, {
        group: {
          key: bucketKey,
          ...(verdict.season !== undefined ? { season: verdict.season } : {}),
          anchorTemplateId: anchor,
          verdicts: [verdict],
        },
        firstIndex: i,
      });
    } else {
      existing.group.verdicts.push(verdict);
    }
  }

  // 5. Order: season rank, then first-input-index.
  const ordered = [...buckets.values()].sort((x, y) => {
    const xSeason = x.group.season ?? UNKNOWN_SEASON;
    const ySeason = y.group.season ?? UNKNOWN_SEASON;
    const seasonDelta = seasonRank(xSeason) - seasonRank(ySeason);
    if (seasonDelta !== 0) {
      return seasonDelta;
    }
    return x.firstIndex - y.firstIndex;
  });

  return ordered.map((bucket) => bucket.group);
}

/**
 * Cap the total number of rendered verdict ROWS across groups. Walks groups in
 * order, including whole groups until the running row count would exceed `cap`;
 * the straddling group is included with its verdicts truncated to the remaining
 * budget (dropped entirely if the budget is 0). Every dropped verdict counts
 * toward hiddenCount.
 *
 *  - cap >= total rows: all groups, hiddenCount 0 (same group objects).
 *  - cap <= 0: treated as NO cap (defensive) -> all groups, hiddenCount 0.
 *
 * Pure: never mutates input groups; truncation builds a new group object.
 */
export function capGroups(
  groups: ChronicVerdictGroup[],
  cap: number,
): { visibleGroups: ChronicVerdictGroup[]; hiddenCount: number } {
  const total = groups.reduce((sum, group) => sum + group.verdicts.length, 0);

  if (cap <= 0 || cap >= total) {
    return { visibleGroups: [...groups], hiddenCount: 0 };
  }

  const visibleGroups: ChronicVerdictGroup[] = [];
  let used = 0;
  let hiddenCount = 0;

  for (const group of groups) {
    const remaining = cap - used;
    if (remaining <= 0) {
      // Budget exhausted: this whole group is hidden.
      hiddenCount += group.verdicts.length;
      continue;
    }
    if (group.verdicts.length <= remaining) {
      visibleGroups.push(group);
      used += group.verdicts.length;
    } else {
      // Straddling group: include a truncated copy.
      visibleGroups.push({
        ...group,
        verdicts: group.verdicts.slice(0, remaining),
      });
      hiddenCount += group.verdicts.length - remaining;
      used = cap;
    }
  }

  return { visibleGroups, hiddenCount };
}
