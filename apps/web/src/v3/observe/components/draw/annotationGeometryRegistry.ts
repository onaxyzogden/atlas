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
import { useEcologyStore } from '../../../../store/ecologyStore.js';
import { useSwotStore } from '../../../../store/swotStore.js';
import { useSoilSampleStore } from '../../../../store/soilSampleStore.js';
import type { AnnotationKind } from './annotationFieldSchemas.js';

/** Point kinds eligible for drag-reposition. */
export const POINT_KINDS: ReadonlySet<AnnotationKind> = new Set<AnnotationKind>([
  'neighbourPin',
  'household',
  'highPoint',
  'soilSample',
  'swotTag',
]);

/** LineString kinds eligible for vertex edit via direct_select. */
export const LINESTRING_KINDS: ReadonlySet<AnnotationKind> = new Set<AnnotationKind>([
  'accessRoad',
  'contourLine',
  'drainageLine',
  'watercourse',
]);

/** Polygon kinds eligible for vertex edit via direct_select. */
export const POLYGON_KINDS: ReadonlySet<AnnotationKind> = new Set<AnnotationKind>([
  'frostPocket',
  'hazardZone',
  'ecologyZone',
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
    case 'ecologyZone':
      useEcologyStore.getState().updateEcologyZone(id, { geometry });
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
    case 'ecologyZone': {
      const r = useEcologyStore
        .getState()
        .ecologyZones.find((x) => x.id === id);
      return r ? r.geometry : null;
    }
    default:
      return null;
  }
}
