/**
 * ActTierZeroWorkbench -- the inline (non-map) Tier-0 container.
 *
 * A 2-pane canvas:
 *   - LEFT  : <DecisionList> for the active objective (css.left).
 *   - RIGHT : <DecisionWorkingPanel> for the selected decision (css.right).
 *
 * The objectives rail has been removed from this component; it is provided by
 * the parent (ActTierShell) via StageShell's leftRail slot.
 *
 * It owns ONLY the active-decision selection state (re-seeded whenever the
 * active objective changes) and the pure item->DecisionPanelTarget derivation.
 * All store reads/writes are lifted to the parent (PB7 ActTierShell wires them);
 * option resolution is pure and done here from the type-id props.
 *
 * ASCII-only: every glyph is a lucide icon rendered by a child; design tokens
 * are project var()s with literal fallbacks (see ActTierZeroWorkbench.module.css).
 */

import { useEffect, useMemo, useState } from 'react';
import { Layers, Users } from 'lucide-react';
import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
  PlanDecisionChecklistItem,
  ProjectTypeId,
} from '@ogden/shared';
import {
  resolveFieldOptions,
  resolveSuccessCriteriaOptions,
  resolveLabourSkills,
  resolveVisionClassifyOptions,
} from '@ogden/shared';
import { findObjectiveGlobally } from '../../plan/objectiveCatalog.js';
import DecisionList from './DecisionList.js';
import DeclarationCenter from './DeclarationCenter.js';
import ReceptionCenter from './ReceptionCenter.js';
import {
  readBuildsOn,
  readIntentLens,
  type ReceptionProgressModel,
  type ReceptionTier,
} from './receptionModel.js';
import TeamRegistryPanel, { TEAM_OBJECTIVE_ID } from './TeamRegistryPanel.js';
import DecisionWorkingPanel, {
  type DecisionPanelTarget,
} from './DecisionWorkingPanel.js';
import { stewardTeamModeFor } from './StewardTeamCapture.js';
import WorkspacePopup from './WorkspacePopup.js';
import { ACT_TOOL_CATALOG, type FormValue } from './actToolCatalog.js';
import {
  workbenchAffordancesFor,
  hasWorkbenchAffordanceEntry,
} from './workbenchAffordances.js';
import { feedsFallback } from '../../copy/index.js';
import {
  useStakeholderRegisterStore,
  EMPTY_STAKEHOLDERS_BY_ID,
} from '../../../store/stakeholderRegisterStore.js';
import css from './ActTierZeroWorkbench.module.css';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ActTierZeroWorkbenchProps {
  projectId: string;
  objectives: readonly PlanStratumObjective[];
  activeObjectiveId: string;
  primaryTypeId?: ProjectTypeId | null;
  secondaryTypeIds?: readonly ProjectTypeId[];
  /** effective per-item progress for ALL objectives (byObjective from useEffectiveChecklistProgress). */
  progressByObjective: Readonly<Record<string, readonly string[]>>;
  /** persisted reads keyed by itemId (== formId). */
  formValues: Record<string, FormValue>;
  rationales: Record<string, string>;
  deferredItems: Record<string, true>;
  onRecord: (itemId: string, value: FormValue, summary: string) => void;
  onSaveRationale: (itemId: string, text: string) => void;
  onToggleDefer: (itemId: string, deferred: boolean) => void;
  /**
   * Plan-only workbench chrome (the Act stage omits it -> byte-identical legacy
   * 2-pane workbench):
   *   - 'declaration' (Tier-0 / Stratum-1): mounts the Declaration header
   *     (DeclarationCenter) above the grid; surfaces the per-objective Act-handoff
   *     chip in the decision list.
   *   - 'reception' (Tier-2 / Stratum-3 Systems Reading): mounts the Reception
   *     header (ReceptionCenter) above the grid; surfaces BOTH the teal
   *     Observe-Output chip and the amber Act-handoff chip in the decision list,
   *     plus the per-survey intent-lens accordion + builds-on row in the panel.
   */
  mode?: 'declaration' | 'reception';
  /**
   * Live per-objective status, keyed by objective id. Consumed by
   * DeclarationCenter / ReceptionCenter to drive the canonical-object cards or
   * survey-sequencing strip. Only read in declaration/reception mode.
   */
  objectiveStatuses?: Readonly<Record<string, PlanStratumObjectiveStatus>>;
  /**
   * Cross-tier reception progress (Tier 1 + Tier 2 fractions + record count),
   * derived by the parent from the FULL objective list. Only read in reception
   * mode -- feeds the ReceptionCenter gate cards.
   */
  receptionProgress?: ReceptionProgressModel;
  /**
   * Which reception tier the active survey is in (Tier 1 Land Reading vs Tier 2
   * Systems Reading). Only read in reception mode; defaults to 'tier2' so the
   * existing S3 mount and the Act surface are unchanged.
   */
  receptionTier?: ReceptionTier;
  /**
   * Optional: select an objective from a sequencing-diagram node (declaration
   * mode). Absent -> sequencing nodes render static. Objective selection is the
   * parent's concern (the left rail owns it), so this is threaded through.
   */
  onSelectObjective?: (objectiveId: string) => void;
  /**
   * OPTIONAL (Plan under the Act Mandate only). Forwarded to the working panel so
   * a locked Plan objective renders display-only (commit handlers no-op, edit
   * controls disabled). Absent in Act + ordinary Plan -> defaults false -> the
   * workbench (and Act) stay byte-identical. The Plan host (PlanTierShell) derives
   * this from useObjectivePlanLock; the workbench itself never reads the lock
   * store, so Act can never become locked.
   */
  readOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Pure item -> DecisionPanelTarget derivation
// ---------------------------------------------------------------------------

/**
 * Build the right-panel target for a checklist item by joining it against the
 * Act tool catalog. The matching form tool (arm.kind === 'form' &&
 * arm.formId === item.id) carries the structured `fields` + `prompt`; a
 * success-criteria item is detected via a repeatable hybrid whose optionSetId
 * is `successCriteriaByType`. Feed labels resolve target objective ids to titles.
 */
export function buildDecisionTarget(
  item: PlanDecisionChecklistItem,
): DecisionPanelTarget {
  const tool = Object.values(ACT_TOOL_CATALOG).find(
    (t) => t.arm.kind === 'form' && t.arm.formId === item.id,
  );
  const fields = tool && tool.arm.kind === 'form' ? tool.arm.fields : undefined;
  const prompt = tool && tool.arm.kind === 'form' ? tool.arm.prompt : undefined;

  const isSuccessCriteria = Boolean(
    fields?.some(
      (f) =>
        f.kind === 'repeatable' &&
        f.item.kind === 'hybrid' &&
        f.item.optionSetId === 'successCriteriaByType',
    ),
  );

  // Labour inventory is detected via the matched form tool's formId. Since the
  // tool is joined by `formId === item.id`, this is true exactly for the labour
  // decision (mirrors the existing form-tool join above). Re-homed to the
  // steward objective by the 2026-06-16 Tier-0 restructure (was s1-vision-labour).
  const isLabourInventory = Boolean(
    tool && tool.arm.kind === 'form' && tool.arm.formId === 's1-steward-c5',
  );

  // Vision-classify is detected directly by item id. Its value shape
  // { committed, aspirational } is byte-compatible with the existing form
  // tool, so the panel's isVisionClassify body-router arm (checked before the
  // generic fields/textarea fallback) takes precedence over any matched form.
  const isVisionClassify = item.id === 's1-vision-classify';

  // Boundary items are detected by id prefix; the panel's isBoundary body-router
  // arm (BoundaryCapture self-routes on itemId) takes precedence over any
  // matched generic form. False for every non-boundary id (e.g. s1-vision-*).
  const isBoundary = item.id.startsWith('s1-boundaries-');

  // Stakeholder items are detected by id prefix; the panel's isStakeholder
  // body-router arm (StakeholderCapture, store-direct) takes precedence over any
  // matched generic form. False for every non-stakeholder id.
  const isStakeholder = item.id.startsWith('s1-stakeholders-');

  // Legal-governance items detected by id prefix; the panel's isLegalGovernance
  // body-router arm (EvLegalGovernanceCapture self-routes on itemId) takes
  // precedence over any matched generic form. False for every other id.
  const isLegalGovernance = item.id.startsWith('ev-s1-legal-governance-');

  // Steward (team member capture) is a single item detected by exact id; the
  // panel's isSteward body-router arm (StewardCapture) takes precedence over any
  // matched generic form. False for every other id.
  const isSteward = item.id === 's1-vision-steward';

  // Steward/Team Object items (s1-steward-c1..c8) detected by id prefix, gated on
  // a non-null capture mode so the labour item (s1-steward-c5 -> null) routes to
  // LabourInventoryCapture via isLabourInventory instead. The panel's
  // isStewardTeam body-router arm (StewardTeamCapture, store-direct) takes
  // precedence over the textarea fallback. Distinct from isSteward above
  // (s1-vision-steward legacy single item) -- different id, no collision.
  const isStewardTeam =
    item.id.startsWith('s1-steward-') && stewardTeamModeFor(item.id) !== null;

  // Purpose (read-only project-type grid + optional elaboration) is a single
  // item detected by exact id; the panel's isPurpose body-router arm
  // (PurposeCapture) takes precedence over the textarea fallback. The primary
  // type is sourced read-only from the project store -- not re-asked here.
  const isPurpose = item.id === 's1-vision-c1';

  // Constraints (non-negotiables + hard constraints register) is a single item
  // detected by exact id; the panel's isConstraints body-router arm
  // (ConstraintsCapture) takes precedence over the textarea fallback.
  const isConstraints = item.id === 's1-vision-constraints';

  // Assumptions (assumptions + known unknowns two-section register) is a single
  // item detected by exact id; the panel's isAssumptions body-router arm
  // (AssumptionsCapture) takes precedence over the textarea fallback.
  const isAssumptions = item.id === 's1-vision-assumptions';

  // Provision-balance is a 6-item objective (ev-s1-provision-balance-c1..-c6);
  // detected by id prefix. The panel's isProvisionBalance body-router arm
  // (ProvisionBalanceCapture self-routes on itemId via provisionBalanceModeFor)
  // takes precedence over any matched generic form. False for every other id.
  const isProvisionBalance = item.id.startsWith('ev-s1-provision-balance-');

  // Terrain is a 5-item objective (s2-terrain-c1..-c5); detected by id prefix.
  // The panel's isTerrain body-router arm (TerrainCapture self-routes on itemId
  // via terrainModeFor) takes precedence over any matched generic form. False
  // for every other id.
  const isTerrain = item.id.startsWith('s2-terrain-');

  // Climate is a 6-item objective (s2-climate-c1..-c6); detected by id prefix.
  // The panel's isClimate body-router arm (ClimateCapture self-routes on itemId
  // via climateModeFor) takes precedence over any matched generic form. False
  // for every other id.
  const isClimate = item.id.startsWith('s2-climate-');

  // Ecology is a universal 5-item objective (s2-ecology-c1..-c5), plus the two
  // orchard / food-forest type-injected panels (s2-ecology-orch-1 pollinator,
  // -orch-2 insectary); all detected by the shared id prefix. The panel's
  // isEcology body-router arm (EcologyCapture self-routes on itemId via
  // ecologyModeFor) takes precedence over any matched generic form. False for
  // every other id.
  const isEcology = item.id.startsWith('s2-ecology-');

  // Landscape context is a 6-item ecovillage objective
  // (ev-s2-landscape-vectors-c1..-c6); detected by id prefix. The panel's
  // isLandscape body-router arm (LandscapeContextCapture self-routes on itemId
  // via landscapeModeFor) takes precedence over any matched generic form. False
  // for every other id.
  const isLandscape = item.id.startsWith('ev-s2-landscape-vectors-');

  // Carrying capacity is a 7-item ecovillage objective
  // (ev-s2-carrying-capacity-c1..-c7); detected by id prefix. The panel's
  // isCarryingCapacity body-router arm (CarryingCapacityCapture self-routes on
  // itemId via carryingCapacityModeFor) takes precedence over any matched
  // generic form. The synthesis (c6) and gate (c7) modes read sibling FormValues
  // via the panel's siblingValues prop. False for every other id.
  const isCarryingCapacity = item.id.startsWith('ev-s2-carrying-capacity-');

  // Forage / pasture survey is a 5-item silvopasture objective
  // (silv-sec-s3-forage-survey-c1..-c5); detected by id prefix. The panel's
  // isForage body-router arm (ForageCapture self-routes on itemId via
  // forageModeFor) takes precedence over any matched generic form. The seasonal
  // (c2), capacity (c3), and constraints (c4) modes read sibling FormValues via
  // the panel's siblingValues prop. False for every other id.
  const isForage = item.id.startsWith('silv-sec-s3-forage-survey-');

  // Grazing system design is a 6-item silvopasture objective
  // (silv-sec-s4-grazing-design-c1..-c6); detected by id prefix. The panel's
  // isGrazing body-router arm (GrazingSystemCapture self-routes on itemId via
  // grazingModeFor) takes precedence over any matched generic form. Advisory
  // only -- no store write, no projectId (the paddock-stocking-density formula
  // reads forage-written paddocks independently). c6 (stockingDensity) is the
  // computed item; the arm still renders its mode body. False for every other id.
  const isGrazing = item.id.startsWith('silv-sec-s4-grazing-design-');

  // Livestock enterprise intent is a 5-item silvopasture objective
  // (silv-sec-s1-livestock-intent-c1..-c5); detected by id prefix. The panel's
  // isLivestockIntent body-router arm (LivestockIntentCapture self-routes on
  // itemId via livestockIntentModeFor) takes precedence over any matched generic
  // form. Advisory only -- no store write, no projectId. c5 (compat) reads the
  // c1/c2/c4 sibling FormValues via the panel's siblingValues prop and is the
  // only gated mode. False for every other id.
  const isLivestockIntent = item.id.startsWith('silv-sec-s1-livestock-intent-');

  // Conflict-resolution & community-agreement framework is a 7-item ecovillage
  // objective (ev-s1-conflict-framework-c1..-c7); detected by id prefix. The
  // panel's isConflictFramework body-router arm (ConflictFrameworkCapture
  // self-routes on itemId via conflictFrameworkModeFor) takes precedence over
  // any matched generic form. Each c1..c7 is self-contained (no siblingValues).
  // False for every other id.
  const isConflictFramework = item.id.startsWith('ev-s1-conflict-framework-');

  // Husbandry & welfare framework is a 6-item silvopasture objective
  // (silv-sec-s4-husbandry-framework-c1..-c6); detected by id prefix. The
  // panel's isHusbandry body-router arm (HusbandryCapture self-routes on itemId
  // via husbandryModeFor) takes precedence over any matched generic form.
  // Advisory only -- no store write, no projectId. Only c4 (halal) gates, on a
  // pathway acknowledgement. False for every other id.
  const isHusbandry = item.id.startsWith('silv-sec-s4-husbandry-framework-');

  // Soil improvement strategy is a 5-item universal objective
  // (s5-soil-improvement-c1..-c5); detected by id prefix. The panel's isSoil
  // body-router arm (SoilImprovementCapture self-routes on itemId via
  // soilImprovementModeFor) takes precedence over any matched generic form.
  // Advisory only -- no store write, no projectId, no gating mode. False for
  // every other id.
  const isSoil = item.id.startsWith('s5-soil-improvement-');

  // Water strategy is a 6-item universal objective
  // (s4-water-strategy-c1..-c6); detected by id prefix. The panel's isWater
  // body-router arm (WaterSystemsCapture self-routes on itemId via
  // waterSystemsModeFor) takes precedence over any matched generic form.
  // Advisory only -- no store write, no projectId, no gating mode. False for
  // every other id.
  const isWater = item.id.startsWith('s4-water-strategy-');

  // Energy systems is a 6-item ecovillage objective
  // (ev-s3-energy-potential-c1..-c6); detected by id prefix. The panel's
  // isEnergy body-router arm (EnergyCapture self-routes on itemId via
  // energyModeFor) takes precedence over any matched generic form. Advisory
  // only -- no store write, no projectId, no gating mode (the c3 hydro mode is
  // conditional but still always recordable). False for every other id.
  const isEnergy = item.id.startsWith('ev-s3-energy-potential-');

  // Phased settlement is a 6-item ecovillage objective
  // (ev-s4-settlement-strategy-c1..-c6); detected by id prefix. The panel's
  // isSettlement body-router arm (SettlementCapture self-routes on itemId via
  // settlementModeFor) takes precedence over any matched generic form.
  // Advisory only -- no store write, no projectId. The habitability hard gates
  // declared in the objective scopeNotes are SURFACED as guidance in the
  // threshold/gates modes, not enforced as a blocking validity gate, so the
  // mode stays always recordable. False for every other id.
  const isSettlement = item.id.startsWith('ev-s4-settlement-strategy-');

  // Biosecurity survey is a 5-item nursery objective
  // (nur-sec-s2-biosecurity-survey-c1..-c5); detected by id prefix. The panel's
  // isBiosecurity body-router arm (BiosecurityCapture self-routes on itemId via
  // biosecurityModeFor) takes precedence over any matched generic form. Advisory
  // only -- no store write, no projectId. Only c5 (sanitation) gates, on the
  // entry/tools/container baseline. False for every other id.
  const isBiosecurity = item.id.startsWith('nur-sec-s2-biosecurity-survey-');

  // Financial contribution model is a 6-item ecovillage objective
  // (ev-s4-financial-model-c1..-c6); detected by id prefix. The panel's
  // isFinancialModel body-router arm (FinancialModelCapture self-routes on
  // itemId via financialModelModeFor) takes precedence over any matched generic
  // form. Advisory only -- no store write, no projectId. The member-agreement
  // gate declared in the objective scopeNotes (no construction until all
  // founding households confirm) is SURFACED as guidance in the ratify mode,
  // not enforced as a blocking validity gate, so the mode stays always
  // recordable. Amanah-reviewed CLEAN: co-owner cost-sharing only (buy-in =
  // equity in the commons, levy, interest-free hardship deferral, pooled
  // reserve) -- no riba/gharar/bay`-ma-laysa-`indak/advance-purchase. False for
  // every other id.
  const isFinancialModel = item.id.startsWith('ev-s4-financial-model-');

  // Propagation infrastructure survey is a 5-item nursery objective
  // (nur-sec-s1-propagation-infra-survey-c1..-c5); detected by id prefix. The
  // panel's isPropagationInfra body-router arm (PropagationInfraCapture
  // self-routes on itemId via propagationInfraModeFor) takes precedence over any
  // matched generic form. Advisory only -- no store write, no projectId. The c4
  // compost calculator is always recordable; c1/c2/c3/c5 gate on at least one
  // entry. False for every other id.
  const isPropagationInfra = item.id.startsWith(
    'nur-sec-s1-propagation-infra-survey-',
  );

  // Member-exit / land-succession is a 5-item ecovillage S7 objective
  // (ev-s7-exit-succession-c1..-c5); detected by id prefix. The panel's
  // isExitSuccession body-router arm (ExitSuccessionCapture self-routes on
  // itemId via exitSuccessionModeFor) renders the form. Advisory only -- no
  // store write, no projectId. False for every other id.
  const isExitSuccession = item.id.startsWith('ev-s7-exit-succession-');

  // Adaptive management protocol is a 5-item ecovillage S7 objective
  // (ev-s7-adaptive-management-c1..-c5); detected by id prefix. The panel's
  // isAdaptiveManagement body-router arm (AdaptiveManagementCapture self-routes
  // on itemId via adaptiveManagementModeFor) takes precedence over any matched
  // generic form. Advisory only -- no store write, no projectId. Each mode gates
  // on at least one entry (agenda / response / doc / scope item). The financial
  // trigger and capital-reserve thresholds are monitoring signals, not
  // advance-sale instruments -- fiqh-clear. False for every other id.
  const isAdaptiveManagement = item.id.startsWith('ev-s7-adaptive-management-');

  // Social-fabric survey is a 6-item Life (Ummah) secondary objective
  // (ev-s2-social-fabric-c1..-c6); detected by id prefix. The panel's
  // isSocialFabric body-router arm (SocialFabricCapture self-routes on itemId
  // via socialFabricModeFor) takes precedence over any matched generic form.
  // Advisory only -- no store write, no projectId. False for every other id.
  const isSocialFabric = item.id.startsWith('ev-s2-social-fabric-');

  // Infra-condition survey is a 5-item Family (Ummah) secondary objective
  // (ev-s3-infra-condition-c1..-c5); detected by id prefix. The panel's
  // isInfraCondition body-router arm (InfraConditionCapture self-routes on itemId
  // via infraConditionModeFor) takes precedence over any matched generic form.
  // Advisory only -- no store write, no projectId. False for every other id.
  const isInfraCondition = item.id.startsWith('ev-s3-infra-condition-');

  // Phased settlement plan is a 6-item ecovillage S7 objective
  // (ev-s7-settlement-plan-c1..-c6); detected by id prefix. The panel's
  // isSettlementPlan body-router arm (SettlementPlanCapture self-routes on itemId
  // via settlementPlanModeFor) takes precedence over any matched generic form.
  // Advisory only -- no store write, no projectId. c3/c6 read sibling values;
  // c5 carries the steward-decision-3 not-self-reported hard gate. False for
  // every other id.
  const isSettlementPlan = item.id.startsWith('ev-s7-settlement-plan-');

  // Membership onboarding is a 6-item ecovillage S7 objective
  // (ev-s7-onboarding-c1..-c6); detected by id prefix. The panel's isOnboarding
  // body-router arm (OnboardingCapture self-routes on itemId via
  // onboardingModeFor) takes precedence over any matched generic form. Advisory
  // only -- no store write, no projectId. Community-integration copy only; no
  // capital instrument. False for every other id.
  const isOnboarding = item.id.startsWith('ev-s7-onboarding-');

  // Communal capital plan is a 6-item ecovillage S7 objective
  // (ev-s7-financial-plan-c1..-c6); detected by id prefix. The panel's
  // isCapitalPlan body-router arm (EcovillageCapitalPlanCapture self-routes on
  // itemId via capitalPlanModeFor) takes precedence over any matched generic
  // form. Advisory only -- no store write, no projectId. c2 reads the c1 sibling
  // (scheduled-vs-required strip); c5 carries the contributions-committed hard
  // gate. AMANAH: the capital-channel enum is the structural fiqh guardrail (no
  // advance-purchase channel; CSRA erased 2026-05-04). False for every other id.
  const isCapitalPlan = item.id.startsWith('ev-s7-financial-plan-');

  // Phase-1 demand capture upgrades two EXISTING universal s7-resource-plan items
  // in place: c1 (labour demand by task/season) and c4 (capital demand by
  // category). The panel's isDemandCapture body-router arm (DemandCapture
  // self-routes on itemId via demandModeFor) takes precedence over the generic
  // form. EXACT-id match (c1/c4 are not contiguous and share their objective with
  // generic c2/c3/c5) -- so no checklist item is added/removed and no
  // decision-group membership changes; completion math is byte-identical. Advisory
  // only -- no store write, no projectId. AMANAH: the capital-demand channel reuses
  // the closed CAPITAL_CHANNEL_LIST enum (no advance-purchase channel; CSRA erased
  // 2026-05-04). False for every other id.
  const isDemandCapture =
    item.id === 's7-resource-plan-c1' || item.id === 's7-resource-plan-c4';

  // s1-vision-c3 (universal) / s1-steward-c6 (typed-project catalogue, post-2026-06-16
  // Tier-0 restructure): two-slider UX for stewardship time + annual budget bands.
  const isCapacityBand = item.id === 's1-vision-c3' || item.id === 's1-steward-c6';

  // The steward item carries a custom defer label (it stays deferrable -- only
  // s1-stakeholders-c3 sets deferrable:false). undefined => default defer copy.
  const deferLabel =
    item.id === 's1-vision-steward'
      ? 'Add team members later in settings'
      : undefined;

  // c3 (Indigenous land relationships / cultural obligations) is mandatory and
  // NON-deferrable (Amanah): hide the defer button. undefined => deferrable for
  // every other item, including the other stakeholder items.
  const deferrable = item.id === 's1-stakeholders-c3' ? false : undefined;

  // An item's explicit feedNote (free-text in-panel callout, e.g. the boundary
  // mixed-mode surface) takes precedence over the feedsInto-derived label
  // (downstream objective titles). Most items carry neither -> null.
  const feedsLabel = item.feedNote
    ? item.feedNote
    : item.feedsInto.length
      ? feedsFallback(
          item.feedsInto.map((id) => findObjectiveGlobally(id)?.title ?? id),
        )
      : null;

  return {
    itemId: item.id,
    label: item.label,
    outcomeTitle: item.outcomeTitle,
    optional: item.optional,
    prompt,
    fields,
    feedsLabel,
    isSuccessCriteria,
    isLabourInventory,
    isVisionClassify,
    isBoundary,
    isStakeholder,
    isLegalGovernance,
    isSteward,
    isStewardTeam,
    isPurpose,
    isConstraints,
    isAssumptions,
    isProvisionBalance,
    isTerrain,
    isClimate,
    isEcology,
    isLandscape,
    isCarryingCapacity,
    isForage,
    isGrazing,
    isLivestockIntent,
    isConflictFramework,
    isHusbandry,
    isSoil,
    isWater,
    isEnergy,
    isSettlement,
    isBiosecurity,
    isFinancialModel,
    isPropagationInfra,
    isExitSuccession,
    isAdaptiveManagement,
    isSocialFabric,
    isInfraCondition,
    isSettlementPlan,
    isOnboarding,
    isCapitalPlan,
    isDemandCapture,
    isCapacityBand,
    deferLabel,
    deferrable,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ActTierZeroWorkbench({
  projectId,
  objectives,
  activeObjectiveId,
  primaryTypeId,
  secondaryTypeIds,
  progressByObjective,
  formValues,
  rationales,
  deferredItems,
  onRecord,
  onSaveRationale,
  onToggleDefer,
  mode,
  objectiveStatuses,
  receptionProgress,
  receptionTier = 'tier2',
  onSelectObjective,
  readOnly = false,
}: ActTierZeroWorkbenchProps): JSX.Element {
  const isDeclaration = mode === 'declaration';
  const isReception = mode === 'reception';
  // Both Plan modes stack a header above the grid, so the grid flexes inside a
  // shell instead of claiming full height.
  const inShell = isDeclaration || isReception;

  const activeObjective =
    objectives.find((o) => o.id === activeObjectiveId) ?? objectives[0];

  // Selection state: list-first -- the workbench opens with NOTHING selected so
  // the full-width scrollable decision list is the entry surface. A decision is
  // chosen by clicking a row, which collapses the list to that tile + the
  // workspace below it.
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Reset to the list whenever the active objective changes, so switching
  // objectives (1.1 -> 1.2) returns to the full list rather than carrying a
  // stale selection into the new objective.
  useEffect(() => {
    setSelectedItemId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeObjectiveId]);

  // Pure option resolution from the project type ids (null -> undefined). The
  // resolvers are pure and cheap; we intentionally do NOT useMemo them because
  // `secondaryTypeIds ?? []` mints a fresh array each render, which would defeat
  // memo stabilization anyway -- computing inline keeps code and intent aligned.
  const primary = primaryTypeId ?? undefined;
  const secondaries = secondaryTypeIds ?? [];
  const scOptions = resolveSuccessCriteriaOptions(primary, secondaries);
  const labourSkills = resolveLabourSkills(primary, secondaries);
  const vcSuggestions = resolveVisionClassifyOptions(primary, secondaries);
  const resolveOptions = (optionSetId: string) =>
    resolveFieldOptions(optionSetId, primary, secondaries);

  // Reactive stakeholder register count for the s1-stakeholders reg-strip.
  // MUST select the STABLE raw byProject object (frozen EMPTY fallback) and
  // derive the count via useMemo -- a fresh-array selector (listForProject)
  // would mint a new array each render and trip the Zustand v5 stable-snapshot
  // infinite-render trap. The hook stays unconditional (above the early return).
  const stakeholdersById = useStakeholderRegisterStore(
    (s) => s.byProject[projectId] ?? EMPTY_STAKEHOLDERS_BY_ID,
  );
  const stakeholderCount = useMemo(
    () => Object.values(stakeholdersById).length,
    [stakeholdersById],
  );

  // ---------- Empty container ----------
  if (!activeObjective) {
    return <div className={css.root} data-empty="true" />;
  }

  const completedForActive = progressByObjective[activeObjective.id] ?? [];

  // Defer ("on hold") ids for THIS objective. deferredItems is project-scoped and
  // itemId-keyed, so restrict to the active checklist before handing it to the
  // list -- mirrors completedForActive.
  const deferredForActive = activeObjective.checklist
    .filter((i) => deferredItems[i.id])
    .map((i) => i.id);

  // Per-objective affordances (map strips, live register strip, decision-group
  // headers, center-list mode mapper) are resolved from a data-driven descriptor
  // keyed by objective id. Any objective without an entry routes to the EMPTY
  // shape -- no strips, no groups, no modeFor -- so S2-S7 objectives mount the
  // generic 2-pane workbench with no special-casing here.
  const affordances = workbenchAffordancesFor(activeObjective.id);

  // Decision-group dividers: a descriptor objective keeps its authored
  // showGroups boolean verbatim (e.g. s1-stakeholders has decisionGroups but is
  // deliberately showGroups:false -- it uses a register-strip narrative, not
  // dividers). A generic objective (no descriptor entry) derives divider
  // behaviour from group presence, so any grouped non-descriptor objective gets
  // dividers without an edit here. decisionGroups is always an array.
  const showGroups = hasWorkbenchAffordanceEntry(activeObjective.id)
    ? affordances.showGroups
    : activeObjective.decisionGroups.length > 0;

  // The live count for a register strip; only the 'stakeholder' kind sources the
  // shared stakeholder register count (0 otherwise).
  const registerCount =
    affordances.registerStrip?.registerKind === 'stakeholder'
      ? stakeholderCount
      : 0;

  const selectedItem =
    activeObjective.checklist.find((i) => i.id === selectedItemId) ?? null;
  const target = selectedItem ? buildDecisionTarget(selectedItem) : null;

  // Single stacked column (both Plan modes): the upper section (map/register
  // strips + DecisionList header + count) is always visible; below it the list
  // fills the body full-width when nothing is selected, or collapses to the
  // chosen tile + the workspace when a decision is selected. In the shell the
  // stack flexes beneath the mode header instead of claiming full height.
  const stackClassName = inShell
    ? `${css.stack} ${css.stackInShell}`
    : css.stack;

  const grid = (
    <div className={stackClassName}>
      {/* ---------- Upper section: map/register strips ---------- */}
      {affordances.mapStrips.map((strip) => (
        <div
          key={strip.testId}
          className={css.mapStrip}
          data-testid={strip.testId}
        >
          <Layers size={15} className={css.mapStripIcon} aria-hidden="true" />
          <span>{strip.text}</span>
        </div>
      ))}
      {affordances.registerStrip ? (
        <div
          className={css.regStrip}
          data-testid={affordances.registerStrip.testId}
        >
          <Users size={14} className={css.regStripIcon} aria-hidden="true" />
          <span
            className={css.regStripCount}
            data-testid={affordances.registerStrip.countTestId}
          >
            {registerCount}
          </span>
          <span className={css.regStripLabel}>
            {affordances.registerStrip.label}
          </span>
          <span className={css.regStripNote}>
            {affordances.registerStrip.note}
          </span>
        </div>
      ) : null}

      {/* ---------- Decision list: full-width, or collapsed to the chosen tile ---------- */}
      <DecisionList
        objective={activeObjective}
        completedItemIds={completedForActive}
        deferredItemIds={deferredForActive}
        selectedItemId={selectedItemId}
        onSelectItem={setSelectedItemId}
        showGroups={showGroups}
        modeFor={affordances.modeFor ?? undefined}
        showActHandoff={isDeclaration || isReception}
        showObserveOutput={isReception}
        // The popup is now the working surface, so the list stays full behind
        // the scrim with the chosen row highlighted; the collapse-to-tile + back
        // affordance is retired in favour of the popup's close controls.
        collapsed={false}
        onBack={() => setSelectedItemId(null)}
      />

      {/* ---------- Workspace: centered-modal popup over the list ---------- */}
      <WorkspacePopup
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItemId(null)}
      >
        {selectedItem && target ? (
          <>
            {/* Declaration-only reference block: the canonical Team Object
                registry sits ABOVE the working panel and only for the team
                objective (1.2). Read-only -- the actual capture is below. */}
            {isDeclaration && activeObjective.id === TEAM_OBJECTIVE_ID ? (
              <TeamRegistryPanel projectId={projectId} />
            ) : null}
            <DecisionWorkingPanel
              decision={target}
              projectId={projectId}
              resolveOptions={resolveOptions}
              successCriteriaOptions={scOptions}
              labourSkillSuggestions={labourSkills}
              visionClassifySuggestions={vcSuggestions}
              initialValue={formValues[selectedItem.id] ?? {}}
              siblingValues={formValues}
              initialRationale={rationales[selectedItem.id] ?? ''}
              deferred={Boolean(deferredItems[selectedItem.id])}
              recorded={completedForActive.includes(selectedItem.id)}
              // Reception (Tier-2) only: the survey objective's per-type intent
              // lens + display-only builds-on line. Same value for every item of
              // the survey (they belong to the objective, not the item).
              // Act/Declaration omit both -> the panel renders byte-identical.
              buildsOn={isReception ? readBuildsOn(activeObjective) : undefined}
              intentLens={
                isReception ? readIntentLens(activeObjective) : undefined
              }
              readOnly={readOnly}
              onRecord={(value, summary) => {
                onRecord(selectedItem.id, value, summary);
              }}
              onSaveRationale={(text) => {
                onSaveRationale(selectedItem.id, text);
              }}
              onToggleDefer={(deferred) => {
                onToggleDefer(selectedItem.id, deferred);
              }}
            />
          </>
        ) : null}
      </WorkspacePopup>
    </div>
  );

  // Act stage (mode omitted): byte-identical legacy 2-pane grid.
  if (!inShell) return grid;

  // Plan Reception: the Tier-2 / Stratum-3 Systems-Reading header stacks above
  // the grid. The cross-tier progress is derived by the parent (it holds the
  // FULL objective list); ReceptionCenter renders the sequencing strip from the
  // current stratum slice + the gate cards from the supplied progress.
  if (isReception) {
    return (
      <div className={css.shell} data-mode="reception">
        <div className={css.declTop}>
          <ReceptionCenter
            objectives={objectives}
            objectiveStatuses={objectiveStatuses ?? {}}
            progress={
              receptionProgress ?? {
                tierOne: { complete: 0, total: 0 },
                tierTwo: { complete: 0, total: 0 },
                totalRecords: 0,
                capturedRecords: 0,
                thresholdOpen: false,
              }
            }
            activeObjectiveId={activeObjectiveId}
            tier={receptionTier}
            onSelectObjective={onSelectObjective}
          />
        </div>
        {grid}
      </div>
    );
  }

  // Plan Declaration: the Tier-0 / Stratum-1 header stacks above the grid.
  return (
    <div className={css.shell} data-mode="declaration">
      <div className={css.declTop}>
        <DeclarationCenter
          objectives={objectives}
          objectiveStatuses={objectiveStatuses ?? {}}
          activeObjectiveId={activeObjectiveId}
          onSelectObjective={onSelectObjective}
        />
      </div>
      {grid}
    </div>
  );
}
