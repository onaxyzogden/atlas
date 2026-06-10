/**
 * DecisionWorkingPanel -- the RIGHT pane of the Tier-0 workbench: the working
 * surface for the currently-selected decision.
 *
 * Presentational + locally-drafted. The component owns a single piece of real
 * state -- the working draft (a FormValue) plus the rationale draft string --
 * seeded from the persisted values passed in and RE-SEEDED whenever the selected
 * decision changes (keyed on decision.itemId). All persistence is lifted to the
 * parent via callbacks (onRecord / onSaveRationale / onToggleDefer); this
 * component never touches the store.
 *
 * Body router (in order -- bespoke arms first, generic fallbacks last):
 *   1. decision.isVisionClassify  -> VisionClassifyCapture over { committed,
 *                                    aspirational }.
 *   2. decision.isLabourInventory -> LabourInventoryCapture over the labour model.
 *   3. decision.isSuccessCriteria -> SuccessCriteriaCapture over { criteria }.
 *   4. decision.fields (non-empty) -> VisionFormFields over the draft.
 *   5. otherwise                   -> a single textarea bound to draft.text.
 *
 * The two bespoke children that hold transient, non-persisted UI state
 * (VisionClassifyCapture's Unclassified staging; LabourInventoryCapture's skill
 * composer) are KEYED on decision.itemId so a decision switch remounts them and
 * resets that state -- the persistence-free analogue of the itemId-keyed draft
 * re-seed below, so staged-but-unsorted items / open composers never bleed across
 * a switch-and-return.
 *
 * Validity drives the Record button + the gate note:
 *   - isVisionClassify:  isVisionClassifyValid (>=1 element classified).
 *   - isLabourInventory: isLabourValid (>=1 labour row).
 *   - fields / success-criteria: isFormValueValid(decision.fields ?? [], draft).
 *   - textarea: draft.text trimmed is non-empty.
 *
 * Token substitutions are documented in DecisionWorkingPanel.module.css. ASCII
 * only: all glyphs are lucide icons.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Clock, MousePointerClick } from 'lucide-react';
import type { CriterionOption } from '@ogden/shared';
import type { FormFieldSpec, FormValue } from './actToolCatalog.js';
import VisionFormFields, {
  initialFormValue,
  isFormValueValid,
  summariseFormValue,
} from './VisionFormFields.js';
import SuccessCriteriaCapture from './SuccessCriteriaCapture.js';
import LabourInventoryCapture, {
  decode,
  isLabourValid,
  summariseLabour,
  rosterSeedFrom,
  type LabourModel,
} from './LabourInventoryCapture.js';
import VisionClassifyCapture, {
  decodeClassify,
  isVisionClassifyValid,
  summariseVisionClassify,
  type ClassifyValue,
} from './VisionClassifyCapture.js';
import BoundaryCapture, {
  boundaryModeFor,
  decodeBoundary,
  isBoundaryValid,
  summariseBoundary,
  type BoundaryModel,
} from './BoundaryCaptureLegacy.js';
import EvLegalGovernanceCapture, {
  legalGovernanceModeFor,
  decodeLegalGovernance,
  isLegalGovernanceValid,
  summariseLegalGovernance,
  type LegalGovernanceModel,
} from './EvLegalGovernanceCapture.js';
import StakeholderCapture, {
  stakeholderModeFor,
  isStakeholderValid,
  summariseStakeholder,
} from './StakeholderCapture.js';
import StewardCapture, {
  decodeSteward,
  isStewardValid,
  summariseSteward,
  type StewardModel,
} from './StewardCapture.js';
import PurposeCapture, {
  decodePurpose,
  isPurposeValid,
  summarisePurpose,
  type PurposeModel,
} from './PurposeCapture.js';
import ConstraintsCapture, {
  decodeConstraints,
  isConstraintsValid,
  summariseConstraints,
  type ConstraintsModel,
} from './ConstraintsCapture.js';
import AssumptionsCapture, {
  decodeAssumptions,
  isAssumptionsValid,
  summariseAssumptions,
  type AssumptionsModel,
} from './AssumptionsCapture.js';
import {
  ProvisionBalanceCapture,
  provisionBalanceModeFor,
  decodeProvisionBalance,
  isProvisionBalanceValid,
  summariseProvisionBalance,
  type ProvisionBalanceMode,
  type ProvisionBalanceModel,
} from './ProvisionBalanceCapture.js';
import {
  TerrainCapture,
  terrainModeFor,
  decodeTerrain,
  isTerrainValid,
  summariseTerrain,
  type TerrainMode,
  type TerrainModel,
} from './TerrainCapture.js';
import {
  ClimateCapture,
  climateModeFor,
  decodeClimate,
  isClimateValid,
  summariseClimate,
  type ClimateMode,
  type ClimateModel,
} from './ClimateCapture.js';
import {
  EcologyCapture,
  ecologyModeFor,
  decodeEcology,
  isEcologyValid,
  summariseEcology,
  type EcologyMode,
  type EcologyModel,
} from './EcologyCapture.js';
import VegetationSurveySummary from '../ecology/VegetationSurveySummary.js';
import SlopeSurveySummary from '../terrain/SlopeSurveySummary.js';
import {
  LandscapeContextCapture,
  landscapeModeFor,
  decodeLandscape,
  isLandscapeValid,
  summariseLandscape,
  type LandscapeMode,
  type LandscapeModel,
} from './LandscapeContextCapture.js';
import {
  CarryingCapacityCapture,
  carryingCapacityModeFor,
  isCarryingCapacityValid,
  summariseCarryingCapacity,
  type CarryingCapacityMode,
} from './CarryingCapacityCapture.js';
import {
  ForageCapture,
  forageModeFor,
  isForageValid,
  summariseForage,
  type ForageMode,
} from './ForageCapture.js';
import {
  GrazingSystemCapture,
  grazingModeFor,
  isGrazingValid,
  summariseGrazing,
  type GrazingMode,
} from './GrazingSystemCapture.js';
import {
  LivestockIntentCapture,
  livestockIntentModeFor,
  isLivestockIntentValid,
  summariseLivestockIntent,
  type LivestockIntentMode,
} from './LivestockIntentCapture.js';
import {
  ConflictFrameworkCapture,
  conflictFrameworkModeFor,
  isConflictFrameworkValid,
  summariseConflictFramework,
  type ConflictFrameworkMode,
} from './ConflictFrameworkCapture.js';
import {
  HusbandryCapture,
  husbandryModeFor,
  isHusbandryValid,
  summariseHusbandry,
  type HusbandryMode,
} from './HusbandryCapture.js';
import {
  SoilImprovementCapture,
  soilImprovementModeFor,
  isSoilImprovementValid,
  summariseSoilImprovement,
  type SoilImprovementMode,
} from './SoilImprovementCapture.js';
import {
  WaterSystemsCapture,
  waterSystemsModeFor,
  isWaterSystemsValid,
  summariseWaterSystems,
  type WaterSystemsMode,
} from './WaterSystemsCapture.js';
import {
  EnergyCapture,
  energyModeFor,
  isEnergyValid,
  summariseEnergy,
  type EnergyMode,
} from './EnergyCapture.js';
import {
  SettlementCapture,
  settlementModeFor,
  isSettlementValid,
  summariseSettlement,
  type SettlementMode,
} from './SettlementCapture.js';
import {
  BiosecurityCapture,
  biosecurityModeFor,
  isBiosecurityValid,
  summariseBiosecurity,
  type BiosecurityMode,
} from './BiosecurityCapture.js';
import {
  FinancialModelCapture,
  financialModelModeFor,
  isFinancialModelValid,
  summariseFinancialModel,
  type FinancialModelMode,
} from './FinancialModelCapture.js';
import {
  PropagationInfraCapture,
  propagationInfraModeFor,
  isPropagationInfraValid,
  summarisePropagationInfra,
  type PropagationInfraMode,
} from './PropagationInfraCapture.js';
import {
  ExitSuccessionCapture,
  exitSuccessionModeFor,
  isExitSuccessionValid,
  summariseExitSuccession,
  type ExitSuccessionMode,
} from './ExitSuccessionCapture.js';
import {
  AdaptiveManagementCapture,
  adaptiveManagementModeFor,
  isAdaptiveManagementValid,
  summariseAdaptiveManagement,
  type AdaptiveManagementMode,
} from './AdaptiveManagementCapture.js';
import {
  useStakeholderRegisterStore,
  EMPTY_STAKEHOLDERS_BY_ID,
} from '../../../store/stakeholderRegisterStore.js';
import { ACT_COPY } from '../../copy/index.js';
import css from './DecisionWorkingPanel.module.css';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface DecisionPanelTarget {
  /** checklist item id (== form tool arm.formId), e.g. 's1-vision-c2'. */
  itemId: string;
  /** decision label -> panel header title. */
  label: string;
  optional?: boolean;
  /** tool prompt -> header hint line. */
  prompt?: string;
  /** the matching form tool's fields (undefined => textarea fallback). */
  fields?: readonly FormFieldSpec[];
  /** resolved "Feeds Observe: ..." text for the callout (null/undefined => no callout). */
  feedsLabel?: string | null;
  /** true => render SuccessCriteriaCapture over the { criteria } value. */
  isSuccessCriteria?: boolean;
  /** true => render LabourInventoryCapture (bespoke labour surface) over the draft. */
  isLabourInventory?: boolean;
  /** true => render VisionClassifyCapture over { committed, aspirational }. */
  isVisionClassify?: boolean;
  /** true => render BoundaryCapture (self-routing on itemId) over the draft. */
  isBoundary?: boolean;
  /** true => render StakeholderCapture (self-routing on itemId, store-direct). */
  isStakeholder?: boolean;
  /** true => render StewardCapture (primary steward + queued invites). */
  isSteward?: boolean;
  /** true => render EvLegalGovernanceCapture (self-routing on itemId) over the draft. */
  isLegalGovernance?: boolean;
  /** true => render PurposeCapture (read-only project-type grid + optional elaboration). */
  isPurpose?: boolean;
  /** true => render ConstraintsCapture (non-negotiables + hard constraints register). */
  isConstraints?: boolean;
  /** true => render AssumptionsCapture (assumptions + known unknowns two-section register). */
  isAssumptions?: boolean;
  /** true => render ProvisionBalanceCapture (self-routing on itemId via provisionBalanceModeFor). */
  isProvisionBalance?: boolean;
  /** true => render TerrainCapture (self-routing on itemId via terrainModeFor). */
  isTerrain?: boolean;
  /** true => render ClimateCapture (self-routing on itemId via climateModeFor). */
  isClimate?: boolean;
  /** true => render EcologyCapture (self-routing on itemId via ecologyModeFor). */
  isEcology?: boolean;
  /** true => render LandscapeContextCapture (self-routing on itemId via landscapeModeFor). */
  isLandscape?: boolean;
  /** true => render CarryingCapacityCapture (self-routing on itemId via carryingCapacityModeFor). */
  isCarryingCapacity?: boolean;
  /** true => render ForageCapture (self-routing on itemId via forageModeFor). */
  isForage?: boolean;
  /** true => render GrazingSystemCapture (self-routing on itemId via grazingModeFor). */
  isGrazing?: boolean;
  /** true => render LivestockIntentCapture (self-routing on itemId via livestockIntentModeFor). */
  isLivestockIntent?: boolean;
  /** true => render ConflictFrameworkCapture (self-routing on itemId via conflictFrameworkModeFor). */
  isConflictFramework?: boolean;
  /** true => render HusbandryCapture (self-routing on itemId via husbandryModeFor). */
  isHusbandry?: boolean;
  /** true => render SoilImprovementCapture (self-routing on itemId via soilImprovementModeFor). */
  isSoil?: boolean;
  /** true => render WaterSystemsCapture (self-routing on itemId via waterSystemsModeFor). */
  isWater?: boolean;
  /** true => render EnergyCapture (self-routing on itemId via energyModeFor). */
  isEnergy?: boolean;
  /** true => render SettlementCapture (self-routing on itemId via settlementModeFor). */
  isSettlement?: boolean;
  /** true => render BiosecurityCapture (self-routing on itemId via biosecurityModeFor). */
  isBiosecurity?: boolean;
  /** true => render FinancialModelCapture (self-routing on itemId via financialModelModeFor). */
  isFinancialModel?: boolean;
  /** true => render PropagationInfraCapture (self-routing on itemId via propagationInfraModeFor). */
  isPropagationInfra?: boolean;
  /** true => render ExitSuccessionCapture (self-routing on itemId via exitSuccessionModeFor). */
  isExitSuccession?: boolean;
  /** true => render AdaptiveManagementCapture (self-routing on itemId via adaptiveManagementModeFor). */
  isAdaptiveManagement?: boolean;
  /** false => hide the defer button (e.g. mandatory non-deferrable c3). undefined/true => deferrable. */
  deferrable?: boolean;
  /** custom resting defer-button label (e.g. steward "Add team members later in settings"). undefined => legacy strings. */
  deferLabel?: string;
}

