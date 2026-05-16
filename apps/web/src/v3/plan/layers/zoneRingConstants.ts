/**
 * Shared Mollison zone-ring geometry — the SINGLE source of truth for
 * the Z1/Z2/Z3 ring radii so the read-only `PlanZoneRingsOverlay` and
 * the `ringSeedGenerator` (which turns the rings into editable zones)
 * can never drift apart. If these constants change, both the drawn
 * rings and the seeded annulus zones move together by construction.
 *
 * Radii are the historical indicative defaults (Mollison): Z1 within
 * ~30 m of the home centre (daily touch), Z2 within ~100 m (weekly),
 * Z3 within ~500 m (main crops / managed orchard). Bands are the
 * annulus each Z-level occupies — Z1 is the inner disc, Z2/Z3 the
 * surrounding rings — used by the seeder; the overlay only needs the
 * outer circle of each.
 */

import * as turf from '@turf/turf';

export interface ZoneRingBand {
  /** Permaculture Z-level this band represents. */
  zLevel: 1 | 2 | 3;
  /** Inner radius in metres (0 for Z1 — it is a filled disc). */
  innerM: number;
  /** Outer radius in metres. */
  outerM: number;
  label: string;
  color: string;
}

/** Z1/Z2/Z3 bands, ordered inner → outer. */
export const ZONE_RING_BANDS: readonly ZoneRingBand[] = [
  { zLevel: 1, innerM: 0, outerM: 30, label: 'Z1 · 30 m', color: '#c8a85a' },
  { zLevel: 2, innerM: 30, outerM: 100, label: 'Z2 · 100 m', color: '#a88a4a' },
  { zLevel: 3, innerM: 100, outerM: 500, label: 'Z3 · 500 m', color: '#856a3a' },
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
