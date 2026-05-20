/**
 * Plan stage module types — mirrors observe/types.ts pattern.
 *
 * 11 plan modules map 1:1 to PlanHub's module cards and to the
 * PlanModuleBar tiles. Each module maps to one or more plan card
 * sectionIds (used by PlanModuleSlideUp to load the right card).
 */

export type PlanModule =
  | 'goal-compass'
  | 'dynamic-layering'
  | 'water-management'
  | 'zone-circulation'
  | 'structures-subsystems'
  | 'machinery'
  | 'livestock'
  | 'plant-systems'
  | 'soil-fertility'
  | 'cross-section-solar'
  | 'phasing-budgeting'
  | 'principle-verification'
  | 'regeneration-monitor'
  | 'habitat-allocation'
  | 'biodiversity-monitor';

export const PLAN_MODULES: PlanModule[] = [
  'goal-compass',
  'dynamic-layering',
  'water-management',
  'zone-circulation',
  'structures-subsystems',
  'machinery',
  'livestock',
  'plant-systems',
  'soil-fertility',
  'cross-section-solar',
  'phasing-budgeting',
  'principle-verification',
  'regeneration-monitor',
  'habitat-allocation',
  'biodiversity-monitor',
];

export function isPlanModule(s: string): s is PlanModule {
  return (PLAN_MODULES as string[]).includes(s);
}

export const PLAN_MODULE_LABEL: Record<PlanModule, string> = {
  'goal-compass':           'Compass',
  'dynamic-layering':       'Layering',
  'water-management':       'Water',
  'zone-circulation':       'Zones',
  'structures-subsystems':  'Structures',
  machinery:                'Machinery',
  livestock:                'Livestock',
  'plant-systems':          'Plants',
  'soil-fertility':         'Soil',
  'cross-section-solar':    'Cross-section',
  'phasing-budgeting':      'Phasing',
  'principle-verification': 'Principles',
  'regeneration-monitor':   'Regeneration',
  'habitat-allocation':     'Habitat',
  'biodiversity-monitor':   'Biodiversity',
};

export const PLAN_MODULE_FULL_LABEL: Record<PlanModule, string> = {
  'goal-compass':           'Goal Compass',
  'dynamic-layering':       'Dynamic Layering & Permanence',
  'water-management':       'Water Management',
  'zone-circulation':       'Zone & Circulation',
  'structures-subsystems':  'Built Environment',
  machinery:                'Machinery & Equipment',
  livestock:                'Livestock & Subdivision',
  'plant-systems':          'Plant Systems & Polyculture',
  'soil-fertility':         'Soil Fertility & Closed-Loop',
  'cross-section-solar':    'Cross-section & Solar Geometry',
  'phasing-budgeting':      'Phasing & Budgeting',
  'principle-verification': 'Holmgren Principle Verification',
  'regeneration-monitor':   'Regeneration Monitoring',
  'habitat-allocation':     'Habitat Allocation',
  'biodiversity-monitor':   'Biodiversity Outcome Monitoring',
};

// ── Vision-Layout canvas (added 2026-05-07; phase tabs retired 2026-05-14) ───
// Top-tab views for the Plan stage. `current` keeps the legacy module-driven
// experience; `vision` opens the design-element canvas; `terrain3d` is a v1
// camera-preset placeholder. The former `phase-1` / `phase-2` Yeomans-cap
// tabs were retired in favour of the bottom-canvas year scrubber — the cap
// is now derived from `useTemporalScrubStore.currentYear` via
// `yeomansCapForYear` below.
export type PlanView = 'current' | 'vision' | 'terrain3d';

export const PLAN_VIEWS: PlanView[] = ['vision', 'current', 'terrain3d'];

export const PLAN_VIEW_LABEL: Record<PlanView, string> = {
  current: 'Current Land',
  vision: 'Vision Layout',
  terrain3d: '3D Terrain',
};

/**
 * Yeomans' Scale of Permanence — canonical permaculture ordering used by the
 * Vision-Layout canvas to gate which design elements show in each phase tab.
 * Index 0 = most permanent (climate); 7 = most malleable (soil).
 *
 * Source: Permaculture Scholar dialogue 2026-04-28 (see
 * wiki/concepts/atlas-sidebar-permaculture.md).
 */
