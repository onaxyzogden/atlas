/**
 * usePlanSnapTargets — assembles the `SnapTargets` a Plan draw tool snaps onto.
 *
 * Single source of the "snap to existing" target set so every opt-in tool
 * (FenceLineTool, PaddockTool, design-element tools, point tools, …) builds an
 * identical target set. Collects, for the current project, every drawn feature's
 * geometry and folds it (via the pure `buildSnapTargets` normalizer) into:
 *   - `lines`    — edge sequences (LineString coords, Polygon/MultiPolygon rings)
 *   - `vertices` — every endpoint/corner + every Point/anchor (snap-to-corner
 *                  beats snap-to-edge in `snapDrawPoint`)
 *
 * Sources (all project-scoped):
 *   - fence lines + paddocks         (livestockStore)
 *   - built-environment entities     (builtEnvironmentStoreV2) — footprints/runs
 *   - design elements                (useDesignElementsForProject) — trees,
 *     ponds, swales, paths, hedgerows, orchards, structures, habitat, …
 *   - zones / crop areas             (zoneStore / cropStore)
 *   - paths / utility runs           (pathStore / utilityRunStore)
 *   - setback rings                  (setbackStore)
 *   - monitoring transects           (monitoringTransectStore)
 *   - material flows / fertility     (closedLoopStore) — flows carry an optional
 *     LineString; fertility infra is a point `center` (snappable vertex)
 *   - water systems                  (waterSystemsStore) — earthworks (line),
 *     storage (point `center`), watercourses (line), waterbodies (polygon), and
 *     the directed-graph water nodes (catchment polygon + swale line + center)
 *   - slope-survey class polygons    (slopeSurveyStore) — drawn terrain-class
 *     extents (Polygon); highest-value survey snap is class-to-adjacent-class
 *   - vegetation-survey polygons     (vegetationSurveyStore) — drawn community
 *     extents (Polygon)
 *   - the parcel boundary ring
 *
 * Point placements (fertility infra, storage infra, water-node anchors) have no
 * geometry — only a `center: [lng, lat]`. They are wrapped as `Point` geometries
 * so the single normalizer handles them uniformly (a Point contributes one
 * snappable vertex via `nearestCorner`).
 *
 * Guilds are intentionally excluded: their geometry is parcel-relative
 * (`center` + member offsets in metres), not lng/lat, so they have no map-space
 * vertex to snap onto.
 *
 * Returns a stable `getSnapTargets` callback (re-created only when an input
 * collection changes). The draw hooks invoke it once at mode start, so targets
 * reflect existing features at the moment the draw session begins.
 */

import { useCallback } from 'react';
import { useLivestockStore } from '../../../../store/livestockStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../../store/builtEnvironmentStoreV2.js';
import { useDesignElementsForProject } from '../../../../store/builtEnvironmentSelectors.js';
import { useZoneStore } from '../../../../store/zoneStore.js';
import { useCropStore } from '../../../../store/cropStore.js';
import { usePathStore } from '../../../../store/pathStore.js';
import { useUtilityRunStore } from '../../../../store/utilityRunStore.js';
import { useSetbackStore } from '../../../../store/setbackStore.js';
import { useMonitoringTransectStore } from '../../../../store/monitoringTransectStore.js';
import { useClosedLoopStore } from '../../../../store/closedLoopStore.js';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { useSlopeSurveyStore } from '../../../../store/slopeSurveyStore.js';
import { useVegetationSurveyStore } from '../../../../store/vegetationSurveyStore.js';
import type { SnapTargets } from '../../../lib/snapPoint.js';

type LngLat = [number, number];

/**
 * buildSnapTargets — pure normalizer folding any set of GeoJSON geometries into
 * the `{ lines, vertices }` SnapTargets shape consumed by `snapDrawPoint`:
 *   - Polygons / MultiPolygons → every ring as both an edge `line` and its
 *     corner vertices.
 *   - LineStrings / MultiLineStrings → the coord run as a `line` (+ vertices).
 *   - Points / MultiPoints → bare snappable vertices (corners beat edges).
 *   - GeometryCollections → recursively flattened.
 * Null/empty geometries and degenerate (<2-coord) lines are skipped.
 *
 * Exported so the assembly is unit-testable directly (no Zustand mount); the
 * hook below is just the store-gatherer that feeds it.
 */
export function buildSnapTargets(
  geometries: ReadonlyArray<GeoJSON.Geometry | null | undefined>,
): SnapTargets {
  const lines: LngLat[][] = [];
  const vertices: LngLat[] = [];

  const pushLine = (coords: LngLat[] | undefined): void => {
    if (!coords || coords.length < 2) return;
    lines.push(coords);
    for (const c of coords) vertices.push(c);
  };
  const pushVertex = (c: LngLat | undefined): void => {
    if (c) vertices.push(c);
  };
  const pushGeometry = (g: GeoJSON.Geometry | null | undefined): void => {
    if (!g) return;
    switch (g.type) {
      case 'Point':
        pushVertex(g.coordinates as LngLat);
        break;
      case 'MultiPoint':
        for (const c of g.coordinates) pushVertex(c as LngLat);
        break;
      case 'LineString':
        pushLine(g.coordinates as LngLat[]);
        break;
      case 'MultiLineString':
        for (const ln of g.coordinates) pushLine(ln as LngLat[]);
        break;
      case 'Polygon':
        for (const ring of g.coordinates) pushLine(ring as LngLat[]);
        break;
      case 'MultiPolygon':
        for (const poly of g.coordinates)
          for (const ring of poly) pushLine(ring as LngLat[]);
        break;
      case 'GeometryCollection':
        for (const sub of g.geometries) pushGeometry(sub);
        break;
    }
  };

  for (const g of geometries) pushGeometry(g);
  return { lines, vertices };
}

