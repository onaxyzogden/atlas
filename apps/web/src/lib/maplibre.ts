import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';

// Key resolution: a user-supplied key in localStorage takes precedence over
// the build-time env var. The live deploy ships without VITE_MAPTILER_KEY,
// so visitors paste their own key (see setMaptilerKey + the input rendered
// in StepBoundary / MapTokenMissing). Saved-key flow reloads the page so
// this module re-evaluates with the new value — no live-binding gymnastics
// needed at the call sites.
export const MAPTILER_KEY_STORAGE = 'ogden-maptiler-key';

function resolveKey(): string | undefined {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(MAPTILER_KEY_STORAGE);
      if (stored && stored.trim()) return stored.trim();
    }
  } catch { /* storage blocked / SSR */ }
  return import.meta.env['VITE_MAPTILER_KEY'] as string | undefined;
}

/**
 * Persist a user-entered MapTiler key to this browser. Pass null/empty to clear.
 * Caller is responsible for triggering a reload so the module's frozen URLs
 * (MAP_STYLES, TERRAIN_DEM_URL, …) re-evaluate.
 */
export function setMaptilerKey(value: string | null): void {
  try {
    if (value && value.trim()) localStorage.setItem(MAPTILER_KEY_STORAGE, value.trim());
    else localStorage.removeItem(MAPTILER_KEY_STORAGE);
  } catch { /* storage blocked */ }
}

const key = resolveKey();

export const MAP_STYLES: Record<string, string> = {
  satellite:    `https://api.maptiler.com/maps/satellite/style.json?key=${key}`,
  terrain:      `https://api.maptiler.com/maps/topo/style.json?key=${key}`,
  topographic:  `https://api.maptiler.com/maps/topo-v2/style.json?key=${key}`,
  street:       `https://api.maptiler.com/maps/streets/style.json?key=${key}`,
  hybrid:       `https://api.maptiler.com/maps/hybrid/style.json?key=${key}`,
};

// ── Tile source URLs (centralized so the key isn't scattered) ────────────────

/** Raster-DEM tiles for hillshade, slope, and flood analysis */
export const TERRAIN_DEM_URL = `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${key}`;

/** Vector contour lines (source-layer: "contour", property: "ele") */
export const CONTOUR_TILES_URL = `https://api.maptiler.com/tiles/contours/tiles.json?key=${key}`;

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
