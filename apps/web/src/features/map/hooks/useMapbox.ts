import { useEffect, useRef, useState } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { mapboxgl, MAP_STYLES } from '../../../lib/mapbox.js';
import { useMapStore } from '../../../store/mapStore.js';

interface UseMapboxOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
}

export function useMapbox({ containerRef, initialCenter, initialZoom }: UseMapboxOptions) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const style = useMapStore((s) => s.style);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!mapboxgl.accessToken) {
      console.warn('[OGDEN] No Mapbox token — map will not render. Set VITE_MAPBOX_TOKEN.');
      return;
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLES[style] ?? MAP_STYLES['satellite']!,
      center: initialCenter ?? [-79.8, 43.5], // Default: Halton Region, Ontario
      zoom: initialZoom ?? 12,
      attributionControl: true,
      preserveDrawingBuffer: true, // Required for map screenshot export
      // Smooth, contemplative navigation — no jarring transitions
      pitchWithRotate: false,
      dragRotate: false,
    });

    // Navigation controls (top-right)
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

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
            'fill-color': '#7d6140',
            'fill-outline-color': '#4a3823',
            'fill-opacity': 0.25,
          },
        },
        {
          id: 'gl-draw-polygon-stroke',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon']],
          paint: {
            'line-color': '#4a3823',
            'line-width': 2,
          },
        },
        {
          id: 'gl-draw-line',
          type: 'line',
          filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
          paint: {
            'line-color': '#c4a265',
            'line-width': 3,
            'line-dasharray': [2, 1],
          },
        },
        {
          id: 'gl-draw-line-static',
          type: 'line',
          filter: ['all', ['==', '$type', 'LineString'], ['==', 'mode', 'static']],
          paint: {
            'line-color': '#7d6140',
            'line-width': 2,
          },
        },
        {
          id: 'gl-draw-point',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point']],
          paint: {
            'circle-radius': 5,
            'circle-color': '#7d6140',
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

  // React to style changes
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    mapRef.current.setStyle(MAP_STYLES[style] ?? MAP_STYLES['satellite']!);
  }, [style, isLoaded]);

  return { map: mapRef.current, draw: drawRef.current, isLoaded };
}
