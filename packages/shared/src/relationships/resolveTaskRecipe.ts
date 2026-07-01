// relationships/resolveTaskRecipe.ts
//
// THE SEAM. Pure, store-free, React-free (mirrors actObjectiveTaskBridge.ts): the
// single function the Act Operations Hub calls to turn any task — a WorkItem, a
// FieldAction, a livestock/community work instance, or a bare checklist item —
// into the one how-to recipe that walks the steward through it.
//
// Resolution is two-dimensional:
//   1. candidate-key specificity — each task yields an ORDERED list of selection
//      keys, most specific first (objective → kind → domain → universal-default);
//   2. type-layer precedence — within a key, resolveSeededRecipeId prefers the
//      primary type's map, then secondaries, then the universal floor.
// The first candidate key that resolves to an indexed recipe wins. The universal
// floor seeds every kind/domain key and the universal-default, so the function is
// TOTAL — `recipe` is never null.
//
// Amanah passthrough (defence-in-depth layer 3): any verbatim `scopeNotes` the
// upstream task carries (LivestockWorkInstance / CommunityWorkInstance) and the
// recipe's own `scopeNotes` are concatenated onto `ResolvedTaskRecipe.scopeNotes`
// unreworded — never replaced, never summarised — so the operator's fiqh caution
// reaches the walkthrough character-for-character.

import type { WorkItem } from '../schemas/workItem.schema.js';
import type { FieldAction } from '../schemas/fieldAction/fieldAction.schema.js';
import type { LivestockWorkInstance } from '../schemas/livestockWork/livestockWork.schema.js';
import type { CommunityWorkInstance } from '../schemas/communityWork/communityWork.schema.js';
import type { UniversalDomain } from '../schemas/universalDomain.schema.js';
import type { ProjectTypeId } from '../schemas/plan/projectTypeTaxonomy.schema.js';
import type { RecipeProcedure } from '../schemas/recipe/recipe.schema.js';
import {
  getPrimaryRecipeCatalogue,
  getSecondaryRecipeCatalogue,
} from '../constants/recipe/catalogues/index.js';
import { resolveSeededRecipeId } from './seededRecipes/index.js';
import { recipeKeys } from './seededRecipes/types.js';

// ---------------------------------------------------------------------------
// Public seam types
// ---------------------------------------------------------------------------

/**
 * A task to resolve, discriminated by source. The four work types carry their
 * full schema object (all in @ogden/shared, so no app coupling); `checklist-item`
 * carries only what resolution needs — its objective id and, for the generic
 * fallback, the objective's domain.
 */
export type RecipeTaskInput =
  | { kind: 'work-item'; task: WorkItem }
  | { kind: 'field-action'; task: FieldAction }
  | { kind: 'livestock'; task: LivestockWorkInstance }
  | { kind: 'community'; task: CommunityWorkInstance }
  | { kind: 'checklist-item'; objectiveId: string; domain?: UniversalDomain };

export interface ResolveTaskRecipeContext {
  primaryTypeId: ProjectTypeId;
  secondaryTypeIds?: readonly ProjectTypeId[];
}

/** How the winning recipe was matched — drives the generic-vs-bespoke UI badge. */
export type RecipeMatchedBy =
  | 'objective'
  | 'work-item-source'
  | 'field-action-task-type'
  | 'livestock-kind'
  | 'community-kind'
  | 'domain'
  | 'universal-default';

export interface ResolvedTaskRecipe {
  /** Schema-valid recipe — NEVER null (the universal floor guarantees a hit). */
  recipe: RecipeProcedure;
  provenance: {
    matchedBy: RecipeMatchedBy;
    /** The selection key that resolved (the objective id or synthetic kind key). */
    selectionKey: string;
    /** Which catalogue layer authored the resolved recipe. */
    sourceLayer: 'universal' | 'primary' | 'secondary';
    /** True for the generic 'domain' / 'universal-default' catch-alls. */
    isFallback: boolean;
  };
  /** Verbatim cautions (recipe-level + upstream task) — render read-only. */
  scopeNotes: readonly string[];
  scholarCouncilGated: boolean;
}

// ---------------------------------------------------------------------------
// Internal: per-call recipe index (id -> recipe + the layer it came from)
// ---------------------------------------------------------------------------

type SourceLayer = ResolvedTaskRecipe['provenance']['sourceLayer'];
interface IndexedRecipe {
  recipe: RecipeProcedure;
  sourceLayer: SourceLayer;
}

/**
 * Build the id → recipe index for a project: universal floor first, then the
 * primary type's bespoke recipes, then each layered secondary's additive recipes.
 * Later layers override earlier ones on id collision (none expected — bespoke ids
 * are distinct), and stamp the `sourceLayer` the resolved recipe reports.
 */
function buildRecipeIndex(ctx: ResolveTaskRecipeContext): Map<string, IndexedRecipe> {
  const index = new Map<string, IndexedRecipe>();
  const primaryCatalogue = getPrimaryRecipeCatalogue(ctx.primaryTypeId);
  for (const recipe of primaryCatalogue.universal) {
    index.set(recipe.id, { recipe, sourceLayer: 'universal' });
  }
  for (const recipe of primaryCatalogue.primary) {
    index.set(recipe.id, { recipe, sourceLayer: 'primary' });
  }
  for (const secondaryTypeId of ctx.secondaryTypeIds ?? []) {
    const secondaryCatalogue = getSecondaryRecipeCatalogue(secondaryTypeId);
    for (const recipe of secondaryCatalogue?.additive ?? []) {
      index.set(recipe.id, { recipe, sourceLayer: 'secondary' });
    }
  }
  return index;
}

