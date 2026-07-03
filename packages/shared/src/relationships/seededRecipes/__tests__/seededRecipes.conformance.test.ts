// seededRecipes.conformance.test.ts
//
// Guards the Act recipe layer end to end. Four properties, each a silent-failure
// class in the running Operations Hub if it broke:
//
//   1. SCHEMA — every encoded recipe (universal floor + every bespoke catalogue)
//      parses against RecipeProcedureSchema, so the superRefine invariants
//      (verbatim-or-nothing; scholar-gated ⇒ scholarCouncilGated) hold at runtime,
//      not just at authoring time.
//   2. SEEDED-ID VALIDITY — every id a seeded map points at actually resolves in
//      the recipe set its projects see (mirrors the protocol conformance test).
//   3. TOTALITY — resolveTaskRecipe returns a schema-valid recipe for EVERY task
//      source: each WorkItemSource, LivestockWorkKind, CommunityWorkKind,
//      FieldActionTaskType, and UniversalDomain, plus the bespoke objective ids.
//      The walkthrough can never open on a task with no how-to.
//   4. AMANAH LINT — no recipe text carries the forbidden CSA / advance-purchase /
//      riba family (bayʿ mā laysa ʿindak), and any fiqh-procedure content
//      (dhakāh / Udhiyah / qurbān / khinzir, or an active slaughter step) appears
//      ONLY in a non-`authored`, scholar-gated recipe with scopeNotes set.
//
// The catalogue registries are iterated directly, so a type added to the resolver
// is automatically covered.

import { describe, it, expect } from 'vitest';
import {
  resolveTaskRecipe,
  type ResolveTaskRecipeContext,
} from '../../resolveTaskRecipe.js';
import { PRIMARY_RECIPE_MAPS, SECONDARY_RECIPE_MAPS } from '../index.js';
import { UNIVERSAL_SEEDED_RECIPES } from '../universal.js';
import {
  getPrimaryRecipeCatalogue,
  getSecondaryRecipeCatalogue,
} from '../../../constants/recipe/catalogues/index.js';
import { UNIVERSAL_RECIPES } from '../../../constants/recipe/catalogues/universal.js';
import {
  RecipeProcedureSchema,
  type RecipeProcedure,
} from '../../../schemas/recipe/recipe.schema.js';
import { UNIVERSAL_DOMAINS } from '../../../constants/universalDomain.js';
import { WorkItemSource, type WorkItem } from '../../../schemas/workItem.schema.js';
import {
  LivestockWorkKind,
  type LivestockWorkInstance,
} from '../../../schemas/livestockWork/livestockWork.schema.js';
import {
  CommunityWorkKindSchema,
  type CommunityWorkInstance,
} from '../../../schemas/communityWork/communityWork.schema.js';
import {
  FieldActionTaskType,
  type FieldAction,
} from '../../../schemas/fieldAction/fieldAction.schema.js';
import type { ProjectTypeId } from '../../../schemas/plan/projectTypeTaxonomy.schema.js';
import type { SeededRecipeMap } from '../types.js';

// --- Gather every encoded recipe from the catalogue registries ---------------
function allEncodedRecipes(): RecipeProcedure[] {
  const recipes: RecipeProcedure[] = [...UNIVERSAL_RECIPES];
  for (const typeId of Object.keys(PRIMARY_RECIPE_MAPS) as ProjectTypeId[]) {
    recipes.push(...getPrimaryRecipeCatalogue(typeId).primary);
  }
  for (const typeId of Object.keys(SECONDARY_RECIPE_MAPS) as ProjectTypeId[]) {
    recipes.push(...(getSecondaryRecipeCatalogue(typeId)?.additive ?? []));
  }
  return recipes;
}

/** Every string a recipe carries (recipe-level + step-level), for the Amanah lint. */
function recipeText(recipe: RecipeProcedure): string {
  const parts = [recipe.title, recipe.why, recipe.pitfall ?? '', recipe.scopeNotes ?? ''];
  for (const s of recipe.steps) {
    parts.push(s.title, s.instruction, s.rationale ?? '', s.pitfall ?? '', s.citation ?? '', s.scopeNotes ?? '');
  }
  return parts.join('  ');
}

/** Only the active step language (title + instruction) — excludes why/pitfall disclaimers. */
function recipeStepText(recipe: RecipeProcedure): string {
  return recipe.steps.map((s) => `${s.title}  ${s.instruction}`).join('  ');
}

// Minimal task-object builders (the resolver reads only the discriminating fields).
const asWorkItem = (p: Partial<WorkItem>): WorkItem => p as WorkItem;
const asFieldAction = (p: Partial<FieldAction>): FieldAction => p as FieldAction;
const asLivestock = (p: Partial<LivestockWorkInstance>): LivestockWorkInstance =>
  p as LivestockWorkInstance;
const asCommunity = (p: Partial<CommunityWorkInstance>): CommunityWorkInstance =>
  p as CommunityWorkInstance;

