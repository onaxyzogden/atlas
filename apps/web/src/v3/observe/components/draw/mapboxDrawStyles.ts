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

import { map as mapTokens, group, earth } from '../../../../lib/tokens.js';
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
      'fill-outline-color': earth[800],
      'fill-opacity': 0.25,
    },
  },
  {
    id: 'gl-draw-polygon-stroke',
    type: 'line',
    filter: ['all', ['==', '$type', 'Polygon']],
    paint: {
      'line-color': earth[800],
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
    id: 'gl-draw-point',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point']],
    paint: {
      'circle-radius': 5,
      'circle-color': mapTokens.boundary,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
    },
  },
];
