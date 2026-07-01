/**
 * coherenceCheckModel -- the single source of Threshold-2 ("The Coherence
 * Check") logic + copy. Pure / deterministic / no React / no I/O so it is safe
 * in render and unit-testable without a DOM. Mirrors realityCheckModel.ts (the
 * Threshold-1 template) one-to-one.
 *
 * Threshold 2 is the quality hinge between Mode 4 (Design -- Tiers 3 + 4, strata
 * `s4-foundation-decisions` + `s5-system-design`) and the downstream operational
 * strata. After the 14 design objectives are complete, the steward runs a single
 * three-section audit:
 *   - Section A (System Integration): do the designs CONNECT at the integration
 *     points specific to this configuration? (5 config-pinned checks.)
 *   - Section B (Closed Loops): does each enterprise close at least one
 *     waste-to-input loop at the design level? (3 config-pinned loops.)
 *   - Section C (Monitoring Coverage): does every design objective carry a
 *     complete monitoring protocol? (Derived per resolved s4/s5 objective.)
 * When every audit item is pass-or-resolved the Coherence Record may be SEALED.
 *
 * NOTHING IS DESIGNED HERE. The audit verifies completeness + integration; it
 * never evaluates whether a design is "good". Gaps are resolved inline via
 * append-only, permanently-timestamped steward amendments held in the
 * coherenceCheckStore -- the static catalogue is never mutated at runtime.
 *
 * DISPLAY-ONLY. The seal NEVER blocks navigation. `coherenceGateState` drives a
 * soft banner on s6/s7 (the A8 / Threshold-1 soft-gate precedent);
 * `prerequisiteObjectiveIds` / `STRATUM_PREREQS` are untouched -- `s6-monitoring`
 * keeps gating s7 for every configuration exactly as today.
 *
 * SECTION C consequence (operator decision, 2026-06-17): the `monitoringProtocol`
 * schema was tightened (>=2 `{metric,frequency}` indicators, >=1 trigger, a
 * `UniversalDomain` feed) at Stage 1, so a shipped protocol is complete by
 * construction. Section C therefore reduces to a presence/coverage check; the
 * substantive inline-gap demo lives in Section B (B3, the residential loop).
 *
 * AMANAH: all OLOS-authored copy here is covenant-clean -- the mockup's
 * "Commercial CSA" example is deliberately NOT transcribed. `detectCsaLikeText`
 * (reused from realityCheckModel) raises a NON-BLOCKING advisory on steward
 * amendment text that resembles advance-sale / subscription / CSA / yield-share
 * framing. It never blocks a save and never censors steward text.
 */

import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { detectCsaLikeText, CSA_ADVISORY_COPY } from './realityCheckModel.js';

// Re-export the Amanah guard so the Threshold-2 surface depends on ONE source.
export { detectCsaLikeText, CSA_ADVISORY_COPY };

// ---------------------------------------------------------------------------
// Audit vocabulary (PIN EXACTLY -- spec + mockup)
// ---------------------------------------------------------------------------

/** Which of the three audit sections an item belongs to. */
export type CoherenceSection = 'A' | 'B' | 'C';

/**
 * The state of a single audit item.
 *   - `pass`     -- satisfied directly by the completed design work.
 *   - `open`     -- a gap awaiting an inline steward amendment.
 *   - `resolved` -- a gap closed by a recorded (append-only) amendment.
 * A verdict of PASS requires every item to be `pass` OR `resolved`.
 */
export type CoherenceItemStatus = 'pass' | 'open' | 'resolved';

/** A recorded steward amendment (held in the store; surfaced read-only here). */
export interface ItemResolution {
  /** Epoch ms the amendment was submitted. Permanent -- never edited. */
  resolvedAt: number;
  /** The steward's amendment text (append-only; "cannot be edited after submission"). */
  amendmentText: string;
}

// ---------------------------------------------------------------------------
// The two Mode-4 design strata audited, and the two downstream strata the soft
// seal banner arms on. EDITORIAL CONSTANTS pinned to the spine (doc Tier 3 =
// `s4-foundation-decisions`; doc Tier 4 = `s5-system-design`; doc Tier 5 =
// `s6-integration-design`; doc Tier 6 = `s7-phasing-resourcing`).
// ---------------------------------------------------------------------------

