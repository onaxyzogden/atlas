/**
 * forageSeasonMath — pure seasonal forage signal shared by the rotation
 * sequencer and `ForageQualitySeasonalCard`.
 *
 * S2 of the B3 sequencer-fidelity slices. The sequencer's rest math was
 * season-unaware (a fixed species-recovery floor regardless of when a paddock
 * is grazed), while `ForageQualitySeasonalCard` already modelled the cool-
 * season pasture archetype — spring flush, summer protein slump, fall flush,
 * winter dormancy. This module lifts that archetype's crude-protein curve into
 * a shared, store-free helper and exposes a single derived signal the
 * sequencer needs: **how much longer should rest be in a given month** because
 * regrowth slows when forage quality dips.
 *
 * Heuristic, not a forage-budget model (same honesty posture as the rest of
 * Sub-project B). Strictly ecological — no financial framing.
 */

import * as turf from '@turf/turf';

/**
 * Northern-hemisphere cool-season crude-protein archetype, Jan=0 … Dec=11.
 * Mirrors `ForageQualitySeasonalCard`'s `NH_PROTEIN`. Peak in late spring
 * (May ≈ 20%), trough in the summer slump (Jul–Aug ≈ 9–11%).
 */
export const NH_PROTEIN = [7, 8, 11, 16, 20, 18, 11, 9, 14, 13, 9, 7] as const;

/** Hemisphere flip — Jan SH ≈ Jul NH. */
export function shiftSouthern(arr: readonly number[]): number[] {
  return arr.map((_, i) => arr[(i + 6) % 12] ?? 0);
}

/**
 * Southern-hemisphere check from a parcel boundary's centroid latitude
 * (centroid lat < 0 ⇒ southern). Mirrors `ForageQualitySeasonalCard`'s inline
 * hemisphere derivation so the sequencer's seasonal dates match the card.
 * Returns `false` for a missing boundary or any centroid failure.
 */
export function isSouthernHemisphere(
  boundary: GeoJSON.FeatureCollection | null | undefined,
): boolean {
  if (!boundary) return false;
  try {
    const centroid = turf.centroid(boundary);
    const lat = centroid.geometry.coordinates[1];
    return typeof lat === 'number' && lat < 0;
  } catch {
    return false;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Upper bound on how much a slump month can stretch rest. */
export const MAX_SEASONAL_REST_MULTIPLIER = 1.6;

/**
 * Rest-period multiplier (≥ 1) for the calendar month a graze ends in.
 *
 * Derived from the crude-protein archetype: rest is shortest when protein
 * peaks (flush months → ~1.0) and longest in the summer slump (low protein →
 * up to `MAX_SEASONAL_REST_MULTIPLIER`). Computed as
 * `clamp(peakProtein / monthProtein, 1, MAX)`, rounded to 2 dp.
 *
 * @param monthIdx 0-based calendar month (Jan=0 … Dec=11)
 * @param opts.isSouthern apply the southern-hemisphere 6-month flip
 */
export function seasonalRestMultiplier(
  monthIdx: number,
  opts?: { isSouthern?: boolean },
): number {
  const curve = opts?.isSouthern ? shiftSouthern(NH_PROTEIN) : NH_PROTEIN;
  const idx = ((monthIdx % 12) + 12) % 12;
  const monthProtein = curve[idx] ?? 0;
  const peakProtein = Math.max(...curve);
  if (monthProtein <= 0) return MAX_SEASONAL_REST_MULTIPLIER;
  const raw = clamp(peakProtein / monthProtein, 1, MAX_SEASONAL_REST_MULTIPLIER);
  return Math.round(raw * 100) / 100;
}
