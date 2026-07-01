// recipe.schema.ts
//
// The typed foundation for the OLOS Act RECIPE layer (Act Operations-Hub
// Walkthrough). A recipe is the "how-to" a steward sees once a task is chosen
// in the Operations Hub: a recipe-level `why` + `pitfall` wrapping an ordered
// list of `steps`, each step embedding an existing Act affordance (a guidance
// card, an evidence capture, a checklist toggle, a monitoring reading, a map
// draw-tool, a completion transition).
//
// This is the data half of the Act revamp; it mirrors the PROTOCOL layer
// exactly (schema -> per-type catalogues -> seeded relationship maps ->
// resolver -> conformance test) so the two layers read the same and a
// maintainer who knows one knows the other. Where the protocol layer answers
// "what standing rule watches this objective", the recipe layer answers "how
// does a steward actually carry the work out, step by step".
//
// Relationship to the existing checklist/guidance:
//   - The `ACT_TEMPLATE` 5-item checklist (constants/olos/objectives.ts) stays
//     the SOURCE OF TRUTH for objective completion/progress rollups. A recipe
//     WRAPS-AND-SUPERSEDES those instructions FOR THE WALKTHROUGH ONLY — never a
//     second competing completion list. `RecipeStepInputKind` is a superset of
//     `ChecklistRequiredInputType` so a checklist item lifts into a step
//     losslessly (its `requiredInputType` becomes the step's `inputKind`).
//   - `actModuleGuidance.ts` (the 6 authored Operations-Scholar cells) is
//     ABSORBED here: `why` -> recipe `why`, `how[]` -> `steps[]`, `pitfall` ->
//     recipe `pitfall`. That file is frozen and retired as a follow-up (kept on
//     disk per the no-deletion-in-revamps rule).
//
// Amanah guard (defence-in-depth, layer 1 of 4): the `.superRefine` below makes
// "verbatim-or-nothing" a PARSE error — any recipe whose provenance is
// `operator-verbatim` or `scholar-gated` MUST carry non-empty `scopeNotes`
// (the operator's copy, character-for-character) and a `scholar-gated` recipe
// MUST also set `scholarCouncilGated`. Fiqh / capital / slaughter content is
// never fabricated; it ships only as a verbatim+gated stub pending operator and
// Scholar-Council copy.

import { z } from 'zod';
import { PlanStratumId } from '../plan/planStratumObjective.schema.js';
import { ProjectTypeId } from '../plan/projectTypeTaxonomy.schema.js';
import { UniversalDomain } from '../universalDomain.schema.js';

/**
 * The kind of affordance a step embeds. A SUPERSET of the checklist's
 * `ChecklistRequiredInputType` (`evidence | decision | proof | verification |
 * reference`) plus two walkthrough-native kinds:
 *   - reading:    a monitoring reading written through the Observe path
 *                 (ActObjectiveMonitoringPanel) — preserves the CSA guard.
 *   - map-action: arm a draw/survey tool on the embedded map; pairs with
 *                 `toolIds`.
 * Omitted on a pure narration/guidance step (rendered as a GuidanceCard).
 */
export const RecipeStepInputKind = z.enum([
  'evidence',
  'decision',
  'proof',
  'verification',
  'reference',
  'reading',
  'map-action',
]);
export type RecipeStepInputKind = z.infer<typeof RecipeStepInputKind>;

/**
 * Provenance tier of a whole recipe — the Amanah axis.
 *   - authored:          drafted from named regenerative/permaculture practice
 *                        for operator review (the default, like the protocol
 *                        catalogues). May NOT contain a slaughter/capital/sales
 *                        step (enforced by the conformance lint, not the schema).
 *   - operator-verbatim: contains operator-supplied copy transcribed
 *                        character-for-character; MUST carry `scopeNotes`.
 *   - scholar-gated:     touches fiqh-sensitive ground (slaughter/Udhiyah,
 *                        capital channels); MUST carry `scopeNotes` AND set
 *                        `scholarCouncilGated`. Ships as a stub until the
 *                        Scholar Council supplies copy.
 */
export const RecipeProvenanceTier = z.enum([
  'authored',
  'operator-verbatim',
  'scholar-gated',
]);
export type RecipeProvenanceTier = z.infer<typeof RecipeProvenanceTier>;

/**
 * The provenance layer a recipe is contributed from, mirroring the protocol
 * layer's `ProtocolSource`: universal (every project), primary (the project's
 * primary type), secondary (a layered secondary type). Kept as a local enum so
 * the recipe schema carries no dependency on the protocol schema.
 */
export const RecipeSource = z.enum(['universal', 'primary', 'secondary']);
export type RecipeSource = z.infer<typeof RecipeSource>;

/**
 * One ordered step of a recipe. `toolIds` reuse the EXACT Act-tool id strings
 * already produced by `relationships/objectiveActTools.ts` (e.g. 'contour',
 * 'paddocks', 'harvest', 'zone-seed') — no new id space, no app dependency.
 * The walkthrough derives its render-dispatch from `inputKind` + `toolIds`:
 * a `map-action` step with `toolIds` arms those draw tools; an `evidence`/
 * `proof` step mounts the field-action proof capture; etc.
 */