export const DESIGN_TIER_THREE_STRATUM = 's4-foundation-decisions';
export const DESIGN_TIER_FOUR_STRATUM = 's5-system-design';

/** The two strata Threshold 2 audits (doc Tier 3 + Tier 4). */
export const DESIGN_STRATUM_IDS: readonly string[] = [
  DESIGN_TIER_THREE_STRATUM,
  DESIGN_TIER_FOUR_STRATUM,
];

/**
 * The two strata downstream of Threshold 2 where the soft seal banner arms (doc
 * Tier 5 = integration design; doc Tier 6 = phasing & resourcing). CRITICAL: the
 * banner is display-only and NEVER a prerequisite -- `STRATUM_PREREQS` is
 * untouched and `s6-monitoring` keeps gating s7 for every configuration.
 */
export const COHERENCE_DOWNSTREAM_STRATUM_IDS: readonly string[] = [
  's6-integration-design',
  's7-phasing-resourcing',
];

// ---------------------------------------------------------------------------
// Section A -- System Integration (config-pinned editorial constants)
// ---------------------------------------------------------------------------

/**
 * One Section-A integration check. `evidenceObjectiveIds` are the resolved s4/s5
 * objective ids whose design packages must connect; the surface shows their
 * content inline. A check APPLIES only when every evidence id is present in the
 * project's resolved design set (so a configuration missing those objectives
 * degrades gracefully -- the check is omitted, never failed).
 */
export interface IntegrationCheck {
  /** 'A1'..'A5' -- the audit-item id (resolution key). */
  id: string;
  /** Display name (the mockup's check title). */
  label: string;
  /** The integration question (spec). */
  question: string;
  /** What "connected" means -- the spec pass criteria. */
  passCriteria: string;
  evidenceObjectiveIds: readonly string[];
}

/**
 * One Section-B closed loop. A loop APPLIES only when its evidence ids are in the
 * resolved design set. `designedGap: true` marks the spec's deliberate inline gap
 * (B3 residential) -- it starts `open` and is closed by a steward amendment, the
 * canonical demo of the inline gap-resolution flow.
 */
export interface ClosedLoop {
  /** 'B1'..'B3' -- the audit-item id (resolution key). */
  id: string;
  /** The enterprise the loop belongs to. */
  enterprise: string;
  /** Display name (the mockup's loop title). */
  label: string;
  /** The minimum loop the enterprise must close (spec). */
  minimumLoop: string;
  /** The expected waste-to-input loop (spec). */
  expectedLoop: string;
  /** What "operational at the design level" means (spec pass criteria). */
  passCriteria: string;
  evidenceObjectiveIds: readonly string[];
  /** The spec's designed inline gap (B3): starts open, needs an amendment. */
  designedGap?: boolean;
  /** Prompt shown when this loop surfaces as an open gap. */
  gapPrompt?: string;
}

/**
 * The 5 integration checks for the reference configuration (RegenFarm primary +
 * Residential + Silvopasture). Authored from OLOS_Threshold2_Spec.md Section A.
 * Evidence ids are resolved by SEMANTICS (the spec's "3.x / 4.x" display
 * coordinates are the author's layout; the catalogue resolves to these ids).
 */
