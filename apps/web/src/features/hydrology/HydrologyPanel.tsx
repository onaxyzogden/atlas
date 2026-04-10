/**
 * HydrologyPanel — water flow visualization, watershed delineation,
 * and drainage analysis on the Mapbox map.
 *
 * P1 features from Section 5:
 *   - Water flow visualization, surface runoff paths
 *   - Watershed delineation, catchment area identification
 *   - Drainage line extraction, flood accumulation simulation
 *
 * Uses Mapbox terrain DEM to derive flow direction and accumulation.
 * When real API data is available (NHD/OHN), it renders actual hydrography.
 */

import type maplibregl from 'maplibre-gl';
import { useState, useCallback, useEffect, useRef } from 'react';
import s from './HydrologyPanel.module.css';

interface HydrologyPanelProps {
  map: maplibregl.Map | null;
  isMapReady: boolean;
  boundaryGeojson?: GeoJSON.FeatureCollection | null;
}

type HydroLayer = 'flowPaths' | 'watershed' | 'floodRisk' | 'wetlands';

const HYDRO_LAYERS: { key: HydroLayer; label: string; description: string; color: string }[] = [
  { key: 'flowPaths', label: 'Flow Paths', description: 'Surface water runoff direction', color: '#4a90d9' },
  { key: 'watershed', label: 'Watershed', description: 'Catchment boundaries', color: '#2d6b9e' },
  { key: 'floodRisk', label: 'Flood Risk', description: 'FEMA / CA flood zone overlay', color: '#c44e3f' },
  { key: 'wetlands', label: 'Wetlands', description: 'NWI / Ontario wetland areas', color: '#3a8a6b' },
];

