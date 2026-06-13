/**
 * useContinuousPointDrawTool — keeps a point-drop tool armed across many
 * single clicks, exits on double-click or Escape.
 *
 * Used by useDesignElementDrawTool when the active element's drawMode is
 * `'draw_point'` (trees and other point design elements). For polygon /
 * line kinds the original MapboxDraw flow is kept, since dblclick already
 * means "finish polygon" there.
 *
 * Spacing-snap (2026-05-12): when the optional `spacing` arg is set, the
 * hook renders a translucent ring at the cursor (radius = spacing.radiusM)
 * and turns it red while `spacing.validate` returns `!ok`. Clicks that
 * fail validation dispatch a `plan:tree-rejected` CustomEvent on the
 * window (carrying the reason string) instead of placing.
 */

import { useEffect, useRef } from 'react';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { snapDrawPoint, type SnapTargets } from '../../../lib/snapPoint.js';
import { useMapToolStore } from '../../../observe/components/measure/useMapToolStore.js';

const DBLCLICK_WINDOW_MS = 260;
const DBLCLICK_PIXEL_TOLERANCE = 4;

const RING_SOURCE_ID = 'preview-tree-spacing';
const RING_FILL_LAYER_ID = 'preview-tree-spacing-fill';
const RING_LINE_LAYER_ID = 'preview-tree-spacing-line';

// Estate gold / fired clay — match the selection-halo palette used by
// DesignElementLayers. Green-tinted gold for "valid", red clay for "blocked".
const RING_COLOR_VALID = '#7fa05a';
const RING_COLOR_BLOCKED = '#8a4f3a';

type ValidateResult = { ok: true } | { ok: false; reason: string };

interface Args {
  map: MaplibreMap;
  onPlace: (lngLat: [number, number]) => void;
  onExit: () => void;
  /** When false, the hook is a no-op. Default true. */
  enabled?: boolean;
  /**
   * When set, render a cursor-following ring at this radius (metres) and
   * use `validate` to colour green/red + gate click placement.
   */
  spacing?: {
    radiusM: number;
    validate: (lngLat: [number, number]) => ValidateResult;
  };
  /**
   * Opt-in vertex/edge snapping. When provided, targets are captured once at
   * arm time and every drop (and the spacing ring) snaps to the nearest
   * existing vertex/edge within the 8 px radius (via the pure `snapDrawPoint`).
   * Snapping runs BEFORE the spacing `validate` gate so validation sees the
   * snapped point. Omit (or return empty targets) to place exactly at the click.
   */
  getSnapTargets?: () => SnapTargets;
}