export type PhaseKey =
  | 'climate'      // 0
  | 'landshape'    // 1
  | 'water'        // 2
  | 'access'       // 3
  | 'trees'        // 4
  | 'buildings'    // 5
  | 'subdivision'  // 6
  | 'soil';        // 7

export const PHASE_ORDER: PhaseKey[] = [
  'climate',
  'landshape',
  'water',
  'access',
  'trees',
  'buildings',
  'subdivision',
  'soil',
];

export function phaseIndex(p: PhaseKey): number {
  return PHASE_ORDER.indexOf(p);
}

/**
 * Yeomans cap derived from the year scrubber's `currentYear` (1..50).
 *
 * Replaces the retired `PHASE_VIEW_CAP` lookup tied to the `phase-1` /
 * `phase-2` tabs (2026-05-14). Thresholds chosen so behaviour at the two
 * prior tab landings is identical:
 *
 * - Year 1..2  → `'water'`     (matches the old Year 1 tab)
 * - Year 3..5  → `'buildings'` (matches the old Year 5 tab)
 * - Year 6+    → `null`        (uncapped — same as `current` / `vision`)
 */
export function yeomansCapForYear(year: number): PhaseKey | null {
  if (year <= 2) return 'water';
  if (year <= 5) return 'buildings';
  return null;
}

/** Each module maps to one or more plan card section IDs. */
export const MODULE_CARDS: Record<
  PlanModule,
  Array<{ label: string; sectionId: string; group?: string }>
