// relationships/seededRecipes/types.ts
//
// Shared types + selection-key builders for the seeded-recipe layer. Mirrors
// relationships/seededProtocols/types.ts, but a recipe map carries exactly ONE
// recipe id per key (a task has exactly one how-to), where the protocol map
// carries an array (an objective can trigger several standing protocols).
//
// The selection keys are the single contract between the seeded maps (which
// declare them) and resolveTaskRecipe (which builds them per task). Defining the
// prefixes + builders here once is what keeps the two sides from drifting — a
// renamed prefix is a compile error on both, not a silent resolution miss.

import type { WorkItemSource } from '../../schemas/workItem.schema.js';
import type { LivestockWorkKind } from '../../schemas/livestockWork/livestockWork.schema.js';
import type { CommunityWorkKind } from '../../schemas/communityWork/communityWork.schema.js';
import type { FieldActionTaskType } from '../../schemas/fieldAction/fieldAction.schema.js';
import type { UniversalDomain } from '../../schemas/universalDomain.schema.js';

/**
 * One recipe id per selection key. A key is either a bare `objectiveId` (the most
 * specific match) or a synthetic kind/domain key built via `recipeKeys` below.
 * `Partial` because most maps only encode a slice of the key space.
 */
export type SeededRecipeMap = Partial<Record<string, string>>;

/** Synthetic-key prefixes, shared by the universal map builder and the resolver. */
export const RECIPE_KEY_PREFIX = {
  workItemSource: 'workItemSource',
  livestockKind: 'livestockKind',
  communityKind: 'communityKind',
  fieldActionTaskType: 'fieldActionTaskType',
  domain: 'domain',
} as const;

/** The absolute last-resort selection key (always present in the universal map). */
export const RECIPE_UNIVERSAL_DEFAULT_KEY = 'universal-default';

/**
 * Selection-key builders. The resolver constructs an ordered list of these per
 * task (most specific first) and probes the seeded maps with each; the seeded
 * maps key their synthetic entries the same way. `objective` is identity — an
 * objective id IS its own key — kept here so callers never special-case it.
 */
export const recipeKeys = {
  objective: (objectiveId: string): string => objectiveId,
  workItemSource: (s: WorkItemSource): string =>
    `${RECIPE_KEY_PREFIX.workItemSource}:${s}`,
  livestockKind: (k: LivestockWorkKind): string =>
    `${RECIPE_KEY_PREFIX.livestockKind}:${k}`,
  communityKind: (k: CommunityWorkKind): string =>
    `${RECIPE_KEY_PREFIX.communityKind}:${k}`,
  fieldActionTaskType: (t: FieldActionTaskType): string =>
    `${RECIPE_KEY_PREFIX.fieldActionTaskType}:${t}`,
  domain: (d: UniversalDomain): string => `${RECIPE_KEY_PREFIX.domain}:${d}`,
  universalDefault: (): string => RECIPE_UNIVERSAL_DEFAULT_KEY,
} as const;
