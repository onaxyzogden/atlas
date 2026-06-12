/**
 * createWorkPlanStore — domain-neutral factory for a work-plan PROPOSAL layer.
 *
 * Lifted VERBATIM from `livestockWorkPlanStore` (the original, livestock-only
 * implementation) so that ANY Plan-tier work generator (livestock husbandry,
 * community settlement cadence, …) can hold its compiled rules and dated
 * proposals in the SAME proposed / confirmed / dismissed lifecycle and reach
 * the WorkItem spine through the operator's `confirmProposal` ONLY.
 *
 * The covenant is preserved structurally, not by convention:
 *   - `confirmProposal` is the SOLE code path that writes the WorkItem spine
 *     (sovereign steward — an explicit operator action). No subscription,
 *     effect, or regeneration path writes the spine; there is deliberately
 *     NO bulk replace* writer.
 *   - `applyGeneration` → `diffWorkPlan` 8-row semantics: dismissed proposals
 *     are NEVER resurrected; confirmed proposals are NEVER mutated by a
 *     regeneration — content changes / orphaning surface as `needsReview`.
 *   - `scopeNotes` (Amanah cautions, incl. bayʿ mā laysa ʿindak flags) flow
 *     VERBATIM from the instance into the confirmed WorkItem notes — never
 *     reworded, stripped, or summarised.
 *
 * Domain-specific concerns are injected through `WorkPlanStoreConfig`:
 *   - persist key, proposal-id prefix, spine work-item-id prefix
 *   - the WorkItem `source` tag and the boolean provenance field
 *   - `extraSpineFields` — domain columns to write onto the spine row (and
 *     into the accept-update patch), e.g. livestock species / paddock link.
 *
 * Persistence mirrors `workItemStore`: Zustand + `persist`, IndexedDB backend,
 * version 1, partialize to rules + proposals. Client-first, no DB migration.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import { diffWorkPlan } from '@ogden/shared';
import type { WorkItem, WorkItemSource, WorkPlanEntry } from '@ogden/shared';
import { useWorkItemStore } from './workItemStore.js';

/**
 * Minimal compiled-rule shape the lifecycle reads. Rules flow through
 * `diffWorkPlan`-adjacent reference-stability logic untouched, so only the
 * matching fields (`key` + `inputsHash`) are required structurally; concrete
 * stores extend this with their full rule type.
 */
export interface WorkPlanRuleBase {
  key: string;
  inputsHash: string;
}

/**
 * Minimal dated-instance shape the lifecycle reads. The spine-row builder
 * consumes these denormalised fields directly; domain-specific instance
 * columns (species, paddockId, …) are carried on the concrete instance type
 * and projected onto the spine via `config.extraSpineFields`.
 */
export interface WorkPlanInstanceBase {
  key: string;
  ruleKey: string;
  /** YYYY-MM-DD due date (window start for seasonal rules). */
  dueDate: string;
  /** YYYY-MM-DD last day of a seasonal window, when one applies. */
  windowEnd?: string;
  title: string;
  detail?: string;
  /** VERBATIM Amanah caution channel — never reworded. */
  scopeNotes?: string;
  sourceProtocolId?: string;
  sourceObjectiveId?: string;
  suggestedCarer?: string;
  /** Copied from the generating rule (change detection in diffWorkPlan). */
  inputsHash: string;
}

