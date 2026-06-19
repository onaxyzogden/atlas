/**
 * actMandateModel -- the single source of Threshold-3 ("The Act Mandate")
 * assembly + copy. Pure / deterministic / no React / no I/O / no store import,
 * so it is safe in render and unit-testable without a DOM. Mirrors
 * coherenceCheckModel.ts (the Threshold-2 template) and realityCheckModel.ts.
 *
 * Threshold 3 is the final Plan-stage surface, after `s7-phasing-resourcing`
 * (the terminal stratum). Every prior threshold is a SOFT checkpoint -- it shows
 * readiness and navigates but never blocks. Threshold 3 is the one place the
 * steward crosses from DESIGNING (Plan) into DOING (Act), and that crossing --
 * Begin Act -- is the only hard gate of the Plan stage.
 *
 * NOTHING IS DESIGNED OR AUDITED HERE. This is an assembly + ceremony. It
 * gathers, from records that already exist:
 *   - the resolved design's Act handoffs (each objective's `actHandoff`),
 *     grouped by stratum -- the inventory of what carries into Act;
 *   - the two prior threshold records as synthetic handoff packages: the T1
 *     Planning Direction (approved at the Reality Check) and the T2 Coherence
 *     Record (sealed at the Coherence Check);
 *   - three KEY DOCUMENTS that travel with the project: the Planning Direction
 *     Statement, the Coherence Record, and the FULL resolved integrated design.
 * It then reports an ADVISORY readiness (T1 approved, T2 sealed, Launch
 * Preparation complete). Readiness NEVER blocks -- Begin Act is always enabled
 * (operator decision); readiness is shown as advice only. There is NO audit
 * verdict and nothing here is recomputed from raw inputs -- the two synthetic
 * documents are READ from their stores, not derived.
 *
 * AMANAH: every OLOS-authored string in `ACT_MANDATE_COPY` is covenant-clean and
 * banned-term-scanned in test (no advance-sale / subscription / CSA / yield-share
 * / salam framing is ever authored). The free-text covenant guard
 * (`detectCsaLikeText`) lives on the concern fields in planConcernsStore;
 * nothing in this model accepts steward free-text.
 */

import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';

// ---------------------------------------------------------------------------
// The terminal stratum whose completion the readiness reads (doc Tier 6 --
// Launch Preparation). Pinned to the spine; `s7-phasing-resourcing` is the
// terminal stratum after the Tier-6 restructure.
// ---------------------------------------------------------------------------

export const LAUNCH_PREP_STRATUM_ID = 's7-phasing-resourcing';

// ---------------------------------------------------------------------------
// Structural sources for the two synthetic documents. These are STRUCTURAL
// (not the store modules) so the model never imports a store -> stays pure +
// store-free. `ProjectRealityCheck` (realityCheckStore) satisfies
// `PlanningDirectionSource`; `ProjectCoherenceCheck` (coherenceCheckStore)
// satisfies `CoherenceRecordSource`.
// ---------------------------------------------------------------------------

/** The fields the Planning Direction synthetic document reads (T1 / Reality Check). */
export interface PlanningDirectionSource {
  /** The approved Planning Direction Statement text. */
  planningDirectionText?: string;
  /** Epoch ms the direction was approved; absent until approved. */
  approvedAt?: number;
}

/** The fields the Coherence Record synthetic document reads (T2 / Coherence Check). */
export interface CoherenceRecordSource {
  /** Recorded amendments (append-only); their count is surfaced. */
  amendments?: readonly { itemId: string; amendmentText: string; resolvedAt: number }[];
  /** Epoch ms the Coherence Record was sealed; absent until sealed. */
  sealedAt?: number;
}

// ---------------------------------------------------------------------------
// Handoff inventory types
// ---------------------------------------------------------------------------

/** A handoff package is either DERIVED (an objective's `actHandoff`) or SYNTHETIC (a threshold record). */
export type HandoffKind = 'derived' | 'synthetic';

