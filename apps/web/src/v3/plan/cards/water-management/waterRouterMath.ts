/**
 * waterRouterMath — pure helpers for Rec #3 v1 (Highest-potential water router).
 *
 * Scholar framing (2026-04-28): "Water represents potential energy, and the
 * primary rule of permaculture water design is to keep water in its place of
 * highest potential (up high) so gravity can do the work."
 *
 * **v1 elevation model — aspect-projected heuristic.**
 *
 * Atlas does not currently expose a per-point DEM sampler. What it has:
 *   - `siteDataStore` elevation summary `{ minM, maxM, predominantAspect }`
 *     (site-wide scalars).
 *   - `topographyStore` per-transect `elevationProfileM[]` (only along
 *     stewarded A-B transects).
 *
 * v1 leans on the aspect + min/max heuristic: project each candidate
 * coordinate onto the uphill axis (predominant-aspect bearing rotated 180°)
 * within the parcel's bbox, normalise to `t ∈ [0,1]`, and estimate
 * `elev(c) = minM + t · (maxM − minM)`. This is the standard fallback used
 * elsewhere in the codebase (e.g. MicroclimatePocketCard's archetype
 * placement) and matches the granularity of every other elevation-aware
 * card in the Plan stage today.
 *
 * The math util's `estimateElevationM` signature is the v2 swap point —
 * replacing it with a true Mapbox `queryTerrainElevation` or a Fastify
 * raster route requires no card-side changes.
 *
 * Aspect convention: compass-bearing degrees (N=0, going clockwise). Aspect
 * points **downhill** (USDA / permaculture convention). Uphill bearing is
 * `aspect + 180` modulo 360.
 *
 * **v2 additions (2026-05-25).** The card was textual-only in v1. v2 lifts the
 * element-row computation out of the card into this module so the card *and*
 * the new `PlanWaterRouterOverlay` share one source of truth (mirrors how
 * socialNodesMath feeds both the card and SocialOpportunityLayer). New exports:
 * `WATER_HARVEST_KINDS`, `WATER_KIND_LABEL`, the `WaterElementRow` interface,
 * `describeWaterElement`, `computeWaterRows`, and `translateGeometry` (the pure
 * geometry shift behind the one-click "move to suggested catchment"). All
 * additive — `estimateElevationM` remains the single v2-DEM swap point.
 */

import type { DesignElement } from '../../../../store/designElementsStore.js';

/** 8-point compass bearings, degrees from N going clockwise. */
const ASPECT_BEARING: Record<string, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};

/**
 * Parse a predominant-aspect string into a downhill bearing in degrees.
 * Returns null when the string is missing, empty, "flat", or unparseable —
 * the caller treats null as "ungradable parcel" and skips flagging.
 */
export function aspectToBearingDeg(aspect: string | null | undefined): number | null {
  if (!aspect) return null;
  const key = aspect.trim().toUpperCase();
  if (key === 'FLAT' || key === 'NONE' || key === '') return null;
  if (key in ASPECT_BEARING) return ASPECT_BEARING[key]!;
  const head = key.slice(0, 2);
  if (head in ASPECT_BEARING) return ASPECT_BEARING[head]!;
  const first = key[0];
  if (first && first in ASPECT_BEARING) return ASPECT_BEARING[first]!;
  return null;
}

/** Latitude-aware metres-per-degree at a reference latitude. */
function mPerDeg(latDeg: number): { mPerLat: number; mPerLng: number } {
  const mPerLat = 111_320;
  const mPerLng = 111_320 * Math.cos((latDeg * Math.PI) / 180);
  return { mPerLat, mPerLng };
}

/** Centroid of a ring (planar, lat/lng → metres). */
function ringCentroid(ring: number[][]): [number, number] {
  if (!ring.length) return [0, 0];
  let lng = 0;
  let lat = 0;
  let n = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const p = ring[i];
    if (!p) continue;
    lng += p[0]!;
    lat += p[1]!;
    n++;
  }
  if (n === 0) return [0, 0];
  return [lng / n, lat / n];
}

export interface ParcelBox {
  /** Bounding-box centroid in lng/lat. */
  centroidLngLat: [number, number];
  /**
   * Half-extents of the parcel along the uphill axis, in metres. Computed by
   * projecting every bbox corner onto the uphill unit vector and taking
   * max/min — gives the parcel's effective "uphill span" L.
   */
  uphillSpanM: number;
  /** Uphill unit vector in metre-space (x = east, y = north). */
  uphillUnit: [number, number];
  /** The latitude-aware metres-per-degree pair used to build the box. */
  mPerDegRef: { mPerLat: number; mPerLng: number };
}

/**
 * Build a `ParcelBox` from a GeoJSON FeatureCollection (Atlas stores parcel
 * boundaries this way on `LocalProject.parcelBoundaryGeojson`). Returns null
 * when the boundary is missing or has no Polygon/MultiPolygon features.
 */
