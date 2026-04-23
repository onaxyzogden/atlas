import { useEffect, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { api } from '../../lib/apiClient.js';
import { useMapStore } from '../../store/mapStore.js';
import { semantic } from '../../lib/tokens.js';

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

export function ViewshedToggle() {
  const visible = useMapStore((s) => s.viewshedVisible);
  const setVisible = useMapStore((s) => s.setViewshedVisible);
  return (
    <button
      onClick={() => setVisible(!visible)}
      aria-pressed={visible}
      style={{
        padding: '6px 10px',
        borderRadius: 6,
        border: 'none',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 500,
        background: visible ? semantic.primary : 'rgba(26, 22, 17, 0.85)',
        color: visible ? '#fff' : '#c4b49a',
        backdropFilter: 'blur(8px)',
        pointerEvents: 'auto',
      }}
      title="Toggle the pre-computed viewshed overlay"
    >
      Viewshed
    </button>
  );
}
