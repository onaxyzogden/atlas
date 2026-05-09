/**
 * planProjectTypeTemplates — template checklists keyed by user-facing
 * project type. Surfaced by PlanProjectTypeCard in the Plan right rail.
 *
 * Each item declares:
 *   - `text`       — the steward-facing design-prompt sentence
 *   - `relatedWork` — module dependencies the cross-check chip aggregates
 *     against the universal module guidance cards. For each dependency:
 *       - `module`              — which Plan module it relates to
 *       - `indexes`             — which `how` step indices in that module
 *                                 must be ticked (in planHowChecksStore)
 *       - `requiresArtifacts`   — when true, also require the module's
 *                                 artifact-presence selector to be true
 *                                 (e.g. zones drawn, paddocks drawn).
 *                                 Invalid for modules with no spatial
 *                                 artifacts (dynamic-layering,
 *                                 cross-section-solar, principle-verification).
 *
 * Items are grounded in Yeomans / Mollison / Holmgren — single-sentence
 * imperatives sequenced earliest-design-move to latest. Mappings are
 * intentionally tight: only modules that *directly* satisfy the prompt
 * are listed, so the chip's "ref count" reflects design-load, not
 * loose adjacency.
 */

import type { PlanModule } from '../types.js';

export const PLAN_PROJECT_TYPE_KEYS = [
  'regenerative_farm',
  'retreat_center',
  'homestead',
  'educational_farm',
  'conservation',
  'multi_enterprise',
] as const;

export type PlanProjectTypeKey = (typeof PLAN_PROJECT_TYPE_KEYS)[number];

export interface PlanProjectTypeItemRelatedWork {
  module: PlanModule;
  indexes: readonly number[];
  requiresArtifacts?: boolean;
}

export interface PlanProjectTypeItem {
  text: string;
  relatedWork: readonly PlanProjectTypeItemRelatedWork[];
}

export interface PlanProjectTypeTemplate {
  label: string;
  color: string;
  items: readonly PlanProjectTypeItem[];
}

export const PLAN_PROJECT_TYPE_TEMPLATES: Record<
  PlanProjectTypeKey,
  PlanProjectTypeTemplate
