/**
 * generateCommunityWorkPlan — pure composer: Intentional-Community / ecovillage
 * Plan decisions → recurring governance / operational RULES → dated INSTANCES
 * over a rolling horizon.
 *
 * PURE AND ADVISORY. `todayISO` is injected (NO Date.now(), NO argless
 * `new Date()`); identical input → deep-equal output. The output never touches
 * the WorkItem spine — it feeds `communityWorkPlanStore` proposals, and only the
 * operator's `confirmProposal` writes spine rows (sovereign-steward covenant).
 *
 * Mirrors `generateLivestockWorkPlan` in structure, hashing (fnv1a over
 * `stableStringify`), horizon handling (90 days), and rule/instance assembly.
 * Community governance is NOT season-or-paddock scoped, so the livestock-only
 * concepts (species, paddockId, seasonalWindow, hemisphere, captureMode) are
 * deliberately absent.
 *
 * ----------------------------------------------------------------------------
 * Sources composed (each unset / null input contributes nothing):
 *   (a) reviewCadence  governance cadence selects (ConflictFramework c6) →
 *                      check-in, governance meeting, annual review, full
 *                      review, five-year review rules.
 *   (b) adaptive       AdaptiveManagement review (c1) → annual adaptive-review;
 *                      five-year (c5) → founding-anchored five-year-review.
 *   (c) protocols      only ids present in COMMUNITY_PROTOCOL_CADENCES; cadence
 *                      + kind from the catalogue; scopeNotes carried VERBATIM.
 *   (d) membership     one one-off member-ratification rule per PENDING ratify
 *                      member; falls back to team_member invites with a real
 *                      email when the ratify capture is absent.
 *   (e) legal          legal-advice gates with any incomplete gate → ONE
 *                      aggregate legal-review rule; exit-succession 'off'
 *                      toggles → ONE aggregate legal-review rule.
 *   (f) settlement     one one-off settlement-milestone rule per phase with an
 *                      explicit (HASHED) dateISO; complete / undated phases skip.
 *   (g) onboarding     one one-off onboarding-step rule per (pending member ×
 *                      onboarding step), capped at the first 12 steps / member.
 *
 * ----------------------------------------------------------------------------
 * Deliberately NOT generated (covenant + design):
 *   - AdaptiveManagement triggers / escalation / documentation modes — these
 *     are event-driven / record-keeping, not standing calendar work.
 *   - ConflictFramework record-keeping fields (cfRec*) — documentation policy,
 *     not a recurring obligation.
 *   - 'eco-shared-resource-load' (threshold) / 'eco-member-capacity-balance'
 *     (judgment) — event-driven; intentionally ABSENT from
 *     COMMUNITY_PROTOCOL_CADENCES, so (c) never emits them.
 *   - 'ev-s7-financial-plan' and any financial-instrument work — Amanah:
 *     financial instruments need Scholar-Council framing. NEVER add a money /
 *     capital / membership-fee / season-pass rule here.
 *
 * ----------------------------------------------------------------------------
 * One-off hash + date covenant (unit-tested):
 *   - EXPLICIT dates (settlement milestones' dateISO) ARE folded into the
 *     rule's inputsHash, so a date edit flags 'changed' in diffWorkPlan while
 *     the rule key stays stable.
 *   - SYNTHESIZED fallback dates (today+14 for undated membership / legal /
 *     onboarding one-offs) are NOT hashed, so day-to-day regeneration causes no
 *     churn. (The CONTENT that drove them — e.g. the SET of incomplete advice
 *     gates — IS hashed, so resolving one flags 'changed'.)
 *   - A dated one-off whose explicit date falls OUTSIDE the horizon
 *     [todayISO, todayISO+90d] emits NO instance (the rule may still exist as a
 *     proposal-layer record). Synthesized one-offs are in-horizon by
 *     construction (today+14 ≤ today+90).
 */

import type { WorkItemRecurrence } from '../schemas/workItem.schema.js';
import type {
  CommunityWorkInstance,
  CommunityWorkKind,
  CommunityWorkRecurrence,
  CommunityWorkRule,
  CommunityWorkSourceKind,
} from '../schemas/communityWork/communityWork.schema.js';
import { COMMUNITY_PROTOCOL_CADENCES } from '../constants/communityWork/protocolCadences.js';
import { stableStringify } from '../evidence/hashInputs.js';
import { addDaysISO, anchorDatesInRange } from '../livestockWork/expandRecurrence.js';

// ---------------------------------------------------------------------------
// Input types (structural — the apps/web adapter maps capture decoders onto
// these; shared NEVER imports web code. Every field is plain serializable data.)
// ---------------------------------------------------------------------------

