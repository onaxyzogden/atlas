/**
 * communityWorkPlanStore — the community work-plan PROPOSAL layer.
 *
 * Holds the compiled rules and dated proposals produced by
 * `generateCommunityWorkPlan` (packages/shared). Proposals live here in a
 * proposed / confirmed / dismissed lifecycle and reach the WorkItem spine
 * ONLY through the operator's `confirmProposal` — the generation layer is
 * structurally advisory (sovereign-steward covenant). No subscription,
 * effect, or regeneration path in this store writes the spine; there is
 * deliberately NO bulk replace* writer for `source:'community-plan'` rows.
 *
 * This is a thin instantiation of `createWorkPlanStore` (the domain-neutral
 * factory): the ENTIRE proposal lifecycle — `diffWorkPlan` regeneration
 * safety, the single confirm seam, the three resolveReview arms, the
 * verbatim-scopeNotes covenant — lives in the factory and is shared with the
 * livestock generator. This file supplies only the community wiring: persist
 * key, id prefixes, source tag, and provenance flag. Community governance is
 * NOT season- or paddock-scoped, so there are deliberately no extra spine
 * columns (no `extraSpineFields`) — the livestock species / paddock columns
 * have no analogue here.
 *
 * Regeneration safety (`applyGeneration` → `diffWorkPlan` 8-row semantics):
 * dismissed proposals are NEVER resurrected; confirmed proposals are NEVER
 * mutated by a regeneration — content changes / orphaning surface as
 * `needsReview` for the operator to resolve (`resolveReview`).
 *
 * Covenant: `scopeNotes` (Amanah cautions, incl. bayʿ mā laysa ʿindak
 * flags) flow VERBATIM from the instance into the confirmed WorkItem notes
 * — never reworded, stripped, or summarised.
 *
 * Persistence mirrors `livestockWorkPlanStore`: Zustand + `persist`, key
 * `ogden-community-work-plan`, IndexedDB backend, flat projectId-tagged
 * arrays, registered in `syncManifest` as `versioned-blob` /
 * `projectId-tagged`. Client-first, no DB migration.
 */

import { rehydrateWithLogging } from './persistRehydrate.js';
import type {
  CommunityWorkInstance,
  CommunityWorkRule,
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
export type ProjectCommunityWorkRule = ProjectWorkPlanRule<CommunityWorkRule>;

/** Operator edits applied to a proposal BEFORE confirmation. */
export type CommunityWorkProposalEdits = WorkPlanProposalEdits;

/**
 * Post-confirmation regeneration flag. `reason:'changed'` carries the
 * regenerated instance so the operator can accept it; `'orphaned'` means
 * the Plan decision behind the work no longer produces this key.
 */
export type CommunityWorkProposalReview =
  WorkPlanProposalReview<CommunityWorkInstance>;

export type CommunityWorkProposal = WorkPlanProposal<CommunityWorkInstance>;

export type CommunityWorkReviewResolution = WorkPlanReviewResolution;

/**
 * The community work-plan store: `createWorkPlanStore` instantiated with the
 * community-specific wiring. The confirm seam writes a `source:'community-
 * plan'` row carrying the `generatedFromCommunityPlan` provenance flag;
 * everything else (the proposal lifecycle, diffWorkPlan regeneration safety,
 * the verbatim scopeNotes covenant) is the shared factory. No
 * `extraSpineFields` — community governance has no species / paddock columns.
 */
export const useCommunityWorkPlanStore = createWorkPlanStore<
  CommunityWorkRule,
  CommunityWorkInstance
>({
  persistName: 'ogden-community-work-plan',
  proposalIdPrefix: 'cwp-',
  workItemIdPrefix: 'cmw__',
  source: 'community-plan',
  provenanceField: 'generatedFromCommunityPlan',
});

rehydrateWithLogging(useCommunityWorkPlanStore);