export const RecipeStepSchema = z.object({
  /** Stable kebab id, unique within the recipe. */
  id: z.string().min(1),
  /** Short imperative step title (e.g. "Mark the paddock cells"). */
  title: z.string().min(1),
  /** The full instruction prose shown in the step body. */
  instruction: z.string().min(1),
  /**
   * Which affordance this step embeds. Absent = a narration/guidance step
   * (GuidanceCard). See `RecipeStepInputKind`.
   */
  inputKind: RecipeStepInputKind.optional(),
  /**
   * Act-tool catalogue id strings to arm for this step (verbatim from
   * objectiveActTools.ts). Empty for non-spatial steps.
   */
  toolIds: z.array(z.string().min(1)).default([]),
  /** Optional one-line "why this step matters". */
  rationale: z.string().min(1).optional(),
  /** Optional step-specific failure mode to avoid. */
  pitfall: z.string().min(1).optional(),
  /** Optional named-source citation (e.g. "Savory holistic planned grazing"). */
  citation: z.string().min(1).optional(),
  /**
   * Amanah caution surfaced verbatim on this step. Display-only; never stripped
   * or reworded. Present only on steps that touch a fiqh-sensitive boundary.
   */
  scopeNotes: z.string().min(1).optional(),
});
export type RecipeStep = z.infer<typeof RecipeStepSchema>;

/**
 * A full per-task procedure. Recipe-level `why`/`pitfall` frame the ordered
 * `steps[]`. Provenance fields (`domain`/`stratumId`/`objectiveId`/`source`/
 * `sourceTypeId`) mirror the protocol template so the resolver can sort and
 * attribute exactly as the protocol resolver does.
 *
 * The `.superRefine` is the first Amanah guard (see file header): verbatim or
 * nothing.
 */
export const RecipeProcedureSchema = z
  .object({
    /** Stable kebab id, unique within the recipe catalogue. */
    id: z.string().min(1),
    /** Display name of the procedure (e.g. "Rotate the herd to the next cell"). */
    title: z.string().min(1),
    /**
     * The universal domain this recipe belongs to. Drives the generic
     * domain-fallback lookup in the resolver and the category grouping in the
     * Operations Hub.
     */
    domain: UniversalDomain.optional(),
    /** The stratum that authors this recipe (sort key, mirrors the protocol layer). */
    stratumId: PlanStratumId.optional(),
    /** Objective this recipe is the how-to for, when bespoke to one objective. */
    objectiveId: z.string().min(1).optional(),
    /** Provenance layer (universal/primary/secondary). Absent = universal. */
    source: RecipeSource.optional(),
    /** Which project type contributed this recipe, when source is primary/secondary. */
    sourceTypeId: ProjectTypeId.optional(),
    /** Provenance tier — the Amanah axis. See `RecipeProvenanceTier`. */
    provenanceTier: RecipeProvenanceTier,
    /** The recipe-level "why this work matters" (absorbed from guidance `why`). */
    why: z.string().min(1),
    /** Ordered steps. At least one. */
    steps: z.array(RecipeStepSchema).min(1),
    /** The recipe-level failure mode (absorbed from guidance `pitfall`). */
    pitfall: z.string().min(1).optional(),
    /**
     * Recipe-level Amanah caution, verbatim. REQUIRED when `provenanceTier` is
     * `operator-verbatim` or `scholar-gated` (enforced below). Display-only;
     * never stripped or reworded.
     */
    scopeNotes: z.string().min(1).optional(),
    /**
     * True when this recipe touches ground that requires Scholar-Council sign-off
     * before any real-world instrument is created (slaughter/Udhiyah, capital
     * channels). Forced true for `scholar-gated` recipes.
     */
    scholarCouncilGated: z.boolean().default(false),
    /**
     * Observe-domain feed labels (display-only chips), mirroring the protocol
     * layer's `feeds`.
     */
    feeds: z.array(z.string().min(1)).default([]),
  })
  .superRefine((recipe, ctx) => {
    // Amanah guard 1: verbatim-or-nothing. A non-`authored` recipe MUST carry
    // operator copy in scopeNotes — an empty/absent value is a parse error.
    if (recipe.provenanceTier !== 'authored') {
      if (!recipe.scopeNotes || !recipe.scopeNotes.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scopeNotes'],
          message: `recipe "${recipe.id}" is "${recipe.provenanceTier}" but carries no verbatim scopeNotes — operator/Scholar-Council copy is required (verbatim-or-nothing).`,
        });
      }
    }
    // A scholar-gated recipe must also flag the Scholar-Council gate.
    if (recipe.provenanceTier === 'scholar-gated' && !recipe.scholarCouncilGated) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scholarCouncilGated'],
        message: `recipe "${recipe.id}" is "scholar-gated" but scholarCouncilGated is false — gated recipes must set the gate.`,
      });
    }
  });
export type RecipeProcedure = z.infer<typeof RecipeProcedureSchema>;