/**
 * Decoded ConflictFramework c6 review-cadence selects (decodeConflictFramework
 * `reviewCadence` model `sel`). Each value is the EXACT option string the
 * select can hold, or '' when unset. Mirrors `CADENCE_SELECTS` keys.
 */
export interface CommunityReviewCadenceInput {
  /** 'Weekly' | 'Fortnightly' | 'Monthly' | '' */
  cfCadCheckin?: string;
  /** 'Monthly' | 'Quarterly' | 'Biannual' | '' */
  cfCadGovernance?: string;
  /** 'Annually (February)' | 'Annually (September)' | '' */
  cfCadAnnual?: string;
  /** 'Every 2 years' | 'Annually' | 'Every 5 years' | '' */
  cfCadFull?: string;
  /** 'Year 5 then every 5 years' | '' */
  cfCadFiveYear?: string;
}

/**
 * Decoded AdaptiveManagement `review` model (mode 'review'). The fields the
 * generator reads. `timing` is the EXACT REVIEW_TIMING_OPTIONS string;
 * `facilitator` is the EXACT REVIEW_FACILITATOR_OPTIONS string. Both '' = unset.
 */
export interface CommunityAdaptiveReviewInput {
  /** REVIEW_TIMING_OPTIONS string ('February …' | 'January' | 'September …') | '' */
  timing?: string;
  /** REVIEW_FACILITATOR_OPTIONS string | '' — carried VERBATIM to suggestedCarer. */
  facilitator?: string;
}

/**
 * Decoded legal-advice-gate state (EvLegalGovernance c7 `legalAdviceGate`).
 * `allGateIds` is the full ordered set of gate ids; `clearedGateIds` is the
 * subset present in `adviceScope`. Incomplete = allGateIds \ clearedGateIds.
 * The adapter can also pass human labels keyed by id for nicer detail prose.
 */
export interface CommunityLegalAdviceGatesInput {
  allGateIds: ReadonlyArray<string>;
  clearedGateIds: ReadonlyArray<string>;
  /** Optional id → human label (gc1 → 'ONCA incorporation …') for detail. */
  labels?: Readonly<Record<string, string>>;
}

/**
 * Decoded ExitSuccession `legalReview` toggles (ExitSuccession c5). Each entry
 * is one toggle with its current 'on' | 'off' state. An 'off' toggle is an
 * outstanding legal-review item.
 */
export interface CommunityExitSuccessionTogglesInput {
  toggles: ReadonlyArray<{ key: string; label: string; state: 'on' | 'off' }>;
}

/** A settlement milestone (SettlementPlanCapture, Phase 3 — adapter-fed). */
export interface CommunitySettlementPhaseInput {
  id: string;
  label: string;
  /** YYYY-MM-DD when scheduled; absent → no dated work. */
  dateISO?: string;
  /** true → milestone already reached; no work generated. */
  complete?: boolean;
}

/** An onboarding step (OnboardingCapture, Phase 3 — adapter-fed). */
export interface CommunityOnboardingStepInput {
  id: string;
  /** e.g. 'orientation' | 'agreement' | 'integration' — provenance only. */
  stage: string;
  name: string;
  owner?: string;
  window?: string;
}

/** Structural subset of a resolved protocol the engine reads (mirrors livestock). */
export interface CommunityProtocolInput {
  id: string;
  name: string;
  /** THEN response prose — becomes the instance detail. */
  response?: string;
  /** VERBATIM Amanah caution; carried unreworded byte-for-byte. */
  scopeNotes?: string;
  /** Objective-level anchor when the catalogue sets one. */
  objectiveId?: string;
}

/** A member awaiting ratification (ProvisionBalance c6 ratify capture). */
export interface CommunityRatifyMemberInput {
  id: string;
  name: string;
  /** 'pending' | 'confirmed' | 'offplatform' — only 'pending' generates work. */
  status: string;
}

/** A queued steward invite (StewardCapture). */
export interface CommunityStewardInviteInput {
  id?: string;
  name?: string;
  email?: string;
  /** 'team_member' | 'contractor' | 'landowner' — only team_member generates. */
  role?: string;
}

export interface CommunityWorkGenerationInput {
  /** YYYY-MM-DD — injected, never derived (purity). */
  todayISO: string;
  /** Rolling horizon length; default 90 days. */
  horizonDays?: number;
  /** Community founding year; anchors 'every-5-years' rules. */
  foundingYear?: number;

