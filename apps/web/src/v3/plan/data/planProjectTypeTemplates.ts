/**
 * planProjectTypeTemplates — template checklists keyed by user-facing
 * project type. Surfaced by PlanProjectTypeCard in the Plan right rail.
 *
 * Skeleton + one fleshed-out example: Regenerative Farm is seeded with
 * design-prompt items grounded in Yeomans / Mollison / Holmgren. The other
 * five types are placeholder stubs with empty `items` — the steward will
 * populate them in a follow-up pass.
 */

export const PLAN_PROJECT_TYPE_KEYS = [
  'regenerative_farm',
  'retreat_center',
  'homestead',
  'educational_farm',
  'conservation',
  'multi_enterprise',
] as const;

export type PlanProjectTypeKey = (typeof PLAN_PROJECT_TYPE_KEYS)[number];

export interface PlanProjectTypeTemplate {
  label: string;
  color: string;
  items: readonly string[];
}

export const PLAN_PROJECT_TYPE_TEMPLATES: Record<
  PlanProjectTypeKey,
  PlanProjectTypeTemplate
> = {
  regenerative_farm: {
    label: 'Regenerative Farm',
    color: '#8bd16a',
    items: [
      'Confirm primary cash-crop rotation fits the parcel\'s landform and water budget (Yeomans rank 2-3).',
      'Map livestock-to-pasture ratio against target rest periods before drawing paddock cells.',
      'Site keyline-aligned access tracks before fencing or planting permanent rows.',
      'Stage swales, ponds, and overflow paths so the wet-season excess has somewhere to go.',
      'Place orchard guilds downslope of water storage along the contour, not against it.',
      'Wire compost / manure / crop-residue flows into a closed loop before sizing inputs.',
    ],
  },
  retreat_center: {
    label: 'Retreat Center',
    color: '#d68bd0',
    items: [
      'Route guest paths so they never cross daily livestock or service routes (Mollison Z2/Z3 separation).',
      'Site cabins and dwellings with view-shed and sun access protected; shield them from operations noise.',
      'Designate quiet zones (prayer / meditation / silence) at Z3-Z4 distance from kitchens, parking, and machinery.',
      'Cluster accommodations on shared utilities (water, septic, power) before scattering across the parcel.',
      'Stage the arrival sequence — parking, threshold, orientation — so first impression matches the retreat\'s intent.',
      'Plan emergency egress and accessible paths alongside the contemplative routes, not as an afterthought.',
    ],
  },
  homestead: {
    label: 'Homestead',
    color: '#c9a05a',
    items: [
      'Anchor Z0/Z1 (house + kitchen garden) on a sun-facing aspect with year-round solar access.',
      'Place the poultry / small-livestock yard adjacent to the kitchen garden so one visit serves both.',
      'Size water storage to a full off-grid week for the household, with a roof-catchment plan budgeted first.',
      'Stage the orchard within wheelbarrow distance of the house — Z2 for the species harvested weekly.',
      'Wire kitchen / garden / animal / wood-stove waste into a single fertility loop (compost, ash, manure, greywater).',
      'Co-locate the root cellar, pantry, and preserve station with the kitchen for harvest-day flow.',
    ],
  },
  educational_farm: {
    label: 'Educational Farm',
    color: '#7aabca',
    items: [
      'Design a single visitor arrival sequence that funnels through orientation before reaching working land.',
      'Site demonstration plots and teaching stations along a loop that returns to start without backtracking.',
      'Place animal-interaction areas with double fencing and a hand-wash station between paddock and path.',
      'Build accessibility into primary paths — wheelchair-graded, shaded, with rest points at teaching stations.',
      'Co-locate classroom, barn, and restroom utilities so one trench serves all of them.',
      'Reserve a Z4-Z5 reference zone, untouched, as an ecological "before vs. after" teaching site.',
    ],
  },
  conservation: {
    label: 'Conservation',
    color: '#5dd39e',
    items: [
      'Identify and rank existing ecological assets (riparian, forest interior, wetland) before drawing any new structure.',
      'Define wildlife corridors that connect the parcel\'s habitat patches to off-parcel refugia.',
      'Map a Z4/Z5 minimal-intervention zone large enough to hold the keystone-species home range.',
      'Site any structures on already-disturbed ground — never on intact habitat.',
      'Plan an invasives-monitoring transect walked at least seasonally; pair it with removal capacity.',
      'Pick indicator species and a baseline-monitoring protocol so "succeeding" can be measured, not asserted.',
    ],
  },
  multi_enterprise: {
    label: 'Multi-Enterprise',
    color: '#e6c34a',
    items: [
      'Map each enterprise to the Yeomans rank it depends on most (water-heavy, structure-heavy, livestock-heavy) before sizing the parcel split.',
      'Identify shared infrastructure (access roads, water, power, processing) and design it once for all enterprises.',
      'Buffer noise / odour / visitor enterprises (retreat, market) from operational ones (livestock, machinery) with planted screens or topography.',
      'Sequence capital deployment: decide which enterprise funds the next phase\'s shared infrastructure.',
      'Look for cross-enterprise yields — pasture poultry under orchard, education revenue funding conservation, retreat guests buying farm produce.',
      'Stress-test single-point-of-failure dependencies (one well, one access road); multi-enterprise amplifies fragility there.',
    ],
  },
};