> = {
  'goal-compass': [
    { label: 'Goal tree',         sectionId: 'plan-goal-tree' },
    { label: 'Site profile',      sectionId: 'plan-site-profile' },
    { label: 'Proposal',          sectionId: 'plan-proposal' },
    { label: 'Develop plan',      sectionId: 'plan-develop-plan' },
    { label: 'Criteria forecast', sectionId: 'plan-criteria-forecast' },
  ],
  'dynamic-layering': [
    { label: 'Permanence scales', sectionId: 'plan-permanence-scales' },
    { label: 'Permanence ladder', sectionId: 'plan-permanence-ladder' },
    { label: 'Enterprises',       sectionId: 'plan-enterprises' },
  ],
  'water-management': [
    { label: 'Catchments',     sectionId: 'plan-water-catchments' },
    { label: 'Storage & overflow', sectionId: 'plan-water-storage' },
    { label: 'Network & balance',  sectionId: 'plan-water-network' },
    // Highest-potential water router (Rec #3 v1 from the permaculture-
    // alignment backlog, 2026-04-28). Aspect-projected heuristic flags
    // water-harvest elements placed below the parcel's median elevation
    // with a numeric "head lost" estimate and a suggested upper-third coord.
    { label: 'Highest-potential router', sectionId: 'plan-water-router' },
  ],
  'zone-circulation': [
    { label: 'Zone level layer', sectionId: 'plan-zone-level' },
    { label: 'Path frequency',   sectionId: 'plan-path-frequency' },
    { label: 'Overview & validation', sectionId: 'plan-zone-overview' },
    { label: 'Sectors',          sectionId: 'plan-sector-overlay' },
    // Social-node generator (Rec #6 v1 from the permaculture-alignment
    // backlog, 2026-04-28). Path×path intersections inside Z1/Z2 zones
    // surface as "social node opportunities"; existing amenity points
    // within COVERED_RADIUS_M flip the row to "served."
    { label: 'Social nodes',     sectionId: 'plan-social-nodes' },
  ],
  'structures-subsystems': [
    { label: 'Structures overview', sectionId: 'plan-structures-overview' },
    { label: 'Subsystems overview', sectionId: 'plan-subsystems-overview' },
  ],
  machinery: [
    { label: 'Inventory',       sectionId: 'plan-machinery-inventory' },
    { label: 'Access fit',      sectionId: 'plan-machinery-access-fit' },
    { label: 'Housing & fuel',  sectionId: 'plan-machinery-housing-fuel' },
  ],
  livestock: [
    { label: 'Land-fit matrix',         sectionId: 'plan-livestock-land-fit' },
    { label: 'Specialization',          sectionId: 'plan-livestock-species-mix' },
    { label: 'Paddock cell design',     sectionId: 'plan-livestock-paddock-cells' },
    { label: 'Fencing layout',          sectionId: 'plan-livestock-fencing' },
    { label: 'Animal tractor zones',    sectionId: 'plan-livestock-tractor-zones' },
    { label: 'Welfare phasing',         sectionId: 'plan-livestock-welfare-phasing' },
    { label: 'Biosecurity & buffers',   sectionId: 'plan-livestock-buffers' },
    { label: 'Regeneration plan',       sectionId: 'plan-livestock-regeneration' },
    { label: 'Rotation sequence',       sectionId: 'plan-livestock-rotation-sequence' },
    { label: 'Rotation plan',           sectionId: 'plan-livestock-rotation-plan' },
    { label: 'Rotation adherence',      sectionId: 'plan-livestock-rotation-adherence' },
    { label: 'Rotation adherence — actions', sectionId: 'plan-livestock-rotation-adherence-actions' },
    // B4 — cross-registered with plant-systems. One sectionId, two
    // surfacing tabs; render is centralised in PlanModuleSlideUp.
    { label: 'Silvopasture integration', sectionId: 'plan-silvopasture-integration' },
    { label: 'Slaughter throughput', sectionId: 'plan-product-slaughter-throughput', group: 'Product Chain' },
    { label: 'Cold-chain coverage',  sectionId: 'plan-product-coldchain-coverage',   group: 'Product Chain' },
    { label: 'Market distribution',  sectionId: 'plan-product-market-distribution',  group: 'Product Chain' },
  ],
  'plant-systems': [
    { label: 'Plant database',         sectionId: 'plan-plant-database' },
    { label: 'Guild builder',          sectionId: 'plan-guild-builder' },
    { label: 'Canopy simulator',       sectionId: 'plan-canopy-simulator' },
    { label: 'Establishment sequence', sectionId: 'plan-plant-establishment-sequence' },
    // Edge & connectivity evaluator (Rec #4 from permaculture-alignment
    // backlog, 2026-04-28). Polsby-Popper compactness audit on planting
    // polygons; flags homogenized shapes with a textual prompt.
    { label: 'Edge & connectivity',    sectionId: 'plan-edge-connectivity' },
    // Temporal coherence (Rec #2 from permaculture-alignment backlog,
    // 2026-04-28). Canopy-overlap evaluator behind the bottom-canvas
    // year scrubber; surfaces crowding pairs within next 5 y of cursor.
    { label: 'Canopy maturity',        sectionId: 'plan-temporal-coherence' },
    { label: 'Annual planting schedule', sectionId: 'plan-planting-schedule' },
    // Sub-project B1 (plant-system design integrity). Guild integrity is a
    // design-time companion/spacing/maturity audit (no save gate, no
    // goal-tree criterion); Succession path is the editable Year0→Year30
    // designer over the additive successionPathStore slice.
    { label: 'Guild integrity',        sectionId: 'plan-guild-integrity' },
    { label: 'Succession path',        sectionId: 'plan-succession-path' },
    // B4 — cross-registered with livestock; same sectionId, one render.
    { label: 'Silvopasture integration', sectionId: 'plan-silvopasture-integration' },
    // B5 — cross-registered with habitat-allocation; same sectionId, one render.
    { label: 'Beneficial-organism audit', sectionId: 'plan-beneficial-habitat' },
    // B5.2.x — per-CropArea cover-crop plan editor (writes coverCropPlan;
    // LivingRootsCard reads the same store and lights up live).
    { label: 'Cover-crop planner', sectionId: 'plan-cover-crop-planner' },
    // B5.1 — cross-registered with soil-fertility; same sectionId, one render.
    { label: 'Living-roots audit', sectionId: 'plan-living-roots' },
    // Nursery ledger — propagation inventory + germination calendar +
    // readiness tracking. Cross-rendered from the Dashboard surface so
    // operators can plan the propagation pipeline alongside the
    // planting catalogue without leaving the Plan slide-up.
    { label: 'Nursery ledger',     sectionId: 'nursery-ledger' },
  ],
  'soil-fertility': [
    // Fertility colocation hoisted to index 0 (2026-05-12) so the Soil
    // tile cold-opens onto the readout that hosts the "Tune zones
    // (advanced)" disclosure — the controller for the whole
    // zoneThresholds family (6 cards). Every consumer points stewards
    // back here, so making it the default closes the discoverability
    // loop. Designer remains one tab away.
    { label: 'Fertility colocation', sectionId: 'plan-fertility-colocation' },
    { label: 'Soil fertility designer', sectionId: 'plan-soil-fertility' },
    { label: 'Waste-to-resource vectors', sectionId: 'plan-waste-vectors' },
    { label: 'Closed-loop graph', sectionId: 'plan-closed-loop-graph' },
    { label: 'Soil baseline', sectionId: 'plan-soil-baseline' },
    { label: 'Greens & browns', sectionId: 'plan-soil-resources' },
    { label: 'Soil-building plan', sectionId: 'plan-soil-building-plan' },
    { label: 'Soil food-web', sectionId: 'plan-soil-foodweb' },
    { label: 'Compost cycle', sectionId: 'plan-compost-cycle' },
    // B5.1 — cross-registered with plant-systems; same sectionId, one render.
    { label: 'Living-roots audit', sectionId: 'plan-living-roots' },
  ],
  'cross-section-solar': [
    { label: 'Vertical editor',     sectionId: 'plan-transect-vertical' },
    { label: 'Solar overlay',       sectionId: 'plan-solar-overlay' },
    { label: 'Section annotations', sectionId: 'plan-section-annotations' },
  ],
  'phasing-budgeting': [
    { label: 'Phasing matrix',         sectionId: 'plan-phasing-matrix' },
    { label: 'Seasonal tasks',         sectionId: 'plan-seasonal-tasks' },
    // B5.2.x.b — per-phase rollup of cover-crop seed cost + seeding
    // labor hours (project cost only, no yield-as-return framing).
    { label: 'Cover-crop economics',   sectionId: 'plan-cover-crop-economics' },
    { label: 'Labor & budget',         sectionId: 'plan-labor-budget' },
    { label: 'Scale-of-permanence',    sectionId: 'plan-phasing-scale-matrix' },
    { label: 'Cumulative investment',  sectionId: 'plan-cumulative-investment' },
    { label: 'Maintenance schedule',   sectionId: 'plan-maintenance-schedule' },
    { label: 'Equipment replacement',  sectionId: 'plan-equipment-replacement' },
    // Material-substitution calculator (Rec #5 v1 from the permaculture-
    // alignment backlog, 2026-04-28). Surfaces biological alternatives
    // for conventional infrastructure cost line items; toggle writes
    // through to `financialStore.costOverrides` so total investment
    // recomputes. v1 ships 8 cited substitution pairs.
    { label: 'Material substitutions', sectionId: 'plan-material-substitutions' },
  ],
  'principle-verification': [
    { label: 'Holmgren checklist', sectionId: 'plan-holmgren-checklist' },
    { label: 'Three Ethics',       sectionId: 'plan-three-ethics-rollup' },
    { label: 'Coverage matrix',    sectionId: 'plan-principle-coverage-matrix' },
    // Needs & Yields audit (Rec #1 ADR 2026-04-28; v3 Plan-stage surface
    // added 2026-05-13). Promotes the orphan-output / unmet-input /
    // closed-loop / integration-score readout from the legacy MapView
    // RelationshipsRail into the Plan slide-up idiom alongside the
    // other Holmgren P6 + P8 verifications.
    { label: 'Needs & Yields',     sectionId: 'plan-needs-yields' },
  ],
  'regeneration-monitor': [
    { label: 'Trajectory dashboard', sectionId: 'plan-regeneration-monitor' },
  ],
  'habitat-allocation': [
    { label: 'Allocation & inventory', sectionId: 'plan-habitat-allocation' },
    // B5 — cross-registered with plant-systems; same sectionId, one render.
    { label: 'Beneficial-organism audit', sectionId: 'plan-beneficial-habitat' },
  ],
  'biodiversity-monitor': [
    { label: 'Outcome dashboard', sectionId: 'plan-biodiversity-monitor' },
  ],
};