/** Operator edits applied to a proposal BEFORE confirmation. */
export interface WorkPlanProposalEdits {
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
export interface WorkPlanProposalReview<I extends WorkPlanInstanceBase> {
  reason: 'changed' | 'orphaned';
  next?: I;
}

export interface WorkPlanProposal<I extends WorkPlanInstanceBase> {
  /** Deterministic `<proposalIdPrefix><instanceKey>` — stable across regens. */
  id: string;
  projectId: string;
  /** The generated instance (denormalised, self-contained for review UI). */
  instance: I;
  status: 'proposed' | 'confirmed' | 'dismissed';
  /** Spine row id once confirmed. Kept for audit even if the work is later
   * cancelled via `resolveReview('cancel-work')`. */
  confirmedWorkItemId?: string;
  editedFields?: WorkPlanProposalEdits;
  needsReview?: WorkPlanProposalReview<I>;
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

/** A compiled rule, tagged with its project for the flat-array sync class. */
export type ProjectWorkPlanRule<R extends WorkPlanRuleBase> = R & {
  projectId: string;
};

export type WorkPlanReviewResolution =
  | 'accept-update'
  | 'keep-mine'
  | 'cancel-work';

export interface WorkPlanStoreState<
  R extends WorkPlanRuleBase,
  I extends WorkPlanInstanceBase,
> {
  rules: ProjectWorkPlanRule<R>[];
  proposals: WorkPlanProposal<I>[];

  /**
   * Apply one generation run (rules + dated instances) for a project via
   * `diffWorkPlan`. Inserts new keys as `proposed`; refreshes still-proposed
   * rows (idempotent — unchanged hash keeps the same reference); drops keys
   * that left the horizon; NEVER resurrects dismissed rows; NEVER mutates
   * confirmed rows — flags them `needsReview` instead. No spine writes.
   */
  applyGeneration: (
    projectId: string,
    generation: { rules: R[]; instances: I[] },
  ) => void;

  /** Operator pre-confirmation edit (date / carer). Proposed rows only. */
  editProposal: (
    projectId: string,
    instanceKey: string,
    edits: WorkPlanProposalEdits,
  ) => void;

  /**
   * THE ONLY SPINE WRITER (sovereign steward — an explicit operator action).
   * Builds one WorkItem from the proposal + operator edits and hands it to
   * `useWorkItemStore.addItem`. Idempotent: an already-confirmed proposal is
   * a no-op; if the spine row already exists (e.g. restore-after-cancel
   * re-confirm) it is reactivated to 'todo' instead of duplicated.
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
    resolution: WorkPlanReviewResolution,
  ) => void;

  /**
   * Returns freshly-allocated arrays. **Do NOT call inside a Zustand
   * selector** — subscribe to `state.proposals` raw and derive in `useMemo`.
   * See: wiki/decisions/2026-04-26-zustand-selector-stability.md
   */
  getProjectProposals: (projectId: string) => WorkPlanProposal<I>[];
  getProjectRules: (projectId: string) => ProjectWorkPlanRule<R>[];
}

/**
 * Domain wiring for a concrete work-plan store. Everything livestock-specific
 * in the original store is expressed here so the lifecycle stays generic.
 */
export interface WorkPlanStoreConfig<
  R extends WorkPlanRuleBase,
  I extends WorkPlanInstanceBase,
> {
  /** Zustand persist key (IndexedDB backend). */
  persistName: string;
  /** Deterministic proposal-id prefix, e.g. `'lwp-'`. */
  proposalIdPrefix: string;
  /** Spine work-item-id prefix; spine id = `${workItemIdPrefix}${key}`. */
  workItemIdPrefix: string;
  /** WorkItem `source` tag for every spine row this store writes. */
  source: WorkItemSource;
  /**
   * Provenance field name set on the spine row. Its VALUE is the instance
   * key (a stable string the diff layer matches across regenerations), not
   * a bare boolean — lifted verbatim from the livestock store.
   */
  provenanceField: string;
  /**
   * Domain columns to project onto the spine row (and the accept-update
   * patch). Receives the instance and the operator edits; returns the extra
   * field map (omit keys whose source value is absent — matches the original
   * conditional spreads exactly).
   */
  extraSpineFields?: (
    instance: I,
    edited: WorkPlanProposalEdits | undefined,
  ) => Record<string, unknown>;
}

const now = () => new Date().toISOString();

export function createWorkPlanStore<
  R extends WorkPlanRuleBase,
  I extends WorkPlanInstanceBase,
>(config: WorkPlanStoreConfig<R, I>) {
  const {
    persistName,
    proposalIdPrefix,
    workItemIdPrefix,
    source,
    provenanceField,
    extraSpineFields,
  } = config;

  const proposalIdFor = (instanceKey: string) =>
    `${proposalIdPrefix}${instanceKey}`;
  const workItemIdFor = (instanceKey: string) =>
    `${workItemIdPrefix}${instanceKey}`;

  /**
   * Build the spine row for a confirmed proposal. Carries the full required
   * WorkItem field set (mirrors `rotationSequenceSpineSync`), the work-plan
   * provenance triple, and the VERBATIM scopeNotes into `notes`.
   */
  function buildWorkItem(p: WorkPlanProposal<I>): WorkItem {
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
      source,
      overridden: false,
      // Provenance: the instance key (NOT a bare boolean) — the diff layer
      // recognises confirmed rows by this stable key across regenerations.
      // (Lifted verbatim from the livestock store, whose pinning suite
      // asserts the spine row carries the instance key here.)
      [provenanceField]: inst.key,
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
      ...(carer ? { who: carer } : {}),
      ...(extraSpineFields?.(inst, p.editedFields) ?? {}),
      notes,
    } as WorkItem;
  }

  /** Confirm one proposal in place; returns the updated proposal (or the
   * original if it was not confirmable). Performs the single spine write. */
  function confirmOne(p: WorkPlanProposal<I>): WorkPlanProposal<I> {
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

  return create<WorkPlanStoreState<R, I>>()(
    persist(
      (set, get) => ({
        rules: [],
        proposals: [],

        applyGeneration: (projectId, generation) =>
          set((s) => {
            const mine = s.proposals.filter((p) => p.projectId === projectId);
            const others = s.proposals.filter(
              (p) => p.projectId !== projectId,
            );
            const byKey = new Map(mine.map((p) => [p.instance.key, p]));
            const prior: WorkPlanEntry[] = mine.map((p) => ({
              key: p.instance.key,
              status: p.status,
              inputsHash: p.instance.inputsHash,
            }));
            const diff = diffWorkPlan(prior, generation.instances);

            const stamp = now();
            const next: WorkPlanProposal<I>[] = [];

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
                p.needsReview
                  ? { ...p, needsReview: undefined, updatedAt: stamp }
                  : p,
              );
            }
            for (const review of diff.needsReview) {
              const p = byKey.get(review.key)!;
              const condition = review.next?.inputsHash ?? 'orphaned';
              if (p.suppressedReviewFor === condition) {
                next.push(p); // operator already declined this exact change
                continue;
              }
              const flag: WorkPlanProposalReview<I> = {
                reason: review.reason,
                ...(review.next ? { next: review.next } : {}),
              };
              const same =
                p.needsReview?.reason === flag.reason &&
                p.needsReview?.next?.inputsHash === flag.next?.inputsHash;
              next.push(
                same ? p : { ...p, needsReview: flag, updatedAt: stamp },
              );
            }
            // diff.remove rows are simply not carried forward.

            // Rules: replace this project's set (reference-stable when the
            // key+hash sequence is unchanged).
            const myRules = s.rules.filter((r) => r.projectId === projectId);
            const incomingRules: ProjectWorkPlanRule<R>[] =
              generation.rules.map((r) => ({ ...r, projectId }));
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
                    ...(inst.suggestedCarer
                      ? { who: inst.suggestedCarer }
                      : {}),
                    ...(extraSpineFields?.(inst, undefined) ?? {}),
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
        name: persistName,
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
}
