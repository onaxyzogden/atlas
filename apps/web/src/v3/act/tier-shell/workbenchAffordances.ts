/**
 * workbenchAffordances -- data-driven per-objective affordance descriptor.
 *
 * ActTierZeroWorkbench used to hard-code three `is<X>Objective` id checks that
 * drove what renders above/around the left DecisionList (map-activation strips,
 * a live register strip, decision-group headers, and the center-list mode
 * mapper). This module lifts those per-objective decisions into a static
 * descriptor table so a future objective only needs an entry here -- no edits
 * to the component.
 *
 * Any objective id WITHOUT an entry routes to the frozen EMPTY_AFFORDANCES
 * shape: no strips, no groups, and a null modeFor. That is the "any id routes
 * safely" guarantee -- an arbitrary S2-S7 objective mounts the generic 2-pane
 * workbench with zero special-casing.
 *
 * ASCII-only; the strings are transcribed verbatim from the prior inline JSX so
 * the rendered DOM is byte-identical for the three existing objectives.
 */

import { boundaryModeFor } from './BoundaryCaptureLegacy.js';
import { stakeholderModeFor } from './StakeholderCapture.js';
import { legalGovernanceModeFor } from './EvLegalGovernanceCapture.js';
import { terrainModeFor } from './TerrainCapture.js';
import { climateModeFor } from './ClimateCapture.js';
import { ecologyModeFor } from './EcologyCapture.js';
import { landscapeModeFor } from './LandscapeContextCapture.js';
import { carryingCapacityModeFor } from './CarryingCapacityCapture.js';
import { forageModeFor } from './ForageCapture.js';
import { grazingModeFor } from './GrazingSystemCapture.js';
import { livestockIntentModeFor } from './LivestockIntentCapture.js';
import { conflictFrameworkModeFor } from './ConflictFrameworkCapture.js';
import { husbandryModeFor } from './HusbandryCapture.js';
import { soilImprovementModeFor } from './SoilImprovementCapture.js';
import { waterSystemsModeFor } from './WaterSystemsCapture.js';
import { energyModeFor } from './EnergyCapture.js';
import { settlementModeFor } from './SettlementCapture.js';
import { biosecurityModeFor } from './BiosecurityCapture.js';
import { financialModelModeFor } from './FinancialModelCapture.js';
import { propagationInfraModeFor } from './PropagationInfraCapture.js';
import { adaptiveManagementModeFor } from './AdaptiveManagementCapture.js';
import { exitSuccessionModeFor } from './ExitSuccessionCapture.js';
import { socialFabricModeFor } from './SocialFabricCapture.js';
import { infraConditionModeFor } from './InfraConditionCapture.js';

export interface MapStripSpec {
  testId: string;
  text: string;
}

export interface RegisterStripSpec {
  testId: string;
  countTestId: string;
  label: string;
  note: string;
  /** Discriminant for the component's live-count source. */
  registerKind: 'stakeholder';
}

export interface WorkbenchObjectiveAffordances {
  mapStrips: MapStripSpec[];
  registerStrip: RegisterStripSpec | null;
  showGroups: boolean;
  modeFor: ((itemId: string) => string | null) | null;
}

/**
 * Frozen empty affordance set returned for any objective id without an entry.
 * Shared singleton so callers can rely on a stable reference.
 */
const EMPTY_AFFORDANCES: WorkbenchObjectiveAffordances = Object.freeze({
  mapStrips: [],
  registerStrip: null,
  showGroups: false,
  modeFor: null,
});