/** One thing that carries into Act -- a derived objective handoff or a synthetic record. */
export interface HandoffPackage {
  /** The objective id (derived) or the document id (synthetic). */
  id: string;
  /** Display title (objective title, or the document name). */
  title: string;
  /** The handoff line -- the objective's `actHandoff`, or the record's summary. */
  handoff: string;
  kind: HandoffKind;
  /** Catalogue ref code (derived only); absent on synthetic packages. */
  ref?: string;
}

/** Handoff packages for one stratum, in stratum order. */
export interface GroupedHandoffs {
  stratumId: string;
  /** Display label for the stratum (supplied by the caller -- keeps this pure). */
  label: string;
  packages: HandoffPackage[];
}

// ---------------------------------------------------------------------------
// Key documents
// ---------------------------------------------------------------------------

export type KeyDocumentKind =
  | 'planning-direction'
  | 'coherence-record'
  | 'integrated-design';

/** One of the three records that travels with the project into Act. */
export interface KeyDocument {
  kind: KeyDocumentKind;
  name: string;
  desc: string;
  /** Whether the document is in hand (approved / sealed / has objectives). */
  present: boolean;
  /** A one-line reading of the document's current state. */
  stateLine: string;
}

// ---------------------------------------------------------------------------
// Readiness (advisory only -- never blocks)
// ---------------------------------------------------------------------------

export interface ActMandateReadiness {
  /** Total packages (derived + synthetic) carrying into Act. */
  handoffCount: number;
  /** Derived (objective `actHandoff`) packages. */
  derivedCount: number;
  /** Synthetic (threshold-record) packages present. */
  syntheticCount: number;
  /** The T1 Planning Direction has been approved. */
  t1Approved: boolean;
  /** The T2 Coherence Record has been sealed. */
  t2Sealed: boolean;
  /** Launch Preparation (s7) completion. */
  launchPrep: { complete: number; total: number };
  /** Advisory "ready" reading: T1 approved AND T2 sealed AND s7 complete. NEVER a gate. */
  ready: boolean;
}

/** The fully assembled Act Mandate, ready for the surface to render. */
export interface ActMandateModel {
  /** The derived handoff inventory, grouped by stratum (stratum order). */
  handoffGroups: GroupedHandoffs[];
  /** The T1 synthetic package, present only when the direction is approved. */
  planningDirectionPackage: HandoffPackage | null;
  /** The T2 synthetic package, present only when the record is sealed. */
  coherenceRecordPackage: HandoffPackage | null;
  /** The three key documents (Planning Direction, Coherence Record, Integrated Design). */
  keyDocuments: KeyDocument[];
  readiness: ActMandateReadiness;
}

// ---------------------------------------------------------------------------
// Synthetic-document ids
// ---------------------------------------------------------------------------

export const PLANNING_DIRECTION_DOC_ID = 'doc-planning-direction';
export const COHERENCE_RECORD_DOC_ID = 'doc-coherence-record';
export const INTEGRATED_DESIGN_DOC_ID = 'doc-integrated-design';

// ---------------------------------------------------------------------------
// Derived handoff assembly (pure)
// ---------------------------------------------------------------------------

/** The resolved objectives that name a non-empty Act handoff, in input order. */
export function selectHandoffObjectives(
  objectives: readonly PlanStratumObjective[],
): PlanStratumObjective[] {
  return objectives.filter(
    (o) => typeof o.actHandoff === 'string' && o.actHandoff.trim().length > 0,
  );
}

/**
 * Group the handoff-bearing objectives by stratum in FIRST-APPEARANCE order.
 * The resolved set is already sorted by stratum ordinal, so groups come out in
 * stratum order. `stratumTitleFor` supplies the display label, keeping this pure
 * and catalogue-decoupled (the surface passes a catalogue lookup).
 */