export function buildParcelBox(
  parcel: GeoJSON.FeatureCollection | null | undefined,
  downhillBearingDeg: number,
): ParcelBox | null {
  if (!parcel || !parcel.features?.length) return null;
  // Collect every outer-ring vertex.
  const verts: [number, number][] = [];
  for (const f of parcel.features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') {
      const ring = g.coordinates[0];
      if (ring) for (const p of ring) if (p) verts.push([p[0]!, p[1]!]);
    } else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates) {
        const ring = poly?.[0];
        if (ring) for (const p of ring) if (p) verts.push([p[0]!, p[1]!]);
      }
    }
  }
  if (verts.length < 3) return null;

  // Centroid (mean of ring vertices — good enough for a half-axis projection).
  let cx = 0;
  let cy = 0;
  for (const v of verts) {
    cx += v[0];
    cy += v[1];
  }
  cx /= verts.length;
  cy /= verts.length;
  const centroidLngLat: [number, number] = [cx, cy];

  const refLat = cy;
  const mPerDegRef = mPerDeg(refLat);

  // Uphill bearing in compass degrees → unit vector in metre-space.
  const uphillBearing = ((downhillBearingDeg + 180) % 360 + 360) % 360;
  const rad = (uphillBearing * Math.PI) / 180;
  const ux = Math.sin(rad);
  const uy = Math.cos(rad);

  // Project every vertex onto the uphill axis (centroid-relative, in metres).
  let projMin = Infinity;
  let projMax = -Infinity;
  for (const v of verts) {
    const dx = (v[0] - cx) * mPerDegRef.mPerLng;
    const dy = (v[1] - cy) * mPerDegRef.mPerLat;
    const proj = dx * ux + dy * uy;
    if (proj < projMin) projMin = proj;
    if (proj > projMax) projMax = proj;
  }
  const uphillSpanM = projMax - projMin;
  if (uphillSpanM <= 0) return null;

  return {
    centroidLngLat,
    uphillSpanM,
    uphillUnit: [ux, uy],
    mPerDegRef,
  };
}

/**
 * Project an arbitrary point onto the uphill axis and return a normalised
 * t ∈ [0,1], where 0 = lowest expected elevation in the parcel and 1 = the
 * highest. Returns clamped values for points slightly outside the bbox.
 */
