/**
 * useObserveSnapTargets — assembles the `SnapTargets` an OBSERVE draw tool snaps
 * onto. The Observe-stage analogue of `usePlanSnapTargets`: same `{ lines,
 * vertices }` shape, same pure `buildSnapTargets` normalizer, so every opt-in
 * Observe tool (point, line, polygon) builds an identical target set.
 *
 * Sources are the features actually rendered on the Observe map (so snapping
 * never locks onto something the steward can't see):
 *   - human context        (humanContextStore)  — neighbour pins, steward /
 *     household pins (Point `position`), access roads (LineString)
 *   - topography           (topographyStore)    — contours / drainage / runoff
 *     (LineString), high/low points + erosion flags (Point `position`)
 *   - external forces      (externalForcesStore) — hazard zones / frost pockets
 *     (Polygon). Sectors are excluded: their apex is homestead-derived and the
 *     wedge has no committed lng/lat polygon to snap onto (mirrors the guild
 *     exclusion in `usePlanSnapTargets`).
 *   - earth / water        (waterSystemsStore)  — watercourses (LineString),
 *     waterbodies (Polygon). The directed-graph water nodes / earthworks /
 *     storage live on the PLAN stage and are intentionally not folded in here.
 *   - vegetation & cover   (vegetationStore)    — patches (Polygon/MultiPolygon)
 *   - pasture / paddock    (pastureStore)       — pastures (Polygon/MultiPolygon)
 *   - conventional crop    (conventionalCropStore) — fields (Polygon)
 *   - SWOT tags            (swotStore)          — Point `position`
 *   - soil samples         (soilSampleStore)    — Point `location`
 *   - built environment v1 (builtEnvironmentStore) — buildings / septics
 *     (Polygon), power lines / buried utilities / fences / driveways
 *     (LineString), wells / gates (Point `position`)
 *   - built environment v2 (builtEnvironmentStoreV2) — structured BE entities
 *     placed via the generic V2 tool (footprints / runs)
 *   - slope survey        (slopeSurveyStore)      — drawn terrain-class polygons
 *   - vegetation survey   (vegetationSurveyStore) — drawn community polygons
 *   - the parcel boundary ring (from `projectStore`)
 *
 * Bare `[lng, lat]` placements (pins, soil samples, wells, gates) carry no
 * geometry — only a coordinate. They are wrapped as `Point` geometries so the
 * single normalizer handles them uniformly (a Point contributes one snappable
 * vertex via `nearestCorner`).
 *
 * Returns a stable `getSnapTargets` callback (re-created only when an input
 * collection changes). The draw hook invokes it once at mode start, so targets
 * reflect existing features at the moment the draw session begins.
 */

import { useCallback } from 'react';
import { useProjectStore } from '../../../../store/projectStore.js';
import { useHumanContextStore } from '../../../../store/humanContextStore.js';
import { useTopographyStore } from '../../../../store/topographyStore.js';
import { useExternalForcesStore } from '../../../../store/externalForcesStore.js';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { useVegetationStore } from '../../../../store/vegetationStore.js';
import { usePastureStore } from '../../../../store/pastureStore.js';
import { useConventionalCropStore } from '../../../../store/conventionalCropStore.js';
import { useSwotStore } from '../../../../store/swotStore.js';
import { useSoilSampleStore } from '../../../../store/soilSampleStore.js';
import { useBuiltEnvironmentStore } from '../../../../store/builtEnvironmentStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../../store/builtEnvironmentStoreV2.js';
import { useSlopeSurveyStore } from '../../../../store/slopeSurveyStore.js';
import { useVegetationSurveyStore } from '../../../../store/vegetationSurveyStore.js';
import type { SnapTargets } from '../../../lib/snapPoint.js';
import { buildSnapTargets } from '../../../plan/draw/tools/usePlanSnapTargets.js';

type LngLat = [number, number];

/** Wrap a bare `[lng, lat]` placement as a Point geometry. */
function pointGeom(
  center: LngLat | null | undefined,
): GeoJSON.Point | undefined {
  return center ? { type: 'Point', coordinates: center } : undefined;
}

