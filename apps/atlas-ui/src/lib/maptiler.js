export const MAPTILER_KEY_STORAGE = "ogden-maptiler-key";

export function resolveKey() {
  try {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(MAPTILER_KEY_STORAGE);
      if (stored && stored.trim()) return stored.trim();
    }
  } catch {
    /* storage blocked / SSR */
  }
  return import.meta.env.VITE_MAPTILER_KEY;
}

export function setMaptilerKey(value) {
  try {
    if (value && value.trim()) localStorage.setItem(MAPTILER_KEY_STORAGE, value.trim());
    else localStorage.removeItem(MAPTILER_KEY_STORAGE);
  } catch {
    /* storage blocked */
  }
}

const key = resolveKey();

export const MAP_STYLE_SATELLITE = `https://api.maptiler.com/maps/satellite/style.json?key=${key}`;
export const MAP_STYLE_TOPO = `https://api.maptiler.com/maps/topo/style.json?key=${key}`;
export const hasMapToken = !!key;