// ---------------------------------------------------------------------------
// Internal: ordered candidate selection keys per task (most specific first)
// ---------------------------------------------------------------------------

interface Candidate {
  key: string;
  matchedBy: RecipeMatchedBy;
}

/**
 * The ordered selection keys for a task. The universal-default candidate is
 * appended to EVERY list so the resolver is provably total even if a kind/domain
 * key were ever absent from the floor.
 */
function candidatesFor(input: RecipeTaskInput): Candidate[] {
  const candidates: Candidate[] = [];
  switch (input.kind) {
    case 'work-item': {
      if (input.task.sourceObjectiveId) {
        candidates.push({
          key: recipeKeys.objective(input.task.sourceObjectiveId),
          matchedBy: 'objective',
        });
      }
      candidates.push({
        key: recipeKeys.workItemSource(input.task.source),
        matchedBy: 'work-item-source',
      });
      break;
    }
    case 'field-action': {
      candidates.push({
        key: recipeKeys.objective(input.task.planObjectiveId),
        matchedBy: 'objective',
      });
      candidates.push({
        key: recipeKeys.fieldActionTaskType(input.task.taskType),
        matchedBy: 'field-action-task-type',
      });
      break;
    }
    case 'livestock': {
      if (input.task.sourceObjectiveId) {
        candidates.push({
          key: recipeKeys.objective(input.task.sourceObjectiveId),
          matchedBy: 'objective',
        });
      }
      candidates.push({
        key: recipeKeys.livestockKind(input.task.kind),
        matchedBy: 'livestock-kind',
      });
      break;
    }
    case 'community': {
      if (input.task.sourceObjectiveId) {
        candidates.push({
          key: recipeKeys.objective(input.task.sourceObjectiveId),
          matchedBy: 'objective',
        });
      }
      candidates.push({
        key: recipeKeys.communityKind(input.task.kind),
        matchedBy: 'community-kind',
      });
      break;
    }
    case 'checklist-item': {
      candidates.push({
        key: recipeKeys.objective(input.objectiveId),
        matchedBy: 'objective',
      });
      if (input.domain) {
        candidates.push({
          key: recipeKeys.domain(input.domain),
          matchedBy: 'domain',
        });
      }
      break;
    }
  }
  candidates.push({
    key: recipeKeys.universalDefault(),
    matchedBy: 'universal-default',
  });
  return candidates;
}

// ---------------------------------------------------------------------------
// Internal: assemble the verbatim scopeNotes (recipe-level + upstream task)
// ---------------------------------------------------------------------------

function assembleScopeNotes(
  recipe: RecipeProcedure,
  input: RecipeTaskInput,
): string[] {
  const notes: string[] = [];
  const push = (note: string | undefined): void => {
    if (note && !notes.includes(note)) notes.push(note);
  };
  // Recipe-level caution first (e.g. the scholar-gated slaughter-prep recipe).
  push(recipe.scopeNotes);
  // Then the upstream task's verbatim Amanah caution, unreworded.
  if (input.kind === 'livestock' || input.kind === 'community') {
    push(input.task.scopeNotes);
  }
  return notes;
}

// ---------------------------------------------------------------------------
// The resolver
// ---------------------------------------------------------------------------

/**
 * Resolve the single how-to recipe for a task. Total: always returns a
 * schema-valid recipe (the universal floor + universal-default guarantee a hit).
 */
export function resolveTaskRecipe(
  input: RecipeTaskInput,
  ctx: ResolveTaskRecipeContext,
): ResolvedTaskRecipe {
  const index = buildRecipeIndex(ctx);

  for (const candidate of candidatesFor(input)) {
    const recipeId = resolveSeededRecipeId(
      candidate.key,
      ctx.primaryTypeId,
      ctx.secondaryTypeIds,
    );
    if (!recipeId) continue;
    const indexed = index.get(recipeId);
    if (!indexed) continue; // defensive: seeded id with no recipe (conformance forbids)

    return {
      recipe: indexed.recipe,
      provenance: {
        matchedBy: candidate.matchedBy,
        selectionKey: candidate.key,
        sourceLayer: indexed.sourceLayer,
        isFallback:
          candidate.matchedBy === 'domain' ||
          candidate.matchedBy === 'universal-default',
      },
      scopeNotes: assembleScopeNotes(indexed.recipe, input),
      scholarCouncilGated: indexed.recipe.scholarCouncilGated,
    };
  }

  // Unreachable: the universal-default candidate always resolves and is always
  // indexed. Kept as a typed total-function guarantee rather than a non-null
  // assertion on the loop.
  const fallbackId = recipeKeys.universalDefault();
  const fallbackRecipeId = resolveSeededRecipeId(
    fallbackId,
    ctx.primaryTypeId,
    ctx.secondaryTypeIds,
  );
  const fallback = fallbackRecipeId ? index.get(fallbackRecipeId) : undefined;
  if (!fallback) {
    throw new Error(
      'resolveTaskRecipe: universal-default recipe missing from index — the universal floor is broken.',
    );
  }
  return {
    recipe: fallback.recipe,
    provenance: {
      matchedBy: 'universal-default',
      selectionKey: fallbackId,
      sourceLayer: fallback.sourceLayer,
      isFallback: true,
    },
    scopeNotes: assembleScopeNotes(fallback.recipe, input),
    scholarCouncilGated: fallback.recipe.scholarCouncilGated,
  };
}