export function useContinuousPointDrawTool({
  map,
  onPlace,
  onExit,
  enabled = true,
  spacing,
  getSnapTargets,
}: Args) {
  const onPlaceRef = useRef(onPlace);
  const onExitRef = useRef(onExit);
  const spacingRef = useRef(spacing);
  const getSnapTargetsRef = useRef(getSnapTargets);
  useEffect(() => {
    onPlaceRef.current = onPlace;
  }, [onPlace]);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);
  useEffect(() => {
    spacingRef.current = spacing;
  }, [spacing]);
  useEffect(() => {
    getSnapTargetsRef.current = getSnapTargets;
  }, [getSnapTargets]);

  // Whether spacing is active is part of the effect's identity so the
  // preview-ring source/layer lifecycle stays clean on arm/disarm. We
  // don't include radiusM here — radius changes are handled inline by
  // rebuilding the circle geometry from spacingRef on each mousemove.
  const spacingActive = !!spacing;

  useEffect(() => {
    if (!enabled) return;
    const canvas = map.getCanvas();
    const prevCursor = canvas.style.cursor;
    canvas.style.cursor = 'crosshair';

    const dblclickZoomEnabled = map.doubleClickZoom.isEnabled();
    if (dblclickZoomEnabled) map.doubleClickZoom.disable();

    // Snap targets are captured once here, at arm time — matching the
    // mapbox-draw snap modes (targets = existing features at the moment the
    // draw session begins). `snap` rewrites a raw lng/lat to the nearest
    // existing vertex/edge when one is within the 8 px radius (via the pure
    // `snapDrawPoint`), else returns the point unchanged. When no targets are
    // provided it is a no-op, so behaviour away from features is unchanged.
    const snapTargets = getSnapTargetsRef.current?.() ?? null;
    const snap = (lng: number, lat: number): [number, number] => {
      // Magnet toggle (Phase 4): read live so flipping snapping off mid-draw
      // lets a drop land exactly at the click even atop a target. Mirrors the
      // central gate in `snapDrawModes.applySnap` for the mapbox-draw modes.
      if (!snapTargets || !useMapToolStore.getState().snapEnabled) {
        return [lng, lat];
      }
      return snapDrawPoint(map, [lng, lat], snapTargets).position;
    };

    let pendingTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingPoint: { x: number; y: number; lng: number; lat: number } | null =
      null;

    const clearPending = () => {
      if (pendingTimer !== null) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
      pendingPoint = null;
    };

    // ── Preview-ring source/layer (spacing snap) ──────────────────────
    let ringMounted = false;
    const emptyFc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    };

    const mountRing = () => {
      if (!spacingActive || ringMounted) return;
      if (!map.getSource(RING_SOURCE_ID)) {
        map.addSource(RING_SOURCE_ID, { type: 'geojson', data: emptyFc });
      }
      if (!map.getLayer(RING_FILL_LAYER_ID)) {
        map.addLayer({
          id: RING_FILL_LAYER_ID,
          type: 'fill',
          source: RING_SOURCE_ID,
          paint: {
            'fill-color': [
              'case',
              ['==', ['get', 'valid'], false],
              RING_COLOR_BLOCKED,
              RING_COLOR_VALID,
            ],
            'fill-opacity': 0.18,
          },
        });
      }
      if (!map.getLayer(RING_LINE_LAYER_ID)) {
        map.addLayer({
          id: RING_LINE_LAYER_ID,
          type: 'line',
          source: RING_SOURCE_ID,
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'valid'], false],
              RING_COLOR_BLOCKED,
              RING_COLOR_VALID,
            ],
            'line-width': 1.5,
            'line-opacity': 0.85,
          },
        });
      }
      ringMounted = true;
    };

    const unmountRing = () => {
      if (map.getLayer(RING_LINE_LAYER_ID)) map.removeLayer(RING_LINE_LAYER_ID);
      if (map.getLayer(RING_FILL_LAYER_ID)) map.removeLayer(RING_FILL_LAYER_ID);
      if (map.getSource(RING_SOURCE_ID)) map.removeSource(RING_SOURCE_ID);
      ringMounted = false;
    };

    const updateRing = (lngLat: [number, number]) => {
      const s = spacingRef.current;
      if (!s) return;
      const src = map.getSource(RING_SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!src) return;
      const valid = s.validate(lngLat).ok;
      const circle = turf.circle(lngLat, s.radiusM, {
        units: 'meters',
        steps: 48,
        properties: { valid },
      });
      src.setData({
        type: 'FeatureCollection',
        features: [circle as GeoJSON.Feature<GeoJSON.Polygon>],
      });
    };

    mountRing();

    const onMouseMove = (e: MapMouseEvent) => {
      if (!spacingRef.current) return;
      // Snap the ring centre so the preview previews the actual drop point.
      updateRing(snap(e.lngLat.lng, e.lngLat.lat));
    };

    const onClick = (e: MapMouseEvent) => {
      const { x, y } = e.point;
      // Snap the click to the nearest existing vertex/edge (when snapping is
      // armed and a target is in range) BEFORE validation/placement. The raw
      // pixel x/y stay raw — dblclick detection compares screen pixels, not
      // snapped coords, so a snap never trips the second-click-exits path.
      const [lng, lat] = snap(e.lngLat.lng, e.lngLat.lat);

      if (
        pendingPoint &&
        Math.abs(pendingPoint.x - x) <= DBLCLICK_PIXEL_TOLERANCE &&
        Math.abs(pendingPoint.y - y) <= DBLCLICK_PIXEL_TOLERANCE
      ) {
        // Second click within the dblclick window — exit without placing.
        clearPending();
        onExitRef.current();
        return;
      }

      // Spacing-snap gate: validate before scheduling the placement.
      // A rejected click never schedules the timer so the
      // second-click-exits path is unaffected.
      const s = spacingRef.current;
      if (s) {
        const result = s.validate([lng, lat]);
        if (!result.ok) {
          window.dispatchEvent(
            new CustomEvent('plan:tree-rejected', {
              detail: { reason: result.reason },
            }),
          );
          return;
        }
      }

      // First click — schedule placement; if a second click arrives in
      // the window it will be intercepted above.
      clearPending();
      pendingPoint = { x, y, lng, lat };
      pendingTimer = setTimeout(() => {
        const p = pendingPoint;
        pendingTimer = null;
        pendingPoint = null;
        if (!p) return;
        onPlaceRef.current([p.lng, p.lat]);
      }, DBLCLICK_WINDOW_MS);
    };

    const onDblClick = (e: MapMouseEvent) => {
      // Defensive — MapLibre fires `dblclick` in addition to two `click`s.
      // The click handler above usually handles exit first; this branch
      // catches edge cases (e.g. listener ordering on certain browsers).
      e.preventDefault();
      clearPending();
      onExitRef.current();
    };

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        clearPending();
        onExitRef.current();
      }
    };

    map.on('click', onClick);
    map.on('dblclick', onDblClick);
    if (spacingActive) map.on('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      // Drop any pending placement — if the user is mid-double-click we
      // don't want a stray tree to fall after the tool has been torn down.
      if (pendingTimer !== null) clearTimeout(pendingTimer);
      pendingTimer = null;
      pendingPoint = null;
      map.off('click', onClick);
      map.off('dblclick', onDblClick);
      if (spacingActive) map.off('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      if (dblclickZoomEnabled) map.doubleClickZoom.enable();
      canvas.style.cursor = prevCursor;
      unmountRing();
    };
  }, [map, enabled, spacingActive]);
}
