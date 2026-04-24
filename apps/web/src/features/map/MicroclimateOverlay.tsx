import { useEffect, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { api } from '../../lib/apiClient.js';
import { useMapStore } from '../../store/mapStore.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

interface MicroclimateOverlayProps {
  projectId: string;
  map: maplibregl.Map | null;
}

const SOURCE_ID = 'microclimate-zones';
const FILL_LAYER_ID = 'microclimate-zones-fill';
const LINE_LAYER_ID = 'microclimate-zones-line';

/**
 * §6 Microclimate opportunity overlay. Reads the `microclimate` project layer
 * (produced by MicroclimateProcessor) and paints its classified polygons —
 * sun traps, wind-shelter zones, frost-risk bands, and outdoor-comfort
 * ratings — as a classed fill on the main map. The shared backend keys every
 * feature by `properties.class`, so the paint expression switches color on
 * that single discriminator.
 */
export default function MicroclimateOverlay({ projectId, map }: MicroclimateOverlayProps) {
  const visible = useMapStore((s) => s.microclimateVisible);
  const overlayOpacity = useMapStore((s) => s.overlayOpacity);
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!visible || fetched) return;
    api.layers
      .get(projectId, 'microclimate')
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
          if (map.getLayer(FILL_LAYER_ID)) {
            map.setPaintProperty(FILL_LAYER_ID, 'fill-opacity', overlayOpacity * 0.45);
          }
          if (map.getLayer(LINE_LAYER_ID)) {
            map.setPaintProperty(LINE_LAYER_ID, 'line-opacity', overlayOpacity * 0.7);
          }
        } else {
          map.addSource(SOURCE_ID, { type: 'geojson', data: geojson });
          const fillColor: maplibregl.ExpressionSpecification = [
            'match',
            ['get', 'class'],
            // sun trap — amber/gold
            'sun_trap', '#f5a623',
            // wind shelter — forest green
            'wind_sheltered', '#4a8f4e',
            // moisture bands (wet → blue, dry → sand)
            'wet', '#3d7ba8',
            'moist', '#6ba6c8',
            'moderate', '#a8c4cf',
            'dry', '#c8a878',
            // frost risk gradient (minimal → muted green, high → red)
            'minimal_risk', '#6ba47a',
            'low_risk', '#d4c564',
            'moderate_risk', '#d68a4e',
            'high_risk', '#c04a3a',
            // outdoor comfort gradient (ideal → deep green, uncomfortable → grey)
            'ideal', '#2e7a4a',
            'comfortable', '#7fb98a',
            'marginal', '#bfb28a',
            'uncomfortable', '#8a8070',
            // fallback
            '#9c8b6e',
          ];
          map.addLayer({
            id: FILL_LAYER_ID,
            type: 'fill',
            source: SOURCE_ID,
            paint: {
              'fill-color': fillColor,
              'fill-opacity': overlayOpacity * 0.45,
            },
          });
          map.addLayer({
            id: LINE_LAYER_ID,
            type: 'line',
            source: SOURCE_ID,
            paint: {
              'line-color': fillColor,
              'line-width': 0.8,
              'line-opacity': overlayOpacity * 0.7,
            },
          });
        }
      } else {
        for (const id of [LINE_LAYER_ID, FILL_LAYER_ID]) {
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

export function MicroclimateToggle({ compact = false }: { compact?: boolean } = {}) {
  const visible = useMapStore((s) => s.microclimateVisible);
  const setVisible = useMapStore((s) => s.setMicroclimateVisible);
  if (compact) {
    return (
      <DelayedTooltip label="Microclimate zones overlay" position="right">
        <button
          onClick={() => setVisible(!visible)}
          aria-pressed={visible}
          className={`spine-btn${visible ? ' signifier-shimmer' : ''}`}
          data-active={visible}
          aria-label="Toggle microclimate zones overlay"
        >
          {/* Lucide Sun-Snow hybrid — inlined */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </button>
      </DelayedTooltip>
    );
  }
  return (
    <DelayedTooltip label="Toggle microclimate opportunity overlay" position="bottom">
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
          background: visible ? '#f5a623' : 'var(--color-chrome-bg-translucent)',
          color: visible ? '#1a1a1a' : '#c4b49a',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'auto',
        }}
      >
        Microclimate
      </button>
    </DelayedTooltip>
  );
}
