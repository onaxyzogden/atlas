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

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import { diffWorkPlan } from '@ogden/shared';
import type {
  LivestockWorkInstance,
  LivestockWorkProposalStatus,
  LivestockWorkRule,
  WorkItem,
  WorkPlanEntry,
} from '@ogden/shared';
import { useWorkItemStore } from './workItemStore.js';

/** A compiled rule, tagged with its project for the flat-array sync class. */
export interface ProjectLivestockWorkRule extends LivestockWorkRule {
  projectId: string;
}

/** Operator edits applied to a proposal BEFORE confirmation. */
export interface LivestockWorkProposalEdits {
  /** Overrides the generated dueDate (YYYY-MM-DD). */
  dueDate?: string;
  /** Overrides the generated suggestedCarer. */
  carer?: string;
}

/**
 * Post-confirmation regeneration flag. `reason:'changed'` carries the
 * regenerated instance so the operator can accept it; `'orphaned'` means
 * the Plan decision behind the work no longer produces this key.
 */
export interface LivestockWorkProposalReview {
  reason: 'changed' | 'orphaned';
  next?: LivestockWorkInstance;
}

export interface LivestockWorkProposal {
  /** Deterministic `lwp-<instanceKey>` — stable across regenerations. */
  id: string;
  projectId: string;
  /** The generated instance (denormalised, self-contained for review UI). */
  instance: LivestockWorkInstance;
  status: LivestockWorkProposalStatus;
  /** Spine row id (`lvw__<key>`) once confirmed. Kept for audit even if
   * the work is later cancelled via `resolveReview('cancel-work')`. */
  confirmedWorkItemId?: string;
  editedFields?: LivestockWorkProposalEdits;
  needsReview?: LivestockWorkProposalReview;
  /**
   * Set by `resolveReview('keep-mine')`: the review condition the operator
   * already declined (`<inputsHash>` for 'changed', `'orphaned'` for
   * orphaning) — suppresses the SAME flag re-surfacing on every
   * regeneration while still flagging any NEW change.
   */
  suppressedReviewFor?: string;
  createdAt: string;
  updatedAt: string;
}

export type LivestockWorkReviewResolution =
  | 'accept-update'
  | 'keep-mine'
  | 'cancel-work';

interface LivestockWorkPlanState {
  rules: ProjectLivestockWorkRule[];
  proposals: LivestockWorkProposal[];

  /**
   * Apply one generation run (rules + dated instances) for a project via
   * `diffWorkPlan`. Inserts new keys as `proposed`; refreshes still-proposed
   * rows (idempotent — unchanged hash keeps the same reference); drops keys
   * that left the horizon; NEVER resurrects dismissed rows; NEVER mutates
   * confirmed rows — flags them `needsReview` instead. No spine writes.
   */
  applyGeneration: (
    projectId: string,
    generation: {
      rules: LivestockWorkRule[];
      instances: LivestockWorkInstance[];
    },
  ) => void;

  /** Operator pre-confirmation edit (date / carer). Proposed rows only. */
  editProposal: (
    projectId: string,
    instanceKey: string,
    edits: LivestockWorkProposalEdits,
  ) => void;

  /**
   * THE ONLY SPINE WRITER in the livestock work-plan layer (sovereign
   * steward — an explicit operator action). Builds one WorkItem
   * (id `lvw__<key>`, source 'livestock-plan') from the proposal +
   * operator edits and hands it to `useWorkItemStore.addItem`. Idempotent:
   * an already-confirmed proposal is a no-op; if the spine row already
   * exists (e.g. restore-after-cancel re-confirm) it is reactivated to
   * 'todo' instead of duplicated.
   */
  confirmProposal: (projectId: string, instanceKey: string) => void;
  /** Confirm every `proposed` row for the project (operator bulk action). */
  confirmAll: (projectId: string) => void;
  /** Proposed → dismissed. Dismissed rows are never re-proposed. */
  dismissProposal: (projectId: string, instanceKey: string) => void;
  /** Dismissed → proposed (operator changed their mind). */
  restoreProposal: (projectId: string, instanceKey: string) => void;

  /**
   * Resolve a post-confirmation regeneration flag:
   *  - 'accept-update' (changed only): patch the confirmed spine row to the
   *    regenerated instance and adopt it on the proposal.
   *  - 'keep-mine': clear the flag and suppress the SAME condition from
   *    re-flagging on future regenerations.
   *  - 'cancel-work': cancel the spine row (status 'cancelled', audit row
   *    retained) and dismiss the proposal.
   */
  resolveReview: (
    projectId: string,
    instanceKey: string,
    resolution: LivestockWorkReviewResolution,
  ) => void;

  /**
   * Returns freshly-allocated arrays. **Do NOT call inside a Zustand
   * selector** — subscribe to `state.proposals` raw and derive in `useMemo`.
   * See: wiki/decisions/2026-04-26-zustand-selector-stability.md
   */
  getProjectProposals: (projectId: string) => LivestockWorkProposal[];
  getProjectRules: (projectId: string) => ProjectLivestockWorkRule[];
}

