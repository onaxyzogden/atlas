/**
 * DesignPropertyOverlay — emphasize the parcel boundary when toggled.
 *
 * Phase 5.1 PR2. The boundary outline is always painted by `DesignMap`
 * itself (so the canvas remains useful even with all overlays off). This
 * overlay layers a dashed *highlight* ring on top so the parcel reads as
 * the active edit surface when "Property" is toggled on.
 *
 * Driven by a `visible` prop. Idempotent ensure-on-styledata.
 */

import { useEffect, useMemo } from "react";
import { maplibregl } from "../../../../lib/maplibre.js";

const SOURCE_ID = "design-property-source";
const RING_LAYER = "design-property-ring";

export interface DesignPropertyOverlayProps {
  map: maplibregl.Map;
  visible: boolean;
  boundary?: GeoJSON.Polygon;
}

export default function DesignPropertyOverlay({ map, visible, boundary }: DesignPropertyOverlayProps) {
  const data = useMemo<GeoJSON.Feature<GeoJSON.Polygon> | null>(() => {
    if (!boundary) return null;
    return { type: "Feature", properties: {}, geometry: boundary };
  }, [boundary]);

  useEffect(() => {
    if (!map || !data) return;

    const ensure = () => {
      const existing = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!existing) {
        map.addSource(SOURCE_ID, { type: "geojson", data });
      } else {
        existing.setData(data);
      }
      if (!map.getLayer(RING_LAYER)) {
        map.addLayer({
          id: RING_LAYER,
          type: "line",
          source: SOURCE_ID,
          paint: {
            "line-color": "#f4d68b",
            "line-width": 2.4,
            "line-opacity": 0.9,
            "line-dasharray": [2, 2],
          },
        });
      }
      if (map.getLayer(RING_LAYER)) {
        map.setLayoutProperty(RING_LAYER, "visibility", visible ? "visible" : "none");
      }
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
  }, [map, visible, data]);

  return null;
}
