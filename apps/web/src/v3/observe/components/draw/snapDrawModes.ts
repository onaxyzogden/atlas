/**
 * snapDrawModes — custom MapboxDraw draw modes that snap clicked vertices to
 * existing features during a live draw session.
 *
 * Mirrors the `clickDeleteDirectSelect` precedent (a `{ ...stock, ...overrides }`
 * mode injected via `modes: { ...MapboxDraw.modes, [name]: mode }`). Each mode
 * wraps stock `draw_line_string` / `draw_polygon` and rewrites the incoming
 * pointer `e.lngLat` to a snapped position (via the pure `snapDrawPoint` helper)
 * before delegating to the stock handler. So both the committed vertex (onClick /
 * onTap) and the rubber-band preview (onMouseMove) lock onto existing
 * vertices/edges within the 8 px snap radius.
 *
 * Snap targets are captured once at mode start: `changeMode(mode, { snapTargets })`
 * → `onSetup(opts)` stashes `state.snapTargets`. Targets = existing features at
 * draw time, which is sufficient for the "snap to existing" scope. When no target
 * is in range `snapDrawPoint` returns the raw point unchanged, so draw behaviour
 * away from features is byte-for-byte the stock behaviour.
 *
 * See ADR wiki/decisions/2026-06-04-atlas-act-adopt-and-draw-snapping.
 */

import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { snapDrawPoint, type SnapTargets } from '../../../lib/snapPoint.js';

export const SNAP_DRAW_LINE_STRING = 'snap_draw_line_string';
export const SNAP_DRAW_POLYGON = 'snap_draw_polygon';

// MapboxDraw doesn't export rich types for mode internals; the state object and
// event payloads are duck-typed across the library. Keep `any` confined here.
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Rewrite `e.lngLat` in place to the snapped position when a target is in range.
 * No-op when there are no targets, no pointer coord, or nothing within radius —
 * leaving the stock handler to see the raw click.
 */
function applySnap(this: any, state: any, e: any): void {
  const targets: SnapTargets | undefined | null = state?.snapTargets;
  if (!targets || !e?.lngLat) return;
  const map = this.map;
  if (!map) return;
  const snapped = snapDrawPoint(map, [e.lngLat.lng, e.lngLat.lat], targets);
  if (snapped.snappedTo) {
    // Stock draw modes read `[e.lngLat.lng, e.lngLat.lat]`, so a plain object
    // is sufficient (no need to construct a maplibre LngLat instance).
    e.lngLat = { lng: snapped.position[0], lat: snapped.position[1] };
  }
}

function makeSnapMode(stock: any): any {
  return {
    ...stock,

    onSetup(this: any, opts: any) {
      // Delegate to stock for the normal draft-feature setup, then stash the
      // snap targets handed in via `changeMode(mode, { snapTargets })`.
      const state = stock.onSetup.call(this, opts ?? {});
      state.snapTargets = opts?.snapTargets ?? null;
      return state;
    },

    onClick(this: any, state: any, e: any) {
      applySnap.call(this, state, e);
      return stock.onClick?.call(this, state, e);
    },

    onMouseMove(this: any, state: any, e: any) {
      applySnap.call(this, state, e);
      return stock.onMouseMove?.call(this, state, e);
    },

    onTap(this: any, state: any, e: any) {
      applySnap.call(this, state, e);
      return stock.onTap?.call(this, state, e);
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const stockLine: any = (MapboxDraw as any).modes.draw_line_string;
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const stockPolygon: any = (MapboxDraw as any).modes.draw_polygon;

export const snapDrawLineString = makeSnapMode(stockLine);
export const snapDrawPolygon = makeSnapMode(stockPolygon);
