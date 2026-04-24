import { useEffect, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { api } from '../../lib/apiClient.js';
import { useMapStore } from '../../store/mapStore.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

interface PollinatorHabitatOverlayProps {
  projectId: string;
  map: maplibregl.Map | null;
}

const SOURCE_ID = 'pollinator-opportunity-zones';
const FILL_LAYER_ID = 'pollinator-opportunity-zones-fill';
const STROKE_LAYER_ID = 'pollinator-opportunity-zones-stroke';

/**
 * §7 Pollinator-opportunity overlay. Reads the `pollinator_opportunity` layer
 * emitted by `PollinatorOpportunityProcessor` — a synthesized NxN patch grid
 * over the project bbox with deterministic cover-class assignment.
 *
 * - Fill color is keyed on `habitatQuality` (high / moderate / low / hostile).
 * - Stroke color + weight are keyed on `connectivityRole` (core /
 *   stepping_stone / isolated / matrix).
 *
 * Honest scoping: the grid is not polygonized land cover — it is a
 * synthesized patch approximation. The caveat is stored in the layer's
 * summary_data and rendered in the §7 EcologicalDashboard.
 */
export default function PollinatorHabitatOverlay({ projectId, map }: PollinatorHabitatOverlayProps) {
  const visible = useMapStore((s) => s.pollinatorOpportunityVisible);
  const overlayOpacity = useMapStore((s) => s.overlayOpacity);
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!visible || fetched) return;
    api.layers
      .get(projectId, 'pollinator_opportunity')
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
            map.setPaintProperty(FILL_LAYER_ID, 'fill-opacity', overlayOpacity * 0.55);
          }
          if (map.getLayer(STROKE_LAYER_ID)) {
            map.setPaintProperty(STROKE_LAYER_ID, 'line-opacity', overlayOpacity * 0.95);
          }
        } else {
          map.addSource(SOURCE_ID, { type: 'geojson', data: geojson });

          // habitatQuality → fill: sage/gold/muted/slate-red
          const fillColor: maplibregl.ExpressionSpecification = [
            'match',
            ['get', 'habitatQuality'],
            'high', '#6ba47a',       // sage green — forage + structure
            'moderate', '#d4c564',   // warm gold — edge habitat
            'low', '#9c8b6e',        // muted — sparse forage
            'hostile', '#7a4a4a',    // slate red — urban/impervious
            '#9c8b6e',
          ];
          // connectivityRole → stroke color: gold/chrome/red/faint
          const strokeColor: maplibregl.ExpressionSpecification = [
            'match',
            ['get', 'connectivityRole'],
            'core', '#e0b56d',              // gold — anchor patches
            'stepping_stone', '#c4b49a',    // chrome — bridge patches
            'isolated', '#a85555',          // red — orphan patches
            'matrix', 'rgba(180,165,140,0.4)',
            'rgba(180,165,140,0.4)',
          ];
          // connectivityRole → stroke weight
          const strokeWidth: maplibregl.ExpressionSpecification = [
            'match',
            ['get', 'connectivityRole'],
            'core', 3,
            'stepping_stone', 2,
            'isolated', 1.5,
            'matrix', 0.5,
            0.5,
          ];

          map.addLayer({
            id: FILL_LAYER_ID,
            type: 'fill',
            source: SOURCE_ID,
            paint: {
              'fill-color': fillColor,
              'fill-opacity': overlayOpacity * 0.55,
            },
          });
          map.addLayer({
            id: STROKE_LAYER_ID,
            type: 'line',
            source: SOURCE_ID,
            paint: {
              'line-color': strokeColor,
              'line-width': strokeWidth,
              'line-opacity': overlayOpacity * 0.95,
            },
          });
        }
      } else {
        for (const id of [STROKE_LAYER_ID, FILL_LAYER_ID]) {
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
      <DelayedTooltip label="Pollinator opportunity" position="right">
        <button
          onClick={() => setVisible(!visible)}
          aria-pressed={visible}
          className={`spine-btn${visible ? ' signifier-shimmer' : ''}`}
          data-active={visible}
          aria-label="Toggle pollinator opportunity overlay"
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
    <DelayedTooltip label="Toggle pollinator opportunity overlay" position="bottom">
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
