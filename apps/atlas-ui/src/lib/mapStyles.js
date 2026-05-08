import { resolveKey } from "./maptiler.js";

const k = resolveKey();

export const MAP_STYLES = {
  satellite: { id: "satellite", label: "Satellite", url: `https://api.maptiler.com/maps/satellite/style.json?key=${k}` },
  topo:      { id: "topo",      label: "Topographic", url: `https://api.maptiler.com/maps/topo/style.json?key=${k}` },
  streets:   { id: "streets",   label: "Streets", url: `https://api.maptiler.com/maps/streets-v2/style.json?key=${k}` },
  outdoor:   { id: "outdoor",   label: "Outdoor", url: `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${k}` },
};

export const DEFAULT_STYLE_ID = "satellite";
