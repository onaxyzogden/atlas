/**
 * DesignContoursOverlay — vector contour lines from MapTiler's contours
 * tileset (source-layer "contour", `ele` property is m above sea level).
 *
 * Phase 5.1 PR2. Differs from `TopographyOverlay` (Diagnose) in that we
 * deliberately *don't* paint hillshade — Design's canvas wants contour
 * geometry as a placement guide, not a relief shader competing with the
 * satellite imagery underneath. Visibility is `visible`-prop driven so
 * the chip toggle on `DesignPage` controls it directly (rather than the
 * Diagnose-style `useMatrixTogglesStore`).
 *
 * Idempotent ensure-on-styledata so style swaps via DesignMap's Base Map
 * dropdown don't double-add the source/layers.
 */

import { useEffect } from "react";
import { maplibregl, CONTOUR_TILES_URL } from "../../../../lib/maplibre.js";

const SOURCE_ID = "design-contours-source";
const LINE_LAYER = "design-contours-line";
const LABEL_LAYER = "design-contours-label";

export interface DesignContoursOverlayProps {
  map: maplibregl.Map;
  visible: boolean;
}

export default function DesignContoursOverlay({ map, visible }: DesignContoursOverlayProps) {
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
            "line-color": "#dca87c",
            "line-width": ["case", ["==", ["%", ["get", "ele"], 100], 0], 1.2, 0.5],
            "line-opacity": 0.6,
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
