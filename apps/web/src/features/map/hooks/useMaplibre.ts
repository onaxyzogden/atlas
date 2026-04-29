import { useEffect, useRef, useState } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { maplibregl, MAP_STYLES, hasMapToken, maptilerTransformRequest } from '../../../lib/maplibre.js';
import { useMapStore } from '../../../store/mapStore.js';
import { map as mapTokens, group, earth } from '../../../lib/tokens.js';

interface UseMapboxOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
}

export function useMaplibre({ containerRef, initialCenter, initialZoom }: UseMapboxOptions) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const style = useMapStore((s) => s.style);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!hasMapToken) {
      console.warn('[OGDEN] No MapTiler key — map will not render. Set VITE_MAPTILER_KEY.');
      setMapError('Map unavailable — MapTiler API key is not configured.');
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES[style] ?? MAP_STYLES['satellite']!,
      center: initialCenter ?? [-79.8, 43.5], // Default: Halton Region, Ontario
      zoom: initialZoom ?? 12,
      attributionControl: {},
      preserveDrawingBuffer: true, // Required for map screenshot export
      transformRequest: maptilerTransformRequest,
      // Smooth, contemplative navigation — no jarring transitions
      pitchWithRotate: false,
      dragRotate: false,
    });

    // Navigation controls (top-right)
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    // MapboxGL Draw for zone/boundary editing
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: [
        // Custom draw styles matching the OGDEN earth palette
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'fill-color': mapTokens.boundary,
            'fill-outline-color': earth[800],
            'fill-opacity': 0.25,
          },
        },
        {
          id: 'gl-draw-polygon-stroke',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon']],
          paint: {
            'line-color': earth[800],
            'line-width': 2,
          },
        },
        {
          id: 'gl-draw-line',
          type: 'line',
          filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
          paint: {
            'line-color': group.livestock,
            'line-width': 3,
            'line-dasharray': [2, 1],
          },
        },
        {
          id: 'gl-draw-line-static',
          type: 'line',
          filter: ['all', ['==', '$type', 'LineString'], ['==', 'mode', 'static']],
          paint: {
            'line-color': mapTokens.boundary,
            'line-width': 2,
          },
        },
        {
          id: 'gl-draw-point',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point']],
          paint: {
            'circle-radius': 5,
            'circle-color': mapTokens.boundary,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        },
      ],
    });

    map.addControl(draw);
    map.on('load', () => setIsLoaded(true));

    mapRef.current = map;
    drawRef.current = draw;

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
      setIsLoaded(false);
    };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reactive style swaps live in MapCanvas (chrome audit, 2026-04-25).
  // Owning the swap in the same component that owns `addAllLayers`
  // guarantees the `style.load` re-hydration listener is registered
  // before `setStyle` is invoked, eliminating a race where user-drawn
  // boundaries / zones / structures could be lost across basemap
  // switches.

  return { map: mapRef.current, draw: drawRef.current, isLoaded, mapError };
}
