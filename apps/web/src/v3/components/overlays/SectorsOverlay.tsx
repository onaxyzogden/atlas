/**
 * SectorsOverlay — eight cardinal/intercardinal rays from the parcel centroid.
 * Mocked geometry for v3.1 (sun arc, wind, fire, water flows nest under
 * "sector analysis" in permaculture). Real sector data ships with the
 * climate/sun-path service in v3.2.
 */

import { useEffect, useMemo } from "react";
import type { maplibregl } from "../../../lib/maplibre.js";
import { useMatrixTogglesStore } from "../../../store/matrixTogglesStore.js";

const SOURCE_ID = "matrix-sectors-source";
const LINE_LAYER = "matrix-sectors-line";
const LABEL_LAYER = "matrix-sectors-label";
const RAY_METERS = 600;

const DIRECTIONS: Array<{ bearing: number; label: string }> = [
  { bearing: 0, label: "N" },
  { bearing: 45, label: "NE" },
  { bearing: 90, label: "E" },
  { bearing: 135, label: "SE" },
  { bearing: 180, label: "S" },
  { bearing: 225, label: "SW" },
  { bearing: 270, label: "W" },
  { bearing: 315, label: "NW" },
];

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

export interface SectorsOverlayProps {
  map: maplibregl.Map;
  centroid: [number, number];
}

export default function SectorsOverlay({ map, centroid }: SectorsOverlayProps) {
  const visible = useMatrixTogglesStore((s) => s.sectors);

  const data = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = DIRECTIONS.map((d) => ({
      type: "Feature",
      properties: { label: d.label, bearing: d.bearing },
      geometry: {
        type: "LineString",
        coordinates: [centroid, destination(centroid, RAY_METERS, d.bearing)],
      },
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
      if (!map.getLayer(LINE_LAYER)) {
        map.addLayer({
          id: LINE_LAYER,
          type: "line",
          source: SOURCE_ID,
          paint: {
            "line-color": "#c4a265",
            "line-width": 1.6,
            "line-opacity": 0.85,
            "line-dasharray": [2, 2],
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
            "text-size": 11,
            "text-font": ["Noto Sans Bold"],
            "text-anchor": "center",
          },
          paint: {
            "text-color": "#1f1d1a",
            "text-halo-color": "#f2ede3",
            "text-halo-width": 1.4,
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
  }, [map, data, visible]);

  return null;
}
