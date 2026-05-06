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
  | 'macroclimate-hazards'
  | 'topography'
  | 'earth-water-ecology'
  | 'sectors-zones'
  | 'swot-synthesis';

export const OBSERVE_MODULES: readonly ObserveModule[] = [
  'human-context',
  'macroclimate-hazards',
  'topography',
  'earth-water-ecology',
  'sectors-zones',
  'swot-synthesis',
] as const;

export const OBSERVE_MODULE_LABEL: Record<ObserveModule, string> = {
  'human-context': 'Human Context',
  'macroclimate-hazards': 'Macroclimate & Hazards',
  topography: 'Topography',
  'earth-water-ecology': 'Earth, Water & Ecology',
  'sectors-zones': 'Sectors & Zones',
  'swot-synthesis': 'SWOT Synthesis',
};

export function isObserveModule(value: string): value is ObserveModule {
  return (OBSERVE_MODULES as readonly string[]).includes(value);
}
