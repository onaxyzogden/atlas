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
  PlanDecisionChecklistItem,
  PlanObjectiveSource,
  PlanStratumId,
  PlanStratumObjective,
  PatchRecord,
} from '../../../schemas/plan/planTierObjective.schema.js';
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

export interface ObjectiveInput {
  id: string;
  stratumId: PlanStratumId;
  title: string;
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
    focusedQuestion: input.focusedQuestion,
    prerequisiteObjectiveIds: [],
    defaultOverlayBundle: [],
    checklist: input.checklist,
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
    ...(input.completionGateAmendment
      ? { completionGateAmendment: input.completionGateAmendment }
      : {}),
    ...(input.scopeNote ? { scopeNote: input.scopeNote } : {}),
  };
}
