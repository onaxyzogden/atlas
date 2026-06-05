/**
 * adoptedBasemapWater — discovery + classification helpers for the
 * "Adopt water from map" tool. Mirrors `adoptedBasemapBuildings.ts`'s
 * layer-discovery shape; adds light kind-inference from the OpenMapTiles
 * `class` property so adopted features land on a sensible default kind.
 *
 * OpenMapTiles v3 publishes water in two source-layers:
 *   - `water`    (polygons) — lakes, ponds, wetlands, reservoirs
 *   - `waterway` (lines)    — streams, rivers, canals, ditches, drains
 *
 * `class` values per the OpenMapTiles schema:
 *   water:    lake | pond | river | reservoir | swimming_pool | ocean | …
 *   waterway: river | stream | canal | drain | ditch | …
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import type { WaterbodyKind } from '../../store/waterSystemsStore.js';
import type { WatercourseKind } from '../../store/waterSystemsStore.js';

function layersByVectorSourceLayer(
  map: MaplibreMap,
  sourceLayer: string,
): string[] {
  try {
    const style = map.getStyle();
    if (!style?.layers) return [];
    return style.layers
      .filter(
        (l): l is typeof l & { 'source-layer': string } =>
          typeof (l as { 'source-layer'?: unknown })['source-layer'] === 'string' &&
          (l as { 'source-layer': string })['source-layer'] === sourceLayer,
      )
      .map((l) => l.id);
  } catch {
    return [];
  }
}

/** Layers backed by the OpenMapTiles `water` (polygon) source-layer. */
export function findWaterPolygonLayerIds(map: MaplibreMap): string[] {
  return layersByVectorSourceLayer(map, 'water');
}

/** Layers backed by the OpenMapTiles `waterway` (line) source-layer. */
export function findWaterwayLineLayerIds(map: MaplibreMap): string[] {
  return layersByVectorSourceLayer(map, 'waterway');
}

/** Read the OpenMapTiles `class` property off a feature and map it to a
 *  `WaterbodyKind`. Unknown / missing classes default to `'other'`. */
export function inferWaterbodyKind(
  props: Record<string, unknown> | null | undefined,
): WaterbodyKind {
  const c = readClass(props);
  switch (c) {
    case 'lake':
      return 'lake';
    case 'pond':
      return 'pond';
    case 'wetland':
    case 'swamp':
      return 'wetland';
    case 'reservoir':
    case 'basin':
      return 'reservoir';
    default:
      return 'other';
  }
}

/** Read the OpenMapTiles `class` property off a waterway feature and map it
 *  to a `WatercourseKind`. Rivers/streams collapse to `stream`; canals,
 *  drains, and ditches collapse to `ditch`. */
export function inferWatercourseKind(
  props: Record<string, unknown> | null | undefined,
): WatercourseKind {
  const c = readClass(props);
  switch (c) {
    case 'stream':
    case 'river':
      return 'stream';
    case 'canal':
    case 'drain':
    case 'ditch':
      return 'ditch';
    default:
      return 'other';
  }
}

function readClass(
  props: Record<string, unknown> | null | undefined,
): string | null {
  if (!props) return null;
  const v = props['class'];
  return typeof v === 'string' ? v : null;
}
