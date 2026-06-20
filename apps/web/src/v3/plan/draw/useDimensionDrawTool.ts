/**
 * useDimensionDrawTool — parametric "Dimensions" draw lifecycle, parallel to
 * `useMapboxDrawTool`. Renders a ghost MapLibre layer that follows the cursor
 * in the requested shape (rect / circle / line) at the dimensions provided,
 * commits on a single click, and dismisses on ESC.
 *
 * Commit gesture: a `mousedown`→`mouseup` that stays within MapLibre's click
 * tolerance — NOT the high-level `click` event. The Dimensions tool is reached
 * by toggling out of freehand, which tears down a MapboxDraw control
 * (`map.removeControl`); after that teardown MapLibre suppresses the next
 * synthesized `click`, while the raw `mousedown`/`mousemove`/`mouseup` stream
 * keeps flowing (the ghost-follow proves `mousemove` still fires). Committing on
 * the raw stream sidesteps the suppression and still ignores genuine drags/pans
 * (they move beyond the tolerance).
 *
 * The hook owns one source + two layers (fill + outline) on the supplied map
 * and tears them down on unmount or when `enabled` flips to false.
 */

import { useEffect, useRef } from 'react';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import {
  rectangleAt,
  circleAt,
  lineFrom,
  type LngLat,
} from './dimensionGeometry.js';
import type { DimensionShape } from './dimensionDrawStore.js';

export interface DimensionValues {
  widthM: number;
  depthM: number;
  radiusM: number;
  lengthM: number;
  bearingDeg: number;
  rotationDeg: number;
}

type GhostGeom = GeoJSON.Polygon | GeoJSON.LineString;

export interface UseDimensionDrawToolArgs {
  map: MaplibreMap;
  shape: DimensionShape;
  values: DimensionValues;
  /** Called once on click; receives the parametric geometry. */
  onComplete: (geometry: GhostGeom) => void;
  /** When false, the hook is a no-op (no ghost layer mounted). Default true. */
  enabled?: boolean;
}

const SOURCE_ID = '__dim-draw-ghost-src';
const FILL_LAYER_ID = '__dim-draw-ghost-fill';
const LINE_LAYER_ID = '__dim-draw-ghost-line';

// Mirrors MapLibre's default `clickTolerance` (px). A mousedown→mouseup pair
// that stays within this radius is a placement click; beyond it the steward is
// dragging/panning, so no feature is committed.
const CLICK_TOLERANCE_PX = 3;

function buildGeom(
  shape: DimensionShape,
  anchor: LngLat,
  v: DimensionValues,
): GhostGeom {
  if (shape === 'rect') {
    const w = Math.max(0.1, v.widthM);
    const d = Math.max(0.1, v.depthM);
    return rectangleAt(anchor, w, d, v.rotationDeg);
  }
  if (shape === 'circle') {
    const r = Math.max(0.1, v.radiusM);
    return circleAt(anchor, r);
  }
  const l = Math.max(0.1, v.lengthM);
  return lineFrom(anchor, l, v.bearingDeg);
}

function emptyFC(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

export function useDimensionDrawTool({
  map,
  shape,
  values,
  onComplete,
  enabled = true,
}: UseDimensionDrawToolArgs): void {
  // Stash the latest props so the effect doesn't tear down on every render.
  const onCompleteRef = useRef(onComplete);
  const shapeRef = useRef(shape);
  const valuesRef = useRef(values);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    shapeRef.current = shape;
    valuesRef.current = values;
  }, [onComplete, shape, values]);

  useEffect(() => {
    if (!enabled) return;

    // Add ghost source + layers (idempotent: clean up first if a previous
    // mount left them around).
    try {
      if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
      if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    } catch {
      /* ignore */
    }

    map.addSource(SOURCE_ID, { type: 'geojson', data: emptyFC() });
    map.addLayer({
      id: FILL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.18,
      },
      filter: ['==', ['geometry-type'], 'Polygon'],
    });
    map.addLayer({
      id: LINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': '#2563eb',
        'line-width': 2,
        'line-dasharray': [2, 2],
      },
    });

    // Cursor is owned by useMapCursor — this hook only runs while a
    // `plan.*` draw tool is armed, so drawArmed → 'crosshair' is
    // computed there.

    const updateGhost = (lngLat: LngLat) => {
      const geom = buildGeom(shapeRef.current, lngLat, valuesRef.current);
      const src = map.getSource(SOURCE_ID) as
        | { setData: (d: GeoJSON.FeatureCollection) => void }
        | undefined;
      if (!src) return;
      src.setData({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: geom }],
      });
    };

    const onMove = (e: MapMouseEvent) => {
      updateGhost([e.lngLat.lng, e.lngLat.lat]);
    };
    const commit = (e: MapMouseEvent) => {
      const anchor: LngLat = [e.lngLat.lng, e.lngLat.lat];
      const geom = buildGeom(shapeRef.current, anchor, valuesRef.current);
      onCompleteRef.current(geom);
      // Hide ghost after commit; parent typically clears activeTool.
      const src = map.getSource(SOURCE_ID) as
        | { setData: (d: GeoJSON.FeatureCollection) => void }
        | undefined;
      src?.setData(emptyFC());
    };

    // Track the press point; commit on release only when the pointer barely
    // moved (a click, not a drag). Left button only — a right-click / context
    // gesture must never drop a feature.
    let downPoint: { x: number; y: number } | null = null;
    const onDown = (e: MapMouseEvent) => {
      if (e.originalEvent && e.originalEvent.button !== 0) {
        downPoint = null;
        return;
      }
      downPoint = { x: e.point.x, y: e.point.y };
    };
    const onUp = (e: MapMouseEvent) => {
      const start = downPoint;
      downPoint = null;
      if (!start) return;
      if (
        Math.abs(e.point.x - start.x) > CLICK_TOLERANCE_PX ||
        Math.abs(e.point.y - start.y) > CLICK_TOLERANCE_PX
      ) {
        return; // genuine drag / pan — not a placement click
      }
      commit(e);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const src = map.getSource(SOURCE_ID) as
        | { setData: (d: GeoJSON.FeatureCollection) => void }
        | undefined;
      src?.setData(emptyFC());
    };

    map.on('mousemove', onMove);
    map.on('mousedown', onDown);
    map.on('mouseup', onUp);
    window.addEventListener('keydown', onKey);

    return () => {
      map.off('mousemove', onMove);
      map.off('mousedown', onDown);
      map.off('mouseup', onUp);
      window.removeEventListener('keydown', onKey);
      try {
        if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
        if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        /* map already disposed */
      }
    };
  }, [map, enabled]);
}