export function uphillT(
  pointLngLat: [number, number],
  box: ParcelBox,
): number {
  const dx = (pointLngLat[0] - box.centroidLngLat[0]) * box.mPerDegRef.mPerLng;
  const dy = (pointLngLat[1] - box.centroidLngLat[1]) * box.mPerDegRef.mPerLat;
  const proj = dx * box.uphillUnit[0] + dy * box.uphillUnit[1];
  // proj is centroid-relative; the bbox spans [-L/2, +L/2] along the axis
  // approximately, so t = (proj + L/2) / L.
  const t = (proj + box.uphillSpanM / 2) / box.uphillSpanM;
  if (!isFinite(t)) return 0.5;
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

/** Estimated elevation (m) at a point, given parcel box and summary range. */
export function estimateElevationM(
  pointLngLat: [number, number],
  box: ParcelBox,
  minElevationM: number,
  maxElevationM: number,
): number {
  const t = uphillT(pointLngLat, box);
  return minElevationM + t * (maxElevationM - minElevationM);
}

/**
 * Suggested coordinate inside the parcel's upper third. v1 returns a point
 * along the uphill axis at t = 5/6 (centroid of the [2/3, 1] band) — does
 * not polygon-clip; the bbox alignment is intentional v1 simplicity.
 */
export function suggestUpperThirdCoord(box: ParcelBox): [number, number] {
  // Distance along uphill axis from centroid for t = 5/6: (5/6 − 1/2) · L = L/3
  const dist = box.uphillSpanM / 3;
  const dxM = dist * box.uphillUnit[0];
  const dyM = dist * box.uphillUnit[1];
  const dLng = dxM / box.mPerDegRef.mPerLng;
  const dLat = dyM / box.mPerDegRef.mPerLat;
  return [
    box.centroidLngLat[0] + dLng,
    box.centroidLngLat[1] + dLat,
  ];
}

/**
 * Potential gravity head lost, in metres. Computed as the elevation
 * difference between the centroid of the parcel's upper third (t = 5/6)
 * and the element's estimated elevation. Floor at 0 — never negative.
 */
export function gravityHeadLostM(
  pointLngLat: [number, number],
  box: ParcelBox,
  minElevationM: number,
  maxElevationM: number,
): number {
  const elemElev = estimateElevationM(pointLngLat, box, minElevationM, maxElevationM);
  const upperThirdElev = minElevationM + (5 / 6) * (maxElevationM - minElevationM);
  return Math.max(0, upperThirdElev - elemElev);
}

export type RouterTier = 'excellent' | 'adequate' | 'low-potential';

/** Tier thresholds — tunable single-line constants, mirroring Rec #4 cuts. */
export const HEAD_LOST_LOW_CUT = 0.5; // metres
export const HEAD_LOST_HIGH_CUT = 2.0; // metres

export function tierForHeadLost(headLostM: number): RouterTier {
  if (headLostM < HEAD_LOST_LOW_CUT) return 'excellent';
  if (headLostM < HEAD_LOST_HIGH_CUT) return 'adequate';
  return 'low-potential';
}

/** Element-centroid helper for Polygon / LineString / Point geometries. */
export function geometryCentroid(
  geom: GeoJSON.Geometry,
): [number, number] | null {
  if (geom.type === 'Point') {
    const c = geom.coordinates;
    if (!c || c.length < 2) return null;
    return [c[0]!, c[1]!];
  }
  if (geom.type === 'LineString') {
    const cs = geom.coordinates;
    if (!cs || cs.length < 2) return null;
    // Midpoint of the polyline by length.
    const mid = Math.floor(cs.length / 2);
    const m = cs[mid];
    return m ? [m[0]!, m[1]!] : null;
  }
  if (geom.type === 'Polygon') {
    const ring = geom.coordinates[0];
    if (!ring || ring.length < 3) return null;
    return ringCentroid(ring);
  }
  return null;
}

/** Element kinds counted as a "water-harvest element" for the router audit. */
export const WATER_HARVEST_KINDS = new Set<string>([
  'water-tank',
  'pond',
  'swale',
]);

export const WATER_KIND_LABEL: Record<string, string> = {
  'water-tank': 'Water tank',
  pond: 'Pond',
  swale: 'Swale',
};

/** One audited water-harvest element with its routing verdict. */
export interface WaterElementRow {
  id: string;
  kind: string;
  label: string;
  centroid: [number, number];
  elevationM: number;
  headLostM: number;
  tier: RouterTier;
  /** Suggested upper-third coordinate — only set for low-potential rows. */
  suggestion: [number, number] | null;
}

/**
 * Describe a single design element as a `WaterElementRow`. Returns null when
 * the geometry has no resolvable centroid. Pure — no store access.
 */
export function describeWaterElement(
  el: DesignElement,
  box: ParcelBox,
  minM: number,
  maxM: number,
): WaterElementRow | null {
  const centroid = geometryCentroid(el.geometry);
  if (!centroid) return null;
  const elevationM = estimateElevationM(centroid, box, minM, maxM);
  const headLostM = gravityHeadLostM(centroid, box, minM, maxM);
  const tier = tierForHeadLost(headLostM);
  return {
    id: el.id,
    kind: el.kind,
    label: el.label || WATER_KIND_LABEL[el.kind] || el.kind,
    centroid,
    elevationM,
    headLostM,
    tier,
    suggestion: tier === 'low-potential' ? suggestUpperThirdCoord(box) : null,
  };
}

/**
 * Compute the worst-first list of water-harvest rows for a project's elements.
 * Filters to `WATER_HARVEST_KINDS`, describes each, and sorts by head lost
 * (most squandered head first). Shared by the card and the map overlay.
 */
export function computeWaterRows(
  elements: readonly DesignElement[],
  box: ParcelBox,
  minM: number,
  maxM: number,
): WaterElementRow[] {
  const out: WaterElementRow[] = [];
  for (const el of elements) {
    if (!WATER_HARVEST_KINDS.has(el.kind)) continue;
    const row = describeWaterElement(el, box, minM, maxM);
    if (row) out.push(row);
  }
  out.sort((a, b) => b.headLostM - a.headLostM);
  return out;
}

/**
 * Translate a geometry by the lng/lat delta `(to − from)`. Pure — returns a
 * fresh geometry of the same type with every coordinate shifted by the same
 * offset, preserving the element's shape and size while relocating it so its
 * reference point lands on `to`. Used by the one-click "move to suggested
 * catchment" action: pass the element's current centroid as `from` and the
 * suggested upper-third coordinate as `to`.
 */
export function translateGeometry<G extends GeoJSON.Geometry>(
  geom: G,
  fromLngLat: [number, number],
  toLngLat: [number, number],
): G {
  const dLng = toLngLat[0] - fromLngLat[0];
  const dLat = toLngLat[1] - fromLngLat[1];
  const shift = (p: number[]): number[] => [
    (p[0] ?? 0) + dLng,
    (p[1] ?? 0) + dLat,
    ...p.slice(2),
  ];
  if (geom.type === 'Point') {
    return { ...geom, coordinates: shift(geom.coordinates) };
  }
  if (geom.type === 'LineString' || geom.type === 'MultiPoint') {
    return { ...geom, coordinates: geom.coordinates.map(shift) };
  }
  if (geom.type === 'Polygon' || geom.type === 'MultiLineString') {
    return {
      ...geom,
      coordinates: geom.coordinates.map((ring) => ring.map(shift)),
    };
  }
  if (geom.type === 'MultiPolygon') {
    return {
      ...geom,
      coordinates: geom.coordinates.map((poly) =>
        poly.map((ring) => ring.map(shift)),
      ),
    };
  }
  return geom;
}
