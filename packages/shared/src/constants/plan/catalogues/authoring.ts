// catalogues/authoring.ts
//
// Tiny authoring helpers for the per-type objective catalogues (OLOS
// Project-Type + Secondary-Layer Spec v1.2). They fill the defaulted
// PlanStratumObjectiveSchema / PlanDecisionChecklistItemSchema fields
// (prerequisiteObjectiveIds, defaultOverlayBundle, outputKind, feedsInto,
// optional) so the catalogue files read as faithful transcriptions of the
// source docs rather than walls of boilerplate.
//
// These produce the schema OUTPUT type (defaults already applied); a
// catalogue conformance test (re)parses every produced object through the
// Zod schema to guarantee runtime validity.

import type {
  AnswerSpec,
  DecisionGroup,
  PlanDecisionChecklistItem,
  PlanObjectiveSource,
  PlanStratumId,
  PlanStratumObjective,
  PatchRecord,
} from '../../../schemas/plan/planStratumObjective.schema.js';
import type {
  ProjectTypeId,
  SecondaryClass,
} from '../../../schemas/plan/projectTypeTaxonomy.schema.js';

/**
 * Build a checklist item. None of the transcribed RegenFarm / Residential
 * items are authored as optional or methodology, so the helper takes just
 * id + label and applies the schema defaults (feedsInto: [], optional: false).
 */
export function ck(id: string, label: string): PlanDecisionChecklistItem {
  return { id, label, feedsInto: [], optional: false };
}

/**
 * Like `ck`, but attaches an `answerSpec` marking this item's answer as already
 * captured upstream (wizard / vision / team). The Act tier shell then renders a
 * typed, read-only PREFILLED recap of the prior answer (in its original control
 * style) with an "Edit in Plan" link, and the item auto-satisfies from the
 * source data. Authoring stays terse; the schema field is optional so plain
 * `ck(...)` items are unaffected.
 */
export function ckA(
  id: string,
  label: string,
  answerSpec: AnswerSpec,
): PlanDecisionChecklistItem {
  return { id, label, feedsInto: [], optional: false, answerSpec };
}

/**
 * Build a Decision Group (Decision Groups Reference v1.0). `label` + the
 * `observeFeeds` labels are transcribed VERBATIM from the reference doc;
 * `itemIds` membership is AUTHORED under the 2026-05-31 operator override (the
 * doc gives only per-group item counts). `sourceSecondaryId` is left null here;
 * for secondary-injected groups the resolver stamps it from the patch's
 * secondaryTypeId. The doc's `-` (no feed) is encoded as `[]`; its `Multiple`
 * sentinel is passed through literally.
 */
export function dg(
  id: string,
  label: string,
  itemIds: string[],
  observeFeeds: string[] = [],
): DecisionGroup {
  return { id, label, itemIds, observeFeeds, sourceSecondaryId: null };
}

export interface ObjectiveInput {
  id: string;
  stratumId: PlanStratumId;
  title: string;
  /**
   * Card-tile display label: the core noun phrase with the leading framing
   * phrase / imperative verb stripped. Optional; the card falls back to
   * `title`. Full `title` stays the source of truth for the detail header,
   * aria-label, spine, and search.
   */
  shortTitle?: string;
  focusedQuestion: string;
  checklist: PlanDecisionChecklistItem[];
  completionGate: string;
  actHandoff: string;
  /** Which layer emitted this objective. */
  source: PlanObjectiveSource;
  /** Authoring Standards v1.4 reference code (e.g. "U-S1.1", "RF-S1.4"). */
  ref: string;
  /** Set for primary / secondary objectives; omit for universal. */
  sourceTypeId?: ProjectTypeId;
  /** Set for secondary-sourced objectives (additive | modifying). */
  secondaryClass?: SecondaryClass;
  /** Free-text scope note transcribed from the catalogue (doc "Note" rows). */
  scopeNotes?: string;
  /**
   * Decision groups for this objective (Decision Groups Reference v1.0). Omit
   * for not-yet-encoded objectives; the helper defaults to `[]`.
   */
  decisionGroups?: DecisionGroup[];
}

/**
 * Build a PlanStratumObjective with the defaulted shell fields applied. Optional
 * provenance fields are only set when supplied so the object stays clean
 * (absent === not applicable), matching how the static skeleton reads.
 */
export function obj(input: ObjectiveInput): PlanStratumObjective {
  return {
    id: input.id,
    stratumId: input.stratumId,
    title: input.title,
    ...(input.shortTitle ? { shortTitle: input.shortTitle } : {}),
    focusedQuestion: input.focusedQuestion,
    prerequisiteObjectiveIds: [],
    defaultOverlayBundle: [],
    checklist: input.checklist,
    decisionGroups: input.decisionGroups ?? [],
    outputKind: 'plan-decision-record',
    source: input.source,
    ref: input.ref,
    completionGate: input.completionGate,
    actHandoff: input.actHandoff,
    ...(input.sourceTypeId ? { sourceTypeId: input.sourceTypeId } : {}),
    ...(input.secondaryClass ? { secondaryClass: input.secondaryClass } : {}),
    ...(input.scopeNotes ? { scopeNotes: input.scopeNotes } : {}),
  };
}

export interface PatchInput {
  secondaryTypeId: ProjectTypeId;
  targetObjectiveId: string;
  ref: string;
  injectedItems: PlanDecisionChecklistItem[];
  /**
   * Decision groups injected onto the target objective. Authored with `dg(...)`
   * (sourceSecondaryId null); the resolver stamps secondaryTypeId at apply time.
   */
  injectedGroups?: DecisionGroup[];
  completionGateAmendment?: string;
  scopeNote?: string;
}

/**
 * Build a PatchRecord. The resolver stamps `expandedBySecondaryId` onto each
 * injected item from `secondaryTypeId` at apply time, so injected items are
 * authored with plain `ck(id, label)`.
 */
export function patch(input: PatchInput): PatchRecord {
  return {
    secondaryTypeId: input.secondaryTypeId,
    targetObjectiveId: input.targetObjectiveId,
    ref: input.ref,
    injectedItems: input.injectedItems,
    injectedGroups: input.injectedGroups ?? [],
    ...(input.completionGateAmendment
      ? { completionGateAmendment: input.completionGateAmendment }
      : {}),
    ...(input.scopeNote ? { scopeNote: input.scopeNote } : {}),
  };
}
