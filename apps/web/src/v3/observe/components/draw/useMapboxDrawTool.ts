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
import type { SnapTargets } from '../../../lib/snapPoint.js';
import {
  SNAP_DRAW_LINE_STRING,
  SNAP_DRAW_POLYGON,
  snapDrawLineString,
  snapDrawPolygon,
} from './snapDrawModes.js';

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
  /**
   * Optional fill/stroke color for the in-progress polygon, so the preview
   * reads as the tool kind being drawn. Falls back to the universal
   * `MAPLIBRE_DRAW_STYLES` default when unset.
   */
  previewColor?: string;
  /**
   * When true (and the mode is a line/polygon mode), draw with the snap-enabled
   * custom modes (`snapDrawModes`) so clicked vertices snap to existing
   * features. `draw_point` and `snap:false` (the default) keep the stock modes,
   * leaving every existing caller byte-for-byte identical.
   */
  snap?: boolean;
  /**
   * Supplies the snap targets, evaluated once at mode start. Only consulted when
   * `snap` is true. Returns existing vertices/edges (fences, paddocks, boundary,
   * structures) to snap onto.
   */
  getSnapTargets?: () => SnapTargets;
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
  previewColor,
  snap = false,
  getSnapTargets,
}: UseMapboxDrawToolArgs<G>): UseMapboxDrawToolReturn<G> {
  const [geometry, setGeometry] = useState<G | null>(null);
  const [liveArea, setLiveArea] = useState<number | null>(null);
  const [liveLength, setLiveLength] = useState<number | null>(null);
  // Stash latest onComplete so the effect doesn't re-init on identity change.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  // Stash latest getSnapTargets so target-source identity churn doesn't re-init
  // the draw control mid-session.
  const getSnapTargetsRef = useRef(getSnapTargets);
  useEffect(() => {
    getSnapTargetsRef.current = getSnapTargets;
  }, [getSnapTargets]);

  useEffect(() => {
    if (!enabled) return;
    // Force a crosshair for the whole draw session. mapbox-gl-draw queues its
    // `mode-*` cursor classes and only flushes them in its render handler, which
    // never fires under MapLibre until the first mouse-move -- so CSS keyed on
    // those classes can't hold the crosshair from mode-start. Set it directly on
    // the canvas (the WizardDrawRectangleTool precedent) and restore on teardown.
    const canvas = map.getCanvas();
    const prevCursor = canvas.style.cursor;
    // Snap is only meaningful for the line/polygon modes; point drops never
    // snap. When armed, register the custom snap modes alongside the stock set.
    const snapMode =
      snap && mode === 'draw_line_string'
        ? SNAP_DRAW_LINE_STRING
        : snap && mode === 'draw_polygon'
          ? SNAP_DRAW_POLYGON
          : null;
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: MAPLIBRE_DRAW_STYLES,
      ...(snapMode
        ? {
            modes: {
              ...(MapboxDraw as unknown as { modes: Record<string, unknown> })
                .modes,
              [SNAP_DRAW_LINE_STRING]: snapDrawLineString,
              [SNAP_DRAW_POLYGON]: snapDrawPolygon,
            },
          }
        : {}),
    });
    // Guard the map-touching setup. The wizard "Redo" affordance clears the
    // boundary, which makes DiagnoseMap tear down and recreate its map; this
    // effect can then briefly hold a removed map whose internal style is gone,
    // so addControl / getLayer would throw "Cannot read properties of
    // undefined (reading 'getLayer')". Bail cleanly in that case - the next
    // effect run wires up the fresh map. Observe always passes a live map, so
    // its behaviour is unchanged.
    try {
      map.addControl(draw);
      canvas.style.cursor = 'crosshair';
      // MapboxDraw's `changeMode` is typed as a string-literal overload that
      // doesn't include our union directly; cast through to satisfy. When a
      // snap mode is active, enter it with the snap targets captured now.
      if (snapMode) {
        const snapTargets = getSnapTargetsRef.current?.() ?? {};
        (
          draw.changeMode as (m: string, opts?: { snapTargets: SnapTargets }) => unknown
        )(snapMode, { snapTargets });
      } else {
        (draw.changeMode as (m: string) => unknown)(mode);
      }

      // Tint the in-progress polygon to the active tool's color. MapboxDraw
      // adds these layers via addControl above and mutates only its GeoJSON
      // source thereafter, so a single paint override holds for the session.
      if (previewColor) {
        if (map.getLayer('gl-draw-polygon-fill')) {
          map.setPaintProperty(
            'gl-draw-polygon-fill',
            'fill-color',
            previewColor,
          );
          map.setPaintProperty(
            'gl-draw-polygon-fill',
            'fill-outline-color',
            previewColor,
          );
        }
        if (map.getLayer('gl-draw-polygon-stroke')) {
          map.setPaintProperty(
            'gl-draw-polygon-stroke',
            'line-color',
            previewColor,
          );
        }
      }
    } catch {
      /* map torn down during setup; nothing wired, nothing to clean up */
      return;
    }

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
      if (rafId !== null) cancelAnimationFrame(rafId);
      setLiveArea(null);
      setLiveLength(null);
      // Guard the whole map teardown: the map may already be disposed.
      try {
        canvas.style.cursor = prevCursor;
        map.off('draw.create', onCreate);
        map.off('draw.render', onRender);
        map.removeControl(draw);
      } catch {
        /* map already disposed */
      }
    };
  }, [map, mode, enabled, previewColor, snap]);

  return { geometry, liveArea, liveLength };
}
