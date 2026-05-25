/**
 * socialNodesMath — pure helpers for Rec #6 v1 (Social-node generator).
 *
 * Scholar framing (2026-04-28): "Human movement flows like water, and
 * placing 'nets in the flow' (like benches or public spaces) slows people
 * down to foster necessary community relationships." Holmgren P8 —
 * Integrate rather than segregate; People Care ethic.
 *
 * **What it computes.**
 *   - All pairwise LineString segment intersections.
 *   - Point-in-polygon test against Z1/Z2 zones.
 *   - Latitude-aware planar distance helper to test "covered by a social
 *     element within N metres."
 *
 * Geometry is planar in lat/lng→metres via the same 111320·cos(lat)
 * conversion used in `waterRouterMath.ts` and `EdgeConnectivityCard.tsx`.
 * Mirrors the codebase's per-card pattern (`useDesignMetrics.ts` is
 * file-private; we duplicate locally).
 */

export interface Pt {
  lng: number;
  lat: number;
}

/** Latitude-aware planar distance in metres between two lat/lng points. */
export function distanceM(a: Pt, b: Pt): number {
  const refLat = (a.lat + b.lat) / 2;
  const mPerLat = 111_320;
  const mPerLng = 111_320 * Math.cos((refLat * Math.PI) / 180);
  const dx = (b.lng - a.lng) * mPerLng;
  const dy = (b.lat - a.lat) * mPerLat;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Segment-segment intersection in planar lat/lng. Returns the intersection
 * point or null when the segments are parallel / non-intersecting.
 *
 * Uses the standard 2D parametric form: solve for s, t in
 *   p1 + t·(p2 − p1) = p3 + s·(p4 − p3)
 * and accept only when both lie in [0,1]. Endpoint-touching counts as an
 * intersection (≥ 0, ≤ 1) — two paths meeting at a shared corner is a
 * legitimate social node opportunity.
 */
export function segmentIntersect(
  p1: Pt,
  p2: Pt,
  p3: Pt,
  p4: Pt,
): Pt | null {
  const x1 = p1.lng;
  const y1 = p1.lat;
  const x2 = p2.lng;
  const y2 = p2.lat;
  const x3 = p3.lng;
  const y3 = p3.lat;
  const x4 = p4.lng;
  const y4 = p4.lat;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-15) return null; // parallel or coincident

  const tNum = (x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4);
  const sNum = (x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2);
  const t = tNum / denom;
  const s = sNum / denom;

  if (t < 0 || t > 1 || s < 0 || s > 1) return null;

  return {
    lng: x1 + t * (x2 - x1),
    lat: y1 + t * (y2 - y1),
  };
}

/**
 * Ray-casting point-in-polygon. Accepts a Polygon ring or a MultiPolygon
 * (treats the latter as "in any sub-polygon"). The outer ring is used;
 * holes are not handled because zone polygons are simple.
 */
export function pointInPolygon(
  pt: Pt,
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): boolean {
  if (geom.type === 'Polygon') {
    return pointInRing(pt, geom.coordinates[0] ?? []);
  }
  for (const poly of geom.coordinates) {
    if (pointInRing(pt, poly[0] ?? [])) return true;
  }
  return false;
}

