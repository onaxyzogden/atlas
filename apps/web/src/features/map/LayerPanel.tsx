/**
 * LayerPanel — data layer visibility toggles with confidence indicators.
 *
 * Sprint 6: Uses mock data provider when API is not connected,
 * so the panel is functional in offline/local mode. Shows layer
 * summaries on hover/expand.
 */

import { useState, useMemo, useEffect } from 'react';
import { useMapStore } from '../../store/mapStore.js';
import { useProjectStore } from '../../store/projectStore.js';
import type { LayerType } from '@ogden/shared';
import { generateMockLayers, getLayerSummaryText, type MockLayerResult } from '../../lib/mockLayerData.js';
import { fetchAllLayers, type FetchLayerResults } from '../../lib/layerFetcher.js';
import { confidence, earth, map as mapTokens, semantic } from '../../lib/tokens.js';

const LAYER_LABELS: Record<LayerType, string> = {
  elevation:          'Elevation & Slope',
  soils:              'Soils',
  watershed:          'Watershed & Hydrology',
  wetlands_flood:     'Wetlands & Flood Risk',
  land_cover:         'Land Cover',
  climate:            'Climate Normals',
  zoning:             'Zoning & Setbacks',
  infrastructure:     'Infrastructure Access',
  watershed_derived:  'Watershed Analysis',
  microclimate:       'Microclimate',
  soil_regeneration:  'Soil Regeneration',
  groundwater:        'Groundwater Depth',
  water_quality:      'Water Quality',
  superfund:          'Superfund Sites',
  critical_habitat:   'Critical Habitat',
  storm_events:       'Storm Events',
  crop_validation:    'Crop Validation',
  air_quality:        'Air Quality',
  earthquake_hazard:  'Seismic Hazard',
};

const LAYER_ICONS: Record<LayerType, string> = {
  elevation:          '▲',
  soils:              '◆',
  watershed:          '~',
  wetlands_flood:     '≈',
  land_cover:         '◉',
  climate:            '☀',
  zoning:             '⊞',
  infrastructure:     '⊕',
  watershed_derived:  '◈',
  microclimate:       '❂',
  soil_regeneration:  '◇',
  groundwater:        '▽',
  water_quality:      '◌',
  superfund:          '☢',
  critical_habitat:   '🦅',
  storm_events:       '⚡',
  crop_validation:    '🌾',
  air_quality:        '💨',
  earthquake_hazard:  '〰',
};

const CONFIDENCE_COLORS = {
  high:   confidence.high,
  medium: confidence.medium,
  low:    confidence.low,
};

