/**
 * AnnotationSectorHandles — on-map drag affordances for a selected sector.
 *
 * When `useObserveSelectionStore` holds exactly one `sector` selection, this
 * component paints three drag handles at the wedge anchor and two arc-edge
 * positions, then wires pointer listeners that mutate the sector record
 * (and the homestead, for the apex handle) on drag.
 *
 * Handle roles:
 *   - apex     : the wedge anchor (homestead). Drag → `useHomesteadStore.set`,
 *                which moves all sectors for this project simultaneously
 *                (apex is shared). When no homestead is yet set, dragging
 *                this handle promotes the centroid-fallback into a real
 *                placement.
 *   - bearing  : a point along the wedge axis at ~600 m. Drag → updates
 *                `bearingDeg` (rotation about the apex).
 *   - arc      : a point on one arc edge at ~580 m. Drag → updates `arcDeg`
 *                (clamped to [10, 350]).
 *
 * Pattern mirrors `AnnotationDragHandler.tsx` (custom GeoJSON source +
 * pointer listeners + `dragPan.disable()` while engaged). Self-gates on
 * selection so cost is zero when no sector is selected.
 *
 * No DOM output.
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useObserveSelectionStore } from '../../../../store/observeSelectionStore.js';
import { useExternalForcesStore } from '../../../../store/externalForcesStore.js';
import { useHomesteadStore } from '../../../../store/homesteadStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../../store/builtEnvironmentStoreV2.js';
import { resolveEffectiveHomestead } from '../../hooks/useEffectiveHomestead.js';
import {
  bearingFromPoints,
  arcDegFromPointer,
} from '../../utils/sectorMath.js';

interface Props {
  map: MaplibreMap;
  projectId: string | null;
}

const SOURCE_ID = 'observe-sector-handles';
const LAYER_ID = 'observe-sector-handles-circle';

const APEX_COLOR = '#3a2a1a';
const BEARING_COLOR = '#c4a265';
const ARC_COLOR = '#7aa86a';

const BEARING_RADIUS_M = 600;
const ARC_RADIUS_M = 580;

type HandleRole = 'apex' | 'bearing' | 'arc';

type LayerPointerEvent = (
  | maplibregl.MapMouseEvent
  | maplibregl.MapTouchEvent
) & {
  features?: maplibregl.MapGeoJSONFeature[];
};

type MapPointerEvent = maplibregl.MapMouseEvent | maplibregl.MapTouchEvent;

function isTouchEvent(e: MapPointerEvent): e is maplibregl.MapTouchEvent {
  return (
    typeof TouchEvent !== 'undefined' && e.originalEvent instanceof TouchEvent
  );
}

function pointAt(
  apex: [number, number],
  bearingDeg: number,
  radiusM: number,
): [number, number] {
  const dest = turf.destination(turf.point(apex), radiusM / 1000, bearingDeg, {
    units: 'kilometers',
  });
  const c = dest.geometry.coordinates as [number, number];
  return c;
}

export default function AnnotationSectorHandles({ map, projectId }: Props) {
  const selected = useObserveSelectionStore((s) => s.selected);

  // Self-gate: only engage when a single sector is selected. We track the
  // sector by id only — the live record + homestead are read from
  // `useExternalForcesStore.getState()` / `useHomesteadStore.getState()`
  // inside pointer handlers, so we deliberately do NOT subscribe to the
  // record itself here. Subscribing would re-run this effect on every
  // mid-drag store update, tearing down listeners and stranding the drag.
  const sole = selected.length === 1 ? selected[0] : null;
  const sectorId =
    sole !== null && sole !== undefined && sole.kind === 'sector'
      ? sole.id
      : null;

  useEffect(() => {
    if (!map) return;
    const sectorRecord = sectorId
      ? (useExternalForcesStore
          .getState()
          .sectors.find((x) => x.id === sectorId) ?? null)
      : null;
    if (!projectId || !sectorRecord) {
      // Tear down the layer + source if they exist; nothing else to do.
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        /* map already removed */
      }
      return;
    }

    // Read through the effective resolver so a single existing residence
    // supplies the apex when no explicit homestead is placed (ADR
    // wiki/decisions/2026-05-13-atlas-residence-zone0-derivation.md).
    const effective = resolveEffectiveHomestead(projectId);
    const center = map.getCenter();
    const apex: [number, number] = effective.point ?? [center.lng, center.lat];

    const buildData = (
      apexNow: [number, number],
      bearingDeg: number,
      arcDeg: number,
    ): GeoJSON.FeatureCollection => {
      const apexFeat: GeoJSON.Feature = {
        type: 'Feature',
        properties: { handleRole: 'apex', color: APEX_COLOR },
        geometry: { type: 'Point', coordinates: apexNow },
      };
      const bearingFeat: GeoJSON.Feature = {
        type: 'Feature',
        properties: { handleRole: 'bearing', color: BEARING_COLOR },
        geometry: {
          type: 'Point',
          coordinates: pointAt(apexNow, bearingDeg, BEARING_RADIUS_M),
        },
      };
      const arcFeat: GeoJSON.Feature = {
        type: 'Feature',
        properties: { handleRole: 'arc', color: ARC_COLOR },
        geometry: {
          type: 'Point',
          coordinates: pointAt(
            apexNow,
            bearingDeg + arcDeg / 2,
            ARC_RADIUS_M,
          ),
        },
      };
      return {
        type: 'FeatureCollection',
        features: [arcFeat, bearingFeat, apexFeat], // apex last → top of z-order
      };
    };

    const ensureLayer = () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: buildData(apex, sectorRecord.bearingDeg, sectorRecord.arcDeg),
        });
      } else {
        const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
        src.setData(
          buildData(apex, sectorRecord.bearingDeg, sectorRecord.arcDeg),
        );
      }
      if (!map.getLayer(LAYER_ID)) {
        map.addLayer({
          id: LAYER_ID,
          type: 'circle',
          source: SOURCE_ID,
          paint: {
            'circle-radius': [
              'case',
              ['==', ['get', 'handleRole'], 'apex'],
              9,
              7,
            ],
            'circle-color': ['get', 'color'],
            'circle-stroke-color': '#1f1a14',
            'circle-stroke-width': 2,
            'circle-opacity': 0.95,
            'circle-pitch-alignment': 'map',
          },
        });
      }
      // Keep handles above other layers.
      try {
        map.moveLayer(LAYER_ID);
      } catch {
        /* not in style yet */
      }
    };

    ensureLayer();

    // Drag state.
    let role: HandleRole | null = null;
    let touchRotateSuspended = false;

    const onLayerPointerDown = (e: LayerPointerEvent) => {
      if (isTouchEvent(e)) {
        const touches = (e.originalEvent as TouchEvent).touches;
        if (touches.length !== 1) return;
      }
      const f = e.features?.[0];
      if (!f) return;
      const r = (f.properties ?? {}).handleRole as HandleRole | undefined;
      if (!r) return;
      role = r;
      e.preventDefault();
      map.dragPan.disable();
      if (isTouchEvent(e)) {
        map.touchZoomRotate.disableRotation();
        touchRotateSuspended = true;
      }
      map.getCanvas().style.cursor = 'grabbing';
    };

    const onPointerMove = (e: MapPointerEvent) => {
      if (!role) return;
      const lng = e.lngLat.lng;
      const lat = e.lngLat.lat;
      // Read the freshest record + apex on every move so chained drags
      // (apex then bearing) compose correctly.
      const rec = useExternalForcesStore
        .getState()
        .sectors.find((x) => x.id === sectorRecord.id);
      if (!rec) return;
      const liveHomestead =
        resolveEffectiveHomestead(projectId).point ?? apex;

      if (role === 'apex') {
        useHomesteadStore.getState().set(projectId, [lng, lat]);
        // Re-render handle source against new apex.
        const src = map.getSource(SOURCE_ID) as
          | maplibregl.GeoJSONSource
          | undefined;
        src?.setData(buildData([lng, lat], rec.bearingDeg, rec.arcDeg));
        return;
      }

      if (role === 'bearing') {
        const newBearing = bearingFromPoints(
          liveHomestead[0],
          liveHomestead[1],
          lng,
          lat,
        );
        useExternalForcesStore.getState().updateSector(rec.id, {
          bearingDeg: ((newBearing % 360) + 360) % 360,
        });
        const src = map.getSource(SOURCE_ID) as
          | maplibregl.GeoJSONSource
          | undefined;
        src?.setData(buildData(liveHomestead, newBearing, rec.arcDeg));
        return;
      }

      if (role === 'arc') {
        const newArc = arcDegFromPointer(
          liveHomestead[0],
          liveHomestead[1],
          lng,
          lat,
          rec.bearingDeg,
        );
        useExternalForcesStore.getState().updateSector(rec.id, {
          arcDeg: newArc,
        });
        const src = map.getSource(SOURCE_ID) as
          | maplibregl.GeoJSONSource
          | undefined;
        src?.setData(buildData(liveHomestead, rec.bearingDeg, newArc));
        return;
      }
    };

    const onPointerUp = () => {
      if (!role) return;
      role = null;
      try {
        map.dragPan.enable();
        if (touchRotateSuspended) {
          map.touchZoomRotate.enableRotation();
          touchRotateSuspended = false;
        }
        map.getCanvas().style.cursor = '';
      } catch {
        /* map already removed */
      }
    };

    const onEnter = () => {
      map.getCanvas().style.cursor = 'grab';
    };
    const onLeave = () => {
      if (role) return;
      map.getCanvas().style.cursor = '';
    };

    map.on('mousedown', LAYER_ID, onLayerPointerDown);
    map.on('touchstart', LAYER_ID, onLayerPointerDown);
    map.on('mousemove', onPointerMove);
    map.on('touchmove', onPointerMove);
    map.on('mouseup', onPointerUp);
    map.on('touchend', onPointerUp);
    map.on('mouseenter', LAYER_ID, onEnter);
    map.on('mouseleave', LAYER_ID, onLeave);

    // External-update subscriptions: when bearing/arc/intensity or homestead
    // change from outside this drag (e.g., the form, another handle, undo),
    // refresh the handle source positions without re-running the effect.
    // Imperative `setData` keeps listeners alive — the bug we just fixed.
    const refresh = () => {
      const rec = useExternalForcesStore
        .getState()
        .sectors.find((x) => x.id === sectorRecord.id);
      if (!rec) return;
      const hs = resolveEffectiveHomestead(projectId).point;
      const apexNow: [number, number] = hs ?? apex;
      const src = map.getSource(SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      src?.setData(buildData(apexNow, rec.bearingDeg, rec.arcDeg));
    };
    const unsubSectors = useExternalForcesStore.subscribe(refresh);
    const unsubHomestead = useHomesteadStore.subscribe(refresh);
    // BE store edits to the residence-kind entity (move, label, removal)
    // change the derived centroid — refresh handles when no explicit
    // homestead is placed so the wedge tracks the dwelling.
    const unsubBE = useBuiltEnvironmentStoreV2.subscribe(refresh);

    return () => {
      try {
        unsubSectors();
        unsubHomestead();
        unsubBE();
        map.off('mousedown', LAYER_ID, onLayerPointerDown);
        map.off('touchstart', LAYER_ID, onLayerPointerDown);
        map.off('mousemove', onPointerMove);
        map.off('touchmove', onPointerMove);
        map.off('mouseup', onPointerUp);
        map.off('touchend', onPointerUp);
        map.off('mouseenter', LAYER_ID, onEnter);
        map.off('mouseleave', LAYER_ID, onLeave);
        map.dragPan.enable();
        if (touchRotateSuspended) {
          map.touchZoomRotate.enableRotation();
        }
        map.getCanvas().style.cursor = '';
      } catch {
        /* map already removed */
      }
    };
  }, [map, projectId, sectorId]);

  // Final unmount — remove source + layer.
  useEffect(() => {
    return () => {
      if (!map) return;
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        /* map already removed */
      }
    };
  }, [map]);

  return null;
}