function pointInRing(pt: Pt, ring: number[][]): boolean {
  if (ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const xi = a[0]!;
    const yi = a[1]!;
    const xj = b[0]!;
    const yj = b[1]!;
    const intersect =
      yi > pt.lat !== yj > pt.lat &&
      pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Stable id for an intersection — combines the two contributing element
 * ids (sorted) and the rounded coordinate. Deterministic across renders.
 */
export function intersectionId(
  elIdA: string,
  elIdB: string,
  pt: Pt,
): string {
  const [a, b] = elIdA < elIdB ? [elIdA, elIdB] : [elIdB, elIdA];
  return `${a}__${b}__${pt.lng.toFixed(6)}_${pt.lat.toFixed(6)}`;
}

/** Radius (m) within which a social element "covers" an intersection. */
export const COVERED_RADIUS_M = 12;

export type DensityTier = 'served' | 'partial' | 'unserved';

export function tierForDensity(
  covered: number,
  total: number,
): DensityTier {
  if (total === 0) return 'served'; // vacuously
  const d = covered / total;
  if (d >= 0.66) return 'served';
  if (d >= 0.33) return 'partial';
  return 'unserved';
}

// ---------------------------------------------------------------------------
// computeOpportunities — Rec #6 v2 extraction.
//
// v1 carried this loop inline inside SocialNodesCard. v2 lifts it into the math
// module so it is unit-testable (place/dismiss flows need a deterministic
// opportunity set) and so a future ghost-overlay can share the same source of
// truth. Behaviour is byte-for-byte identical to the v1 card loop, plus a new
// `dismissed` filter: any opportunity whose stable id is in the dismissed set
// is dropped from the result (the steward has waved it off this session).
// ---------------------------------------------------------------------------

/** A footpath candidate — a LineString's id + its raw [lng,lat] coordinates. */
export interface SocialPath {
  id: string;
  coords: number[][];
}

/** A Z1/Z2 zone the rec treats as the high-traffic, inhabited band. */
export interface SocialZone {
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  permacultureZone: 1 | 2;
}

/** A placed social-element point (bench, prayer pavilion, …) that can cover. */
export interface SocialElementPt {
  id: string;
  kind: string;
  label: string;
  pt: Pt;
}

export interface SocialOpportunity {
  id: string;
  pt: Pt;
  zoneLevel: 1 | 2;
  /** Nearest covering social element, if any within COVERED_RADIUS_M. */
  cover: { kind: string; label: string; distanceM: number } | null;
}

/**
 * Compute social-node opportunities: pairwise path-segment intersections that
 * fall inside a Z1/Z2 zone, each tagged with its nearest covering social
 * element (within COVERED_RADIUS_M) or `null` when uncovered. Opportunities in
 * `dismissed` are filtered out. Sorted uncovered-first, then Z1 before Z2.
 */
export function computeOpportunities(
  paths: SocialPath[],
  zones: SocialZone[],
  socials: SocialElementPt[],
  dismissed?: ReadonlySet<string>,
): SocialOpportunity[] {
  if (paths.length < 2 || zones.length === 0) return [];
  const seen = new Map<string, SocialOpportunity>();

  for (let i = 0; i < paths.length; i++) {
    const a = paths[i]!;
    const csA = a.coords;
    if (!csA || csA.length < 2) continue;
    for (let j = i + 1; j < paths.length; j++) {
      const b = paths[j]!;
      const csB = b.coords;
      if (!csB || csB.length < 2) continue;
      for (let m = 0; m < csA.length - 1; m++) {
        const p1: Pt = { lng: csA[m]![0]!, lat: csA[m]![1]! };
        const p2: Pt = { lng: csA[m + 1]![0]!, lat: csA[m + 1]![1]! };
        for (let n = 0; n < csB.length - 1; n++) {
          const p3: Pt = { lng: csB[n]![0]!, lat: csB[n]![1]! };
          const p4: Pt = { lng: csB[n + 1]![0]!, lat: csB[n + 1]![1]! };
          const hit = segmentIntersect(p1, p2, p3, p4);
          if (!hit) continue;
          let zoneLevel: 1 | 2 | null = null;
          for (const z of zones) {
            if (pointInPolygon(hit, z.geometry)) {
              zoneLevel = z.permacultureZone;
              break;
            }
          }
          if (zoneLevel === null) continue;
          const id = intersectionId(a.id, b.id, hit);
          if (seen.has(id)) continue;
          if (dismissed?.has(id)) continue;
          let cover: SocialOpportunity['cover'] = null;
          let bestD = Infinity;
          for (const s of socials) {
            const d = distanceM(hit, s.pt);
            if (d < bestD) {
              bestD = d;
              cover =
                d <= COVERED_RADIUS_M
                  ? { kind: s.kind, label: s.label, distanceM: d }
                  : null;
            }
          }
          seen.set(id, { id, pt: hit, zoneLevel, cover });
        }
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) => {
    const aCov = a.cover ? 1 : 0;
    const bCov = b.cover ? 1 : 0;
    if (aCov !== bCov) return aCov - bCov;
    return a.zoneLevel - b.zoneLevel;
  });
}
