// catalogues/recipe/_builders.ts
//
// Shared step + spine builders for the recipe catalogues. The ACT_TEMPLATE
// 5-step backbone (constants/olos/objectives.ts) MUST be identical across the
// universal floor and every bespoke per-type catalogue, so it lives here once
// and the catalogues import it. Keeping the spine in one place is what makes the
// walkthrough read the same whether a task hits a bespoke recipe or the generic
// fallback.

import type {
  RecipeProcedure,
  RecipeStep,
} from '../../../schemas/recipe/recipe.schema.js';

export type StepExtra = Partial<
  Pick<RecipeStep, 'toolIds' | 'rationale' | 'pitfall' | 'citation' | 'scopeNotes'>
>;

/** Construct one recipe step, defaulting `toolIds` to [] (output-type requires it). */
export function step(
  id: string,
  title: string,
  instruction: string,
  inputKind?: RecipeStep['inputKind'],
  extra?: StepExtra,
): RecipeStep {
  return {
    id,
    title,
    instruction,
    ...(inputKind ? { inputKind } : {}),
    toolIds: extra?.toolIds ?? [],
    ...(extra?.rationale ? { rationale: extra.rationale } : {}),
    ...(extra?.pitfall ? { pitfall: extra.pitfall } : {}),
    ...(extra?.citation ? { citation: extra.citation } : {}),
    ...(extra?.scopeNotes ? { scopeNotes: extra.scopeNotes } : {}),
  };
}

/** The two ACT_TEMPLATE steps that open every recipe (fresh objects each call). */
export function spineFront(): RecipeStep[] {
  return [
    step(
      'confirm-handoff',
      'Confirm the handoff package',
      'Confirm the Act Handoff Package is in place and the prerequisites are met.',
      'reference',
    ),
    step(
      'schedule-work',
      'Assign, schedule, and gather materials',
      'Assign / accept the task, schedule the work window, and confirm materials are available.',
      'decision',
    ),
  ];
}

/** The two ACT_TEMPLATE steps that close every recipe (fresh objects each call). */
export function spineBack(): RecipeStep[] {
  return [
    step(
      'submit-proof',
      'Submit completion proof',
      'Submit completion proof and request verification.',
      'proof',
    ),
    step(
      'verify-signoff',
      'Verify and sign off',
      'Receive verification outcome; address rework or sign off completion.',
      'verification',
    ),
  ];
}

/** Wrap a domain/objective-specific body in the ACT_TEMPLATE spine. */
export function withSpine(body: RecipeStep[]): RecipeStep[] {
  return [...spineFront(), ...body, ...spineBack()];
}

/** Options for an authored bespoke recipe (the non-spine fields). */
export interface AuthoredRecipeOpts {
  domain?: RecipeProcedure['domain'];
  stratumId?: RecipeProcedure['stratumId'];
  pitfall?: string;
  feeds?: string[];
}

/**
 * Build one `authored`-tier bespoke per-objective recipe: spine front + the
 * objective-specific `body` + spine back. Bespoke catalogues use this so every
 * recipe carries the same handoff/schedule/proof/verify backbone as the
 * universal floor, differing only in the operational middle.
 *
 * `source`/`sourceTypeId`/`objectiveId` are passed explicitly by the caller
 * (they vary per primary/secondary layer). Never emit a slaughter/capital/sales
 * step here — `authored` recipes are lint-forbidden from fiqh-sensitive content;
 * those resolve to the universal gated/verbatim recipes instead.
 */
export function bespokeRecipe(
  args: {
    id: string;
    title: string;
    objectiveId: string;
    source: 'primary' | 'secondary';
    sourceTypeId: RecipeProcedure['sourceTypeId'];
    why: string;
    body: RecipeStep[];
  } & AuthoredRecipeOpts,
): RecipeProcedure {
  return {
    id: args.id,
    title: args.title,
    ...(args.domain ? { domain: args.domain } : {}),
    ...(args.stratumId ? { stratumId: args.stratumId } : {}),
    objectiveId: args.objectiveId,
    source: args.source,
    ...(args.sourceTypeId ? { sourceTypeId: args.sourceTypeId } : {}),
    provenanceTier: 'authored',
    why: args.why,
    steps: withSpine(args.body),
    ...(args.pitfall ? { pitfall: args.pitfall } : {}),
    scholarCouncilGated: false,
    feeds: args.feeds ?? [],
  };
}
