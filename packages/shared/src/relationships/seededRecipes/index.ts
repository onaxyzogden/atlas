// relationships/seededRecipes/index.ts
//
// Registry + resolver for the seeded-recipe layer. Maps a selection key (an
// objective id or a synthetic kind/domain key) to exactly one recipe id, merging
// the per-type maps over the universal totality floor. Mirrors
// relationships/seededProtocols/index.ts — but returns ONE id, not an array,
// because a task has exactly one how-to.

import type { ProjectTypeId } from '../../schemas/plan/projectTypeTaxonomy.schema.js';
import { UNIVERSAL_SEEDED_RECIPES } from './universal.js';
import {
  SILVOPASTURE_SEEDED_RECIPES,
  SILVOPASTURE_SECONDARY_SEEDED_RECIPES,
} from './silvopasture.js';
import { HOMESTEAD_SEEDED_RECIPES } from './homestead.js';
import type { SeededRecipeMap } from './types.js';

export type { SeededRecipeMap };

/**
 * Per-primary-type seeded maps. Exported so the conformance test can iterate
 * every registered type without enumerating them — any type added here is
 * automatically covered by the seeded-id validity guard.
 */
export const PRIMARY_RECIPE_MAPS: Partial<Record<ProjectTypeId, SeededRecipeMap>> =
  {
    homestead: HOMESTEAD_SEEDED_RECIPES,
    silvopasture: SILVOPASTURE_SEEDED_RECIPES,
  };

/**
 * Per-SECONDARY-type seeded maps, keyed by the secondary type id. A secondary's
 * objectives (e.g. silvopasture's `silv-sec-*`) only exist in a project when that
 * type is layered onto a host, so they are seeded here rather than in
 * PRIMARY_RECIPE_MAPS. Exported so the conformance test iterates every registered
 * secondary type automatically.
 */
export const SECONDARY_RECIPE_MAPS: Partial<
  Record<ProjectTypeId, SeededRecipeMap>
> = {
  silvopasture: SILVOPASTURE_SECONDARY_SEEDED_RECIPES,
};

/**
 * Resolve the recipe id for a single selection key. Precedence:
 *   primary-type map → each secondary-type map (in order) → universal floor.
 *
 * A per-type entry therefore overrides the universal kind/domain recipe for the
 * same key (a deliberate extension point), and an objective key only ever lives
 * in a per-type map. Returns `undefined` when no map carries the key — the
 * resolver then probes the next, less-specific key in its candidate list.
 */
export function resolveSeededRecipeId(
  selectionKey: string,
  primaryTypeId: ProjectTypeId,
  secondaryTypeIds?: readonly ProjectTypeId[],
): string | undefined {
  const primaryId = PRIMARY_RECIPE_MAPS[primaryTypeId]?.[selectionKey];
  if (primaryId) return primaryId;
  for (const secondaryTypeId of secondaryTypeIds ?? []) {
    const secondaryId = SECONDARY_RECIPE_MAPS[secondaryTypeId]?.[selectionKey];
    if (secondaryId) return secondaryId;
  }
  return UNIVERSAL_SEEDED_RECIPES[selectionKey];
}
