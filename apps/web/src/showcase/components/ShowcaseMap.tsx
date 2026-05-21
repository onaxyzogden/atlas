import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLES } from '../../lib/maplibre';
import type { ShowcaseLayer, ShowcaseDesignFeature } from '../data/snapshot';

// Reuse the shared MapTiler/Esri satellite style constant that MapCanvas uses
// (via useMaplibre → MAP_STYLES['satellite']). Keeping this as the *only*
// shared dependency on the live-app map module preserves Showcase's
// prop-driven, store-free contract while ensuring the basemap visual matches
// MapCanvas pixel-for-pixel.
const BASE_STYLE = MAP_STYLES['satellite']!;

export type ShowcaseMapProps = {
  boundary: GeoJSON.MultiPolygon;
  layers: ShowcaseLayer[];
  features: ShowcaseDesignFeature[];
  activeLayerIds: string[];
  initialView?: { center: [number, number]; zoom: number };
  interactive?: boolean;
};

export function ShowcaseMap({
  boundary,
  layers,
  features,
  activeLayerIds,
  initialView,
  interactive = true,
}: ShowcaseMapProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // TODO(Task 12): Split this monolithic effect before per-layer overlay
  // rendering lands. Today, any prop change (incl. activeLayerIds toggle)
  // tears down + rebuilds the MapLibre instance — fine for v1 because
  // overlay toggling is a no-op stub, but Task 12 must replace this with
  // (a) one-time init effect on [], (b) data-update effect calling
  // setData() on existing GeoJSON sources, (c) visibility effect on
  // activeLayerIds calling setLayoutProperty('visibility', ...).
  // See code review on commit 8385112c for full rationale.
  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: BASE_STYLE,
      center: initialView?.center ?? [-79.91, 43.56],
      zoom: initialView?.zoom ?? 14,
      interactive,
    });
    mapRef.current = map;
    map.on('load', () => {
      map.addSource('boundary', {
        type: 'geojson',
        data: { type: 'Feature', geometry: boundary, properties: {} } as any,
      });
      map.addLayer({
        id: 'boundary-line',
        type: 'line',
        source: 'boundary',
        paint: { 'line-color': '#0a7d2c', 'line-width': 2 },
      });
      // Designed features as one fill layer
      map.addSource('features', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: features.map((f) => ({
            type: 'Feature',
            id: f.id,
            geometry: f.geometry,
            properties: { kind: f.feature_type, name: f.name },
          })),
        } as any,
      });
      map.addLayer({
        id: 'features-fill',
        type: 'fill',
        source: 'features',
        paint: {
          'fill-color': [
            'match',
            ['get', 'kind'],
            'zone', '#3a8f4d',
            'structure', '#a35a2b',
            'path', '#7a7065',
            '#888',
          ],
          'fill-opacity': 0.45,
        },
      });
      // Layer-driven overlays (gated by activeLayerIds)
      for (const layer of layers) {
        if (!activeLayerIds.includes(layer.layer_type)) continue;
        // Layer rendering is summary-data-driven; for v1 we just toggle a visibility marker.
        // Detailed per-layer rendering deferred to Task 12 (post-spike refinement).
      }
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    boundary,
    features,
    activeLayerIds,
    layers,
    interactive,
    initialView?.center?.[0],
    initialView?.center?.[1],
    initialView?.zoom,
  ]);

  return (
    <div
      ref={ref}
      data-testid="showcase-map"
      style={{ width: '100%', height: '100%', minHeight: 360 }}
    />
  );
}