> = {
  regenerative_farm: {
    label: 'Regenerative Farm',
    color: '#8bd16a',
    items: [
      {
        text: "Confirm primary cash-crop rotation fits the parcel's landform and water budget (Yeomans rank 2-3).",
        relatedWork: [
          { module: 'dynamic-layering', indexes: [0, 1] },
          { module: 'water-management', indexes: [0], requiresArtifacts: true },
        ],
      },
      {
        text: 'Map livestock-to-pasture ratio against target rest periods before drawing paddock cells.',
        relatedWork: [
          { module: 'livestock', indexes: [1], requiresArtifacts: true },
        ],
      },
      {
        text: 'Site keyline-aligned access tracks before fencing or planting permanent rows.',
        relatedWork: [
          { module: 'zone-circulation', indexes: [1], requiresArtifacts: true },
        ],
      },
      {
        text: 'Stage swales, ponds, and overflow paths so the wet-season excess has somewhere to go.',
        relatedWork: [
          {
            module: 'water-management',
            indexes: [1, 2],
            requiresArtifacts: true,
          },
        ],
      },
      {
        text: 'Place orchard guilds downslope of water storage along the contour, not against it.',
        relatedWork: [
          { module: 'plant-systems', indexes: [1], requiresArtifacts: true },
          { module: 'water-management', indexes: [], requiresArtifacts: true },
        ],
      },
      {
        text: 'Wire compost / manure / crop-residue flows into a closed loop before sizing inputs.',
        relatedWork: [
          {
            module: 'soil-fertility',
            indexes: [1, 2, 3],
            requiresArtifacts: true,
          },
        ],
      },
    ],
  },
  retreat_center: {
    label: 'Retreat Center',
    color: '#d68bd0',
    items: [
      {
        text: 'Route guest paths so they never cross daily livestock or service routes (Mollison Z2/Z3 separation).',
        relatedWork: [
          {
            module: 'zone-circulation',
            indexes: [1, 2],
            requiresArtifacts: true,
          },
          { module: 'livestock', indexes: [], requiresArtifacts: true },
        ],
      },
      {
        text: 'Site cabins and dwellings with view-shed and sun access protected; shield them from operations noise.',
        relatedWork: [
          {
            module: 'structures-subsystems',
            indexes: [1],
            requiresArtifacts: true,
          },
          { module: 'cross-section-solar', indexes: [0, 1] },
        ],
      },
      {
        text: 'Designate quiet zones (prayer / meditation / silence) at Z3-Z4 distance from kitchens, parking, and machinery.',
        relatedWork: [
          { module: 'zone-circulation', indexes: [0], requiresArtifacts: true },
        ],
      },
      {
        text: 'Cluster accommodations on shared utilities (water, septic, power) before scattering across the parcel.',
        relatedWork: [
          {
            module: 'structures-subsystems',
            indexes: [2],
            requiresArtifacts: true,
          },
        ],
      },
      {
        text: "Stage the arrival sequence — parking, threshold, orientation — so first impression matches the retreat's intent.",
        relatedWork: [
          { module: 'zone-circulation', indexes: [1], requiresArtifacts: true },
        ],
      },
      {
        text: 'Plan emergency egress and accessible paths alongside the contemplative routes, not as an afterthought.',
        relatedWork: [
          {
            module: 'zone-circulation',
            indexes: [1, 2],
            requiresArtifacts: true,
          },
        ],
      },
    ],
  },
  homestead: {
    label: 'Homestead',
    color: '#c9a05a',
    items: [
      {
        text: 'Anchor Z0/Z1 (house + kitchen garden) on a sun-facing aspect with year-round solar access.',
        relatedWork: [
          { module: 'zone-circulation', indexes: [0], requiresArtifacts: true },
          {
            module: 'structures-subsystems',
            indexes: [],
            requiresArtifacts: true,
          },
          { module: 'cross-section-solar', indexes: [0, 1] },
        ],
      },
      {
        text: 'Place the poultry / small-livestock yard adjacent to the kitchen garden so one visit serves both.',
        relatedWork: [
          { module: 'livestock', indexes: [2], requiresArtifacts: true },
        ],
      },
      {
        text: 'Size water storage to a full off-grid week for the household, with a roof-catchment plan budgeted first.',
        relatedWork: [
          {
            module: 'water-management',
            indexes: [0, 1],
            requiresArtifacts: true,
          },
        ],
      },
      {
        text: 'Stage the orchard within wheelbarrow distance of the house — Z2 for the species harvested weekly.',
        relatedWork: [
          { module: 'plant-systems', indexes: [1], requiresArtifacts: true },
          { module: 'zone-circulation', indexes: [0], requiresArtifacts: true },
        ],
      },
      {
        text: 'Wire kitchen / garden / animal / wood-stove waste into a single fertility loop (compost, ash, manure, greywater).',
        relatedWork: [
          {
            module: 'soil-fertility',
            indexes: [1, 2, 3],
            requiresArtifacts: true,
          },
        ],
      },
      {
        text: 'Co-locate the root cellar, pantry, and preserve station with the kitchen for harvest-day flow.',
        relatedWork: [
          {
            module: 'structures-subsystems',
            indexes: [1, 2],
            requiresArtifacts: true,
          },
        ],
      },
    ],
  },
  educational_farm: {
    label: 'Educational Farm',
    color: '#7aabca',
    items: [
      {
        text: 'Design a single visitor arrival sequence that funnels through orientation before reaching working land.',
        relatedWork: [
          {
            module: 'zone-circulation',
            indexes: [1, 2],
            requiresArtifacts: true,
          },
        ],
      },
      {
        text: 'Site demonstration plots and teaching stations along a loop that returns to start without backtracking.',
        relatedWork: [
          { module: 'zone-circulation', indexes: [1], requiresArtifacts: true },
          {
            module: 'structures-subsystems',
            indexes: [1],
            requiresArtifacts: true,
          },
        ],
      },
      {
        text: 'Place animal-interaction areas with double fencing and a hand-wash station between paddock and path.',
        relatedWork: [
          { module: 'livestock', indexes: [2], requiresArtifacts: true },
          {
            module: 'structures-subsystems',
            indexes: [],
            requiresArtifacts: true,
          },
        ],
      },
      {
        text: 'Build accessibility into primary paths — wheelchair-graded, shaded, with rest points at teaching stations.',
        relatedWork: [
          { module: 'zone-circulation', indexes: [1], requiresArtifacts: true },
        ],
      },
      {
        text: 'Co-locate classroom, barn, and restroom utilities so one trench serves all of them.',
        relatedWork: [
          {
            module: 'structures-subsystems',
            indexes: [2],
            requiresArtifacts: true,
          },
        ],
      },
      {
        text: 'Reserve a Z4-Z5 reference zone, untouched, as an ecological "before vs. after" teaching site.',
        relatedWork: [
          { module: 'zone-circulation', indexes: [0], requiresArtifacts: true },
        ],
      },
    ],
  },
  conservation: {
    label: 'Conservation',
    color: '#5dd39e',
    items: [
      {
        text: 'Identify and rank existing ecological assets (riparian, forest interior, wetland) before drawing any new structure.',
        relatedWork: [{ module: 'dynamic-layering', indexes: [0, 1] }],
      },
      {
        text: "Define wildlife corridors that connect the parcel's habitat patches to off-parcel refugia.",
        relatedWork: [
          { module: 'zone-circulation', indexes: [1], requiresArtifacts: true },
        ],
      },
      {
        text: 'Map a Z4/Z5 minimal-intervention zone large enough to hold the keystone-species home range.',
        relatedWork: [
          { module: 'zone-circulation', indexes: [0], requiresArtifacts: true },
        ],
      },
      {
        text: 'Site any structures on already-disturbed ground — never on intact habitat.',
        relatedWork: [
          {
            module: 'structures-subsystems',
            indexes: [1],
            requiresArtifacts: true,
          },
        ],
      },
      {
        text: 'Plan an invasives-monitoring transect walked at least seasonally; pair it with removal capacity.',
        relatedWork: [
          {
            module: 'phasing-budgeting',
            indexes: [1],
            requiresArtifacts: true,
          },
        ],
      },
      {
        text: 'Pick indicator species and a baseline-monitoring protocol so "succeeding" can be measured, not asserted.',
        relatedWork: [{ module: 'principle-verification', indexes: [0, 2] }],
      },
    ],
  },
  multi_enterprise: {
    label: 'Multi-Enterprise',
    color: '#e6c34a',
    items: [
      {
        text: 'Map each enterprise to the Yeomans rank it depends on most (water-heavy, structure-heavy, livestock-heavy) before sizing the parcel split.',
        relatedWork: [{ module: 'dynamic-layering', indexes: [0, 1, 2] }],
      },
      {
        text: 'Identify shared infrastructure (access roads, water, power, processing) and design it once for all enterprises.',
        relatedWork: [
          { module: 'zone-circulation', indexes: [], requiresArtifacts: true },
          { module: 'water-management', indexes: [], requiresArtifacts: true },
          {
            module: 'structures-subsystems',
            indexes: [2],
            requiresArtifacts: true,
          },
        ],
      },
      {
        text: 'Buffer noise / odour / visitor enterprises (retreat, market) from operational ones (livestock, machinery) with planted screens or topography.',
        relatedWork: [
          { module: 'zone-circulation', indexes: [0], requiresArtifacts: true },
          { module: 'plant-systems', indexes: [], requiresArtifacts: true },
        ],
      },
      {
        text: "Sequence capital deployment: decide which enterprise funds the next phase's shared infrastructure.",
        relatedWork: [
          {
            module: 'phasing-budgeting',
            indexes: [0, 2],
            requiresArtifacts: true,
          },
        ],
      },
      {
        text: 'Look for cross-enterprise yields — pasture poultry under orchard, education revenue funding conservation, retreat guests buying farm produce.',
        relatedWork: [
          { module: 'soil-fertility', indexes: [2], requiresArtifacts: true },
        ],
      },
      {
        text: 'Stress-test single-point-of-failure dependencies (one well, one access road); multi-enterprise amplifies fragility there.',
        relatedWork: [
          { module: 'water-management', indexes: [2], requiresArtifacts: true },
          { module: 'zone-circulation', indexes: [], requiresArtifacts: true },
        ],
      },
    ],
  },
};
