/**
 * ZonesOverlay — permaculture concentric use-frequency rings (Zone 0–5).
 *
 * Zone 0 renders as a small disc at the centroid; Zones 1–4 are annulus
 * polygons (outer ring + inner ring as a hole). Zone 5 = "wild beyond" is
 * rendered as `parcel boundary − zone-4-outer-circle` when a boundary prop
 * is supplied, and omitted otherwise.
 *
 * Pattern matches SectorsOverlay: idempotent ensure, visibility-only on
 * toggle, single GeoJSON source feeding fill / line / label layers.
 */

import { useEffect, useMemo } from "react";
import { circle as turfCircle } from "@turf/turf";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import { maplibregl } from "../../../lib/maplibre.js";
import { useMatrixTogglesStore } from "../../../store/matrixTogglesStore.js";
import type { SiteZones, ZoneRing } from "../../../lib/zones/types.js";

const SOURCE_ID = "matrix-zones-source";
const FILL_LAYER = "matrix-zones-fill";
const LINE_LAYER = "matrix-zones-line";
const LABEL_LAYER = "matrix-zones-label";

export interface ZonesOverlayProps {
  map: maplibregl.Map;
  zones: SiteZones;
  /** When present, Zone 5 is painted as boundary − zone-4-outer. */
  boundary?: GeoJSON.Polygon;
}

interface RingFeatureProps {
  id: string;
  index: number;
  label: string;
  color: string;
}

function ringCoordinates(
  centroid: [number, number],
  radiusMeters: number,
  steps = 64,
): number[][] {
  const c = turfCircle(centroid, radiusMeters, { units: "meters", steps });
  return (c.geometry.coordinates[0] ?? []) as number[][];
}

function reversed<T>(arr: T[]): T[] {
  return arr.slice().reverse();
}

function ringFeature(
  ring: ZoneRing,
  centroid: [number, number],
  boundary: GeoJSON.Polygon | undefined,
): Feature<Polygon, RingFeatureProps> | null {
  const props: RingFeatureProps = {
    id: `zone-${ring.index}`,
    index: ring.index,
    label: ring.label,
    color: ring.color,
  };

  // Zone 0 — solid disc at centroid.
  if (ring.innerRadiusMeters === 0 && ring.outerRadiusMeters !== undefined) {
    const outer = ringCoordinates(centroid, ring.outerRadiusMeters);
    return {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [outer] },
      properties: props,
    };
  }

  // Zone 5 — beyond the last finite radius, clipped to parcel boundary.
  if (ring.outerRadiusMeters === undefined) {
    if (!boundary) return null;
    const innerHole = reversed(ringCoordinates(centroid, ring.innerRadiusMeters));
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [(boundary.coordinates[0] ?? []) as number[][], innerHole],
      },
      properties: props,
    };
  }

  // Zones 1–4 — annulus (outer ring + inner ring as a hole).
  const outer = ringCoordinates(centroid, ring.outerRadiusMeters);
  const innerHole = reversed(ringCoordinates(centroid, ring.innerRadiusMeters));
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [outer, innerHole] },
    properties: props,
  };
}

function buildFeatureCollection(
  zones: SiteZones,
  boundary: GeoJSON.Polygon | undefined,
): FeatureCollection<Polygon, RingFeatureProps> {
  const features: Feature<Polygon, RingFeatureProps>[] = [];
  for (const ring of zones.rings) {
    const f = ringFeature(ring, zones.centroid, boundary);
    if (f) features.push(f);
  }
  return { type: "FeatureCollection", features };
}

export default function ZonesOverlay({ map, zones, boundary }: ZonesOverlayProps) {
  const visible = useMatrixTogglesStore((s) => s.zones);
  const data = useMemo(
    () => buildFeatureCollection(zones, boundary),
    [zones, boundary],
  );

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
            "fill-opacity": 0.14,
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
            "line-width": 1.2,
            "line-opacity": 0.85,
          },
        });
      }
      if (!map.getLayer(LABEL_LAYER)) {
        map.addLayer({
          id: LABEL_LAYER,
          type: "symbol",
          source: SOURCE_ID,
          layout: {
            "text-field": ["get", "label"],
            "text-size": 10,
            "text-font": ["Noto Sans Regular"],
            "text-anchor": "center",
            "text-allow-overlap": false,
            "symbol-placement": "point",
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