  // --- (a) governance review cadence (ConflictFramework c6) ---
  reviewCadence?: CommunityReviewCadenceInput;
  // --- (b) adaptive management ---
  /** decodeAdaptiveManagement 'review' model — presence = c1 form recorded. */
  adaptiveReview?: CommunityAdaptiveReviewInput;
  /** presence (truthy) = the AdaptiveManagement five-year (c5) form exists. */
  adaptiveFiveYear?: boolean;
  // --- (e) legal ---
  legalAdviceGates?: CommunityLegalAdviceGatesInput;
  /** OPTIONAL — absent means the ExitSuccession c5 form does not exist. */
  exitSuccessionToggles?: CommunityExitSuccessionTogglesInput;
  // --- (f) settlement ---
  settlementPhases?: ReadonlyArray<CommunitySettlementPhaseInput>;
  // --- (g) onboarding ---
  onboardingSteps?: ReadonlyArray<CommunityOnboardingStepInput>;

  // --- (c) protocols (caller curates to the community-bearing set) ---
  protocols: ReadonlyArray<CommunityProtocolInput>;

  // --- (d) membership ---
  /** true → the ratify capture was recorded; ratifyMembers supersedes invites. */
  ratifyCapturePresent: boolean;
  ratifyMembers: ReadonlyArray<CommunityRatifyMemberInput>;
  stewardInvites: ReadonlyArray<CommunityStewardInviteInput>;

  // --- provenance objective ids (differ per project type) ---
  /** Defaults to the ConflictFramework objective for governance rules. */
  governanceObjectiveId?: string;
}

export interface CommunityWorkPlan {
  rules: CommunityWorkRule[];
  instances: CommunityWorkInstance[];
}

export const DEFAULT_COMMUNITY_HORIZON_DAYS = 90;

/** ConflictFramework c6 objective anchor (matches the cadence catalogue). */
const CONFLICT_FRAMEWORK_OBJECTIVE_ID = 'ev-s1-conflict-framework';
/** AdaptiveManagement objective anchor (from AdaptiveManagementCapture). */
const ADAPTIVE_MANAGEMENT_OBJECTIVE_ID = 'ev-s7-adaptive-management';
/** Governance-meeting protocol id superseded when c6 governance cadence is set. */
const GOVERNANCE_CADENCE_PROTOCOL_ID = 'eco-governance-decision-cadence';
/** Synthesized one-off lead time (days) for undated obligations. */
const SYNTHESIZED_LEAD_DAYS = 14;
/** Cap: onboarding steps generated per pending member. */
const ONBOARDING_STEP_CAP = 12;

// ---------------------------------------------------------------------------
// Hashing (reuse the exact same approach as generateLivestockWorkPlan)
// ---------------------------------------------------------------------------

/** Sync FNV-1a (32-bit) hex hash — change detection only, not crypto. */
function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------------------
// Rule construction
// ---------------------------------------------------------------------------

interface RuleDraft {
  kind: CommunityWorkKind;
  title: string;
  detail?: string;
  scopeNotes?: string;
  sourceKind: CommunityWorkSourceKind;
  sourceId: string;
  sourceProtocolId?: string;
  sourceObjectiveId?: string;
  suggestedCarer?: string;
  recurrence: CommunityWorkRecurrence;
  anchorMonth?: number;
  /** YYYY-MM-DD for explicit-dated one-offs (HASHED). */
  explicitDueDate?: string;
  /**
   * Extra discriminator segments appended to the key after sourceId. Keeps the
   * key stable + unique without bloating sourceId.
   */
  keySuffix?: ReadonlyArray<string>;
}

