/**
 * objectiveLookup — thin wrapper around the shared tier-objective seed
 * so View B components can resolve `planObjectiveId` and `stratumId` to
 * human-readable labels without each one importing the full constant
 * catalogue directly.
 *
 * Lazy-imports keep this file out of the bundle's hot path; the
 * underlying seed is a pure data export in `@ogden/shared`.
 */

import { findPlanStratum } from '@ogden/shared';
import { findObjectiveGlobally } from '../../plan/objectiveCatalog.js';

export function getObjectiveTitle(objectiveId: string | null | undefined): string | null {
  if (!objectiveId) return null;
  // Resolve across the catalogue union so View B labels a primary/secondary
  // objective, not just the legacy skeleton (Sub-slice D Group 2).
  return findObjectiveGlobally(objectiveId)?.title ?? null;
}

export function getTierTitle(stratumId: string | null | undefined): string | null {
  if (!stratumId) return null;
  return findPlanStratum(stratumId)?.title ?? null;
}
