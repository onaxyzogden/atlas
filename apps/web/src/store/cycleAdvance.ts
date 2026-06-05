/**
 * cycleAdvance — Phase 4 Slice 4.5 cycle-stamping bridge.
 *
 * Called from `cyclicalReviewStore.confirmDecision` (reason
 * `plan_revision_confirmed`) and `cyclicalReviewStore.acknowledgeRevise`
 * (reason `plan_revision_revised`). Resolves the impacted Plan tier
 * objective into its full set of Observe domains (override > tier default,
 * per `resolveAllDomainsForObjective`) and advances `observeCycleStore`'s
 * per-(project, domain) counter for each one.
 *
 * Why a separate module: keeps the cyclical-review mutators readable and
 * lets the helper be unit-tested in isolation. The Phase 4 Dashboard Spec
 * §5.4 cycle annotations on the Temporal chart read the resulting history
 * via `useObserveCycleStore.getHistory(projectId, domainId)`.
 *
 * Unknown objective ids (stale feed keys, deleted objectives) are
 * tolerated silently — the helper returns an empty array so callers stay
 * branch-light. Same defensive posture as `usePlanRevisionFlagSync`.
 */

import type { ObserveCycleAdvanceReason, UniversalDomain } from '@ogden/shared';
import { useObserveCycleStore } from './observeCycleStore.js';
import { findObjectiveGlobally } from '../v3/plan/objectiveCatalog.js';
import { resolveAllDomainsForObjective } from '../v3/observe/dashboard/revision/resolveDomainForObjective.js';

export interface CycleAdvanceResult {
  domainId: UniversalDomain;
  cycleId: number;
}

/**
 * Resolve the objective's impacted domains and advance the cycle counter
 * for each. Returns the per-domain `(domainId, new cycleId)` pairs so
 * tests can assert call shape without re-reading the store.
 */
export function cycleAdvance(
  projectId: string,
  objectiveId: string,
  reason: ObserveCycleAdvanceReason,
  options?: { advancedAt?: string },
): CycleAdvanceResult[] {
  const objective = findObjectiveGlobally(objectiveId);
  if (!objective) return [];
  const domains = resolveAllDomainsForObjective(objective);
  if (domains.length === 0) return [];

  const advance = useObserveCycleStore.getState().advanceCycle;
  return domains.map((domainId) => ({
    domainId,
    cycleId: advance(projectId, domainId, reason, {
      planObjectiveId: objectiveId,
      ...(options?.advancedAt ? { advancedAt: options.advancedAt } : {}),
    }),
  }));
}
