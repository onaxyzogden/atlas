/**
 * Observe-stage module types — rebased onto UniversalDomain (slice 3b+3c).
 *
 * `ObserveModule` is now an alias of `UniversalDomain` (16 ids). All Observe-
 * stage surfaces (label tables, card maps, palettes) expose all 16 domains;
 * domains without authored Observe content ship with empty CARDS and the
 * uniform domain label as the full-label fallback. See ADR
 * 2026-05-26-atlas-universal-domain-step3-cutover.
 */

import type { UniversalDomain } from '@ogden/shared';
import { UNIVERSAL_DOMAINS, UNIVERSAL_DOMAIN_LABELS } from '@ogden/shared';

export type LifecycleLevel = 'observe' | 'plan' | 'act';

export type ObserveModule = UniversalDomain;

export const OBSERVE_MODULES: readonly UniversalDomain[] = UNIVERSAL_DOMAINS;

export const OBSERVE_MODULE_LABEL: Record<UniversalDomain, string> = UNIVERSAL_DOMAIN_LABELS;

/**
 * Full labels — Observe-stage authored labels where present (mapped from the
 * legacy stage-local labels via OBSERVE_MODULE_TO_DOMAIN); falls back to the
 * uniform UNIVERSAL_DOMAIN_LABELS for unauthored cells.
 */
export const OBSERVE_MODULE_FULL_LABEL: Record<UniversalDomain, string> = {
  'vision-intent':        UNIVERSAL_DOMAIN_LABELS['vision-intent'],
  'land-base':            UNIVERSAL_DOMAIN_LABELS['land-base'],
  'climate':              'Macroclimate & Hazards',           // ← macroclimate-hazards
  'topography':           'Topography',                       // ← topography
  'hydrology':            'Earth, Water & Ecology',           // ← earth-water-ecology
  'soil':                 UNIVERSAL_DOMAIN_LABELS['soil'],
  'ecology':              UNIVERSAL_DOMAIN_LABELS['ecology'],
  'plants-food':          UNIVERSAL_DOMAIN_LABELS['plants-food'],
  'animals-livestock':    UNIVERSAL_DOMAIN_LABELS['animals-livestock'],
  'built-infrastructure': 'Built Environment',                // ← built-environment
  'access-circulation':   'Sectors & Zones',                  // ← sectors-zones
  'energy-resources':     UNIVERSAL_DOMAIN_LABELS['energy-resources'],
  'people-governance':    'Human Context',                    // ← human-context
  'economics-capacity':   UNIVERSAL_DOMAIN_LABELS['economics-capacity'],
  'risk-compliance':      UNIVERSAL_DOMAIN_LABELS['risk-compliance'],
  'monitoring-records':   'SWOT Synthesis',                   // ← swot-synthesis
};

/**
 * Each domain maps to one or more peer card section IDs. Empty cells = [].
 * Observe was collision-free (7 modules → 7 distinct domains), so no
 * canonical-order concat needed here.
 */
export const OBSERVE_MODULE_CARDS: Record<
  UniversalDomain,
  Array<{ label: string; sectionId: string; group?: string }>
> = {
  'vision-intent': [],
  'land-base': [],
  'climate': [
    { label: 'Dashboard',                sectionId: 'observe-macroclimate-hazards-dashboard' },
    { label: 'Solar & Climate',          sectionId: 'observe-macroclimate-hazards-solar-climate' },
    { label: 'Hazards Log',              sectionId: 'observe-macroclimate-hazards-log' },
  ],
  'topography': [
    { label: 'Dashboard',                sectionId: 'observe-topography-dashboard' },
    { label: 'Terrain',                  sectionId: 'observe-topography-terrain' },
    { label: 'Cartographic',             sectionId: 'observe-topography-cartographic' },
    { label: 'Cross-section',            sectionId: 'observe-topography-cross-section' },
  ],
  'hydrology': [
    { label: 'Dashboard',                sectionId: 'observe-earth-water-ecology-dashboard' },
    { label: 'Hydrology',                sectionId: 'observe-earth-water-ecology-hydrology' },
    { label: 'Ecological',               sectionId: 'observe-earth-water-ecology-ecological' },
    { label: 'Jar / Perc / Roof',        sectionId: 'observe-earth-water-ecology-jar-perc-roof' },
  ],
  'soil': [],
  'ecology': [],
  'plants-food': [],
  'animals-livestock': [],
  'built-infrastructure': [
    { label: 'Dashboard',                sectionId: 'observe-built-environment-dashboard' },
  ],
  'access-circulation': [
    { label: 'Dashboard',                sectionId: 'observe-sectors-zones-dashboard' },
    { label: 'Sector Compass',           sectionId: 'observe-sectors-zones-sector-compass' },
    { label: 'Cartographic',             sectionId: 'observe-sectors-zones-cartographic' },
  ],
  'energy-resources': [],
  'people-governance': [
    { label: 'Dashboard',                sectionId: 'observe-human-context-dashboard' },
    { label: 'Steward Survey',           sectionId: 'observe-human-context-steward-survey' },
    { label: 'Indigenous & Regional',    sectionId: 'observe-human-context-indigenous-regional' },
    { label: 'Vision',                   sectionId: 'observe-human-context-vision' },
  ],
  'economics-capacity': [],
  'risk-compliance': [],
  'monitoring-records': [
    { label: 'Dashboard',                sectionId: 'observe-swot-synthesis-dashboard' },
    { label: 'Journal',                  sectionId: 'observe-swot-synthesis-journal' },
    { label: 'Diagnosis Report',         sectionId: 'observe-swot-synthesis-diagnosis-report' },
  ],
};

export function isObserveModule(value: string): value is UniversalDomain {
  return (UNIVERSAL_DOMAINS as readonly string[]).includes(value);
}