// S1 vision, goals & stewardship capacity (universal U-S1.1): 8 checklist items
// (one optional steward) across the catalogue's 2 existing decision groups
// (Purpose & intent / Capacity & constraints). showGroups true; no map/register
// strips. Unlike the other objectives, the items have no "capture mode" -- they
// have artifact TYPES -- so the resolver is a STATIC itemId -> namespaced "vs-"
// key map (matching the li-/hb-/si- namespacing convention used to avoid label
// collisions). DecisionList carries matching vs-* labels, icons, and a per-kind
// badge color via MODE_BADGE_KIND.
const VISION_ARTIFACT_BADGE: Record<string, string> = {
  's1-vision-c1': 'vs-purpose',
  's1-vision-c2': 'vs-criteria',
  's1-vision-steward': 'vs-steward',
  's1-vision-labour': 'vs-labour',
  's1-vision-c3': 'vs-capital',
  's1-vision-constraints': 'vs-constraints',
  's1-vision-classify': 'vs-classify',
  's1-vision-assumptions': 'vs-assumptions',
};

const MAP: Record<string, WorkbenchObjectiveAffordances> = {
  's1-vision': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) => VISION_ARTIFACT_BADGE[itemId] ?? null,
  },
  's1-boundaries': {
    mapStrips: [
      {
        testId: 'boundary-map-strip',
        text: '2 overlays will activate on the map: Risk / Compliance, Site Boundary',
      },
    ],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) =>
      itemId.startsWith('s1-boundaries-') ? boundaryModeFor(itemId) : null,
  },
  's1-stakeholders': {
    mapStrips: [
      {
        testId: 'stakeholder-map-strip',
        text: '2 overlays active on map',
      },
    ],
    registerStrip: {
      testId: 'stakeholder-reg-strip',
      countTestId: 'stakeholder-reg-count',
      label: 'stakeholders in register',
      note: 'Items 1-4 build the register - Items 5-6 annotate it',
      registerKind: 'stakeholder',
    },
    showGroups: false,
    modeFor: (itemId) =>
      itemId.startsWith('s1-stakeholders-') ? stakeholderModeFor(itemId) : null,
  },
  'ev-s1-legal-governance': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) =>
      itemId.startsWith('ev-s1-legal-governance-')
        ? legalGovernanceModeFor(itemId)
        : null,
  },
  // S2 terrain: 5 items, 3 decision groups (showGroups true), no map/register
  // strips. modeFor returns the raw TerrainMode key, which DecisionList maps to
  // its badge label via MODE_LABELS.
  's2-terrain': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) =>
      itemId.startsWith('s2-terrain-') ? terrainModeFor(itemId) : null,
  },
  // S2 climate: 6 items, 2 decision groups (showGroups true), no map/register
  // strips. modeFor returns the raw ClimateMode key, which DecisionList maps to
  // its badge label via MODE_LABELS.
  's2-climate': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) =>
      itemId.startsWith('s2-climate-') ? climateModeFor(itemId) : null,
  },
  // S2 ecology: 5 items, 2 decision groups (showGroups true), no map/register
  // strips. modeFor returns the raw EcologyMode key, which DecisionList maps to
  // its badge label via MODE_LABELS.
  's2-ecology': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) =>
      itemId.startsWith('s2-ecology-') ? ecologyModeFor(itemId) : null,
  },
  // S2 landscape & vectors (ecovillage EV-S2.7): 6 items, 3 decision groups
  // (showGroups true), no map/register strips.
  'ev-s2-landscape-vectors': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) =>
      itemId.startsWith('ev-s2-landscape-vectors-') ? landscapeModeFor(itemId) : null,
  },
  // S2 carrying capacity (ecovillage EV-S2.x): 7 items, 3 decision groups
  // (resource ceilings / synthesis / gate). showGroups true; no map/register
  // strips. modeFor returns the raw CarryingCapacityMode key (water / food /
  // waste / energy / space / synthesis / gate), mapped to a badge by
  // DecisionList MODE_LABELS.
  'ev-s2-carrying-capacity': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) =>
      itemId.startsWith('ev-s2-carrying-capacity-')
        ? carryingCapacityModeFor(itemId)
        : null,
  },
  // S1 livestock enterprise intent (silvopasture SILV-S1.20): 5 items, grouped
  // (showGroups true); no map/register strips. Advisory only -- the capture
  // writes no store and takes no projectId. livestockIntentModeFor returns
  // GENERIC mode keys (rationale / species / relationship / capacity / compat),
  // two of which (species, capacity) collide with the forage / carrying-capacity
  // labels already in DecisionList MODE_LABELS. So the badge keys are namespaced
  // "li-" HERE (the affordance modeFor feeds the badge only; DecisionWorkingPanel
  // routes off its own livestockIntentModeFor independently), and DecisionList
  // carries matching li-* labels. The component itself is left untouched.
  'silv-sec-s1-livestock-intent': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) => {
      if (!itemId.startsWith('silv-sec-s1-livestock-intent-')) return null;
      const m = livestockIntentModeFor(itemId);
      return m ? `li-${m}` : null;
    },
  },
  // S3 forage / pasture survey (silvopasture): 5 items, grouped (showGroups
  // true); no map/register strips. modeFor returns the raw ForageMode key
  // (zones / seasonal / capacity / constraints / toxic), which DecisionList's
  // MODE_LABELS maps to a human badge (zones -> "Zone register", etc.).
  'silv-sec-s3-forage-survey': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) =>
      itemId.startsWith('silv-sec-s3-forage-survey-')
        ? forageModeFor(itemId)
        : null,
  },
  // S4 grazing system design (silvopasture): 6 items, grouped (showGroups
  // true); no map/register strips. Advisory only -- the capture writes no
  // store and takes no projectId. modeFor returns the raw GrazingMode key
  // (grazingMethod / paddockLayout / grazeRest / treeProtection / contingency
  // / stockingDensity), which DecisionList's MODE_LABELS maps to a human badge.
  'silv-sec-s4-grazing-design': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) =>
      itemId.startsWith('silv-sec-s4-grazing-design-')
        ? grazingModeFor(itemId)
        : null,
  },
  // S1 conflict-resolution & community-agreement framework (ecovillage
  // EV-S1.x): 7 items, 3 decision groups (showGroups true); no map/register
  // strips. modeFor returns the raw ConflictFrameworkMode key (decisionProcess
  // / disputePathway / communityAgreements / exitProcess / dissolution /
  // reviewCadence / signOff), mapped to a badge by DecisionList MODE_LABELS.
  'ev-s1-conflict-framework': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) =>
      itemId.startsWith('ev-s1-conflict-framework-')
        ? conflictFrameworkModeFor(itemId)
        : null,
  },
  // S4 husbandry & welfare framework (silvopasture SILV-S4.22): 6 items, grouped
  // (showGroups true); no map/register strips. Advisory only -- the capture
  // writes no store and takes no projectId. husbandryModeFor returns GENERIC
  // mode keys (health / breeding / welfare / halal / records / labour). The
  // badge keys are namespaced "hb-" HERE (the affordance modeFor feeds the badge
  // only; DecisionWorkingPanel routes off its own husbandryModeFor
  // independently), and DecisionList carries matching hb-* labels. The component
  // itself is left untouched.
  'silv-sec-s4-husbandry-framework': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) => {
      if (!itemId.startsWith('silv-sec-s4-husbandry-framework-')) return null;
      const m = husbandryModeFor(itemId);
      return m ? `hb-${m}` : null;
    },
  },
  // S5 soil improvement strategy (universal U-S5.3): 5 items, grouped
  // (showGroups true); no map/register strips. Advisory only -- the capture
  // writes no store and takes no projectId. soilImprovementModeFor returns
  // GENERIC mode keys (fertility / schedule / equipment / priority / baseline).
  // The badge keys are namespaced "si-" HERE (the affordance modeFor feeds the
  // badge only; DecisionWorkingPanel routes off its own soilImprovementModeFor
  // independently), and DecisionList carries matching si-* labels. The
  // component itself is left untouched.
  's5-soil-improvement': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) => {
      if (!itemId.startsWith('s5-soil-improvement-')) return null;
      const m = soilImprovementModeFor(itemId);
      return m ? `si-${m}` : null;
    },
  },

  // s4-water-strategy is a universal advisory Tier-0 capture (in-slice). It
  // writes no store and takes no projectId. waterSystemsModeFor returns GENERIC
  // mode keys (demand / sources / strategy / storage / harvesting / drought).
  // The badge keys are namespaced "wt-" HERE (the affordance modeFor feeds the
  // badge only; DecisionWorkingPanel routes off its own waterSystemsModeFor
  // independently), and DecisionList carries matching wt-* labels.
  's4-water-strategy': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) => {
      if (!itemId.startsWith('s4-water-strategy-')) return null;
      const m = waterSystemsModeFor(itemId);
      return m ? `wt-${m}` : null;
    },
  },

  // ev-s3-energy-potential is an ecovillage advisory Tier-0 capture
  // (out-of-slice). It writes no store and takes no projectId. energyModeFor
  // returns GENERIC mode keys (solar / wind / hydro / biomass / demand /
  // distribution). The badge keys are namespaced "en-" HERE (the affordance
  // modeFor feeds the badge only; DecisionWorkingPanel routes off its own
  // energyModeFor independently), and DecisionList carries matching en-* labels.
  'ev-s3-energy-potential': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) => {
      if (!itemId.startsWith('ev-s3-energy-potential-')) return null;
      const m = energyModeFor(itemId);
      return m ? `en-${m}` : null;
    },
  },

  // ev-s4-settlement-strategy is an ecovillage advisory Tier-0 capture
  // (out-of-slice). It writes no store and takes no projectId. settlementModeFor
  // returns GENERIC mode keys (cohort / threshold / sequence / trial / capacity
  // / gates). The badge keys are namespaced "st-" HERE (the affordance modeFor
  // feeds the badge only; DecisionWorkingPanel routes off its own
  // settlementModeFor independently), and DecisionList carries matching st-*
  // labels.
  'ev-s4-settlement-strategy': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) => {
      if (!itemId.startsWith('ev-s4-settlement-strategy-')) return null;
      const m = settlementModeFor(itemId);
      return m ? `st-${m}` : null;
    },
  },

  // S2 nursery biosecurity survey (nursery NUR-S2): 5 items, grouped
  // (showGroups true); no map/register strips. Advisory only -- the capture
  // writes no store and takes no projectId. biosecurityModeFor returns GENERIC
  // mode keys (soilDisease / insectPest / weedMedia / ingress / sanitation).
  // The badge keys are namespaced "bs-" HERE (the affordance modeFor feeds the
  // badge only; DecisionWorkingPanel routes off its own biosecurityModeFor
  // independently), and DecisionList carries matching bs-* labels. The
  // component itself is left untouched.
  'nur-sec-s2-biosecurity-survey': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) => {
      if (!itemId.startsWith('nur-sec-s2-biosecurity-survey-')) return null;
      const m = biosecurityModeFor(itemId);
      return m ? `bs-${m}` : null;
    },
  },

  // ev-s4-financial-model is an ecovillage advisory Tier-0 capture
  // (out-of-slice). It writes no store and takes no projectId.
  // financialModelModeFor returns GENERIC mode keys (buyin / levy / fundgov /
  // hardship / reserves / ratify). The badge keys are namespaced "fi-" HERE (the
  // affordance modeFor feeds the badge only; DecisionWorkingPanel routes off its
  // own financialModelModeFor independently), and DecisionList carries matching
  // fi-* labels.
  'ev-s4-financial-model': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) => {
      if (!itemId.startsWith('ev-s4-financial-model-')) return null;
      const m = financialModelModeFor(itemId);
      return m ? `fi-${m}` : null;
    },
  },

  // S1 nursery propagation-infrastructure survey (nursery NRS-S1.1): 5 items,
  // grouped (showGroups true); no map/register strips. Advisory only -- the
  // capture writes no store and takes no projectId. propagationInfraModeFor
  // returns GENERIC mode keys (infraInventory / condition / mediaInputs /
  // compostCapacity / mediaSourcing). The badge keys are namespaced "pi-" HERE
  // (the affordance modeFor feeds the badge only; DecisionWorkingPanel routes
  // off its own propagationInfraModeFor independently), and DecisionList carries
  // matching pi-* labels.
  'nur-sec-s1-propagation-infra-survey': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) => {
      if (!itemId.startsWith('nur-sec-s1-propagation-infra-survey-')) return null;
      const m = propagationInfraModeFor(itemId);
      return m ? `pi-${m}` : null;
    },
  },

  // Adaptive-management protocol (ev-s7-adaptive-management, EV-S7.9): 5 decisions
  // grouped (showGroups true) under three decision groups; no map/register strips.
  // Advisory form-only -- the capture writes no store and takes no projectId.
  // adaptiveManagementModeFor returns mode keys (review / triggers / escalation /
  // documentation / fiveyear); badge keys are namespaced "am-" HERE (the affordance
  // modeFor feeds the badge only; DecisionWorkingPanel routes off its own
  // adaptiveManagementModeFor independently), and DecisionList carries matching
  // am-* labels.
  'ev-s7-adaptive-management': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) => {
      if (!itemId.startsWith('ev-s7-adaptive-management-')) return null;
      const m = adaptiveManagementModeFor(itemId);
      return m ? `am-${m}` : null;
    },
  },

  // Member exit & land succession (ev-s7-exit-succession): 5 decisions grouped
  // (showGroups true) under three decision groups; no map/register strips.
  // Advisory form-only -- the capture writes no store and takes no projectId.
  // exitSuccessionModeFor returns mode keys (exitProcess / dwellingTransfer /
  // landReversion / dissolution / legalReview); badge keys are namespaced "es-"
  // HERE (the affordance modeFor feeds the badge only; DecisionWorkingPanel
  // routes off its own exitSuccessionModeFor independently).
  'ev-s7-exit-succession': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) => {
      if (!itemId.startsWith('ev-s7-exit-succession-')) return null;
      const m = exitSuccessionModeFor(itemId);
      return m ? `es-${m}` : null;
    },
  },

  // S2 social-fabric survey (Life EV-S2): 6 items, grouped (showGroups true);
  // no map/register strips. Advisory only -- the capture writes no store and
  // takes no projectId. socialFabricModeFor returns GENERIC mode keys
  // (relationships / experience / priorattempts / cohesion / skills /
  // networks). The badge keys are namespaced "sf-" HERE (the affordance modeFor
  // feeds the badge only; DecisionWorkingPanel routes off its own
  // socialFabricModeFor independently), and DecisionList carries matching sf-*
  // labels.
  'ev-s2-social-fabric': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) => {
      const m = socialFabricModeFor(itemId);
      return m ? `sf-${m}` : null;
    },
  },

  // S3 infra-condition survey (Family EV-S3): 5 items, grouped (showGroups
  // true); no map/register strips. Advisory only -- the capture writes no store
  // and takes no projectId. infraConditionModeFor returns GENERIC mode keys
  // (buildings / compliance / utilities / access / reuse). The badge keys are
  // namespaced "ic-" HERE (the affordance modeFor feeds the badge only;
  // DecisionWorkingPanel routes off its own infraConditionModeFor
  // independently), and DecisionList carries matching ic-* labels.
  'ev-s3-infra-condition': {
    mapStrips: [],
    registerStrip: null,
    showGroups: true,
    modeFor: (itemId) => {
      const m = infraConditionModeFor(itemId);
      return m ? `ic-${m}` : null;
    },
  },
};

/**
 * Resolve the affordance descriptor for an objective id. Returns the frozen
 * EMPTY_AFFORDANCES shape for any id without an entry (never throws).
 */
export function workbenchAffordancesFor(
  objectiveId: string,
): WorkbenchObjectiveAffordances {
  return MAP[objectiveId] ?? EMPTY_AFFORDANCES;
}