const now = () => new Date().toISOString();

const proposalIdFor = (instanceKey: string) => `lwp-${instanceKey}`;
const workItemIdFor = (instanceKey: string) => `lvw__${instanceKey}`;

/**
 * Build the spine row for a confirmed proposal. Carries the full required
 * WorkItem field set (mirrors `rotationSequenceSpineSync`), the livestock-
 * plan provenance triple, and the VERBATIM scopeNotes into `notes`.
 */
function buildWorkItem(p: LivestockWorkProposal): WorkItem {
  const inst = p.instance;
  const dueDate = p.editedFields?.dueDate ?? inst.dueDate;
  const carer = p.editedFields?.carer ?? inst.suggestedCarer;
  // detail first, then scopeNotes as an intact block — the scopeNotes
  // string itself is never altered (verbatim Amanah covenant).
  const notes = [inst.detail, inst.scopeNotes]
    .filter((s): s is string => Boolean(s))
    .join('\n\n');
  const stamp = now();
  return {
    id: workItemIdFor(inst.key),
    projectId: p.projectId,
    source: 'livestock-plan',
    overridden: false,
    generatedFromLivestockPlan: inst.key,
    ...(inst.sourceProtocolId
      ? { sourceProtocolId: inst.sourceProtocolId }
      : {}),
    ...(inst.sourceObjectiveId
      ? { sourceObjectiveId: inst.sourceObjectiveId }
      : {}),
    createdAt: stamp,
    updatedAt: stamp,
    title: inst.title,
    phaseId: null,
    status: 'todo',
    doneAt: null,
    dependsOn: [],
    dependsOnAuto: [],
    precedesAuto: [],
    scheduledStart: dueDate,
    scheduledEnd: inst.windowEnd ?? dueDate,
    materialsAuto: [],
    equipmentRequiredAuto: [],
    ...(inst.paddockId ? { linkedFeatureId: inst.paddockId } : {}),
    ...(carer ? { who: carer } : {}),
    ...(inst.species ? { species: inst.species } : {}),
    notes,
  };
}

/** Confirm one proposal in place; returns the updated proposal (or the
 * original if it was not confirmable). Performs the single spine write. */
function confirmOne(p: LivestockWorkProposal): LivestockWorkProposal {
  if (p.status !== 'proposed') return p;
  const spine = useWorkItemStore.getState();
  const id = workItemIdFor(p.instance.key);
  const existing = spine.items.find((it) => it.id === id);
  if (existing) {
    // Restore-after-cancel re-confirm: reactivate rather than duplicate.
    if (existing.status === 'cancelled') spine.setStatus(id, 'todo');
  } else {
    spine.addItem(buildWorkItem(p));
  }
  return {
    ...p,
    status: 'confirmed',
    confirmedWorkItemId: id,
    updatedAt: now(),
  };
}

