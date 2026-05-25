/**
 * waterFlowPath — pure downslope-polyline generator for Rec #3 v2.
 *
 * Given a source element centroid and the parcel's uphill frame (`ParcelBox`),
 * walk **downhill** (opposite the uphill unit vector) in fixed metre steps,
 * emitting a polyline that traces where gravity would carry water from that
 * point toward the parcel's low edge. The overlay draws this as a flow arrow
 * so the steward sees, at a glance, the catchment a tank/pond/swale feeds.
 *
 * **DEM-aware with heuristic fallback.** When the caller supplies a
 * `sampleElevationM` sampler (a true DEM lookup), each candidate step is kept
 * only if it actually descends — guaranteeing a monotonic downslope path even
 * over a noisy raster, and stopping early at a local pit. When no sampler is
 * given, the path falls back to the aspect-projected heuristic
 * (`estimateElevationM` over the box), which is strictly monotonic by
 * construction. `usedDem` records which path was taken so callers can label
 * the confidence of the rendered arrow.
 *
 * Pure — no store or map access. Planar lat/lng → metres via the same
 * `ParcelBox.mPerDegRef` frame the rest of the water router uses.
 */

import { estimateElevationM, type ParcelBox } from './waterRouterMath.js';

export interface FlowPathOptions {
  minElevationM: number;
  maxElevationM: number;
  /** Max number of downslope steps to take (default 12). */
  maxSteps?: number;
  /**
   * Step length in metres. Defaults to one-twelfth of the parcel's uphill
   * span, so a flow path spans roughly the full parcel at the default
   * `maxSteps`.
   */
  stepM?: number;
  /**
   * Optional true-DEM elevation sampler. When provided, each step is accepted
   * only if it descends; when omitted, the aspect-projected heuristic is used.
   */
  sampleElevationM?: (p: [number, number]) => number;
}

export interface FlowPath {
  geometry: GeoJSON.LineString;
  /** Elevation (m) at each vertex, parallel to `geometry.coordinates`. */
  elevations: number[];
  /** Total horizontal length of the polyline, in metres. */
  lengthM: number;
  /** Total descent (m): elevation at start − elevation at end. */
  descentM: number;
  /** True when a DEM sampler was supplied; false = heuristic fallback. */
  usedDem: boolean;
}

/**
 * Compute a downslope flow path from `start`. Returns null when the box has no
 * usable uphill span or when no descending step exists (a point already at the
 * parcel floor). The returned LineString always has ≥ 2 vertices when non-null.
 */
export function computeFlowPath(
  start: [number, number],
  box: ParcelBox,
  opts: FlowPathOptions,
): FlowPath | null {
  const { minElevationM, maxElevationM } = opts;
  const maxSteps = opts.maxSteps ?? 12;
  const stepM = opts.stepM ?? box.uphillSpanM / 12;
  if (!(stepM > 0) || maxSteps < 1) return null;

  const usedDem = typeof opts.sampleElevationM === 'function';
  const sample = (p: [number, number]): number =>
    usedDem
      ? opts.sampleElevationM!(p)
      : estimateElevationM(p, box, minElevationM, maxElevationM);

  // Downhill metre-space direction = negated uphill unit vector.
  const dxM = -box.uphillUnit[0] * stepM;
  const dyM = -box.uphillUnit[1] * stepM;
  const dLng = dxM / box.mPerDegRef.mPerLng;
  const dLat = dyM / box.mPerDegRef.mPerLat;
  const stepLenM = Math.hypot(dxM, dyM);

  const coords: number[][] = [[start[0], start[1]]];
  const elevations: number[] = [sample(start)];

  for (let i = 0; i < maxSteps; i++) {
    const prev = coords[coords.length - 1]!;
    const next: [number, number] = [prev[0]! + dLng, prev[1]! + dLat];
    const nextElev = sample(next);
    // Keep only descending steps — guarantees a monotonic downslope path.
    if (nextElev >= elevations[elevations.length - 1]!) break;
    coords.push([next[0], next[1]]);
    elevations.push(nextElev);
  }

  if (coords.length < 2) return null;

  const lengthM = stepLenM * (coords.length - 1);
  const descentM = elevations[0]! - elevations[elevations.length - 1]!;

  return {
    geometry: { type: 'LineString', coordinates: coords },
    elevations,
    lengthM,
    descentM,
    usedDem,
  };
}
