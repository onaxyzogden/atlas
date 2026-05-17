/**
 * useZoneSizeGuide — live snap-assist guide ring for the Zone draw tool.
 *
 * Renders a dashed geodesic circle at the selected Z-level's Mollison
 * absolute radius (see `zoneSizeGuide.ts`) so the steward can size a
 * hand-drawn zone to convention. It is a tracing aid only — never blocks
 * or snaps the actual geometry.
 *
 * Anchor:
 *  - `'freehand'` → follows the cursor until the first polygon vertex is
 *    clicked, then locks to that vertex; releases on `draw.create`.
 *  - `'cursor'`   → always follows the cursor (dimensions mode has no
 *    draft polygon and commits on a single click).
 *
 * Owns one source + one dashed line layer + one label layer; idempotent
 * add/remove on enable/unmount. Z5 (no target) → nothing drawn.
 */

import { useEffect, useRef } from 'react';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import { ringCircle } from '../layers/zoneRingConstants.js';
import {
  guideRadiusM,
  zoneGuideLabel,
  type ZLevel,
} from './zoneSizeGuide.js';

const SOURCE_ID = '__zone-size-guide-src';
const LINE_LAYER_ID = '__zone-size-guide-line';
const LABEL_LAYER_ID = '__zone-size-guide-label';

export type ZoneGuideAnchor = 'freehand' | 'cursor';

export interface UseZoneSizeGuideArgs {
  map: MaplibreMap;
  zLevel: ZLevel;
  /** How the ring centre tracks input. Default `'freehand'`. */
  anchor?: ZoneGuideAnchor;
  /** When false the hook is a no-op (no layers mounted). Default true. */
  enabled?: boolean;
}

function emptyFC(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

export function useZoneSizeGuide({
  map,
  zLevel,
  anchor = 'freehand',
  enabled = true,
}: UseZoneSizeGuideArgs): void {
  const zRef = useRef<ZLevel>(zLevel);
  const anchorModeRef = useRef<ZoneGuideAnchor>(anchor);
  // Cursor position and (freehand only) the locked first-vertex anchor.
  const cursorRef = useRef<[number, number] | null>(null);
  const lockRef = useRef<[number, number] | null>(null);
  // Imperative redraw, swapped in once the effect mounts the layers.
  const redrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    zRef.current = zLevel;
    redrawRef.current();
  }, [zLevel]);

  useEffect(() => {
    anchorModeRef.current = anchor;
    if (anchor === 'cursor') lockRef.current = null;
    redrawRef.current();
  }, [anchor]);

  useEffect(() => {
    if (!enabled) return;

    try {
      if (map.getLayer(LABEL_LAYER_ID)) map.removeLayer(LABEL_LAYER_ID);
      if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    } catch {
      /* ignore */
    }

    map.addSource(SOURCE_ID, { type: 'geojson', data: emptyFC() });
    map.addLayer({
      id: LINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': '#1d9bf0',
        'line-opacity': 0.9,
        'line-width': 2,
        'line-dasharray': [3, 3],
      },
    });
    map.addLayer({
      id: LABEL_LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'symbol-placement': 'line',
        'text-field': ['get', 'label'],
        'text-size': 12,
        'text-keep-upright': true,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': '#1d9bf0',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.8,
      },
    });

    const setData = (fc: GeoJSON.FeatureCollection) => {
      const src = map.getSource(SOURCE_ID) as
        | { setData: (d: GeoJSON.FeatureCollection) => void }
        | undefined;
      src?.setData(fc);
    };

    const redraw = () => {
      const z = zRef.current;
      const radiusM = guideRadiusM(z);
      const center = lockRef.current ?? cursorRef.current;
      if (radiusM == null || !center) {
        setData(emptyFC());
        return;
      }
      const ring = ringCircle(
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: center },
        },
        radiusM,
      );
      ring.properties = { label: zoneGuideLabel(z) };
      setData({ type: 'FeatureCollection', features: [ring] });
    };
    redrawRef.current = redraw;

    let rafId: number | null = null;
    const schedule = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        redraw();
      });
    };

    const onMove = (e: MapMouseEvent) => {
      cursorRef.current = [e.lngLat.lng, e.lngLat.lat];
      if (!lockRef.current) schedule();
    };

    // Freehand: the first map click is the first polygon vertex — lock the
    // ring there so it stops chasing the cursor while the user traces.
    const onClick = (e: MapMouseEvent) => {
      if (anchorModeRef.current !== 'freehand') return;
      if (lockRef.current) return;
      lockRef.current = [e.lngLat.lng, e.lngLat.lat];
      schedule();
    };

    // Polygon committed → release the lock for the next draw.
    const onCreate = () => {
      lockRef.current = null;
      schedule();
    };

    map.on('mousemove', onMove);
    map.on('click', onClick);
    map.on('draw.create', onCreate);

    return () => {
      map.off('mousemove', onMove);
      map.off('click', onClick);
      map.off('draw.create', onCreate);
      if (rafId !== null) cancelAnimationFrame(rafId);
      lockRef.current = null;
      redrawRef.current = () => {};
      try {
        if (map.getLayer(LABEL_LAYER_ID)) map.removeLayer(LABEL_LAYER_ID);
        if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        /* map already disposed */
      }
    };
  }, [map, enabled]);
}
