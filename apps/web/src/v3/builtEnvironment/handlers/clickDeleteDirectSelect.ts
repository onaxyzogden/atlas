/**
 * clickDeleteDirectSelect — custom MapboxDraw mode that wraps stock
 * `direct_select` and adds click-to-delete on existing vertices, while
 * preserving drag-to-move and midpoint-click-to-add.
 *
 * Click vs drag arbitration is handled by MapboxDraw's own events.js: it
 * fires `mode.onClick` for gestures under its 4 px / 500 ms threshold and
 * `mode.onMouseUp` for everything larger. So we attach the deletion to
 * `onClick` (NOT `onMouseUp` — that branch only sees drag releases) and
 * gate on the vertex coord-path stashed during the mousedown→onVertex
 * dispatch.
 *
 * Minimum-vertex guard: silently refuses deletes that would drop a polygon
 * ring below 3 unique vertices (4 entries incl. closing) or a line below 2.
 */

import MapboxDraw from '@mapbox/mapbox-gl-draw';

export const CLICK_DELETE_DIRECT_SELECT = 'click_delete_direct_select';

// MapboxDraw doesn't export rich types for mode internals; the state object
// is duck-typed across the library. We keep `any` confined to this file.
/* eslint-disable @typescript-eslint/no-explicit-any */

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const stock: any = (MapboxDraw as any).modes.direct_select;

function canRemoveCoordinate(feature: any, coordPath: string): boolean {
  const geom = feature?.toGeoJSON?.()?.geometry;
  if (!geom) return false;
  if (geom.type === 'Polygon') {
    const ringIdx = Number(coordPath.split('.')[0] ?? 0);
    const ring = geom.coordinates[ringIdx];
    return Array.isArray(ring) && ring.length > 4;
  }
  if (geom.type === 'LineString') {
    return Array.isArray(geom.coordinates) && geom.coordinates.length > 2;
  }
  return false;
}

/**
 * After deleting the vertex at `coordPath`, compute a sensible neighbor
 * coord-path so vertex-edit stays armed with handles visible on the same
 * feature. Returns null if no neighbor exists (shouldn't happen given the
 * min-vertex guard above already ran).
 */
function neighborCoordPath(feature: any, deletedPath: string): string | null {
  const geom = feature?.toGeoJSON?.()?.geometry;
  if (!geom) return null;
  if (geom.type === 'Polygon') {
    const parts = deletedPath.split('.');
    const ringIdx = Number(parts[0] ?? 0);
    const vertIdx = Number(parts[1] ?? 0);
    const ring = geom.coordinates[ringIdx];
    if (!Array.isArray(ring) || ring.length < 4) return null;
    // Polygon ring is closed (first == last). Unique vertex count is
    // ring.length - 1; valid indices are 0..(ring.length-2).
    const lastUnique = ring.length - 2;
    const prev = Math.max(0, Math.min(vertIdx - 1, lastUnique));
    return `${ringIdx}.${prev}`;
  }
  if (geom.type === 'LineString') {
    const vertIdx = Number(deletedPath);
    const coords = geom.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const prev = Math.max(0, Math.min(vertIdx - 1, coords.length - 1));
    return String(prev);
  }
  return null;
}

export const clickDeleteDirectSelect = {
  ...stock,

  // Reset the per-gesture vertex hint on every mousedown so a body-click
  // immediately following a vertex-click can't accidentally re-trigger
  // deletion against stale state.
  onMouseDown(this: any, state: any, e: any) {
    state._cdVertexCoordPath = null;
    return stock.onMouseDown.call(this, state, e);
  },

  onVertex(this: any, state: any, e: any) {
    const path: string | undefined = e?.featureTarget?.properties?.coord_path;
    state._cdVertexCoordPath = path ?? null;
    return stock.onVertex.call(this, state, e);
  },

  onMidpoint(this: any, state: any, e: any) {
    // Midpoint click adds a new vertex (stock behaviour). Disqualify the
    // resulting selectedCoordPath from delete-on-click so the freshly
    // added vertex doesn't get immediately removed.
    state._cdVertexCoordPath = null;
    return stock.onMidpoint.call(this, state, e);
  },

  onClick(this: any, state: any, e: any) {
    const candidatePath: string | null = state._cdVertexCoordPath ?? null;
    state._cdVertexCoordPath = null;

    if (!candidatePath) {
      return stock.onClick?.call(this, state, e);
    }

    const feature = state.feature;
    if (!feature || typeof feature.removeCoordinate !== 'function') {
      return stock.onClick?.call(this, state, e);
    }
    if (!canRemoveCoordinate(feature, candidatePath)) {
      // Silent gate: triangle / 2-vertex line stays put. Don't fall through
      // to stock onClick — that would clear selectedCoordPaths via
      // clickActiveFeature and drop the user out of vertex-edit.
      return;
    }

    feature.removeCoordinate(candidatePath);

    // Arm a neighbor vertex so handles stay visible and the user can
    // keep click-deleting on the same feature without re-entering
    // vertex-edit. Fall back to clearing if no neighbor (shouldn't
    // happen — guard above already ensured at least one remains).
    const neighbor = neighborCoordPath(feature, candidatePath);
    state.selectedCoordPaths = neighbor ? [neighbor] : [];

    // Emit through the public event surface — SharedVertexEditHandler's
    // `draw.update` listener will persist the new geometry to the store.
    this.map.fire('draw.update', {
      action: 'change_coordinates',
      features: [feature.toGeoJSON()],
    });
  },
};
