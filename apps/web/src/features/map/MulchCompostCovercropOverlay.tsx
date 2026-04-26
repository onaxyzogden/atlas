import { useEffect, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { api } from '../../lib/apiClient.js';
import { useMapStore } from '../../store/mapStore.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

interface MulchCompostCovercropOverlayProps {
  projectId: string;
  map: maplibregl.Map | null;
}

const SOURCE_ID = 'mulch-compost-covercrop-zones';
const CIRCLE_LAYER_ID = 'mulch-compost-covercrop-zones-circle';
const STROKE_LAYER_ID = 'mulch-compost-covercrop-zones-stroke';

const INTERVENTION_KEYS = [
  'mulching_priority',
  'compost_application',
  'cover_crop_candidate',
] as const;

/**
 * §7 Surface-intervention overlay — paints the subset of
 * `soil_regeneration` features whose `primaryIntervention` is a
 * soil-surface treatment (mulching, compost, cover crop). Shares the
 * processor output with RestorationPriorityOverlay; this overlay just
 * filters the same FeatureCollection client-side.
 */
export default function MulchCompostCovercropOverlay({ projectId, map }: MulchCompostCovercropOverlayProps) {
  const visible = useMapStore((s) => s.mulchCovercropVisible);
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
            'mulching_priority', '#b59a6e',      // straw / dry mulch
            'compost_application', '#6b4f3a',    // humus brown
            'cover_crop_candidate', '#7fb98a',   // young legume green
            '#9c8b6e',
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

export function MulchCompostCovercropToggle({ compact = false }: { compact?: boolean } = {}) {
  const visible = useMapStore((s) => s.mulchCovercropVisible);
  const setVisible = useMapStore((s) => s.setMulchCovercropVisible);
  if (compact) {
    return (
      <DelayedTooltip label="Mulching / compost / cover-crop zones" position="right">
        <button
          onClick={() => setVisible(!visible)}
          aria-pressed={visible}
          className={`spine-btn${visible ? ' signifier-shimmer' : ''}`}
          data-active={visible}
          aria-label="Toggle mulch, compost, and cover-crop zones overlay"
        >
          {/* Lucide Leaf */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.96a1 1 0 0 1 1.8.8c0 3.5-.5 6.5-2 9.5s-5 6.5-8 6.8z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6" />
          </svg>
        </button>
      </DelayedTooltip>
    );
  }
  return (
    <DelayedTooltip label="Toggle mulch / compost / cover-crop overlay" position="bottom">
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
          background: visible ? '#7fb98a' : 'var(--color-chrome-bg-translucent)',
          color: visible ? '#1a1a1a' : '#c4b49a',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'auto',
        }}
      >
        Mulch / Cover
      </button>
    </DelayedTooltip>
  );
}
