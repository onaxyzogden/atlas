/**
 * WindSectorsOverlay — eight-direction wind rose fanning from the site anchor.
 *
 * Mirrors SectorsOverlay (idempotent ensure, visibility-only on toggle) but
 * keys off the dedicated `wind` matrix toggle and uses a single rose color.
 * Petal length encodes prevailing-wind frequency; labels are suppressed for
 * sub-10% directions to keep the rose readable at zoom.
 */

import { useEffect, useMemo } from "react";
import { sector as turfSector } from "@turf/turf";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import { maplibregl } from "../../../lib/maplibre.js";
import { useMatrixTogglesStore } from "../../../store/matrixTogglesStore.js";
import type { SiteSectors } from "../../../lib/sectors/types.js";

const SOURCE_ID = "matrix-wind-source";
const FILL_LAYER = "matrix-wind-fill";
const LINE_LAYER = "matrix-wind-line";
const LABEL_LAYER = "matrix-wind-label";
const LABEL_MIN_FREQUENCY = 0.10;

export interface WindSectorsOverlayProps {
  map: maplibregl.Map;
  rose: SiteSectors;
}

interface WedgeFeatureProps {
  id: string;
  kind: string;
  label: string;
  color: string;
  showLabel: boolean;
}

function buildFeatureCollection(rose: SiteSectors): FeatureCollection<Polygon, WedgeFeatureProps> {
  const features: Feature<Polygon, WedgeFeatureProps>[] = rose.wedges
    .filter((w) => w.reachMeters > 0)
    .map((w) => {
      const poly = turfSector(
        rose.centroid,
        w.reachMeters,
        w.startBearingDeg,
        w.endBearingDeg,
        { units: "meters", steps: 48 },
      );
      const freq = typeof w.meta?.frequency === "number" ? w.meta.frequency : 0;
      return {
        type: "Feature",
        geometry: poly.geometry as Polygon,
        properties: {
          id: w.id,
          kind: w.kind,
          label: w.label,
          color: w.color,
          showLabel: freq >= LABEL_MIN_FREQUENCY,
        },
      };
    });
  return { type: "FeatureCollection", features };
}

export default function WindSectorsOverlay({ map, rose }: WindSectorsOverlayProps) {
  const visible = useMatrixTogglesStore((s) => s.wind);
  const data = useMemo(() => buildFeatureCollection(rose), [rose]);

  useEffect(() => {
    if (!map) return;

    const ensure = () => {
      const existing = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (existing) {
        existing.setData(data);
      } else {
        map.addSource(SOURCE_ID, { type: "geojson", data });
      }

      if (!map.getLayer(FILL_LAYER)) {
        map.addLayer({
          id: FILL_LAYER,
          type: "fill",
          source: SOURCE_ID,
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": 0.18,
            "fill-outline-color": ["get", "color"],
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
            "line-opacity": 0.9,
          },
        });
      }
      if (!map.getLayer(LABEL_LAYER)) {
        map.addLayer({
          id: LABEL_LAYER,
          type: "symbol",
          source: SOURCE_ID,
          filter: ["==", ["get", "showLabel"], true],
          layout: {
            "text-field": ["get", "label"],
            "text-size": 11,
            "text-font": ["Noto Sans Regular"],
            "text-anchor": "center",
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#1f3340",
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
