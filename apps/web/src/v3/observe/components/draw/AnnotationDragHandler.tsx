/**
 * AnnotationDragHandler — point drag-reposition for the OBSERVE map.
 *
 * Activates when the selection store contains exactly one *point* kind
 * annotation (neighbourPin / household / highPoint / soilSample / swotTag).
 * On pointer-down (mouse or single-finger touch) over that feature it
 * suspends MapLibre's default drag-pan, pushes the feature into a
 * separate "preview" GeoJSON source, and tracks pointer movement until
 * pointer-up — at which point the canonical store is patched via
 * `writePointPosition()` and drag-pan resumes.
 *
 * Touch handling (added 2026-05-07):
 *  - Pointer-down on a feature gates by `originalEvent.touches.length === 1`
 *    so two-finger pinch-zoom never engages drag.
 *  - A 4-pixel screen-space movement threshold prevents tap-to-select from
 *    being hijacked by drag (taps with no movement leave selection
 *    unchanged via the click handler in ObserveAnnotationLayers).
 *  - touchZoomRotate.disableRotation() is called only while engaged to
 *    keep pinch-zoom available when no annotation is being dragged.
 *
 * Line/polygon vertex edits are handled by a sibling hook driven by
 * MapboxDraw's `direct_select` mode (see ObserveDrawHost).
 *
 * No DOM output — the component only attaches map listeners.
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useObserveSelectionStore } from '../../../../store/observeSelectionStore.js';
import {
  POINT_KINDS,
  readPointPosition,
  writePointPosition,
} from './annotationGeometryRegistry.js';

interface Props {
  map: MaplibreMap;
}

const PREVIEW_SOURCE = 'observe-anno-drag-preview';
const PREVIEW_LAYER = 'observe-anno-drag-preview-circle';
const PREVIEW_COLOR = '#c4a265';

/** Pixel distance the pointer must travel from down-position before drag
 *  engages. Below this, the gesture is treated as a tap and falls through
 *  to the click handler (which manages selection). */
const DRAG_MOVE_THRESHOLD_PX = 4;

/** MapLibre point layers we'll listen on for drag start. Mirrors the layer
 *  ids `ObserveAnnotationLayers` registers for point kinds. */
const POINT_LAYER_IDS = [
  'observe-anno-human-points', // neighbour + household
  'observe-anno-topography-points', // highPoint
  'observe-anno-soil-points', // soilSample
  'observe-anno-swot-points', // swotTag
];

type LayerPointerEvent = (
  | maplibregl.MapMouseEvent
  | maplibregl.MapTouchEvent
) & {
  features?: maplibregl.MapGeoJSONFeature[];
};

type MapPointerEvent = maplibregl.MapMouseEvent | maplibregl.MapTouchEvent;

function isTouchEvent(
  e: MapPointerEvent,
): e is maplibregl.MapTouchEvent {
  return (
    typeof TouchEvent !== 'undefined' &&
    e.originalEvent instanceof TouchEvent
  );
}

