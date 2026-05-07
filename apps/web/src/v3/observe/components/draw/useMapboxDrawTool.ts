/**
 * useMapboxDrawTool — shared MapboxDraw lifecycle for OBSERVE annotation tools.
 *
 * Centralises the addControl / changeMode / draw.* listener / removeControl
 * dance from `BoundaryTool` so each draw tool component can be a tiny shell
 * that only owns its store-write logic and its popover readout.
 *
 * Lifecycle:
 *   1. Mount → instantiate MapboxDraw (no built-in controls), add to map,
 *      switch to the requested mode.
 *   2. On draw.create → call `onComplete(geometry)` once. We then auto-clear
 *      the draw control so multiple drops don't accumulate ghosts.
 *   3. Unmount → remove the control gracefully (try/catch — map may already
 *      be torn down by the parent route change).
 *
 * Modes mirror MapboxDraw constants:
 *   - 'draw_point'        → emits GeoJSON.Point
 *   - 'draw_line_string'  → emits GeoJSON.LineString
 *   - 'draw_polygon'      → emits GeoJSON.Polygon
 */

import { useEffect, useRef, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';

export type DrawMode = 'draw_point' | 'draw_line_string' | 'draw_polygon';

export type DrawGeometry =
  | GeoJSON.Point
  | GeoJSON.LineString
  | GeoJSON.Polygon;

export interface UseMapboxDrawToolArgs<G extends DrawGeometry> {
  map: MaplibreMap;
  mode: DrawMode;
  /** Called once when the user completes a draw (create event). */
  onComplete: (geometry: G) => void;
}

export interface UseMapboxDrawToolReturn<G extends DrawGeometry> {
  /** Most recent completed geometry (for popover readout). null until drawn. */
  geometry: G | null;
}

export function useMapboxDrawTool<G extends DrawGeometry>({
  map,
  mode,
  onComplete,
}: UseMapboxDrawToolArgs<G>): UseMapboxDrawToolReturn<G> {
  const [geometry, setGeometry] = useState<G | null>(null);
  // Stash latest onComplete so the effect doesn't re-init on identity change.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
    });
    map.addControl(draw);
    // MapboxDraw's `changeMode` is typed as a string-literal overload that
    // doesn't include our union directly; cast through to satisfy.
    (draw.changeMode as (m: string) => unknown)(mode);

    const expectedType =
      mode === 'draw_point'
        ? 'Point'
        : mode === 'draw_line_string'
          ? 'LineString'
          : 'Polygon';

    const onCreate = () => {
      const all = draw.getAll();
      const feat = all.features[all.features.length - 1];
      if (!feat || feat.geometry.type !== expectedType) return;
      const geom = feat.geometry as G;
      setGeometry(geom);
      onCompleteRef.current(geom);
      // Clear so subsequent draws (on the same active-tool session) don't
      // accumulate. The parent typically clears activeTool after onComplete,
      // unmounting this hook anyway.
      draw.deleteAll();
    };

    map.on('draw.create', onCreate);

    return () => {
      map.off('draw.create', onCreate);
      try {
        map.removeControl(draw);
      } catch {
        /* map already disposed */
      }
    };
  }, [map, mode]);

  return { geometry };
}