function buildRule(draft: RuleDraft): CommunityWorkRule {
  const keyParts = ['cwp', draft.sourceKind, draft.sourceId];
  if (draft.keySuffix) keyParts.push(...draft.keySuffix);
  // Hash everything content-bearing PLUS the explicit due date (an explicit
  // date edit must flag 'changed'). Synthesized dates are NEVER passed as
  // explicitDueDate, so they never enter the hash.
  const inputsHash = fnv1a(
    stableStringify({
      kind: draft.kind,
      title: draft.title,
      detail: draft.detail ?? '',
      scopeNotes: draft.scopeNotes ?? '',
      recurrence: draft.recurrence,
      anchorMonth: draft.anchorMonth ?? null,
      explicitDueDate: draft.explicitDueDate ?? '',
      suggestedCarer: draft.suggestedCarer ?? '',
      sourceProtocolId: draft.sourceProtocolId ?? '',
      sourceObjectiveId: draft.sourceObjectiveId ?? '',
    }),
  );
  const rule: CommunityWorkRule = {
    key: keyParts.join('__'),
    kind: draft.kind,
    title: draft.title,
    sourceKind: draft.sourceKind,
    sourceId: draft.sourceId,
    recurrence: draft.recurrence,
    inputsHash,
    ...(draft.detail !== undefined ? { detail: draft.detail } : {}),
    ...(draft.scopeNotes !== undefined ? { scopeNotes: draft.scopeNotes } : {}),
    ...(draft.sourceProtocolId !== undefined
      ? { sourceProtocolId: draft.sourceProtocolId }
      : {}),
    ...(draft.sourceObjectiveId !== undefined
      ? { sourceObjectiveId: draft.sourceObjectiveId }
      : {}),
    ...(draft.suggestedCarer !== undefined
      ? { suggestedCarer: draft.suggestedCarer }
      : {}),
    ...(draft.anchorMonth !== undefined ? { anchorMonth: draft.anchorMonth } : {}),
    ...(draft.explicitDueDate !== undefined
      ? { explicitDueDate: draft.explicitDueDate }
      : {}),
  };
  return rule;
}

// ---------------------------------------------------------------------------
// (a) Governance review cadence (ConflictFramework c6)
// ---------------------------------------------------------------------------

/** Map cfCadCheckin option → recurrence. Unknown / '' → null (no rule). */
function checkinRecurrence(opt: string): CommunityWorkRecurrence | null {
  switch (opt) {
    case 'Weekly':
      return 'weekly';
    case 'Fortnightly':
      return 'fortnightly';
    case 'Monthly':
      return 'monthly';
    default:
      return null;
  }
}

/** Map cfCadGovernance option → recurrence. */
function governanceRecurrence(opt: string): CommunityWorkRecurrence | null {
  switch (opt) {
    case 'Monthly':
      return 'monthly';
    case 'Quarterly':
      return 'quarterly';
    case 'Biannual':
      return 'biannual';
    default:
      return null;
  }
}

/** Map cfCadAnnual option → anchor month (Feb = 2, Sep = 9). */
function annualAnchorMonth(opt: string): number | null {
  switch (opt) {
    case 'Annually (February)':
      return 2;
    case 'Annually (September)':
      return 9;
    default:
      return null;
  }
}

/** Map cfCadFull option → recurrence. */
function fullReviewRecurrence(opt: string): CommunityWorkRecurrence | null {
  switch (opt) {
    case 'Every 2 years':
      return 'biennial';
    case 'Annually':
      return 'annual';
    case 'Every 5 years':
      return 'every-5-years';
    default:
      return null;
  }
}

/**
 * Returns the governance review-cadence rules AND whether the c6 governance
 * cadence was set (so the protocol-layer governance rule can be suppressed —
 * capture supersedes protocol).
 */
function reviewCadenceRules(
  cadence: CommunityReviewCadenceInput | undefined,
  objectiveId: string,
): { rules: CommunityWorkRule[]; governanceCadenceSet: boolean } {
  const rules: CommunityWorkRule[] = [];
  if (!cadence) return { rules, governanceCadenceSet: false };
  const objective = { sourceObjectiveId: objectiveId };

  // check-in
  const checkin = checkinRecurrence(cadence.cfCadCheckin ?? '');
  if (checkin) {
    rules.push(
      buildRule({
        kind: 'governance-meeting',
        title: 'Community check-in — wellbeing & operations',
        detail:
          'Standing community check-in covering member wellbeing and day-to-day operations.',
        sourceKind: 'governance',
        sourceId: 'checkin',
        recurrence: checkin,
        ...objective,
      }),
    );
  }

  // governance meeting
  const governance = governanceRecurrence(cadence.cfCadGovernance ?? '');
  if (governance) {
    rules.push(
      buildRule({
        kind: 'governance-meeting',
        title: 'Governance meeting — agreements & decisions',
        detail:
          'Convene the governance body to review agreements, open decisions, and any unresolved disputes.',
        sourceKind: 'governance',
        sourceId: 'governance-meeting',
        recurrence: governance,
        ...objective,
      }),
    );
  }

  // annual management review
  const annualMonth = annualAnchorMonth(cadence.cfCadAnnual ?? '');
  if (annualMonth !== null) {
    rules.push(
      buildRule({
        kind: 'governance-meeting',
        title: 'Annual management review — land + community health',
        detail:
          'Annual review of land and community health against the prior year.',
        sourceKind: 'governance',
        sourceId: 'annual-review',
        recurrence: 'annual',
        anchorMonth: annualMonth,
        ...objective,
      }),
    );
  }

  // full agreement review & revision
  const full = fullReviewRecurrence(cadence.cfCadFull ?? '');
  if (full) {
    rules.push(
      buildRule({
        kind: 'governance-meeting',
        title: 'Full agreement review & revision',
        detail:
          'Full review and revision of community agreements and governing documents.',
        sourceKind: 'governance',
        sourceId: 'full-review',
        recurrence: full,
        ...objective,
      }),
    );
  }

  // 5-year comprehensive review (Stratum-1 vision)
  if ((cadence.cfCadFiveYear ?? '') === 'Year 5 then every 5 years') {
    rules.push(
      buildRule({
        kind: 'five-year-review',
        title: '5-year comprehensive review — Stratum 1 vision',
        detail:
          'Comprehensive five-year review of the community against its founding Stratum-1 vision.',
        sourceKind: 'governance',
        sourceId: 'five-year-review',
        recurrence: 'every-5-years',
        ...objective,
      }),
    );
  }

  return { rules, governanceCadenceSet: governance !== null };
}