export default function AnnotationDragHandler({ map }: Props) {
  const selected = useObserveSelectionStore((s) => s.selected);

  useEffect(() => {
    if (!map) return;

    // Only engage when exactly one point annotation is selected. Anything
    // else (zero, multi, or non-point single) → no listeners attached.
    if (selected.length !== 1) return;
    const sole = selected[0];
    if (!sole || !POINT_KINDS.has(sole.kind)) return;

    const { kind, id } = sole;

    // Make sure preview source + layer exist (cheap idempotent setup).
    const ensurePreview = () => {
      if (!map.getSource(PREVIEW_SOURCE)) {
        map.addSource(PREVIEW_SOURCE, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!map.getLayer(PREVIEW_LAYER)) {
        map.addLayer({
          id: PREVIEW_LAYER,
          type: 'circle',
          source: PREVIEW_SOURCE,
          paint: {
            'circle-radius': 8,
            'circle-color': PREVIEW_COLOR,
            'circle-opacity': 0.5,
            'circle-stroke-color': '#3a2a1a',
            'circle-stroke-width': 1.5,
          },
        });
      }
    };
    ensurePreview();

    const setPreview = (coord: [number, number] | null) => {
      const src = map.getSource(PREVIEW_SOURCE) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!src) return;
      src.setData(
        coord
          ? {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: {},
                  geometry: { type: 'Point', coordinates: coord },
                },
              ],
            }
          : { type: 'FeatureCollection', features: [] },
      );
    };

    // Drag state
    let armed = false; // pointer down on the selected feature, but not yet over the threshold
    let dragging = false; // crossed the threshold; preview is live
    let pointerStartedOnFeature = false;
    let startScreen: { x: number; y: number } | null = null;
    let touchRotateSuspended = false;

    const onLayerPointerDown = (e: LayerPointerEvent) => {
      // Multi-finger touches are pinch-zoom; never engage drag.
      if (isTouchEvent(e)) {
        const touches = (e.originalEvent as TouchEvent).touches;
        if (touches.length !== 1) return;
      }

      // Only honour a pointer-down on the *currently selected* feature;
      // pointer-downs on neighbouring point features should fall through
      // to the click handler (which will reset selection to that one).
      const f = e.features?.[0];
      if (!f) return;
      const props = f.properties ?? {};
      const featKind = (props as Record<string, unknown>).annoKind;
      const featId = (props as Record<string, unknown>).annoId;
      if (featKind !== kind || featId !== id) return;

      pointerStartedOnFeature = true;
      armed = true;
      dragging = false;
      startScreen = { x: e.point.x, y: e.point.y };
      // Don't preventDefault yet — we want a pure tap (no movement) to fall
      // through to the click handler. Only suspend dragPan + cursor when
      // we cross the threshold below.
    };

    const engageDrag = (e: MapPointerEvent) => {
      dragging = true;
      e.preventDefault();
      map.dragPan.disable();
      if (isTouchEvent(e)) {
        // Single-finger pan is already covered by dragPan.disable(); but
        // disable rotation gestures while dragging so a finger drift can't
        // double as a rotate-pinch.
        map.touchZoomRotate.disableRotation();
        touchRotateSuspended = true;
      }
      map.getCanvas().style.cursor = 'grabbing';
      setPreview([e.lngLat.lng, e.lngLat.lat]);
    };

    const onPointerMove = (e: MapPointerEvent) => {
      if (!armed) return;
      if (!dragging) {
        if (!startScreen) return;
        const dx = e.point.x - startScreen.x;
        const dy = e.point.y - startScreen.y;
        if (dx * dx + dy * dy < DRAG_MOVE_THRESHOLD_PX * DRAG_MOVE_THRESHOLD_PX) {
          return; // still under threshold — treat as tap
        }
        engageDrag(e);
        return;
      }
      setPreview([e.lngLat.lng, e.lngLat.lat]);
    };

    const onPointerUp = (e: MapPointerEvent) => {
      if (!armed) return;
      const wasDragging = dragging;
      armed = false;
      dragging = false;
      startScreen = null;
      map.dragPan.enable();
      if (touchRotateSuspended) {
        map.touchZoomRotate.enableRotation();
        touchRotateSuspended = false;
      }
      map.getCanvas().style.cursor = '';
      setPreview(null);

      if (!wasDragging) {
        // Tap with no movement — leave the selection click handler to its
        // own devices and bail without writing.
        pointerStartedOnFeature = false;
        return;
      }

      // Only commit if the pointer actually started on the selected feature
      // (defensive — we already gate above, but a race can leave dragging
      // true if mousedown didn't land on a feature).
      if (!pointerStartedOnFeature) return;
      pointerStartedOnFeature = false;

      // For touchend, MapLibre fires a synthetic event whose `lngLat` is
      // derived from the last touch point — same shape we want.
      // Sanity-check the record still exists; if it was deleted mid-drag,
      // bail without writing.
      if (readPointPosition(kind, id) === null) return;
      writePointPosition(kind, id, [e.lngLat.lng, e.lngLat.lat]);
    };

    // Wire mousedown + touchstart on every point layer; the handler
    // self-filters by kind+id so non-selected features fall through.
    for (const layerId of POINT_LAYER_IDS) {
      if (map.getLayer(layerId)) {
        map.on('mousedown', layerId, onLayerPointerDown);
        map.on('touchstart', layerId, onLayerPointerDown);
      }
    }
    map.on('mousemove', onPointerMove);
    map.on('touchmove', onPointerMove);
    map.on('mouseup', onPointerUp);
    map.on('touchend', onPointerUp);

    return () => {
      // Wrap in try/catch: DiagnoseMap calls setMap(null) + map.remove()
      // before this cleanup fires, leaving the map in a destroyed state where
      // map.off() and map.dragPan.enable() access null style internals.
      try {
        for (const layerId of POINT_LAYER_IDS) {
          map.off('mousedown', layerId, onLayerPointerDown);
          map.off('touchstart', layerId, onLayerPointerDown);
        }
        map.off('mousemove', onPointerMove);
        map.off('touchmove', onPointerMove);
        map.off('mouseup', onPointerUp);
        map.off('touchend', onPointerUp);
        // Restore default state in case unmount races with an active drag.
        map.dragPan.enable();
        if (touchRotateSuspended) {
          map.touchZoomRotate.enableRotation();
          touchRotateSuspended = false;
        }
        map.getCanvas().style.cursor = '';
      } catch {
        // map already removed — nothing to clean up
      }
      setPreview(null);
    };
  }, [map, selected]);

  // Unmount-time cleanup of the preview source/layer (not just on selection
  // change — we want the preview gone for good when leaving the map).
  useEffect(() => {
    return () => {
      if (!map) return;
      try {
        if (map.getLayer(PREVIEW_LAYER)) map.removeLayer(PREVIEW_LAYER);
        if (map.getSource(PREVIEW_SOURCE)) map.removeSource(PREVIEW_SOURCE);
      } catch {
        // map already removed — nothing to clean up
      }
    };
  }, [map]);

  return null;
}
