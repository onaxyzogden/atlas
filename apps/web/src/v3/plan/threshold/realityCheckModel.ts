/**
 * realityCheckModel -- the single source of Threshold-1 ("The Reality Check")
 * logic + copy. Pure / deterministic / no React / no I/O so it is safe in
 * render and unit-testable without a DOM.
 *
 * Threshold 1 is the structural hinge between Mode 2 (Reception) and Mode 4
 * (Design): after the 11 survey objectives (Tier 1 = six `s2-*`, Tier 2 = five
 * `s3-*`) the steward turns back to the Tier-0 declaration and measures each
 * declared intent element against what the land actually said. Two phases:
 *   - Phase 1 (Review): read the assembled evidence, re-organised by six
 *     evidence strands. No decisions.
 *   - Phase 2 (Direction): classify each intent element feasible / conditional
 *     / deferred / released, then compose + approve a Planning Direction
 *     Statement that becomes the mandate for all Mode-4 work.
 *
 * VALUE TYPES (RealityCheckStatus / ElementClassification / StrandFinding) live
 * HERE so the persisted `realityCheckStore` depends on this pure model -- never
 * the reverse.
 *
 * AMANAH: all OLOS-authored copy in this file is covenant-clean -- the spec's
 * "Commercial CSA" example is deliberately NOT transcribed. `detectCsaLikeText`
 * raises a NON-BLOCKING advisory on steward input that resembles advance-sale /
 * subscription / CSA / yield-share framing, naming the permitted capital
 * channels. It never blocks a save and never censors steward text.
 */

import type { IntentElement, IntentElementType } from './intentElements';
import { detectCovenantBanned } from '@ogden/shared';

// ---------------------------------------------------------------------------
// Classification vocabulary (PIN EXACTLY -- spec + mockup)
// ---------------------------------------------------------------------------

export type RealityCheckStatus = 'feasible' | 'conditional' | 'deferred' | 'released';

/** The steward's recorded decision for one intent element. */
export interface ElementClassification {
  status: RealityCheckStatus;
  /** Required-in-spirit for `conditional`: the condition Mode 4 must satisfy. */
  condition?: string;
  /** Free note -- the release rationale for `released`, or any annotation. */
  note?: string;
  /** Inline gap flag: a supplementary observation raised at the threshold. */
  gapNote?: string;
}

/** Per-strand stance the steward may record while reading Phase 1. */
export type StrandStance = 'confirmed' | 'mixed' | 'challenging';

export interface StrandFinding {
  stance?: StrandStance;
  note?: string;
}

// Type-gating table (spec lines 73-77). Non-negotiables CANNOT be conditional
// or deferred -- if a hard constraint cannot be met, the project itself is
// reconsidered, so the only honest answers are "supported" or "released".
const STATUS_OPTIONS: Readonly<Record<IntentElementType, readonly RealityCheckStatus[]>> = {
  'non-negotiable': ['feasible', 'released'],
  committed: ['feasible', 'conditional', 'deferred', 'released'],
  aspirational: ['feasible', 'conditional', 'deferred', 'released'],
};

/** The classifications permitted for an element of the given type. */
export function statusOptionsForType(
  type: IntentElementType,
): readonly RealityCheckStatus[] {
  return STATUS_OPTIONS[type];
}

/**
 * Whether releasing an element of this type demands an explicit "the project
 * can proceed without it" confirmation. True for `committed` (spec line 75).
 * (Releasing a `non-negotiable` is graver still -- "the project itself must be
 * reconsidered" -- and the type description says so; the Stage-C surface may
 * add its own existential confirm. Aspirational elements release freely.)
 */
export function releaseNeedsConfirm(type: IntentElementType): boolean {
  return type === 'committed';
}

export const STATUS_META: Readonly<
  Record<RealityCheckStatus, { label: string; description: string }>
