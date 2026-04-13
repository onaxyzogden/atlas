/**
 * InteractiveMapView — read-only Mapbox embed with curated hotspots and data masking.
 */

import { useRef, useEffect } from 'react';
import { maplibregl, MAP_STYLES, hasMapToken, maptilerTransformRequest } from '../../../lib/maplibre.js';
import type { PortalConfig } from '../../../store/portalStore.js';
import type { LocalProject } from '../../../store/projectStore.js';
import { group, semantic } from '../../../lib/tokens.js';

interface Props { config: PortalConfig; project: LocalProject }

export default function InteractiveMapView({ config, project }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !hasMapToken) return;

    const center: [number, number] = config.storyScenes[0]?.mapCenter ?? [-79.8, 43.5];
    const zoom = config.storyScenes[0]?.mapZoom ?? 13;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES['satellite'] ?? MAP_STYLES['terrain']!,
      center,
      zoom,
      attributionControl: {},
      interactive: true,
      transformRequest: maptilerTransformRequest,
      pitchWithRotate: false,
      dragRotate: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      // Show boundary if masking allows
      if (config.dataMaskingLevel !== 'minimal' && project.parcelBoundaryGeojson) {
        map.addSource('portal-boundary', {
          type: 'geojson',
          data: project.parcelBoundaryGeojson as GeoJSON.FeatureCollection,
        });
        map.addLayer({
          id: 'portal-boundary-fill', type: 'fill', source: 'portal-boundary',
          paint: { 'fill-color': config.brandColor, 'fill-opacity': 0.12 },
        });
        map.addLayer({
          id: 'portal-boundary-line', type: 'line', source: 'portal-boundary',
          paint: { 'line-color': config.brandColor, 'line-width': 2 },
        });
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [config, project]);

  return (
    <section style={{ padding: '60px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: group.livestock, marginBottom: 8,
        }}>
          Explore the Land
        </h2>
        <p style={{ fontSize: 13, color: semantic.sidebarIcon }}>
          Interactive map view — zoom, pan, and explore the property.
        </p>
      </div>

      <div
        ref={containerRef}
        style={{
          width: '100%', maxWidth: 1200, height: 500,
          margin: '0 auto', borderRadius: 12,
          border: '1px solid rgba(196,162,101,0.15)',
          overflow: 'hidden',
        }}
      />

      {config.dataMaskingLevel === 'minimal' && (
        <p style={{ fontSize: 10, color: '#6b5b4a', textAlign: 'center', marginTop: 12 }}>
          Approximate location shown for privacy. Contact the owner for precise details.
        </p>
      )}
    </section>
  );
}
