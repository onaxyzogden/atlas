/**
 * PlanVertexEditHandler — Plan-stage composition of `SharedVertexEditHandler`.
 *
 * Resolves Plan's per-kind read/write helpers (`zone | crop | paddock |
 * structure`) into the dispatch table the shared handler consumes. The
 * MapboxDraw lifecycle itself lives in the shared handler — this file is
 * just the dispatch table + the selection wiring.
 *
 * Plan's gate policy: ANY active draw tool blocks vertex edit (we don't want
 * two MapboxDraw controls fighting over the canvas while a placement tool
 * is in flight).
 *
 * Plan's only line/polygon split today: every editable kind here is a
 * polygon. Lines may join later via the same dispatch table without code
 * changes.
 */

import { useMemo } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  usePlanVertexEditStore,
  type PlanVertexEditKind,
} from '../../../store/planVertexEditStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { useCropStore } from '../../../store/cropStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import {
  getAllStructures,
  updateStructure,
  findDesignElementGlobal,
  updateDesignElement,
} from '../../../store/builtEnvironmentSelectors.js';
import SharedVertexEditHandler, {
  type VertexEditDispatch,
} from '../../builtEnvironment/handlers/SharedVertexEditHandler.js';

const PLAN_KINDS = new Set<PlanVertexEditKind>([
  'zone',
  'crop',
  'paddock',
  'structure',
  'design-element',
]);

function isPlanKind(kind: string): kind is PlanVertexEditKind {
  return PLAN_KINDS.has(kind as PlanVertexEditKind);
}

/** Locate a design-element by id across every project (ids are globally
 *  unique). Delegates to the selector library's global-find helper. */
function findDesignElement(id: string) {
  return findDesignElementGlobal(id);
}

function readPolygon(kind: string, id: string): GeoJSON.Polygon | null {
  if (!isPlanKind(kind)) return null;
  if (kind === 'zone') {
    const r = useZoneStore.getState().zones.find((x) => x.id === id);
    return r && r.geometry.type === 'Polygon' ? r.geometry : null;
  }
  if (kind === 'crop') {
    const r = useCropStore.getState().cropAreas.find((x) => x.id === id);
    return r?.geometry ?? null;
  }
  if (kind === 'paddock') {
    const r = useLivestockStore.getState().paddocks.find((x) => x.id === id);
    return r?.geometry ?? null;
  }
  if (kind === 'design-element') {
    const hit = findDesignElement(id);
    return hit && hit.element.geometry.type === 'Polygon'
      ? hit.element.geometry
      : null;
  }
  // structure
  const r = getAllStructures().find((x) => x.id === id);
  return r?.geometry ?? null;
}

function writePolygon(kind: string, id: string, geom: GeoJSON.Polygon): void {
  if (!isPlanKind(kind)) return;
  if (kind === 'zone') {
    useZoneStore.getState().updateZone(id, { geometry: geom });
    return;
  }
  if (kind === 'crop') {
    useCropStore.getState().updateCropArea(id, { geometry: geom });
    return;
  }
  if (kind === 'paddock') {
    useLivestockStore.getState().updatePaddock(id, { geometry: geom });
    return;
  }
  if (kind === 'design-element') {
    const hit = findDesignElement(id);
    if (!hit) return;
    // Recompute acreage so the on-map label stays accurate after a
    // vertex reshape. Mirrors useDesignElementDrawTool.polygonAcres.
    let acreage: number | undefined;
    try {
      acreage = turf.area(geom) * 0.000247105;
    } catch {
      acreage = undefined;
    }
    updateDesignElement(hit.projectId, id, { geometry: geom, acreage });
    return;
  }
  // structure: persist new geometry AND recompute the canonical centre.
  // `widthM` / `depthM` / `rotationDeg` become stale (the polygon is now the
  // source of truth); the structure drag handler uses `translateByDelta` so
  // they don't matter for translation. Type/rotation edits in the popover
  // will still re-author via `createFootprintPolygon` and reset the shape.
  let center: [number, number];
  try {
    const c = turf.centroid(geom).geometry.coordinates as [number, number];
    center = c;
  } catch {
    center = [0, 0];
  }
  updateStructure(id, {
    geometry: geom,
    center,
  });
}

interface Props {
  map: MaplibreMap;
}

export default function PlanVertexEditHandler({ map }: Props) {
  const target = usePlanVertexEditStore((s) => s.target);
  const clear = usePlanVertexEditStore((s) => s.clear);

  const dispatch = useMemo<VertexEditDispatch>(
    () => ({
      featureIdPrefix: 'plan-vertex-edit',
      // Plan: gate any active tool. Plan tools may live under the same
      // `useMapToolStore` namespace as Observe but with non-`observe.`
      // prefixes; defensively block on any non-null tool.
      shouldSuppressForTool: (activeTool) => activeTool != null,
      geometryKindFor: (kind) => (isPlanKind(kind) ? 'polygon' : null),
      readLine: () => null,
      readPolygon,
      writeLine: () => {
        /* no Plan line kinds today */
      },
      writePolygon,
    }),
    [],
  );

  return (
    <SharedVertexEditHandler
      map={map}
      target={target}
      onClear={clear}
      dispatch={dispatch}
    />
  );
}