> = {
  feasible: {
    label: 'Feasible',
    description: 'The evidence supports this element proceeding as declared. No modification needed.',
  },
  conditional: {
    label: 'Conditional',
    description:
      'The evidence raises a concern, but the element can proceed once a specific condition is met. Name the condition; Mode 4 Design must satisfy it before the element is activated.',
  },
  deferred: {
    label: 'Deferred',
    description:
      'This element remains in the long-term vision but is not part of this planning cycle. It does not constrain current design decisions; it is retained for a future cycle.',
  },
  released: {
    label: 'Released',
    description:
      "The evidence shows this element is not supportable on this land in any viable form. Releasing it is not failure -- it is an honest response to what the land has said.",
  },
};

export const INTENT_TYPE_META: Readonly<
  Record<IntentElementType, { label: string; description: string }>
> = {
  'non-negotiable': {
    label: 'Non-negotiable',
    description:
      'Declared as a hard constraint in Stratum 1. Can only be Feasible or Released -- if it cannot be met, the project itself must be reconsidered.',
  },
  committed: {
    label: 'Committed',
    description:
      'Core to the project intent. Can be Feasible, Conditional, or Deferred. If Released, confirm the project can proceed without it.',
  },
  aspirational: {
    label: 'Aspirational',
    description:
      'Held lightly from the start. Can receive any classification; Deferred is the most common outcome at Threshold 1.',
  },
};

// ---------------------------------------------------------------------------
// Surface copy (amber/gold register; CSA example omitted per Amanah)
// ---------------------------------------------------------------------------

export const REALITY_CHECK_COPY = {
  /** Mode pill -- neither Mode 2 (Reception) nor Mode 4 (Design). */
  modeLabel: 'Threshold 1',
  title: 'The Reality Check',
  /** The one-line framing of the moment (spec line 13). */
  tagline: 'Where OLOS stops being about what you want and starts being about what this land can support.',
  phase1: {
    label: 'Review',
    heading: 'Read the land’s answer',
    blurb:
      'The evidence from all eleven surveys, re-organised by theme. Read how it speaks to each intent you declared. No decisions yet -- this is a reading surface.',
    proceedLabel: 'I have read the evidence -- proceed to Direction',
  },
  phase2: {
    label: 'Direction',
    heading: 'Decide what the land can support',
    blurb:
      'Classify each declared intent against the evidence. When every element is classified, compose and approve the Planning Direction Statement that becomes the mandate for all Mode-4 Design work.',
    approveLabel: 'Approve Planning Direction',
  },
  /** What Threshold 1 does NOT do (spec lines 120-128) -- a reassurance block. */
  notList: [
    'It does not design solutions to the problems the surveys found.',
    'It does not send you back to re-do survey work.',
    'It does not produce a task list or action plan.',
    'It does not judge your vision as good or bad.',
    'It does not stop the project from proceeding if every element is Conditional.',
  ],
} as const;

/** The configuration this restructure targets; the Planning Direction opener. */
export const DEFAULT_CONFIGURATION_LABEL =
  'residential regenerative farm with integrated silvopasture';

// ---------------------------------------------------------------------------
// Evidence strands (Phase 1) -- the 11 surveys re-organised by six themes
// ---------------------------------------------------------------------------

export type EvidenceStrandId =
  | 'water'
  | 'soil-fertility'
  | 'ecology-habitat'
  | 'infrastructure-access'
  | 'land-health'
  | 'landscape-context';

export interface EvidenceStrand {
  id: EvidenceStrandId;
  label: string;
  blurb: string;
}

/** The six strands, in spec order (line 39). */
export const EVIDENCE_STRANDS: readonly EvidenceStrand[] = [
  { id: 'water', label: 'Water', blurb: 'What the land holds, sheds, and can store.' },
  { id: 'soil-fertility', label: 'Soil & Fertility', blurb: 'What the ground is made of and what it can feed.' },
  { id: 'ecology-habitat', label: 'Ecology & Habitat', blurb: 'What already lives here and the pressures on it.' },
  { id: 'infrastructure-access', label: 'Infrastructure & Access', blurb: 'What is built, reachable, and buildable.' },
  { id: 'land-health', label: 'Land Health', blurb: 'Where the land is degraded and where it is sound.' },
  { id: 'landscape-context', label: 'Landscape Context', blurb: 'How the surrounding landscape and climate shape this place.' },
];

