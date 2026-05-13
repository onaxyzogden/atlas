/**
 * Plan stage module types — mirrors observe/types.ts pattern.
 *
 * 11 plan modules map 1:1 to PlanHub's module cards and to the
 * PlanModuleBar tiles. Each module maps to one or more plan card
 * sectionIds (used by PlanModuleSlideUp to load the right card).
 */

export type PlanModule =
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
  | 'principle-verification';

export const PLAN_MODULES: PlanModule[] = [
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
];

export function isPlanModule(s: string): s is PlanModule {
  return (PLAN_MODULES as string[]).includes(s);
}

export const PLAN_MODULE_LABEL: Record<PlanModule, string> = {
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
};

export const PLAN_MODULE_FULL_LABEL: Record<PlanModule, string> = {
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
};

// ── Vision-Layout canvas (added 2026-05-07) ──────────────────────────────────
// Top-tab views for the Plan stage. `current` keeps the legacy module-driven
// experience; `vision` opens the design-element canvas; phase tabs filter the
// canvas by Yeomans Scale of Permanence index. `terrain3d` is a v1 placeholder.
export type PlanView =
  | 'current'
  | 'vision'
  | 'phase-1'
  | 'phase-2'
  | 'terrain3d';

export const PLAN_VIEWS: PlanView[] = [
  'current',
  'vision',
  'phase-1',
  'phase-2',
  'terrain3d',
];

export const PLAN_VIEW_LABEL: Record<PlanView, string> = {
  current: 'Current Land',
  vision: 'Vision Layout',
  'phase-1': 'Year 1',
  'phase-2': 'Year 5',
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

/** Cap (inclusive) used to filter elements visible in each phase view tab. */
export const PHASE_VIEW_CAP: Record<'phase-1' | 'phase-2', PhaseKey> = {
  'phase-1': 'water',     // Year 1: climate → landshape → water
  'phase-2': 'buildings', // Year 5: through buildings
};

/** Each module maps to one or more plan card section IDs. */
export const MODULE_CARDS: Record<
  PlanModule,
  Array<{ label: string; sectionId: string; group?: string }>
> = {
  'dynamic-layering': [
    { label: 'Permanence scales', sectionId: 'plan-permanence-scales' },
    { label: 'Permanence ladder', sectionId: 'plan-permanence-ladder' },
    { label: 'Enterprises',       sectionId: 'plan-enterprises' },
  ],
  'water-management': [
    { label: 'Catchments',     sectionId: 'plan-water-catchments' },
    { label: 'Storage & overflow', sectionId: 'plan-water-storage' },
    { label: 'Network & balance',  sectionId: 'plan-water-network' },
  ],
  'zone-circulation': [
    { label: 'Zone level layer', sectionId: 'plan-zone-level' },
    { label: 'Path frequency',   sectionId: 'plan-path-frequency' },
    { label: 'Overview & validation', sectionId: 'plan-zone-overview' },
    { label: 'Sectors',          sectionId: 'plan-sector-overlay' },
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
  ],
  'cross-section-solar': [
    { label: 'Vertical editor',     sectionId: 'plan-transect-vertical' },
    { label: 'Solar overlay',       sectionId: 'plan-solar-overlay' },
    { label: 'Section annotations', sectionId: 'plan-section-annotations' },
  ],
  'phasing-budgeting': [
    { label: 'Phasing matrix',         sectionId: 'plan-phasing-matrix' },
    { label: 'Seasonal tasks',         sectionId: 'plan-seasonal-tasks' },
    { label: 'Labor & budget',         sectionId: 'plan-labor-budget' },
    { label: 'Scale-of-permanence',    sectionId: 'plan-phasing-scale-matrix' },
    { label: 'Cumulative investment',  sectionId: 'plan-cumulative-investment' },
    { label: 'Equipment replacement',  sectionId: 'plan-equipment-replacement' },
  ],
  'principle-verification': [
    { label: 'Holmgren checklist', sectionId: 'plan-holmgren-checklist' },
    { label: 'Three Ethics',       sectionId: 'plan-three-ethics-rollup' },
    { label: 'Coverage matrix',    sectionId: 'plan-principle-coverage-matrix' },
  ],
};
