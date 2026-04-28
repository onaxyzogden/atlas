/**
 * TopographyOverlay — vector contour lines from MapTiler's contours tileset.
 * Source-layer "contour", `ele` property is meters above sea level.
 * Visibility driven by useMatrixTogglesStore.topography.
 */

import { useEffect } from "react";
import { maplibregl, CONTOUR_TILES_URL } from "../../../lib/maplibre.js";
import { useMatrixTogglesStore } from "../../../store/matrixTogglesStore.js";

const SOURCE_ID = "matrix-topography-source";
const LINE_LAYER = "matrix-topography-line";
const LABEL_LAYER = "matrix-topography-label";

export interface TopographyOverlayProps {
  map: maplibregl.Map;
}

export default function TopographyOverlay({ map }: TopographyOverlayProps) {
  const visible = useMatrixTogglesStore((s) => s.topography);

  useEffect(() => {
    if (!map) return;

    const ensure = () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, { type: "vector", url: CONTOUR_TILES_URL });
      }
      if (!map.getLayer(LINE_LAYER)) {
        map.addLayer({
          id: LINE_LAYER,
          type: "line",
          source: SOURCE_ID,
          "source-layer": "contour",
          paint: {
            "line-color": "#7a6a3f",
            "line-width": ["case", ["==", ["%", ["get", "ele"], 100], 0], 1.4, 0.6],
            "line-opacity": 0.75,
          },
        });
      }
      if (!map.getLayer(LABEL_LAYER)) {
        map.addLayer({
          id: LABEL_LAYER,
          type: "symbol",
          source: SOURCE_ID,
          "source-layer": "contour",
          filter: ["==", ["%", ["get", "ele"], 100], 0],
          layout: {
            "symbol-placement": "line",
            "text-field": ["concat", ["to-string", ["get", "ele"]], " m"],
            "text-size": 10,
            "text-font": ["Noto Sans Regular"],
          },
          paint: {
            "text-color": "#3d2f1d",
            "text-halo-color": "#f2ede3",
            "text-halo-width": 1.2,
          },
        });
      }
      [LINE_LAYER, LABEL_LAYER].forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
        }
      });
    };

    if (map.isStyleLoaded()) ensure();
    else map.once("load", ensure);
  }, [map, visible]);

  return null;
}
