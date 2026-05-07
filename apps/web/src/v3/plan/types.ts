/**
 * Plan stage module types — mirrors observe/types.ts pattern.
 *
 * 8 plan modules map 1:1 to PlanHub's module cards and to the
 * PlanModuleBar tiles. Each module maps to one or more plan card
 * sectionIds (used by PlanModuleSlideUp to load the right card).
 */

export type PlanModule =
  | 'dynamic-layering'
  | 'water-management'
  | 'zone-circulation'
  | 'plant-systems'
  | 'soil-fertility'
  | 'cross-section-solar'
  | 'phasing-budgeting'
  | 'principle-verification';

export const PLAN_MODULES: PlanModule[] = [
  'dynamic-layering',
  'water-management',
  'zone-circulation',
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
  'plant-systems':          'Plant Systems & Polyculture',
  'soil-fertility':         'Soil Fertility & Closed-Loop',
  'cross-section-solar':    'Cross-section & Solar Geometry',
  'phasing-budgeting':      'Phasing & Budgeting',
  'principle-verification': 'Holmgren Principle Verification',
};

/** Each module maps to one or more plan card section IDs. */
export const MODULE_CARDS: Record<PlanModule, Array<{ label: string; sectionId: string }>> = {
  'dynamic-layering': [
    { label: 'Permanence scales', sectionId: 'plan-permanence-scales' },
  ],
  'water-management': [
    { label: 'Runoff calculator',  sectionId: 'plan-runoff-calculator' },
    { label: 'Swale / drain tool', sectionId: 'plan-swale-drain' },
    { label: 'Storage placement',  sectionId: 'plan-storage-infra' },
  ],
  'zone-circulation': [
    { label: 'Zone level layer', sectionId: 'plan-zone-level' },
    { label: 'Path frequency',   sectionId: 'plan-path-frequency' },
  ],
  'plant-systems': [
    { label: 'Plant database',    sectionId: 'plan-plant-database' },
    { label: 'Guild builder',     sectionId: 'plan-guild-builder' },
    { label: 'Canopy simulator',  sectionId: 'plan-canopy-simulator' },
  ],
  'soil-fertility': [
    { label: 'Soil fertility designer', sectionId: 'plan-soil-fertility' },
    { label: 'Waste-to-resource vectors', sectionId: 'plan-waste-vectors' },
  ],
  'cross-section-solar': [
    { label: 'Vertical editor', sectionId: 'plan-transect-vertical' },
    { label: 'Solar overlay',   sectionId: 'plan-solar-overlay' },
  ],
  'phasing-budgeting': [
    { label: 'Phasing matrix',  sectionId: 'plan-phasing-matrix' },
    { label: 'Seasonal tasks',  sectionId: 'plan-seasonal-tasks' },
    { label: 'Labor & budget',  sectionId: 'plan-labor-budget' },
  ],
  'principle-verification': [
    { label: 'Holmgren checklist', sectionId: 'plan-holmgren-checklist' },
  ],
};
