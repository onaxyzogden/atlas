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
  ObjectiveFormulaBinding,
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
 * Seven-tier spine gate. Maps each stratum to the prerequisite objective ids
 * that gate EVERY objective authored in that stratum (auto-applied by `obj()`
 * unless a per-objective override is supplied).
 *
 * CRITICAL INVARIANT — values must reference ONLY universal objective ids
 * (the always-present backbone). The resolver (`resolveProjectObjectives`)
 * always includes universal + primary objectives but DROPS incompatible
 * secondary objectives. `computeObjectiveStatus` treats a prereq whose id is
 * absent from the resolved set as not-`complete`, which silently locks the
 * objective FOREVER with no diagnostic. Referencing only universal ids
 * guarantees no dangling ref for any primary+secondary combo. The
 * `spineGate.conformance.test.ts` resolver test enforces this.
 *
 * Each stratum gates on the PRIOR stratum's universal reads/decisions, so the
 * narrated "can't design planting (S5) before zones + terrain (S4←S3←S2)" holds
 * transitively. S1 has no prerequisites (it is the entry tier).
 */
export const STRATUM_PREREQS: Record<PlanStratumId, string[]> = {
  's1-project-foundation': [],
  's2-land-reading': ['s1-vision', 's1-boundaries', 's1-stakeholders'],
  's3-systems-reading': [
    's2-terrain',
    's2-climate',
    's2-ecology',
    's2-infrastructure',
  ],
  's4-foundation-decisions': ['s3-hydrology', 's3-soil'],
  's5-system-design': ['s4-direction', 's4-water-strategy', 's4-zones'],
  's6-integration-design': [
    's5-access',
    's5-water-infrastructure',
    's5-soil-improvement',
  ],
  's7-phasing-resourcing': ['s6-monitoring'],
};

/**
 * Build a checklist item. None of the transcribed RegenFarm / Residential
 * items are authored as optional or methodology, so the helper takes just
 * id + label and applies the schema defaults (feedsInto: [], optional: false).
 */
export function ck(
  id: string,
  label: string,
  opts: { feedHint?: string; feedNote?: string } = {},
): PlanDecisionChecklistItem {
  return {
    id,
    label,
    feedsInto: [],
    optional: false,
    ...(opts.feedHint ? { feedHint: opts.feedHint } : {}),
    ...(opts.feedNote ? { feedNote: opts.feedNote } : {}),
  };
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
 * Like `ck`, but attaches a `formulaBinding` linking this item to a live
 * livestock/grazing formula. The Plan ObjectiveDetailPanel mounts the matching
 * result widget (resolved app-side via formulaCatalog), and when the binding's
 * `satisfiesWhenComputed` is set a usable result auto-satisfies the item. The
 * schema field is optional, so plain `ck(...)` items are unaffected.
 */
export function ckF(
  id: string,
  label: string,
  formulaBinding: ObjectiveFormulaBinding,
): PlanDecisionChecklistItem {
  return { id, label, feedsInto: [], optional: false, formulaBinding };
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
  /**
   * Prerequisite objective ids gating this objective. OMIT to inherit the
   * stratum's spine gate (`STRATUM_PREREQS[stratumId]`) — the default for
   * essentially every catalogue objective. Pass an explicit `[]` to opt OUT
   * of the gate (entry-tier or deliberately ungated objectives). Any custom
   * list MUST reference only ever-present (universal) objective ids, or the
   * objective will be silently locked forever for project types that drop the
   * referenced secondary — see the `STRATUM_PREREQS` invariant note above.
   */
  prerequisiteObjectiveIds?: string[];
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
  /**
   * Legacy module-card sectionId surfaced in the ObjectiveDetailPanel REFERENCE
   * section (DetailsExpander). Catalogue objectives omit it by default (they
   * lean on overlay bundles); set it when a specific legacy card is the right
   * reference for the objective — e.g. `s4-zones` -> `plan-zone-overview` so the
   * zones objective surfaces the Z0-Z5 overview + validation card.
   */
  legacyCardSectionId?: string;
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
    prerequisiteObjectiveIds:
      input.prerequisiteObjectiveIds ?? [...STRATUM_PREREQS[input.stratumId]],
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
    ...(input.legacyCardSectionId
      ? { legacyCardSectionId: input.legacyCardSectionId }
      : {}),
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
