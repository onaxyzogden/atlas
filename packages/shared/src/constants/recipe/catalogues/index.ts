// recipe catalogues/index.ts
//
// Registry for the per-type recipe catalogue — the single place that knows which
// primary and secondary project types have bespoke per-objective recipes
// (mirrors constants/protocol/catalogues/index.ts on the protocol side). The
// resolveTaskRecipe seam goes through this file; adding a new per-type recipe
// catalogue means wiring it here and nowhere else.
//
// Every project gets the UNIVERSAL_RECIPES floor (16 domain + every task-source
// enum value + a universal default). A primary type adds its own bespoke
// per-objective recipes; a compatible secondary type adds additive ones. Types
// without a bespoke catalogue resolve universal-only — graceful, exactly like a
// not-yet-encoded protocol type.

import type { RecipeProcedure } from '../../../schemas/recipe/recipe.schema.js';
import type { ProjectTypeId } from '../../../schemas/plan/projectTypeTaxonomy.schema.js';
import { UNIVERSAL_RECIPES } from './universal.js';
import {
  SILVOPASTURE_PRIMARY_RECIPES,
  SILVOPASTURE_SECONDARY_RECIPES,
} from './silvopasture.js';
import { HOMESTEAD_PRIMARY_RECIPES } from './homestead.js';

export { UNIVERSAL_RECIPES };

/** The universal floor plus a primary type's own bespoke recipes. */
export interface PrimaryRecipeCatalogue {
  /** The universal recipes, shared by every project (the totality floor). */
  universal: readonly RecipeProcedure[];
  /** The primary type's own per-objective recipes (empty for not-yet-encoded types). */
  primary: readonly RecipeProcedure[];
}

/** A secondary type's additive per-objective recipes. */
export interface SecondaryRecipeCatalogue {
  additive: readonly RecipeProcedure[];
}

const EMPTY: readonly RecipeProcedure[] = [];

/**
 * Resolve the primary-layer recipe catalogue for a primary type. Always returns
 * the universal floor; `primary` is the type's own bespoke recipes when encoded,
 * else an empty list (the type runs universal-only).
 */
export function getPrimaryRecipeCatalogue(
  primaryTypeId: ProjectTypeId,
): PrimaryRecipeCatalogue {
  const primary: readonly RecipeProcedure[] =
    primaryTypeId === 'homestead'
      ? HOMESTEAD_PRIMARY_RECIPES
      : primaryTypeId === 'silvopasture'
        ? SILVOPASTURE_PRIMARY_RECIPES
        : EMPTY;
  return { universal: UNIVERSAL_RECIPES, primary };
}

/**
 * Resolve the secondary-layer recipe catalogue for a secondary type, or
 * `undefined` when the type has no bespoke recipes (the resolver layers nothing).
 */
export function getSecondaryRecipeCatalogue(
  secondaryTypeId: ProjectTypeId,
): SecondaryRecipeCatalogue | undefined {
  switch (secondaryTypeId) {
    case 'silvopasture':
      return { additive: SILVOPASTURE_SECONDARY_RECIPES };
    default:
      return undefined;
  }
}
