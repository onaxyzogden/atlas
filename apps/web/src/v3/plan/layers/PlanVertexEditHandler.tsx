/**
 * PlanVertexEditHandler — mounts a MapboxDraw `direct_select` instance
 * on the Plan map when `usePlanVertexEditStore.target` is set, and writes
 * the new polygon back to the owning Plan store on `draw.update`.
 *
 * Mirrors `AnnotationVertexEditHandler` (Observe) but reads/writes Plan
 * stores directly rather than going through the annotation registry.
 *
 * Esc / target cleared / unmount → remove the control gracefully.
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { MAPLIBRE_DRAW_STYLES } from '../../observe/components/draw/mapboxDrawStyles.js';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import {
  usePlanVertexEditStore,
  type PlanVertexEditKind,
} from '../../../store/planVertexEditStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { useCropStore } from '../../../store/cropStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useStructureStore } from '../../../store/structureStore.js';

interface Props {
  map: MaplibreMap;
}

interface DrawUpdateEvent {
  features?: GeoJSON.Feature[];
}

function readGeometry(
  kind: PlanVertexEditKind,
  id: string,
): GeoJSON.Polygon | null {
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
  if (kind === 'structure') {
    const r = useStructureStore.getState().structures.find((x) => x.id === id);
    return r?.geometry ?? null;
  }
  return null;
}

function writeGeometry(
  kind: PlanVertexEditKind,
  id: string,
  geom: GeoJSON.Polygon,
): void {
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
  if (kind === 'structure') {
    // Vertex-edited structures: persist new geometry and recompute the
    // canonical `center` from the new polygon. `widthM` / `depthM` /
    // `rotationDeg` become stale (the polygon is now the source of truth);
    // the structure drag handler uses `translateByDelta` so they don't
    // matter for translation. Type/rotation edits in the popover will
    // still re-author via `createFootprintPolygon` and reset the shape.
    let center: [number, number];
    try {
      const c = turf.centroid(geom).geometry.coordinates as [number, number];
      center = c;
    } catch {
      center = [0, 0];
    }
    useStructureStore.getState().updateStructure(id, {
      geometry: geom,
      center,
    });
  }
}

export default function PlanVertexEditHandler({ map }: Props) {
  const target = usePlanVertexEditStore((s) => s.target);
  const clear = usePlanVertexEditStore((s) => s.clear);
  const activeTool = useMapToolStore((s) => s.activeTool);

  useEffect(() => {
    if (!map) return;
    if (!target) return;
    // Don't fight a placement tool — it already owns a MapboxDraw control.
    if (activeTool != null) return;

    const { kind, id } = target;
    const initial = readGeometry(kind, id);
    if (!initial) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: MAPLIBRE_DRAW_STYLES,
    });
    map.addControl(draw);

    const featureId = `plan-vertex-edit-${kind}-${id}`;
    const feature: GeoJSON.Feature = {
      id: featureId,
      type: 'Feature',
      properties: {},
      geometry: initial,
    };
    try {
      draw.add(feature);
      (
        draw.changeMode as (mode: string, opts?: { featureId: string }) => unknown
      )('direct_select', { featureId });
    } catch {
      try {
        map.removeControl(draw);
      } catch {
        /* ignore */
      }
      return;
    }

    const onUpdate = (e: DrawUpdateEvent) => {
      const feat = e.features?.[0];
      if (!feat) return;
      if (feat.geometry.type === 'Polygon') {
        writeGeometry(kind, id, feat.geometry);
      }
    };
    (
      map as unknown as {
        on: (ev: string, h: (e: DrawUpdateEvent) => void) => void;
      }
    ).on('draw.update', onUpdate);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const target = document.activeElement;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      clear();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      (
        map as unknown as {
          off: (ev: string, h: (e: DrawUpdateEvent) => void) => void;
        }
      ).off('draw.update', onUpdate);
      try {
        map.removeControl(draw);
      } catch {
        /* map disposed */
      }
    };
  }, [map, target, activeTool, clear]);

  return null;
}