export const SECTION_A_CHECKS: readonly IntegrationCheck[] = [
  {
    id: 'A1',
    label: 'Water: farm, stock, and domestic -- connected and isolated',
    question:
      'Are farm water, stock water, and domestic water operating as three connected-but-isolated systems at the design level?',
    passCriteria:
      'The water infrastructure design explicitly specifies the isolation mechanism for domestic water from stock water. A strategy-level declaration is not sufficient -- the design must confirm it.',
    evidenceObjectiveIds: ['s4-water-strategy', 's5-water-infrastructure'],
  },
  {
    id: 'A2',
    label: 'Fertility: livestock manure routing to crop zones, quantified',
    question:
      'Is the livestock-to-crop fertility pathway physically designed with quantities, timing, and movement protocol?',
    passCriteria:
      'Livestock manure routing to crop zones is specified in the integrated fertility system with stocking density, duration, and timing -- not just declared as a strategy intention.',
    evidenceObjectiveIds: ['rf-s4-fertility-strategy', 'rf-s5-fertility-system'],
  },
  {
    id: 'A3',
    label: 'Access: farm routes, livestock laneways, residential access -- no conflicts',
    question:
      'Are farm vehicle routes, livestock laneways, and residential access routes all resolved at the design level without unresolved conflicts?',
    passCriteria:
      'All three circulation types carry dedicated routes. No intersection point is unresolved. Residential access is confirmed separate from the main farm entry.',
    evidenceObjectiveIds: ['s4-zones', 's5-access'],
  },
  {
    id: 'A4',
    label: 'Spatial: zone framework, paddock layout, residential zone -- no overlap',
    question:
      'Do the zone framework, paddock layout, residential zone, and kitchen garden all fit without overlap or unresolved spatial conflict?',
    passCriteria:
      'No zone boundaries conflict. The private residential boundary is established. The kitchen garden is within the Zone 1 boundaries.',
    evidenceObjectiveIds: [
      's4-zones',
      'silv-sec-s4-grazing-design',
      'res-s4-living-zone',
      'res-s5-living-infrastructure',
    ],
  },
  {
    id: 'A5',
    label: 'Vegetation: shelterbelts serve paddock boundary + wildlife corridor',
    question:
      'Do windbreaks and shelterbelts serve paddock boundary, wind protection, and wildlife corridor functions without design contradiction?',
    passCriteria:
      'At least one shelterbelt coincides with a paddock boundary. The wildlife corridor connectivity is mapped as a continuous network across the property.',
    evidenceObjectiveIds: ['rf-s4-biodiversity-strategy', 'rf-s5-windbreaks'],
  },
];

/**
 * The 3 enterprise closed loops for the reference configuration. B3 (residential)
 * is the spec's designed inline gap: the residential design does not yet specify
 * a household composting loop, so it surfaces `open` and is closed by a steward
 * amendment at the threshold (the design history is preserved -- the amendment is
 * an overlay, never a catalogue edit).
 */
export const SECTION_B_LOOPS: readonly ClosedLoop[] = [
  {
    id: 'B1',
    enterprise: 'Regenerative Farm',
    label: 'Livestock manure -> compost -> crop zones -> biomass -> compost',
    minimumLoop:
      'One agricultural waste stream routed as an input to another system on the farm.',
    expectedLoop:
      'Livestock manure -> compost system -> crop zone application -> crop biomass -> compost feedstock.',
    passCriteria:
      'The loop is specified with operational detail -- quantities, frequency, routing, and responsible party.',
    evidenceObjectiveIds: ['rf-s5-fertility-system'],
  },
  {
    id: 'B2',
    enterprise: 'Silvopasture',
    label: 'Paddock forage -> livestock -> manure deposit -> pasture fertility -> forage',
    minimumLoop: 'One livestock output routed as a land improvement input.',
    expectedLoop:
      'Paddock forage -> livestock grazing -> manure deposit in paddock -> pasture fertility -> forage recovery.',
    passCriteria:
      'The rotation calendar and the fertility transfer together constitute this loop at the operational level.',
    evidenceObjectiveIds: ['silv-sec-s4-grazing-design', 'rf-s5-fertility-system'],
  },
  {
    id: 'B3',
    enterprise: 'Residential',
    label: 'Kitchen waste -> household compost -> kitchen garden -> household food',
    minimumLoop:
      'One household waste stream routed as an input to domestic food production.',
    expectedLoop:
      'Kitchen waste -> household compost bay -> kitchen garden beds -> household food -> kitchen waste.',
    passCriteria:
      'The residential design specifies a household composting system as part of the residential zone, with routing to the kitchen garden.',
    evidenceObjectiveIds: ['res-s5-living-infrastructure'],
    designedGap: true,
    gapPrompt:
      'The residential design does not yet specify a household composting system routed to the kitchen garden. Add a household compost system to the residential zone design to close this waste-to-input loop.',
  },
];

/** The Section A + B editorial set for one primary configuration. */
export interface CoherenceABRegistry {
  integrationChecks: readonly IntegrationCheck[];
  closedLoops: readonly ClosedLoop[];
}

/**
 * Section A + B are authored for the reference configuration, keyed by PRIMARY
 * type. A primary type without an entry degrades gracefully: no integration /
 * loop checks are defined, while Section C (monitoring coverage) stays fully
 * active for every configuration. (Mirrors the Threshold-1 reference-config
 * precedent -- the audit never hard-fails on scope.)
 */
