/**
 * snapPoint — single deterministic snap pass at drop time.
 *
 * Phase 5.1 PR3 (per `wiki/decisions/2026-04-30-v3-design-canvas-scoping.md`
 * §3 "Snapping"). Given a click point, snap to the nearest target within
 * 8 px screen-space, walking targets in priority order:
 *
 *   1. Boundary edge (project to nearest point on segment).
 *   2. Existing structure footprint corner.
 *   3. Existing paddock corner.
 *
 * Snap radius is in *screen pixels*, not metres — same threshold reads
 * sensibly at z12 and z18 because the projection collapses both into
 * pixel space. No grid snap (deliberately — see ADR §3 deferral note).
 *
 * Pure function over `maplibregl.Map.project` / `unproject`; no state.
 */

import type { maplibregl } from "../../lib/maplibre.js";

const SNAP_RADIUS_PX = 8;

type LngLat = [number, number];

interface PixelPoint { x: number; y: number }

function project(map: maplibregl.Map, p: LngLat): PixelPoint {
  const px = map.project(p);
  return { x: px.x, y: px.y };
}

function pxDist(a: PixelPoint, b: PixelPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Project click pixel onto the nearest segment in pixel space. */
function snapToSegment(
  map: maplibregl.Map,
  click: PixelPoint,
  a: LngLat,
  b: LngLat,
): { snapped: LngLat; dist: number } | null {
  const pa = project(map, a);
  const pb = project(map, b);
  const dx = pb.x - pa.x;
  const dy = pb.y - pa.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    const d = pxDist(click, pa);
    return { snapped: a, dist: d };
  }
  let t = ((click.x - pa.x) * dx + (click.y - pa.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const sx = pa.x + t * dx;
  const sy = pa.y + t * dy;
  const dist = pxDist(click, { x: sx, y: sy });
  const ll = map.unproject([sx, sy]);
  return { snapped: [ll.lng, ll.lat], dist };
}

export interface SnapTargets {
  boundary?: GeoJSON.Polygon;
  structureCorners?: LngLat[];
  paddockCorners?: LngLat[];
  /**
   * Draw-time targets (consumed by `snapDrawPoint`, not the legacy `snapPoint`).
   * `lines` = each fence/paddock/boundary ring as an ordered coord list; every
   * adjacent pair is a snappable edge. `vertices` = all corners/endpoints of
   * those targets, snapped to first (vertices beat edges within the radius).
   */
  lines?: LngLat[][];
  vertices?: LngLat[];
}

export interface SnapResult {
  position: LngLat;
  snappedTo: "boundary" | "structure" | "paddock" | null;
}

export interface DrawSnapResult {
  position: LngLat;
  snappedTo: "vertex" | "line" | null;
}

export function snapPoint(
  map: maplibregl.Map,
  raw: LngLat,
  targets: SnapTargets,
): SnapResult {
  const clickPx = project(map, raw);

  // Priority 1 — boundary edges
  if (targets.boundary) {
    const ring = targets.boundary.coordinates[0];
    if (ring && ring.length >= 2) {
      let best: { snapped: LngLat; dist: number } | null = null;
      for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i] as LngLat | undefined;
        const b = ring[i + 1] as LngLat | undefined;
        if (!a || !b) continue;
        const r = snapToSegment(map, clickPx, a, b);
        if (r && (!best || r.dist < best.dist)) best = r;
      }
      if (best && best.dist <= SNAP_RADIUS_PX) {
        return { position: best.snapped, snappedTo: "boundary" };
      }
    }
  }

  // Priority 2 — structure corners
  const struct = nearestCorner(map, clickPx, targets.structureCorners);
  if (struct) return { position: struct, snappedTo: "structure" };

  // Priority 3 — paddock corners
  const pad = nearestCorner(map, clickPx, targets.paddockCorners);
  if (pad) return { position: pad, snappedTo: "paddock" };

  return { position: raw, snappedTo: null };
}

function nearestCorner(
  map: maplibregl.Map,
  clickPx: PixelPoint,
  corners: LngLat[] | undefined,
): LngLat | null {
  if (!corners || corners.length === 0) return null;
  let bestDist = Infinity;
  let bestLngLat: LngLat | null = null;
  for (const c of corners) {
    const d = pxDist(clickPx, project(map, c));
    if (d < bestDist) {
      bestDist = d;
      bestLngLat = c;
    }
  }
  if (bestLngLat && bestDist <= SNAP_RADIUS_PX) return bestLngLat;
  return null;
}

/**
 * snapDrawPoint -- draw-time snap pass for live MapboxDraw sessions.
 *
 * Additive sibling of `snapPoint` (which serves toolbox placement and is left
 * untouched). Given a click `raw`, snaps to the nearest `targets` feature within
 * the same 8 px screen radius, in priority order:
 *
 *   1. Vertices (existing corners / endpoints) -- via `nearestCorner`.
 *   2. Edges (nearest point along any segment of `lines`) -- via `snapToSegment`.
 *
 * Vertices win over edges when both are in range so drawing locks cleanly onto
 * shared corners. Returns `{ position, snappedTo }`; `position` is `raw`
 * unchanged when nothing is in range (`snappedTo: null`).
 */
export function snapDrawPoint(
  map: maplibregl.Map,
  raw: LngLat,
  targets: SnapTargets,
): DrawSnapResult {
  const clickPx = project(map, raw);

  // Priority 1 -- vertices (corners / endpoints)
  const vertex = nearestCorner(map, clickPx, targets.vertices);
  if (vertex) return { position: vertex, snappedTo: "vertex" };

  // Priority 2 -- edges (nearest point on any line segment)
  if (targets.lines && targets.lines.length > 0) {
    let best: { snapped: LngLat; dist: number } | null = null;
    for (const line of targets.lines) {
      if (!line || line.length < 2) continue;
      for (let i = 0; i < line.length - 1; i++) {
        const a = line[i] as LngLat | undefined;
        const b = line[i + 1] as LngLat | undefined;
        if (!a || !b) continue;
        const r = snapToSegment(map, clickPx, a, b);
        if (r && (!best || r.dist < best.dist)) best = r;
      }
    }
    if (best && best.dist <= SNAP_RADIUS_PX) {
      return { position: best.snapped, snappedTo: "line" };
    }
  }

  return { position: raw, snappedTo: null };
}