/**
 * The 11 survey objective ids, in tier order. EDITORIAL CONSTANT pinned to the
 * shipped catalogue (Tier-1 = six `s2-*`; Tier-2 = five `s3-*`). The threshold
 * opens only after all 11 are complete.
 */
export const ALL_SURVEY_OBJECTIVE_IDS: readonly string[] = [
  // Tier 1 -- Land Reading (Stratum 2)
  's2-terrain',
  's2-climate',
  's2-ecology',
  's2-infrastructure',
  'rf-s2-land-health',
  'rf-s2-landscape-context',
  // Tier 2 -- Systems Reading (Stratum 3)
  's3-hydrology',
  's3-soil',
  'rf-s3-nutrient-cycling',
  'rf-s3-pest-pressure',
  'silv-sec-s3-stock-water',
];

/**
 * Which surveys speak to each strand. EDITORIAL CONSTANT -- each of the 11
 * surveys maps to exactly one strand (asserted in tests). Terrain folds into
 * Infrastructure & Access (it shapes buildability/access); climate folds into
 * Landscape Context (a landscape-scale read); pest pressure into Ecology.
 */
export const STRAND_SURVEY_MAP: Readonly<Record<EvidenceStrandId, readonly string[]>> = {
  water: ['s3-hydrology', 'silv-sec-s3-stock-water'],
  'soil-fertility': ['s3-soil', 'rf-s3-nutrient-cycling'],
  'ecology-habitat': ['s2-ecology', 'rf-s3-pest-pressure'],
  'infrastructure-access': ['s2-infrastructure', 's2-terrain'],
  'land-health': ['rf-s2-land-health'],
  'landscape-context': ['rf-s2-landscape-context', 's2-climate'],
};