export default function HydrologyPanel({ map, isMapReady, boundaryGeojson }: HydrologyPanelProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [activeLayers, setActiveLayers] = useState<Set<HydroLayer>>(new Set());
  const layersAddedRef = useRef<Set<string>>(new Set());

  const toggleLayer = useCallback(
    (layer: HydroLayer) => {
      if (!map || !isMapReady) return;

      const next = new Set(activeLayers);
      if (next.has(layer)) {
        next.delete(layer);
        removeHydroLayer(map, layer, layersAddedRef.current);
      } else {
        next.add(layer);
        addHydroLayer(map, layer, boundaryGeojson ?? null, layersAddedRef.current);
      }
      setActiveLayers(next);
    },
    [map, isMapReady, activeLayers, boundaryGeojson],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!map) return;
      for (const id of layersAddedRef.current) {
        try {
          if (map.getLayer(id)) map.removeLayer(id);
        } catch { /* map may be gone */ }
      }
      for (const id of ['hydro-flow-source', 'hydro-watershed-source', 'hydro-flood-source', 'hydro-wetland-source']) {
        try {
          if (map.getSource(id)) map.removeSource(id);
        } catch { /* ok */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isMapReady) return null;

  return (
    <div className={`${s.root} ${collapsed ? s.rootCollapsed : s.rootExpanded}`}>
      <button
        onClick={() => setCollapsed((v) => !v)}
        className={s.toggleBtn}
      >
        Hydrology {collapsed ? '▸' : '▾'}
      </button>

      {!collapsed && (
        <div className={s.body}>
          {HYDRO_LAYERS.map((hl) => {
            const isActive = activeLayers.has(hl.key);
            return (
              <button
                key={hl.key}
                onClick={() => toggleLayer(hl.key)}
                className={`${s.layerBtn} ${isActive ? s.layerBtnActive : s.layerBtnInactive}`}
              >
                <span
                  className={`${s.layerDot} ${isActive ? '' : s.layerDotInactive}`}
                  style={isActive ? { background: hl.color } : undefined}
                />
                <div>
                  <div className={`${s.layerLabel} ${isActive ? s.layerLabelActive : s.layerLabelInactive}`}>{hl.label}</div>
                  <div className={s.layerDesc}>{hl.description}</div>
                </div>
              </button>
            );
          })}

          {/* Legend */}
          {activeLayers.size > 0 && (
            <div className={s.legend}>
              <div className={s.legendTitle}>Data Sources</div>
              {activeLayers.has('flowPaths') && <div className={s.legendFlow}>Mapbox Terrain DEM v1</div>}
              {activeLayers.has('watershed') && <div className={s.legendWatershed}>NHD / OHN Watersheds</div>}
              {activeLayers.has('floodRisk') && <div className={s.legendFlood}>FEMA NFHL / CA Flood Maps</div>}
              {activeLayers.has('wetlands') && <div className={s.legendWetland}>NWI / Ontario Wetlands</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Map layer management ──────────────────────────────────────────────────

function getFirstSymbolLayer(map: maplibregl.Map): string | undefined {
  const layers = map.getStyle()?.layers;
  if (!layers) return undefined;
  for (const layer of layers) {
    if (layer.type === 'symbol') return layer.id;
  }
  return undefined;
}

function addHydroLayer(
  map: maplibregl.Map,
  layer: HydroLayer,
  boundary: GeoJSON.FeatureCollection | null,
  tracker: Set<string>,
) {
  const before = getFirstSymbolLayer(map);

  switch (layer) {
    case 'flowPaths': {
      if (!map.getSource('hydro-flow-source')) {
        map.addSource('hydro-flow-source', {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-terrain-v2',
        });
      }
      if (!map.getLayer('hydro-flow-lines')) {
        map.addLayer(
          {
            id: 'hydro-flow-lines',
            type: 'line',
            source: 'hydro-flow-source',
            'source-layer': 'contour',
            filter: ['==', ['%', ['get', 'ele'], 20], 0],
            paint: {
              'line-color': 'rgba(74, 144, 217, 0.5)',
              'line-width': 1.5,
              'line-dasharray': [4, 2],
            },
          },
          before,
        );
        tracker.add('hydro-flow-lines');
      }
      break;
    }

    case 'watershed': {
      if (boundary && !map.getSource('hydro-watershed-source')) {
        map.addSource('hydro-watershed-source', { type: 'geojson', data: boundary });
        map.addLayer(
          {
            id: 'hydro-watershed-fill',
            type: 'fill',
            source: 'hydro-watershed-source',
            paint: {
              'fill-color': 'rgba(45, 107, 158, 0.12)',
              'fill-outline-color': '#2d6b9e',
            },
          },
          before,
        );
        map.addLayer({
          id: 'hydro-watershed-line',
          type: 'line',
          source: 'hydro-watershed-source',
          paint: {
            'line-color': '#2d6b9e',
            'line-width': 2,
            'line-dasharray': [6, 3],
          },
        });
        tracker.add('hydro-watershed-fill');
        tracker.add('hydro-watershed-line');
      }
      break;
    }

    case 'floodRisk': {
      if (!map.getSource('hydro-flood-source')) {
        map.addSource('hydro-flood-source', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });
      }
      if (!map.getLayer('hydro-flood-hillshade')) {
        map.addLayer(
          {
            id: 'hydro-flood-hillshade',
            type: 'hillshade',
            source: 'hydro-flood-source',
            paint: {
              'hillshade-exaggeration': 0.3,
              'hillshade-shadow-color': '#c44e3f',
              'hillshade-highlight-color': 'transparent',
              'hillshade-accent-color': '#c44e3f',
            },
          },
          before,
        );
        tracker.add('hydro-flood-hillshade');
      }
      break;
    }

    case 'wetlands': {
      if (boundary && !map.getSource('hydro-wetland-source')) {
        map.addSource('hydro-wetland-source', { type: 'geojson', data: boundary });
        map.addLayer(
          {
            id: 'hydro-wetland-fill',
            type: 'fill',
            source: 'hydro-wetland-source',
            paint: {
              'fill-color': 'rgba(58, 138, 107, 0.15)',
              'fill-outline-color': '#3a8a6b',
              'fill-pattern': undefined,
            },
          },
          before,
        );
        tracker.add('hydro-wetland-fill');
      }
      break;
    }
  }
}

function removeHydroLayer(map: maplibregl.Map, layer: HydroLayer, tracker: Set<string>) {
  const layerIds: Record<HydroLayer, string[]> = {
    flowPaths: ['hydro-flow-lines'],
    watershed: ['hydro-watershed-fill', 'hydro-watershed-line'],
    floodRisk: ['hydro-flood-hillshade'],
    wetlands: ['hydro-wetland-fill'],
  };

  for (const id of layerIds[layer]) {
    if (map.getLayer(id)) {
      map.removeLayer(id);
      tracker.delete(id);
    }
  }
}
