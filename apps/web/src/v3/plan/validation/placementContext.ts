/**
 * placementContext — assembles the geometry pools the draw-time placement
 * evaluator (`evaluatePlacement.ts`) checks a candidate feature against.
 *
 * One-shot, non-React `getState()` reads — call `buildPlacementContext()`
 * when a draw tool arms (or on drag-commit), never per mousemove. The
 * returned context is a plain snapshot plus an internal buffer cache the
 * evaluator fills lazily: distance-rule targets are turf-buffered at most
 * once per context, so live cursor validation stays cheap.
 *
 * Kind normalization happens HERE, not in the evaluator: stored shapes
 * carry their own vocabularies (ProjectedWell.kind is a drill subtype,
 * CropArea uses `type`, utilityStore uses `UtilityType`), and this module
 * maps each pool onto the catalog-matchable `PlacementFeature.kind` /
 * `category` vocabulary documented in
 * `packages/shared/src/placementRules/types.ts`. Matching is verbatim —
 * spelling variants are handled by listing both in the catalog, never by
 * normalizing here.
 *
 * Pools included = exactly what the seed rules' distance targets reference
 * (wells, septics, structures, utility points, design elements, paddocks,
 * crop areas) + zones, setback rings, and the natural-water site layers.
 * Fences/gates/driveways are omitted until a rule targets them.
 */

import type { PlacementSiteLayer } from '@ogden/shared/placementRules';
import {
  getDesignElementsForProject,
  getSepticsForProject,
  getStructuresForProject,
  getWellsForProject,
} from '../../../store/builtEnvironmentSelectors.js';
import { useCropStore } from '../../../store/cropStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useSetbackStore } from '../../../store/setbackStore.js';
import { useUtilityStore } from '../../../store/utilityStore.js';
import { useWaterSystemsStore } from '../../../store/waterSystemsStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';

export type PlacementGeometry =
  | GeoJSON.Point
  | GeoJSON.LineString
  | GeoJSON.Polygon
  | GeoJSON.MultiPolygon;

/** A placed feature the evaluator can match by kind/category. */
export interface PlacementFeature {
  id: string;
  kind: string;
  category?: string;
  geometry: PlacementGeometry;
  label?: string;
}

/** A drawn land zone — matched by zone category, never by kind. */
export interface PlacementZone {
  id: string;
  category: string;
  permacultureZone?: number;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface PlacementRingEntry {
  id: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  label?: string;
}

/** A pre-buffered distance target retained with its source feature id so
 *  the evaluator can self-exclude on drag-revalidation without rebuffering. */
export interface BufferedTargetEntry {
  sourceId: string | null;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface PlacementContext {
  projectId: string;
  boundary: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  zones: PlacementZone[];
  setbackRings: PlacementRingEntry[];
  features: PlacementFeature[];
  siteLayers: Record<PlacementSiteLayer, PlacementGeometry[]>;
  /** Lazily filled by the evaluator, keyed by rule id. Internal. */
  bufferCache: Map<string, BufferedTargetEntry[]>;
}

/**
 * Snapshot every placement-relevant pool for `projectId`. The parcel
 * boundary is passed in by the caller (PlanLayout already threads
 * `v3Project.location.boundary` to every draw host) rather than read from
 * projectStore, so the validation module stays decoupled from project
 * resolution.
 */
export function buildPlacementContext(
  projectId: string,
  opts?: { boundary?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null },
): PlacementContext {
  const features: PlacementFeature[] = [];

  // Built environment — V2-projected, already state+kind filtered.
  for (const w of getWellsForProject(projectId)) {
    features.push({
      id: w.id,
      kind: 'well',
      category: 'utility',
      geometry: { type: 'Point', coordinates: w.position },
      label: w.label,
    });
  }
  for (const s of getSepticsForProject(projectId)) {
    features.push({
      id: s.id,
      kind: 'septic',
      category: 'utility',
      geometry: s.geometry,
      label: s.label,
    });
  }
  for (const s of getStructuresForProject(projectId)) {
    features.push({
      id: s.id,
      kind: s.type,
      category: 'structure',
      geometry: s.geometry,
      label: s.name,
    });
  }
  // Design elements (landDesignStore + V2 structure-class projections).
  // A structure-class element may appear here AND in the structures pool
  // under different kind spellings (barn vs barn) — duplicates are benign:
  // violations report per-rule, and self-exclusion filters by id.
  for (const el of getDesignElementsForProject(projectId)) {
    features.push({
      id: el.id,
      kind: el.kind,
      category: el.category,
      geometry: el.geometry,
      label: el.label,
    });
  }
  for (const u of useUtilityStore.getState().utilities) {
    if (u.projectId !== projectId) continue;
    features.push({
      id: u.id,
      kind: u.type,
      category: 'utility',
      geometry: { type: 'Point', coordinates: u.center },
      label: u.name,
    });
  }
  for (const p of useLivestockStore.getState().paddocks) {
    if (p.projectId !== projectId) continue;
    features.push({
      id: p.id,
      kind: 'paddock',
      category: 'grazing',
      geometry: p.geometry,
      label: p.name,
    });
  }
  for (const c of useCropStore.getState().cropAreas) {
    if (c.projectId !== projectId) continue;
    features.push({
      id: c.id,
      kind: c.type,
      category: 'crop-area',
      geometry: c.geometry,
      label: c.name,
    });
  }

  const zones: PlacementZone[] = useZoneStore
    .getState()
    .zones.filter((z) => z.projectId === projectId)
    .map((z) => {
      const entry: PlacementZone = {
        id: z.id,
        category: z.category,
        geometry: z.geometry,
      };
      if (typeof z.permacultureZone === 'number') {
        entry.permacultureZone = z.permacultureZone;
      }
      return entry;
    });

  const setbackRings: PlacementRingEntry[] = useSetbackStore
    .getState()
    .rings.filter((r) => r.projectId === projectId)
    .map((r) => ({ id: r.id, geometry: r.geometry, label: r.name }));

  // Natural water — live source geometry, per the setbackStore ADR
  // (rings stay static advisory annotations; enforcement reads sources).
  // 'waterway' = watercourses + open waterbodies; 'wetland' = wetland
  // waterbodies only (they have their own 120 m disturbance rule).
  const water = useWaterSystemsStore.getState();
  const waterway: PlacementGeometry[] = [];
  const wetland: PlacementGeometry[] = [];
  for (const wc of water.watercourses) {
    if (wc.projectId !== projectId) continue;
    waterway.push(wc.geometry);
  }
  for (const wb of water.waterbodies) {
    if (wb.projectId !== projectId) continue;
    (wb.kind === 'wetland' ? wetland : waterway).push(wb.geometry);
  }

  return {
    projectId,
    boundary: opts?.boundary ?? null,
    zones,
    setbackRings,
    features,
    siteLayers: { wetland, waterway },
    bufferCache: new Map(),
  };
}
