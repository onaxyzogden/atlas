/**
 * ZonesOverlay — Mollison's Zones 1–5 as concentric rings around the parcel
 * centroid. Mocked radii for v3.1 (zone boundaries are designer-defined in
 * real practice). Zone 0 is the homestead (the centroid itself).
 */

import { useEffect, useMemo } from "react";
import type { maplibregl } from "../../../lib/maplibre.js";
import { useMatrixTogglesStore } from "../../../store/matrixTogglesStore.js";

const SOURCE_ID = "matrix-zones-source";
const FILL_LAYER = "matrix-zones-fill";
const LINE_LAYER = "matrix-zones-line";
const LABEL_LAYER = "matrix-zones-label";

const ZONE_RADII_M = [25, 75, 200, 600, 1500];
const ZONE_COLORS = ["#7a6a3f", "#9a8550", "#b59c63", "#c4a265", "#d3b884"];
const RING_STEPS = 64;

function destination(
  [lng, lat]: [number, number],
  meters: number,
  bearingDeg: number,
): [number, number] {
  const latRad = (lat * Math.PI) / 180;
  const bearingRad = (bearingDeg * Math.PI) / 180;
  const dLat = (meters * Math.cos(bearingRad)) / 111000;
  const dLng = (meters * Math.sin(bearingRad)) / (111000 * Math.cos(latRad));
  return [lng + dLng, lat + dLat];
}

function ring(centroid: [number, number], radiusM: number): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i <= RING_STEPS; i++) {
    coords.push(destination(centroid, radiusM, (i * 360) / RING_STEPS));
  }
  return coords;
}

export interface ZonesOverlayProps {
  map: maplibregl.Map;
  centroid: [number, number];
}

export default function ZonesOverlay({ map, centroid }: ZonesOverlayProps) {
  const visible = useMatrixTogglesStore((s) => s.zones);

  const data = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = ZONE_RADII_M.map((r, i) => ({
      type: "Feature",
      properties: { zone: i + 1, color: ZONE_COLORS[i], label: `Zone ${i + 1}` },
      geometry: { type: "Polygon", coordinates: [ring(centroid, r)] },
    }));
    return { type: "FeatureCollection", features };
  }, [centroid]);

  useEffect(() => {
    if (!map) return;

    const ensure = () => {
      const existing = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!existing) {
        map.addSource(SOURCE_ID, { type: "geojson", data });
      } else {
        existing.setData(data);
      }
      if (!map.getLayer(FILL_LAYER)) {
        map.addLayer({
          id: FILL_LAYER,
          type: "fill",
          source: SOURCE_ID,
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": 0.08,
          },
        });
      }
      if (!map.getLayer(LINE_LAYER)) {
        map.addLayer({
          id: LINE_LAYER,
          type: "line",
          source: SOURCE_ID,
          paint: {
            "line-color": ["get", "color"],
            "line-width": 1.4,
            "line-opacity": 0.8,
          },
        });
      }
      if (!map.getLayer(LABEL_LAYER)) {
        map.addLayer({
          id: LABEL_LAYER,
          type: "symbol",
          source: SOURCE_ID,
          layout: {
            "symbol-placement": "line",
            "text-field": ["get", "label"],
            "text-size": 10,
            "text-font": ["Noto Sans Bold"],
          },
          paint: {
            "text-color": "#3d2f1d",
            "text-halo-color": "#f2ede3",
            "text-halo-width": 1.2,
          },
        });
      }
      [FILL_LAYER, LINE_LAYER, LABEL_LAYER].forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
        }
      });
    };

    if (map.isStyleLoaded()) ensure();
    else map.once("load", ensure);
  }, [map, data, visible]);

  return null;
}
