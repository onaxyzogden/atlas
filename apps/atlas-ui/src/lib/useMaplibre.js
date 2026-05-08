import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { hasMapToken } from "./maptiler.js";

const DRAW_STYLES = [
  {
    id: "gl-draw-polygon-fill",
    type: "fill",
    filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
    paint: { "fill-color": "#a5c736", "fill-outline-color": "#0e1a14", "fill-opacity": 0.2 },
  },
  {
    id: "gl-draw-polygon-stroke",
    type: "line",
    filter: ["all", ["==", "$type", "Polygon"]],
    paint: { "line-color": "#a5c736", "line-width": 2 },
  },
  {
    id: "gl-draw-line",
    type: "line",
    filter: ["all", ["==", "$type", "LineString"], ["!=", "mode", "static"]],
    paint: { "line-color": "#d4a93f", "line-width": 3, "line-dasharray": [2, 1] },
  },
  {
    id: "gl-draw-line-static",
    type: "line",
    filter: ["all", ["==", "$type", "LineString"], ["==", "mode", "static"]],
    paint: { "line-color": "#a5c736", "line-width": 2 },
  },
  {
    id: "gl-draw-point",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"]],
    paint: { "circle-radius": 5, "circle-color": "#a5c736", "circle-stroke-width": 2, "circle-stroke-color": "#fff" },
  },
];

export function useMaplibre({ containerRef, styleUrl, initialCenter = [-79.87, 43.55], initialZoom = 11 }) {
  const mapRef = useRef(null);
  const drawRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!hasMapToken) {
      setMapError("Map unavailable — MapTiler API key is not configured.");
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: { compact: true },
      preserveDrawingBuffer: true,
      pitchWithRotate: false,
      dragRotate: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");

    const draw = new MapboxDraw({ displayControlsDefault: false, controls: {}, styles: DRAW_STYLES });
    map.addControl(draw);

    map.on("load", () => setIsLoaded(true));
    map.on("error", (e) => {
      if (e?.error?.message) setMapError(e.error.message);
    });

    mapRef.current = map;
    drawRef.current = draw;

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
      setIsLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { map: mapRef.current, draw: drawRef.current, mapRef, drawRef, isLoaded, mapError };
}
