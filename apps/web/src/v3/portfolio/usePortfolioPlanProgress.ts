// usePortfolioPlanProgress.ts
//
// Live-data Plan progress (active stratum + objectives fraction) for EVERY
// project, so the Dashboard card grid (§3.3) can show each project's stratum
// label and progress bar the way usePortfolioBriefing shows the selected
// project's rail. Computed once in the parent and passed down per card —
// hooks can't run inside the grid's map().
//
// Shares the same selectors as the rail (resolveObjectivesForProject +
// computeAllObjectiveStatuses / computeAllStratumStates over the Plan-progress
// store) so the card never drifts from the rail. Strictly read-only.

import { useMemo } from 'react';
import {
  computeAllObjectiveStatuses,
  computeAllStratumStates,
  PLAN_STRATA,
} from '@ogden/shared';
import { usePlanStratumProgressStore } from '../../store/planStratumStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useRotationPlanStore } from '../../store/rotationPlanStore.js';
import { useSiteDataStore } from '../../store/siteDataStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import { resolveObjectivesForProject } from '../plan/strata/useProjectObjectives.js';
import { computeEffectiveProgress } from '../strata/effectiveProgress.js';
import { collectFormulaSatisfiedItemIds } from '../strata/useObjectiveFormulaProgress.js';

export interface PortfolioPlanProgress {
  /** 1-based ordinal of the first non-complete stratum, or null when all done. */
  activeStratumOrdinal: number | null;
  /** Title of the active stratum, or null when all strata are complete. */
  activeStratumTitle: string | null;
  /** Every objective complete (and at least one exists). */
  allComplete: boolean;
  objectivesComplete: number;
  objectivesTotal: number;
  /** Percentage 0–100 (0 when there are no objectives). */
  pct: number;
}

const EMPTY: PortfolioPlanProgress = {
  activeStratumOrdinal: null,
  activeStratumTitle: null,
  allComplete: false,
  objectivesComplete: 0,
  objectivesTotal: 0,
  pct: 0,
};

/**
 * Map of `projectId → PortfolioPlanProgress` for the supplied projects.
 * Recomputes only when the Plan-progress store slice or the project list
 * changes.
 */
export function usePortfolioPlanProgress(
  projects: LocalProject[],
): ReadonlyMap<string, PortfolioPlanProgress> {
  const planProgressByProject = usePlanStratumProgressStore((s) => s.byProject);
  // Subscribe to the store slices livestock-formula summaries read so a drawn
  // paddock / rotation plan / site layer advances portfolio cards too.
  const paddocks = useLivestockStore((s) => s.paddocks);
  const rotationByProject = useRotationPlanStore((s) => s.byProject);
  const siteDataByProject = useSiteDataStore((s) => s.dataByProject);

  return useMemo(() => {
    const out = new Map<string, PortfolioPlanProgress>();
    for (const project of projects) {
      const id = project.id;
      const { objectives } = resolveObjectivesForProject(project);
      if (objectives.length === 0) {
        out.set(id, EMPTY);
        continue;
      }
      // Single source of truth (2026-05-31): union the stored progress with
      // wizard-derived Stratum-1 completion so portfolio cards count S1 the
      // same way Plan + Act do (per-project pure call — this loops projects).
      const { flatMap } = computeEffectiveProgress(
        planProgressByProject[id] ?? {},
        project.metadata?.visionProfile,
        project.metadata?.team,
        objectives,
        project.metadata,
        collectFormulaSatisfiedItemIds(id, objectives),
      );
      const objectiveStatuses = computeAllObjectiveStatuses(objectives, flatMap);
      const objectivesTotal = objectives.length;
      const objectivesComplete = objectives.filter(
        (o) => objectiveStatuses[o.id] === 'complete',
      ).length;
      const allComplete = objectivesComplete === objectivesTotal;

      const stratumStates = computeAllStratumStates(
        PLAN_STRATA.map((s) => s.id),
        objectives,
        objectiveStatuses,
      );
      let activeStratumOrdinal: number | null = null;
      let activeStratumTitle: string | null = null;
      for (const stratum of PLAN_STRATA) {
        if ((stratumStates[stratum.id] ?? 'locked') !== 'complete') {
          activeStratumOrdinal = stratum.ordinal;
          activeStratumTitle = stratum.title;
          break;
        }
      }

      out.set(id, {
        activeStratumOrdinal,
        activeStratumTitle,
        allComplete,
        objectivesComplete,
        objectivesTotal,
        pct: Math.round((objectivesComplete / objectivesTotal) * 100),
      });
    }
    return out;
  }, [
    projects,
    planProgressByProject,
    paddocks,
    rotationByProject,
    siteDataByProject,
  ]);
}