// ---------------------------------------------------------------------------
// (b) Adaptive management
// ---------------------------------------------------------------------------

/**
 * Map a REVIEW_TIMING_OPTIONS string → anchor month, reading the month-prefix
 * of the actual option strings ('February …', 'January', 'September …').
 */
function adaptiveTimingMonth(timing: string): number | undefined {
  if (timing.startsWith('February')) return 2;
  if (timing.startsWith('January')) return 1;
  if (timing.startsWith('September')) return 9;
  return undefined;
}

function adaptiveRules(
  review: CommunityAdaptiveReviewInput | undefined,
  fiveYear: boolean | undefined,
): CommunityWorkRule[] {
  const rules: CommunityWorkRule[] = [];
  const objective = { sourceObjectiveId: ADAPTIVE_MANAGEMENT_OBJECTIVE_ID };

  if (review) {
    const month = adaptiveTimingMonth(review.timing ?? '');
    const facilitator = (review.facilitator ?? '').trim();
    rules.push(
      buildRule({
        kind: 'adaptive-review',
        title: 'Adaptive management review',
        detail:
          'Annual adaptive-management review: compare Observe data against targets and adjust the management protocol.',
        sourceKind: 'adaptive',
        sourceId: 'adaptive-review',
        recurrence: 'annual',
        ...(month !== undefined ? { anchorMonth: month } : {}),
        // facilitator carried VERBATIM (no rewording).
        ...(facilitator !== '' ? { suggestedCarer: facilitator } : {}),
        ...objective,
      }),
    );
  }

  if (fiveYear) {
    rules.push(
      buildRule({
        kind: 'five-year-review',
        title: 'Five-year adaptive review',
        detail:
          'Founding-anchored five-year strategic adaptive review of the community management protocol.',
        sourceKind: 'adaptive',
        sourceId: 'five-year-review',
        recurrence: 'every-5-years',
        ...objective,
      }),
    );
  }

  return rules;
}

// ---------------------------------------------------------------------------
// (c) Protocols
// ---------------------------------------------------------------------------

