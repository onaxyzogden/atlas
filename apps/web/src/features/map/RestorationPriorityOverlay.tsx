import { useEffect, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { api } from '../../lib/apiClient.js';
import { useMapStore } from '../../store/mapStore.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

interface RestorationPriorityOverlayProps {
  projectId: string;
  map: maplibregl.Map | null;
}

const SOURCE_ID = 'restoration-priority-zones';
const CIRCLE_LAYER_ID = 'restoration-priority-zones-circle';
const STROKE_LAYER_ID = 'restoration-priority-zones-stroke';

/**
 * §7 Soil restoration priority overlay. Reads the `soil_regeneration` project
 * layer (produced by SoilRegenerationProcessor) and paints its zone centroids
 * as classed circles keyed on `properties.priorityClass` — critical / high /
 * moderate / low. Features are Points (grid centroids), not polygons, so the
 * overlay uses a circle layer sized by zoom and coloured on the priority
 * discriminator. Palette mirrors the §6 microclimate risk ramp for visual
 * continuity across stewardship overlays.
 */
export default function RestorationPriorityOverlay({ projectId, map }: RestorationPriorityOverlayProps) {
  const visible = useMapStore((s) => s.restorationPriorityVisible);
  const overlayOpacity = useMapStore((s) => s.overlayOpacity);
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!visible || fetched) return;
    api.layers
      .get(projectId, 'soil_regeneration')
      .then((res) => {
        const data = (res as { data?: { geojsonData?: GeoJSON.FeatureCollection | null } }).data;
        if (data?.geojsonData && data.geojsonData.type === 'FeatureCollection') {
          setGeojson(data.geojsonData);
        }
      })
      .catch(() => { /* layer not materialised yet — leave null */ })
      .finally(() => setFetched(true));
  }, [visible, fetched, projectId]);

  useEffect(() => {
    if (!map) return;

    const sync = () => {
      if (!map.isStyleLoaded()) return;

      if (visible && geojson) {
        const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        if (src) {
          src.setData(geojson);
          if (map.getLayer(CIRCLE_LAYER_ID)) {
            map.setPaintProperty(CIRCLE_LAYER_ID, 'circle-opacity', overlayOpacity * 0.7);
          }
          if (map.getLayer(STROKE_LAYER_ID)) {
            map.setPaintProperty(STROKE_LAYER_ID, 'circle-stroke-opacity', overlayOpacity * 0.9);
          }
        } else {
          map.addSource(SOURCE_ID, { type: 'geojson', data: geojson });
          const priorityColor: maplibregl.ExpressionSpecification = [
            'match',
            ['get', 'priorityClass'],
            'critical', '#c04a3a',
            'high', '#d68a4e',
            'moderate', '#d4c564',
            'low', '#6ba47a',
            '#9c8b6e',
          ];
          // Fill circles, sized by zoom — centroids represent ~1ha grid cells.
          map.addLayer({
            id: CIRCLE_LAYER_ID,
            type: 'circle',
            source: SOURCE_ID,
            paint: {
              'circle-color': priorityColor,
              'circle-opacity': overlayOpacity * 0.7,
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                10, 4,
                14, 8,
                18, 18,
              ],
            },
          });
          map.addLayer({
            id: STROKE_LAYER_ID,
            type: 'circle',
            source: SOURCE_ID,
            paint: {
              'circle-color': 'transparent',
              'circle-stroke-color': priorityColor,
              'circle-stroke-width': 1.2,
              'circle-stroke-opacity': overlayOpacity * 0.9,
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                10, 4,
                14, 8,
                18, 18,
              ],
            },
          });
        }
      } else {
        for (const id of [STROKE_LAYER_ID, CIRCLE_LAYER_ID]) {
          if (map.getLayer(id)) map.removeLayer(id);
        }
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      }
    };

    sync();
    map.on('style.load', sync);
    return () => {
      map.off('style.load', sync);
    };
  }, [map, visible, geojson, overlayOpacity]);

  return null;
}

export function RestorationPriorityToggle({ compact = false }: { compact?: boolean } = {}) {
  const visible = useMapStore((s) => s.restorationPriorityVisible);
  const setVisible = useMapStore((s) => s.setRestorationPriorityVisible);
  if (compact) {
    return (
      <DelayedTooltip label="Soil restoration priority zones" position="right">
        <button
          onClick={() => setVisible(!visible)}
          aria-pressed={visible}
          className={`spine-btn${visible ? ' signifier-shimmer' : ''}`}
          data-active={visible}
          aria-label="Toggle soil restoration priority overlay"
        >
          {/* Lucide Sprout — restoration / regeneration signifier */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 20h10" />
            <path d="M10 20c5.5-2.5.8-6.4 3-10" />
            <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
            <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
          </svg>
        </button>
      </DelayedTooltip>
    );
  }
  return (
    <DelayedTooltip label="Toggle soil restoration priority overlay" position="bottom">
      <button
        onClick={() => setVisible(!visible)}
        aria-pressed={visible}
        className={visible ? 'signifier-shimmer' : undefined}
        style={{
          padding: '6px 10px',
          borderRadius: 6,
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 500,
          background: visible ? '#d68a4e' : 'var(--color-chrome-bg-translucent)',
          color: visible ? '#1a1a1a' : '#c4b49a',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'auto',
        }}
      >
        Restoration
      </button>
    </DelayedTooltip>
  );
}