export const SECTION_AB_REGISTRY: Readonly<Record<string, CoherenceABRegistry>> = {
  regenerative_farm: {
    integrationChecks: SECTION_A_CHECKS,
    closedLoops: SECTION_B_LOOPS,
  },
};

/** The A/B registry for a primary type, or undefined when none is authored. */
export function coherenceABRegistryFor(
  primaryTypeId: string | null | undefined,
): CoherenceABRegistry | undefined {
  return primaryTypeId == null ? undefined : SECTION_AB_REGISTRY[primaryTypeId];
}

// ---------------------------------------------------------------------------
// Section C -- Monitoring Protocol Coverage (derived per resolved objective)
// ---------------------------------------------------------------------------

/**
 * Whether an objective carries a COMPLETE monitoring protocol. The Stage-1 schema
 * tighten guarantees this shape for shipped Mode-4 protocols, but this defends
 * the runtime anyway (a configuration could resolve an objective that genuinely
 * carries no protocol -- which is then an open coverage gap resolved inline).
 *
 * Complete protocol (spec): >=2 observable indicators each with a measurement
 * frequency, >=1 response trigger, and a named Observe-stage feed.
 */
export function isProtocolComplete(
  objective: Pick<PlanStratumObjective, 'monitoringProtocol'> | null | undefined,
): boolean {
  const p = objective?.monitoringProtocol;
  if (p == null) return false;
  const indicatorsOk =
    Array.isArray(p.indicators) &&
    p.indicators.length >= 2 &&
    p.indicators.every(
      (i) =>
        typeof i?.metric === 'string' &&
        i.metric.trim().length > 0 &&
        typeof i?.frequency === 'string' &&
        i.frequency.trim().length > 0,
    );
  const triggersOk =
    Array.isArray(p.triggers) &&
    p.triggers.length >= 1 &&
    p.triggers.every((t) => typeof t === 'string' && t.trim().length > 0);
  const feedsOk = typeof p.feeds === 'string' && p.feeds.length > 0;
  return indicatorsOk && triggersOk && feedsOk;
}

/** The stable Section-C audit-item id for a design objective (resolution key). */
export function coverageItemId(objectiveId: string): string {
  return `c-${objectiveId}`;
}

// ---------------------------------------------------------------------------
// Audit engine (pure)
// ---------------------------------------------------------------------------

/** One evaluated audit item, ready for the surface to render. */
export interface AuditItemResult {
  section: CoherenceSection;
  /** 'A1'..'A5' | 'B1'..'B3' | `c-<objectiveId>`. */
  id: string;
  /** Display name. */
  label: string;
  status: CoherenceItemStatus;
  /** The check question / loop summary / coverage line shown under the label. */
  summary: string;
  /** What "complete" means for this item (spec pass criteria). */
  passCriteria?: string;
  /** Resolved objective ids whose content the surface shows inline as evidence. */
  evidenceObjectiveIds: readonly string[];
  /** Guidance shown when the item is an open gap. */
  gapPrompt?: string;
  /** The recorded amendment when status === 'resolved'. */
  amendmentText?: string;
  resolvedAt?: number;
}

/** Per-section pass tally. */
export interface SectionTally {
  passed: number;
  total: number;
}

export interface CoherenceAuditModel {
  sectionA: AuditItemResult[];
  sectionB: AuditItemResult[];
  sectionC: AuditItemResult[];
  /** All items in section order (A, then B, then C). */
  items: AuditItemResult[];
  /** Whether this configuration has authored Section A/B checks. */
  hasIntegrationChecks: boolean;
  tallies: { A: SectionTally; B: SectionTally; C: SectionTally };
  /** Items still requiring an inline amendment. */
  openCount: number;
  /** 'pass' iff every item is pass-or-resolved (and at least one item exists). */
  verdict: CoherenceVerdict;
}

export type CoherenceVerdict = 'pass' | 'forming';

export interface CoherenceAuditInput {
  /** The project's primary type id (selects the Section A/B registry). */
  primaryTypeId: string | null | undefined;
  /** The resolved s4 + s5 (Mode-4 design) objectives for this project. */
  designObjectives: readonly PlanStratumObjective[];
  /** Completion statuses keyed by objective id. */
  statuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
  /** Steward resolutions from the coherence store, keyed by audit-item id. */
  resolutions?: Readonly<Record<string, ItemResolution>>;
}

