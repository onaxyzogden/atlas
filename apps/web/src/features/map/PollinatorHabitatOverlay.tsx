import { useEffect, useMemo, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { api } from '../../lib/apiClient.js';
import { useMapStore } from '../../store/mapStore.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

interface PollinatorHabitatOverlayProps {
  projectId: string;
  map: maplibregl.Map | null;
}

const SOURCE_ID = 'pollinator-opportunity-zones';
const CIRCLE_LAYER_ID = 'pollinator-opportunity-zones-circle';
const STROKE_LAYER_ID = 'pollinator-opportunity-zones-stroke';

type PollinatorBand = 'high' | 'moderate' | 'low';

// primaryIntervention → pollinator-planting-opportunity band. silvopasture &
// food forest bring structural diversity + flowering trees; cover crops are
// species-dependent and therefore moderate; mulching/compost are soil-first
// interventions — low for pollinator forage in the short term.
function bandForIntervention(intervention: string | undefined | null): PollinatorBand {
  switch (intervention) {
    case 'silvopasture_candidate':
    case 'food_forest_candidate':
      return 'high';
    case 'cover_crop_candidate':
      return 'moderate';
    case 'mulching_priority':
    case 'compost_application':
    default:
      return 'low';
  }
}

function deriveFeatures(geojson: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: geojson.features.map((f) => ({
      ...f,
      properties: {
        ...(f.properties ?? {}),
        pollinatorBand: bandForIntervention(
          (f.properties as { primaryIntervention?: string } | null)?.primaryIntervention,
        ),
      },
    })),
  };
}

/**
 * §7 Pollinator-habitat opportunity overlay. Reads the `soil_regeneration`
 * layer (SoilRegenerationProcessor zone centroids) and paints each cell as a
 * classed circle keyed on a derived `pollinatorBand` — high / moderate / low —
 * from `primaryIntervention`. Represents *planting opportunity*, not current
 * habitat quality; corridor connectivity and true habitat-state rasters still
 * require substrate that does not yet exist in the pipeline.
 */
export default function PollinatorHabitatOverlay({ projectId, map }: PollinatorHabitatOverlayProps) {
  const visible = useMapStore((s) => s.pollinatorOpportunityVisible);
  const overlayOpacity = useMapStore((s) => s.overlayOpacity);
  const [rawGeojson, setRawGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!visible || fetched) return;
    api.layers
      .get(projectId, 'soil_regeneration')
      .then((res) => {
        const data = (res as { data?: { geojsonData?: GeoJSON.FeatureCollection | null } }).data;
        if (data?.geojsonData && data.geojsonData.type === 'FeatureCollection') {
          setRawGeojson(data.geojsonData);
        }
      })
      .catch(() => { /* layer not materialised yet — leave null */ })
      .finally(() => setFetched(true));
  }, [visible, fetched, projectId]);

  const geojson = useMemo(() => (rawGeojson ? deriveFeatures(rawGeojson) : null), [rawGeojson]);

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
          const bandColor: maplibregl.ExpressionSpecification = [
            'match',
            ['get', 'pollinatorBand'],
            'high', '#6ba47a',      // sage green — strong forage + structure
            'moderate', '#d4c564',  // warm gold — flowering cover crops
            'low', '#9c8b6e',       // muted brown — soil-first cells
            '#9c8b6e',
          ];
          map.addLayer({
            id: CIRCLE_LAYER_ID,
            type: 'circle',
            source: SOURCE_ID,
            paint: {
              'circle-color': bandColor,
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
              'circle-stroke-color': bandColor,
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

export function PollinatorHabitatToggle({ compact = false }: { compact?: boolean } = {}) {
  const visible = useMapStore((s) => s.pollinatorOpportunityVisible);
  const setVisible = useMapStore((s) => s.setPollinatorOpportunityVisible);
  if (compact) {
    return (
      <DelayedTooltip label="Pollinator planting opportunity" position="right">
        <button
          onClick={() => setVisible(!visible)}
          aria-pressed={visible}
          className={`spine-btn${visible ? ' signifier-shimmer' : ''}`}
          data-active={visible}
          aria-label="Toggle pollinator planting opportunity overlay"
        >
          {/* Lucide Flower-2 — pollinator signifier */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0-3 3m3-3v1m0 0v1m6-1a3 3 0 1 1 3 3m-3-3v1m0 0v1" />
            <circle cx="12" cy="14" r="3" />
            <path d="M12 17v5" />
          </svg>
        </button>
      </DelayedTooltip>
    );
  }
  return (
    <DelayedTooltip label="Toggle pollinator planting opportunity overlay" position="bottom">
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
          background: visible ? '#6ba47a' : 'var(--color-chrome-bg-translucent)',
          color: visible ? '#1a1a1a' : '#c4b49a',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'auto',
        }}
      >
        Pollinator
      </button>
    </DelayedTooltip>
  );
}
