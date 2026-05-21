/**
 * clickDeleteDirectSelect — custom MapboxDraw mode that wraps stock
 * `direct_select` and adds click-to-delete on existing vertices, while
 * preserving drag-to-move and midpoint-click-to-add.
 *
 * Click vs drag arbitration: on mousedown we stash the screen-point of the
 * cursor; on mouseup we compare. If the cursor moved less than
 * `CLICK_PIXEL_THRESHOLD` pixels, the gesture is a click and (if the
 * mousedown was on a vertex) we remove that vertex. Anything larger is
 * treated as a drag and falls through to stock behaviour.
 *
 * Minimum-vertex guard: silently refuses deletes that would drop a polygon
 * ring below 3 unique vertices (4 entries incl. closing) or a line below 2.
 */

import MapboxDraw from '@mapbox/mapbox-gl-draw';

const CLICK_PIXEL_THRESHOLD = 4;

export const CLICK_DELETE_DIRECT_SELECT = 'click_delete_direct_select';

interface ScreenPoint {
  x: number;
  y: number;
}

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

  onMouseDown(this: any, state: any, e: any) {
    const p = e?.point as ScreenPoint | undefined;
    state._cdDownPoint = p ? { x: p.x, y: p.y } : null;
    return stock.onMouseDown.call(this, state, e);
  },

  onVertex(this: any, state: any, e: any) {
    const path: string | undefined = e?.featureTarget?.properties?.coord_path;
    state._cdVertexCoordPath = path ?? null;
    return stock.onVertex.call(this, state, e);
  },

  onMidpoint(this: any, state: any, e: any) {
    // Midpoint click adds a new vertex (stock behaviour). Disqualify the
    // resulting selectedCoordPath from delete-on-mouseup so the freshly
    // added vertex doesn't get immediately removed.
    state._cdVertexCoordPath = null;
    return stock.onMidpoint.call(this, state, e);
  },

  onMouseUp(this: any, state: any, e: any) {
    const result = stock.onMouseUp.call(this, state, e);

    const down: ScreenPoint | null = state._cdDownPoint ?? null;
    const candidatePath: string | null = state._cdVertexCoordPath ?? null;
    state._cdDownPoint = null;
    state._cdVertexCoordPath = null;

    if (!down || !candidatePath) return result;

    const up = e?.point as ScreenPoint | undefined;
    if (!up) return result;
    const dx = up.x - down.x;
    const dy = up.y - down.y;
    if (Math.hypot(dx, dy) > CLICK_PIXEL_THRESHOLD) return result;

    const feature = state.feature;
    if (!feature || typeof feature.removeCoordinate !== 'function') return result;
    if (!canRemoveCoordinate(feature, candidatePath)) return result;

    feature.removeCoordinate(candidatePath);
    state.selectedCoordPaths = [];

    // Emit through the public event surface — SharedVertexEditHandler's
    // `draw.update` listener will persist the new geometry to the store.
    this.map.fire('draw.update', {
      action: 'change_coordinates',
      features: [feature.toGeoJSON()],
    });

    return result;
  },
};