export default function LayerPanel({ projectId }: { projectId: string }) {
  const { visibleLayers, toggleLayer } = useMapStore();
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));
  const [expandedLayer, setExpandedLayer] = useState<LayerType | null>(null);
  const [fetchResult, setFetchResult] = useState<FetchLayerResults | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  // Fetch real data when project has an address/center
  const center = useMemo<[number, number] | null>(() => {
    if (!project) return null;
    // Try to get center from boundary
    if (project.parcelBoundaryGeojson) {
      try {
        const fc = project.parcelBoundaryGeojson as GeoJSON.FeatureCollection;
        let sumLng = 0, sumLat = 0, count = 0;
        const visit = (c: unknown) => {
          if (!Array.isArray(c)) return;
          if (typeof c[0] === 'number' && typeof c[1] === 'number') { sumLng += c[0]; sumLat += c[1]; count++; return; }
          for (const item of c) visit(item);
        };
        for (const f of fc.features) visit((f.geometry as { coordinates: unknown }).coordinates);
        if (count > 0) return [sumLng / count, sumLat / count];
      } catch { /* */ }
    }
    return null;
  }, [project]);

  const bbox = useMemo<[number, number, number, number] | undefined>(() => {
    if (!project?.parcelBoundaryGeojson) return undefined;
    try {
      const fc = project.parcelBoundaryGeojson as GeoJSON.FeatureCollection;
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      const visit = (c: unknown) => {
        if (!Array.isArray(c)) return;
        if (typeof c[0] === 'number' && typeof c[1] === 'number') {
          if (c[0] < minLng) minLng = c[0]; if (c[0] > maxLng) maxLng = c[0];
          if (c[1] < minLat) minLat = c[1]; if (c[1] > maxLat) maxLat = c[1];
          return;
        }
        for (const item of c) visit(item);
      };
      for (const f of fc.features) visit((f.geometry as { coordinates: unknown }).coordinates);
      if (minLng < Infinity) return [minLng, minLat, maxLng, maxLat];
    } catch { /* */ }
    return undefined;
  }, [project]);

  useEffect(() => {
    if (!center || !project) return;
    setIsFetching(true);
    fetchAllLayers({ center, country: project.country, bbox })
      .then(setFetchResult)
      .catch(() => { /* fallback to mock */ })
      .finally(() => setIsFetching(false));
  }, [center, project, bbox]);

  // Use fetched data if available, otherwise mock
  const layers: MockLayerResult[] = fetchResult?.layers ?? generateMockLayers(project?.country ?? 'US');
  const isLive = fetchResult?.isLive ?? false;

  return (
    <div
      style={{
        position: 'absolute',
        top: 56,
        insetInlineEnd: 16,
        width: 240,
        background: 'rgba(26, 22, 17, 0.92)',
        borderRadius: 10,
        padding: 12,
        backdropFilter: 'blur(10px)',
        color: mapTokens.label,
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: semantic.sidebarIcon,
          marginBlockEnd: 8,
        }}
      >
        Data Layers
      </p>

      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {layers.map((layer) => (
          <li key={layer.layerType}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 0',
              }}
            >
              {/* Toggle */}
              <button
                onClick={() => toggleLayer(layer.layerType)}
                aria-checked={visibleLayers.has(layer.layerType)}
                role="switch"
                style={{
                  width: 30,
                  height: 16,
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  background: visibleLayers.has(layer.layerType) ? semantic.primary : '#3d3328',
                  flexShrink: 0,
                  transition: 'background 200ms ease',
                  position: 'relative',
                }}
                title={`Toggle ${LAYER_LABELS[layer.layerType]}`}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: visibleLayers.has(layer.layerType) ? 16 : 2,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: mapTokens.label,
                    transition: 'left 200ms ease',
                  }}
                />
              </button>

              {/* Icon + Label */}
              <button
                onClick={() => setExpandedLayer(expandedLayer === layer.layerType ? null : layer.layerType)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: 0,
                  color: mapTokens.label,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, opacity: 0.6, width: 14, textAlign: 'center' }}>
                    {LAYER_ICONS[layer.layerType]}
                  </span>
                  <span style={{ fontSize: 12, lineHeight: 1.3 }}>
                    {LAYER_LABELS[layer.layerType]}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: semantic.sidebarIcon, display: 'flex', gap: 4, paddingLeft: 18 }}>
                  <span
                    style={{
                      color: CONFIDENCE_COLORS[layer.confidence],
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  >
                    {layer.confidence}
                  </span>
                  <span>confidence</span>
                  <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.5 }}>
                    {expandedLayer === layer.layerType ? '▾' : '▸'}
                  </span>
                </div>
              </button>
            </div>

            {/* Expanded summary */}
            {expandedLayer === layer.layerType && (
              <div
                style={{
                  marginLeft: 38,
                  padding: '6px 8px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 6,
                  marginBottom: 4,
                }}
              >
                {getLayerSummaryText(layer).map((line, i) => (
                  <div key={i} style={{ fontSize: 10, color: '#c4b49a', lineHeight: 1.5 }}>
                    {line}
                  </div>
                ))}
                <div style={{ fontSize: 9, color: '#6b5b4a', marginTop: 4 }}>
                  Source: {layer.sourceApi} — {layer.attribution}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Data source badge */}
      <div
        style={{
          marginTop: 10,
          padding: '6px 8px',
          background: 'rgba(0,0,0,0.15)',
          borderRadius: 6,
          fontSize: 9,
          color: '#6b5b4a',
          textAlign: 'center',
        }}
      >
        {isFetching ? 'Fetching live data...' : isLive ? `Live data — ${fetchResult?.liveCount}/${fetchResult?.totalCount} layers` : 'Local mode — estimated data'}
      </div>
    </div>
  );
}
