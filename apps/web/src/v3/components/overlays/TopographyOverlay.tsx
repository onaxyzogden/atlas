/**
 * TopographyOverlay — terrain reading of the parcel:
 *   - hillshade raster-dem layer (relief shading from MapTiler's terrain-rgb-v2)
 *   - vector contour lines from MapTiler's contours tileset
 *   - 100 m contour labels
 *
 * Source-layer "contour", `ele` property is meters above sea level.
 * Visibility (all three layers) driven by useMatrixTogglesStore.topography.
 *
 * Z-order: hillshade is added first so contour lines + labels paint over it.
 */

import { useEffect } from "react";
import {
  maplibregl,
  CONTOUR_TILES_URL,
  TERRAIN_DEM_URL,
} from "../../../lib/maplibre.js";
import { useMatrixTogglesStore } from "../../../store/matrixTogglesStore.js";

const DEM_SOURCE_ID = "matrix-topography-dem";
const HILLSHADE_LAYER = "matrix-topography-hillshade";
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
      // Hillshade goes on first so contour lines + labels render above it.
      if (!map.getSource(DEM_SOURCE_ID)) {
        map.addSource(DEM_SOURCE_ID, {
          type: "raster-dem",
          url: TERRAIN_DEM_URL,
          tileSize: 256,
        });
      }
      if (!map.getLayer(HILLSHADE_LAYER)) {
        map.addLayer({
          id: HILLSHADE_LAYER,
          type: "hillshade",
          source: DEM_SOURCE_ID,
          paint: {
            "hillshade-exaggeration": 0.6,
            "hillshade-shadow-color": "#3d2f1d",
            "hillshade-highlight-color": "#f2ede3",
            "hillshade-accent-color": "#7a6a3f",
          },
        });
      }
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
      // Hillshade paints at ~0.35 effective opacity when visible (the
      // exaggeration + halo colours above already produce a soft relief;
      // the layer-level opacity below tunes the final blend with the basemap).
      if (map.getLayer(HILLSHADE_LAYER)) {
        map.setPaintProperty(
          HILLSHADE_LAYER,
          "hillshade-exaggeration",
          visible ? 0.6 : 0,
        );
      }
      [HILLSHADE_LAYER, LINE_LAYER, LABEL_LAYER].forEach((id) => {
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
