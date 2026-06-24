/**
 * Shared Mollison zone-ring geometry — the DEFAULT source of truth for
 * the home + Z1–Z5 ring radii so the read-only `PlanZoneRingsOverlay`
 * and the `ringSeedGenerator` (which turns the rings into editable
 * zones) start from the same ladder.
 *
 * Originally these radii were the *only* source: hard-coded constants
 * both consumers imported, guaranteeing they could never drift. They
 * are now the **default seed** for a per-project, adjustable radii
 * config (`zoneRingConfigStore`): a steward can re-size the rings to a
 * compact lot or a sprawling parcel, before or after placing them.
 * `bandsFromRadii()` turns any `ZoneRingRadii` (custom or the default)
 * into the inner/outer band array both consumers already speak, so the
 * "never drift" invariant holds for whatever radii are in force — the
 * overlay, the seeder, and the resize editor all derive their bands
 * from one `ZoneRingRadii` value.
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

/**
 * Adjustable per-project ring radii — the home-centre disc radius plus
 * the outer radius of each Z-level. Inner radii are derived (each band's
 * inner edge is the previous band's outer edge; Z1 starts at 0). This is
 * the value `zoneRingConfigStore` persists per project; `bandsFromRadii`
 * turns it into the `ZoneRingBand[]` the seeder + overlay consume.
 */
export interface ZoneRingRadii {
  /** Home-centre (Z0) disc radius in metres. */
  homeM: number;
  /** Outer radius of Z1 in metres (its inner edge is 0 — a filled disc). */
  z1M: number;
  z2M: number;
  z3M: number;
  z4M: number;
  z5M: number;
}

/** Fixed home-centre disc radius for the default ladder (Z0). */
export const HOME_CENTRE_RADIUS_M = 15;

/** Stable earthy fill colour per Z-level (independent of radius). */
const ZONE_RING_COLOR: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '#c8a85a',
  2: '#a88a4a',
  3: '#856a3a',
  4: '#6f7a44',
  5: '#3f6b4a',
};

/**
 * Canonical Mollison radii — the default every project inherits until a
 * steward adjusts them. `ZONE_RING_BANDS` is derived from this so the
 * two can never disagree.
 */
export const DEFAULT_RING_RADII: ZoneRingRadii = {
  homeM: HOME_CENTRE_RADIUS_M,
  z1M: 30,
  z2M: 100,
  z3M: 300,
  z4M: 600,
  z5M: 1200,
};

/**
 * Turn a `ZoneRingRadii` into the inner/outer band array the seeder and
 * overlay consume. Inner edge of each band = previous band's outer edge
 * (Z1 = 0). The label echoes the in-force outer radius (rounded) so a
 * custom set reads honestly (e.g. `Z2 · 145 m`). Colours are fixed
 * per-level.
 */
export function bandsFromRadii(radii: ZoneRingRadii): ZoneRingBand[] {
  const outers: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: radii.z1M,
    2: radii.z2M,
    3: radii.z3M,
    4: radii.z4M,
    5: radii.z5M,
  };
  const inners: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: radii.z1M,
    3: radii.z2M,
    4: radii.z3M,
    5: radii.z4M,
  };
  return ([1, 2, 3, 4, 5] as const).map((z) => ({
    zLevel: z,
    innerM: inners[z],
    outerM: outers[z],
    label: `Z${z} · ${Math.round(outers[z])} m`,
    color: ZONE_RING_COLOR[z],
  }));
}

/**
 * Z1–Z5 bands for the default Mollison ladder, ordered inner → outer.
 * Retained as a named export (the historical single source of truth) so
 * existing importers keep working; it is now just
 * `bandsFromRadii(DEFAULT_RING_RADII)`.
 */
export const ZONE_RING_BANDS: readonly ZoneRingBand[] =
  bandsFromRadii(DEFAULT_RING_RADII);

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
