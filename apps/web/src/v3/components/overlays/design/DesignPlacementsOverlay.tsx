/**
 * DesignPlacementsOverlay — render project-filtered placements from the
 * v2 stores (`useStructureStore`, `useLivestockStore`) on the v3 design
 * canvas.
 *
 * Phase 5.1 PR3. Always visible (not chip-toggled) — the user just
 * dropped these, they should see them. Idempotent ensure-on-styledata
 * so base-map swaps don't wipe the geometry.
 *
 * Two GeoJSON sources:
 *   - design-paddock-source  → fill (light green) + line (darker green)
 *   - design-structure-source → fill (warm gold) + line (darker gold)
 *
 * Reads stores via project-id filter. Updates flow through the existing
 * Zustand subscription model — when the page-level drop handler calls
 * `addPaddock` / `addStructure`, this component re-renders and
 * `setData` pushes the new feature to the map.
 */

import { useEffect, useMemo } from "react";
import { maplibregl } from "../../../../lib/maplibre.js";
import { useStructureStore } from "../../../../store/structureStore.js";
import { useLivestockStore } from "../../../../store/livestockStore.js";

const PADDOCK_SOURCE = "design-paddock-source";
const PADDOCK_FILL = "design-paddock-fill";
const PADDOCK_LINE = "design-paddock-line";
const STRUCT_SOURCE = "design-structure-source";
const STRUCT_FILL = "design-structure-fill";
const STRUCT_LINE = "design-structure-line";

export interface DesignPlacementsOverlayProps {
  map: maplibregl.Map;
  projectId: string;
}

export default function DesignPlacementsOverlay({ map, projectId }: DesignPlacementsOverlayProps) {
  const paddocks = useLivestockStore((s) => s.paddocks);
  const structures = useStructureStore((s) => s.structures);

  const paddockFC = useMemo<GeoJSON.FeatureCollection<GeoJSON.Polygon>>(() => ({
    type: "FeatureCollection",
    features: paddocks
      .filter((p) => p.projectId === projectId)
      .map((p) => ({
        type: "Feature",
        properties: { id: p.id, name: p.name },
        geometry: p.geometry,
      })),
  }), [paddocks, projectId]);

  const structureFC = useMemo<GeoJSON.FeatureCollection<GeoJSON.Polygon>>(() => ({
    type: "FeatureCollection",
    features: structures
      .filter((s) => s.projectId === projectId)
      .map((s) => ({
        type: "Feature",
        properties: { id: s.id, name: s.name, type: s.type },
        geometry: s.geometry,
      })),
  }), [structures, projectId]);

  useEffect(() => {
    if (!map) return;

    const ensure = () => {
      // Paddocks
      const paddockSrc = map.getSource(PADDOCK_SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (!paddockSrc) {
        map.addSource(PADDOCK_SOURCE, { type: "geojson", data: paddockFC });
      } else {
        paddockSrc.setData(paddockFC);
      }
      if (!map.getLayer(PADDOCK_FILL)) {
        map.addLayer({
          id: PADDOCK_FILL,
          type: "fill",
          source: PADDOCK_SOURCE,
          paint: { "fill-color": "#7da37e", "fill-opacity": 0.25 },
        });
      }
      if (!map.getLayer(PADDOCK_LINE)) {
        map.addLayer({
          id: PADDOCK_LINE,
          type: "line",
          source: PADDOCK_SOURCE,
          paint: { "line-color": "#3f6a48", "line-width": 1.6, "line-opacity": 0.85 },
        });
      }

      // Structures
      const structSrc = map.getSource(STRUCT_SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (!structSrc) {
        map.addSource(STRUCT_SOURCE, { type: "geojson", data: structureFC });
      } else {
        structSrc.setData(structureFC);
      }
      if (!map.getLayer(STRUCT_FILL)) {
        map.addLayer({
          id: STRUCT_FILL,
          type: "fill",
          source: STRUCT_SOURCE,
          paint: { "fill-color": "#c4a265", "fill-opacity": 0.55 },
        });
      }
      if (!map.getLayer(STRUCT_LINE)) {
        map.addLayer({
          id: STRUCT_LINE,
          type: "line",
          source: STRUCT_SOURCE,
          paint: { "line-color": "#7a5a23", "line-width": 1.8, "line-opacity": 0.95 },
        });
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
  }, [map, paddockFC, structureFC]);

  return null;
}
