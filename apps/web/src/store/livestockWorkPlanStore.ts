/**
 * livestockWorkPlanStore — the livestock work-plan PROPOSAL layer.
 *
 * Holds the compiled rules and dated proposals produced by
 * `generateLivestockWorkPlan` (packages/shared). Proposals live here in a
 * proposed / confirmed / dismissed lifecycle and reach the WorkItem spine
 * ONLY through the operator's `confirmProposal` — the generation layer is
 * structurally advisory (sovereign-steward covenant). No subscription,
 * effect, or regeneration path in this store writes the spine; there is
 * deliberately NO bulk replace* writer for `source:'livestock-plan'` rows.
 *
 * This is now a thin instantiation of `createWorkPlanStore` (the
 * domain-neutral factory): the ENTIRE proposal lifecycle — `diffWorkPlan`
 * regeneration safety, the single confirm seam, the three resolveReview
 * arms, the verbatim-scopeNotes covenant — lives in the factory and is
 * shared with any other work generator. This file supplies only the
 * livestock wiring: persist key, id prefixes, source tag, provenance flag,
 * and the species / paddock→linkedFeatureId spine columns.
 *
 * Regeneration safety (`applyGeneration` → `diffWorkPlan` 8-row semantics):
 * dismissed proposals are NEVER resurrected; confirmed proposals are NEVER
 * mutated by a regeneration — content changes / orphaning surface as
 * `needsReview` for the operator to resolve (`resolveReview`).
 *
 * Ownership boundary: rotation MOVES stay owned by
 * `rotationSequenceSpineSync` (source 'rotation-sequence'). This layer owns
 * care/cadence/seasonal-husbandry work only.
 *
 * Covenant: `scopeNotes` (Amanah cautions, incl. bayʿ mā laysa ʿindak
 * flags) flow VERBATIM from the instance into the confirmed WorkItem notes
 * — never reworded, stripped, or summarised.
 *
 * Persistence mirrors `workItemStore`: Zustand + `persist`, key
 * `ogden-livestock-work-plan`, IndexedDB backend, flat projectId-tagged
 * arrays, registered in `syncManifest` as `versioned-blob` /
 * `projectId-tagged`. Client-first, no DB migration.
 */

import { rehydrateWithLogging } from './persistRehydrate.js';
import type {
  LivestockWorkInstance,
  LivestockWorkRule,
} from '@ogden/shared';
import {
  createWorkPlanStore,
  type ProjectWorkPlanRule,
  type WorkPlanProposal,
  type WorkPlanProposalEdits,
  type WorkPlanProposalReview,
  type WorkPlanReviewResolution,
} from './createWorkPlanStore.js';

/** A compiled rule, tagged with its project for the flat-array sync class. */
export type ProjectLivestockWorkRule = ProjectWorkPlanRule<LivestockWorkRule>;

/** Operator edits applied to a proposal BEFORE confirmation. */
export type LivestockWorkProposalEdits = WorkPlanProposalEdits;

/**
 * Post-confirmation regeneration flag. `reason:'changed'` carries the
 * regenerated instance so the operator can accept it; `'orphaned'` means
 * the Plan decision behind the work no longer produces this key.
 */
export type LivestockWorkProposalReview =
  WorkPlanProposalReview<LivestockWorkInstance>;

export type LivestockWorkProposal = WorkPlanProposal<LivestockWorkInstance>;

export type LivestockWorkReviewResolution = WorkPlanReviewResolution;

/**
 * The livestock work-plan store: `createWorkPlanStore` instantiated with the
 * livestock-specific wiring. The confirm seam writes a `source:'livestock-
 * plan'` row carrying the `generatedFromLivestockPlan` provenance flag plus
 * the species and paddock→linkedFeatureId columns; everything else (the
 * proposal lifecycle, diffWorkPlan regeneration safety, the verbatim
 * scopeNotes covenant) is the shared factory.
 */
export const useLivestockWorkPlanStore = createWorkPlanStore<
  LivestockWorkRule,
  LivestockWorkInstance
>({
  persistName: 'ogden-livestock-work-plan',
  proposalIdPrefix: 'lwp-',
  workItemIdPrefix: 'lvw__',
  source: 'livestock-plan',
  provenanceField: 'generatedFromLivestockPlan',
  // Livestock-specific spine columns. paddockId maps to the generic
  // `linkedFeatureId`; species is carried verbatim. Both omitted when
  // absent — matching the original conditional spreads exactly.
  extraSpineFields: (inst) => ({
    ...(inst.paddockId ? { linkedFeatureId: inst.paddockId } : {}),
    ...(inst.species ? { species: inst.species } : {}),
  }),
});

rehydrateWithLogging(useLivestockWorkPlanStore);
