/**
 * Pure scalar/temporal core of the field-verification axis.
 *
 * Two ideas drive the model:
 *   1. RECENCY DECAY — a ground observation's evidentiary weight halves every
 *      `halfLifeYears`. "Verified" is therefore something that must be
 *      *maintained*: stale observations fade out, recent/repeated ones build
 *      up. This is what makes the axis multi-year and living rather than a
 *      one-time stamp.
 *   2. TOPIC → LAYER mapping — a field record only speaks to the layer(s) its
 *      topic is about (a soil test does not verify the flood layer).
 *
 * No turf, no GeoJSON, no React. Sub-region geometry is the web layer's job
 * (apps/web/src/lib/fieldVerification/buildVerificationZones.ts).
 */

import type { LayerType } from '../constants/dataSources.js';
import type {
  LayerFieldVerification,
  ObservationTopic,
  RawObservation,
  VerificationLevel,
} from './types.js';

/** Default decay half-life, in years. A first-guess constant kept here (single
 *  source) for easy tuning — 3 years means an observation is worth ~0.5 after
 *  3yr, ~0.25 after 6yr. */
export const DEFAULT_HALF_LIFE_YEARS = 3;

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/** Weight thresholds for promoting summed decayed weight to a level.
 *  `[0, 0.5)` → unverified, `[0.5, 1.5)` → corroborated, `[1.5, ∞)` → verified.
 *  One fresh observation (weight ≈ 1) lands at `corroborated`; it takes a
 *  second recent observation, or a sustained cadence, to reach `verified`. */
export const VERIFICATION_THRESHOLDS = {
  corroborated: 0.5,
  verified: 1.5,
} as const;

/** Which data layer(s) an observation topic can verify. `general` maps to
 *  nothing — a general note is not tied to a specific layer. */
export const TOPIC_TO_LAYERS: Record<ObservationTopic, LayerType[]> = {
  'soil-sample': ['soils'],
  'soil-health': ['soils'],
  'water-quality': ['watershed', 'wetlands_flood'],
  invasives: ['land_cover'],
  'indicator-species': ['land_cover'],
  wildlife: ['land_cover'],
  general: [],
};

/** Time-decayed evidentiary weight of an observation, in `[0, 1]`.
 *  `0.5 ** (ageYears / halfLifeYears)` — exponential decay. A future-dated or
 *  just-now observation is full weight (1); an unparseable date is 0. */
export function decayWeight(
  observedAt: string | Date,
  asOf: string | Date = new Date(),
  halfLifeYears: number = DEFAULT_HALF_LIFE_YEARS,
): number {
  const obs = new Date(observedAt).getTime();
  const now = new Date(asOf).getTime();
  if (!Number.isFinite(obs) || !Number.isFinite(now)) return 0;
  const ageYears = (now - obs) / MS_PER_YEAR;
  if (ageYears <= 0) return 1;
  return 0.5 ** (ageYears / halfLifeYears);
}

/** Promote a summed decayed weight to a verification level. */
export function levelFromWeight(weight: number): VerificationLevel {
  if (weight >= VERIFICATION_THRESHOLDS.verified) return 'verified';
  if (weight >= VERIFICATION_THRESHOLDS.corroborated) return 'corroborated';
  return 'unverified';
}

/** Aggregate raw observations into a per-layer verification standing.
 *
 * Each observation is decayed against `asOf`, expanded to its topic's
 * layer(s), and its weight summed per layer. Layers with no contributing
 * observation are omitted (consumers treat absence as `unverified`).
 */
export function aggregateByLayer(
  observations: RawObservation[],
  asOf: string | Date = new Date(),
  halfLifeYears: number = DEFAULT_HALF_LIFE_YEARS,
): LayerFieldVerification[] {
  const acc = new Map<
    LayerType,
    { weight: number; count: number; last: number | null }
  >();

  for (const o of observations) {
    const layers = TOPIC_TO_LAYERS[o.topic];
    if (!layers || layers.length === 0) continue;
    const w = decayWeight(o.observedAt, asOf, halfLifeYears);
    if (w <= 0) continue;
    const t = new Date(o.observedAt).getTime();
    for (const layer of layers) {
      const cur = acc.get(layer) ?? { weight: 0, count: 0, last: null };
      cur.weight += w;
      cur.count += 1;
      if (Number.isFinite(t) && (cur.last === null || t > cur.last)) {
        cur.last = t;
      }
      acc.set(layer, cur);
    }
  }

  const out: LayerFieldVerification[] = [];
  for (const [layerType, v] of acc) {
    out.push({
      layerType,
      level: levelFromWeight(v.weight),
      weight: v.weight,
      observationCount: v.count,
      lastObservedAt: v.last === null ? null : new Date(v.last).toISOString(),
    });
  }
  return out;
}
