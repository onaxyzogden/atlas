import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';

// Token injected from environment — never hardcode.
// Still a Mapbox token (for Mapbox-hosted tiles), but the GL renderer is MapLibre.
const token = import.meta.env['VITE_MAPBOX_TOKEN'] as string | undefined;

export const MAP_STYLES: Record<string, string> = {
  satellite: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12?access_token=${token}`,
  terrain:   `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12?access_token=${token}`,
  street:    `https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=${token}`,
  hybrid:    `https://api.mapbox.com/styles/v1/mapbox/satellite-v9?access_token=${token}`,
};

/** Whether a Mapbox tile-access token is configured */
export const hasMapToken = !!token;

/** Raw token string for direct API calls (geocoding, etc.) */
export const mapboxToken = token;

/**
 * Appends the Mapbox access token to requests targeting Mapbox APIs.
 * Pass as `transformRequest` when constructing a maplibregl.Map.
 */
export const mapboxTransformRequest: maplibregl.RequestTransformFunction = (url: string) => {
  if (token && (url.includes('api.mapbox.com') || url.includes('tiles.mapbox.com'))) {
    return {
      url: url.includes('?') ? `${url}&access_token=${token}` : `${url}?access_token=${token}`,
    };
  }
  return { url };
};

export { maplibregl };
