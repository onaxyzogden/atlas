/**
 * communityWorkInputs — adapter from the project's Plan-decision state to the
 * pure `generateCommunityWorkPlan` engine input (packages/shared), plus the
 * regeneration seam `generateAndApplyCommunityWork`.
 *
 * Mirrors `livestockWorkInputs` in shape and covenant — with one critical
 * constraint: this seam NEVER writes the WorkItem spine. It only refreshes the
 * proposal layer (`communityWorkPlanStore.applyGeneration`); the operator's
 * `confirmProposal` is the sole spine writer (sovereign-steward covenant).
 * Trigger sites: entering the Act work surface + an explicit "Refresh
 * proposals" action, and a community capture save in the Plan shell (rolling
 * horizon — no scheduler).
 *
 * Inputs read (all read-only, decoded through each capture's OWN pure decoder):
 *   - actEvidenceStore.visionFormData — Tier-0 / governance capture FormValues,
 *     keyed by checklist itemId. Decoded via:
 *       ev-s1-conflict-framework-c6  → decodeConflictFramework('reviewCadence')   → reviewCadence
 *       ev-s7-adaptive-management-c1 → decodeAdaptiveManagement('review')         → adaptiveReview
 *       ev-s7-adaptive-management-c5 → presence                                    → adaptiveFiveYear
 *       ev-s1-legal-governance-c7    → decodeLegalGovernance(...,'legalAdviceGate')→ legalAdviceGates
 *       ev-s7-exit-succession-c5     → decodeExitSuccession('legalReview')         → exitSuccessionToggles
 *       ev-s7-settlement-plan-c4/c1  → settlementPhasesFrom(schedule, cohort)      → settlementPhases
 *       ev-s7-onboarding-c1/c2/c4/c6/c5 → onboardingPipelineFrom(...)              → onboardingSteps
 *       ev-s1-provision-balance-c6   → decodeProvisionBalance('ratify')           → ratifyMembers
 *       s1-vision-steward            → decodeSteward                              → stewardInvites
 *   - projectStore — metadata.projectTypeRecord (→ resolveProjectProtocols),
 *     curated to ids present in COMMUNITY_PROTOCOL_CADENCES; scopeNotes carried
 *     VERBATIM byte-for-byte.
 *
 * Covenant guards mirrored from the engine contract:
 *   - legalAdviceGates is PRESENCE-GATED on the c7 form existing (absent form →
 *     undefined; the decoder seeds nothing, but we still gate on presence to
 *     avoid an all-incomplete phantom gate).
 *   - exitSuccessionToggles is ONLY set when the c5 form EXISTS — the decoder
 *     seeds toggle defaults, so feeding an absent form would generate phantom
 *     legal-review work. Absent form → field left undefined.
 *   - protocols are filtered to `id in COMMUNITY_PROTOCOL_CADENCES`; id / name /
 *     response / scopeNotes / objectiveId pass through verbatim.
 */

import {
  generateCommunityWorkPlan,
  resolveProjectProtocols,
  COMMUNITY_PROTOCOL_CADENCES,
} from '@ogden/shared';
import type {
  CommunityWorkGenerationInput,
  CommunityProtocolInput,
  CommunityRatifyMemberInput,
  CommunityStewardInviteInput,
  CommunityReviewCadenceInput,
  CommunityAdaptiveReviewInput,
  CommunityLegalAdviceGatesInput,
  CommunityExitSuccessionTogglesInput,
  CommunitySettlementPhaseInput,
  CommunityOnboardingStepInput,
} from '@ogden/shared';
import { useProjectStore } from '../../store/projectStore.js';
import { useActEvidenceStore } from '../../store/actEvidenceStore.js';
import { useCommunityWorkPlanStore } from '../../store/communityWorkPlanStore.js';
import {
  decodeConflictFramework,
  conflictFrameworkModeFor,
  type SelectModeModel,
} from '../../v3/act/tier-shell/ConflictFrameworkCapture.js';
import {
  decodeAdaptiveManagement,
  adaptiveManagementModeFor,
  ADAPTIVE_MANAGEMENT_PREFIX,
  type ReviewModel,
} from '../../v3/act/tier-shell/AdaptiveManagementCapture.js';
import {
  decodeLegalGovernance,
  legalGovernanceModeFor,
  GATE_ITEMS,
} from '../../v3/act/tier-shell/EvLegalGovernanceCapture.js';
import {
  decodeExitSuccession,
  exitSuccessionModeFor,
  LEGAL_TOGGLES,
} from '../../v3/act/tier-shell/ExitSuccessionCapture.js';
import {
  decodeProvisionBalance,
  provisionBalanceModeFor,
  type RatifyModel,
} from '../../v3/act/tier-shell/ProvisionBalanceCapture.js';
import { decodeSteward } from '../../v3/act/tier-shell/StewardCapture.js';
import {
  settlementPhasesFrom,
  settlementPlanModeFor,
} from '../../v3/act/tier-shell/SettlementPlanCapture.js';
import {
  onboardingPipelineFrom,
  onboardingModeFor,
} from '../../v3/act/tier-shell/OnboardingCapture.js';