function tally(items: readonly AuditItemResult[]): SectionTally {
  return {
    passed: items.filter((i) => i.status === 'pass' || i.status === 'resolved').length,
    total: items.length,
  };
}

/**
 * Evaluate the full A/B/C audit for a project. Deterministic + pure. Section A/B
 * checks whose evidence is out of the resolved design set are OMITTED (graceful
 * degradation); applicable non-gap checks pass when their evidence is complete; a
 * designed gap (B3) and any incomplete coverage start `open`; a recorded
 * resolution flips an open item to `resolved`.
 */
export function evaluateCoherenceAudit(
  input: CoherenceAuditInput,
): CoherenceAuditModel {
  const { primaryTypeId, designObjectives, statuses, resolutions = {} } = input;

  const byId = new Map(designObjectives.map((o) => [o.id, o]));
  const present = (id: string): boolean => byId.has(id);
  const complete = (id: string): boolean => (statuses[id] ?? 'locked') === 'complete';
  const evidenceReady = (ids: readonly string[]): boolean =>
    ids.every((id) => present(id) && complete(id));

  const registry = coherenceABRegistryFor(primaryTypeId);

  const sectionA: AuditItemResult[] = (registry?.integrationChecks ?? [])
    .filter((check) => check.evidenceObjectiveIds.every(present))
    .map((check) => {
      const res = resolutions[check.id];
      const status: CoherenceItemStatus = res
        ? 'resolved'
        : evidenceReady(check.evidenceObjectiveIds)
          ? 'pass'
          : 'open';
      return {
        section: 'A',
        id: check.id,
        label: check.label,
        status,
        summary: check.question,
        passCriteria: check.passCriteria,
        evidenceObjectiveIds: check.evidenceObjectiveIds,
        gapPrompt:
          status === 'open' ? check.passCriteria : undefined,
        amendmentText: res?.amendmentText,
        resolvedAt: res?.resolvedAt,
      };
    });

  const sectionB: AuditItemResult[] = (registry?.closedLoops ?? [])
    .filter((loop) => loop.evidenceObjectiveIds.every(present))
    .map((loop) => {
      const res = resolutions[loop.id];
      let status: CoherenceItemStatus;
      if (res) status = 'resolved';
      else if (loop.designedGap) status = 'open';
      else status = evidenceReady(loop.evidenceObjectiveIds) ? 'pass' : 'open';
      return {
        section: 'B',
        id: loop.id,
        label: loop.label,
        status,
        summary: loop.expectedLoop,
        passCriteria: loop.passCriteria,
        evidenceObjectiveIds: loop.evidenceObjectiveIds,
        gapPrompt: status === 'open' ? loop.gapPrompt ?? loop.passCriteria : undefined,
        amendmentText: res?.amendmentText,
        resolvedAt: res?.resolvedAt,
      };
    });

  const sectionC: AuditItemResult[] = designObjectives.map((o) => {
    const id = coverageItemId(o.id);
    const res = resolutions[id];
    const status: CoherenceItemStatus = res
      ? 'resolved'
      : isProtocolComplete(o)
        ? 'pass'
        : 'open';
    return {
      section: 'C',
      id,
      label: o.title,
      status,
      summary: COHERENCE_COPY.sectionC.coverageRule,
      passCriteria: COHERENCE_COPY.sectionC.coverageRule,
      evidenceObjectiveIds: [o.id],
      gapPrompt: status === 'open' ? COHERENCE_COPY.sectionC.gapPrompt : undefined,
      amendmentText: res?.amendmentText,
      resolvedAt: res?.resolvedAt,
    };
  });

  const items = [...sectionA, ...sectionB, ...sectionC];
  const openCount = items.filter((i) => i.status === 'open').length;

  return {
    sectionA,
    sectionB,
    sectionC,
    items,
    hasIntegrationChecks: registry != null,
    tallies: { A: tally(sectionA), B: tally(sectionB), C: tally(sectionC) },
    openCount,
    verdict: coherenceVerdict(items),
  };
}

/** PASS iff at least one item exists and every item is pass-or-resolved. */
export function coherenceVerdict(
  items: readonly AuditItemResult[],
): CoherenceVerdict {
  if (items.length === 0) return 'forming';
  return items.every((i) => i.status === 'pass' || i.status === 'resolved')
    ? 'pass'
    : 'forming';
}

