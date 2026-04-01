import mapboxgl from 'mapbox-gl';

// Token injected from environment — never hardcode
const token = import.meta.env['VITE_MAPBOX_TOKEN'] as string | undefined;
if (token) {
  mapboxgl.accessToken = token;
}

export const MAP_STYLES: Record<string, string> = {
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  terrain:   'mapbox://styles/mapbox/outdoors-v12',
  street:    'mapbox://styles/mapbox/light-v11',
  hybrid:    'mapbox://styles/mapbox/satellite-v9',
};

export { mapboxgl };
