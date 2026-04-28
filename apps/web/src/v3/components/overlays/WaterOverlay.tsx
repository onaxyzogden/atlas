/**
 * WaterOverlay — surface water + watercourses from OpenMapTiles vector tiles.
 *
 * Two layers off the same source:
 *   - "water" polygon source-layer → cyan fill (lakes, ponds, wetlands)
 *   - "waterway" line source-layer → cyan line (streams, rivers, canals)
 *
 * Visibility driven by useMatrixTogglesStore.water. Mirrors the idempotent
 * ensure pattern of TopographyOverlay so style reloads don't double-add.
 */

import { useEffect } from "react";
import { maplibregl, OPENMAPTILES_TILES_URL } from "../../../lib/maplibre.js";
import { useMatrixTogglesStore } from "../../../store/matrixTogglesStore.js";

const SOURCE_ID = "matrix-water-source";
const FILL_LAYER = "matrix-water-fill";
const LINE_LAYER = "matrix-waterway-line";

export interface WaterOverlayProps {
  map: maplibregl.Map;
}

export default function WaterOverlay({ map }: WaterOverlayProps) {
  const visible = useMatrixTogglesStore((s) => s.water);

  useEffect(() => {
    if (!map) return;

    const ensure = () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, { type: "vector", url: OPENMAPTILES_TILES_URL });
      }
      if (!map.getLayer(FILL_LAYER)) {
        map.addLayer({
          id: FILL_LAYER,
          type: "fill",
          source: SOURCE_ID,
          "source-layer": "water",
          paint: {
            "fill-color": "#5b8aa8",
            "fill-opacity": 0.35,
          },
        });
      }
      if (!map.getLayer(LINE_LAYER)) {
        map.addLayer({
          id: LINE_LAYER,
          type: "line",
          source: SOURCE_ID,
          "source-layer": "waterway",
          paint: {
            "line-color": "#3f6a85",
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10, 0.6,
              14, 1.4,
              17, 2.4,
            ],
            "line-opacity": 0.85,
          },
        });
      }
      [FILL_LAYER, LINE_LAYER].forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
        }
      });
    };

    const ready = () => (map.getStyle()?.layers?.length ?? 0) > 0;
    if (ready()) {
      ensure();
      return;
    }
    const onStyle = () => {
      if (!ready()) return;
      ensure();
      map.off("styledata", onStyle);
    };
    map.on("styledata", onStyle);
    return () => {
      map.off("styledata", onStyle);
    };
  }, [map, visible]);

  return null;
}