const CTX: ResolveTaskRecipeContext = {
  primaryTypeId: 'homestead',
  secondaryTypeIds: ['silvopasture'],
};

describe('recipe schema conformance', () => {
  it('every encoded recipe parses against RecipeProcedureSchema', () => {
    for (const recipe of allEncodedRecipes()) {
      const result = RecipeProcedureSchema.safeParse(recipe);
      expect(
        result.success,
        `recipe "${recipe.id}" failed schema parse: ${
          result.success ? '' : JSON.stringify(result.error.issues)
        }`,
      ).toBe(true);
    }
  });

  it('recipe ids are unique within the project recipe set', () => {
    const ids = allEncodedRecipes().map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('seeded recipe id validity', () => {
  it('every universal seeded id resolves in UNIVERSAL_RECIPES', () => {
    const valid = new Set(UNIVERSAL_RECIPES.map((r) => r.id));
    for (const [key, recipeId] of Object.entries(UNIVERSAL_SEEDED_RECIPES)) {
      expect(
        valid.has(recipeId ?? ''),
        `universal seeded recipe "${recipeId}" (key "${key}") not in UNIVERSAL_RECIPES`,
      ).toBe(true);
    }
  });

  for (const [typeId, map] of Object.entries(PRIMARY_RECIPE_MAPS) as Array<
    [ProjectTypeId, SeededRecipeMap]
  >) {
    it(`every primary seeded id for "${typeId}" resolves in its catalogue`, () => {
      const catalogue = getPrimaryRecipeCatalogue(typeId);
      const valid = new Set(
        [...catalogue.universal, ...catalogue.primary].map((r) => r.id),
      );
      for (const [key, recipeId] of Object.entries(map)) {
        expect(
          valid.has(recipeId ?? ''),
          `"${typeId}" seeded recipe "${recipeId}" (key "${key}") does not resolve in its catalogue`,
        ).toBe(true);
      }
    });
  }

  for (const [typeId, map] of Object.entries(SECONDARY_RECIPE_MAPS) as Array<
    [ProjectTypeId, SeededRecipeMap]
  >) {
    it(`every secondary seeded id for "${typeId}" resolves when layered`, () => {
      const additive = getSecondaryRecipeCatalogue(typeId)?.additive ?? [];
      const valid = new Set([
        ...UNIVERSAL_RECIPES.map((r) => r.id),
        ...additive.map((r) => r.id),
      ]);
      for (const [key, recipeId] of Object.entries(map)) {
        expect(
          valid.has(recipeId ?? ''),
          `secondary "${typeId}" seeded recipe "${recipeId}" (key "${key}") resolves in neither the universal floor nor the additive catalogue`,
        ).toBe(true);
      }
    });
  }
});

describe('resolveTaskRecipe totality — every task source resolves', () => {
  const schemaValid = (recipe: RecipeProcedure): boolean =>
    RecipeProcedureSchema.safeParse(recipe).success;

  it('every WorkItemSource resolves to a schema-valid recipe', () => {
    for (const source of WorkItemSource.options) {
      const r = resolveTaskRecipe({ kind: 'work-item', task: asWorkItem({ source }) }, CTX);
      expect(schemaValid(r.recipe), `work-item source "${source}"`).toBe(true);
      expect(r.provenance.matchedBy).toBe('work-item-source');
    }
  });

  it('every LivestockWorkKind resolves to a schema-valid recipe', () => {
    for (const kind of LivestockWorkKind.options) {
      const r = resolveTaskRecipe({ kind: 'livestock', task: asLivestock({ kind }) }, CTX);
      expect(schemaValid(r.recipe), `livestock kind "${kind}"`).toBe(true);
      expect(r.provenance.matchedBy).toBe('livestock-kind');
    }
  });

  it('every CommunityWorkKind resolves to a schema-valid recipe', () => {
    for (const kind of CommunityWorkKindSchema.options) {
      const r = resolveTaskRecipe({ kind: 'community', task: asCommunity({ kind }) }, CTX);
      expect(schemaValid(r.recipe), `community kind "${kind}"`).toBe(true);
      expect(r.provenance.matchedBy).toBe('community-kind');
    }
  });

  it('every FieldActionTaskType resolves to a schema-valid recipe', () => {
    for (const taskType of FieldActionTaskType.options) {
      const r = resolveTaskRecipe(
        { kind: 'field-action', task: asFieldAction({ taskType, planObjectiveId: '__unseeded__' }) },
        CTX,
      );
      expect(schemaValid(r.recipe), `field-action type "${taskType}"`).toBe(true);
      expect(r.provenance.matchedBy).toBe('field-action-task-type');
    }
  });

  it('every UniversalDomain resolves via the checklist-item domain fallback', () => {
    for (const domain of UNIVERSAL_DOMAINS) {
      const r = resolveTaskRecipe(
        { kind: 'checklist-item', objectiveId: '__unseeded__', domain },
        CTX,
      );
      expect(schemaValid(r.recipe), `domain "${domain}"`).toBe(true);
      expect(r.provenance.matchedBy).toBe('domain');
      expect(r.provenance.isFallback).toBe(true);
      expect(r.recipe.id).toBe(`u-recipe-domain-${domain}`);
    }
  });

  it('a bare checklist item with no domain hits the universal default', () => {
    const r = resolveTaskRecipe({ kind: 'checklist-item', objectiveId: '__unseeded__' }, CTX);
    expect(r.provenance.matchedBy).toBe('universal-default');
    expect(r.recipe.id).toBe('u-recipe-universal-default');
  });
});

describe('resolveTaskRecipe — bespoke + provenance + Amanah passthrough', () => {
  it('a homestead objective resolves to its bespoke primary recipe', () => {
    const r = resolveTaskRecipe(
      { kind: 'work-item', task: asWorkItem({ source: 'field-task', sourceObjectiveId: 'hms-s3-water-quality' }) },
      CTX,
    );
    expect(r.recipe.id).toBe('hms-recipe-water-quality');
    expect(r.provenance.matchedBy).toBe('objective');
    expect(r.provenance.sourceLayer).toBe('primary');
    expect(r.provenance.isFallback).toBe(false);
  });

  it('a layered silvopasture-secondary objective resolves to its secondary recipe', () => {
    const r = resolveTaskRecipe(
      { kind: 'work-item', task: asWorkItem({ source: 'field-task', sourceObjectiveId: 'silv-sec-s4-grazing-design' }) },
      CTX,
    );
    expect(r.recipe.id).toBe('silv-recipe-sec-grazing-design');
    expect(r.provenance.sourceLayer).toBe('secondary');
  });

  it('the slaughter-prep kind resolves to the scholar-gated recipe', () => {
    const r = resolveTaskRecipe(
      { kind: 'livestock', task: asLivestock({ kind: 'slaughter-prep' }) },
      CTX,
    );
    expect(r.recipe.id).toBe('u-recipe-livestock-slaughter-prep');
    expect(r.scholarCouncilGated).toBe(true);
    expect(r.scopeNotes.length).toBeGreaterThan(0);
  });

  it('upstream verbatim scopeNotes pass through unreworded and deduped', () => {
    const upstream = 'Operator caution: handle this stock pathway per the standing ruling.';
    const r = resolveTaskRecipe(
      { kind: 'livestock', task: asLivestock({ kind: 'welfare-check', scopeNotes: upstream }) },
      CTX,
    );
    expect(r.scopeNotes).toContain(upstream);
  });
});

describe('Amanah string lint', () => {
  // SET A — forbidden in ANY recipe text, regardless of tier (advance-purchase /
  // CSA / riba family — bayʿ mā laysa ʿindak).
  const FORBIDDEN = [
    /community[- ]supported/i,
    /\bCSRA\b/,
    /advance[- ]purchase/i,
    /\badvance sale\b/i,
    /\bsalam\b/i,
    /\briba\b/i,
    /bay\S*\s*m[āa]\s*laysa/i,
    /\binvestor/i,
  ];

  // SET B — fiqh-procedure markers. If present, the recipe MUST be non-`authored`,
  // scholar-gated, and carry scopeNotes. Arabic terms appear only in actual
  // procedure copy, never in an English disclaimer ("does not touch the slaughter
  // pathway"), so they do not false-positive the authored animal-husbandry recipe.
  const GATED_MARKERS = [/dhak[āa]h/i, /\budhiyah\b/i, /\bqurb[āa]n\b/i, /\bkhinzir\b/i, /\btasmiyah\b/i];

  it('no recipe carries a forbidden advance-purchase / CSA / riba string', () => {
    for (const recipe of allEncodedRecipes()) {
      const text = recipeText(recipe);
      for (const pattern of FORBIDDEN) {
        expect(
          pattern.test(text),
          `recipe "${recipe.id}" matches forbidden pattern ${pattern}`,
        ).toBe(false);
      }
    }
  });

  it('fiqh-procedure content appears only in a scholar-gated recipe with scopeNotes', () => {
    for (const recipe of allEncodedRecipes()) {
      const matchesMarker = GATED_MARKERS.some((p) => p.test(recipeText(recipe)));
      if (!matchesMarker) continue;
      expect(recipe.provenanceTier, `recipe "${recipe.id}"`).not.toBe('authored');
      expect(recipe.scholarCouncilGated, `recipe "${recipe.id}"`).toBe(true);
      expect((recipe.scopeNotes ?? '').length, `recipe "${recipe.id}"`).toBeGreaterThan(0);
    }
  });

  it('an active slaughter STEP appears only in a scholar-gated recipe', () => {
    for (const recipe of allEncodedRecipes()) {
      if (!/\bslaughter\b/i.test(recipeStepText(recipe))) continue;
      expect(recipe.provenanceTier, `recipe "${recipe.id}"`).not.toBe('authored');
      expect(recipe.scholarCouncilGated, `recipe "${recipe.id}"`).toBe(true);
    }
  });
});
