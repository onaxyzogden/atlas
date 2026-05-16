/**
 * adoptedBasemapBuildings — keeps the basemap's 3D building extrusions in
 * sync with the project's "adopted" Built Environment buildings.
 *
 * When the steward adopts a basemap building (Observe → BE → "Adopt from
 * map"), the new `existing` entity records the basemap's `osm_id` (read
 * from `feature.properties.osm_id` at click time) in
 * `existing.adoptedFromBasemapId`. This module reads that id and splices
 * a filter clause onto every basemap layer with
 * `source-layer === 'building'` so any feature whose `osm_id` is in the
 * adopted set stops rendering.
 *
 * We deliberately do NOT use `setFeatureState` here. The MapTiler
 * `openmaptiles` source ships without `promoteId`, so rendered tile
 * features land in MapLibre with `feature.id === undefined`. Matching by
 * property (`['get', 'osm_id']`) is property-driven and survives without
 * any source-spec mutation — no promoteId hack, no remove/re-add dance.
 *
 * `syncAdoptedHidings` is idempotent and safe to call repeatedly. The
 * caller wires it to:
 *   - `style.load` (re-apply after a basemap swap), and
 *   - the entity store (re-apply when entities are created/deleted).
 */

import type { Map as MaplibreMap, FilterSpecification } from 'maplibre-gl';
import { useBuiltEnvironmentStoreV2 } from '../../store/builtEnvironmentStoreV2.js';

/** Marker key spliced into the layer's filter so we can detect / replace
 *  our own clause on subsequent runs without nesting it forever. */
const ADOPTED_FILTER_PROP = 'osm_id';

/** Iterate the current style and return every layer whose source-layer is
 *  the OpenMapTiles `building` source-layer. Both 2D `fill` and 3D
 *  `fill-extrusion` layers are returned — we hide both representations. */
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

/** Project-scoped: returns adopted basemap building ids (the `osm_id`
 *  values captured by AdoptBasemapBuildingTool). Numbers preferred —
 *  OpenMapTiles stores osm_id as a number — but strings are accepted
 *  defensively (some tile pipelines coerce to string). */
export function getAdoptedBasemapIds(projectId: string): Array<string | number> {
  const entities = useBuiltEnvironmentStoreV2.getState().entities;
  const out: Array<string | number> = [];
  for (const e of entities) {
    if (e.projectId !== projectId) continue;
    if (e.kind !== 'building') continue;
    if (e.state !== 'existing') continue;
    const id = e.existing?.adoptedFromBasemapId;
    if (typeof id === 'string' || typeof id === 'number') out.push(id);
  }
  return out;
}

/** A filter clause we splice in is recognisable as an `['!', ['in',
 *  ['get', 'osm_id'], ['literal', [...]]]]` shape. */
function isAdoptedClause(clause: unknown): boolean {
  if (!Array.isArray(clause)) return false;
  if (clause[0] !== '!') return false;
  const inner = clause[1];
  if (!Array.isArray(inner) || inner[0] !== 'in') return false;
  const getExpr = inner[1];
  return (
    Array.isArray(getExpr) &&
    getExpr[0] === 'get' &&
    getExpr[1] === ADOPTED_FILTER_PROP
  );
}

/** Build the hide-clause for the given id list. Empty list → no clause
 *  (caller should remove any prior clause instead). */
function buildAdoptedClause(
  ids: ReadonlyArray<string | number>,
): FilterSpecification {
  // `['literal', [...]]` is required so MapLibre treats the array as data,
  // not an expression to evaluate.
  return [
    '!',
    ['in', ['get', ADOPTED_FILTER_PROP], ['literal', ids as Array<string | number>]],
  ] as unknown as FilterSpecification;
}

/** Replace or append our adopted clause on a layer's filter, preserving
 *  any pre-existing filter the basemap style ships with. */
