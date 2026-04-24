import { useEffect, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { api } from '../../lib/apiClient.js';
import { useMapStore } from '../../store/mapStore.js';
import { semantic } from '../../lib/tokens.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

interface ViewshedOverlayProps {
  projectId: string;
  map: maplibregl.Map | null;
}

const SOURCE_ID = 'terrain-viewshed';
const FILL_LAYER_ID = 'terrain-viewshed-fill';
const LINE_LAYER_ID = 'terrain-viewshed-line';

/**
 * Renders the Tier-3 viewshed GeoJSON as a translucent fill when the user
 * toggles `viewshedVisible` on via `<ViewshedToggle>`. Data is fetched once
 * per project and cached in component state.
 */
export default function ViewshedOverlay({ projectId, map }: ViewshedOverlayProps) {
  const visible = useMapStore((s) => s.viewshedVisible);
  const overlayOpacity = useMapStore((s) => s.overlayOpacity);
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!visible || fetched) return;
    api.basemapTerrain
      .viewshed(projectId)
      .then(({ data }) => {
        if (data.status === 'ready') setGeojson(data.geojson);
      })
      .catch(() => { /* leave null; MapCanvas ignores absent source */ })
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
            map.setPaintProperty(FILL_LAYER_ID, 'fill-opacity', overlayOpacity * 0.3);
          }
          if (map.getLayer(LINE_LAYER_ID)) {
            map.setPaintProperty(LINE_LAYER_ID, 'line-opacity', overlayOpacity);
          }
        } else {
          map.addSource(SOURCE_ID, { type: 'geojson', data: geojson });
          map.addLayer({
            id: FILL_LAYER_ID,
            type: 'fill',
            source: SOURCE_ID,
            paint: { 'fill-color': semantic.primary, 'fill-opacity': overlayOpacity * 0.3 },
          });
          map.addLayer({
            id: LINE_LAYER_ID,
            type: 'line',
            source: SOURCE_ID,
            paint: { 'line-color': semantic.primary, 'line-width': 1.2, 'line-opacity': overlayOpacity },
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

export function ViewshedToggle({ compact = false }: { compact?: boolean } = {}) {
  const visible = useMapStore((s) => s.viewshedVisible);
  const setVisible = useMapStore((s) => s.setViewshedVisible);
  if (compact) {
    return (
      <DelayedTooltip label="Viewshed overlay" position="right">
        <button
          onClick={() => setVisible(!visible)}
          aria-pressed={visible}
          className={`spine-btn${visible ? ' signifier-shimmer' : ''}`}
          data-active={visible}
          aria-label="Toggle viewshed overlay"
        >
          {/* Lucide Eye â€” inlined to avoid extra imports in shared bundle */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </DelayedTooltip>
    );
  }
  return (
    <DelayedTooltip label="Toggle the pre-computed viewshed overlay" position="bottom">
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
          background: visible ? semantic.primary : 'var(--color-chrome-bg-translucent)',
          color: visible ? '#fff' : '#c4b49a',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'auto',
        }}
      >
        Viewshed
      </button>
    </DelayedTooltip>
  );
}