/** Wrap a bare `[lng, lat]` point placement as a Point geometry. */
function pointGeom(center: LngLat | undefined): GeoJSON.Point | undefined {
  return center ? { type: 'Point', coordinates: center } : undefined;
}

export function usePlanSnapTargets(
  projectId: string,
  parcelBoundary?: GeoJSON.Polygon,
): () => SnapTargets {
  const fenceLines = useLivestockStore((s) => s.fenceLines);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const entities = useBuiltEnvironmentStoreV2((s) => s.entities);
  const designElements = useDesignElementsForProject(projectId);
  const zones = useZoneStore((s) => s.zones);
  const cropAreas = useCropStore((s) => s.cropAreas);
  const paths = usePathStore((s) => s.paths);
  const runs = useUtilityRunStore((s) => s.runs);
  const rings = useSetbackStore((s) => s.rings);
  const transects = useMonitoringTransectStore((s) => s.transects);
  const materialFlows = useClosedLoopStore((s) => s.materialFlows);
  const fertilityInfra = useClosedLoopStore((s) => s.fertilityInfra);
  const earthworks = useWaterSystemsStore((s) => s.earthworks);
  const storageInfra = useWaterSystemsStore((s) => s.storageInfra);
  const watercourses = useWaterSystemsStore((s) => s.watercourses);
  const waterbodies = useWaterSystemsStore((s) => s.waterbodies);
  const waterNodes = useWaterSystemsStore((s) => s.waterNodes);
  // Drawn surveys (own layers, project-keyed `byProject`) — fold their polygons
  // in so a survey draw can snap to adjacent survey classes/communities and to
  // every other plan feature.
  const slopeByProject = useSlopeSurveyStore((s) => s.byProject);
  const vegByProject = useVegetationSurveyStore((s) => s.byProject);

  return useCallback((): SnapTargets => {
    const here = (pid: string): boolean => pid === projectId;
    const geoms: Array<GeoJSON.Geometry | null | undefined> = [];

    // Livestock — fence lines (LineString) + paddocks (Polygon).
    for (const f of fenceLines) if (here(f.projectId)) geoms.push(f.geometry);
    for (const p of paddocks) if (here(p.projectId)) geoms.push(p.geometry);

    // Built-environment entities — structure footprints + line runs.
    for (const e of entities)
      if (here(e.projectId)) geoms.push(e.geometry as GeoJSON.Geometry | undefined);

    // Design elements — already project-scoped by the selector.
    for (const el of designElements) geoms.push(el.geometry as GeoJSON.Geometry);

    // Zones / crops / circulation / setbacks / transects.
    for (const z of zones) if (here(z.projectId)) geoms.push(z.geometry);
    for (const c of cropAreas) if (here(c.projectId)) geoms.push(c.geometry);
    for (const p of paths) if (here(p.projectId)) geoms.push(p.geometry);
    for (const r of runs) if (here(r.projectId)) geoms.push(r.geometry);
    for (const r of rings) if (here(r.projectId)) geoms.push(r.geometry);
    for (const t of transects) if (here(t.projectId)) geoms.push(t.geometry);

    // Closed-loop — material flows (canvas-origin LineString) + fertility infra
    // (point `center`, no geometry).
    for (const f of materialFlows) if (here(f.projectId)) geoms.push(f.geometry);
    for (const fi of fertilityInfra)
      if (here(fi.projectId)) geoms.push(pointGeom(fi.center));

    // Water systems — earthworks (line), storage (point), watercourses (line),
    // waterbodies (polygon), directed-graph nodes (catchment polygon + swale
    // line + center anchor).
    for (const ew of earthworks) if (here(ew.projectId)) geoms.push(ew.geometry);
    for (const si of storageInfra)
      if (here(si.projectId)) geoms.push(pointGeom(si.center));
    for (const wc of watercourses) if (here(wc.projectId)) geoms.push(wc.geometry);
    for (const wb of waterbodies) if (here(wb.projectId)) geoms.push(wb.geometry);
    for (const wn of waterNodes) {
      if (!here(wn.projectId)) continue;
      geoms.push(wn.geometry);
      geoms.push(wn.swaleGeometry);
      geoms.push(pointGeom(wn.center));
    }

    // Drawn surveys — slope-class + vegetation-community polygons (keyed by
    // projectId; iterate the project's feature map).
    for (const f of Object.values(slopeByProject[projectId] ?? {}))
      geoms.push(f.geometry);
    for (const f of Object.values(vegByProject[projectId] ?? {}))
      geoms.push(f.geometry);

    // Parcel boundary ring.
    if (parcelBoundary) geoms.push(parcelBoundary);

    return buildSnapTargets(geoms);
  }, [
    fenceLines,
    paddocks,
    entities,
    designElements,
    zones,
    cropAreas,
    paths,
    runs,
    rings,
    transects,
    materialFlows,
    fertilityInfra,
    earthworks,
    storageInfra,
    watercourses,
    waterbodies,
    waterNodes,
    slopeByProject,
    vegByProject,
    parcelBoundary,
    projectId,
  ]);
}