// ---------------------------------------------------------------------------
// Coherence-open derivation (the threshold opens once all 14 design objectives
// complete). Mirrors deriveReceptionProgress over the two design strata.
// ---------------------------------------------------------------------------

export interface CoherenceTierProgress {
  complete: number;
  total: number;
}

export interface CoherenceProgressModel {
  /** s4-foundation-decisions (doc Tier 3 -- Strategic Decisions) completion. */
  tierThree: CoherenceTierProgress;
  /** s5-system-design (doc Tier 4 -- System Design) completion. */
  tierFour: CoherenceTierProgress;
  /** Total design objectives across both strata (the spec's "14"). */
  totalDesignObjectives: number;
  /** True once BOTH design strata are complete (Threshold 2 may open). */
  coherenceOpen: boolean;
}

type StatusMap = Readonly<Record<string, PlanStratumObjectiveStatus>>;

function tierProgress(
  objectives: readonly PlanStratumObjective[],
  statuses: StatusMap,
  stratumId: string,
): CoherenceTierProgress {
  let complete = 0;
  let total = 0;
  for (const o of objectives) {
    if (o.stratumId !== stratumId) continue;
    total += 1;
    if ((statuses[o.id] ?? 'locked') === 'complete') complete += 1;
  }
  return { complete, total };
}

/**
 * Derive Threshold-2 open-state from the FULL resolved objective list. The
 * threshold opens only when every s4 AND every s5 objective is complete (both
 * totals > 0), mirroring deriveReceptionProgress().thresholdOpen for Threshold 1.
 */
export function deriveCoherenceProgress(
  objectives: readonly PlanStratumObjective[],
  statuses: StatusMap,
): CoherenceProgressModel {
  const tierThree = tierProgress(objectives, statuses, DESIGN_TIER_THREE_STRATUM);
  const tierFour = tierProgress(objectives, statuses, DESIGN_TIER_FOUR_STRATUM);
  const coherenceOpen =
    tierThree.total > 0 &&
    tierFour.total > 0 &&
    tierThree.complete === tierThree.total &&
    tierFour.complete === tierFour.total;
  return {
    tierThree,
    tierFour,
    totalDesignObjectives: tierThree.total + tierFour.total,
    coherenceOpen,
  };
}

/** Convenience: whether Threshold 2 is open for the resolved objective set. */
export function deriveCoherenceOpen(
  objectives: readonly PlanStratumObjective[],
  statuses: StatusMap,
): boolean {
  return deriveCoherenceProgress(objectives, statuses).coherenceOpen;
}

/** The resolved s4 + s5 design objectives (the audited set), in input order. */
export function selectDesignObjectives(
  objectives: readonly PlanStratumObjective[],
): PlanStratumObjective[] {
  return objectives.filter((o) => DESIGN_STRATUM_IDS.includes(o.stratumId));
}

// ---------------------------------------------------------------------------
// Soft seal gate (display-only, downstream of s5). Mirrors realityCheckGateState.
// ---------------------------------------------------------------------------

/** Whether a stratum id is one of the two strata downstream of Threshold 2. */
export function isCoherenceDownstreamStratum(
  stratumId: string | null | undefined,
): boolean {
  return stratumId != null && COHERENCE_DOWNSTREAM_STRATUM_IDS.includes(stratumId);
}

/** Derived state of the soft seal gate for one downstream objective surface. */
export interface CoherenceGateState {
  /** On a downstream stratum (s6 / s7), whether or not the record is sealed. */
  downstream: boolean;
  /** The Coherence Record has been sealed (`sealedAt` present). */
  sealed: boolean;
  /** TRUE iff downstream AND not yet sealed -> show the amber reminder. */
  pending: boolean;
}

/**
 * Pure derivation of the soft seal gate. NEVER blocks: callers render a banner
 * from this and nothing else. `pending` arms the amber "seal the Coherence Check
 * first" reminder; `sealed` (on a downstream stratum) surfaces the calm "sealed"
 * reading. Off s6/s7, `downstream` is false and the banner renders null.
 */
export function coherenceGateState(
  stratumId: string | null | undefined,
  sealedAt: number | null | undefined,
): CoherenceGateState {
  const downstream = isCoherenceDownstreamStratum(stratumId);
  const sealed = sealedAt != null;
  return { downstream, sealed, pending: downstream && !sealed };
}

