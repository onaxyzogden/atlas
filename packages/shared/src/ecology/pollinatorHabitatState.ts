/**
 * Pollinator habitat **state** classifier — pure read from a zone's current
 * land cover. Distinct from the bbox-scale synthesized 5×5 patch grid
 * emitted by `PollinatorOpportunityProcessor` (which mixes cover sampling +
 * connectivity role) and from the `pollinatorBand` derived from planned
 * interventions. This one answers one question: given what is ALREADY on
 * this parcel-scale zone, how good is it for pollinators today?
 *
 * Input: the `coverClass` + `disturbanceLevel` that `SoilRegenerationProcessor`
 * now emits onto each `soil_regeneration` feature.
 *
 * Output: a 0-1 score, a 4-way band, and the normalized class string we
 * used (helpful for tooltips).
 *
 * Reuses the `POLLINATOR_SUPPORTIVE_WEIGHTS` + `POLLINATOR_LIMITING_WEIGHTS`
 * vocabulary in `pollinatorHabitat.ts` — no new authoritative table.
 *
 * Not a scoring component: `computeScores.ts` does not reference this file,
 * so `verify-scoring-parity.ts` stays at delta 0.
 */

import {
  POLLINATOR_SUPPORTIVE_WEIGHTS,
  POLLINATOR_LIMITING_WEIGHTS,
} from './pollinatorHabitat.js';

export type HabitatStateBand = 'high' | 'moderate' | 'low' | 'hostile';

export interface ClassifyZoneHabitatInput {
  coverClass: string | null | undefined;
  disturbanceLevel?: number | null | undefined;
}

export interface ClassifyZoneHabitatResult {
  band: HabitatStateBand;
  /** 0-1. Disturbance-adjusted supportive score (or 0 if limiting). */
  score: number;
  /** Canonical class string we keyed on, or `'unknown'` when unmatched. */
  normalizedClass: string;
  /** True if the class was matched in the limiting table (cropland, urban, water). */
  isLimiting: boolean;
}

/**
 * Substring-match the incoming `coverClass` against the supportive /
 * limiting tables. Mirrors the `landCoverToDisturbance` pattern used
 * server-side so adapter vocabularies stay in lockstep.
 */
function matchWeightTable(
  coverClass: string,
  table: Record<string, number>,
): { key: string; weight: number } | null {
  const lower = coverClass.trim().toLowerCase();
  if (!lower) return null;
  // Exact case-insensitive match wins over substring.
  for (const key of Object.keys(table)) {
    if (key.toLowerCase() === lower) {
      return { key, weight: table[key] as number };
    }
  }
  // Substring match — prefer the longest key so "Mixed Forest" beats "Forest".
  let best: { key: string; weight: number; len: number } | null = null;
  for (const key of Object.keys(table)) {
    const k = key.toLowerCase();
    if (lower.includes(k) || k.includes(lower)) {
      if (!best || k.length > best.len) {
        best = { key, weight: table[key] as number, len: k.length };
      }
    }
  }
  return best ? { key: best.key, weight: best.weight } : null;
}

export function classifyZoneHabitat({
  coverClass,
  disturbanceLevel,
}: ClassifyZoneHabitatInput): ClassifyZoneHabitatResult {
  if (!coverClass) {
    return { band: 'low', score: 0.2, normalizedClass: 'unknown', isLimiting: false };
  }

  // Limiting table wins: if the class is intensive cropland / impervious /
  // open water, treat as degraded habitat regardless of small supportive
  // overlap in the vocabulary (e.g. "Developed, Open Space" is supportive
  // but "Developed, High Intensity" is limiting).
  const limiting = matchWeightTable(coverClass, POLLINATOR_LIMITING_WEIGHTS);
  if (limiting) {
    // Higher limiting weight → more hostile. Flip it into a band.
    // Any limiting match is at least "low" habitat. Fully limiting
    // (open water, high-intensity developed, ice/snow) is hostile.
    const band: HabitatStateBand = limiting.weight >= 0.9 ? 'hostile' : 'low';
    return {
      band,
      score: Math.max(0, 1 - limiting.weight),
      normalizedClass: limiting.key,
      isLimiting: true,
    };
  }

  const supportive = matchWeightTable(coverClass, POLLINATOR_SUPPORTIVE_WEIGHTS);
  if (!supportive) {
    return { band: 'low', score: 0.25, normalizedClass: 'unknown', isLimiting: false };
  }

  // Disturbance penalty: clamp to [0, 1], scale score by (1 - 0.3 × d).
  // A fully-disturbed supportive zone loses 30% of its raw weight.
  const d = Math.max(0, Math.min(1, typeof disturbanceLevel === 'number' ? disturbanceLevel : 0));
  const score = supportive.weight * (1 - 0.3 * d);

  const band: HabitatStateBand =
    score >= 0.8 ? 'high' : score >= 0.55 ? 'moderate' : score >= 0.3 ? 'low' : 'hostile';

  return { band, score, normalizedClass: supportive.key, isLimiting: false };
}
