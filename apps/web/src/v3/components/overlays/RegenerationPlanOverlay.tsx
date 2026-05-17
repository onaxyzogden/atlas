/**
 * RegenerationPlanOverlay — tints zones that carry a steward-authored
 * regeneration plan by where they sit on the revival journey
 * (iḥyāʾ al-mawāt — reviving troubled land under stewardship).
 *
 * Three-way readiness tint, derived from the plan's own lifecycle:
 *   clay   — planned, pathway not yet started
 *   amber  — pathway started, steward has not confirmed recovery
 *   green  — steward has confirmed readiness (the gate is open)
 *
 * "Ready" is the shared evaluator's decisive rule (`!!stewardConfirmedAt`);
 * this overlay only presents the plan's lifecycle state and never makes a
 * gate decision itself. Visibility treatment matches ZonesOverlay (white
 * casing under the coloured line so strokes read on any basemap). Self-
 * gated: no Matrix toggle — when the project has no plans the source is an
 * empty FeatureCollection and nothing paints.
 */

import { useEffect, useMemo } from "react";
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Point,
  Polygon,
} from "geojson";
import { maplibregl } from "../../../lib/maplibre.js";
import { useZoneStore } from "../../../store/zoneStore.js";
import { useRegenerationPlanStore } from "../../../store/regenerationPlanStore.js";
import { selectActivePlans } from "../../../features/livestock/regenerationGate.js";

const SOURCE_ID = "regen-plan-source";
const LABEL_SOURCE_ID = "regen-plan-label-source";
const FILL_LAYER = "regen-plan-fill";
const CASING_LAYER = "regen-plan-line-casing";
const LINE_LAYER = "regen-plan-line";
const LABEL_LAYER = "regen-plan-label";

const ALL_LAYERS = [FILL_LAYER, CASING_LAYER, LINE_LAYER, LABEL_LAYER] as const;

type ReadinessState = "planned" | "started" | "confirmed";

const STATE_COLOR: Record<ReadinessState, string> = {
  planned: "#b5613a", // clay — authored, not begun
  started: "#c8902f", // amber — pathway underway
  confirmed: "#5a8a3c", // green — steward-confirmed, gate open
};

const STATE_LABEL: Record<ReadinessState, string> = {
  planned: "Plan started",
  started: "Reviving",
  confirmed: "Recovered",
};

export interface RegenerationPlanOverlayProps {
  map: maplibregl.Map;
  projectId: string;
}

interface PlanFeatureProps {
  id: string;
  label: string;
  color: string;
  state: ReadinessState;
}

function readinessState(plan: {
  startedAt: string | null;
  stewardReadinessConfirmedAt: string | null;
}): ReadinessState {
  if (plan.stewardReadinessConfirmedAt) return "confirmed";
  if (plan.startedAt) return "started";
  return "planned";
}

/** Cheap label anchor: mean of a polygon's exterior ring (drop closing dup). */
function ringCentroid(
  geometry: Polygon | MultiPolygon,
): [number, number] | null {
  const ring =
    geometry.type === "Polygon"
      ? geometry.coordinates[0]
      : geometry.coordinates[0]?.[0];
  if (!ring || ring.length === 0) return null;
  const pts =
    ring.length > 1 &&
    ring[0]?.[0] === ring[ring.length - 1]?.[0] &&
    ring[0]?.[1] === ring[ring.length - 1]?.[1]
      ? ring.slice(0, -1)
      : ring;
  if (pts.length === 0) return null;
  let lng = 0;
  let lat = 0;
  for (const p of pts) {
    lng += p[0] ?? 0;
    lat += p[1] ?? 0;
  }
  return [lng / pts.length, lat / pts.length];
}

function buildCollections(
  plans: { id: string; zoneId: string; startedAt: string | null; stewardReadinessConfirmedAt: string | null }[],
  zonesById: Map<
    string,
    { name: string; geometry: Polygon | MultiPolygon }
  >,
): {
  fills: FeatureCollection<Polygon | MultiPolygon, PlanFeatureProps>;
  labels: FeatureCollection<Point, PlanFeatureProps>;
} {
  const fills: Feature<Polygon | MultiPolygon, PlanFeatureProps>[] = [];
  const labels: Feature<Point, PlanFeatureProps>[] = [];
  for (const plan of plans) {
    const zone = zonesById.get(plan.zoneId);
    if (!zone) continue;
    const state = readinessState(plan);
    const props: PlanFeatureProps = {
      id: plan.id,
      label: `${zone.name} — ${STATE_LABEL[state]}`,
      color: STATE_COLOR[state],
      state,
    };
    fills.push({ type: "Feature", geometry: zone.geometry, properties: props });
    const anchor = ringCentroid(zone.geometry);
    if (anchor) {
      labels.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: anchor },
        properties: props,
      });
    }
  }
  return {
    fills: { type: "FeatureCollection", features: fills },
    labels: { type: "FeatureCollection", features: labels },
  };
}

export default function RegenerationPlanOverlay({
  map,
  projectId,
}: RegenerationPlanOverlayProps) {
  const allZones = useZoneStore((s) => s.zones);
  const allPlans = useRegenerationPlanStore((s) => s.plans);
  const activePlanIdByZone = useRegenerationPlanStore(
    (s) => s.activePlanIdByZone,
  );

  const zonesById = useMemo(() => {
    const m = new Map<string, { name: string; geometry: Polygon | MultiPolygon }>();
    for (const z of allZones) {
      if (z.projectId === projectId) {
        m.set(z.id, { name: z.name, geometry: z.geometry });
      }
    }
    return m;
  }, [allZones, projectId]);

  // One feature per zone from the active plan only — scenario plans would
  // otherwise stack N overlapping tinted features on the same zone.
  const plans = useMemo(
    () =>
      selectActivePlans(
        allPlans.filter((p) => p.projectId === projectId),
        activePlanIdByZone,
      ),
    [allPlans, projectId, activePlanIdByZone],
  );

  const { fills, labels } = useMemo(
    () => buildCollections(plans, zonesById),
    [plans, zonesById],
  );

  useEffect(() => {
    if (!map) return;

    const ensure = () => {
      const existing = map.getSource(SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (existing) {
        existing.setData(fills);
      } else {
        map.addSource(SOURCE_ID, { type: "geojson", data: fills });
      }

      const existingLabels = map.getSource(LABEL_SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (existingLabels) {
        existingLabels.setData(labels);
      } else {
        map.addSource(LABEL_SOURCE_ID, { type: "geojson", data: labels });
      }

      if (!map.getLayer(FILL_LAYER)) {
        map.addLayer({
          id: FILL_LAYER,
          type: "fill",
          source: SOURCE_ID,
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              14,
              0.3,
              19,
              0.2,
            ],
          },
        });
      }

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
            "text-allow-overlap": false,
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
          map.setLayoutProperty(id, "visibility", "visible");
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
  }, [map, fills, labels]);

  return null;
}
