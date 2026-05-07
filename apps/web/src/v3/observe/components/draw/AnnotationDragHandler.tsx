/**
 * AnnotationDragHandler — point drag-reposition for the OBSERVE map.
 *
 * Activates when the selection store contains exactly one *point* kind
 * annotation (neighbourPin / household / highPoint / soilSample / swotTag).
 * On mousedown over that feature it suspends MapLibre's default drag-pan,
 * pushes the feature into a separate "preview" GeoJSON source, and tracks
 * pointer movement until mouseup — at which point the canonical store is
 * patched via `writePointPosition()` and drag-pan resumes.
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

/** MapLibre point layers we'll listen on for drag start. Mirrors the layer
 *  ids `ObserveAnnotationLayers` registers for point kinds. */
const POINT_LAYER_IDS = [
  'observe-anno-human-points', // neighbour + household
  'observe-anno-topography-points', // highPoint
  'observe-anno-soil-points', // soilSample
  'observe-anno-swot-points', // swotTag
];

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

    let dragging = false;
    let pointerStartedOnFeature = false;

    const onLayerMouseDown = (
      e: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[];
      },
    ) => {
      // Only honour a mousedown on the *currently selected* feature; mousedowns
      // on neighbouring point features should fall through to the click
      // handler (which will reset selection to that one).
      const f = e.features?.[0];
      if (!f) return;
      const props = f.properties ?? {};
      const featKind = (props as Record<string, unknown>).annoKind;
      const featId = (props as Record<string, unknown>).annoId;
      if (featKind !== kind || featId !== id) return;

      pointerStartedOnFeature = true;
      dragging = true;
      e.preventDefault();
      map.dragPan.disable();
      map.getCanvas().style.cursor = 'grabbing';
      setPreview([e.lngLat.lng, e.lngLat.lat]);
    };

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (!dragging) return;
      setPreview([e.lngLat.lng, e.lngLat.lat]);
    };

    const onMouseUp = (e: maplibregl.MapMouseEvent) => {
      if (!dragging) return;
      dragging = false;
      map.dragPan.enable();
      map.getCanvas().style.cursor = '';
      setPreview(null);
      // Only commit if the pointer actually started on the selected feature
      // (defensive — we already gate above, but a race can leave dragging=true
      // if mousedown didn't land on a feature).
      if (!pointerStartedOnFeature) return;
      pointerStartedOnFeature = false;
      // Sanity-check the record still exists; if it was deleted mid-drag,
      // bail without writing.
      if (readPointPosition(kind, id) === null) return;
      writePointPosition(kind, id, [e.lngLat.lng, e.lngLat.lat]);
    };

    // Wire mousedown on every point layer; the handler self-filters by
    // kind+id so non-selected features fall through.
    for (const layerId of POINT_LAYER_IDS) {
      if (map.getLayer(layerId)) {
        map.on('mousedown', layerId, onLayerMouseDown);
      }
    }
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);

    return () => {
      for (const layerId of POINT_LAYER_IDS) {
        map.off('mousedown', layerId, onLayerMouseDown);
      }
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      // Restore default state in case unmount races with an active drag.
      map.dragPan.enable();
      map.getCanvas().style.cursor = '';
      setPreview(null);
    };
  }, [map, selected]);

  // Unmount-time cleanup of the preview source/layer (not just on selection
  // change — we want the preview gone for good when leaving the map).
  useEffect(() => {
    return () => {
      if (!map) return;
      if (map.getLayer(PREVIEW_LAYER)) map.removeLayer(PREVIEW_LAYER);
      if (map.getSource(PREVIEW_SOURCE)) map.removeSource(PREVIEW_SOURCE);
    };
  }, [map]);

  return null;
}