function protocolRules(
  protocols: ReadonlyArray<CommunityProtocolInput>,
  governanceCadenceSet: boolean,
): CommunityWorkRule[] {
  const out: CommunityWorkRule[] = [];
  for (const p of protocols) {
    // Only ids present in the curated cadence catalogue generate standing work.
    // Threshold / judgment protocols (not in the catalogue) emit NOTHING.
    const cadence = COMMUNITY_PROTOCOL_CADENCES[p.id];
    if (!cadence) continue;
    // Capture supersedes protocol: when the c6 governance cadence is set, skip
    // the governance-decision-cadence protocol rule (it would double the meeting).
    if (governanceCadenceSet && p.id === GOVERNANCE_CADENCE_PROTOCOL_ID) continue;
    out.push(
      buildRule({
        kind: cadence.kind,
        title: p.name,
        ...(p.response !== undefined ? { detail: p.response } : {}),
        // scopeNotes carried VERBATIM byte-for-byte when present.
        ...(p.scopeNotes !== undefined ? { scopeNotes: p.scopeNotes } : {}),
        sourceKind: 'protocol',
        sourceId: p.id,
        sourceProtocolId: p.id,
        ...(p.objectiveId !== undefined ? { sourceObjectiveId: p.objectiveId } : {}),
        recurrence: cadence.recurrence,
      }),
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// (d) Membership — pending members resolve once and are reused by (g)
// ---------------------------------------------------------------------------

interface PendingMember {
  id: string;
  name: string;
}

/**
 * Resolve the set of pending members per the supersession covenant:
 *   - ratify capture present → ratifyMembers with status 'pending'.
 *   - ratify capture absent  → stewardInvites with role 'team_member' AND a
 *     non-empty email (contractor / landowner NEVER generate — Amanah: they are
 *     not members). When the ratify capture is present, invites generate NOTHING.
 */
function resolvePendingMembers(
  input: CommunityWorkGenerationInput,
): PendingMember[] {
  if (input.ratifyCapturePresent) {
    return input.ratifyMembers
      .filter((m) => m.status === 'pending')
      .map((m) => ({ id: m.id, name: m.name }));
  }
  const out: PendingMember[] = [];
  input.stewardInvites.forEach((inv, idx) => {
    if (inv.role !== 'team_member') return;
    const email = (inv.email ?? '').trim();
    if (email === '') return;
    out.push({ id: inv.id ?? `invite-${idx}`, name: (inv.name ?? '').trim() });
  });
  return out;
}

function membershipRules(members: ReadonlyArray<PendingMember>): CommunityWorkRule[] {
  return members.map((m) =>
    buildRule({
      kind: 'member-ratification',
      title: m.name !== '' ? `Ratify member — ${m.name}` : 'Ratify pending member',
      detail:
        'Bring this member through the community ratification process and record the outcome.',
      sourceKind: 'membership',
      sourceId: m.id,
      recurrence: 'once',
      // synthesized due date (today+14) handled at expansion — NOT hashed.
    }),
  );
}

// ---------------------------------------------------------------------------
// (e) Legal — aggregate one-offs (synthesized date NOT hashed; the SET IS)
// ---------------------------------------------------------------------------

function legalRules(input: CommunityWorkGenerationInput): CommunityWorkRule[] {
  const out: CommunityWorkRule[] = [];

  // Advice gates: any incomplete gate → ONE aggregate rule.
  const gates = input.legalAdviceGates;
  if (gates) {
    const cleared = new Set(gates.clearedGateIds);
    const incomplete = gates.allGateIds.filter((id) => !cleared.has(id));
    if (incomplete.length > 0) {
      const labelFor = (id: string): string => gates.labels?.[id] ?? id;
      const list = incomplete.map(labelFor).join('; ');
      out.push(
        buildRule({
          kind: 'legal-review',
          title: 'Complete outstanding legal advice',
          // The incomplete SET drives the detail and therefore the hash:
          // clearing one gate changes the list → inputsHash → diff 'changed'.
          detail: `Outstanding legal-advice items to clear: ${list}.`,
          sourceKind: 'legal',
          sourceId: 'advice-gates',
          recurrence: 'once',
        }),
      );
    }
  }

  // Exit-succession toggles: ONLY when the field is present (the form exists).
  // Any 'off' toggle → ONE aggregate rule.
  const exit = input.exitSuccessionToggles;
  if (exit) {
    const off = exit.toggles.filter((t) => t.state === 'off');
    if (off.length > 0) {
      const list = off.map((t) => t.label).join('; ');
      out.push(
        buildRule({
          kind: 'legal-review',
          title: 'Confirm outstanding exit & succession legal items',
          detail: `Exit / succession legal items not yet confirmed: ${list}.`,
          sourceKind: 'legal',
          sourceId: 'exit-succession-toggles',
          recurrence: 'once',
        }),
      );
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// (f) Settlement — explicit-dated one-offs (dateISO HASHED)
// ---------------------------------------------------------------------------

function settlementRules(
  phases: ReadonlyArray<CommunitySettlementPhaseInput> | undefined,
): CommunityWorkRule[] {
  if (!phases) return [];
  const out: CommunityWorkRule[] = [];
  for (const phase of phases) {
    if (phase.complete === true) continue; // work already done
    if (phase.dateISO === undefined || phase.dateISO === '') continue; // undated → skip
    out.push(
      buildRule({
        kind: 'settlement-milestone',
        title: phase.label,
        detail: 'Settlement milestone scheduled in the community settlement plan.',
        sourceKind: 'settlement',
        sourceId: phase.id,
        recurrence: 'once',
        explicitDueDate: phase.dateISO, // HASHED — date edit flags 'changed'.
      }),
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// (g) Onboarding — (pending member × step), capped at first 12 steps / member
// ---------------------------------------------------------------------------

function onboardingRules(
  members: ReadonlyArray<PendingMember>,
  steps: ReadonlyArray<CommunityOnboardingStepInput> | undefined,
): CommunityWorkRule[] {
  if (!steps || members.length === 0) return [];
  const cappedSteps = steps.slice(0, ONBOARDING_STEP_CAP);
  const out: CommunityWorkRule[] = [];
  for (const member of members) {
    for (const step of cappedSteps) {
      const memberName = member.name !== '' ? member.name : 'pending member';
      out.push(
        buildRule({
          kind: 'onboarding-step',
          title: `${step.name} — ${memberName}`,
          detail:
            step.owner !== undefined && step.owner.trim() !== ''
              ? `Onboarding step (owner: ${step.owner.trim()}).`
              : 'Onboarding step in the community onboarding plan.',
          sourceKind: 'onboarding',
          sourceId: member.id,
          keySuffix: [step.id],
          recurrence: 'once',
          // synthesized due date (today+14) — NOT hashed.
        }),
      );
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Instance expansion — community anchor dates
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

/** Parse YYYY-MM-DD → UTC ms (midnight). NaN on garbage. */
function parseISO(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return Number.NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Format a UTC ms back to YYYY-MM-DD. */
function toISO(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

/**
 * Deterministic anchor-date enumeration for a community rule over
 * [fromISO, toISO] (inclusive). Delegates standard WorkItemRecurrence values to
 * `anchorDatesInRange`; the community extras are handled here.
 *
 *   annual + anchorMonth  → 1st of that month each year in window
 *   fortnightly           → Mondays of EVEN epoch-weeks
 *                           (epoch week = floor(daysSinceUnixEpoch / 7))
 *   biannual              → Jan 1 + Jul 1 each year
 *   every-5-years         → Jan 1 of years ≡ foundingYear (mod 5); when
 *                           foundingYear absent → years divisible by 5
 *   once                  → handled by the caller (explicit / synthesized date)
 */
function communityAnchorDates(
  recurrence: CommunityWorkRecurrence,
  anchorMonth: number | undefined,
  foundingYear: number | undefined,
  fromISO: string,
  horizonISO: string,
): string[] {
  const fromMs = parseISO(fromISO);
  const toMs = parseISO(horizonISO);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs > toMs) {
    return [];
  }

  switch (recurrence) {
    // --- standard WorkItemRecurrence values ---
    case 'daily':
    case 'weekly':
    case 'monthly':
    case 'quarterly':
    case 'biennial':
    case 'every-3-years':
      return anchorDatesInRange(recurrence as WorkItemRecurrence, fromISO, horizonISO);
    case 'annual': {
      // anchorMonth override (governance / adaptive); else delegate to Jan-1 logic.
      if (anchorMonth === undefined) {
        return anchorDatesInRange('annual', fromISO, horizonISO);
      }
      const out: string[] = [];
      const fromYear = new Date(fromMs).getUTCFullYear();
      const toYear = new Date(toMs).getUTCFullYear();
      for (let y = fromYear; y <= toYear; y++) {
        const ms = Date.UTC(y, anchorMonth - 1, 1);
        if (ms >= fromMs && ms <= toMs) out.push(toISO(ms));
      }
      return out;
    }
    // --- community extras ---
    case 'fortnightly': {
      const out: string[] = [];
      for (let ms = fromMs; ms <= toMs; ms += DAY_MS) {
        const d = new Date(ms);
        if (d.getUTCDay() !== 1) continue; // Mondays only
        const epochWeek = Math.floor(ms / DAY_MS / 7);
        if (epochWeek % 2 !== 0) continue; // even epoch-weeks only
        out.push(toISO(ms));
      }
      return out;
    }
    case 'biannual': {
      const out: string[] = [];
      const fromYear = new Date(fromMs).getUTCFullYear();
      const toYear = new Date(toMs).getUTCFullYear();
      for (let y = fromYear; y <= toYear; y++) {
        for (const month of [1, 7]) {
          const ms = Date.UTC(y, month - 1, 1);
          if (ms >= fromMs && ms <= toMs) out.push(toISO(ms));
        }
      }
      return out;
    }
    case 'every-5-years': {
      const out: string[] = [];
      const fromYear = new Date(fromMs).getUTCFullYear();
      const toYear = new Date(toMs).getUTCFullYear();
      const mod = foundingYear !== undefined ? ((foundingYear % 5) + 5) % 5 : 0;
      for (let y = fromYear; y <= toYear; y++) {
        if (((y % 5) + 5) % 5 !== mod) continue;
        const ms = Date.UTC(y, 0, 1);
        if (ms >= fromMs && ms <= toMs) out.push(toISO(ms));
      }
      return out;
    }
    case 'once':
      // Caller resolves the one-off date (explicit or synthesized).
      return [];
    default: {
      const _exhaustive: never = recurrence;
      throw new Error(`Unknown community recurrence: ${String(_exhaustive)}`);
    }
  }
}

/** Denormalise a rule + due date into a schema-shaped instance. */
function buildInstance(rule: CommunityWorkRule, dueDate: string): CommunityWorkInstance {
  return {
    key: `${rule.key}__${dueDate}`,
    ruleKey: rule.key,
    kind: rule.kind,
    dueDate,
    title: rule.title,
    inputsHash: rule.inputsHash,
    ...(rule.detail !== undefined ? { detail: rule.detail } : {}),
    ...(rule.scopeNotes !== undefined ? { scopeNotes: rule.scopeNotes } : {}),
    ...(rule.sourceProtocolId !== undefined
      ? { sourceProtocolId: rule.sourceProtocolId }
      : {}),
    ...(rule.sourceObjectiveId !== undefined
      ? { sourceObjectiveId: rule.sourceObjectiveId }
      : {}),
    ...(rule.suggestedCarer !== undefined
      ? { suggestedCarer: rule.suggestedCarer }
      : {}),
  };
}

/**
 * Expand one rule into dated instances over [todayISO, horizonISO].
 *   - recurrence 'once': exactly one instance, key `${ruleKey}__once`, due on
 *     the explicit date (clamped to the horizon — outside → NO instance) or the
 *     synthesized today+14 fallback (always in-horizon by construction).
 *   - all other recurrences: one instance per community anchor date in window.
 */
function expandCommunityRule(
  rule: CommunityWorkRule,
  todayISO: string,
  horizonISO: string,
  foundingYear: number | undefined,
): CommunityWorkInstance[] {
  if (rule.recurrence === 'once') {
    const fromMs = parseISO(todayISO);
    const toMs = parseISO(horizonISO);
    let dueDate: string;
    if (rule.explicitDueDate !== undefined && rule.explicitDueDate !== '') {
      const dueMs = parseISO(rule.explicitDueDate);
      // Horizon clamp: an explicit date outside [today, horizon] emits no instance.
      if (
        !Number.isFinite(dueMs) ||
        !Number.isFinite(fromMs) ||
        !Number.isFinite(toMs) ||
        dueMs < fromMs ||
        dueMs > toMs
      ) {
        return [];
      }
      dueDate = rule.explicitDueDate;
    } else {
      // Synthesized fallback — in-horizon by construction (today+14 ≤ today+90).
      dueDate = addDaysISO(todayISO, SYNTHESIZED_LEAD_DAYS);
      if (dueDate === '') return [];
    }
    return [
      {
        ...buildInstance(rule, dueDate),
        // One-off instance key uses the stable `__once` suffix (NOT the date) so
        // a synthesized-date edit on regen never re-keys the proposal.
        key: `${rule.key}__once`,
      },
    ];
  }

  const dates = communityAnchorDates(
    rule.recurrence,
    rule.anchorMonth,
    foundingYear,
    todayISO,
    horizonISO,
  );
  return dates.map((d) => buildInstance(rule, d));
}

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------

export function generateCommunityWorkPlan(
  input: CommunityWorkGenerationInput,
): CommunityWorkPlan {
  const governanceObjectiveId =
    input.governanceObjectiveId ?? CONFLICT_FRAMEWORK_OBJECTIVE_ID;

  // (a) governance review cadence — also tells us whether to suppress the
  // governance protocol rule in (c).
  const { rules: cadenceRules, governanceCadenceSet } = reviewCadenceRules(
    input.reviewCadence,
    governanceObjectiveId,
  );

  // (d)/(g) shared pending-member resolution.
  const pendingMembers = resolvePendingMembers(input);

  const rules: CommunityWorkRule[] = [
    ...cadenceRules,
    ...adaptiveRules(input.adaptiveReview, input.adaptiveFiveYear),
    ...protocolRules(input.protocols, governanceCadenceSet),
    ...membershipRules(pendingMembers),
    ...legalRules(input),
    ...settlementRules(input.settlementPhases),
    ...onboardingRules(pendingMembers, input.onboardingSteps),
  ];

  const horizonDays = input.horizonDays ?? DEFAULT_COMMUNITY_HORIZON_DAYS;
  const horizonISO = addDaysISO(input.todayISO, horizonDays);

  const instances: CommunityWorkInstance[] = [];
  for (const rule of rules) {
    instances.push(
      ...expandCommunityRule(rule, input.todayISO, horizonISO, input.foundingYear),
    );
  }

  return { rules, instances };
}
