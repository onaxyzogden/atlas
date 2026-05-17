/**
 * Shared Mollison zone-ring geometry — the SINGLE source of truth for
 * the Z1–Z5 ring radii so the read-only `PlanZoneRingsOverlay` and
 * the `ringSeedGenerator` (which turns the rings into editable zones)
 * can never drift apart. If these constants change, both the drawn
 * rings and the seeded annulus zones move together by construction.
 *
 * Radii follow the canonical Mollison ladder (matches
 * `concentric.ts` / `zoneSizeGuide.ts`): Z1 within ~30 m of the home
 * centre (daily touch), Z2 within ~100 m (weekly), Z3 within ~300 m
 * (main crops / managed orchard), Z4 within ~600 m (forage / woodlot).
 * Z5 (wild) has no true outer edge — here it is a fixed ~1200 m ring
 * so a single click seeds an editable starting polygon (true
 * parcel-clipped wilderness stays a manual refinement). Bands are the
 * annulus each Z-level occupies — Z1 is the inner disc, the rest are
 * surrounding rings — used by the seeder; the overlay only needs the
 * outer circle of each.
 */

import * as turf from '@turf/turf';

export interface ZoneRingBand {
  /** Permaculture Z-level this band represents. */
  zLevel: 1 | 2 | 3 | 4 | 5;
  /** Inner radius in metres (0 for Z1 — it is a filled disc). */
  innerM: number;
  /** Outer radius in metres. */
  outerM: number;
  label: string;
  color: string;
}

/** Z1–Z5 bands, ordered inner → outer. */
export const ZONE_RING_BANDS: readonly ZoneRingBand[] = [
  { zLevel: 1, innerM: 0, outerM: 30, label: 'Z1 · 30 m', color: '#c8a85a' },
  { zLevel: 2, innerM: 30, outerM: 100, label: 'Z2 · 100 m', color: '#a88a4a' },
  { zLevel: 3, innerM: 100, outerM: 300, label: 'Z3 · 300 m', color: '#856a3a' },
  { zLevel: 4, innerM: 300, outerM: 600, label: 'Z4 · 600 m', color: '#6f7a44' },
  { zLevel: 5, innerM: 600, outerM: 1200, label: 'Z5 · 1200 m', color: '#3f6b4a' },
];

/** Fixed circle resolution — identical for overlay and seeder so a
 *  seeded zone's outer edge lands exactly on the drawn ring. */
export const RING_CIRCLE_STEPS = 64;

/** A geodesic circle of `radiusM` around `center`, at the shared
 *  resolution. `center` is a GeoJSON Point feature (turf.centroid). */
export function ringCircle(
  center: GeoJSON.Feature<GeoJSON.Point>,
  radiusM: number,
): GeoJSON.Feature<GeoJSON.Polygon> {
  return turf.circle(center, radiusM, {
    steps: RING_CIRCLE_STEPS,
    units: 'meters',
  }) as GeoJSON.Feature<GeoJSON.Polygon>;
}
