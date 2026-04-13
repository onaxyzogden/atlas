/**
 * useFinancialModel — orchestration hook that reads all feature stores,
 * extracts site context, runs the financial engine, and returns a
 * reactive FinancialModel.
 *
 * Recomputes automatically when any feature is added/removed/edited.
 */

import { useMemo } from 'react';
import { useZoneStore } from '../../../store/zoneStore.js';
import { useStructureStore } from '../../../store/structureStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useCropStore } from '../../../store/cropStore.js';
import { usePathStore } from '../../../store/pathStore.js';
import { useUtilityStore } from '../../../store/utilityStore.js';
import { usePhaseStore } from '../../../store/phaseStore.js';
import { useSiteDataStore } from '../../../store/siteDataStore.js';
import { useFinancialStore } from '../../../store/financialStore.js';

import type { AllFeaturesInput, FinancialModel, SiteContext } from '../engine/types.js';
import { DEFAULT_SITE_CONTEXT } from '../engine/types.js';
import { computeAllCosts, sumCosts, applyOverrides } from '../engine/costEngine.js';
import { detectEnterprises } from '../engine/enterpriseDetector.js';
import { computeRevenueStreams, sumRevenue, applyRevenueOverrides } from '../engine/revenueEngine.js';
import { computeCashflow } from '../engine/cashflowEngine.js';
import { computeBreakEven } from '../engine/breakEvenEngine.js';
import { computeMissionScore } from '../engine/missionScoring.js';

/**
 * Extract SiteContext from site data layers.
 */
function extractSiteContext(layers: Array<{ layerType: string; summary: Record<string, unknown> }>): SiteContext {
  const ctx = { ...DEFAULT_SITE_CONTEXT };

  for (const layer of layers) {
    if (layer.layerType === 'elevation') {
      const s = layer.summary;
      if (typeof s.mean_slope_deg === 'number') ctx.meanSlopeDeg = s.mean_slope_deg;
      if (typeof s.max_slope_deg === 'number') ctx.maxSlopeDeg = s.max_slope_deg;
      if (typeof s.predominant_aspect === 'string') ctx.predominantAspect = s.predominant_aspect;
    }
    if (layer.layerType === 'climate') {
      const s = layer.summary;
      if (typeof s.growing_season_days === 'number') ctx.growingSeasonDays = s.growing_season_days;
      if (typeof s.hardiness_zone === 'string') ctx.hardinessZone = s.hardiness_zone;
    }
  }

  return ctx;
}

/**
 * Collect all assumptions from cost items and revenue streams.
 */
function collectAssumptions(
  costItems: Array<{ assumptions: string[] }>,
  revenueStreams: Array<{ assumptions: string[] }>,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const globalAssumptions = [
    'All values are estimates based on regional benchmarks, not quotes',
    'Actual costs vary with site conditions, permitting, and contractor availability',
    'Operating costs estimated at 5% of cumulative capital per year',
    'Revenue projections assume competent management and normal market conditions',
  ];

  for (const a of globalAssumptions) {
    result.push(a);
    seen.add(a);
  }

  for (const item of [...costItems, ...revenueStreams]) {
    for (const a of item.assumptions) {
      if (!seen.has(a)) {
        seen.add(a);
        result.push(a);
      }
    }
  }

  return result;
}

export function useFinancialModel(projectId: string): FinancialModel | null {
  // Read feature stores
  const allZones = useZoneStore((s) => s.zones);
  const allStructures = useStructureStore((s) => s.structures);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allCrops = useCropStore((s) => s.cropAreas);
  const allPaths = usePathStore((s) => s.paths);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const getProjectPhases = usePhaseStore((s) => s.getProjectPhases);

  // Site data
  const siteDataByProject = useSiteDataStore((s) => s.dataByProject);

  // Financial config
  const region = useFinancialStore((s) => s.region);
  const missionWeights = useFinancialStore((s) => s.missionWeights);
  const costOverrides = useFinancialStore((s) => s.costOverrides);
  const revenueOverrides = useFinancialStore((s) => s.revenueOverrides);

  return useMemo(() => {
    // Filter to current project
    const zones = allZones.filter((z) => z.projectId === projectId);
    const structures = allStructures.filter((s) => s.projectId === projectId);
    const paddocks = allPaddocks.filter((p) => p.projectId === projectId);
    const crops = allCrops.filter((c) => c.projectId === projectId);
    const paths = allPaths.filter((p) => p.projectId === projectId);
    const utilities = allUtilities.filter((u) => u.projectId === projectId);
    const phases = getProjectPhases(projectId);

    // No features at all? Return null
    if (zones.length + structures.length + paddocks.length + crops.length + paths.length + utilities.length === 0) {
      return null;
    }

    // Extract site context from layers
    const siteData = siteDataByProject[projectId];
    const siteContext = siteData?.layers
      ? extractSiteContext(siteData.layers)
      : DEFAULT_SITE_CONTEXT;

    // Bundle features
    const input: AllFeaturesInput = { zones, structures, paddocks, paths, utilities, crops };

    // Run cost engine
    const rawCosts = computeAllCosts(input, region, siteContext);
    const costItems = applyOverrides(rawCosts, costOverrides);

    // Detect enterprises and compute revenue
    const enterprises = detectEnterprises(zones, structures, paddocks, crops);
    const rawStreams = computeRevenueStreams(enterprises, input, siteContext, region);
    const revenueStreams = applyRevenueOverrides(rawStreams, revenueOverrides);

    // Cashflow and break-even
    const cashflow = computeCashflow(costItems, revenueStreams, phases, 10);
    const breakEven = computeBreakEven(cashflow);

    // Mission scoring
    const missionScore = computeMissionScore(input, breakEven, missionWeights);

    return {
      projectId,
      computedAt: new Date().toISOString(),
      region,
      costLineItems: costItems,
      revenueStreams,
      totalInvestment: sumCosts(costItems),
      annualRevenueAtMaturity: sumRevenue(revenueStreams),
      cashflow,
      breakEven,
      enterprises,
      missionScore,
      assumptions: collectAssumptions(costItems, revenueStreams),
    };
  }, [
    projectId, allZones, allStructures, allPaddocks, allCrops, allPaths, allUtilities,
    getProjectPhases, siteDataByProject, region, missionWeights, costOverrides, revenueOverrides,
  ]);
}
