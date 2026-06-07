// actObjectiveTaskBridge.ts
//
// Pure core of the Act-completion unification bridge (ObserveDataPoint
// replacement migration, Phase 1). The tier-shell completes a
// `PlanStratumObjective`; the formal proof/verification path verifies an
// `ActTask` whose `objectiveId` is a UNIVERSAL catalogue Act objective id.
// These are DIFFERENT id spaces, linked ONLY by domain:
//
//   PlanStratumObjective
//     --getPrimaryDomainForObjective-->  UniversalDomain
//     --getObjective('act', domain)-->   catalogue Act Objective
//
// This is the same domain seam the Plan->Act handoff uses
// (`PlanToActHandoff` calls `getObjective('act', objective.domain)`), so a
// tier-shell objective and a handoff-seeded ActTask resolve to the same
// catalogue Act objective id iff they share a primary domain. Never attempt
// id-equality between `ObserveDataPoint.sourceObjectiveId` (a stratum
// objective id) and `ActTask.objectiveId` (a catalogue objective id).
//
// Store-free and React-free by design: the Zustand/serverId-aware resolution
// (which actually reads the ActTask roster) lives in the app layer
// (`useActObjectiveTaskBridge`), so this core can be unit-tested in isolation.

import { getObjective } from '../constants/olos/objectives.js';
import { getPrimaryDomainForObjective } from './objectiveObserveDomains.js';
import type { PlanStratumObjective } from '../schemas/plan/planStratumObjective.schema.js';

/**
 * Resolve the universal catalogue Act objective id that a tier-shell
 * `PlanStratumObjective` maps to, via its primary Observe domain. Returns
 * `null` when the objective resolves to no domain (defensive — a brand-new
 * stratum with no domain mapping) or when no catalogue Act objective exists
 * for that domain. The returned id is the value to filter `ActTask.objectiveId`
 * against (`actTaskStore.listForObjective`).
 */
export function resolveActObjectiveId(
  objective: PlanStratumObjective,
): string | null {
  const domain = getPrimaryDomainForObjective(objective);
  if (domain == null) return null;
  return getObjective('act', domain)?.id ?? null;
}