// ---------------------------------------------------------------------------
// On-objective amendment mapping (Stage 5 -- the Plan-only objective overlay)
// ---------------------------------------------------------------------------

/**
 * The design objective id(s) a recorded audit item touches -- the inverse of the
 * audit's evidence wiring. A Section-C coverage id (`c-<objectiveId>`) maps to
 * that one objective; a Section-A/B item maps to its `evidenceObjectiveIds`,
 * scanned across every registered configuration so the mapping is independent of
 * which primary type is in scope. An unknown id maps to nothing.
 *
 * Used to surface a recorded steward amendment back on the Tier 3/4 objective(s)
 * it amended (the ObjectiveDetailPanel overlay) -- display-only, never a gate.
 */
export function auditItemObjectiveIds(itemId: string): readonly string[] {
  if (itemId.startsWith('c-')) return [itemId.slice(2)];
  for (const registry of Object.values(SECTION_AB_REGISTRY)) {
    const check = registry.integrationChecks.find((c) => c.id === itemId);
    if (check) return check.evidenceObjectiveIds;
    const loop = registry.closedLoops.find((l) => l.id === itemId);
    if (loop) return loop.evidenceObjectiveIds;
  }
  return [];
}

/**
 * The amendments (any record carrying an `itemId`) that touch a given design
 * objective, preserving submission order. A pure filter over the append-only log
 * -- the ObjectiveDetailPanel overlay reads this to show "Threshold 2
 * amendments" on the objective(s) an amendment amended, and only those.
 */
export function amendmentsForObjective<T extends { itemId: string }>(
  objectiveId: string,
  amendments: readonly T[],
): T[] {
  return amendments.filter((a) =>
    auditItemObjectiveIds(a.itemId).includes(objectiveId),
  );
}

// ---------------------------------------------------------------------------
// Surface copy (MAUVE register; CSA example omitted per Amanah). ASCII-only;
// em-dashes written " -- ", arrows "->". Transcribed from OLOS_Threshold2_Spec.md
// + olos_threshold2_coherence.html, covenant-clean.
// ---------------------------------------------------------------------------

/** The configuration this restructure targets; the Coherence Record opener. */
export const COHERENCE_CONFIGURATION_LABEL =
  'residential regenerative farm with integrated silvopasture';

