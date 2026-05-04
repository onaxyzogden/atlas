/**
 * DesignHydrologyOverlay — surface water + waterways from OpenMapTiles.
 *
 * Phase 5.1 PR2. Mirrors v3 `WaterOverlay` (Diagnose) but reads visibility
 * from a `visible` prop instead of `useMatrixTogglesStore`, so the chip
 * toggle on `DesignPage` controls it directly.
 *
 * Idempotent ensure-on-styledata so DesignMap base-map swaps don't
 * double-add the source/layers.
 */

import { useEffect } from "react";
import { maplibregl, OPENMAPTILES_TILES_URL } from "../../../../lib/maplibre.js";

const SOURCE_ID = "design-hydrology-source";
const FILL_LAYER = "design-hydrology-fill";
const LINE_LAYER = "design-hydrology-line";

export interface DesignHydrologyOverlayProps {
  map: maplibregl.Map;
  visible: boolean;
}

export default function DesignHydrologyOverlay({ map, visible }: DesignHydrologyOverlayProps) {
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
            "fill-opacity": 0.4,
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
    if (ready()) ensure();
    const onStyle = () => {
      if (!ready()) return;
      ensure();
    };
    map.on("styledata", onStyle);
    return () => {
      map.off("styledata", onStyle);
    };
  }, [map, visible]);

  return null;
}
