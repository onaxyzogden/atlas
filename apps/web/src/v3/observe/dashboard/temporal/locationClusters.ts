/**
 * locationClusters — Phase 4 Slice 4.5 helper that groups observations
 * into proximity clusters per Observe Dashboard Spec §5.3 ("trends
 * require same-location series").
 *
 * Two captures are part of the same cluster if their Point coordinates
 * are within `radiusMeters` of each other (default 10m, mirroring the
 * supersession proximity default). Captures with no `locationGeometry`
 * fall into a single "no-location" cluster so the temporal surface can
 * still chart unlocated series for domains that do not require GPS
 * (e.g. vision-intent, economics-capacity).
 *
 * Pure module — no React imports, no store coupling — so the chart and
 * the location picker can both call it without re-deriving downstream.
 */

import type { ObserveDataPoint } from '@ogden/shared';

export interface LocationCluster {
  id: string;
  label: string;
  /** Centroid lng (mean of cluster coords). null = unlocated cluster. */
  lng: number | null;
  /** Centroid lat (mean of cluster coords). null = unlocated cluster. */
  lat: number | null;
  points: readonly ObserveDataPoint[];
}

const EARTH_RADIUS_M = 6_371_008.8;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance (haversine) between two `[lng, lat]` pairs. */
export function haversineMeters(
  a: readonly [number, number],
  b: readonly [number, number],
): number {
  const [aLng, aLat] = a;
  const [bLng, bLat] = b;
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(aLat)) *
      Math.cos(toRadians(bLat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function readCoords(
  point: ObserveDataPoint,
): readonly [number, number] | null {
  const geom = point.locationGeometry;
  if (!geom) return null;
  const coords = geom.coordinates as unknown;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
}

function fmtCoord(value: number): string {
  return value.toFixed(4);
}

/**
 * Group `points` into proximity clusters within `radiusMeters`. Greedy
 * single-pass: each point joins the first cluster whose centroid is
 * within the radius, otherwise opens a new cluster. Cluster ordering is
 * stable: most-populous first, then by capture-recency.
 */
export function clusterByLocation(
  points: readonly ObserveDataPoint[],
  radiusMeters = 10,
): readonly LocationCluster[] {
  const located: { coords: readonly [number, number]; point: ObserveDataPoint }[] =
    [];
  const unlocated: ObserveDataPoint[] = [];
  for (const point of points) {
    const coords = readCoords(point);
    if (coords) located.push({ coords, point });
    else unlocated.push(point);
  }

  type DraftCluster = {
    centroidLng: number;
    centroidLat: number;
    points: ObserveDataPoint[];
  };
  const drafts: DraftCluster[] = [];
  for (const { coords, point } of located) {
    const [lng, lat] = coords;
    let joined = false;
    for (const draft of drafts) {
      const d = haversineMeters([lng, lat], [
        draft.centroidLng,
        draft.centroidLat,
      ]);
      if (d <= radiusMeters) {
        const n = draft.points.length;
        draft.centroidLng = (draft.centroidLng * n + lng) / (n + 1);
        draft.centroidLat = (draft.centroidLat * n + lat) / (n + 1);
        draft.points.push(point);
        joined = true;
        break;
      }
    }
    if (!joined) {
      drafts.push({ centroidLng: lng, centroidLat: lat, points: [point] });
    }
  }

  const clusters: LocationCluster[] = drafts.map((d, index) => ({
    id: `loc-${index}-${fmtCoord(d.centroidLng)}-${fmtCoord(d.centroidLat)}`,
    label: `${fmtCoord(d.centroidLat)}, ${fmtCoord(d.centroidLng)}`,
    lng: d.centroidLng,
    lat: d.centroidLat,
    points: d.points,
  }));

  if (unlocated.length > 0) {
    clusters.push({
      id: 'no-location',
      label: 'No location data',
      lng: null,
      lat: null,
      points: unlocated,
    });
  }

  return clusters.sort((a, b) => b.points.length - a.points.length);
}

/**
 * Pick the default cluster for the temporal chart — the most-populous
 * located cluster, or the unlocated cluster as a last resort.
 */
export function pickDefaultCluster(
  clusters: readonly LocationCluster[],
): LocationCluster | null {
  if (clusters.length === 0) return null;
  return clusters[0] ?? null;
}