export function useObserveSnapTargets(projectId: string): () => SnapTargets {
  const projects = useProjectStore((s) => s.projects);
  // Human context.
  const neighbours = useHumanContextStore((s) => s.neighbours);
  const households = useHumanContextStore((s) => s.households);
  const accessRoads = useHumanContextStore((s) => s.accessRoads);
  // Topography.
  const contours = useTopographyStore((s) => s.contours);
  const highPoints = useTopographyStore((s) => s.highPoints);
  const drainageLines = useTopographyStore((s) => s.drainageLines);
  const erosionFlags = useTopographyStore((s) => s.erosionFlags);
  const runoffPaths = useTopographyStore((s) => s.runoffPaths);
  // External forces (hazard polygons; sectors excluded — see file header).
  const hazards = useExternalForcesStore((s) => s.hazards);
  // Earth / water annotations.
  const watercourses = useWaterSystemsStore((s) => s.watercourses);
  const waterbodies = useWaterSystemsStore((s) => s.waterbodies);
  // Ecology / agronomy.
  const patches = useVegetationStore((s) => s.patches);
  const pastures = usePastureStore((s) => s.pastures);
  const conventionalCrops = useConventionalCropStore((s) => s.conventionalCrops);
  // Synthesis + sampling points.
  const swot = useSwotStore((s) => s.swot);
  const samples = useSoilSampleStore((s) => s.samples);
  // Built environment — legacy (v1) annotation store + structured (v2) entities.
  const buildings = useBuiltEnvironmentStore((s) => s.buildings);
  const wells = useBuiltEnvironmentStore((s) => s.wells);
  const septics = useBuiltEnvironmentStore((s) => s.septics);
  const powerLines = useBuiltEnvironmentStore((s) => s.powerLines);
  const buriedUtilities = useBuiltEnvironmentStore((s) => s.buriedUtilities);
  const fences = useBuiltEnvironmentStore((s) => s.fences);
  const gates = useBuiltEnvironmentStore((s) => s.gates);
  const existingDriveways = useBuiltEnvironmentStore((s) => s.existingDriveways);
  const entities = useBuiltEnvironmentStoreV2((s) => s.entities);
  // Drawn surveys (own layers, project-keyed `byProject`) — folded in so an
  // Observe draw can snap onto drawn slope-class / vegetation-community polygons.
  const slopeByProject = useSlopeSurveyStore((s) => s.byProject);
  const vegByProject = useVegetationSurveyStore((s) => s.byProject);

  return useCallback((): SnapTargets => {
    const here = (pid: string): boolean => pid === projectId;
    const geoms: Array<GeoJSON.Geometry | null | undefined> = [];

    // Human context — pins (Point) + access roads (LineString).
    for (const n of neighbours) if (here(n.projectId)) geoms.push(pointGeom(n.position));
    for (const h of households) if (here(h.projectId)) geoms.push(pointGeom(h.position));
    for (const r of accessRoads) if (here(r.projectId)) geoms.push(r.geometry);

    // Topography — lines + elevation/erosion points.
    for (const c of contours) if (here(c.projectId)) geoms.push(c.geometry);
    for (const p of highPoints) if (here(p.projectId)) geoms.push(pointGeom(p.position));
    for (const d of drainageLines) if (here(d.projectId)) geoms.push(d.geometry);
    for (const e of erosionFlags) if (here(e.projectId)) geoms.push(pointGeom(e.position));
    for (const r of runoffPaths) if (here(r.projectId)) geoms.push(r.geometry);

    // External forces — hazard / frost-pocket polygons.
    for (const hz of hazards) if (here(hz.projectId)) geoms.push(hz.geometry);

    // Earth / water annotations.
    for (const wc of watercourses) if (here(wc.projectId)) geoms.push(wc.geometry);
    for (const wb of waterbodies) if (here(wb.projectId)) geoms.push(wb.geometry);

    // Ecology / agronomy polygons.
    for (const pt of patches) if (here(pt.projectId)) geoms.push(pt.geometry);
    for (const ps of pastures) if (here(ps.projectId)) geoms.push(ps.geometry);
    for (const cc of conventionalCrops) if (here(cc.projectId)) geoms.push(cc.geometry);

    // Synthesis tags + soil samples (points).
    for (const sw of swot) if (here(sw.projectId)) geoms.push(pointGeom(sw.position));
    for (const sm of samples) if (here(sm.projectId)) geoms.push(pointGeom(sm.location));

    // Built environment — v1 annotation features.
    for (const b of buildings) if (here(b.projectId)) geoms.push(b.geometry);
    for (const w of wells) if (here(w.projectId)) geoms.push(pointGeom(w.position));
    for (const sp of septics) if (here(sp.projectId)) geoms.push(sp.geometry);
    for (const pl of powerLines) if (here(pl.projectId)) geoms.push(pl.geometry);
    for (const u of buriedUtilities) if (here(u.projectId)) geoms.push(u.geometry);
    for (const f of fences) if (here(f.projectId)) geoms.push(f.geometry);
    for (const g of gates) if (here(g.projectId)) geoms.push(pointGeom(g.position));
    for (const dw of existingDriveways) if (here(dw.projectId)) geoms.push(dw.geometry);

    // Built environment — v2 structured entities (footprints / runs).
    for (const e of entities)
      if (here(e.projectId)) geoms.push(e.geometry as GeoJSON.Geometry | undefined);

    // Drawn surveys — slope-class + vegetation-community polygons (keyed by
    // projectId; iterate the project's feature map).
    for (const f of Object.values(slopeByProject[projectId] ?? {}))
      geoms.push(f.geometry);
    for (const f of Object.values(vegByProject[projectId] ?? {}))
      geoms.push(f.geometry);

    // Parcel boundary — stored as a FeatureCollection (the Plan side instead
    // receives an already-extracted Polygon prop); fold each feature geometry
    // in so its ring edges + corners become snap targets.
    const boundary = projects.find((p) => p.id === projectId)?.parcelBoundaryGeojson;
    if (boundary) for (const f of boundary.features) geoms.push(f.geometry);

    return buildSnapTargets(geoms);
  }, [
    projectId,
    projects,
    neighbours,
    households,
    accessRoads,
    contours,
    highPoints,
    drainageLines,
    erosionFlags,
    runoffPaths,
    hazards,
    watercourses,
    waterbodies,
    patches,
    pastures,
    conventionalCrops,
    swot,
    samples,
    buildings,
    wells,
    septics,
    powerLines,
    buriedUtilities,
    fences,
    gates,
    existingDriveways,
    entities,
    slopeByProject,
    vegByProject,
  ]);
}