export function groupDerivedHandoffs(
  objectives: readonly PlanStratumObjective[],
  stratumTitleFor: (stratumId: string) => string,
): GroupedHandoffs[] {
  const order: string[] = [];
  const byStratum = new Map<string, HandoffPackage[]>();
  for (const o of selectHandoffObjectives(objectives)) {
    let bucket = byStratum.get(o.stratumId);
    if (!bucket) {
      bucket = [];
      byStratum.set(o.stratumId, bucket);
      order.push(o.stratumId);
    }
    bucket.push({
      id: o.id,
      title: o.title,
      handoff: (o.actHandoff ?? '').trim(),
      kind: 'derived',
      ...(o.ref ? { ref: o.ref } : {}),
    });
  }
  return order.map((stratumId) => ({
    stratumId,
    label: stratumTitleFor(stratumId),
    packages: byStratum.get(stratumId) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Synthetic-document assembly (pure)
// ---------------------------------------------------------------------------

/**
 * The T1 Planning Direction as a synthetic handoff package -- present only once
 * the direction has been APPROVED (`approvedAt` set). Null otherwise. Reads the
 * approved text; falls back to a state line when the text is blank.
 */
export function buildPlanningDirectionPackage(
  source: PlanningDirectionSource,
): HandoffPackage | null {
  if (source.approvedAt == null) return null;
  const text = (source.planningDirectionText ?? '').trim();
  return {
    id: PLANNING_DIRECTION_DOC_ID,
    title: ACT_MANDATE_COPY.documents.planningDirection.name,
    handoff:
      text.length > 0
        ? text
        : ACT_MANDATE_COPY.documents.planningDirection.emptyHandoff,
    kind: 'synthetic',
  };
}

/**
 * The T2 Coherence Record as a synthetic handoff package -- present only once
 * the record has been SEALED (`sealedAt` set). Null otherwise. Surfaces the
 * recorded-amendment count (covenant-clean phrasing; no advance-sale framing).
 */
export function buildCoherenceRecordPackage(
  source: CoherenceRecordSource,
): HandoffPackage | null {
  if (source.sealedAt == null) return null;
  const count = source.amendments?.length ?? 0;
  return {
    id: COHERENCE_RECORD_DOC_ID,
    title: ACT_MANDATE_COPY.documents.coherenceRecord.name,
    handoff:
      count === 0
        ? ACT_MANDATE_COPY.documents.coherenceRecord.cleanHandoff
        : `Sealed at the Coherence Check with ${count} ${
            count === 1 ? 'amendment' : 'amendments'
          } recorded.`,
    kind: 'synthetic',
  };
}

// ---------------------------------------------------------------------------
// Key-document assembly (pure)
// ---------------------------------------------------------------------------

/**
 * The three key documents. Doc 1 = Planning Direction (present iff T1 approved),
 * Doc 2 = Coherence Record (present iff T2 sealed), Doc 3 = the FULL resolved
 * integrated design (present iff any objective resolved -- the whole set across
 * every stratum, not just the Launch-Preparation layer).
 */
export function buildKeyDocuments(input: {
  objectives: readonly PlanStratumObjective[];
  planningDirection: PlanningDirectionSource;
  coherenceRecord: CoherenceRecordSource;
}): KeyDocument[] {
  const { objectives, planningDirection, coherenceRecord } = input;
  const t1 = planningDirection.approvedAt != null;
  const t2 = coherenceRecord.sealedAt != null;
  const amendmentCount = coherenceRecord.amendments?.length ?? 0;
  const stratumCount = new Set(objectives.map((o) => o.stratumId)).size;
  const docs = ACT_MANDATE_COPY.documents;
  return [
    {
      kind: 'planning-direction',
      name: docs.planningDirection.name,
      desc: docs.planningDirection.desc,
      present: t1,
      stateLine: t1
        ? docs.planningDirection.presentLine
        : docs.planningDirection.absentLine,
    },
    {
      kind: 'coherence-record',
      name: docs.coherenceRecord.name,
      desc: docs.coherenceRecord.desc,
      present: t2,
      stateLine: t2
        ? amendmentCount === 0
          ? docs.coherenceRecord.sealedCleanLine
          : `Sealed at the Coherence Check with ${amendmentCount} ${
              amendmentCount === 1 ? 'amendment' : 'amendments'
            }.`
        : docs.coherenceRecord.absentLine,
    },
    {
      kind: 'integrated-design',
      name: docs.integratedDesign.name,
      desc: docs.integratedDesign.desc,
      present: objectives.length > 0,
      stateLine:
        objectives.length > 0
          ? `${objectives.length} resolved objectives across ${stratumCount} strata.`
          : docs.integratedDesign.absentLine,
    },
  ];
}

// ---------------------------------------------------------------------------
// Launch-Preparation (s7) completion (pure)
// ---------------------------------------------------------------------------

function launchPrepProgress(
  objectives: readonly PlanStratumObjective[],
  statuses: Readonly<Record<string, PlanStratumObjectiveStatus>>,
): { complete: number; total: number } {
  let complete = 0;
  let total = 0;
  for (const o of objectives) {
    if (o.stratumId !== LAUNCH_PREP_STRATUM_ID) continue;
    total += 1;
    if ((statuses[o.id] ?? 'locked') === 'complete') complete += 1;
  }
  return { complete, total };
}

// ---------------------------------------------------------------------------
// Top-level assembly (pure)
// ---------------------------------------------------------------------------

export interface AssembleActMandateInput {
  /** The full resolved objective set (all strata) for this project. */
  objectives: readonly PlanStratumObjective[];
  /** Completion statuses keyed by objective id. */
  statuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
  /** The T1 Reality Check record (structural). */
  planningDirection: PlanningDirectionSource;
  /** The T2 Coherence Check record (structural). */
  coherenceRecord: CoherenceRecordSource;
  /** Stratum-id -> display label (the surface passes a catalogue lookup). */
  stratumTitleFor: (stratumId: string) => string;
}

/**
 * Assemble the full Act Mandate from the resolved design + the two prior
 * threshold records. Pure + deterministic. NOTHING is recomputed from raw
 * inputs -- the synthetic documents are read from their records; `ready` is an
 * ADVISORY reading and never a gate.
 */
export function assembleActMandate(
  input: AssembleActMandateInput,
): ActMandateModel {
  const { objectives, statuses, planningDirection, coherenceRecord, stratumTitleFor } =
    input;

  const handoffGroups = groupDerivedHandoffs(objectives, stratumTitleFor);
  const planningDirectionPackage = buildPlanningDirectionPackage(planningDirection);
  const coherenceRecordPackage = buildCoherenceRecordPackage(coherenceRecord);
  const keyDocuments = buildKeyDocuments({
    objectives,
    planningDirection,
    coherenceRecord,
  });

  const derivedCount = handoffGroups.reduce((n, g) => n + g.packages.length, 0);
  const syntheticCount =
    (planningDirectionPackage ? 1 : 0) + (coherenceRecordPackage ? 1 : 0);
  const launchPrep = launchPrepProgress(objectives, statuses);
  const t1Approved = planningDirection.approvedAt != null;
  const t2Sealed = coherenceRecord.sealedAt != null;
  const ready =
    t1Approved &&
    t2Sealed &&
    launchPrep.total > 0 &&
    launchPrep.complete === launchPrep.total;

  return {
    handoffGroups,
    planningDirectionPackage,
    coherenceRecordPackage,
    keyDocuments,
    readiness: {
      handoffCount: derivedCount + syntheticCount,
      derivedCount,
      syntheticCount,
      t1Approved,
      t2Sealed,
      launchPrep,
      ready,
    },
  };
}

// ---------------------------------------------------------------------------
// Surface copy (GREEN register; Amanah-clean). ASCII-only; em-dashes written
// " -- ", arrows "->". Banned-term-scanned in test. No advance-sale /
// subscription / CSA / yield-share / salam framing is ever authored.
// ---------------------------------------------------------------------------

/** The configuration this restructure targets; the Act Mandate opener. */
export const ACT_MANDATE_CONFIGURATION_LABEL =
  'residential regenerative farm with integrated silvopasture';

export const ACT_MANDATE_COPY = {
  /** Mode pill -- the final Plan-stage threshold, before Act. */
  modeLabel: 'Threshold 3',
  title: 'The Act Mandate',
  /** The one-line framing of the moment (handoff + crossing, not audit). */
  tagline:
    'Where the resolved design is handed off to Act -- the line between planning and doing.',
  /** The header description. */
  intro:
    'The plan is complete across all seven strata. This threshold assembles the resolved design and the two prior threshold records into the mandate that carries into Act. Nothing is designed here. Begin Act seals the plan: from here the committed design is held steady so you can execute against it, and a change is made deliberately -- by raising a concern for the team governance to review.',
  documents: {
    heading: 'Key documents',
    blurb:
      'Three records travel with the project into Act -- the direction approved at the Reality Check, the quality record sealed at the Coherence Check, and the full resolved design.',
    planningDirection: {
      name: 'Planning Direction Statement',
      desc: 'The direction approved at the Reality Check -- the intent the plan was built to serve.',
      presentLine: 'Approved at the Reality Check.',
      absentLine: 'Not yet approved at the Reality Check.',
      emptyHandoff: 'Approved at the Reality Check.',
    },
    coherenceRecord: {
      name: 'Coherence Record',
      desc: 'The quality record sealed at the Coherence Check -- the designs verified to connect.',
      sealedCleanLine: 'Sealed at the Coherence Check with no amendments.',
      absentLine: 'Not yet sealed at the Coherence Check.',
      cleanHandoff: 'Sealed at the Coherence Check.',
    },
    integratedDesign: {
      name: 'Resolved Integrated Design',
      desc: 'Every resolved objective across all seven strata -- the whole design the project commits to.',
      absentLine: 'No resolved objectives yet.',
    },
  },
  handoffs: {
    heading: 'What carries into Act',
    blurb:
      'Every objective that names what it hands to Act, grouped by stratum. This inventory is assembled from the resolved design -- it is read here, not authored.',
    emptyNote: 'No objective in the resolved design names an Act handoff yet.',
    derivedBadge: 'Handoff',
    syntheticBadge: 'Record',
  },
  begin: {
    heading: 'Begin Act',
    blurb:
      'Begin Act crosses from planning into doing. It seals the plan: the committed design is held steady, and from here a change is made by raising a concern for the team governance to review -- never by silently editing the plan.',
    button: 'Begin Act',
    readyNote:
      'The plan is ready -- both thresholds are set and Launch Preparation is complete.',
    advisoryNote:
      'Readiness below is advisory. You can Begin Act whenever you judge the plan ready -- it never blocks.',
    readinessHeading: 'Readiness',
    readinessItems: {
      t1: 'Planning Direction approved',
      t2: 'Coherence Record sealed',
      launch: 'Launch Preparation complete',
    },
    lockNote:
      'Crossing this line holds the plan steady. A held objective stays fully visible -- to change one, raise a concern against it.',
  },
  /**
   * The contextual Plan-only doorway into Threshold 3, shown at the top of the
   * terminal-stratum (s7) objective detail. One of several entry paths (alongside
   * deep-links and -- since 2026-06-19 -- the clickable T3 switcher row); each
   * only NAVIGATES to the surface, where the one-way crossing is entered via its
   * own deliberate CTA.
   */
  entryCue: {
    pill: 'Threshold 3',
    title: 'The plan is complete',
    body:
      'Every stratum is resolved and Launch Preparation is in hand. When you judge the plan ready, cross deliberately into the Act Mandate -- the line between planning and doing.',
    button: 'Enter the Act Mandate',
  },
  /**
   * Raise-a-Concern affordance copy (Plan-only, shown on a HELD objective). The
   * free-text fields are scanned by `detectCsaLikeText` as a UI advisory AND
   * hard-rejected at the persistence boundary in planConcernsStore -- a banned
   * term cannot reach storage. Covenant-clean (banned-term-scanned in test).
   */
  concern: {
    heading: 'Raise a concern',
    blurb:
      'This objective is held under the Act Mandate. To change it, raise a concern -- describe how reality diverged and what you propose, and the team governance reviews it. Nothing is edited in place: an approved change is recorded alongside the original, never replacing it.',
    observationLabel: 'What diverged',
    observationPlaceholder:
      'Describe how reality diverged from the plan on this objective.',
    proposedChangeLabel: 'What you propose',
    proposedChangePlaceholder:
      'Describe the change you propose -- it would be recorded alongside the original.',
    raisedByLabel: 'Raised by',
    raisedByPlaceholder: 'Select a steward',
    submit: 'Raise concern',
    raisedAck: 'Concern raised -- it now awaits governance review.',
    needObservationNote: 'Add an observation to raise a concern.',
    pendingOne: '1 concern on this objective is awaiting review.',
    pendingManySuffix: 'concerns on this objective are awaiting review.',
  },
  /**
   * On-objective amendments overlay copy (Plan-only). Mirrors the Coherence
   * Check on-objective register, in the green Act-Mandate register. Approved
   * amendments are permanent overlays held in planConcernsStore; the catalogue
   * objective above is never mutated.
   */
  onObjective: {
    label: 'Act Mandate amendments',
    blurb:
      'Approved changes recorded against this objective during Act. Each was raised as a concern, reviewed by the team governance, and recorded here alongside the original design -- which is never overwritten.',
  },
  /**
   * Governance review queue copy (Plan-only, on the Act Mandate surface). The
   * team governance declared in Objective 0.2 reviews concerns raised against
   * held objectives. The recorded `amendmentText` is scanned by
   * `detectCsaLikeText` as a UI advisory AND hard-rejected at the persistence
   * boundary -- a banned term cannot be recorded as an amendment. Covenant-clean
   * (banned-term-scanned in test).
   */
  governance: {
    heading: 'Concerns under review',
    blurb:
      'Concerns raised against held objectives during Act come here for the team governance to review. Approving one lifts that objective just long enough to record the change alongside the original, then holds it steady again -- the original design is never overwritten. Declining closes the concern with no change.',
    contextLabel: 'Your team governance',
    contextFallback:
      'No governance framework was recorded in Objective 0.2. The team can record one there to guide who reviews concerns.',
    reviewerLabel: 'Reviewing as',
    reviewerPlaceholder: 'Select a reviewer',
    openHeading: 'Awaiting review',
    resolvedHeading: 'Resolved',
    emptyOpen: 'No concerns are awaiting review.',
    raisedByPrefix: 'Raised by',
    observationLabel: 'What diverged',
    proposedLabel: 'Proposed',
    amendmentLabel: 'Change to record (required to approve)',
    amendmentPlaceholder:
      'Describe the change to record alongside the original objective.',
    beginReview: 'Begin review',
    approve: 'Approve and record',
    decline: 'Decline',
    approveHint: 'Add the change to record before approving.',
    raisedBadge: 'Raised',
    underReviewBadge: 'Under review',
    approvedBadge: 'Approved',
    declinedBadge: 'Declined',
    recordedPrefix: 'Recorded alongside the original',
  },
  /** What Threshold 3 does NOT do -- a reassurance block. */
  notList: [
    'It does not design anything new -- it hands the resolved design to Act.',
    'It does not block -- Begin Act is always available; readiness is only advice.',
    'It does not overwrite the plan -- an approved change is recorded alongside the original, never in place of it.',
    'It does not lock you out -- a held objective stays viewable so a concern can be raised against it.',
  ],
} as const;

/**
 * The green palette (the spec :root register) for the Act Mandate CSS module and
 * its tests. The CSS module mirrors these as `--am-*` tokens; pinned here so the
 * register has one canonical source. Distinct from Threshold 1's amber/gold and
 * Threshold 2's mauve.
 */
export const ACT_MANDATE_PALETTE = {
  accent: '#4F9D69',
  accentDark: '#3C7E52',
  accentLight: '#7FBF95',
  accentSoft: 'rgba(79, 157, 105, 0.12)',
  accentLine: 'rgba(79, 157, 105, 0.28)',
  ready: '#4F9D69',
  pending: '#C9A227',
} as const;
