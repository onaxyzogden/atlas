import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';

// Key injected from environment — never hardcode.
// MapLibre GL renderer with MapTiler-hosted tiles.
const key = import.meta.env['VITE_MAPTILER_KEY'] as string | undefined;

export const MAP_STYLES: Record<string, string> = {
  satellite: `https://api.maptiler.com/maps/satellite/style.json?key=${key}`,
  terrain:   `https://api.maptiler.com/maps/topo/style.json?key=${key}`,
  street:    `https://api.maptiler.com/maps/streets/style.json?key=${key}`,
  hybrid:    `https://api.maptiler.com/maps/hybrid/style.json?key=${key}`,
};

/** Whether a MapTiler API key is configured */
export const hasMapToken = !!key;

/** Raw key string for direct API calls (geocoding, etc.) */
export const maptilerKey = key;

/**
 * Pass-through request transform — MapTiler embeds the key in all tile URLs
 * within the style JSON, so no per-request token injection is needed.
 * Kept exported for compatibility with existing map initialization code.
 */
export const maptilerTransformRequest: maplibregl.RequestTransformFunction = (url: string) => {
  return { url };
};

export { maplibregl };
