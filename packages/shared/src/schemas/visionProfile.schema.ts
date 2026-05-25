import { z } from 'zod';

/**
 * Vision Profile — the machine-readable output of the Stage Zero Vision
 * Builder questionnaire (see OLOS Stage Zero spec). Captured as a set of
 * multiple-choice answers, it configures how the downstream OBSERVE / PLAN /
 * ACT stages are framed (which modules are emphasised, what success looks
 * like, what the plan must avoid).
 *
 * Stored inside `projects.metadata.visionProfile` (passthrough JSONB) so no
 * migration is needed. The questionnaire config
 * (`apps/web/src/v3/stage-zero/data/visionBuilderQuestions.ts`) is the source
 * of truth for the set of valid option ids; this schema is intentionally
 * permissive (string / string[]) so config edits don't require a schema
 * change. Promote a field to a strict enum once its options stabilise.
 *
 * Every field is optional: the builder autosaves after each answer and is
 * resumable, so a half-finished profile is the normal mid-flow state.
 */

const Id = z.string().max(120);
const IdList = z.array(Id).max(60);

/** Systems-in-scope, grouped exactly as the questionnaire presents them. */
export const VisionSystemsInScope = z
  .object({
    food: IdList.optional(),
    animals: IdList.optional(),
    water: IdList.optional(),
    built: IdList.optional(),
  })
  .partial();
export type VisionSystemsInScope = z.infer<typeof VisionSystemsInScope>;

/** Conditional livestock detail — only authored when animals are in scope. */
export const VisionLivestock = z
  .object({
    roles: IdList.optional(),
    intensity: Id.optional(),
    managementStyle: Id.optional(),
    priorities: IdList.optional(),
  })
  .partial();
export type VisionLivestock = z.infer<typeof VisionLivestock>;

export const VisionProfile = z
  .object({
    // Step 1 — project type. The builder offers a richer type vocabulary than
    // the strict `ProjectType` enum, so the raw builder id is kept here for
    // fidelity; the closest enum value is mirrored to `project.projectType`
    // (which Plan reads) via `toProjectType`.
    primaryType: Id.optional(),
    secondaryTypes: IdList.optional(),
    // Step 2–4
    primaryOutcomes: IdList.optional(),
    landIdentity: IdList.optional(),
    users: IdList.optional(),
    publicAccessLevel: Id.optional(),
    // Step 5
    systemsInScope: VisionSystemsInScope.optional(),
    // Step 6
    economicIntentLevel: Id.optional(),
    incomeStreams: IdList.optional(),
    economicStyle: Id.optional(),
    // Step 7
    values: IdList.optional(),
    // Step 8
    developmentStyle: Id.optional(),
    complexityTolerance: Id.optional(),
    operatingStyle: Id.optional(),
    // Step 9
    willLiveOnLand: Id.optional(),
    residentialForms: IdList.optional(),
    sharedSpaces: IdList.optional(),
    // Step 10 — conditional
    livestock: VisionLivestock.optional(),
    // Step 11
    nonNegotiablesAvoid: IdList.optional(),
    disqualifiers: IdList.optional(),
    // Step 12
    budgetRange: Id.optional(),
    resourcesHave: IdList.optional(),
    resourceConstraints: IdList.optional(),
    // Step 13
    timelineProgress: Id.optional(),
    firstWorkingSystems: IdList.optional(),
    // Step 14
    successDefinition: IdList.optional(),
    // Step 15
    guidanceStyle: Id.optional(),
    guidanceDepth: Id.optional(),
    // Bookkeeping
    updatedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
  })
  .partial();
export type VisionProfile = z.infer<typeof VisionProfile>;
