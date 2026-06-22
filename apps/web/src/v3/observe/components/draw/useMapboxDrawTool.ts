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
  SNAP_DRAW_POINT,
  SNAP_DRAW_LINE_STRING,
  SNAP_DRAW_POLYGON,
  snapDrawPointMode,
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
   * When true, draw with the snap-enabled custom modes (`snapDrawModes`) so the
   * dropped point / clicked vertex snaps to existing features — for all three
   * modes (`draw_point`, `draw_line_string`, `draw_polygon`). `snap:false` (the
   * default) keeps the stock modes, leaving every existing caller byte-for-byte
   * identical.
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
    // When `snap` is armed, route the active mode to its snap-enabled variant
    // (point / line / polygon) and register all three custom modes alongside the
    // stock set. `snap:false` leaves the stock modes untouched.
    const snapMode = !snap
      ? null
      : mode === 'draw_point'
        ? SNAP_DRAW_POINT
        : mode === 'draw_line_string'
          ? SNAP_DRAW_LINE_STRING
          : mode === 'draw_polygon'
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
              [SNAP_DRAW_POINT]: snapDrawPointMode,
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
    // MapboxDraw installs BOTH its GeoJSON sources/layers AND its click/tap
    // handlers inside connect(), which onAdd defers to a one-shot
    // `map.on('load')` whenever map.loaded() is false at addControl time. That
    // `load` never arrives when the first style failed to load (e.g. a keyed
    // basemap 403s, so the style errors out) or when a basemap fallback swapped
    // the style via setStyle (which fires styledata/style.load, NOT load). The
    // result is a tool that LOOKS armed (its mode is set) but is inert: a real
    // map click never becomes a `draw.create`, so seeding / boundary draws
    // silently no-op (the operator's "Seed zones from home does nothing, Clear
    // says 'No seeded zones'"). The connect-watchdog below detects the miss and
    // re-attaches as soon as the style is parsed — without waiting on tile load,
    // which on the keyless raster may never finish. `DRAW_COLD_SOURCE` is the
    // source connect() installs — its presence proves connect actually ran.
    const DRAW_COLD_SOURCE = 'mapbox-gl-draw-cold';

    // Enter the active mode + force the crosshair + tint the in-progress
    // polygon. Factored out so the watchdog can re-apply it after a re-add
    // (removeControl resets the mode to simple_select and drops the paint).
    const enterModeAndPaint = () => {
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
    };

    try {
      map.addControl(draw);
      enterModeAndPaint();
    } catch (err) {
      // The map may have been torn down mid-setup (e.g. the wizard "Redo"
      // affordance recreates DiagnoseMap's map): addControl/getLayer then throw
      // on a style-less map. That is benign — the next effect run wires the
      // fresh map. But a throw on a *live* map is a real attach failure worth
      // surfacing rather than silently disabling the tool (a silent swallow
      // here once masked a draw-engine starvation bug). Distinguish the two.
      let mapAlive = false;
      try {
        mapAlive = Boolean((map as { getStyle?: () => unknown }).getStyle?.());
      } catch {
        /* style gone — torn-down map, benign */
      }
      if (mapAlive) {
        console.warn(
          '[useMapboxDrawTool] draw control failed to attach to a live map:',
          err,
        );
      }
      return;
    }

    // Connect-watchdog. MapboxDraw's connect() (which installs both the GeoJSON
    // sources/layers AND the click handlers) runs synchronously only when
    // map.loaded() is true at addControl time; otherwise onAdd defers to
    // map.on('load') plus a 16ms poll that ALSO gates on map.loaded(). And
    // map.loaded() stays false until every source's TILES finish loading — which,
    // on the keyless Esri raster fallback (after a keyed basemap 403s and we
    // setStyle to satellite), can be never. So the tool looks armed (its mode +
    // crosshair are set optimistically right after addControl) yet every click is
    // inert because connect() — and its handlers — never ran. Waiting on
    // map.loaded() therefore can't fix it; instead we gate on the STYLE being
    // parsed (tile-independent) and then force onAdd down its synchronous connect
    // branch by reporting loaded===true for exactly the one synchronous
    // addControl call. `DRAW_COLD_SOURCE` is the source connect() installs — its
    // presence proves connect actually ran, and short-circuiting on it keeps the
    // already-working keyed path a pure no-op.
    const styleReady = () => (map.getStyle()?.layers?.length ?? 0) > 0;
    let rewiring = false; // re-entrancy guard. add/removeControl mutate the
    //                       style, which fires `styledata` — but asynchronously,
    //                       on a later frame, by which point the getSource
    //                       short-circuit below already covers us (maplibre
    //                       4.7.1 emits no synchronous styledata from
    //                       addSource/addLayer). So this flag is belt-and-
    //                       suspenders, not load-bearing.
    const ensureDrawConnected = () => {
      if (rewiring) return;
      if (map.getSource(DRAW_COLD_SOURCE)) return; // connect already ran
      if (!styleReady()) return; // no parsed style yet — nothing to attach to
      rewiring = true;
      // Force onAdd's synchronous `if (map.loaded()) connect()` branch. The style
      // is parsed, so connect() is safe NOW even though the tiles (and thus
      // map.loaded()) may never settle on the keyless raster. The override spans
      // only the one synchronous addControl call; the honest implementation is
      // restored immediately after, in the finally — even on the early return.
      const realLoaded = map.loaded.bind(map);
      try {
        try {
          map.removeControl(draw);
        } catch {
          /* control was only half-added; the re-add below re-runs onAdd cleanly */
        }
        (map as unknown as { loaded: () => boolean }).loaded = () => true;
        try {
          map.addControl(draw);
        } catch {
          return; // style mid-swap; the next styledata/idle/style.load retries
        } finally {
          (map as unknown as { loaded: () => boolean }).loaded = realLoaded;
        }
        if (map.getSource(DRAW_COLD_SOURCE)) enterModeAndPaint();
      } finally {
        rewiring = false;
      }
    };
    map.on('styledata', ensureDrawConnected);
    map.on('idle', ensureDrawConnected);
    map.on('style.load', ensureDrawConnected);
    // A map that already fell back to the keyless raster BEFORE this tool mounted
    // emits no further style event to ride, so attempt the connect on the spot —
    // a no-op if the first addControl above already connected (cold source set)
    // or the style isn't parsed yet (a later style event then retries).
    ensureDrawConnected();

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
        map.off('styledata', ensureDrawConnected);
        map.off('idle', ensureDrawConnected);
        map.off('style.load', ensureDrawConnected);
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
