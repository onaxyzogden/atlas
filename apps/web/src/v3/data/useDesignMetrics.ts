/**
 * useDesignMetrics — derives live design-canvas metrics from real
 * placements + site data, replacing the static literals previously
 * hard-coded into DesignPage's bottom strip.
 *
 * Phase 5.1 PR4 (per `wiki/decisions/2026-04-30-v3-design-canvas-
 * scoping.md` §4 "Live scoring callouts"). Recomputes whenever the
 * placements *count + last-modified-time* changes — Zustand selector
 * stability handles the throttling implicitly (re-renders only fire
 * on store mutation).
 *
 * Inputs:
 *   - projectId  → filters store reads
 *   - boundary   → drives Area + Perimeter (planar approximation; v3.2
 *                  swaps in turf for geodesic accuracy)
 *
 * Outputs (every field is honest about whether it has data — null
 * means "no source available", consumers render "—"):
 *   - areaHa
 *   - perimeterKm
 *   - elevationRange      (from siteData elevation summary)
 *   - waterNeedLpd        (livestock + occupant demand)
 *   - placementCount      (structures + paddocks for this project)
 *   - phaseLabel          (project lifecycle stage, fallback "Diagnose")
 *
 * Not wired (deferred to v3.2):
 *   - Score-delta vs. pre-design baseline. The brief calls for a
 *     callout strip surfacing the *delta* in computed scores after
 *     each placement, but `computeAssessmentScores` doesn't currently
 *     consume placement geometry — only `siteData.layers`. Wiring the
 *     delta meaningfully requires extending the scoring engine first
 *     (out of scope for PR4; see ADR §4 + scoring follow-up Phase 7.3).
 */

import { useMemo } from "react";
import type { MockLayerResult } from "@ogden/shared/scoring";
import { useStructureStore, type Structure, type StructureType } from "../../store/structureStore.js";
import { useLivestockStore, type Paddock } from "../../store/livestockStore.js";
import { useSiteDataStore } from "../../store/siteDataStore.js";

export interface DesignMetrics {
  areaHa: number | null;
  perimeterKm: number | null;
  elevationRange: { minM: number; maxM: number; spanM: number } | null;
  waterNeedLpd: number | null;
  placementCount: number;
  structureCount: number;
  paddockCount: number;
  phaseLabel: string;
}

// Rough per-day water demand (L/day) per residential occupant or per
// animal head. Placeholder values aligned with v2 demand defaults until
// `@ogden/shared/demand` exposes a typed selector for v3 to import.
const DEMAND_PER_OCCUPANT_LPD = 200;
const DEMAND_PER_HEAD_LPD = 60;
const DEMAND_BY_STRUCTURE_TYPE: Partial<Record<StructureType, number>> = {
  greenhouse: 800,
  bathhouse: 600,
  barn: 300,
  animal_shelter: 200,
  prayer_space: 100,
};

function polygonAreaM2(geom: GeoJSON.Polygon): number {
  const ring = geom.coordinates[0];
  if (!ring || ring.length < 3) return 0;
  const lat0 = ring[0]?.[1] ?? 0;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i];
    const b = ring[i + 1];
    if (!a || !b) continue;
    const ax = a[0]! * mPerDegLng;
    const ay = a[1]! * mPerDegLat;
    const bx = b[0]! * mPerDegLng;
    const by = b[1]! * mPerDegLat;
    area += ax * by - bx * ay;
  }
  return Math.abs(area) / 2;
}

function polygonPerimeterM(geom: GeoJSON.Polygon): number {
  const ring = geom.coordinates[0];
  if (!ring || ring.length < 2) return 0;
  const lat0 = ring[0]?.[1] ?? 0;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  let perim = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i];
    const b = ring[i + 1];
    if (!a || !b) continue;
    const dx = (b[0]! - a[0]!) * mPerDegLng;
    const dy = (b[1]! - a[1]!) * mPerDegLat;
    perim += Math.sqrt(dx * dx + dy * dy);
  }
  return perim;
}

function elevationFromLayers(layers: MockLayerResult[] | undefined):
  | { minM: number; maxM: number; spanM: number }
  | null {
  if (!layers) return null;
  const row = layers.find((l) => l.layerType === "elevation");
  if (!row) return null;
  const s = row.summary as
    | { min_elevation_m?: number; max_elevation_m?: number }
    | undefined;
  if (!s || typeof s.min_elevation_m !== "number" || typeof s.max_elevation_m !== "number") {
    return null;
  }
  return {
    minM: s.min_elevation_m,
    maxM: s.max_elevation_m,
    spanM: s.max_elevation_m - s.min_elevation_m,
  };
}

function structureWaterDemand(s: Structure): number {
  if (typeof s.demandWaterGalPerDay === "number" && s.demandWaterGalPerDay > 0) {
    // 1 US gallon ≈ 3.785 L
    return s.demandWaterGalPerDay * 3.785;
  }
  const occ = s.occupantCount ?? 0;
  const occDemand = occ * DEMAND_PER_OCCUPANT_LPD;
  const baseline = DEMAND_BY_STRUCTURE_TYPE[s.type] ?? 0;
  return occDemand + baseline;
}

function paddockWaterDemand(p: Paddock): number {
  if (typeof p.stockingDensity !== "number" || !p.stockingDensity) return 0;
  const haAreaHa = p.areaM2 / 10_000;
  const head = p.stockingDensity * haAreaHa;
  return head * DEMAND_PER_HEAD_LPD;
}

export function useDesignMetrics(
  projectId: string,
  boundary?: GeoJSON.Polygon,
  lifecycleStage?: string,
): DesignMetrics {
  const structures = useStructureStore((s) => s.structures);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const layers = useSiteDataStore((s) => s.dataByProject[projectId]?.layers);

  return useMemo(() => {
    const projStructures = structures.filter((s) => s.projectId === projectId);
    const projPaddocks = paddocks.filter((p) => p.projectId === projectId);

    let areaHa: number | null = null;
    let perimeterKm: number | null = null;
    if (boundary) {
      areaHa = polygonAreaM2(boundary) / 10_000;
      perimeterKm = polygonPerimeterM(boundary) / 1000;
    }

    const elevation = elevationFromLayers(layers);

    let waterNeed = 0;
    for (const s of projStructures) waterNeed += structureWaterDemand(s);
    for (const p of projPaddocks) waterNeed += paddockWaterDemand(p);
    const waterNeedLpd = waterNeed > 0 ? Math.round(waterNeed) : null;

    return {
      areaHa,
      perimeterKm,
      elevationRange: elevation,
      waterNeedLpd,
      placementCount: projStructures.length + projPaddocks.length,
      structureCount: projStructures.length,
      paddockCount: projPaddocks.length,
      phaseLabel: phaseLabelFor(lifecycleStage),
    };
  }, [structures, paddocks, layers, projectId, boundary, lifecycleStage]);
}

function phaseLabelFor(stage?: string): string {
  switch (stage) {
    case "diagnose": return "Diagnose";
    case "design": return "Design";
    case "build": return "Build";
    case "operate": return "Operate";
    case "prove": return "Prove";
    case "report": return "Report";
    default: return "Design";
  }
}