// --- Form ids the adapter reads (single source of truth) -------------------
const CONFLICT_FRAMEWORK_CADENCE_ID = 'ev-s1-conflict-framework-c6';
const ADAPTIVE_REVIEW_ID = 'ev-s7-adaptive-management-c1';
const ADAPTIVE_FIVE_YEAR_ID = 'ev-s7-adaptive-management-c5';
const LEGAL_ADVICE_GATE_ID = 'ev-s1-legal-governance-c7';
const EXIT_SUCCESSION_LEGAL_REVIEW_ID = 'ev-s7-exit-succession-c5';
const SETTLEMENT_SCHEDULE_ID = 'ev-s7-settlement-plan-c4';
const SETTLEMENT_COHORT_ID = 'ev-s7-settlement-plan-c1';
const ONBOARDING_APPLICATION_ID = 'ev-s7-onboarding-c1';
const ONBOARDING_TRIAL_ID = 'ev-s7-onboarding-c2';
const ONBOARDING_ORIENTATION_ID = 'ev-s7-onboarding-c4';
const ONBOARDING_INCLUSIONS_ID = 'ev-s7-onboarding-c6';
const ONBOARDING_MENTORSHIP_ID = 'ev-s7-onboarding-c5';
const RATIFY_ID = 'ev-s1-provision-balance-c6';
const STEWARD_ID = 's1-vision-steward';

/**
 * Build the pure engine input from current store state, or null when the
 * project does not exist. An existing project with no community signal still
 * builds (every source empty / absent) — the engine returns an empty plan,
 * which `applyGeneration` uses to retire any now-stale proposals.
 */
