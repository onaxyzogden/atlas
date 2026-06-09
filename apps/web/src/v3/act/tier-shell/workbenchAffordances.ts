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
    showGroups: false,
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
