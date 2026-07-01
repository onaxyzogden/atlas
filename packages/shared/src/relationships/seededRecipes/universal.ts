// relationships/seededRecipes/universal.ts
//
// The UNIVERSAL seeded-recipe map — the totality floor of the resolution layer.
// It maps EVERY synthetic kind/domain selection key to its universal recipe id,
// so that whatever a task is, the resolver finds a recipe: one entry per
// WorkItemSource (13), LivestockWorkKind (13), CommunityWorkKind (9),
// FieldActionTaskType (4), and UniversalDomain (16), plus the universal-default.
//
// Built programmatically from the catalogue records (constants/recipe/catalogues/
// universal.ts) rather than hand-typed, so the ids can never drift from the
// recipes they point at — adding a recipe to a record auto-adds its seeded key.
// Mirrors relationships/seededProtocols/universal.ts (the protocol equivalent
// seeds per-objective; recipes seed per-kind/domain because a task carries a
// kind even when it carries no objective).

import type { RecipeProcedure } from '../../schemas/recipe/recipe.schema.js';
import {
  UNIVERSAL_DOMAIN_RECIPES,
  UNIVERSAL_WORK_ITEM_SOURCE_RECIPES,
  UNIVERSAL_LIVESTOCK_KIND_RECIPES,
  UNIVERSAL_COMMUNITY_KIND_RECIPES,
  UNIVERSAL_FIELD_ACTION_TYPE_RECIPES,
  UNIVERSAL_DEFAULT_RECIPE,
} from '../../constants/recipe/catalogues/universal.js';
import {
  RECIPE_KEY_PREFIX,
  RECIPE_UNIVERSAL_DEFAULT_KEY,
  type SeededRecipeMap,
} from './types.js';

/** `<prefix>:<enumValue>` → recipe.id for every entry in a kind/domain record. */
function prefixed(
  prefix: string,
  record: Record<string, RecipeProcedure>,
): SeededRecipeMap {
  const out: Record<string, string> = {};
  for (const [key, recipe] of Object.entries(record)) {
    out[`${prefix}:${key}`] = recipe.id;
  }
  return out;
}

export const UNIVERSAL_SEEDED_RECIPES: SeededRecipeMap = {
  ...prefixed(RECIPE_KEY_PREFIX.domain, UNIVERSAL_DOMAIN_RECIPES),
  ...prefixed(RECIPE_KEY_PREFIX.workItemSource, UNIVERSAL_WORK_ITEM_SOURCE_RECIPES),
  ...prefixed(RECIPE_KEY_PREFIX.livestockKind, UNIVERSAL_LIVESTOCK_KIND_RECIPES),
  ...prefixed(RECIPE_KEY_PREFIX.communityKind, UNIVERSAL_COMMUNITY_KIND_RECIPES),
  ...prefixed(
    RECIPE_KEY_PREFIX.fieldActionTaskType,
    UNIVERSAL_FIELD_ACTION_TYPE_RECIPES,
  ),
  [RECIPE_UNIVERSAL_DEFAULT_KEY]: UNIVERSAL_DEFAULT_RECIPE.id,
};
