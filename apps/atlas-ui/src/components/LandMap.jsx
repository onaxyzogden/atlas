import { useEffect, useRef } from "react";
import length from "@turf/length";
import { hasMapToken } from "../lib/maptiler.js";
import { useMaplibre } from "../lib/useMaplibre.js";
import { MapTokenMissing } from "./MapTokenMissing.jsx";

const HOME_CENTER = [-79.87, 43.55];
const HOME_ZOOM = 11;

const EMPTY_FC = { type: "FeatureCollection", features: [] };
const userSourceId = (key) => `lb-user-${key}`;
const userLayerIds = (key) => ({
  fill: `lb-user-${key}-fill`,
  line: `lb-user-${key}-line`,
  point: `lb-user-${key}-point`,
});

export function LandMap({
  styleUrl,
  overlays,
  activeKeys,
  pitch = 0,
  drawIntent = null,
  drawnByModule = {},
  onMeasureResult,
  onFeatureCreated,
  resetSignal = 0,
  className = "",
}) {
  const containerRef = useRef(null);
  const { mapRef, drawRef, isLoaded, mapError } = useMaplibre({
    containerRef,
    styleUrl,
    initialCenter: HOME_CENTER,
    initialZoom: HOME_ZOOM,
  });

  // Stable ref into latest intent so the draw.create handler can read tag/moduleKey.
  const drawIntentRef = useRef(drawIntent);
  drawIntentRef.current = drawIntent;
  const drawnRef = useRef(drawnByModule);
  drawnRef.current = drawnByModule;

  // Synthetic overlay registration (idempotent).
  const addSyntheticOverlays = (map) => {
    Object.entries(overlays).forEach(([, def]) => {
      const sourceId = def.source.id;
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, def.source.source);
      }
      def.layers.forEach((layer) => {
        if (!map.getLayer(layer.id)) {
          map.addLayer({ ...layer, source: sourceId, layout: { ...(layer.layout ?? {}), visibility: "none" } });
        }
      });
    });
  };

  // User-feature sources + layers (one source per module, three painted layers).
  const addUserOverlays = (map) => {
    Object.entries(overlays).forEach(([key, def]) => {
      const srcId = userSourceId(key);
      const ids = userLayerIds(key);
      const data = drawnRef.current?.[key] ?? EMPTY_FC;
      if (!map.getSource(srcId)) {
        map.addSource(srcId, { type: "geojson", data });
      } else {
        try { map.getSource(srcId).setData(data); } catch {}
      }
      const color = def.color ?? "#cfe6ee";
      if (!map.getLayer(ids.fill)) {
        map.addLayer({
          id: ids.fill, source: srcId, type: "fill",
          filter: ["==", "$type", "Polygon"],
          paint: { "fill-color": color, "fill-opacity": 0.28 },
          layout: { visibility: "none" },
        });
      }
      if (!map.getLayer(ids.line)) {
        map.addLayer({
          id: ids.line, source: srcId, type: "line",
          filter: ["!=", "$type", "Point"],
          paint: { "line-color": color, "line-width": 2.5 },
          layout: { visibility: "none" },
        });
      }
      if (!map.getLayer(ids.point)) {
        map.addLayer({
          id: ids.point, source: srcId, type: "circle",
          filter: ["==", "$type", "Point"],
          paint: {
            "circle-radius": 7,
            "circle-color": color,
            "circle-stroke-color": "#0e1a14",
            "circle-stroke-width": 2,
          },
          layout: { visibility: "none" },
        });
      }
    });
  };

  const applyVisibility = (map) => {
    Object.entries(overlays).forEach(([key, def]) => {
      const visible = activeKeys.has(key) ? "visible" : "none";
      def.layers.forEach((layer) => {
        if (map.getLayer(layer.id)) map.setLayoutProperty(layer.id, "visibility", visible);
      });
      const ids = userLayerIds(key);
      [ids.fill, ids.line, ids.point].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible);
      });
    });
  };

  // Initial registration.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    addSyntheticOverlays(map);
    addUserOverlays(map);
    applyVisibility(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // Style swaps — re-add overlays after style.load.
  const prevStyleRef = useRef(styleUrl);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    if (prevStyleRef.current === styleUrl) return;
    prevStyleRef.current = styleUrl;
    map.setStyle(styleUrl);
    map.once("style.load", () => {
      addSyntheticOverlays(map);
      addUserOverlays(map);
      applyVisibility(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleUrl, isLoaded]);

  // Push drawn-feature updates into the per-module sources.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    Object.keys(overlays).forEach((key) => {
      const src = map.getSource(userSourceId(key));
      if (src) {
        try { src.setData(drawnByModule[key] ?? EMPTY_FC); } catch {}
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawnByModule, isLoaded]);

  // Visibility toggles.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    applyVisibility(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKeys, isLoaded]);

  // Pitch control.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    map.easeTo({ pitch, duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pitch, isLoaded]);

  // Reset view.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !resetSignal) return;
    map.easeTo({ center: HOME_CENTER, zoom: HOME_ZOOM, pitch: 0, bearing: 0, duration: 700 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  // Apply draw intent (mode swap). Module-tool intents and the global measure
  // tool both flow through this single effect.
  useEffect(() => {
    const map = mapRef.current;
    const draw = drawRef.current;
    if (!map || !draw || !isLoaded) return;
    if (drawIntent && drawIntent.mode && drawIntent.mode !== "simple_select") {
      try { draw.deleteAll(); } catch {}
      try { draw.changeMode(drawIntent.mode); } catch {}
    } else {
      try {
        draw.changeMode("simple_select");
        draw.deleteAll();
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawIntent, isLoaded]);

  // Single draw.create listener (stable). Reads latest intent from ref so it
  // doesn't need to re-bind on every intent change.
  useEffect(() => {
    const map = mapRef.current;
    const draw = drawRef.current;
    if (!map || !draw || !isLoaded) return;

    const onCreate = (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const intent = drawIntentRef.current;
      if (!intent) return;

      if (intent.tag === "measure") {
        if (feat.geometry?.type === "LineString") {
          const km = length(feat, { units: "kilometers" });
          onMeasureResult?.(km);
        }
        return;
      }

      if (intent.moduleKey) {
        const enriched = {
          ...feat,
          properties: { ...(feat.properties ?? {}), moduleKey: intent.moduleKey, tag: intent.tag },
        };
        onFeatureCreated?.(intent.moduleKey, enriched);
        // Remove from MapboxDraw — we render via our own per-module source.
        try { draw.delete(feat.id); } catch {}
      }
    };

    map.on("draw.create", onCreate);
    return () => { map.off("draw.create", onCreate); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  if (!hasMapToken) return <MapTokenMissing className={className} />;
  if (mapError) {
    return (
      <div className={`mini-map mini-map--missing ${className}`.trim()}>
        <p style={{ color: "var(--olos-cream)" }}>{mapError}</p>
      </div>
    );
  }
  return <div ref={containerRef} className={`land-map ${className}`.trim()} />;
}
