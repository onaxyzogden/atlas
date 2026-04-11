/**
 * useSitingEvaluation — reactive hook that evaluates siting rules whenever
 * features, site data, or weight sliders change.
 *
 * Subscribes to all feature stores + siteDataStore + sitingWeightStore.
 * Returns violations with weight-adjusted effective severity.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../store/projectStore.js';
import { useStructureStore } from '../store/structureStore.js';
import { useZoneStore } from '../store/zoneStore.js';
import { useLivestockStore } from '../store/livestockStore.js';
import { useCropStore } from '../store/cropStore.js';
import { usePathStore } from '../store/pathStore.js';
import { useUtilityStore } from '../store/utilityStore.js';
import { useSiteData } from '../store/siteDataStore.js';
import { useSitingWeightStore } from '../store/sitingWeightStore.js';
import { evaluateRules, type ProjectState } from '../features/rules/RulesEngine.js';
import type { RuleViolation } from '../features/rules/SitingRules.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type EffectiveSeverity = 'blocking' | 'warning' | 'advisory';

export interface WeightedViolation extends RuleViolation {
  effectiveSeverity: EffectiveSeverity;
  weightValue: number;
}

export interface SitingEvaluationResult {
  violations: WeightedViolation[];
  blocking: WeightedViolation[];
  warnings: WeightedViolation[];
  advisories: WeightedViolation[];
  totalCount: number;
  blockingCount: number;
  featureCount: number;
  hasSiteData: boolean;
}

/* ------------------------------------------------------------------ */
/*  Severity mapping with weight adjustment                            */
/* ------------------------------------------------------------------ */

const BASE_SEVERITY_MAP: Record<string, EffectiveSeverity> = {
  error: 'blocking',
  warning: 'warning',
  info: 'advisory',
};

function applyWeightAdjustment(
  baseSeverity: EffectiveSeverity,
  weight: number,
): EffectiveSeverity {
  // High weight (>=70) escalates one level
  if (weight >= 70) {
    if (baseSeverity === 'advisory') return 'warning';
    if (baseSeverity === 'warning') return 'blocking';
    return baseSeverity; // blocking stays blocking
  }
  // Low weight (<=30) de-escalates one level
  if (weight <= 30) {
    if (baseSeverity === 'blocking') return 'warning';
    if (baseSeverity === 'warning') return 'advisory';
    return baseSeverity; // advisory stays advisory
  }
  return baseSeverity;
}

/* ------------------------------------------------------------------ */
/*  Centroid helper (duplicate-free — same as MapView)                  */
/* ------------------------------------------------------------------ */

function computeCenterFromBoundary(geojson: unknown): [number, number] | null {
  if (!geojson || typeof geojson !== 'object') return null;
  try {
    const fc = geojson as GeoJSON.FeatureCollection;
    if (!fc.features?.length) return null;
    let sumLng = 0, sumLat = 0, count = 0;
    for (const f of fc.features) {
      if (f.geometry?.type === 'Polygon') {
        for (const coord of (f.geometry as GeoJSON.Polygon).coordinates[0]!) {
          sumLng += coord[0]!;
          sumLat += coord[1]!;
          count++;
        }
      }
    }
    if (count === 0) return null;
    return [sumLng / count, sumLat / count];
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useSitingEvaluation(project: LocalProject): SitingEvaluationResult {
  // Feature store subscriptions — filtered by projectId
  const allStructures = useStructureStore((s) => s.structures);
  const allZones = useZoneStore((s) => s.zones);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allCrops = useCropStore((s) => s.cropAreas);
  const allPaths = usePathStore((s) => s.paths);
  const allUtilities = useUtilityStore((s) => s.utilities);

  const siteData = useSiteData(project.id);
  const weights = useSitingWeightStore((s) => s.weights);

  // Filter features to this project
  const structures = useMemo(() => allStructures.filter((s) => s.projectId === project.id), [allStructures, project.id]);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === project.id), [allZones, project.id]);
  const paddocks = useMemo(() => allPaddocks.filter((p) => p.projectId === project.id), [allPaddocks, project.id]);
  const crops = useMemo(() => allCrops.filter((c) => c.projectId === project.id), [allCrops, project.id]);
  const paths = useMemo(() => allPaths.filter((p) => p.projectId === project.id), [allPaths, project.id]);
  const utilities = useMemo(() => allUtilities.filter((u) => u.projectId === project.id), [allUtilities, project.id]);

  const featureCount = structures.length + zones.length + paddocks.length + crops.length + paths.length + utilities.length;

  // Compute project center from boundary
  const projectCenter = useMemo(
    () => computeCenterFromBoundary(project.parcelBoundaryGeojson),
    [project.parcelBoundaryGeojson],
  );

  // Build ProjectState and evaluate rules
  const rawViolations = useMemo(() => {
    const state: ProjectState = {
      hasBoundary: project.hasParcelBoundary,
      structures,
      zones,
      paddocks,
      crops,
      paths,
      utilities,
      siteData,
      projectCenter,
      projectType: project.projectType,
    };
    return evaluateRules(state);
  }, [structures, zones, paddocks, crops, paths, utilities, siteData, projectCenter, project.hasParcelBoundary, project.projectType]);

  // Apply weight-based severity adjustment
  const violations = useMemo<WeightedViolation[]>(() => {
    return rawViolations.map((v) => {
      const weightValue = weights[v.ruleWeightCategory] ?? 50;
      const baseSeverity = BASE_SEVERITY_MAP[v.severity] ?? 'advisory';
      const effectiveSeverity = applyWeightAdjustment(baseSeverity, weightValue);
      return { ...v, effectiveSeverity, weightValue };
    });
  }, [rawViolations, weights]);

  // Partition by effective severity
  const { blocking, warnings, advisories } = useMemo(() => {
    const b: WeightedViolation[] = [];
    const w: WeightedViolation[] = [];
    const a: WeightedViolation[] = [];
    for (const v of violations) {
      if (v.effectiveSeverity === 'blocking') b.push(v);
      else if (v.effectiveSeverity === 'warning') w.push(v);
      else a.push(v);
    }
    return { blocking: b, warnings: w, advisories: a };
  }, [violations]);

  return {
    violations,
    blocking,
    warnings,
    advisories,
    totalCount: violations.length,
    blockingCount: blocking.length,
    featureCount,
    hasSiteData: siteData?.status === 'complete',
  };
}
