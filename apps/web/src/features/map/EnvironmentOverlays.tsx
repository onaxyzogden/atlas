/**
 * EnvironmentOverlays — renders building footprints, road networks,
 * and Mapbox-provided environmental overlays on the map.
 *
 * P1 features from Section 2:
 *   - Parcel boundary, road, waterbody, building footprint overlays
 *   - Layer visibility toggles, ordering, opacity controls
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface EnvironmentOverlaysProps {
  map: mapboxgl.Map | null;
  isMapReady: boolean;
}

type EnvLayer = 'buildings' | 'roads' | 'water' | 'landuse';

const ENV_LAYERS: { key: EnvLayer; label: string; description: string }[] = [
  { key: 'buildings', label: 'Buildings', description: 'Building footprints' },
  { key: 'roads', label: 'Roads', description: 'Road network' },
  { key: 'water', label: 'Water Bodies', description: 'Lakes, rivers, streams' },
  { key: 'landuse', label: 'Land Use', description: 'Parks, farms, forest' },
];

export default function EnvironmentOverlays({ map, isMapReady }: EnvironmentOverlaysProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [activeLayers, setActiveLayers] = useState<Set<EnvLayer>>(new Set());
  const layerIdsRef = useRef<Set<string>>(new Set());

  const toggleLayer = useCallback(
    (layer: EnvLayer) => {
      if (!map || !isMapReady) return;

      const next = new Set(activeLayers);
      if (next.has(layer)) {
        next.delete(layer);
        removeEnvLayer(map, layer, layerIdsRef.current);
      } else {
        next.add(layer);
        addEnvLayer(map, layer, layerIdsRef.current);
      }
      setActiveLayers(next);
    },
    [map, isMapReady, activeLayers],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!map) return;
      for (const id of layerIdsRef.current) {
        try { if (map.getLayer(id)) map.removeLayer(id); } catch { /* ok */ }
      }
    };
  }, [map]);

  if (!isMapReady) return null;

  return (
    <div
      style={{
        background: 'rgba(26, 22, 17, 0.90)',
        borderRadius: 10,
        padding: collapsed ? '6px 10px' : 12,
        backdropFilter: 'blur(10px)',
        color: '#f2ede3',
        pointerEvents: 'auto',
        flexShrink: 0,
        maxWidth: 200,
      }}
    >
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          color: '#8a9a74',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: 0,
        }}
      >
        Overlays {collapsed ? '▸' : '▾'}
      </button>

      {!collapsed && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ENV_LAYERS.map((el) => (
            <button
              key={el.key}
              onClick={() => toggleLayer(el.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: activeLayers.has(el.key) ? 'rgba(138, 154, 116, 0.2)' : 'transparent',
                border: activeLayers.has(el.key) ? '1px solid rgba(138, 154, 116, 0.4)' : '1px solid transparent',
                borderRadius: 6,
                padding: '5px 8px',
                cursor: 'pointer',
                textAlign: 'left',
                color: '#f2ede3',
                width: '100%',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: activeLayers.has(el.key) ? '#8a9a74' : '#3d3328',
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: 11, fontWeight: activeLayers.has(el.key) ? 600 : 400 }}>{el.label}</div>
                <div style={{ fontSize: 9, color: '#9a8a74' }}>{el.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Map layer management ──────────────────────────────────────────────────

function getFirstSymbolLayer(map: mapboxgl.Map): string | undefined {
  const layers = map.getStyle()?.layers;
  if (!layers) return undefined;
  for (const layer of layers) {
    if (layer.type === 'symbol') return layer.id;
  }
  return undefined;
}

function addEnvLayer(map: mapboxgl.Map, layer: EnvLayer, tracker: Set<string>) {
  const before = getFirstSymbolLayer(map);

  // Ensure composite source is available (Mapbox default)
  // These layers use the Mapbox Streets v8 source that comes with most styles
  const compositeSource = 'composite';

  switch (layer) {
    case 'buildings': {
      if (!map.getLayer('ogden-buildings-3d')) {
        map.addLayer(
          {
            id: 'ogden-buildings-3d',
            source: compositeSource,
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 13,
            paint: {
              'fill-extrusion-color': '#8B7355',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.5,
            },
          },
        );
        tracker.add('ogden-buildings-3d');
      }
      break;
    }

    case 'roads': {
      if (!map.getLayer('ogden-roads-highlight')) {
        map.addLayer(
          {
            id: 'ogden-roads-highlight',
            source: compositeSource,
            'source-layer': 'road',
            type: 'line',
            minzoom: 12,
            paint: {
              'line-color': [
                'match',
                ['get', 'class'],
                ['motorway', 'trunk'], '#c44e3f',
                ['primary', 'secondary'], '#8a6d1e',
                ['tertiary', 'street'], '#7d6140',
                '#4a3823',
              ],
              'line-width': [
                'match',
                ['get', 'class'],
                ['motorway', 'trunk'], 3,
                ['primary', 'secondary'], 2,
                1,
              ],
              'line-opacity': 0.6,
            },
          },
          before,
        );
        tracker.add('ogden-roads-highlight');
      }
      break;
    }

    case 'water': {
      if (!map.getLayer('ogden-water-highlight')) {
        map.addLayer(
          {
            id: 'ogden-water-highlight',
            source: compositeSource,
            'source-layer': 'water',
            type: 'fill',
            paint: {
              'fill-color': '#4a90d9',
              'fill-opacity': 0.35,
              'fill-outline-color': '#2d6b9e',
            },
          },
          before,
        );
        tracker.add('ogden-water-highlight');
      }
      break;
    }

    case 'landuse': {
      if (!map.getLayer('ogden-landuse-highlight')) {
        map.addLayer(
          {
            id: 'ogden-landuse-highlight',
            source: compositeSource,
            'source-layer': 'landuse_overlay',
            type: 'fill',
            paint: {
              'fill-color': [
                'match',
                ['get', 'class'],
                'park', 'rgba(107, 143, 107, 0.3)',
                'agriculture', 'rgba(138, 109, 30, 0.2)',
                'wood', 'rgba(62, 92, 62, 0.25)',
                'cemetery', 'rgba(107, 107, 107, 0.2)',
                'rgba(107, 143, 107, 0.15)',
              ],
              'fill-outline-color': 'rgba(107, 143, 107, 0.4)',
            },
          },
          before,
        );
        tracker.add('ogden-landuse-highlight');
      }
      break;
    }
  }
}

function removeEnvLayer(map: mapboxgl.Map, layer: EnvLayer, tracker: Set<string>) {
  const ids: Record<EnvLayer, string[]> = {
    buildings: ['ogden-buildings-3d'],
    roads: ['ogden-roads-highlight'],
    water: ['ogden-water-highlight'],
    landuse: ['ogden-landuse-highlight'],
  };

  for (const id of ids[layer]) {
    if (map.getLayer(id)) {
      map.removeLayer(id);
      tracker.delete(id);
    }
  }
}
