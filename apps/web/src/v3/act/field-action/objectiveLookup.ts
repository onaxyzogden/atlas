/**
 * objectiveLookup — thin wrapper around the shared tier-objective seed
 * so View B components can resolve `planObjectiveId` and `tierId` to
 * human-readable labels without each one importing the full constant
 * catalogue directly.
 *
 * Lazy-imports keep this file out of the bundle's hot path; the
 * underlying seed is a pure data export in `@ogden/shared`.
 */

import {
  findPlanTier,
  findPlanTierObjective,
} from '@ogden/shared';

export function getObjectiveTitle(objectiveId: string | null | undefined): string | null {
  if (!objectiveId) return null;
  return findPlanTierObjective(objectiveId)?.title ?? null;
}

export function getTierTitle(tierId: string | null | undefined): string | null {
  if (!tierId) return null;
  return findPlanTier(tierId)?.title ?? null;
}