export const COHERENCE_COPY = {
  /** Mode pill -- between Mode 4 (Design) and Mode 5 (Launch Preparation). */
  modeLabel: 'Threshold 2',
  title: 'The Coherence Check',
  /** The one-line framing of the moment (synthesis, not confrontation). */
  tagline:
    'Where the designs from Strata 4 and 5 are verified to connect into a coherent whole -- nothing new is designed here.',
  /**
   * The header description. Adapted from the spec (covenant-clean) but corrected
   * for honesty: Threshold 2 is always reachable (a deliberate operator decision
   * -- see REACHABLE_THRESHOLD_IDS), so it can be entered BEFORE the Tier 3/4
   * design work is finished. The old copy flatly asserted "the design objectives
   * have been completed across Tiers 3 and 4," which is false in that case. This
   * states what the check DOES rather than presuming the design is done; the
   * readiness banner below carries the actual completion state.
   */
  intro:
    'This threshold verifies that the designs from Strata 4 and 5 connect into a coherent whole: that all systems connect, all enterprises close at least one waste-to-input loop, and all monitoring protocols are complete. Nothing is designed here. Gaps are resolved inline -- no navigation back to strata.',
  /**
   * Honest readiness banner copy. Because the threshold can open before the
   * design is finished, the surface shows this when Tier 3/4 is incomplete --
   * stating plainly that the audit reads an unfinished design (incomplete
   * objectives surface as open gaps) rather than implying completion. Display
   * only; it never gates entry.
   */
  readiness: {
    incompleteTitle: 'Design still in progress',
    incompleteBody:
      'Some Stratum 4 and Stratum 5 design objectives are not yet complete. You can run the Coherence Check now, but it audits the design exactly as it stands -- incomplete objectives surface below as open gaps. Finish the remaining design work for a complete verdict.',
    completeNote:
      'All Stratum 4 and Stratum 5 design objectives are complete -- this audit reads a finished design.',
    tallyLabel: 'design objectives complete',
  },
  sectionA: {
    key: 'A' as const,
    label: 'System Integration',
    heading: 'Do the designs connect?',
    blurb:
      'Checks that the designs produced in Strata 4 and 5 connect to each other at the integration points specific to this configuration.',
  },
  sectionB: {
    key: 'B' as const,
    label: 'Closed Loops',
    heading: 'Does each enterprise close a loop?',
    blurb:
      'For each enterprise, at least one confirmed waste-to-input loop must be operational at the design level -- not just declared at strategy level. Unverified loops do not count.',
  },
  sectionC: {
    key: 'C' as const,
    label: 'Monitoring Coverage',
    heading: 'Is every protocol complete?',
    blurb:
      'Every design objective must carry a complete monitoring protocol before the Coherence Check can pass.',
    coverageRule:
      'A complete protocol has at least two observable indicators with measurement frequency, at least one response trigger, and a named Observe-stage feed destination.',
    gapPrompt:
      'This objective does not yet carry a complete monitoring protocol. Add at least two observable indicators with measurement frequency, at least one response trigger, and a named Observe-stage feed.',
  },
  gap: {
    promptLabel: 'Resolve inline',
    amendmentLabel: 'Amendment',
    amendmentPlaceholder: 'Specify what was missing -- this is recorded permanently and cannot be edited after submission.',
    submitLabel: 'Submit amendment',
    skipLabel: 'Skip for now',
    resolvedLabel: 'Resolved at Threshold 2',
  },
  seal: {
    formingTitle: 'Coherence Record -- Forming',
    sealedTitle: 'Coherence Record -- Sealed',
    sub: 'Sealed when all audit checks pass.',
    sealLabel: 'Seal Coherence Record',
    sealedNote: 'This Coherence Record travels with the project as a permanent quality record.',
    gapRemainingLabel: 'remaining before the coherence verdict can be issued',
    readyLabel: 'All audit checks pass -- the Coherence Record is ready to seal.',
    verdictLabel: 'Coherence Verdict',
    verdictPass: 'PASS',
  },
  /** The Plan-only overlay shown on a Tier 3/4 objective that was amended here. */
  onObjective: {
    label: 'Threshold 2 amendments',
    blurb:
      'Recorded at the Coherence Check to close an audit gap touching this objective. The design above is unchanged -- these are permanent, timestamped overlays.',
  },
  /** What Threshold 2 does NOT do (spec) -- a reassurance block. */
  notList: [
    'It does not design anything new -- it verifies completeness.',
    'It does not send you back to Stratum 4 or Stratum 5 to re-do design work.',
    'It does not evaluate whether the designs are good -- only that they are complete and connected.',
    'It does not gate on quality; it gates on completeness and integration.',
    'It does not require a new document -- the Coherence Record assembles automatically.',
  ],
} as const;

/**
 * Copy for the soft seal-gate banner shown on s6 / s7. Covenant-clean -- no
 * advance-sale / subscription / CSA / yield-share framing. Wording-pinned in
 * tests. Mirrors MODE4_GATE_COPY (Threshold 1).
 */
export const COHERENCE_GATE_COPY = {
  pending: {
    pill: 'Threshold 2',
    title: 'Coherence Check not yet sealed',
    body: 'These strata carry the integrated, phased design forward. The Coherence Check that verifies your Strata 4-5 designs connect is not sealed yet. You can work here, but the coherence verdict that grounds this work is not set.',
    action: 'Open Threshold 2',
  },
  sealed: {
    pill: 'Coherence Record',
    title: 'Sealed at Threshold 2',
    body: 'The Coherence Record is sealed -- the designs were verified to connect, each enterprise closes a loop, and monitoring coverage is complete. This work proceeds from that record.',
    action: 'Review Threshold 2',
  },
} as const;

/**
 * The mauve palette (the spec :root register) for the Coherence CSS module and
 * its tests. The CSS module mirrors these as `--cc-*` tokens; pinned here so the
 * register has one canonical source. Distinct from Threshold 1's amber/gold.
 */
export const COHERENCE_PALETTE = {
  accent: '#9B7EC8',
  accentLight: '#B89FD8',
  accentSoft: 'rgba(155, 126, 200, 0.12)',
  accentLine: 'rgba(155, 126, 200, 0.28)',
  pass: '#5AAF72',
  fail: '#C45A4A',
} as const;
