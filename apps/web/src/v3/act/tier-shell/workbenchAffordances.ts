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

const MAP: Record<string, WorkbenchObjectiveAffordances> = {
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
