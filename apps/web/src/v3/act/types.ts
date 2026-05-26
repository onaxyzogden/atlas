/**
 * Act-stage module types — rebased onto UniversalDomain (slice 3b+3c).
 *
 * `ActModule` is now an alias of `UniversalDomain` (16 ids). Collision
 * groups (canonical insertion order):
 *   built-infrastructure ← [build, maintain]
 *   monitoring-records   ← [tracker, review]
 * MODULE_CARDS for collision domains are the canonical-order concat of
 * the colliding legacy modules' card arrays. FULL_LABEL / ICON are
 * first-wins. Empty domain×stage cells ship with CARDS=[] and
 * UNIVERSAL_DOMAIN_LABELS as fallback full-label, Circle as fallback
 * icon. See ADR 2026-05-26-atlas-universal-domain-step3-cutover.
 */

import {
  ListChecks,
  Hammer,
  Beef,
  Sprout,
  Users,
  CalendarClock,
  Circle,
  type LucideIcon,
} from 'lucide-react';

import type { UniversalDomain } from '@ogden/shared';
import { UNIVERSAL_DOMAINS, UNIVERSAL_DOMAIN_LABELS } from '@ogden/shared';

export type ActModule = UniversalDomain;

export const ACT_MODULES: readonly UniversalDomain[] = UNIVERSAL_DOMAINS;

export function isActModule(s: string): s is UniversalDomain {
  return (UNIVERSAL_DOMAINS as readonly string[]).includes(s);
}

export const ACT_MODULE_LABEL: Record<UniversalDomain, string> = UNIVERSAL_DOMAIN_LABELS;

/**
 * First-wins icon per domain from legacy ACT_MODULE_ICON via
 * ACT_MODULE_TO_DOMAIN. Unauthored cells fall back to `Circle`.
 */
export const ACT_MODULE_ICON: Record<UniversalDomain, LucideIcon> = {
  'vision-intent':        Circle,
  'land-base':            Circle,
  'climate':              Circle,
  'topography':           Circle,
  'hydrology':            Circle,
  'soil':                 Circle,
  'ecology':              Circle,
  'plants-food':          Sprout,       // ← harvest
  'animals-livestock':    Beef,         // ← livestock
  'built-infrastructure': Hammer,       // ← build (first), maintain
  'access-circulation':   Circle,
  'energy-resources':     Circle,
  'people-governance':    Users,        // ← network
  'economics-capacity':   CalendarClock,// ← schedule
  'risk-compliance':      Circle,
  'monitoring-records':   ListChecks,   // ← tracker (first), review
};

/**
 * First-wins full label per domain from legacy ACT_MODULE_FULL_LABEL
 * via ACT_MODULE_TO_DOMAIN. Unauthored cells fall back to
 * UNIVERSAL_DOMAIN_LABELS.
 */
export const ACT_MODULE_FULL_LABEL: Record<UniversalDomain, string> = {
  'vision-intent':        UNIVERSAL_DOMAIN_LABELS['vision-intent'],
  'land-base':            UNIVERSAL_DOMAIN_LABELS['land-base'],
  'climate':              UNIVERSAL_DOMAIN_LABELS['climate'],
  'topography':           UNIVERSAL_DOMAIN_LABELS['topography'],
  'hydrology':            UNIVERSAL_DOMAIN_LABELS['hydrology'],
  'soil':                 UNIVERSAL_DOMAIN_LABELS['soil'],
  'ecology':              UNIVERSAL_DOMAIN_LABELS['ecology'],
  'plants-food':          'Harvest & Succession',          // ← harvest
  'animals-livestock':    'Livestock & Grazing',           // ← livestock
  'built-infrastructure': 'Build & Construction',          // ← build (first)
  'access-circulation':   UNIVERSAL_DOMAIN_LABELS['access-circulation'],
  'energy-resources':     UNIVERSAL_DOMAIN_LABELS['energy-resources'],
  'people-governance':    'Network & Community',           // ← network
  'economics-capacity':   'Operations Schedule',           // ← schedule
  'risk-compliance':      UNIVERSAL_DOMAIN_LABELS['risk-compliance'],
  'monitoring-records':   'Plan Execution Tracker',        // ← tracker (first)
};

/**
 * Each domain maps to its act card section IDs. Collision domains are
 * canonical-order concat of colliding legacy modules' arrays. Empty
 * cells = [].
 */
export const MODULE_CARDS: Record<
  UniversalDomain,
  Array<{ label: string; sectionId: string }>
> = {
  'vision-intent':        [],
  'land-base':            [],
  'climate':              [],
  'topography':           [],
  'hydrology':            [],
  'soil':                 [],
  'ecology':              [],
  'plants-food': [
    // ← harvest
    { label: 'Harvest log',        sectionId: 'act-harvest-log' },
    { label: 'Structure yield',    sectionId: 'act-structure-yield' },
    { label: 'Succession tracker', sectionId: 'act-succession' },
  ],
  'animals-livestock': [
    // ← livestock
    { label: 'Yield log',            sectionId: 'act-livestock-yield' },
    { label: 'Move log',             sectionId: 'act-livestock-moves' },
    { label: 'Rotation schedule',    sectionId: 'act-livestock-rotation' },
    { label: 'Pasture utilization',  sectionId: 'act-livestock-pasture' },
    { label: 'Forage quality',       sectionId: 'act-livestock-forage' },
    { label: 'Browse pressure',      sectionId: 'act-livestock-browse-pressure' },
    { label: 'Predator hotspots',    sectionId: 'act-livestock-predator-risk' },
    { label: 'Welfare access audit', sectionId: 'act-livestock-welfare-audit' },
    { label: 'Animal corridors',     sectionId: 'act-livestock-corridors' },
  ],
  'built-infrastructure': [
    // ← build
    { label: 'Build Gantt',          sectionId: 'act-build-gantt' },
    { label: 'Budget vs actuals',    sectionId: 'act-budget' },
    { label: 'Pilot plots',          sectionId: 'act-pilot-plots' },
    { label: 'Operating Dashboard',  sectionId: 'act-operating-dashboard' },
    // ← maintain
    { label: 'Event log',            sectionId: 'act-maintenance-events' },
    { label: 'Maintenance schedule', sectionId: 'act-maintenance' },
    { label: 'Irrigation manager',   sectionId: 'act-irrigation' },
    { label: 'Waste routing',        sectionId: 'act-waste-routing' },
  ],
  'access-circulation':   [],
  'energy-resources':     [],
  'people-governance': [
    // ← network
    { label: 'Network CRM',       sectionId: 'act-network-crm' },
    { label: 'Community events',  sectionId: 'act-community-event' },
    { label: 'Appropriate tech',  sectionId: 'act-appropriate-tech' },
  ],
  'economics-capacity': [
    // ← schedule
    { label: 'Weather forecast',  sectionId: 'act-weather-forecast' },
    { label: 'Event calendar',    sectionId: 'act-event-calendar' },
  ],
  'risk-compliance':      [],
  'monitoring-records': [
    // ← tracker
    { label: 'Plan tracker',      sectionId: 'act-plan-tracker' },
    { label: 'Resourcing',        sectionId: 'act-resourcing' },
    { label: 'Incoming packages', sectionId: 'act-incoming-packages' },
    // ← review
    { label: 'Ongoing SWOT',      sectionId: 'act-ongoing-swot' },
    { label: 'Hazard plans',      sectionId: 'act-hazard-plans' },
  ],
};
