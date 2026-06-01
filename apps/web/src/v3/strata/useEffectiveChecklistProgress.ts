/**
 * useEffectiveChecklistProgress — the React hook over the single source of
 * truth for "effective" Stratum checklist progress: the steward's stored
 * planStratumStore progress UNIONED with the wizard-derived Stratum-1
 * completion (vision + team).
 *
 * Why this exists
 * ---------------
 * Wizard-derived S1 completion is NOT written to planStratumStore; it is
 * derived from `project.metadata.visionProfile` / `.team` and merged into
 * the stored progress before the status engine runs. Historically that
 * merge lived ONLY in `PlanStratumShell`, so every other surface (Act,
 * Portfolio, Home) read RAW store progress and showed a freshly-created
 * project's S1 items as DONE in Plan but EMPTY everywhere else.
 *
 * Two entry points, one implementation:
 *   - `computeEffectiveProgress(...)` — pure, store-free, in `effectiveProgress.ts`.
 *     Batch readers (`usePortfolioPlanProgress`, `useProjectUrgency`) that loop
 *     over many projects call it per project.
 *   - `useEffectiveChecklistProgress(projectId, objectives)` — this hook, a thin
 *     store-reading wrapper for single-project surfaces (Act, Plan).
 */

import { useMemo } from 'react';
import type { PlanStratumObjective } from '@ogden/shared';
import {
  selectProjectProgress,
  usePlanStratumProgressStore,
} from '../../store/planStratumStore.js';
import { useProjectStore } from '../../store/projectStore.js';
import {
  computeEffectiveProgress,
  type EffectiveChecklistProgress,
} from './effectiveProgress.js';

export { computeEffectiveProgress } from './effectiveProgress.js';
export type { EffectiveChecklistProgress } from './effectiveProgress.js';

/**
 * Single-project hook wrapper around `computeEffectiveProgress`. Reads the
 * stored progress + project metadata from the stores and memoizes the
 * composition. `objectives` is supplied by the caller (it already resolves
 * the project's objective set via `useProjectObjectives`) to avoid a second
 * resolution here.
 */
export function useEffectiveChecklistProgress(
  projectId: string,
  objectives: readonly PlanStratumObjective[],
): EffectiveChecklistProgress {
  const storedByObjective = usePlanStratumProgressStore((s) =>
    selectProjectProgress(s, projectId),
  );
  const visionProfile = useProjectStore(
    (s) => s.projects.find((p) => p.id === projectId)?.metadata?.visionProfile,
  );
  const team = useProjectStore(
    (s) => s.projects.find((p) => p.id === projectId)?.metadata?.team,
  );

  return useMemo(
    () =>
      computeEffectiveProgress(
        storedByObjective,
        visionProfile,
        team,
        objectives,
      ),
    [storedByObjective, visionProfile, team, objectives],
  );
}
