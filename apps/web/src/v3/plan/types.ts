/**
 * Plan stage module types — rebased onto UniversalDomain (slice 3b+3c).
 *
 * `PlanModule` is now an alias of `UniversalDomain` (16 ids). Plan-stage
 * surfaces expose all 16 domains; legacy collision groups
 * (access-circulation ← dynamic-layering + zone-circulation;
 * built-infrastructure ← structures-subsystems + machinery;
 * ecology ← regeneration-monitor + habitat-allocation + biodiversity-monitor)
 * are concatenated in canonical insertion order of PLAN_MODULE_TO_DOMAIN
 * for CARDS; FULL_LABEL is first-wins per group. Domains without authored
 * Plan content ship with empty CARDS and the uniform domain label as
 * full-label fallback. See ADR 2026-05-26-atlas-universal-domain-step3-cutover.
 */

import type { UniversalDomain } from '@ogden/shared';
import { UNIVERSAL_DOMAINS, UNIVERSAL_DOMAIN_LABELS } from '@ogden/shared';

export type PlanModule = UniversalDomain;

export const PLAN_MODULES: readonly UniversalDomain[] = UNIVERSAL_DOMAINS;

export function isPlanModule(s: string): s is UniversalDomain {
  return (UNIVERSAL_DOMAINS as readonly string[]).includes(s);
}

export const PLAN_MODULE_LABEL: Record<UniversalDomain, string> = UNIVERSAL_DOMAIN_LABELS;

/**
 * Full labels — Plan-stage authored labels where present (first-wins on
 * collision in canonical PLAN_MODULE_TO_DOMAIN insertion order); falls back
 * to uniform UNIVERSAL_DOMAIN_LABELS for unauthored cells.
 */
export const PLAN_MODULE_FULL_LABEL: Record<UniversalDomain, string> = {
  'vision-intent':        'Goal Compass',                       // ← goal-compass
  'land-base':            UNIVERSAL_DOMAIN_LABELS['land-base'],
  'climate':              'Cross-section & Solar Geometry',     // ← cross-section-solar
  'topography':           UNIVERSAL_DOMAIN_LABELS['topography'],
  'hydrology':            'Water Management',                   // ← water-management
  'soil':                 'Soil Fertility & Closed-Loop',       // ← soil-fertility
  'ecology':              'Regeneration Monitoring',            // ← regeneration-monitor (first-wins)
  'plants-food':          'Plant Systems & Polyculture',        // ← plant-systems
  'animals-livestock':    'Livestock & Subdivision',            // ← livestock
  'built-infrastructure': 'Built Environment',                  // ← structures-subsystems (first-wins)
  'access-circulation':   'Dynamic Layering & Permanence',      // ← dynamic-layering (first-wins)
  'energy-resources':     UNIVERSAL_DOMAIN_LABELS['energy-resources'],
  'people-governance':    UNIVERSAL_DOMAIN_LABELS['people-governance'],
  'economics-capacity':   'Phasing & Budgeting',                // ← phasing-budgeting
  'risk-compliance':      'Holmgren Principle Verification',    // ← principle-verification
  'monitoring-records':   UNIVERSAL_DOMAIN_LABELS['monitoring-records'],
};

// ── Vision-Layout canvas (added 2026-05-07; phase tabs retired 2026-05-14) ───
// Top-tab views for the Plan stage. `current` keeps the legacy module-driven
// experience; `vision` opens the design-element canvas; `terrain3d` is a v1
// camera-preset placeholder.
export type PlanView = 'current' | 'vision' | 'terrain3d';

// `terrain3d` is intentionally absent from the tab strip (removed 2026-06-15);
// the union member + label below are kept so the dormant Terrain3DController
// branch in VisionLayoutCanvas/PlanLayout still compiles.
export const PLAN_VIEWS: PlanView[] = ['current', 'vision'];

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
 * - Year 1..2  → `'water'`     (matches the old Year 1 tab)
 * - Year 3..5  → `'buildings'` (matches the old Year 5 tab)
 * - Year 6+    → `null`        (uncapped — same as `current` / `vision`)
 */