export interface DecisionWorkingPanelProps {
  /** owning project id; required by the stakeholder register subscription. */
  projectId: string;
  /** null => empty state. */
  decision: DecisionPanelTarget | null;
  /** for VisionFormFields hybrids. */
  resolveOptions: (optionSetId: string) => readonly string[];
  /** for SuccessCriteriaCapture chips. */
  successCriteriaOptions: readonly CriterionOption[];
  /** resolved skill suggestions for LabourInventoryCapture (LC4 populates; default []). */
  labourSkillSuggestions?: readonly string[];
  /** suggestions for VisionClassifyCapture chips. */
  visionClassifySuggestions?: readonly string[];
  /** persisted structured value for this formId ({} => seed via initialFormValue(fields)). */
  initialValue: FormValue;
  /**
   * OPTIONAL full per-item FormValue map (id -> value). Read ONLY by the
   * CarryingCapacityCapture arm (its synthesis/gate modes compute across the
   * sibling resource items). Every other capture ignores it. Defaults to {}.
   */
  siblingValues?: Record<string, FormValue>;
  /** persisted rationale text. */
  initialRationale: string;
  /** current defer annotation for this decision. */
  deferred: boolean;
  /** whether the decision is already complete (effective progress). */
  recorded: boolean;
  /** parent does saveVisionFormData + setItemComplete. */
  onRecord: (value: FormValue, summary: string) => void;
  /** parent does saveDecisionRationale. */
  onSaveRationale: (text: string) => void;
  /** parent does setDecisionDeferred. */
  onToggleDefer: (deferred: boolean) => void;
}