/** The strand a survey objective belongs to, or undefined if unmapped. */
export function strandForSurvey(objectiveId: string): EvidenceStrandId | undefined {
  for (const strand of EVIDENCE_STRANDS) {
    if (STRAND_SURVEY_MAP[strand.id].includes(objectiveId)) return strand.id;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Strand evidence derivation (pure; the surface supplies resolved inputs)
// ---------------------------------------------------------------------------

/** One survey's resolved evidence, supplied by the Stage-C wiring layer. */
export interface StrandSurveyEvidence {
  objectiveId: string;
  /** Human survey name, e.g. "Water / hydrology". */
  label: string;
  /** Whether the survey objective is complete. */
  complete: boolean;
  /** Count of drawn survey records, when the survey has a map capture. */
  recordCount?: number;
}

export interface StrandEvidence {
  strand: EvidenceStrand;
  surveys: StrandSurveyEvidence[];
  stance?: StrandStance;
  note?: string;
  /** One-line derived summary of the strand's survey coverage. */
  summary: string;
}

/**
 * Re-organise per-survey evidence into the six strands, folding in the
 * steward's optional per-strand stance/note. Pure: callers resolve
 * `perSurvey` (objectiveId -> evidence) and `findings` (strandId -> finding).
 * A strand whose surveys are absent from `perSurvey` still appears (with an
 * empty survey list) so the reading surface is always complete.
 */
export function deriveStrandEvidence(
  perSurvey: Readonly<Record<string, StrandSurveyEvidence>>,
  findings: Readonly<Record<string, StrandFinding>> = {},
): StrandEvidence[] {
  return EVIDENCE_STRANDS.map((strand) => {
    const surveys = STRAND_SURVEY_MAP[strand.id]
      .map((id) => perSurvey[id])
      .filter((s): s is StrandSurveyEvidence => s != null);
    const total = STRAND_SURVEY_MAP[strand.id].length;
    const done = surveys.filter((s) => s.complete).length;
    const finding = findings[strand.id];
    return {
      strand,
      surveys,
      stance: finding?.stance,
      note: finding?.note,
      summary: `${done} of ${total} ${total === 1 ? 'survey' : 'surveys'} complete`,
    };
  });
}

// ---------------------------------------------------------------------------
// Phase completion + Planning Direction composition
// ---------------------------------------------------------------------------

/** Phase 2 is done when every element carries a classification. */
export function phase2Complete(
  elements: readonly IntentElement[],
  classifications: Readonly<Record<string, ElementClassification>>,
): boolean {
  if (elements.length === 0) return false;
  return elements.every((e) => classifications[e.id]?.status != null);
}

export interface PlanningDirectionInput {
  projectName: string;
  configurationLabel: string;
  elements: readonly IntentElement[];
  classifications: Readonly<Record<string, ElementClassification>>;
}

function joinTexts(elements: readonly IntentElement[]): string {
  return elements.map((e) => e.text).join('; ');
}

function lowerFirst(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

function stripTrailingPunctuation(s: string): string {
  return s.replace(/[.;\s]+$/, '');
}

/**
 * Compose the bounded Planning Direction Statement from the classified
 * elements (spec lines 81-95). Feasible -> commitments; Conditional ->
 * conditional commitments with their named conditions; Deferred -> retained
 * long-term intentions; Released -> formal releases with the steward's note.
 * Deterministic and order-stable (follows `elements` order within each group).
 */
export function composePlanningDirection(input: PlanningDirectionInput): string {
  const { elements, classifications } = input;
  const ofStatus = (s: RealityCheckStatus) =>
    elements.filter((e) => classifications[e.id]?.status === s);

  const feasible = ofStatus('feasible');
  const conditional = ofStatus('conditional');
  const deferred = ofStatus('deferred');
  const released = ofStatus('released');

  const name = input.projectName.trim() || 'This project';
  const config = input.configurationLabel.trim() || DEFAULT_CONFIGURATION_LABEL;

  const parts: string[] = [`${name} will proceed as a ${config}.`];

  if (feasible.length > 0) {
    parts.push(`Confirmed feasible: ${joinTexts(feasible)}.`);
  }

  for (const e of conditional) {
    const cond = classifications[e.id]?.condition?.trim();
    parts.push(
      cond
        ? `${e.text} will proceed conditional on ${lowerFirst(stripTrailingPunctuation(cond))}.`
        : `${e.text} will proceed conditional on a named condition being met.`,
    );
  }

  if (deferred.length > 0) {
    parts.push(
      `Retained as long-term intentions, deferred this cycle: ${joinTexts(deferred)}.`,
    );
  }

  for (const e of released) {
    const note =
      classifications[e.id]?.note?.trim() || classifications[e.id]?.gapNote?.trim();
    parts.push(
      note
        ? `${e.text} is released from the plan -- ${stripTrailingPunctuation(note)}.`
        : `${e.text} is released from the plan.`,
    );
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Amanah: non-blocking advisory on advance-sale / subscription / CSA framing
// ---------------------------------------------------------------------------

/**
 * True when steward free-text resembles the forbidden financial framing --
 * advance-sale / subscription / CSA / yield-share, and (since the 2026-07-03
 * deep audit) salam / advance-purchase / the riba family. Delegates to the
 * single shared covenant set (`@ogden/shared`) so this threshold advisory can
 * never drift from the seed-time capture gate and the catalogue / recipe guards.
 * Reused wherever steward free-text is entered at the threshold (intent text,
 * conditions, notes). Non-blocking: callers show `CSA_ADVISORY_COPY` beside the
 * input, never instead of it, and never censor the steward's text.
 */
export function detectCsaLikeText(text: string | null | undefined): boolean {
  return detectCovenantBanned(text);
}

/**
 * Informational ONLY -- shown beside (never instead of) the steward's input,
 * and never blocks a save. Names the permitted capital channels.
 */
export const CSA_ADVISORY_COPY = {
  title: 'A note on capital framing',
  body:
    'This wording resembles advance-sale, subscription, or investment financing, which this system does not use. Capital here flows through permitted channels -- charitable donation, restricted donation, qard hasan (interest-free loan), in-kind contribution, and sponsorship. This is an advisory only; your entry is saved exactly as written.',
} as const;

// ---------------------------------------------------------------------------
// Mode-4 soft gate + downstream registers (Stage D -- display-only)
// ---------------------------------------------------------------------------

/**
 * The four Mode-4 (Design) strata, in spine order. EDITORIAL CONSTANT pinned to
 * the `PLAN_STRATA` ordinals 4-7 (asserted in tests). The approved Planning
 * Direction is the mandate every Mode-4 objective proceeds from; the soft gate
 * surfaces on these strata until Threshold 1 is approved.
 *
 * CRITICAL: this is NEVER a hard prerequisite. `prerequisiteObjectiveIds` /
 * `STRATUM_PREREQS` are untouched; this constant only drives a display-only
 * banner (mirrors the A8 "Act Mandate" soft-gate precedent). Mode-4 strata stay
 * fully reachable whether or not Threshold 1 is approved.
 */
export const MODE_4_STRATUM_IDS: readonly string[] = [
  's4-foundation-decisions',
  's5-system-design',
  's6-integration-design',
  's7-phasing-resourcing',
];

/** Whether a stratum id is one of the four Mode-4 (Design) strata. */
export function isMode4Stratum(stratumId: string | null | undefined): boolean {
  return stratumId != null && MODE_4_STRATUM_IDS.includes(stratumId);
}

/** Derived state of the soft Mode-4 gate for one objective surface. */
export interface RealityCheckGateState {
  /** On a Mode-4 stratum (whether or not Threshold 1 is approved). */
  mode4: boolean;
  /** The Planning Direction has been approved (`approvedAt` present). */
  approved: boolean;
  /** TRUE iff on a Mode-4 stratum AND not yet approved -> show the amber gate. */
  pending: boolean;
}

/**
 * Pure derivation of the soft Mode-4 gate. NEVER blocks: callers render a banner
 * from this and nothing else. `pending` arms the amber "approve Threshold 1
 * first" reminder; `approved` (on a Mode-4 stratum) surfaces the direction
 * registers. Off a Mode-4 stratum, `mode4` is false and the banner renders null.
 */
export function realityCheckGateState(
  stratumId: string | null | undefined,
  approvedAt: number | null | undefined,
): RealityCheckGateState {
  const mode4 = isMode4Stratum(stratumId);
  const approved = approvedAt != null;
  return { mode4, approved, pending: mode4 && !approved };
}

/** One classified intent element paired with its recorded decision. */
export interface ClassifiedElement {
  element: IntentElement;
  classification: ElementClassification;
}

/** The classified elements grouped by status; each group is order-stable. */
export interface ClassificationGroups {
  feasible: ClassifiedElement[];
  conditional: ClassifiedElement[];
  deferred: ClassifiedElement[];
  released: ClassifiedElement[];
}

/**
 * Group classified elements by status for the display-only downstream registers
 * (Conditional design-requirements, Deferred long-term register, Released with
 * note). Unclassified elements are omitted; order follows `elements`.
 */
export function groupClassifications(
  elements: readonly IntentElement[],
  classifications: Readonly<Record<string, ElementClassification>>,
): ClassificationGroups {
  const groups: ClassificationGroups = {
    feasible: [],
    conditional: [],
    deferred: [],
    released: [],
  };
  for (const element of elements) {
    const classification = classifications[element.id];
    if (classification?.status == null) continue;
    groups[classification.status].push({ element, classification });
  }
  return groups;
}

/**
 * Copy for the Mode-4 soft-gate banner. Covenant-clean -- no advance-sale /
 * subscription / CSA / yield-share framing. Wording-pinned in tests.
 */
export const MODE4_GATE_COPY = {
  pending: {
    pill: 'Threshold 1',
    title: 'Planning Direction not yet approved',
    body: 'Mode 4 Design proceeds from the Planning Direction you approve at Threshold 1. You can work here, but the direction that grounds these design decisions is not set yet.',
    action: 'Open Threshold 1',
  },
  approved: {
    pill: 'Planning Direction',
    title: 'In effect from Threshold 1',
    body: 'These design decisions proceed from the Reality Check you approved. The register below is what Mode 4 carries forward.',
    action: 'Review Threshold 1',
    conditionalLabel: 'Conditions Mode 4 must satisfy',
    deferredLabel: 'Deferred to a later cycle',
    releasedLabel: 'Released from the plan',
    emptyConditional: 'No conditional requirements were recorded.',
  },
} as const;