export function buildCommunityWorkGenerationInput(
  projectId: string,
  todayISO: string,
): CommunityWorkGenerationInput | null {
  const project = useProjectStore
    .getState()
    .projects.find((p) => p.id === projectId);
  if (!project) return null;

  const forms = useActEvidenceStore.getState().visionFormData[projectId] ?? {};

  // --- (a) governance review cadence (ConflictFramework c6) ----------------
  let reviewCadence: CommunityReviewCadenceInput | undefined;
  const cadenceValue = forms[CONFLICT_FRAMEWORK_CADENCE_ID];
  if (cadenceValue !== undefined) {
    const mode = conflictFrameworkModeFor(CONFLICT_FRAMEWORK_CADENCE_ID);
    if (mode === 'reviewCadence') {
      const decoded = decodeConflictFramework(mode, cadenceValue);
      if (decoded.kind === 'reviewCadence') {
        const sel = (decoded as SelectModeModel).sel;
        reviewCadence = {
          cfCadCheckin: sel.cfCadCheckin ?? '',
          cfCadGovernance: sel.cfCadGovernance ?? '',
          cfCadAnnual: sel.cfCadAnnual ?? '',
          cfCadFull: sel.cfCadFull ?? '',
          cfCadFiveYear: sel.cfCadFiveYear ?? '',
        };
      }
    }
  }

  // --- (b) adaptive management ---------------------------------------------
  let adaptiveReview: CommunityAdaptiveReviewInput | undefined;
  const adaptiveReviewValue = forms[ADAPTIVE_REVIEW_ID];
  if (adaptiveReviewValue !== undefined) {
    const mode = adaptiveManagementModeFor(ADAPTIVE_REVIEW_ID);
    if (mode === 'review') {
      const decoded = decodeAdaptiveManagement(mode, adaptiveReviewValue);
      if (decoded.kind === 'review') {
        const review = decoded as ReviewModel;
        adaptiveReview = {
          timing: review.timing,
          facilitator: review.facilitator,
        };
      }
    }
  }
  const adaptiveFiveYear = forms[ADAPTIVE_FIVE_YEAR_ID] !== undefined;

  // --- (e) legal: advice gates (PRESENCE-GATED on the c7 form) --------------
  let legalAdviceGates: CommunityLegalAdviceGatesInput | undefined;
  const gateValue = forms[LEGAL_ADVICE_GATE_ID];
  if (gateValue !== undefined) {
    const decoded = decodeLegalGovernance(LEGAL_ADVICE_GATE_ID, gateValue);
    if (decoded.kind === 'legalAdviceGate') {
      const labels: Record<string, string> = {};
      for (const g of GATE_ITEMS) labels[g.id] = g.label;
      legalAdviceGates = {
        allGateIds: GATE_ITEMS.map((g) => g.id),
        clearedGateIds: decoded.adviceScope,
        labels,
      };
    }
  }

  // --- (e) legal: exit-succession toggles (ONLY when the c5 form EXISTS) -----
  let exitSuccessionToggles: CommunityExitSuccessionTogglesInput | undefined;
  const exitValue = forms[EXIT_SUCCESSION_LEGAL_REVIEW_ID];
  if (exitValue !== undefined) {
    const mode = exitSuccessionModeFor(EXIT_SUCCESSION_LEGAL_REVIEW_ID);
    if (mode === 'legalReview') {
      const decoded = decodeExitSuccession(mode, exitValue);
      exitSuccessionToggles = {
        toggles: LEGAL_TOGGLES.map((t) => ({
          key: t.key,
          label: t.name,
          state: decoded.choices[t.key] === 'on' ? 'on' : 'off',
        })),
      };
    }
  }

  // --- (f) settlement milestones (SettlementPlan c4 schedule + c1 cohort) ----
  let settlementPhases: CommunitySettlementPhaseInput[] | undefined;
  const scheduleValue = forms[SETTLEMENT_SCHEDULE_ID];
  const cohortValue = forms[SETTLEMENT_COHORT_ID];
  if (scheduleValue !== undefined || cohortValue !== undefined) {
    settlementPhases = settlementPhasesFrom(scheduleValue ?? {}, cohortValue);
  }

  // --- (g) onboarding pipeline (Onboarding c1/c2/c4/c6/c5) -------------------
  let onboardingSteps: CommunityOnboardingStepInput[] | undefined;
  const applicationValue = forms[ONBOARDING_APPLICATION_ID];
  const trialValue = forms[ONBOARDING_TRIAL_ID];
  const orientationValue = forms[ONBOARDING_ORIENTATION_ID];
  const inclusionsValue = forms[ONBOARDING_INCLUSIONS_ID];
  const mentorshipValue = forms[ONBOARDING_MENTORSHIP_ID];
  if (
    applicationValue !== undefined ||
    trialValue !== undefined ||
    orientationValue !== undefined ||
    inclusionsValue !== undefined ||
    mentorshipValue !== undefined
  ) {
    onboardingSteps = onboardingPipelineFrom(
      applicationValue ?? {},
      trialValue ?? {},
      orientationValue ?? {},
      inclusionsValue ?? {},
      mentorshipValue ?? {},
    );
  }

  // --- (d) membership: ratify capture supersedes steward invites ------------
  let ratifyCapturePresent = false;
  const ratifyMembers: CommunityRatifyMemberInput[] = [];
  const ratifyValue = forms[RATIFY_ID];
  if (ratifyValue !== undefined) {
    const mode = provisionBalanceModeFor(RATIFY_ID);
    if (mode === 'ratify') {
      const decoded = decodeProvisionBalance(mode, ratifyValue) as RatifyModel;
      if (decoded.kind === 'ratify') {
        ratifyCapturePresent = true;
        for (const m of decoded.members) {
          ratifyMembers.push({ id: m.id, name: m.name, status: m.status });
        }
      }
    }
  }

  const stewardInvites: CommunityStewardInviteInput[] = [];
  const stewardValue = forms[STEWARD_ID];
  if (stewardValue !== undefined) {
    const decoded = decodeSteward(stewardValue);
    for (const inv of decoded.invites) {
      stewardInvites.push({
        name: inv.name,
        email: inv.email,
        role: inv.role,
      });
    }
  }

  // --- (c) standing protocols, curated to the community-bearing set ---------
  const typeRecord = project.metadata?.projectTypeRecord;
  const protocols: CommunityProtocolInput[] = [];
  if (typeRecord) {
    const resolved = resolveProjectProtocols({
      primaryTypeId: typeRecord.primaryTypeId,
      secondaryTypeIds: typeRecord.secondaryTypeIds,
    });
    for (const p of resolved.protocols) {
      if (!(p.id in COMMUNITY_PROTOCOL_CADENCES)) continue;
      protocols.push({
        id: p.id,
        name: p.name,
        ...(p.response !== undefined ? { response: p.response } : {}),
        ...(p.scopeNotes !== undefined ? { scopeNotes: p.scopeNotes } : {}),
        ...(p.objectiveId !== undefined ? { objectiveId: p.objectiveId } : {}),
      });
    }
  }

  return {
    todayISO,
    reviewCadence,
    adaptiveReview,
    adaptiveFiveYear,
    legalAdviceGates,
    exitSuccessionToggles,
    settlementPhases,
    onboardingSteps,
    protocols,
    ratifyCapturePresent,
    ratifyMembers,
    stewardInvites,
  };
}

