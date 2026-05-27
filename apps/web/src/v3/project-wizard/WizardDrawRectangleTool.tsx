/**
 * WizardDrawRectangleTool — drag-rectangle boundary picker.
 *
 * MapboxDraw 1.4 ships only point/line/polygon modes (no rectangle), and
 * `useMapboxDrawTool` mirrors that union — so this tool bypasses the
 * shared hook and drives a tiny preview directly on the map:
 *
 *   mousedown → record start corner, disable dragPan, paint a 4-corner
 *   mousemove → update opposite corner so the preview rubber-bands
 *   mouseup   → emit Polygon, restore dragPan, clear preview
 *
 * Pattern parallels `BoundaryTool`'s direct MapboxDraw usage — small,
 * isolated, and easy to extend later if the wider app adopts a rect
 * mode plugin.
 */

import { useEffect, useRef } from 'react';
import type {
  Map as MaplibreMap,
  MapMouseEvent,
  GeoJSONSource,
} from 'maplibre-gl';

const SOURCE_ID = 'wizard-rect-preview';
const FILL_LAYER_ID = 'wizard-rect-preview-fill';
const STROKE_LAYER_ID = 'wizard-rect-preview-stroke';

const EMPTY_FEATURE: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'Polygon', coordinates: [] },
};

interface WizardDrawRectangleToolProps {
  map: MaplibreMap;
  onComplete: (polygon: GeoJSON.Polygon) => void;
}

export default function WizardDrawRectangleTool({
  map,
  onComplete,
}: WizardDrawRectangleToolProps) {
  // Stash latest onComplete so the effect doesn't re-init on identity change.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const canvas = map.getCanvas();
    const prevCursor = canvas.style.cursor;
    canvas.style.cursor = 'crosshair';

    let start: { lng: number; lat: number } | null = null;
    let preview: GeoJSON.Polygon | null = null;

    const ensureLayers = () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, { type: 'geojson', data: EMPTY_FEATURE });
      }
      if (!map.getLayer(FILL_LAYER_ID)) {
        map.addLayer({
          id: FILL_LAYER_ID,
          type: 'fill',
          source: SOURCE_ID,
          paint: { 'fill-color': '#c4a265', 'fill-opacity': 0.18 },
        });
      }
      if (!map.getLayer(STROKE_LAYER_ID)) {
        map.addLayer({
          id: STROKE_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          paint: { 'line-color': '#c4a265', 'line-width': 2 },
        });
      }
    };

    const cleanupLayers = () => {
      for (const layerId of [STROKE_LAYER_ID, FILL_LAYER_ID]) {
        try {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
        } catch {
          /* style not loaded */
        }
      }
      try {
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        /* already gone */
      }
    };

    const rectangleFromCorners = (
      a: { lng: number; lat: number },
      b: { lng: number; lat: number },
    ): GeoJSON.Polygon => ({
      type: 'Polygon',
      coordinates: [
        [
          [a.lng, a.lat],
          [b.lng, a.lat],
          [b.lng, b.lat],
          [a.lng, b.lat],
          [a.lng, a.lat],
        ],
      ],
    });

    const writePreview = (poly: GeoJSON.Polygon) => {
      const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (!src) return;
      src.setData({ type: 'Feature', properties: {}, geometry: poly });
    };

    const onMouseDown = (e: MapMouseEvent) => {
      ensureLayers();
      start = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      preview = null;
      map.dragPan.disable();
    };

    const onMouseMove = (e: MapMouseEvent) => {
      if (!start) return;
      preview = rectangleFromCorners(start, {
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
      });
      writePreview(preview);
    };

    const onMouseUp = () => {
      map.dragPan.enable();
      const finalPoly = preview;
      const finalStart = start;
      start = null;
      preview = null;
      if (!finalPoly || !finalStart) return;
      // Reject degenerate (zero-area) drags — user accidentally clicked.
      const ring = finalPoly.coordinates[0];
      if (!ring || ring.length !== 5) return;
      const a = ring[0]!;
      const c = ring[2]!;
      if (a[0] === c[0] || a[1] === c[1]) return;
      onCompleteRef.current(finalPoly);
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      try {
        map.dragPan.enable();
      } catch {
        /* map disposed */
      }
      canvas.style.cursor = prevCursor;
      cleanupLayers();
    };
  }, [map]);

  return null;
}
