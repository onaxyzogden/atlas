/**
 * annotationGeometryRegistry — central dispatcher for *geometry-only*
 * mutations on existing annotations. Used by:
 *   - `<AnnotationDragHandler>` (point drag-reposition)
 *   - the line/polygon vertex-edit hook (MapboxDraw `direct_select`
 *     `draw.update` round-trip)
 *
 * Each helper takes a kind + id + the raw geometry coming off the map and
 * routes the patch into the owning namespace store via that store's
 * `update<X>` action. We deliberately do NOT use the form schema's
 * `save()` here — the form regenerates field defaults and would clobber
 * unrelated values during a drag.
 *
 * For kinds that derive cached scalars from geometry (currently only
 * `accessRoad.lengthM`), the recompute happens here so the dashboard
 * row's subtitle stays consistent with the new shape.
 */

import * as turf from '@turf/turf';
import { useHumanContextStore } from '../../../../store/humanContextStore.js';
import { useTopographyStore } from '../../../../store/topographyStore.js';
import { useExternalForcesStore } from '../../../../store/externalForcesStore.js';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { useVegetationStore } from '../../../../store/vegetationStore.js';
import { useSwotStore } from '../../../../store/swotStore.js';
import { useSoilSampleStore } from '../../../../store/soilSampleStore.js';
import { useBuiltEnvironmentStore } from '../../../../store/builtEnvironmentStore.js';
import { useConventionalCropStore } from '../../../../store/conventionalCropStore.js';
import { usePastureStore } from '../../../../store/pastureStore.js';
import type { AnnotationKind } from './annotationFieldSchemas.js';

function lineLengthM(geom: GeoJSON.LineString): number {
  try {
    return turf.length(turf.lineString(geom.coordinates), { units: 'meters' });
  } catch {
    return 0;
  }
}

function polygonAreaM2(geom: GeoJSON.Polygon): number {
  try {
    return turf.area(turf.feature(geom));
  } catch {
    return 0;
  }
}

/** Point kinds eligible for drag-reposition. */
export const POINT_KINDS: ReadonlySet<AnnotationKind> = new Set<AnnotationKind>([
  'neighbourPin',
  'household',
  'highPoint',
  'soilSample',
  'swotTag',
  // Built-Environment points (Phase 4.5)
  'well',
  'gate',
]);

/** LineString kinds eligible for vertex edit via direct_select. */
export const LINESTRING_KINDS: ReadonlySet<AnnotationKind> = new Set<AnnotationKind>([
  'accessRoad',
  'contourLine',
  'drainageLine',
  'watercourse',
  // Built-Environment lines (Phase 4.5) — lengthM recomputed on edit
  'powerLine',
  'buriedUtility',
  'fence',
  'existingDriveway',
]);

/** Polygon kinds eligible for vertex edit via direct_select. */
export const POLYGON_KINDS: ReadonlySet<AnnotationKind> = new Set<AnnotationKind>([
  'frostPocket',
  'hazardZone',
  'vegetation',
  // Built-Environment polygons (Phase 4.5) — areaM2 recomputed on edit
  'building',
  'septic',
  // Land-cover polygons — no cached scalar to recompute
  'conventionalCrop',
  'pasture',
]);

/** Reposition a point annotation. Routes to the correct field name
 *  (`position` vs `location`) per kind. */
export function writePointPosition(
  kind: AnnotationKind,
  id: string,
  position: [number, number],
): void {
  switch (kind) {
    case 'neighbourPin':
      useHumanContextStore.getState().updateNeighbour(id, { position });
      return;
    case 'household':
      useHumanContextStore.getState().updateHousehold(id, { position });
      return;
    case 'highPoint':
      useTopographyStore.getState().updateHighPoint(id, { position });
      return;
    case 'soilSample':
      useSoilSampleStore.getState().updateSample(id, { location: position });
      return;
    case 'swotTag':
      useSwotStore.getState().updateSwot(id, { position });
      return;
    case 'well':
      useBuiltEnvironmentStore.getState().updateWell(id, { position });
      return;
    case 'gate':
      useBuiltEnvironmentStore.getState().updateGate(id, { position });
      return;
    default:
      // Non-point kind passed in — caller bug. Silently no-op rather than
      // throw, so a stray drag attempt doesn't crash the map.
      return;
  }
}

/** Replace the geometry of a LineString annotation (vertex edit). For
 *  `accessRoad` we recompute `lengthM` so the dashboard subtitle stays
 *  in sync. */
export function writeLineString(
  kind: AnnotationKind,
  id: string,
  geometry: GeoJSON.LineString,
): void {
  switch (kind) {
    case 'accessRoad': {
      const lengthM = turf.length(turf.lineString(geometry.coordinates), {
        units: 'meters',
      });
      useHumanContextStore.getState().updateAccessRoad(id, { geometry, lengthM });
      return;
    }
    case 'contourLine':
      useTopographyStore.getState().updateContour(id, { geometry });
      return;
    case 'drainageLine':
      useTopographyStore.getState().updateDrainageLine(id, { geometry });
      return;
    case 'watercourse':
      useWaterSystemsStore.getState().updateWatercourse(id, { geometry });
      return;
    case 'powerLine': {
      const lengthM = lineLengthM(geometry);
      useBuiltEnvironmentStore.getState().updatePowerLine(id, { geometry, lengthM });
      return;
    }
    case 'buriedUtility': {
      const lengthM = lineLengthM(geometry);
      useBuiltEnvironmentStore.getState().updateBuriedUtility(id, { geometry, lengthM });
      return;
    }
    case 'fence': {
      const lengthM = lineLengthM(geometry);
      useBuiltEnvironmentStore.getState().updateFence(id, { geometry, lengthM });
      return;
    }
    case 'existingDriveway': {
      const lengthM = lineLengthM(geometry);
      useBuiltEnvironmentStore.getState().updateExistingDriveway(id, { geometry, lengthM });
      return;
    }
    default:
      return;
  }
}

