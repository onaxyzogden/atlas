/**
 * adoptedBasemapBuildings — basemap building layer discovery.
 *
 * Historical note: this module used to try to *hide* the basemap's 3D
 * extrusion under a building the steward adopted into the project (so the
 * adopted entity's own extrusion wouldn't z-fight with the basemap's). That
 * is not achievable with the MapTiler OpenMapTiles `building` source: it does
 * not deliver one feature per building. `queryRenderedFeatures` returns a
 * tile-batched MultiPolygon bundling *hundreds* of unrelated footprints under
 * a single tile-local feature id. Both viable per-building hiding mechanisms
 * — paint filters and `feature-state` — are keyed per feature id, so they can
 * only hide the entire tile's buildings or none. There is no per-building
 * identifier on the source (no `osm_id`, no `promoteId`) to split them.
 *
 * Decision (2026-05-16): drop the basemap-hide goal. The adopted entity
 * renders its own extrusion on top; the basemap building remains. The only
 * thing still needed here is locating the building layers so the adopt tool
 * can `queryRenderedFeatures` against them. The sync/wire entry points are
 * kept as no-ops so the two map hosts that call them need no changes.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';

/** Iterate the current style and return every layer whose source-layer is
 *  the OpenMapTiles `building` source-layer (both 2D `fill` and 3D
 *  `fill-extrusion`). Used by the adopt tool to pick a footprint. */
export function findBuildingLayerIds(map: MaplibreMap): string[] {
  try {
    const style = map.getStyle();
    if (!style?.layers) return [];
    return style.layers
      .filter(
        (l): l is typeof l & { 'source-layer': string } =>
          typeof (l as { 'source-layer'?: unknown })['source-layer'] === 'string' &&
          (l as { 'source-layer': string })['source-layer'] === 'building',
      )
      .map((l) => l.id);
  } catch {
    return [];
  }
}

/** No-op. Per-building basemap hiding is not possible against the tile-batched
 *  `building` source (see file header). Kept so existing callers compile. */
export function syncAdoptedHidings(_map: MaplibreMap, _projectId: string): void {
  /* intentionally empty — see file header */
}

/** No-op wiring. Returns an empty cleanup so map hosts can keep calling it
 *  inside an effect without conditional logic. */
export function wireAdoptedHidings(
  _map: MaplibreMap,
  _projectId: string,
): () => void {
  return () => {};
}

/** No-op. The `building` source has no per-building id to promote. */
export function ensureBuildingPromoteId(_map: MaplibreMap): void {
  /* intentionally empty — see file header */
}
