/**
 * Observe-stage types — UI revamp Phase A.
 *
 * Atlas collapses the legacy 7-stage lifecycle (discover → … → report) into a
 * 3-level model (Observe / Plan / Act). Observe folds the prior Discover and
 * Diagnose surfaces into 6 modules surfaced via a bottom-rail tile + slide-up
 * pane. Legacy types in `../types.ts` (LifecycleStage = BannerId) remain in
 * use until Phase C — these new types coexist.
 */

export type LifecycleLevel = 'observe' | 'plan' | 'act';

export type ObserveModule =
  | 'human-context'
  | 'built-environment'
  | 'macroclimate-hazards'
  | 'topography'
  | 'earth-water-ecology'
  | 'sectors-zones'
  | 'swot-synthesis';

export const OBSERVE_MODULES: readonly ObserveModule[] = [
  'human-context',
  'built-environment',
  'macroclimate-hazards',
  'topography',
  'earth-water-ecology',
  'sectors-zones',
  'swot-synthesis',
] as const;

export const OBSERVE_MODULE_LABEL: Record<ObserveModule, string> = {
  'human-context': 'Human Context',
  'built-environment': 'Built Environment',
  'macroclimate-hazards': 'Macroclimate & Hazards',
  topography: 'Topography',
  'earth-water-ecology': 'Earth, Water & Ecology',
  'sectors-zones': 'Sectors & Zones',
  'swot-synthesis': 'SWOT Synthesis',
};

/** Parity with PLAN_MODULE_FULL_LABEL — used in slide-up sheet header. */
export const OBSERVE_MODULE_FULL_LABEL: Record<ObserveModule, string> = {
  'human-context': 'Human Context',
  'built-environment': 'Built Environment',
  'macroclimate-hazards': 'Macroclimate & Hazards',
  topography: 'Topography',
  'earth-water-ecology': 'Earth, Water & Ecology',
  'sectors-zones': 'Sectors & Zones',
  'swot-synthesis': 'SWOT Synthesis',
};

/**
 * Each Observe module maps to one or more peer card section IDs — mirrors
 * Plan/Act `MODULE_CARDS`. First entry per module is the Dashboard; later
 * entries are the existing Detail pages, surfaced as peer tabs in the
 * slide-up (no Dashboard/Detail nesting).
 */
export const OBSERVE_MODULE_CARDS: Record<
  ObserveModule,
  Array<{ label: string; sectionId: string }>
> = {
  'human-context': [
    { label: 'Dashboard',                sectionId: 'observe-human-context-dashboard' },
    { label: 'Steward Survey',           sectionId: 'observe-human-context-steward-survey' },
    { label: 'Indigenous & Regional',    sectionId: 'observe-human-context-indigenous-regional' },
    { label: 'Vision',                   sectionId: 'observe-human-context-vision' },
  ],
  'built-environment': [
    { label: 'Dashboard',                sectionId: 'observe-built-environment-dashboard' },
  ],
  'macroclimate-hazards': [
    { label: 'Dashboard',                sectionId: 'observe-macroclimate-hazards-dashboard' },
    { label: 'Solar & Climate',          sectionId: 'observe-macroclimate-hazards-solar-climate' },
    { label: 'Hazards Log',              sectionId: 'observe-macroclimate-hazards-log' },
  ],
  topography: [
    { label: 'Dashboard',                sectionId: 'observe-topography-dashboard' },
    { label: 'Terrain',                  sectionId: 'observe-topography-terrain' },
    { label: 'Cartographic',             sectionId: 'observe-topography-cartographic' },
    { label: 'Cross-section',            sectionId: 'observe-topography-cross-section' },
  ],
  'earth-water-ecology': [
    { label: 'Dashboard',                sectionId: 'observe-earth-water-ecology-dashboard' },
    { label: 'Hydrology',                sectionId: 'observe-earth-water-ecology-hydrology' },
    { label: 'Ecological',               sectionId: 'observe-earth-water-ecology-ecological' },
    { label: 'Jar / Perc / Roof',        sectionId: 'observe-earth-water-ecology-jar-perc-roof' },
  ],
  'sectors-zones': [
    { label: 'Dashboard',                sectionId: 'observe-sectors-zones-dashboard' },
    { label: 'Sector Compass',           sectionId: 'observe-sectors-zones-sector-compass' },
    { label: 'Cartographic',             sectionId: 'observe-sectors-zones-cartographic' },
  ],
  'swot-synthesis': [
    { label: 'Dashboard',                sectionId: 'observe-swot-synthesis-dashboard' },
    { label: 'Journal',                  sectionId: 'observe-swot-synthesis-journal' },
    { label: 'Diagnosis Report',         sectionId: 'observe-swot-synthesis-diagnosis-report' },
  ],
};

export function isObserveModule(value: string): value is ObserveModule {
  return (OBSERVE_MODULES as readonly string[]).includes(value);
}
