import { useEffect, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { api } from '../../lib/apiClient.js';
import { useMapStore } from '../../store/mapStore.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

interface AgroforestryOverlayProps {
  projectId: string;
  map: maplibregl.Map | null;
}

const SOURCE_ID = 'agroforestry-zones';
const CIRCLE_LAYER_ID = 'agroforestry-zones-circle';
const STROKE_LAYER_ID = 'agroforestry-zones-stroke';

const INTERVENTION_KEYS = [
  'silvopasture_candidate',
  'food_forest_candidate',
] as const;

/**
 * §7 Agroforestry candidate overlay — paints the subset of
 * `soil_regeneration` features whose `primaryIntervention` is a
 * tree-based regenerative system (silvopasture, food forest). Note
 * "forest regeneration" from the manifest label is currently folded
 * into the food-forest class; the processor does not yet emit a
 * distinct forest-regeneration intervention type.
 */
export default function AgroforestryOverlay({ projectId, map }: AgroforestryOverlayProps) {
  const visible = useMapStore((s) => s.agroforestryVisible);
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
          const filtered: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: data.geojsonData.features.filter((f) =>
              INTERVENTION_KEYS.includes(
                (f.properties as { primaryIntervention?: string } | null)?.primaryIntervention as (typeof INTERVENTION_KEYS)[number],
              ),
            ),
          };
          setGeojson(filtered);
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
          const interventionColor: maplibregl.ExpressionSpecification = [
            'match',
            ['get', 'primaryIntervention'],
            'silvopasture_candidate', '#4a8f4e',   // forest green (grazing + trees)
            'food_forest_candidate', '#2e7a4a',    // deep canopy green
            '#5a7a4a',
          ];
          map.addLayer({
            id: CIRCLE_LAYER_ID,
            type: 'circle',
            source: SOURCE_ID,
            paint: {
              'circle-color': interventionColor,
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
              'circle-stroke-color': interventionColor,
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

export function AgroforestryToggle({ compact = false }: { compact?: boolean } = {}) {
  const visible = useMapStore((s) => s.agroforestryVisible);
  const setVisible = useMapStore((s) => s.setAgroforestryVisible);
  if (compact) {
    return (
      <DelayedTooltip label="Silvopasture / food-forest zones" position="right">
        <button
          onClick={() => setVisible(!visible)}
          aria-pressed={visible}
          className={`spine-btn${visible ? ' signifier-shimmer' : ''}`}
          data-active={visible}
          aria-label="Toggle silvopasture and food-forest zones overlay"
        >
          {/* Lucide TreePine */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7Z" />
            <path d="M12 22v-3" />
          </svg>
        </button>
      </DelayedTooltip>
    );
  }
  return (
    <DelayedTooltip label="Toggle silvopasture / food-forest overlay" position="bottom">
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
          background: visible ? '#4a8f4e' : 'var(--color-chrome-bg-translucent)',
          color: visible ? '#f5f5f5' : '#c4b49a',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'auto',
        }}
      >
        Agroforestry
      </button>
    </DelayedTooltip>
  );
}
