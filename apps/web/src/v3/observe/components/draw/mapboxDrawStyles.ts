/**
 * MapLibre-compatible style stack for `@mapbox/mapbox-gl-draw`.
 *
 * `@mapbox/mapbox-gl-draw@1.4.x` ships default styles tuned for
 * mapbox-gl-js. Several `paint.line-dasharray` definitions use the
 * older expression form with raw numbers in positions MapLibre's
 * post-1.x style validator now requires to be wrapped as
 * `["literal", [...]]`. When the defaults are passed through
 * `map.addControl(draw)` on a MapLibre map, MapLibre rejects the
 * offending layer and the draw control mounts in a partial state —
 * the in-progress polygon may render transiently, but `draw.create`
 * does not propagate cleanly to the listener. Net effect: the user
 * draws a polygon, no `onCreate` handler runs, no store write
 * happens, and the geometry is gone on F5.
 *
 * This module-level constant is a minimal, plain-paint style stack
 * ported verbatim from the legacy working surface
 * (`apps/web/src/features/map/hooks/useMaplibre.ts:50-101`). Every
 * `paint` value is a plain literal — no `["match", …]` / `["case", …]`
 * expression wrappers — which is what makes it pass the MapLibre
 * validator.
 *
 * Pass as the `styles` option whenever a fresh `MapboxDraw` is
 * instantiated under a MapLibre map.
 *
 * See plan file `develop-a-version-of-hidden-truffle.md` ADDENDUM 4
 * for the full root-cause analysis.
 */

import { map as mapTokens, group, neutral } from '../../../../lib/tokens.js';
import { GROUND_COVER_COLORS } from '../../../../store/zoneStore.js';

/**
 * Representative in-progress preview color per polygon tool kind, so the
 * rubber-band polygon reads as the thing being drawn before it's committed.
 * Values mirror the committed layer tables (ground cover for vegetation,
 * paddock for pasture, annual-row for crop) so preview ≈ committed. Kinds
 * absent here keep the universal `mapTokens.boundary` default.
 */
export const DRAW_PREVIEW_COLORS: Record<string, string> = {
  vegetation: GROUND_COVER_COLORS['sparse-grasses'],
  pasture: '#b58550',
  conventionalCrop: '#a8854a',
};

export const MAPLIBRE_DRAW_STYLES = [
  {
    id: 'gl-draw-polygon-fill',
    type: 'fill',
    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: {
      'fill-color': mapTokens.boundary,
      'fill-outline-color': neutral[800],
      'fill-opacity': 0.25,
    },
  },
  {
    id: 'gl-draw-polygon-stroke',
    type: 'line',
    filter: ['all', ['==', '$type', 'Polygon']],
    paint: {
      'line-color': neutral[800],
      'line-width': 2,
    },
  },
  {
    id: 'gl-draw-line',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
    paint: {
      'line-color': group.livestock,
      'line-width': 3,
      'line-dasharray': [2, 1],
    },
  },
  {
    id: 'gl-draw-line-static',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString'], ['==', 'mode', 'static']],
    paint: {
      'line-color': mapTokens.boundary,
      'line-width': 2,
    },
  },
  {
    // Restrict the generic point layer so it doesn't also paint the
    // supplementary vertex/midpoint points emitted by direct_select —
    // those get their own dedicated layers below for finer styling.
    id: 'gl-draw-point',
    type: 'circle',
    filter: [
      'all',
      ['==', '$type', 'Point'],
      ['!=', 'meta', 'vertex'],
      ['!=', 'meta', 'midpoint'],
    ],
    paint: {
      'circle-radius': 5,
      'circle-color': mapTokens.boundary,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
    },
  },
  {
    // All non-active vertex handles for a feature in direct_select.
    // Without this layer the inactive vertices would be invisible after a
    // click-delete (when `selectedCoordPaths` is reduced to a single
    // neighbor), making vertex-edit feel "lost." Keep it visible so the
    // user can pick another vertex immediately.
    id: 'gl-draw-polygon-and-line-vertex-inactive',
    type: 'circle',
    filter: [
      'all',
      ['==', '$type', 'Point'],
      ['==', 'meta', 'vertex'],
      ['!=', 'mode', 'static'],
    ],
    paint: {
      'circle-radius': 4,
      'circle-color': '#fff',
      'circle-stroke-width': 2,
      'circle-stroke-color': neutral[800],
    },
  },
  {
    // The currently-armed vertex (the one in `selectedCoordPaths`).
    // Slightly larger + accent-coloured so the user can tell which
    // vertex the next click-delete will target.
    id: 'gl-draw-polygon-and-line-vertex-active',
    type: 'circle',
    filter: [
      'all',
      ['==', '$type', 'Point'],
      ['==', 'meta', 'vertex'],
      ['==', 'active', 'true'],
    ],
    paint: {
      'circle-radius': 6,
      'circle-color': mapTokens.boundary,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
    },
  },
  {
    // Midpoint dots — click one to insert a new vertex. Keep them
    // visually distinct from real vertices (smaller, hollow) so users
    // don't confuse "add here" with "delete this".
    id: 'gl-draw-polygon-and-line-midpoint',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
    paint: {
      'circle-radius': 3,
      'circle-color': 'rgba(255,255,255,0.85)',
      'circle-stroke-width': 1,
      'circle-stroke-color': neutral[800],
    },
  },
];