export const useLivestockWorkPlanStore = create<LivestockWorkPlanState>()(
  persist(
    (set, get) => ({
      rules: [],
      proposals: [],

      applyGeneration: (projectId, generation) =>
        set((s) => {
          const mine = s.proposals.filter((p) => p.projectId === projectId);
          const others = s.proposals.filter((p) => p.projectId !== projectId);
          const byKey = new Map(mine.map((p) => [p.instance.key, p]));
          const prior: WorkPlanEntry[] = mine.map((p) => ({
            key: p.instance.key,
            status: p.status,
            inputsHash: p.instance.inputsHash,
          }));
          const diff = diffWorkPlan(prior, generation.instances);

          const stamp = now();
          const next: LivestockWorkProposal[] = [];

          for (const inst of diff.insert) {
            next.push({
              id: proposalIdFor(inst.key),
              projectId,
              instance: inst,
              status: 'proposed',
              createdAt: stamp,
              updatedAt: stamp,
            });
          }
          for (const inst of diff.overwrite) {
            const p = byKey.get(inst.key)!;
            // Idempotent: unchanged content keeps the same reference
            // (no updatedAt churn on every horizon roll).
            next.push(
              p.instance.inputsHash === inst.inputsHash
                ? p
                : { ...p, instance: inst, updatedAt: stamp },
            );
          }
          for (const key of diff.keepDismissed) next.push(byKey.get(key)!);
          for (const key of diff.untouchedConfirmed) {
            const p = byKey.get(key)!;
            // A stale flag clears itself once the generation matches again.
            next.push(
              p.needsReview ? { ...p, needsReview: undefined, updatedAt: stamp } : p,
            );
          }
          for (const review of diff.needsReview) {
            const p = byKey.get(review.key)!;
            const condition = review.next?.inputsHash ?? 'orphaned';
            if (p.suppressedReviewFor === condition) {
              next.push(p); // operator already declined this exact change
              continue;
            }
            const flag: LivestockWorkProposalReview = {
              reason: review.reason,
              ...(review.next ? { next: review.next } : {}),
            };
            const same =
              p.needsReview?.reason === flag.reason &&
              p.needsReview?.next?.inputsHash === flag.next?.inputsHash;
            next.push(same ? p : { ...p, needsReview: flag, updatedAt: stamp });
          }
          // diff.remove rows are simply not carried forward.

          // Rules: replace this project's set (reference-stable when the
          // key+hash sequence is unchanged).
          const myRules = s.rules.filter((r) => r.projectId === projectId);
          const incomingRules: ProjectLivestockWorkRule[] = generation.rules.map(
            (r) => ({ ...r, projectId }),
          );
          const rulesSame =
            myRules.length === incomingRules.length &&
            myRules.every(
              (r, i) =>
                r.key === incomingRules[i]!.key &&
                r.inputsHash === incomingRules[i]!.inputsHash,
            );
          const rules = rulesSame
            ? s.rules
            : [
                ...s.rules.filter((r) => r.projectId !== projectId),
                ...incomingRules,
              ];

          return { proposals: [...others, ...next], rules };
        }),

      editProposal: (projectId, instanceKey, edits) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.projectId === projectId &&
            p.instance.key === instanceKey &&
            p.status === 'proposed'
              ? {
                  ...p,
                  editedFields: { ...p.editedFields, ...edits },
                  updatedAt: now(),
                }
              : p,
          ),
        })),

      confirmProposal: (projectId, instanceKey) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.projectId === projectId && p.instance.key === instanceKey
              ? confirmOne(p)
              : p,
          ),
        })),

      confirmAll: (projectId) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.projectId === projectId && p.status === 'proposed'
              ? confirmOne(p)
              : p,
          ),
        })),

      dismissProposal: (projectId, instanceKey) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.projectId === projectId &&
            p.instance.key === instanceKey &&
            p.status === 'proposed'
              ? { ...p, status: 'dismissed', updatedAt: now() }
              : p,
          ),
        })),

      restoreProposal: (projectId, instanceKey) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.projectId === projectId &&
            p.instance.key === instanceKey &&
            p.status === 'dismissed'
              ? { ...p, status: 'proposed', updatedAt: now() }
              : p,
          ),
        })),

      resolveReview: (projectId, instanceKey, resolution) =>
        set((s) => ({
          proposals: s.proposals.map((p) => {
            if (
              p.projectId !== projectId ||
              p.instance.key !== instanceKey ||
              !p.needsReview
            ) {
              return p;
            }
            const review = p.needsReview;
            const spine = useWorkItemStore.getState();

            if (resolution === 'accept-update') {
              if (!review.next) return p; // orphaned has nothing to accept
              const inst = review.next;
              if (p.confirmedWorkItemId) {
                const notes = [inst.detail, inst.scopeNotes]
                  .filter((str): str is string => Boolean(str))
                  .join('\n\n');
                spine.updateItem(p.confirmedWorkItemId, {
                  title: inst.title,
                  scheduledStart: inst.dueDate,
                  scheduledEnd: inst.windowEnd ?? inst.dueDate,
                  notes,
                  ...(inst.suggestedCarer ? { who: inst.suggestedCarer } : {}),
                  ...(inst.species ? { species: inst.species } : {}),
                  ...(inst.paddockId
                    ? { linkedFeatureId: inst.paddockId }
                    : {}),
                  ...(inst.sourceProtocolId
                    ? { sourceProtocolId: inst.sourceProtocolId }
                    : {}),
                  ...(inst.sourceObjectiveId
                    ? { sourceObjectiveId: inst.sourceObjectiveId }
                    : {}),
                });
              }
              return {
                ...p,
                instance: inst,
                needsReview: undefined,
                suppressedReviewFor: undefined,
                updatedAt: now(),
              };
            }

            if (resolution === 'keep-mine') {
              return {
                ...p,
                needsReview: undefined,
                suppressedReviewFor: review.next?.inputsHash ?? 'orphaned',
                updatedAt: now(),
              };
            }

            // 'cancel-work' — cancel the spine row (kept for audit) and
            // dismiss the proposal so it never re-proposes.
            if (p.confirmedWorkItemId) {
              spine.setStatus(p.confirmedWorkItemId, 'cancelled');
            }
            return {
              ...p,
              status: 'dismissed',
              needsReview: undefined,
              updatedAt: now(),
            };
          }),
        })),

      getProjectProposals: (projectId) =>
        get().proposals.filter((p) => p.projectId === projectId),
      getProjectRules: (projectId) =>
        get().rules.filter((r) => r.projectId === projectId),
    }),
    {
      name: 'ogden-livestock-work-plan',
      // IndexedDB backend, mirroring the spine it feeds (workItemStore):
      // a 90-day rolling horizon × several rules per project is exactly the
      // proposal volume that would crowd the localStorage origin cap.
      storage: idbPersistStorage,
      version: 1,
      partialize: (state) => ({
        rules: state.rules,
        proposals: state.proposals,
      }),
    },
  ),
);

rehydrateWithLogging(useLivestockWorkPlanStore);