function applyAdoptedFilter(
  map: MaplibreMap,
  layerId: string,
  ids: ReadonlyArray<string | number>,
  cachedOriginal: Map<string, FilterSpecification | undefined>,
): void {
  // Lazily capture the basemap's original filter the first time we touch
  // this layer in this session, so subsequent updates can rebuild on top
  // of it rather than nesting our own clause inside itself.
  if (!cachedOriginal.has(layerId)) {
    let baseline: FilterSpecification | undefined;
    try {
      const current = map.getFilter(layerId) as FilterSpecification | undefined;
      // If the current filter is already an ['all', ..., adoptedClause]
      // from a prior run, strip our clause out before caching.
      if (
        Array.isArray(current) &&
        current[0] === 'all' &&
        current.slice(1).some(isAdoptedClause)
      ) {
        const rest = current.slice(1).filter((c) => !isAdoptedClause(c));
        baseline =
          rest.length === 0
            ? undefined
            : rest.length === 1
              ? (rest[0] as FilterSpecification)
              : (['all', ...rest] as unknown as FilterSpecification);
      } else if (current && isAdoptedClause(current)) {
        baseline = undefined;
      } else {
        baseline = current;
      }
    } catch {
      baseline = undefined;
    }
    cachedOriginal.set(layerId, baseline);
  }
  const original = cachedOriginal.get(layerId);

  let next: FilterSpecification | null;
  if (ids.length === 0) {
    next = original ?? null;
  } else {
    const clause = buildAdoptedClause(ids);
    next = original
      ? (['all', original, clause] as unknown as FilterSpecification)
      : clause;
  }

  try {
    // MapLibre accepts `undefined` to clear a filter via `setFilter(id, null)`
    // but the typing wants FilterSpecification. Pass the literal `null`
    // through a cast — the runtime handles it.
    map.setFilter(layerId, next as FilterSpecification);
  } catch {
    /* layer may have been removed mid-flight */
  }
}

/** Per-map cache of each building layer's baseline (pre-adoption) filter,
 *  captured the first time we touch it. */
const baselineFilterByMap = new WeakMap<
  MaplibreMap,
  Map<string, FilterSpecification | undefined>
>();

/** Sync the basemap's hide-clause to match the current set of adopted-
 *  from-basemap entities for `projectId`. Splices an
 *  `['!', ['in', ['get', 'osm_id'], ['literal', ids]]]` clause into every
 *  building layer's filter; rebuilds it on every call (idempotent). */
export function syncAdoptedHidings(
  map: MaplibreMap,
  projectId: string,
): void {
  if (!map || !map.isStyleLoaded()) return;
  const layerIds = findBuildingLayerIds(map);
  if (layerIds.length === 0) {
    // Satellite or any style without buildings — nothing to do.
    return;
  }

  const adopted = getAdoptedBasemapIds(projectId);
  // Coerce strings that look like numbers to numbers — OpenMapTiles
  // stores osm_id as a 64-bit integer, but if a steward ever adopts on a
  // style that promotes it to a string we want both forms in the list so
  // the `in` comparison hits regardless of property type.
  const ids: Array<string | number> = [];
  for (const id of adopted) {
    ids.push(id);
    if (typeof id === 'string') {
      const asNum = Number(id);
      if (Number.isFinite(asNum) && String(asNum) === id) ids.push(asNum);
    } else if (typeof id === 'number') {
      ids.push(String(id));
    }
  }

  let cache = baselineFilterByMap.get(map);
  if (!cache) {
    cache = new Map();
    baselineFilterByMap.set(map, cache);
  }

  for (const layerId of layerIds) {
    applyAdoptedFilter(map, layerId, ids, cache);
  }
}

/** Kept exported for backwards compatibility with callers that imported
 *  the helper from the prior promoteId-based implementation. The new
 *  filter-by-property approach needs no source mutation, so this is a
 *  no-op — safe to remove once all imports are dropped. */
export function ensureBuildingPromoteId(_map: MaplibreMap): void {
  /* intentionally empty — kept for import compatibility */
}
