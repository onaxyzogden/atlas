// projectEnterprises.ts
//
// Derive a project's active animal-enterprise set (Protocol Layer Spec 4.3
// `EnterpriseId`) from its project-type record. The standard protocol catalogue
// is filtered by `templatesForEnterprises` against this set, so the Protocol
// Layer on the live Plan strata page needs a REAL mapping from the persisted
// `ProjectTypeRecord` (primary + secondaries) rather than the prototype's
// hardcoded `['sheep_beef']`.
//
// v1 scope (deliberately minimal and honest):
// - `EnterpriseId` encodes ANIMAL enterprises only ('sheep_beef' | 'poultry').
// - The 13-type taxonomy (constants/plan/projectTypes.ts) has no poultry-specific
//   type, so `'poultry'` cannot be inferred from project type alone. It stays
//   out until a real signal exists (e.g. placed-poultry entity detection) —
//   deferred. `templatesForEnterprises` will therefore hide poultry-only
//   templates (Silvopasture Pest Diversion) for every project here.
// - Project types that imply running livestock map to `'sheep_beef'`.

import type { ProjectTypeId } from '../../schemas/plan/projectTypeTaxonomy.schema.js';
import type { EnterpriseId } from '../../schemas/protocol/protocol.schema.js';

/**
 * Project types whose objective sets imply running grazing livestock, and so
 * surface the general-livestock (`sheep_beef`) standard protocols:
 * - `silvopasture`       — "Integrated trees, forage, and livestock on shared ground."
 * - `regenerative_farm`  — commercial regenerative production (commonly grazed).
 * - `homestead`          — family-scale self-reliant land (commonly keeps stock).
 * Any other type contributes no animal enterprise on its own.
 */
const LIVESTOCK_PROJECT_TYPES: ReadonlySet<ProjectTypeId> = new Set<ProjectTypeId>([
  'silvopasture',
  'regenerative_farm',
  'homestead',
]);

/**
 * Resolve the active `EnterpriseId[]` for a project from its primary type and
 * any secondary layers. Pure and order-stable: returns `['sheep_beef']` when the
 * primary OR any secondary is a livestock-implying type, otherwise `[]`. Never
 * returns `'poultry'` in v1 (see file header).
 *
 * Feeds `templatesForEnterprises(...)` to gate which standard protocol templates
 * surface on the Plan strata page (spec 4.3).
 */
export function enterprisesForProjectTypes(
  primaryTypeId: ProjectTypeId,
  secondaryTypeIds: readonly ProjectTypeId[] = [],
): EnterpriseId[] {
  const hasLivestock =
    LIVESTOCK_PROJECT_TYPES.has(primaryTypeId) ||
    secondaryTypeIds.some((id) => LIVESTOCK_PROJECT_TYPES.has(id));
  return hasLivestock ? ['sheep_beef'] : [];
}