/**
 * Regenerate the project's community work plan, refresh the PROPOSAL layer,
 * and return the count of `proposed` proposals now held for this project.
 *
 * NOTE — deliberate deviation from `generateAndApplyLivestockWork` (which
 * returns void): the Plan shell's "N work items proposed — review in Act"
 * toast needs the freshly-proposed count, and reading it from the store path
 * here (rather than at the call site) keeps the count derivation in one place.
 *
 * Never writes the WorkItem spine — `diffWorkPlan` semantics inside
 * `applyGeneration` guarantee dismissed-stays-dismissed and
 * confirmed-never-mutated (changes surface as needsReview).
 */
export function generateAndApplyCommunityWork(projectId: string): number {
  const todayISO = new Date().toISOString().slice(0, 10);
  const input = buildCommunityWorkGenerationInput(projectId, todayISO);
  if (!input) return 0;
  const plan = generateCommunityWorkPlan(input);
  useCommunityWorkPlanStore.getState().applyGeneration(projectId, plan);
  return useCommunityWorkPlanStore
    .getState()
    .proposals.filter(
      (p) => p.projectId === projectId && p.status === 'proposed',
    ).length;
}

/**
 * Is this capture form one of the community decision surfaces the generator
 * reads? Used by the Plan shell to regenerate proposals — and surface the
 * "Review in Act" toast — only when a save can actually change the work plan.
 * StewardCapture has no `*ModeFor` mapper (single-shape capture), so it is
 * matched by its explicit form id.
 */
export function isCommunityCaptureForm(formId: string): boolean {
  if (formId === STEWARD_ID) return true;
  if (conflictFrameworkModeFor(formId) === 'reviewCadence') return true;
  if (provisionBalanceModeFor(formId) === 'ratify') return true;
  if (legalGovernanceModeFor(formId) === 'legalAdviceGate') return true;
  if (exitSuccessionModeFor(formId) === 'legalReview') return true;
  if (formId.startsWith(`${ADAPTIVE_MANAGEMENT_PREFIX}-`)) {
    const mode = adaptiveManagementModeFor(formId);
    if (mode === 'review' || mode === 'fiveyear') return true;
  }
  if (settlementPlanModeFor(formId) !== null) return true;
  if (onboardingModeFor(formId) !== null) return true;
  return false;
}
