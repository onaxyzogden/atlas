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
import * as turf from '@turf/turf';
import { MAPLIBRE_DRAW_STYLES } from './mapboxDrawStyles.js';

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
  /** When false, the hook is a no-op (no draw control mounted). Default true. */
  enabled?: boolean;
}

export interface UseMapboxDrawToolReturn<G extends DrawGeometry> {
  /** Most recent completed geometry (for popover readout). null until drawn. */
  geometry: G | null;
  /**
   * Live polygon area in m² while the user is mid-draw (and after completion
   * for `draw_polygon` mode). null when no polygon is in-flight, when fewer
   * than 3 vertices have been clicked, or when the active mode isn't a
   * polygon mode. Updates are coalesced to one paint via requestAnimationFrame
   * so the ~60Hz `draw.render` firehose during mouse-move doesn't thrash React.
   */
  liveArea: number | null;
  /**
   * Live polyline length in metres while the user is mid-draw (and after
   * completion for `draw_line_string` mode). null when no line is in-flight,
   * when fewer than 2 vertices have been clicked, or when the active mode
   * isn't a line mode. rAF-coalesced for the same reasons as liveArea.
   */
  liveLength: number | null;
}

export function useMapboxDrawTool<G extends DrawGeometry>({
  map,
  mode,
  onComplete,
  enabled = true,
}: UseMapboxDrawToolArgs<G>): UseMapboxDrawToolReturn<G> {
  const [geometry, setGeometry] = useState<G | null>(null);
  const [liveArea, setLiveArea] = useState<number | null>(null);
  const [liveLength, setLiveLength] = useState<number | null>(null);
  // Stash latest onComplete so the effect doesn't re-init on identity change.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!enabled) return;
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: MAPLIBRE_DRAW_STYLES,
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

    // Live-area pump (polygon mode only). MapboxDraw fires `draw.render` after
    // every internal render — every click, every mouse-move rubber-band tick.
    // We materialise the current draft polygon from `draw.getAll()`, compute
    // turf.area when the outer ring has ≥3 distinct vertices, and coalesce
    // setState through requestAnimationFrame so 60Hz render bursts result in
    // ≤1 React render per frame.
    let rafId: number | null = null;
    let pendingArea: number | null = null;
    let pendingLength: number | null = null;
    const flush = () => {
      rafId = null;
      setLiveArea((prev) => (prev === pendingArea ? prev : pendingArea));
      setLiveLength((prev) => (prev === pendingLength ? prev : pendingLength));
    };
    const onRender = () => {
      if (mode === 'draw_polygon') {
        const fc = draw.getAll();
        // Find the polygon with the most vertices — covers both draft and
        // direct_select edit paths.
        let best: GeoJSON.Feature<GeoJSON.Polygon> | null = null;
        for (const f of fc.features) {
          if (f.geometry?.type === 'Polygon') {
            const ring = f.geometry.coordinates[0];
            if (
              ring &&
              (!best ||
                ring.length > (best.geometry.coordinates[0]?.length ?? 0))
            ) {
              best = f as GeoJSON.Feature<GeoJSON.Polygon>;
            }
          }
        }
        if (best && (best.geometry.coordinates[0]?.length ?? 0) >= 3) {
          const a = turf.area(best);
          pendingArea = a > 0 ? a : null;
        } else {
          pendingArea = null;
        }
        pendingLength = null;
      } else if (mode === 'draw_line_string') {
        const fc = draw.getAll();
        let best: GeoJSON.Feature<GeoJSON.LineString> | null = null;
        for (const f of fc.features) {
          if (f.geometry?.type === 'LineString') {
            const coords = f.geometry.coordinates;
            if (
              coords &&
              (!best ||
                coords.length > (best.geometry.coordinates?.length ?? 0))
            ) {
              best = f as GeoJSON.Feature<GeoJSON.LineString>;
            }
          }
        }
        if (best && (best.geometry.coordinates?.length ?? 0) >= 2) {
          const m = turf.length(best, { units: 'meters' });
          pendingLength = m > 0 ? m : null;
        } else {
          pendingLength = null;
        }
        pendingArea = null;
      } else {
        pendingArea = null;
        pendingLength = null;
      }
      if (rafId === null) rafId = requestAnimationFrame(flush);
    };

    // ADDENDUM 7 (H-B1 hardening): read the new feature off the
    // `draw.create` event payload rather than `draw.getAll()`. The
    // event-payload form is the documented MapboxDraw contract and
    // avoids any ambiguity from stale features lingering in the draw
    // control between rapid mode switches.
    const onCreate = (e: { features?: GeoJSON.Feature[] }) => {
      const feat =
        (e?.features && e.features[0]) ??
        // Defensive fallback (e.g. mocked harnesses): re-query the
        // control if the event payload is missing.
        (() => {
          const all = draw.getAll();
          return all.features[all.features.length - 1];
        })();
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
    map.on('draw.render', onRender);

    return () => {
      map.off('draw.create', onCreate);
      map.off('draw.render', onRender);
      if (rafId !== null) cancelAnimationFrame(rafId);
      setLiveArea(null);
      setLiveLength(null);
      try {
        map.removeControl(draw);
      } catch {
        /* map already disposed */
      }
    };
  }, [map, mode, enabled]);

  return { geometry, liveArea, liveLength };
}
