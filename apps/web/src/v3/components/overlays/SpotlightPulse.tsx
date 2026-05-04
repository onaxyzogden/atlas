/**
 * SpotlightPulse — short-lived expanding-ring marker placed at a map point.
 *
 * Used to draw the eye after a fly-to (e.g. drawer "Open on map" → flyTo
 * target). The marker is a small DOM element with CSS keyframe rings; it
 * removes itself ~2.5s after mount. Re-firing on the same point requires
 * a fresh `pulseKey` so React re-mounts the component.
 */

import { useEffect } from "react";
import { maplibregl } from "../../../lib/maplibre.js";
import css from "./SpotlightPulse.module.css";

export interface SpotlightPulseProps {
  map: maplibregl.Map;
  point: [number, number];
}

export default function SpotlightPulse({ map, point }: SpotlightPulseProps) {
  useEffect(() => {
    if (!map) return;
    const el = document.createElement("div");
    el.className = css.pulse ?? "";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `<span class="${css.ring}"></span><span class="${css.ring} ${css.ringDelay}"></span><span class="${css.dot}"></span>`;
    const marker = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat(point)
      .addTo(map);
    const timeout = window.setTimeout(() => marker.remove(), 2500);
    return () => {
      window.clearTimeout(timeout);
      marker.remove();
    };
  }, [map, point]);

  return null;
}
