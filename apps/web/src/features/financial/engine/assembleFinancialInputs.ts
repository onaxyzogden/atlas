/**
 * assembleFinancialInputs -- the hook-free store-read layer that feeds the pure
 * `computeProjectBreakEven` core. Reads the same nine stores `useFinancialModel`
 * reads, but via `*.getState()` so it is safe to call from a non-React
 * `summarize()`. Kept in a separate file from the pure core so the core loads
 * (and tests) without pulling Zustand store modules + their rehydration.
 *
 * Mirrors `useFinancialModel`'s useMemo body field-for-field; both ultimately
 * call the same engine functions, so they cannot drift.
 */

import type { AllFeaturesInput, SiteContext } from './types.js';
import { DEFAULT_SITE_CONTEXT } from './types.js';
import type { AssembledFinancialInputs } from './computeProjectBreakEven.js';

import { useZoneStore } from '../../../store/zoneStore.js';
import { getStructuresForProject } from '../../../store/builtEnvironmentSelectors.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useCropStore } from '../../../store/cropStore.js';
import { usePathStore } from '../../../store/pathStore.js';
import { useUtilityStore } from '../../../store/utilityStore.js';
import { usePhaseStore } from '../../../store/phaseStore.js';
import { useSiteDataStore } from '../../../store/siteDataStore.js';
import { useFinancialStore } from '../../../store/financialStore.js';

/**
 * Mirror of useFinancialModel's private `extractSiteContext`. The hook is
 * intentionally left untouched (self-contained extraction decision); this copy
 * is small + stable and any divergence in the upstream fields would surface in
 * the financial model's own tests.
 */
function extractSiteContext(
  layers: Array<{ layerType: string; summary: Record<string, unknown> }>,
): SiteContext {
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
 * Hook-free assembly of the financial inputs for a project. Filters every slice
 * to `projectId`.
 */
export function assembleFinancialInputs(projectId: string): AssembledFinancialInputs {
  const zones = useZoneStore.getState().zones.filter((z) => z.projectId === projectId);
  const structures = getStructuresForProject(projectId);
  const paddocks = useLivestockStore
    .getState()
    .paddocks.filter((p) => p.projectId === projectId);
  const crops = useCropStore.getState().cropAreas.filter((c) => c.projectId === projectId);
  const paths = usePathStore.getState().paths.filter((p) => p.projectId === projectId);
  const utilities = useUtilityStore
    .getState()
    .utilities.filter((u) => u.projectId === projectId);
  const phases = usePhaseStore.getState().getProjectPhases(projectId);

  const siteData = useSiteDataStore.getState().dataByProject[projectId];
  const siteContext = siteData?.layers
    ? extractSiteContext(siteData.layers)
    : DEFAULT_SITE_CONTEXT;

  const fin = useFinancialStore.getState();

  const features: AllFeaturesInput = { zones, structures, paddocks, paths, utilities, crops };
  return {
    features,
    region: fin.region,
    costOverrides: fin.costOverrides,
    revenueOverrides: fin.revenueOverrides,
    phases,
    siteContext,
  };
}
