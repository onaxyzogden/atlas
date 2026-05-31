// usePortfolioStages.ts
//
// Live-data §2.6 lifecycle stage for EVERY project, so the Portfolio map can
// colour-code each boundary the way usePortfolioBriefing colours the selected
// project's rail. Both consume the same shared rule (deriveStageFromSignals in
// portfolioModel) over the same client stores — there is one stage truth, read
// once here for the whole portfolio and once there for the selection.
//
// Strictly read-only (no mutators imported). Cycles are intentionally NOT read:
// the cycle id only affects the Observe *label*, never the stage classification.

import { useMemo } from 'react';
import { computeAllObjectiveStatuses } from '@ogden/shared';
import { useFieldActionStore } from '../../store/fieldActionStore.js';
import { useObserveDataPointStore } from '../../store/observeDataPointStore.js';
import {
  toProgressMap,
  usePlanStratumProgressStore,
} from '../../store/planStratumStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import { resolveObjectivesForProject } from '../plan/strata/useProjectObjectives.js';
import {
  OUTSTANDING_STATUSES,
  deriveStageFromSignals,
  type PortfolioStage,
} from './portfolioModel.js';

/**
 * Map of `projectId → PortfolioStage` for the supplied projects, derived from
 * the same field-action / Observe-data / Plan-progress signals the rail uses.
 * Recomputes only when a relevant store slice or the project list changes.
 */
export function usePortfolioStages(
  projects: LocalProject[],
): ReadonlyMap<string, PortfolioStage> {
  const fieldActionsByProject = useFieldActionStore((s) => s.byProject);
  const dataPointsByProject = useObserveDataPointStore((s) => s.byProject);
  const planProgressByProject = usePlanStratumProgressStore((s) => s.byProject);

  return useMemo(() => {
    const out = new Map<string, PortfolioStage>();
    for (const project of projects) {
      const id = project.id;

      // Plan: every objective complete?
      const { objectives } = resolveObjectivesForProject(project);
      const objectiveStatuses = computeAllObjectiveStatuses(
        objectives,
        toProgressMap(planProgressByProject[id] ?? {}),
      );
      const objectivesTotal = objectives.length;
      const objectivesComplete = objectives.filter(
        (o) => objectiveStatuses[o.id] === 'complete',
      ).length;
      const allComplete =
        objectivesTotal > 0 && objectivesComplete === objectivesTotal;

      // Act: any outstanding field-action?
      const fieldActions = fieldActionsByProject[id] ?? [];
      let outstanding = 0;
      for (const a of fieldActions) {
        if (OUTSTANDING_STATUSES.has(a.status)) outstanding += 1;
      }

      // Observe: any captured data points?
      const hasData = (dataPointsByProject[id] ?? []).length > 0;

      out.set(
        id,
        deriveStageFromSignals({
          archived: project.status === 'archived',
          wizardComplete: project.metadata?.wizardStatus === 'complete',
          hasBoundary:
            project.hasParcelBoundary || project.parcelBoundaryGeojson != null,
          outstanding,
          hasData,
          allComplete,
        }),
      );
    }
    return out;
  }, [projects, fieldActionsByProject, dataPointsByProject, planProgressByProject]);
}