export function yeomansCapForYear(year: number): PhaseKey | null {
  if (year <= 2) return 'water';
  if (year <= 5) return 'buildings';
  return null;
}

/**
 * Each domain maps to one or more plan card section IDs. Collision groups
 * concatenated in canonical PLAN_MODULE_TO_DOMAIN insertion order.
 * Empty cells = [].
 */
export const MODULE_CARDS: Record<
  UniversalDomain,
  Array<{ label: string; sectionId: string; group?: string }>
> = {
  'vision-intent': [
    // ← goal-compass
    { label: 'Proposal',          sectionId: 'plan-proposal' },
    { label: 'Build sequence',    sectionId: 'plan-goal-compass-sequence' },
    { label: 'Develop plan',      sectionId: 'plan-develop-plan' },
    { label: 'Criteria forecast', sectionId: 'plan-criteria-forecast' },
  ],
  'land-base': [],
  'climate': [
    // ← cross-section-solar
    { label: 'Vertical editor',     sectionId: 'plan-transect-vertical' },
    { label: 'Solar overlay',       sectionId: 'plan-solar-overlay' },
    { label: 'Section annotations', sectionId: 'plan-section-annotations' },
  ],
  'topography': [],
  'hydrology': [
    // ← water-management
    { label: 'Catchments',               sectionId: 'plan-water-catchments' },
    { label: 'Storage & overflow',       sectionId: 'plan-water-storage' },
    { label: 'Network & balance',        sectionId: 'plan-water-network' },
    { label: 'Highest-potential router', sectionId: 'plan-water-router' },
  ],
  'soil': [
    // ← soil-fertility
    { label: 'Fertility colocation',      sectionId: 'plan-fertility-colocation' },
    { label: 'Soil fertility designer',   sectionId: 'plan-soil-fertility' },
    { label: 'Waste-to-resource vectors', sectionId: 'plan-waste-vectors' },
    { label: 'Closed-loop graph',         sectionId: 'plan-closed-loop-graph' },
    { label: 'Soil baseline',             sectionId: 'plan-soil-baseline' },
    { label: 'Greens & browns',           sectionId: 'plan-soil-resources' },
    { label: 'Soil-building plan',        sectionId: 'plan-soil-building-plan' },
    { label: 'Soil food-web',             sectionId: 'plan-soil-foodweb' },
    { label: 'Compost cycle',             sectionId: 'plan-compost-cycle' },
    // B5.1 — cross-registered with plant-systems; same sectionId, one render.
    { label: 'Living-roots audit',        sectionId: 'plan-living-roots' },
  ],
  'ecology': [
    // ← regeneration-monitor + habitat-allocation + biodiversity-monitor
    // (canonical-order concat)
    { label: 'Trajectory dashboard',       sectionId: 'plan-regeneration-monitor' },
    { label: 'Allocation & inventory',     sectionId: 'plan-habitat-allocation' },
    { label: 'Beneficial-organism audit',  sectionId: 'plan-beneficial-habitat' },
    { label: 'Outcome dashboard',          sectionId: 'plan-biodiversity-monitor' },
  ],
  'plants-food': [
    // ← plant-systems
    { label: 'Plant database',         sectionId: 'plan-plant-database' },
    { label: 'Guild builder',          sectionId: 'plan-guild-builder' },
    { label: 'Canopy simulator',       sectionId: 'plan-canopy-simulator' },
    { label: 'Establishment sequence', sectionId: 'plan-plant-establishment-sequence' },
    { label: 'Edge & connectivity',    sectionId: 'plan-edge-connectivity' },
    { label: 'Canopy maturity',        sectionId: 'plan-temporal-coherence' },
    { label: 'Annual planting schedule', sectionId: 'plan-planting-schedule' },
    { label: 'Guild integrity',        sectionId: 'plan-guild-integrity' },
    { label: 'Succession path',        sectionId: 'plan-succession-path' },
    // B4 — cross-registered with livestock; same sectionId, one render.
    { label: 'Silvopasture integration', sectionId: 'plan-silvopasture-integration' },
    // B5 — cross-registered with habitat-allocation; same sectionId, one render.
    { label: 'Beneficial-organism audit', sectionId: 'plan-beneficial-habitat' },
    { label: 'Cover-crop planner',     sectionId: 'plan-cover-crop-planner' },
    { label: 'Living-roots audit',     sectionId: 'plan-living-roots' },
    { label: 'Nursery ledger',         sectionId: 'nursery-ledger' },
  ],
  'animals-livestock': [
    // ← livestock
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
    { label: 'Silvopasture integration', sectionId: 'plan-silvopasture-integration' },
    { label: 'Slaughter throughput', sectionId: 'plan-product-slaughter-throughput', group: 'Product Chain' },
    { label: 'Cold-chain coverage',  sectionId: 'plan-product-coldchain-coverage',   group: 'Product Chain' },
    { label: 'Market distribution',  sectionId: 'plan-product-market-distribution',  group: 'Product Chain' },
  ],
  'built-infrastructure': [
    // ← structures-subsystems + machinery (canonical-order concat)
    { label: 'Structures overview', sectionId: 'plan-structures-overview' },
    { label: 'Subsystems overview', sectionId: 'plan-subsystems-overview' },
    { label: 'Inventory',           sectionId: 'plan-machinery-inventory' },
    { label: 'Access fit',          sectionId: 'plan-machinery-access-fit' },
    { label: 'Housing & fuel',      sectionId: 'plan-machinery-housing-fuel' },
  ],
  'access-circulation': [
    // ← dynamic-layering + zone-circulation (canonical-order concat)
    { label: 'Permanence scales',     sectionId: 'plan-permanence-scales' },
    { label: 'Permanence ladder',     sectionId: 'plan-permanence-ladder' },
    { label: 'Enterprises',           sectionId: 'plan-enterprises' },
    { label: 'Zone level layer',      sectionId: 'plan-zone-level' },
    { label: 'Path frequency',        sectionId: 'plan-path-frequency' },
    { label: 'Overview & validation', sectionId: 'plan-zone-overview' },
    { label: 'Sectors',               sectionId: 'plan-sector-overlay' },
    { label: 'Social nodes',          sectionId: 'plan-social-nodes' },
  ],
  'energy-resources': [],
  'people-governance': [],
  'economics-capacity': [
    // ← phasing-budgeting
    { label: 'Phasing matrix',         sectionId: 'plan-phasing-matrix' },
    { label: 'Seasonal tasks',         sectionId: 'plan-seasonal-tasks' },
    { label: 'Cover-crop economics',   sectionId: 'plan-cover-crop-economics' },
    { label: 'Labor & budget',         sectionId: 'plan-labor-budget' },
    { label: 'Scale-of-permanence',    sectionId: 'plan-phasing-scale-matrix' },
    { label: 'Cumulative investment',  sectionId: 'plan-cumulative-investment' },
    { label: 'Maintenance schedule',   sectionId: 'plan-maintenance-schedule' },
    { label: 'Equipment replacement',  sectionId: 'plan-equipment-replacement' },
    { label: 'Material substitutions', sectionId: 'plan-material-substitutions' },
  ],
  'risk-compliance': [
    // ← principle-verification
    { label: 'Holmgren checklist', sectionId: 'plan-holmgren-checklist' },
    { label: 'Three Ethics',       sectionId: 'plan-three-ethics-rollup' },
    { label: 'Coverage matrix',    sectionId: 'plan-principle-coverage-matrix' },
    { label: 'Needs & Yields',     sectionId: 'plan-needs-yields' },
  ],
  'monitoring-records': [],
};
