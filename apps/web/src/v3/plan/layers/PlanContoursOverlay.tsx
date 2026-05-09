/**
 * PlanContoursOverlay — Tier C / C2 read-only map layer.
 *
 * Mounts MapTiler's vector contour tileset (source-layer `contour`,
 * `ele` property in metres above sea level) on the Plan canvas so a
 * steward placing keyline-aligned tracks, swales, or contour-orchards
 * sees the lines they're meant to align to.
 *
 * Mirrors `DesignContoursOverlay` (Design canvas) — same source, same
 * paint. Plan and Design draw on different map instances so the layers
 * don't collide; both read the global `topography` toggle from
 * `useMatrixTogglesStore` for a single user-level switch.
 *
 * Idempotent ensure-on-styledata so basemap swaps don't double-add.
 */

import { useEffect } from 'react';
import { maplibregl, CONTOUR_TILES_URL } from '../../../lib/maplibre.js';
import { useMatrixTogglesStore } from '../../../store/matrixTogglesStore.js';

const SOURCE_ID = 'plan-contours-source';
const LINE_LAYER = 'plan-contours-line';
const LABEL_LAYER = 'plan-contours-label';

interface Props {
  map: maplibregl.Map;
}

export default function PlanContoursOverlay({ map }: Props) {
  const visible = useMatrixTogglesStore((s) => s.topography);

  useEffect(() => {
    if (!map) return;

    const ensure = () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, { type: 'vector', url: CONTOUR_TILES_URL });
      }
      if (!map.getLayer(LINE_LAYER)) {
        map.addLayer({
          id: LINE_LAYER,
          type: 'line',
          source: SOURCE_ID,
          'source-layer': 'contour',
          paint: {
            'line-color': '#dca87c',
            'line-width': ['case', ['==', ['%', ['get', 'ele'], 100], 0], 1.2, 0.5],
            'line-opacity': 0.6,
          },
        });
      }
      if (!map.getLayer(LABEL_LAYER)) {
        map.addLayer({
          id: LABEL_LAYER,
          type: 'symbol',
          source: SOURCE_ID,
          'source-layer': 'contour',
          filter: ['==', ['%', ['get', 'ele'], 100], 0],
          layout: {
            'symbol-placement': 'line',
            'text-field': ['concat', ['to-string', ['get', 'ele']], ' m'],
            'text-size': 10,
            'text-font': ['Noto Sans Regular'],
          },
          paint: {
            'text-color': '#3d2f1d',
            'text-halo-color': '#f2ede3',
            'text-halo-width': 1.2,
          },
        });
      }
      [LINE_LAYER, LABEL_LAYER].forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
        }
      });
    };

    const ready = () => (map.getStyle()?.layers?.length ?? 0) > 0;
    if (ready()) ensure();
    const onStyle = () => {
      if (!ready()) return;
      ensure();
    };
    map.on('styledata', onStyle);
    return () => {
      map.off('styledata', onStyle);
    };
  }, [map, visible]);

  return null;
}
