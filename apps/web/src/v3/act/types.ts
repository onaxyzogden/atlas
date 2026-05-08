/**
 * Act stage module types — mirrors plan/types.ts pattern.
 *
 * 5 act modules group the 13 act-stage cards under
 * apps/web/src/features/act/. Each module maps to one or more sectionIds
 * used by ActModuleSlideUp to load the right card.
 */

import {
  Hammer,
  Wrench,
  Beef,
  Sprout,
  Shield,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type ActModule =
  | 'build'
  | 'maintain'
  | 'livestock'
  | 'harvest'
  | 'review'
  | 'network';

export const ACT_MODULES: ActModule[] = [
  'build',
  'maintain',
  'livestock',
  'harvest',
  'review',
  'network',
];

export function isActModule(s: string): s is ActModule {
  return (ACT_MODULES as string[]).includes(s);
}

export const ACT_MODULE_LABEL: Record<ActModule, string> = {
  build:     'Build',
  maintain:  'Maintain',
  livestock: 'Livestock',
  harvest:   'Harvest',
  review:    'Review',
  network:   'Network',
};

export const ACT_MODULE_ICON: Record<ActModule, LucideIcon> = {
  build:     Hammer,
  maintain:  Wrench,
  livestock: Beef,
  harvest:   Sprout,
  review:    Shield,
  network:   Users,
};

export const ACT_MODULE_FULL_LABEL: Record<ActModule, string> = {
  build:     'Build & Construction',
  maintain:  'Maintenance & Operations',
  livestock: 'Livestock & Grazing',
  harvest:   'Harvest & Succession',
  review:    'Review & Risk',
  network:   'Network & Community',
};

/** Each module maps to one or more act card section IDs. */
export const MODULE_CARDS: Record<ActModule, Array<{ label: string; sectionId: string }>> = {
  build: [
    { label: 'Build Gantt',       sectionId: 'act-build-gantt' },
    { label: 'Budget vs actuals', sectionId: 'act-budget-actuals' },
    { label: 'Pilot plots',       sectionId: 'act-pilot-plots' },
  ],
  maintain: [
    { label: 'Maintenance schedule', sectionId: 'act-maintenance' },
    { label: 'Irrigation manager',   sectionId: 'act-irrigation' },
    { label: 'Waste routing',        sectionId: 'act-waste-routing' },
  ],
  livestock: [
    { label: 'Yield log',            sectionId: 'act-livestock-yield' },
    { label: 'Rotation schedule',    sectionId: 'act-livestock-rotation' },
    { label: 'Pasture utilization',  sectionId: 'act-livestock-pasture' },
    { label: 'Forage quality',       sectionId: 'act-livestock-forage' },
    { label: 'Browse pressure',      sectionId: 'act-livestock-browse-pressure' },
    { label: 'Predator hotspots',    sectionId: 'act-livestock-predator-risk' },
    { label: 'Welfare access audit', sectionId: 'act-livestock-welfare-audit' },
    { label: 'Animal corridors',     sectionId: 'act-livestock-corridors' },
  ],
  harvest: [
    { label: 'Harvest log',        sectionId: 'act-harvest-log' },
    { label: 'Succession tracker', sectionId: 'act-succession' },
  ],
  review: [
    { label: 'Ongoing SWOT', sectionId: 'act-ongoing-swot' },
    { label: 'Hazard plans', sectionId: 'act-hazard-plans' },
  ],
  network: [
    { label: 'Network CRM',       sectionId: 'act-network-crm' },
    { label: 'Community events',  sectionId: 'act-community-event' },
    { label: 'Appropriate tech',  sectionId: 'act-appropriate-tech' },
  ],
};
