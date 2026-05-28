// supersession.ts
//
// Pure helpers for the OLOS Observe Dashboard supersession model
// (Dashboard Spec §4.3). A new data point automatically supersedes any
// active same-domain data point captured within `proximityMeters` of
// its location. The "Not a replacement" CTA round-trips both points
// back to active.
//
// Kept I/O-free so the engine can be unit-tested without a store + so
// the same logic can run on the server when the supersession backend
// arrives (Phase 4 locked decision: local-first; server endpoint
// deferred). The data point store wraps these helpers in mutations.

import type { ObserveDataPoint } from '../schemas/observe/dataPoint.schema.js';
import type { SupersessionDecision } from '../schemas/observe/supersession.schema.js';

/** Default proximity radius for same-domain supersession clustering.
 *  Per Dashboard Spec §4.3 — overridable per-domain via
 *  `OBSERVE_DOMAIN_CATALOG[d].supersessionProximityMeters`. */
export const DEFAULT_SUPERSESSION_PROXIMITY_METERS = 10;

const EARTH_RADIUS_METERS = 6_371_000;

type LngLat = readonly [number, number];

function readPoint(point: ObserveDataPoint): LngLat | null {
  const geom = point.locationGeometry;
  if (!geom || geom.type !== 'Point') return null;
  const coords = (geom as { coordinates: unknown }).coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = coords[0];
  const lat = coords[1];
  if (typeof lng !== 'number' || typeof lat !== 'number') return null;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
}

/** Great-circle distance in metres between two `[lng, lat]` pairs. */
export function haversineMeters(a: LngLat, b: LngLat): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aTerm =
    sinDLat * sinDLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(aTerm), Math.sqrt(1 - aTerm));
  return EARTH_RADIUS_METERS * c;
}

export interface ComputeSupersessionOptions {
  /** Proximity radius (metres). Defaults to
   *  DEFAULT_SUPERSESSION_PROXIMITY_METERS (10). */
  proximityMeters?: number;
}

/**
 * Decide which existing active data points the freshly-recorded point
 * supersedes. Same-domain only; pre-superseded rows are skipped (we
 * never reach back and chain through them). A point without a Point
 * geometry never supersedes anything — a missing location is read as
 * "intentionally undecided," not "same place as the last one."
 */
export function computeSupersession(
  newPoint: ObserveDataPoint,
  existingPoints: readonly ObserveDataPoint[],
  opts: ComputeSupersessionOptions = {},
): SupersessionDecision {
  const radius = opts.proximityMeters ?? DEFAULT_SUPERSESSION_PROXIMITY_METERS;
  const supersededPointIds: string[] = [];
  const newLoc = readPoint(newPoint);
  if (!newLoc) {
    return { newPointId: newPoint.id, supersededPointIds };
  }
  for (const candidate of existingPoints) {
    if (candidate.id === newPoint.id) continue;
    if (candidate.isSuperseded) continue;
    if (candidate.domainId !== newPoint.domainId) continue;
    const candLoc = readPoint(candidate);
    if (!candLoc) continue;
    if (haversineMeters(newLoc, candLoc) <= radius) {
      supersededPointIds.push(candidate.id);
    }
  }
  return { newPointId: newPoint.id, supersededPointIds };
}

export interface RestorePatch {
  id: string;
  isSuperseded: false;
  supersededBy: null;
}

/**
 * "Not a replacement" — restore both the previously-superseded point
 * AND the point that superseded it so the steward gets two co-existing
 * active rows. The caller (the data point store) applies the patches.
 */
export function restoreFromSupersession(
  supersededPoint: ObserveDataPoint,
  supersedingPoint: ObserveDataPoint,
): { restored: RestorePatch[] } {
  return {
    restored: [
      {
        id: supersededPoint.id,
        isSuperseded: false,
        supersededBy: null,
      },
      {
        id: supersedingPoint.id,
        isSuperseded: false,
        supersededBy: null,
      },
    ],
  };
}
