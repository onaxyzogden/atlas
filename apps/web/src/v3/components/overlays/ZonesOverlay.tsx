/**
 * ZonesOverlay — permaculture concentric use-frequency rings (Zone 0–5).
 *
 * Zone 0 renders as a small disc at the centroid; Zones 1–4 are annulus
 * polygons (outer ring + inner ring as a hole). Zone 5 = "wild beyond" is
 * rendered as `parcel boundary − zone-4-outer-circle` when a boundary prop
 * is supplied, and omitted otherwise.
 *
 * Visibility treatment (basemap-agnostic): a white casing line sits under the
 * coloured ring line so strokes read on both dark imagery and light/paper
 * basemaps; fill + line widths are zoom-interpolated. Labels render from a
 * dedicated point source — one point per ring placed due north at mid-radius —
 * so all six sit on their own band instead of stacking at the centroid.
 *
 * Pattern matches SectorsOverlay: idempotent ensure, visibility-only on
 * toggle, single GeoJSON source feeding fill / line / label layers.
 */

import { useEffect, useMemo } from "react";
import { circle as turfCircle, destination as turfDestination } from "@turf/turf";
import type { Feature, FeatureCollection, Point, Polygon } from "geojson";
import { maplibregl } from "../../../lib/maplibre.js";
import { useMatrixTogglesStore } from "../../../store/matrixTogglesStore.js";
import type { SiteZones, ZoneRing } from "../../../lib/zones/types.js";

const SOURCE_ID = "matrix-zones-source";
const LABEL_SOURCE_ID = "matrix-zones-label-source";
const FILL_LAYER = "matrix-zones-fill";
const CASING_LAYER = "matrix-zones-line-casing";
const LINE_LAYER = "matrix-zones-line";
const LABEL_LAYER = "matrix-zones-label";

const ALL_LAYERS = [
  FILL_LAYER,
  CASING_LAYER,
  LINE_LAYER,
  LABEL_LAYER,
] as const;

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

/**
 * One label point per ring, placed due north of the centroid at the band's
 * mid-radius so labels land on their own ring instead of stacking at centre.
 * Zone 0 (inner 0) labels at the centroid; Zone 5 (no outer) labels just
 * beyond its inner radius.
 */
function buildLabelCollection(
  zones: SiteZones,
): FeatureCollection<Point, RingFeatureProps> {
  const features: Feature<Point, RingFeatureProps>[] = [];
  for (const ring of zones.rings) {
    const props: RingFeatureProps = {
      id: `zone-${ring.index}`,
      index: ring.index,
      label: ring.label,
      color: ring.color,
    };

    let coords: [number, number];
    if (ring.innerRadiusMeters === 0) {
      coords = zones.centroid;
    } else {
      const midRadius =
        ring.outerRadiusMeters !== undefined
          ? (ring.innerRadiusMeters + ring.outerRadiusMeters) / 2
          : ring.innerRadiusMeters * 1.15;
      const dest = turfDestination(zones.centroid, midRadius, 0, {
        units: "meters",
      });
      coords = dest.geometry.coordinates as [number, number];
    }

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: coords },
      properties: props,
    });
  }
  return { type: "FeatureCollection", features };
}

export default function ZonesOverlay({ map, zones, boundary }: ZonesOverlayProps) {
  const visible = useMatrixTogglesStore((s) => s.zones);
  const data = useMemo(
    () => buildFeatureCollection(zones, boundary),
    [zones, boundary],
  );
  const labelData = useMemo(() => buildLabelCollection(zones), [zones]);

  useEffect(() => {
    if (!map) return;

    const ensure = () => {
      const existing = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (existing) {
        existing.setData(data);
      } else {
        map.addSource(SOURCE_ID, { type: "geojson", data });
      }

      const existingLabels = map.getSource(LABEL_SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (existingLabels) {
        existingLabels.setData(labelData);
      } else {
        map.addSource(LABEL_SOURCE_ID, { type: "geojson", data: labelData });
      }

      if (!map.getLayer(FILL_LAYER)) {
        map.addLayer({
          id: FILL_LAYER,
          type: "fill",
          source: SOURCE_ID,
          paint: {
            "fill-color": ["get", "color"],
            // Stronger zoomed out (helps tell rings apart), lighter zoomed in
            // (don't bury basemap detail).
            "fill-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              14,
              0.28,
              19,
              0.18,
            ],
          },
        });
      }

      // White casing under the coloured line — makes any stroke colour read
      // on dark imagery and on light/paper basemaps alike.
      if (!map.getLayer(CASING_LAYER)) {
        map.addLayer({
          id: CASING_LAYER,
          type: "line",
          source: SOURCE_ID,
          paint: {
            "line-color": "#ffffff",
            "line-opacity": 0.55,
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              14,
              3.5,
              19,
              5.5,
            ],
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
            "line-opacity": 0.95,
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              14,
              1.5,
              19,
              3.5,
            ],
          },
        });
      }

      if (!map.getLayer(LABEL_LAYER)) {
        map.addLayer({
          id: LABEL_LAYER,
          type: "symbol",
          source: LABEL_SOURCE_ID,
          layout: {
            "text-field": ["get", "label"],
            "text-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              14,
              9,
              19,
              12,
            ],
            "text-font": ["Noto Sans Regular"],
            "text-anchor": "center",
            "text-allow-overlap": true,
            "symbol-placement": "point",
          },
          paint: {
            "text-color": "#3d2f1d",
            "text-halo-color": "#f2ede3",
            "text-halo-width": 1.4,
          },
        });
      }

      ALL_LAYERS.forEach((id) => {
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
  }, [map, data, labelData, visible]);

  return null;
}
