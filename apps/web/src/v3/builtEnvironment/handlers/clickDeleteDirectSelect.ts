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
    state.selectedCoordPaths = [];

    // Emit through the public event surface — SharedVertexEditHandler's
    // `draw.update` listener will persist the new geometry to the store.
    this.map.fire('draw.update', {
      action: 'change_coordinates',
      features: [feature.toGeoJSON()],
    });
  },
};
