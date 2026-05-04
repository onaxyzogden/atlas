/**
 * TerrainControls â€” adds hillshade, contour lines, slope/aspect heatmaps
 * to the MapLibre map using MapTiler Terrain DEM tiles.
 *
 * These are P1 features from Section 2 of the Atlas spec.
 */

import type maplibregl from 'maplibre-gl';
import { useState, useCallback, useEffect } from 'react';
import { earth, map as mapTokens, mapZIndex, semantic } from '../../lib/tokens.js';
import { TERRAIN_DEM_URL, CONTOUR_TILES_URL } from '../../lib/maplibre.js';
import { MapControlPopover } from '../../components/ui/MapControlPopover.js';

type TerrainLayer = 'hillshade' | 'contours' | 'slope';

interface TerrainControlsProps {
  map: maplibregl.Map | null;
  isMapReady: boolean;
}

export default function TerrainControls({ map, isMapReady }: TerrainControlsProps) {
  const [activeLayers, setActiveLayers] = useState<Set<TerrainLayer>>(new Set());
  const [collapsed, setCollapsed] = useState(true);

  const toggleTerrain = useCallback(
    (layer: TerrainLayer) => {
      if (!map || !isMapReady) return;

      const next = new Set(activeLayers);
      if (next.has(layer)) {
        next.delete(layer);
        removeTerrain(map, layer);
      } else {
        next.add(layer);
        addTerrain(map, layer);
      }
      setActiveLayers(next);
    },
    [map, isMapReady, activeLayers],
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (!map) return;
      for (const layer of activeLayers) {
        try {
          removeTerrain(map, layer);
        } catch {
          // Map may already be removed
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isMapReady) return null;

  return (
    <MapControlPopover
      variant="panel"
      collapsed={collapsed}
      style={{
        flexShrink: 0,
        color: mapTokens.label,
        zIndex: mapZIndex.panel,
        border: 'none',
      }}
    >
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          color: semantic.sidebarIcon,
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: 0,
        }}
      >
        Terrain {collapsed ? 'â–¸' : 'â–¾'}
      </button>

      {!collapsed && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <TerrainToggle
            label="Hillshade"
            description="3D shadow relief"
            active={activeLayers.has('hillshade')}
            onClick={() => toggleTerrain('hillshade')}
          />
          <TerrainToggle
            label="Contour Lines"
            description="Elevation lines (10m)"
            active={activeLayers.has('contours')}
            onClick={() => toggleTerrain('contours')}
          />
          <TerrainToggle
            label="Slope Heatmap"
            description="Steep slope detection"
            active={activeLayers.has('slope')}
            onClick={() => toggleTerrain('slope')}
          />
        </div>
      )}
    </MapControlPopover>
  );
}

function TerrainToggle({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: active ? 'rgba(125, 97, 64, 0.3)' : 'transparent',
        border: active ? '1px solid rgba(125, 97, 64, 0.6)' : '1px solid transparent',
        borderRadius: 6,
        padding: '6px 10px',
        cursor: 'pointer',
        textAlign: 'left',
        color: mapTokens.label,
        width: '100%',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: active ? semantic.primary : 'rgba(212, 175, 95, 0.18)',
          flexShrink: 0,
        }}
      />
      <div>
        <div style={{ fontSize: 12, fontWeight: active ? 600 : 400 }}>{label}</div>
        <div style={{ fontSize: 10, color: semantic.sidebarIcon }}>{description}</div>
      </div>
    </button>
  );
}

// â”€â”€â”€ Map layer management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DEM_SOURCE = 'mapbox-dem';

function ensureDEM(map: maplibregl.Map) {
  if (!map.getSource(DEM_SOURCE)) {
    map.addSource(DEM_SOURCE, {
      type: 'raster-dem',
      url: TERRAIN_DEM_URL,
      tileSize: 512,
      maxzoom: 14,
    });
  }
}

function addTerrain(map: maplibregl.Map, layer: TerrainLayer) {
  ensureDEM(map);

  switch (layer) {
    case 'hillshade':
      if (!map.getLayer('ogden-hillshade')) {
        map.addLayer(
          {
            id: 'ogden-hillshade',
            type: 'hillshade',
            source: DEM_SOURCE,
            paint: {
              'hillshade-exaggeration': 0.5,
              'hillshade-shadow-color': '#1a1611',
              'hillshade-highlight-color': mapTokens.label,
              'hillshade-accent-color': mapTokens.boundary,
            },
          },
          // Insert below labels
          getFirstSymbolLayer(map),
        );
      }
      break;

    case 'contours':
      if (!map.getSource('contour-source')) {
        map.addSource('contour-source', {
          type: 'vector',
          url: CONTOUR_TILES_URL,
        });
      }
      if (!map.getLayer('ogden-contours')) {
        map.addLayer(
          {
            id: 'ogden-contours',
            type: 'line',
            source: 'contour-source',
            'source-layer': 'contour',
            paint: {
              'line-color': [
                'case',
                ['==', ['%', ['get', 'ele'], 50], 0],
                'rgba(74, 56, 35, 0.8)',   // Major contour every 50m
                'rgba(74, 56, 35, 0.3)',   // Minor contour
              ],
              'line-width': [
                'case',
                ['==', ['%', ['get', 'ele'], 50], 0],
                1.5,
                0.5,
              ],
            },
            filter: ['==', ['%', ['get', 'ele'], 10], 0],
          },
          getFirstSymbolLayer(map),
        );

        // Contour labels (major only)
        map.addLayer({
          id: 'ogden-contour-labels',
          type: 'symbol',
          source: 'contour-source',
          'source-layer': 'contour',
          filter: ['==', ['%', ['get', 'ele'], 50], 0],
          layout: {
            'symbol-placement': 'line',
            'text-field': ['concat', ['get', 'ele'], 'm'],
            'text-size': 9,
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            'text-max-angle': 25,
          },
          paint: {
            'text-color': 'rgba(74, 56, 35, 0.8)',
            'text-halo-color': 'rgba(255, 255, 255, 0.6)',
            'text-halo-width': 1,
          },
        });
      }
      break;

    case 'slope':
      // Enable terrain for slope visualization
      if (!map.getTerrain()) {
        map.setTerrain({ source: DEM_SOURCE, exaggeration: 1.5 });
      }
      break;
  }
}

function removeTerrain(map: maplibregl.Map, layer: TerrainLayer) {
  switch (layer) {
    case 'hillshade':
      if (map.getLayer('ogden-hillshade')) map.removeLayer('ogden-hillshade');
      break;
    case 'contours':
      if (map.getLayer('ogden-contour-labels')) map.removeLayer('ogden-contour-labels');
      if (map.getLayer('ogden-contours')) map.removeLayer('ogden-contours');
      break;
    case 'slope':
      if (map.getTerrain()) map.setTerrain(null);
      break;
  }
}

function getFirstSymbolLayer(map: maplibregl.Map): string | undefined {
  const layers = map.getStyle()?.layers;
  if (!layers) return undefined;
  for (const layer of layers) {
    if (layer.type === 'symbol') return layer.id;
  }
  return undefined;
}
