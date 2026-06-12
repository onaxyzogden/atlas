/**
 * ActWorkHighlightLayer — transient paddock "locate" outline for the Act
 * work panel. A WorkItemRow's Locate button sets
 * `workExecutionStore.highlightPaddockId`; this layer outlines that paddock
 * (from livestockStore geometry) and fitBounds to it. Mounted as a
 * DiagnoseMap render-prop child alongside VegetationSurveyLayer and follows
 * the same source/layer idiom: one GeoJSON source, ensure-layer on first
 * add, re-applied on `style.load`, best-effort teardown.
 *
 * The highlight auto-clears after a short dwell so the locate ping never
 * becomes stale canvas state (and clears on unmount/deselect).
 */

import { useEffect, useMemo } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useLivestockStore } from '../../../../store/livestockStore.js';
import { useWorkExecutionStore } from '../../../../store/workExecutionStore.js';

const SOURCE_ID = 'act-work-highlight-src';
const LINE_LAYER = 'act-work-highlight-line';
const GLOW_LAYER = 'act-work-highlight-glow';

const HIGHLIGHT_DWELL_MS = 6000;

const EMPTY: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function ActWorkHighlightLayer({ map, projectId }: Props) {
  const paddocks = useLivestockStore((s) => s.paddocks);
  const highlightPaddockId = useWorkExecutionStore((s) => s.highlightPaddockId);

  const target = useMemo(() => {
    if (!highlightPaddockId) return null;
    return (
      paddocks.find(
        (p) => p.id === highlightPaddockId && p.projectId === projectId,
      ) ?? null
    );
  }, [paddocks, highlightPaddockId, projectId]);

  const data = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!target) return EMPTY;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: target.name },
          geometry: target.geometry,
        },
      ],
    };
  }, [target]);

  // Source + layers lifecycle (survives basemap swaps via style.load).
  useEffect(() => {
    const apply = () => {
      try {
        const existing = map.getSource(SOURCE_ID) as
          | maplibregl.GeoJSONSource
          | undefined;
        if (existing) {
          existing.setData(data);
        } else {
          map.addSource(SOURCE_ID, { type: 'geojson', data });
        }
        if (!map.getLayer(GLOW_LAYER)) {
          map.addLayer({
            id: GLOW_LAYER,
            type: 'line',
            source: SOURCE_ID,
            paint: {
              'line-color': '#c4a265',
              'line-width': 8,
              'line-opacity': 0.25,
              'line-blur': 4,
            },
          });
        }
        if (!map.getLayer(LINE_LAYER)) {
          map.addLayer({
            id: LINE_LAYER,
            type: 'line',
            source: SOURCE_ID,
            paint: {
              'line-color': '#c4a265',
              'line-width': 2.5,
            },
          });
        }
      } catch {
        /* map mid-teardown; the next style.load re-applies */
      }
    };

    apply();
    const onStyle = () => apply();
    map.on('style.load', onStyle);

    return () => {
      try {
        map.off('style.load', onStyle);
        for (const id of [LINE_LAYER, GLOW_LAYER]) {
          if (map.getLayer(id)) map.removeLayer(id);
        }
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        /* map already disposed */
      }
    };
  }, [map, data]);

  // Locate behaviour: fly to the paddock, then auto-clear the highlight.
  useEffect(() => {
    if (!target) return;
    try {
      const [minX, minY, maxX, maxY] = turf.bbox(target.geometry);
      map.fitBounds(
        [
          [minX, minY],
          [maxX, maxY],
        ],
        { padding: 80, maxZoom: 17, duration: 600 },
      );
    } catch {
      /* degenerate geometry — skip the camera move, keep the outline */
    }
    const timer = window.setTimeout(() => {
      useWorkExecutionStore.getState().setHighlight(null);
    }, HIGHLIGHT_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [map, target]);

  // Deselect on unmount so a stale id never re-pings on next mount.
  useEffect(
    () => () => {
      useWorkExecutionStore.getState().setHighlight(null);
    },
    [],
  );

  return null;
}