// ---------------------------------------------------------------------------
// Local value coercion (VisionFormFields does NOT export these).
// ---------------------------------------------------------------------------

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : '')) : [];
}

function hasKeys(value: FormValue): boolean {
  return Object.keys(value).length > 0;
}

/** Seed the working draft for a decision from the persisted value (or a fresh one). */
function seedDraft(
  decision: DecisionPanelTarget,
  initialValue: FormValue,
): FormValue {
  if (hasKeys(initialValue)) return initialValue;
  return decision.fields ? initialFormValue(decision.fields) : { text: '' };
}

const MIN_CRITERIA = 3;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DecisionWorkingPanel({
  projectId,
  decision,
  resolveOptions,
  successCriteriaOptions,
  labourSkillSuggestions,
  visionClassifySuggestions = [],
  initialValue,
  siblingValues = {},
  initialRationale,
  deferred,
  recorded,
  onRecord,
  onSaveRationale,
  onToggleDefer,
}: DecisionWorkingPanelProps): JSX.Element {
  // The only real state: the working draft + the rationale draft. Seeded once on
  // mount and RE-SEEDED whenever the selected decision changes (keyed on itemId).
  const [draft, setDraft] = useState<FormValue>(() =>
    decision ? seedDraft(decision, initialValue) : {},
  );
  const [rationaleDraft, setRationaleDraft] = useState<string>(initialRationale);

  const itemId = decision?.itemId ?? null;

  // Always holds the LATEST typed rationale so the effect cleanup can flush the
  // freshest value rather than a stale closure capture. Assigned on every render.
  const rationaleDraftRef = useRef<string>(rationaleDraft);
  rationaleDraftRef.current = rationaleDraft;

  // Re-seed the draft + rationale whenever the selected decision changes. Keyed
  // on itemId so switching decisions (or returning to one) reloads its persisted
  // value rather than carrying the previous decision's edits.
  //
  // The cleanup flushes the OUTGOING decision's rationale before re-seeding (and
  // on unmount). `initialRationale` and `onSaveRationale` here are the closure
  // values from the render that CREATED this effect -- i.e. bound to the OUTGOING
  // item -- which is exactly what we want. This covers switches that never blur
  // the textarea (e.g. programmatic selection); the onBlur save remains as a
  // complementary, idempotent path. Saving only when the value actually changed
  // avoids spurious writes and keeps the flush off the keystroke path.
  useEffect(() => {
    if (!decision) return;
    setDraft(seedDraft(decision, initialValue));
    setRationaleDraft(initialRationale);
    return () => {
      if (rationaleDraftRef.current !== initialRationale) {
        onSaveRationale(rationaleDraftRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  // Reactive read of THIS project's stakeholder register, used only by the
  // stakeholder arm for validity / summary / gate-note. Stable-snapshot pattern:
  // select the raw byProject bucket (a stable ref) or the frozen empty constant,
  // and derive the array via useMemo. NEVER call listForProject in the selector
  // (it mints a fresh array each call -> infinite re-render under Zustand v5).
  const stakeholderRowsById = useStakeholderRegisterStore(
    (s) => s.byProject[projectId] ?? EMPTY_STAKEHOLDERS_BY_ID,
  );
  const stakeholderRows = useMemo(
    () => Object.values(stakeholderRowsById),
    [stakeholderRowsById],
  );

  // ---------- Empty state ----------
  if (!decision) {
    return (
      <div className={css.root}>
        <div className={css.empty}>
          <span className={css.emptyIcon} aria-hidden="true">
            <MousePointerClick size={22} />
          </span>
          <div className={css.emptyTxt}>
            Select a decision from the list to work through it here.
          </div>
        </div>
      </div>
    );
  }

  const fields = decision.fields;
  const hasFields = Boolean(fields && fields.length > 0);

  // Decode the draft into the labour model once -- reused by validity, the gate
  // note, and the record summary so labour never routes through the generic
  // FormValue engine.
  const labourModel: LabourModel | null = decision.isLabourInventory
    ? decode(draft)
    : null;
  // Pre-fill the labour roster from the sibling StewardCapture decision's invited
  // people (names + roles); shown until the roster is persisted (first edit).
  const labourRosterSeed = decision.isLabourInventory
    ? rosterSeedFrom(decodeSteward(siblingValues['s1-vision-steward'] ?? {}))
    : undefined;

  // Decode the draft into the classify model once -- reused by validity, the
  // record summary, and the body renderer (mirrors the labour pattern above).
  const classifyModel: ClassifyValue | null = decision.isVisionClassify
    ? decodeClassify(draft)
    : null;

  // Decode the draft into the boundary model once -- reused by validity, the
  // gate note, the record summary, and the body renderer (mirrors the labour /
  // classify patterns above). BoundaryCapture self-routes on itemId internally.
  const boundaryModel: BoundaryModel | null = decision.isBoundary
    ? decodeBoundary(decision.itemId, draft)
    : null;

  // Decode the draft into the steward model once -- reused by validity and the
  // record summary (mirrors the boundary / labour / classify patterns above).
  // StewardCapture is controlled over the flat draft and self-derives the
  // primary-steward display from auth.
  const stewardModel: StewardModel | null = decision.isSteward
    ? decodeSteward(draft)
    : null;

  // Decode the draft into the purpose model once -- reused by validity and the
  // record summary. PurposeCapture renders a read-only project-type grid plus
  // an optional elaboration textarea. Always valid (elaboration is optional;
  // primary type is set at project creation).
  const purposeModel: PurposeModel | null = decision.isPurpose
    ? decodePurpose(draft)
    : null;

  // Decode the draft into the constraints model once -- reused by validity,
  // the gate note, the record summary, and the body renderer (mirrors the
  // purpose / labour patterns above). ConstraintsCapture owns a two-tab
  // surface (Suggest + Register) and embeds its own gate-warning + feeds blocks
  // because feedsLabel is null for s1-vision-constraints.
  const constraintsModel: ConstraintsModel | null = decision.isConstraints
    ? decodeConstraints(draft)
    : null;

  // Decode the draft into the assumptions model once -- reused by validity,
  // the gate note, the record summary, and the body renderer (mirrors the
  // constraints pattern above). AssumptionsCapture owns a two-section surface
  // (Assumptions + Known unknowns) and embeds its own feeds block because
  // feedsLabel is null for s1-vision-assumptions.
  const assumptionsModel: AssumptionsModel | null = decision.isAssumptions
    ? decodeAssumptions(draft)
    : null;

  // Provision-balance is a 6-mode capture (matrix/food/financial/entitlement/
  // tension/ratify) routed by provisionBalanceModeFor(itemId). Decode once for
  // validity, the gate note, the record summary, and the body renderer.
  const provisionMode: ProvisionBalanceMode | null = decision.isProvisionBalance
    ? provisionBalanceModeFor(decision.itemId)
    : null;
  const provisionModel: ProvisionBalanceModel | null = provisionMode
    ? decodeProvisionBalance(provisionMode, draft)
    : null;

  // Terrain is a 5-mode capture (mapSource/slope/elevation/landform/erosion)
  // routed by terrainModeFor(itemId). Decode once for validity, the gate note,
  // the record summary, and the body renderer (mirrors the provision pattern).
  const terrainMode: TerrainMode | null = decision.isTerrain
    ? terrainModeFor(decision.itemId)
    : null;
  const terrainModel: TerrainModel | null = terrainMode
    ? decodeTerrain(terrainMode, draft)
    : null;

  // Climate is a 6-mode capture (rainfall/wind/temperature/solar/fire/
  // microclimate) routed by climateModeFor(itemId). Decode once for validity,
  // the gate note, the record summary, and the body renderer (mirrors terrain).
  const climateMode: ClimateMode | null = decision.isClimate
    ? climateModeFor(decision.itemId)
    : null;
  const climateModel: ClimateModel | null = climateMode
    ? decodeClimate(climateMode, draft)
    : null;

  // Ecology is a 5-mode capture (vegetation/species/corridors/connectivity/
  // waterHabitat) routed by ecologyModeFor(itemId). Decode once for validity,
  // the gate note, the record summary, and the body renderer (mirrors climate).
  const ecologyMode: EcologyMode | null = decision.isEcology
    ? ecologyModeFor(decision.itemId)
    : null;
  const ecologyModel: EcologyModel | null = ecologyMode
    ? decodeEcology(ecologyMode, draft)
    : null;

  // Landscape is a 6-mode capture (landUse/sprayRisk/planning/community/
  // disputes/catchment) routed by landscapeModeFor(itemId). Decode once for
  // validity, the gate note, the record summary, and the body renderer
  // (mirrors the ecology pattern above).
  const landscapeMode: LandscapeMode | null = decision.isLandscape
    ? landscapeModeFor(decision.itemId)
    : null;
  const landscapeModel: LandscapeModel | null = landscapeMode
    ? decodeLandscape(landscapeMode, draft)
    : null;

  // Carrying capacity is a 7-mode capture (water/food/waste/energy/space/
  // synthesis/gate) routed by carryingCapacityModeFor(itemId). Unlike the other
  // captures it validates / summarises directly off the FormValue (its synthesis
  // and gate modes also read the sibling resource items), so no decoded model is
  // held here -- only the resolved mode is needed for the gate-note, summary, and
  // body-router arms below.
  const carryingCapacityMode: CarryingCapacityMode | null =
    decision.isCarryingCapacity
      ? carryingCapacityModeFor(decision.itemId)
      : null;

  // Forage / pasture survey is a 5-mode capture (zones/seasonal/capacity/
  // constraints/toxic) routed by forageModeFor(itemId). Like carrying capacity
  // it validates / summarises directly off the FormValue (its seasonal, capacity,
  // and constraints modes also read the sibling c1 zones), so only the resolved
  // mode is held here -- used by the summary and body-router arms below.
  const forageMode: ForageMode | null =
    decision.isForage ? forageModeFor(decision.itemId) : null;

  // Grazing system design is a 6-mode capture (grazingMethod/paddockLayout/
  // grazeRest/treeProtection/contingency/stockingDensity) routed by
  // grazingModeFor(itemId). Advisory only -- it validates / summarises directly
  // off the FormValue and writes no store / takes no projectId. Only the
  // resolved mode is held here -- used by the validity, summary, and body arms.
  const grazingMode: GrazingMode | null =
    decision.isGrazing ? grazingModeFor(decision.itemId) : null;

  // Livestock enterprise intent is a 5-mode capture (rationale/species/
  // relationship/capacity/compat) routed by livestockIntentModeFor(itemId).
  // Advisory only -- it validates / summarises directly off the FormValue and
  // writes no store / takes no projectId. compat (c5) reads c1/c2/c4 via
  // siblingValues. Only the resolved mode is held here -- used by the validity,
  // summary, and body arms.
  const livestockIntentMode: LivestockIntentMode | null =
    decision.isLivestockIntent ? livestockIntentModeFor(decision.itemId) : null;
  // Conflict-resolution & community-agreement framework is a 7-mode capture
  // (decisionProcess/disputePathway/communityAgreements/exitProcess/dissolution/
  // reviewCadence/signOff) routed by conflictFrameworkModeFor(itemId). Each mode
  // is self-contained (no sibling reads), so only the resolved mode is held here
  // -- used by validity, gate-note, summary, and body-router arms below. The
  // signOff (c7) mode is a pre-land-work HARD GATE.
  const conflictFrameworkMode: ConflictFrameworkMode | null =
    decision.isConflictFramework
      ? conflictFrameworkModeFor(decision.itemId)
      : null;

  // Husbandry & welfare framework is a 6-mode capture (health/breeding/welfare/
  // halal/records/labour) routed by husbandryModeFor(itemId). Advisory only --
  // it validates / summarises directly off the FormValue and writes no store /
  // takes no projectId. Only halal (c4) gates (pathway acknowledgement). Only
  // the resolved mode is held here -- used by the validity, summary, body arms.
  const husbandryMode: HusbandryMode | null =
    decision.isHusbandry ? husbandryModeFor(decision.itemId) : null;

  // Soil improvement strategy is a 5-mode capture (fertility/schedule/equipment/
  // priority/baseline) routed by soilImprovementModeFor(itemId). Advisory only --
  // it validates / summarises directly off the FormValue and writes no store /
  // takes no projectId. No mode gates (every mode always recordable). Only the
  // resolved mode is held here -- used by the validity, summary, body arms.
  const soilMode: SoilImprovementMode | null =
    decision.isSoil ? soilImprovementModeFor(decision.itemId) : null;

  // Same advisory shape as soil: in-slice universal water strategy capture,
  // no store write, no projectId, no mode gates. waterSystemsModeFor resolves
  // c1..c6; held here for the validity, summary, and body arms below.
  const waterMode: WaterSystemsMode | null =
    decision.isWater ? waterSystemsModeFor(decision.itemId) : null;

  // Same advisory shape as soil/water: out-of-slice ecovillage energy systems
  // capture, no store write, no projectId, no mode gates. energyModeFor
  // resolves c1..c6; held here for the validity, summary, and body arms below.
  const energyMode: EnergyMode | null =
    decision.isEnergy ? energyModeFor(decision.itemId) : null;

  // Same advisory shape as soil/water/energy: out-of-slice ecovillage phased
  // settlement capture, no store write, no projectId. No blocking mode gates --
  // the habitability hard gates declared in scopeNotes are surfaced as guidance
  // in the threshold/gates modes, so every mode stays always recordable.
  // settlementModeFor resolves c1..c6; held here for the validity, summary, and
  // body arms below.
  const settlementMode: SettlementMode | null =
    decision.isSettlement ? settlementModeFor(decision.itemId) : null;

  // Biosecurity survey is a 5-mode capture (soilDisease/insectPest/weedMedia/
  // ingress/sanitation) routed by biosecurityModeFor(itemId). Advisory only --
  // it validates / summarises directly off the FormValue and writes no store /
  // takes no projectId. Only sanitation (c5) gates (entry/tools/container
  // baseline). Only the resolved mode is held here -- used by the validity,
  // summary, body arms.
  const biosecurityMode: BiosecurityMode | null =
    decision.isBiosecurity ? biosecurityModeFor(decision.itemId) : null;

  // Same advisory shape as soil/water/energy/settlement: out-of-slice ecovillage
  // financial contribution model, no store write, no projectId. No blocking mode
  // gates -- the member-agreement gate declared in scopeNotes (no construction
  // until all founding households confirm) is surfaced as guidance in the ratify
  // mode, so every mode stays always recordable. Amanah-reviewed CLEAN (co-owner
  // cost-sharing only). financialModelModeFor resolves c1..c6; held here for the
  // validity, summary, and body arms below.
  const financialModelMode: FinancialModelMode | null =
    decision.isFinancialModel ? financialModelModeFor(decision.itemId) : null;

  // Propagation-infrastructure survey is a 5-mode capture (infraInventory /
  // condition / mediaInputs / compostCapacity / mediaSourcing) routed by
  // propagationInfraModeFor(itemId). Advisory only -- it validates / summarises
  // directly off the FormValue and writes no store / takes no projectId. The c4
  // compost calculator is always recordable; c1/c2/c3/c5 gate on at least one
  // entry. Only the resolved mode is held here -- used by the validity, summary,
  // body arms.
  const propagationInfraMode: PropagationInfraMode | null =
    decision.isPropagationInfra
      ? propagationInfraModeFor(decision.itemId)
      : null;

  // Member-exit / land-succession is a 5-mode capture (exitProcess /
  // dwellingTransfer / landReversion / dissolution / legalReview) routed by
  // exitSuccessionModeFor(itemId). Advisory only -- validates / summarises
  // directly off the FormValue, writes no store / takes no projectId.
  const exitSuccessionMode: ExitSuccessionMode | null =
    decision.isExitSuccession
      ? exitSuccessionModeFor(decision.itemId)
      : null;

  // Adaptive management protocol (ev-s7-adaptive-management c1..c5: review /
  // triggers / escalation / documentation / fiveyear) routed by
  // adaptiveManagementModeFor(itemId). Advisory only -- validates / summarises
  // directly off the FormValue, writes no store / takes no projectId.
  const adaptiveManagementMode: AdaptiveManagementMode | null =
    decision.isAdaptiveManagement
      ? adaptiveManagementModeFor(decision.itemId)
      : null;

  // Decode the draft into the legal-governance model once -- reused by validity,
  // the gate note, the record summary, and the body renderer (mirrors the
  // boundary pattern above). EvLegalGovernanceCapture self-routes on itemId.
  const legalGovernanceModel: LegalGovernanceModel | null =
    decision.isLegalGovernance
      ? decodeLegalGovernance(decision.itemId, draft)
      : null;

  // ---------- Validity ----------
  let valid: boolean;
  if (decision.isVisionClassify) {
    valid = isVisionClassifyValid(classifyModel!);
  } else if (decision.isBoundary) {
    valid = isBoundaryValid(decision.itemId, boundaryModel!);
  } else if (decision.isLegalGovernance) {
    valid = isLegalGovernanceValid(decision.itemId, legalGovernanceModel!);
  } else if (decision.isLabourInventory) {
    valid = isLabourValid(labourModel!);
  } else if (decision.isStakeholder) {
    valid = isStakeholderValid(decision.itemId, stakeholderRows, draft);
  } else if (decision.isSteward) {
    valid = isStewardValid(stewardModel!);
  } else if (decision.isPurpose) {
    valid = isPurposeValid(purposeModel!);
  } else if (decision.isConstraints) {
    valid = isConstraintsValid(constraintsModel!);
  } else if (decision.isAssumptions) {
    valid = isAssumptionsValid(assumptionsModel!);
  } else if (provisionMode) {
    valid = isProvisionBalanceValid(provisionModel!);
  } else if (terrainMode) {
    valid = isTerrainValid(terrainModel!);
  } else if (climateMode) {
    valid = isClimateValid(climateModel!);
  } else if (ecologyMode) {
    valid = isEcologyValid(ecologyModel!);
  } else if (landscapeMode) {
    valid = isLandscapeValid(landscapeMode, landscapeModel!);
  } else if (carryingCapacityMode) {
    valid = isCarryingCapacityValid(carryingCapacityMode, draft);
  } else if (forageMode) {
    valid = isForageValid(forageMode, draft);
  } else if (grazingMode) {
    valid = isGrazingValid(grazingMode, draft);
  } else if (livestockIntentMode) {
    valid = isLivestockIntentValid(livestockIntentMode, draft);
  } else if (conflictFrameworkMode) {
    valid = isConflictFrameworkValid(conflictFrameworkMode, draft);
  } else if (husbandryMode) {
    valid = isHusbandryValid(husbandryMode, draft);
  } else if (soilMode) {
    valid = isSoilImprovementValid(soilMode, draft);
  } else if (waterMode) {
    valid = isWaterSystemsValid(waterMode, draft);
  } else if (energyMode) {
    valid = isEnergyValid(energyMode, draft);
  } else if (settlementMode) {
    valid = isSettlementValid(settlementMode, draft);
  } else if (biosecurityMode) {
    valid = isBiosecurityValid(biosecurityMode, draft);
  } else if (financialModelMode) {
    valid = isFinancialModelValid(financialModelMode, draft);
  } else if (propagationInfraMode) {
    valid = isPropagationInfraValid(propagationInfraMode, draft);
  } else if (exitSuccessionMode) {
    valid = isExitSuccessionValid(exitSuccessionMode, draft);
  } else if (adaptiveManagementMode) {
    valid = isAdaptiveManagementValid(adaptiveManagementMode, draft);
  } else if (decision.isSuccessCriteria || hasFields) {
    valid = isFormValueValid(fields ?? [], draft);
  } else {
    valid = asString(draft.text).trim() !== '';
  }
  const invalid = !valid;

  // ---------- Gate note ----------
  let gateNote: JSX.Element | null = null;
  if (invalid) {
    if (decision.isVisionClassify) {
      gateNote = (
        <div className={css.gateNote}>
          Classify at least one element before recording
        </div>
      );
    } else if (decision.isBoundary) {
      const mode = boundaryModeFor(decision.itemId);
      let note: string;
      if (mode === 'map') {
        note =
          'Confirm boundaries have been reviewed on the base layer to record.';
      } else if (mode === 'doc') {
        note =
          decision.itemId === 's1-boundaries-c1'
            ? 'Set a document status to record.'
            : 'Select at least one obligation type to record.';
      } else if (mode === 'mapEntry') {
        note =
          'Add at least one easement, or mark "No implications", to record.';
      } else {
        // decision mode = c4 (zoning), c5 (water), c7 (permits). c7/permits is
        // always valid (isBoundaryValid returns true unconditionally), so it
        // never reaches this gate note; only c4 and c5 do. If permit validity
        // ever gains a rule, add an explicit c7 arm here so it does not fall
        // through to the water-source copy.
        note =
          decision.itemId === 's1-boundaries-c4'
            ? 'Select a zoning classification and a review flag to record.'
            : 'Select at least one water source and a status to record.';
      }
      gateNote = <div className={css.gateNote}>{note}</div>;
    } else if (decision.isLegalGovernance) {
      const mode = legalGovernanceModeFor(decision.itemId);
      const note =
        mode === 'legalAdviceGate'
          ? 'Clear all 5 advice-scope items and confirm written advice before recording.'
          : mode === 'entityDecisionRecord'
            ? 'Document the rationale (why, enables, constrains) to record.'
            : 'Complete the required selection to record.';
      gateNote = <div className={css.gateNote}>{note}</div>;
    } else if (decision.isStakeholder) {
      // Only c1 (mapContact, needs >=1 neighbour) and c2 (contact/authority,
      // needs >=1 authority) can be invalid; c3/c4/c5/c6 are always valid, so
      // their modes never reach this gate note.
      const mode = stakeholderModeFor(decision.itemId);
      const note =
        mode === 'mapContact'
          ? 'Add at least one neighbour to record.'
          : 'Add at least one authority contact to record.';
      gateNote = <div className={css.gateNote}>{note}</div>;
    } else if (decision.isLabourInventory && labourModel) {
      // Ready once at least one roster person carries seasonal hours + a skill.
      const missing: string[] = [];
      // Check if any person has seasonal hours (import hasAnySeasonal helper if needed)
      const hasAnyHours = labourModel.roster.some((p) =>
        p.seasonal.spring > 0 ||
        p.seasonal.summer > 0 ||
        p.seasonal.autumn > 0 ||
        p.seasonal.winter > 0,
      );
      if (!hasAnyHours) {
        missing.push('weekly hours for a person');
      }
      if (!labourModel.roster.some((p) => p.skills.length >= 1)) {
        missing.push('at least one skill');
      }
      gateNote = (
        <div className={css.gateNote}>
          Add <strong>{missing.join(', ')}</strong> before recording
        </div>
      );
    } else if (decision.isSuccessCriteria) {
      const filled = asArray(draft.criteria).filter(
        (c) => c.trim() !== '',
      ).length;
      const remaining = Math.max(0, MIN_CRITERIA - filled);
      gateNote = (
        <div className={css.gateNote}>
          <strong>{remaining}</strong> more criteria needed before recording
        </div>
      );
    } else if (decision.isConstraints) {
      gateNote = (
        <div className={css.gateNote}>
          Add at least one constraint to record this decision
        </div>
      );
    } else if (decision.isAssumptions) {
      gateNote = (
        <div className={css.gateNote}>
          Add at least 1 assumption and 1 known unknown to record
        </div>
      );
    } else if (provisionMode) {
      const note =
        provisionMode === 'matrix'
          ? 'Assign all 7 infrastructure domains to record'
          : provisionMode === 'entitlement'
            ? 'Enter a private floor area to record'
            : provisionMode === 'tension'
              ? 'Resolve all 3 tensions to record'
              : provisionMode === 'ratify'
                ? 'Confirm all founding members to record'
                : 'Select an option to record this decision';
      gateNote = <div className={css.gateNote}>{note}</div>;
    } else if (terrainMode) {
      const note =
        terrainMode === 'mapSource'
          ? 'Select a primary data source to record'
          : terrainMode === 'slope'
            ? 'Allocate slope classes to total 100% to record'
            : terrainMode === 'elevation'
              ? 'Enter highest and lowest elevation (highest >= lowest) to record'
              : terrainMode === 'landform'
                ? 'Add at least one landform feature to record'
                : 'Choose a risk level, or flag mass movement, to record';
      gateNote = <div className={css.gateNote}>{note}</div>;
    } else if (ecologyMode) {
      const ecologyNotes: Record<EcologyMode, string> = {
        vegetation: 'Record at least one community type to record',
        species: 'Tick a native group, or log an invasive, to record',
        corridors: 'Select at least one corridor or nesting feature to record',
        connectivity: 'Choose a connectivity score to record',
        waterHabitat: 'Flag a water habitat, or affirm none present, to record',
        pollinator: 'Set a guild observation or the provision score to record',
        insectary:
          'Plan a bloom window, nesting provision, or insectary bed to record',
      };
      gateNote = (
        <div className={css.gateNote}>{ecologyNotes[ecologyMode]}</div>
      );
    } else if (landscapeMode) {
      const note =
        landscapeMode === 'landUse'
          ? 'Add at least one land use to record'
          : landscapeMode === 'sprayRisk'
            ? 'Add a risk with a name and severity to record'
            : landscapeMode === 'planning'
              ? 'Classify the planning environment to record'
              : landscapeMode === 'community'
                ? 'Add at least one organisation or contact to record'
                : landscapeMode === 'disputes'
                  ? 'Add a dispute record, or capture key lessons, to record'
                  : 'Assess at least one contamination vector to record';
      gateNote = <div className={css.gateNote}>{note}</div>;
    } else if (carryingCapacityMode === 'gate') {
      gateNote = (
        <div className={css.gateNote}>
          Select a pathway (confirm, defer, or redesign) to record
        </div>
      );
    } else if (conflictFrameworkMode) {
      const note =
        conflictFrameworkMode === 'signOff'
          ? 'All 4 founding households must sign before land work unlocks'
          : conflictFrameworkMode === 'communityAgreements'
            ? 'Adopt at least one community agreement to record'
            : conflictFrameworkMode === 'decisionProcess'
              ? 'Choose a primary decision model and quorum to record'
              : conflictFrameworkMode === 'disputePathway'
                ? 'Choose a resolver for all 3 dispute tiers to record'
                : 'Complete the required selections to record';
      gateNote = <div className={css.gateNote}>{note}</div>;
    } else {
      gateNote = (
        <div className={css.gateNote}>
          Complete the required fields before recording
        </div>
      );
    }
  }

  // ---------- Record ----------
  const handleRecord = () => {
    if (invalid) return;
    let summary: string;
    if (decision.isVisionClassify) {
      summary = summariseVisionClassify(classifyModel!);
    } else if (decision.isBoundary) {
      summary = summariseBoundary(decision.itemId, boundaryModel!);
    } else if (decision.isLegalGovernance) {
      summary = summariseLegalGovernance(decision.itemId, legalGovernanceModel!);
    } else if (decision.isLabourInventory) {
      summary = summariseLabour(labourModel!);
    } else if (decision.isStakeholder) {
      summary = summariseStakeholder(decision.itemId, stakeholderRows, draft);
    } else if (decision.isSteward) {
      summary = summariseSteward(stewardModel!);
    } else if (decision.isPurpose) {
      summary = summarisePurpose(purposeModel!);
    } else if (decision.isConstraints) {
      summary = summariseConstraints(constraintsModel!);
    } else if (decision.isAssumptions) {
      summary = summariseAssumptions(assumptionsModel!);
    } else if (provisionMode) {
      summary = summariseProvisionBalance(provisionModel!);
    } else if (terrainMode) {
      summary = summariseTerrain(terrainModel!);
    } else if (climateMode) {
      summary = summariseClimate(climateModel!);
    } else if (ecologyMode) {
      summary = summariseEcology(ecologyModel!);
    } else if (landscapeMode) {
      summary = summariseLandscape(landscapeMode, landscapeModel!);
    } else if (carryingCapacityMode) {
      summary = summariseCarryingCapacity(
        carryingCapacityMode,
        draft,
        siblingValues,
      );
    } else if (forageMode) {
      summary = summariseForage(forageMode, draft, siblingValues);
    } else if (grazingMode) {
      summary = summariseGrazing(grazingMode, draft, siblingValues);
    } else if (livestockIntentMode) {
      summary = summariseLivestockIntent(livestockIntentMode, draft, siblingValues);
    } else if (conflictFrameworkMode) {
      summary = summariseConflictFramework(conflictFrameworkMode, draft);
    } else if (husbandryMode) {
      summary = summariseHusbandry(husbandryMode, draft);
    } else if (soilMode) {
      summary = summariseSoilImprovement(soilMode, draft);
    } else if (waterMode) {
      summary = summariseWaterSystems(waterMode, draft);
    } else if (energyMode) {
      summary = summariseEnergy(energyMode, draft);
    } else if (settlementMode) {
      summary = summariseSettlement(settlementMode, draft);
    } else if (biosecurityMode) {
      summary = summariseBiosecurity(biosecurityMode, draft, siblingValues);
    } else if (financialModelMode) {
      summary = summariseFinancialModel(financialModelMode, draft);
    } else if (propagationInfraMode) {
      summary = summarisePropagationInfra(
        propagationInfraMode,
        draft,
        siblingValues,
      );
    } else if (exitSuccessionMode) {
      summary = summariseExitSuccession(exitSuccessionMode, draft);
    } else if (adaptiveManagementMode) {
      summary = summariseAdaptiveManagement(
        adaptiveManagementMode,
        draft,
        siblingValues,
      );
    } else if (fields) {
      summary = summariseFormValue(fields, draft);
    } else {
      summary = asString(draft.text);
    }
    onRecord(draft, summary);
  };

  // ---------- Defer label ----------
  // Two-state, GATED so only targets carrying an explicit deferLabel (e.g. the
  // steward arm) diverge from the legacy strings. All other targets keep the
  // byte-for-byte legacy copy.
  const deferLabelFor = (isDeferred: boolean): string => {
    if (decision.deferLabel) {
      return isDeferred ? ACT_COPY.workingPanel.addLater : decision.deferLabel;
    }
    return isDeferred
      ? ACT_COPY.workingPanel.deferDeferred
      : ACT_COPY.workingPanel.deferActive;
  };

  return (
    <div className={css.root}>
      {/* ---------- Header ---------- */}
      <div className={css.header}>
        <div className={css.eyebrowRow}>
          <span className={css.eyebrow}>{ACT_COPY.workingPanel.workingOn}</span>
          {recorded ? (
            <span className={css.recordedBadge}>
              <Check size={12} />
              {ACT_COPY.workingPanel.recorded}
            </span>
          ) : null}
        </div>
        <div className={css.title}>
          {decision.label}
          {decision.optional ? (
            <span className={css.optBadge}>{ACT_COPY.decisionList.optional}</span>
          ) : null}
        </div>
        {decision.prompt ? (
          <div className={css.hint}>{decision.prompt}</div>
        ) : null}
      </div>

      {/* ---------- Body router ---------- */}
      <div className={css.body}>
        {decision.isVisionClassify ? (
          <VisionClassifyCapture
            key={decision.itemId}
            value={classifyModel!}
            onChange={(next) =>
              setDraft((d) => ({
                ...d,
                committed: next.committed,
                aspirational: next.aspirational,
              }))
            }
            suggestions={visionClassifySuggestions}
          />
        ) : decision.isSuccessCriteria ? (
          <SuccessCriteriaCapture
            value={{ criteria: asArray(draft.criteria) }}
            onChange={(next) =>
              setDraft((d) => ({ ...d, criteria: next.criteria }))
            }
            options={successCriteriaOptions}
          />
        ) : decision.isLabourInventory ? (
          <LabourInventoryCapture
            key={decision.itemId}
            value={draft}
            onChange={setDraft}
            skillSuggestions={labourSkillSuggestions ?? []}
            rosterSeed={labourRosterSeed}
          />
        ) : decision.isBoundary ? (
          <BoundaryCapture
            key={decision.itemId}
            itemId={decision.itemId}
            value={draft}
            onChange={setDraft}
            resolveOptions={resolveOptions}
          />
        ) : decision.isStakeholder ? (
          <StakeholderCapture
            key={decision.itemId}
            itemId={decision.itemId}
            projectId={projectId}
            resolveOptions={resolveOptions}
            markerValue={draft}
            onMarkerChange={setDraft}
          />
        ) : decision.isSteward ? (
          <StewardCapture
            key={decision.itemId}
            itemId={decision.itemId}
            value={draft}
            onChange={setDraft}
            resolveOptions={resolveOptions}
          />
        ) : decision.isLegalGovernance ? (
          <EvLegalGovernanceCapture
            key={decision.itemId}
            itemId={decision.itemId}
            value={draft}
            onChange={setDraft}
            resolveOptions={resolveOptions}
          />
        ) : decision.isPurpose ? (
          <PurposeCapture
            key={decision.itemId}
            itemId={decision.itemId}
            projectId={projectId}
            value={draft}
            onChange={setDraft}
          />
        ) : decision.isConstraints ? (
          <ConstraintsCapture
            key={decision.itemId}
            value={draft}
            onChange={setDraft}
          />
        ) : decision.isAssumptions ? (
          <AssumptionsCapture
            key={decision.itemId}
            value={draft}
            onChange={setDraft}
          />
        ) : provisionMode ? (
          <ProvisionBalanceCapture
            key={decision.itemId}
            mode={provisionMode}
            value={draft}
            onChange={setDraft}
          />
        ) : terrainMode === 'slope' ? (
          // s2-terrain-c2 slope distribution is drawn on the map (per-class
          // polygons → auto-% of site) instead of hand-typed; the aspects
          // multi-select stays inline. Mirrors the ecology 'vegetation' case.
          <SlopeSurveySummary
            key={decision.itemId}
            projectId={projectId}
            value={draft}
            onChange={setDraft}
          />
        ) : terrainMode ? (
          <TerrainCapture
            key={decision.itemId}
            mode={terrainMode}
            value={draft}
            onChange={setDraft}
          />
        ) : climateMode ? (
          <ClimateCapture
            key={decision.itemId}
            mode={climateMode}
            value={draft}
            onChange={setDraft}
          />
        ) : ecologyMode === 'vegetation' ? (
          <VegetationSurveySummary
            key={decision.itemId}
            projectId={projectId}
            value={draft}
            onChange={setDraft}
          />
        ) : ecologyMode ? (
          <EcologyCapture
            key={decision.itemId}
            mode={ecologyMode}
            value={draft}
            onChange={setDraft}
          />
        ) : landscapeMode ? (
          <LandscapeContextCapture
            key={decision.itemId}
            mode={landscapeMode}
            value={draft}
            onChange={setDraft}
          />
        ) : carryingCapacityMode ? (
          <CarryingCapacityCapture
            key={decision.itemId}
            mode={carryingCapacityMode}
            value={draft}
            onChange={setDraft}
            itemId={decision.itemId}
            siblingValues={siblingValues}
          />
        ) : forageMode ? (
          <ForageCapture
            key={decision.itemId}
            mode={forageMode}
            value={draft}
            onChange={setDraft}
            itemId={decision.itemId}
            siblingValues={siblingValues}
            projectId={projectId}
          />
        ) : grazingMode ? (
          <GrazingSystemCapture
            key={decision.itemId}
            mode={grazingMode}
            value={draft}
            onChange={setDraft}
            itemId={decision.itemId}
            siblingValues={siblingValues}
          />
        ) : livestockIntentMode ? (
          <LivestockIntentCapture
            key={decision.itemId}
            mode={livestockIntentMode}
            value={draft}
            onChange={setDraft}
            itemId={decision.itemId}
            projectId={projectId}
            siblingValues={siblingValues}
          />
        ) : conflictFrameworkMode ? (
          <ConflictFrameworkCapture
            key={decision.itemId}
            mode={conflictFrameworkMode}
            value={draft}
            onChange={setDraft}
            itemId={decision.itemId}
            projectId={projectId}
          />
        ) : husbandryMode ? (
          <HusbandryCapture
            key={decision.itemId}
            mode={husbandryMode}
            value={draft}
            onChange={setDraft}
            itemId={decision.itemId}
            siblingValues={siblingValues}
          />
        ) : soilMode ? (
          <SoilImprovementCapture
            key={decision.itemId}
            mode={soilMode}
            value={draft}
            onChange={setDraft}
            itemId={decision.itemId}
            siblingValues={siblingValues}
          />
        ) : waterMode ? (
          <WaterSystemsCapture
            key={decision.itemId}
            mode={waterMode}
            value={draft}
            onChange={setDraft}
            itemId={decision.itemId}
            siblingValues={siblingValues}
          />
        ) : energyMode ? (
          <EnergyCapture
            key={decision.itemId}
            mode={energyMode}
            value={draft}
            onChange={setDraft}
            itemId={decision.itemId}
            siblingValues={siblingValues}
          />
        ) : settlementMode ? (
          <SettlementCapture
            key={decision.itemId}
            mode={settlementMode}
            value={draft}
            onChange={setDraft}
            itemId={decision.itemId}
            siblingValues={siblingValues}
          />
        ) : biosecurityMode ? (
          <BiosecurityCapture
            key={decision.itemId}
            mode={biosecurityMode}
            value={draft}
            onChange={setDraft}
            itemId={decision.itemId}
            siblingValues={siblingValues}
          />
        ) : financialModelMode ? (
          <FinancialModelCapture
            key={decision.itemId}
            mode={financialModelMode}
            value={draft}
            onChange={setDraft}
            itemId={decision.itemId}
            siblingValues={siblingValues}
          />
        ) : propagationInfraMode ? (
          <PropagationInfraCapture
            key={decision.itemId}
            mode={propagationInfraMode}
            value={draft}
            onChange={setDraft}
            itemId={decision.itemId}
            siblingValues={siblingValues}
          />
        ) : exitSuccessionMode ? (
          <ExitSuccessionCapture
            key={decision.itemId}
            mode={exitSuccessionMode}
            value={draft}
            onChange={setDraft}
          />
        ) : adaptiveManagementMode ? (
          <AdaptiveManagementCapture
            key={decision.itemId}
            mode={adaptiveManagementMode}
            value={draft}
            onChange={setDraft}
            itemId={decision.itemId}
            siblingValues={siblingValues}
          />
        ) : hasFields ? (
          <VisionFormFields
            fields={fields ?? []}
            value={draft}
            onChange={setDraft}
            resolveOptions={resolveOptions}
          />
        ) : (
          <textarea
            className={css.fallbackTextarea}
            aria-label={decision.label}
            value={asString(draft.text)}
            placeholder={ACT_COPY.workingPanel.decisionPlaceholder}
            onChange={(e) =>
              setDraft((d) => ({ ...d, text: e.target.value }))
            }
          />
        )}

        <div className={css.ratBlock}>
          <div className={css.secLbl}>
            <span>{ACT_COPY.workingPanel.whyThese}</span>
            <span className={css.secOptional}>{ACT_COPY.workingPanel.whyTheseOptional}</span>
          </div>
          <textarea
            className={css.ratTa}
            aria-label="Rationale"
            value={rationaleDraft}
            placeholder={ACT_COPY.workingPanel.rationalePlaceholder}
            onChange={(e) => setRationaleDraft(e.target.value)}
            onBlur={() => onSaveRationale(rationaleDraft)}
          />
        </div>
      </div>

      {/* ---------- Footer ---------- */}
      <div className={css.foot}>
        {decision.feedsLabel ? (
          <div className={css.feedsBlock}>
            <ArrowRight size={14} className={css.feedsIcon} aria-hidden="true" />
            <div className={css.feedsTxt}>{decision.feedsLabel}</div>
          </div>
        ) : null}

        {gateNote}

        <div className={css.actions}>
          <button
            type="button"
            className={css.recordBtn}
            disabled={invalid}
            data-locked={invalid ? 'true' : 'false'}
            onClick={handleRecord}
          >
            <Check size={15} />
            {ACT_COPY.workingPanel.recordButton}
          </button>
          {decision.deferrable === false ? null : (
            <button
              type="button"
              className={css.deferBtn}
              data-deferred={deferred ? 'true' : 'false'}
              aria-pressed={deferred}
              onClick={() => onToggleDefer(!deferred)}
            >
              <Clock size={14} className={css.deferIcon} />
              {deferLabelFor(deferred)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