/** Replace the geometry of a Polygon annotation (vertex edit). */
export function writePolygon(
  kind: AnnotationKind,
  id: string,
  geometry: GeoJSON.Polygon,
): void {
  switch (kind) {
    case 'frostPocket':
    case 'hazardZone':
      useExternalForcesStore.getState().updateHazard(id, { geometry });
      return;
    case 'vegetation':
      useVegetationStore.getState().updatePatch(id, { geometry });
      return;
    case 'building': {
      const areaM2 = polygonAreaM2(geometry);
      useBuiltEnvironmentStore.getState().updateBuilding(id, { geometry, areaM2 });
      return;
    }
    case 'septic': {
      const areaM2 = polygonAreaM2(geometry);
      useBuiltEnvironmentStore.getState().updateSeptic(id, { geometry, areaM2 });
      return;
    }
    case 'conventionalCrop':
      useConventionalCropStore.getState().updateConventionalCrop(id, { geometry });
      return;
    case 'pasture':
      usePastureStore.getState().updatePasture(id, { geometry });
      return;
    default:
      return;
  }
}

/** Read the *current* point coordinates for a kind+id, or null if the
 *  record was deleted between selection and drag. */
export function readPointPosition(
  kind: AnnotationKind,
  id: string,
): [number, number] | null {
  switch (kind) {
    case 'neighbourPin': {
      const r = useHumanContextStore
        .getState()
        .neighbours.find((x) => x.id === id);
      return r ? r.position : null;
    }
    case 'household': {
      const r = useHumanContextStore
        .getState()
        .households.find((x) => x.id === id);
      return r ? r.position : null;
    }
    case 'highPoint': {
      const r = useTopographyStore
        .getState()
        .highPoints.find((x) => x.id === id);
      return r ? r.position : null;
    }
    case 'soilSample': {
      const r = useSoilSampleStore
        .getState()
        .samples.find((x) => x.id === id);
      return r ? r.location : null;
    }
    case 'swotTag': {
      const r = useSwotStore.getState().swot.find((x) => x.id === id);
      return r?.position ?? null;
    }
    case 'well': {
      const r = useBuiltEnvironmentStore
        .getState()
        .wells.find((x) => x.id === id);
      return r ? r.position : null;
    }
    case 'gate': {
      const r = useBuiltEnvironmentStore
        .getState()
        .gates.find((x) => x.id === id);
      return r ? r.position : null;
    }
    default:
      return null;
  }
}

/** Read the *current* LineString geometry, or null if the record vanished. */
export function readLineString(
  kind: AnnotationKind,
  id: string,
): GeoJSON.LineString | null {
  switch (kind) {
    case 'accessRoad': {
      const r = useHumanContextStore
        .getState()
        .accessRoads.find((x) => x.id === id);
      return r ? r.geometry : null;
    }
    case 'contourLine': {
      const r = useTopographyStore
        .getState()
        .contours.find((x) => x.id === id);
      return r ? r.geometry : null;
    }
    case 'drainageLine': {
      const r = useTopographyStore
        .getState()
        .drainageLines.find((x) => x.id === id);
      return r ? r.geometry : null;
    }
    case 'watercourse': {
      const r = useWaterSystemsStore
        .getState()
        .watercourses.find((x) => x.id === id);
      return r ? r.geometry : null;
    }
    case 'powerLine': {
      const r = useBuiltEnvironmentStore
        .getState()
        .powerLines.find((x) => x.id === id);
      return r ? r.geometry : null;
    }
    case 'buriedUtility': {
      const r = useBuiltEnvironmentStore
        .getState()
        .buriedUtilities.find((x) => x.id === id);
      return r ? r.geometry : null;
    }
    case 'fence': {
      const r = useBuiltEnvironmentStore
        .getState()
        .fences.find((x) => x.id === id);
      return r ? r.geometry : null;
    }
    case 'existingDriveway': {
      const r = useBuiltEnvironmentStore
        .getState()
        .existingDriveways.find((x) => x.id === id);
      return r ? r.geometry : null;
    }
    default:
      return null;
  }
}

/** Read the *current* Polygon geometry, or null if the record vanished. */
export function readPolygon(
  kind: AnnotationKind,
  id: string,
): GeoJSON.Polygon | null {
  switch (kind) {
    case 'frostPocket':
    case 'hazardZone': {
      const r = useExternalForcesStore
        .getState()
        .hazards.find((x) => x.id === id);
      return r?.geometry ?? null;
    }
    case 'vegetation': {
      const r = useVegetationStore
        .getState()
        .patches.find((x) => x.id === id);
      return r ? r.geometry : null;
    }
    case 'building': {
      const r = useBuiltEnvironmentStore
        .getState()
        .buildings.find((x) => x.id === id);
      return r ? r.geometry : null;
    }
    case 'septic': {
      const r = useBuiltEnvironmentStore
        .getState()
        .septics.find((x) => x.id === id);
      return r ? r.geometry : null;
    }
    case 'conventionalCrop': {
      const r = useConventionalCropStore
        .getState()
        .conventionalCrops.find((x) => x.id === id);
      return r ? r.geometry : null;
    }
    case 'pasture': {
      const r = usePastureStore
        .getState()
        .pastures.find((x) => x.id === id);
      return r ? r.geometry : null;
    }
    default:
      return null;
  }
}
