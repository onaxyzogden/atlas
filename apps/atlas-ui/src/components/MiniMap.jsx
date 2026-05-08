import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE_SATELLITE, hasMapToken } from "../lib/maptiler.js";
import { MapTokenMissing } from "./MapTokenMissing.jsx";

export function MiniMap({ center = [-79.87, 43.55], zoom = 11, style = MAP_STYLE_SATELLITE, className = "" }) {
  const ref = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!hasMapToken || !ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style,
      center,
      zoom,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasMapToken) {
    return <MapTokenMissing className={className} />;
  }

  return <div ref={ref} className={`mini-map ${className}`.trim()} />;
}
