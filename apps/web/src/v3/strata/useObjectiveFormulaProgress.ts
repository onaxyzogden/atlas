/**
 * useObjectiveFormulaProgress — the store-reading bridge that turns a computed
 * livestock formula into checklist-item satisfaction.
 *
 * A checklist item may carry a `formulaBinding` (see the @ogden/shared schema).
 * When `binding.satisfiesWhenComputed` is true, the item is considered DONE the
 * moment its formula produces a usable result — `resolveFormula(id)
 * .summarize(projectId).hasResult`. This file owns that store read so the pure
 * `computeEffectiveProgress` stays store-free: it consumes a plain Set of
 * satisfied item ids, exactly like the answerSpec path consumes `metadata`.
 *
 * Two entry points, one rule (mirrors effectiveProgress.ts):
 *   - `collectFormulaSatisfiedItemIds(...)` — store-reading but React-free
 *     (uses `*.getState()` inside summarize). Batch readers that loop over many
 *     projects (portfolio, urgency) call it per project.
 *   - `useObjectiveFormulaProgress(...)` — this hook subscribes to the stores
 *     `summarize` reads, so a freshly-drawn paddock re-runs the predicate and
 *     the Plan progress bar advances live.
 *
 * Covenant: `enterprise-break-even` is deferred — its summarize always returns
 * `hasResult: false`, so it never auto-satisfies regardless of binding.
 */

import { useMemo } from 'react';
import type { PlanStratumObjective } from '@ogden/shared';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useRotationPlanStore } from '../../store/rotationPlanStore.js';
import { useSiteDataStore } from '../../store/siteDataStore.js';
import { resolveFormula } from '../plan/strata/formulaCatalog.js';

/**
 * Set of checklist item ids whose `formulaBinding.satisfiesWhenComputed` is
 * true AND whose formula currently has a usable result for `projectId`. Reads
 * the livestock/rotation/site-data stores via `summarize` (`*.getState()`),
 * so call it from a loop or a memo — never expect it to be reactive on its own.
 */
export function collectFormulaSatisfiedItemIds(
  projectId: string,
  objectives: readonly PlanStratumObjective[],
): Set<string> {
  const satisfied = new Set<string>();
  for (const objective of objectives) {
    for (const item of objective.checklist) {
      const binding = item.formulaBinding;
      if (!binding?.satisfiesWhenComputed) continue;
      const spec = resolveFormula(binding.formulaId);
      if (spec && spec.summarize(projectId).hasResult) {
        satisfied.add(item.id);
      }
    }
  }
  return satisfied;
}

/**
 * Reactive single-project wrapper. Subscribes to the store slices `summarize`
 * reads (paddocks, this project's rotation plan, this project's site data) so a
 * draw/edit re-runs the predicate, then recomputes the satisfied-id Set.
 */
export function useObjectiveFormulaProgress(
  projectId: string,
  objectives: readonly PlanStratumObjective[],
): ReadonlySet<string> {
  // Subscriptions — stable references that change only on mutation, so these
  // are safe as memo deps and cannot loop.
  const paddocks = useLivestockStore((s) => s.paddocks);
  const rotationPlan = useRotationPlanStore((s) => s.byProject[projectId]);
  const siteData = useSiteDataStore((s) => s.dataByProject[projectId]);

  return useMemo(
    () => collectFormulaSatisfiedItemIds(projectId, objectives),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paddocks/rotationPlan/siteData are read indirectly via summarize() and drive recompute
    [projectId, objectives, paddocks, rotationPlan, siteData],
  );
}
