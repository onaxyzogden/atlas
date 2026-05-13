/**
 * useContinuousPointDrawTool — keeps a point-drop tool armed across many
 * single clicks, exits on double-click or Escape.
 *
 * Used by useDesignElementDrawTool when the active element's drawMode is
 * `'draw_point'` (trees and other point design elements). For polygon /
 * line kinds the original MapboxDraw flow is kept, since dblclick already
 * means "finish polygon" there.
 */

import { useEffect, useRef } from 'react';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';

const DBLCLICK_WINDOW_MS = 260;
const DBLCLICK_PIXEL_TOLERANCE = 4;

interface Args {
  map: MaplibreMap;
  onPlace: (lngLat: [number, number]) => void;
  onExit: () => void;
  /** When false, the hook is a no-op. Default true. */
  enabled?: boolean;
}

export function useContinuousPointDrawTool({
  map,
  onPlace,
  onExit,
  enabled = true,
}: Args) {
  const onPlaceRef = useRef(onPlace);
  const onExitRef = useRef(onExit);
  useEffect(() => {
    onPlaceRef.current = onPlace;
  }, [onPlace]);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    if (!enabled) return;
    const canvas = map.getCanvas();
    const prevCursor = canvas.style.cursor;
    canvas.style.cursor = 'crosshair';

    const dblclickZoomEnabled = map.doubleClickZoom.isEnabled();
    if (dblclickZoomEnabled) map.doubleClickZoom.disable();

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

    const onClick = (e: MapMouseEvent) => {
      const { x, y } = e.point;
      const { lng, lat } = e.lngLat;

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
    window.addEventListener('keydown', onKeyDown);

    return () => {
      // Drop any pending placement — if the user is mid-double-click we
      // don't want a stray tree to fall after the tool has been torn down.
      if (pendingTimer !== null) clearTimeout(pendingTimer);
      pendingTimer = null;
      pendingPoint = null;
      map.off('click', onClick);
      map.off('dblclick', onDblClick);
      window.removeEventListener('keydown', onKeyDown);
      if (dblclickZoomEnabled) map.doubleClickZoom.enable();
      canvas.style.cursor = prevCursor;
    };
  }, [map, enabled]);
}
