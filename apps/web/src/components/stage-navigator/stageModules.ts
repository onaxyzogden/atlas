/**
 * Stage → Module → Item taxonomy for the LevelNavigator.
 *
 * The 3-stage IA already groups items by stage in `navigation/taxonomy.ts`.
 * The next level down — modules — is currently expressed only in source-file
 * comments (e.g. "Phase 4a — Human Context (Module 1)"). This file lifts
 * those comment groupings into structured data so `StageNavigator` can
 * render modules as `LevelNavigator` pillars and the pages within each
 * module as `pillarTasks` (the BBOS template described in the
 * @ogden/ui-components README).
 *
 * Each `itemId` matches the `id` field of an entry in `DASHBOARD_ITEMS`
 * (and the corresponding `case` in `DashboardRouter`). The labels are
 * resolved lazily from `DASHBOARD_ITEMS` so any rename in taxonomy
 * propagates here without edits.
 *
 * Source comments cross-referenced:
 *   - taxonomy.ts lines 226–275 (Observe modules 1–6)
 *   - taxonomy.ts lines 322–414 (Plan modules 1–8)
 *   - taxonomy.ts lines 432–501 (Act modules 1–5)
 */

import type { Stage3Key } from '../../features/navigation/taxonomy.js';

export interface StageModule {
  /** Stable id used as the LevelNavigator pillar id. */
  id: string;
  /** Short label shown on the pillar column. */
  label: string;
  /** Ids of `DASHBOARD_ITEMS` belonging to this module, in display order. */
  itemIds: string[];
}

export const STAGE_MODULES: Record<Stage3Key, StageModule[]> = {
  observe: [
    {
      id: 'observe-mod-human-context',
      label: 'Human Context',
      itemIds: ['observe-steward-survey', 'observe-indigenous-regional'],
    },
    {
      id: 'observe-mod-macroclimate',
      label: 'Macroclimate & Hazards',
      itemIds: ['observe-hazards-log'],
    },
    {
      id: 'observe-mod-topography',
      label: 'Topography',
      itemIds: ['observe-cross-section'],
    },
    {
      id: 'observe-mod-diagnostics',
      label: 'Earth / Water / Ecology',
      itemIds: ['observe-soil-tests', 'observe-food-chain'],
    },
    {
      id: 'observe-mod-sectors',
      label: 'Sectors & Microclimates',
      itemIds: ['observe-sector-compass'],
    },
    {
      id: 'observe-mod-swot',
      label: 'SWOT Synthesis',
      itemIds: ['observe-swot-journal', 'observe-diagnosis-report'],
    },
  ],
  plan: [
    {
      id: 'plan-mod-dynamic-layering',
      label: 'Dynamic Layering',
      itemIds: ['plan-permanence-scales'],
    },
    {
      id: 'plan-mod-water',
      label: 'Water Management',
      itemIds: ['plan-runoff-calculator', 'plan-swale-drain', 'plan-storage-infra'],
    },
    {
      id: 'plan-mod-zones',
      label: 'Zone & Circulation',
      itemIds: ['plan-zone-level', 'plan-path-frequency'],
    },
    {
      id: 'plan-mod-plants',
      label: 'Plant System',
      itemIds: ['plan-plant-database', 'plan-guild-builder', 'plan-canopy-simulator'],
    },
    {
      id: 'plan-mod-soil',
      label: 'Soil & Closed-Loop',
      itemIds: ['plan-soil-fertility', 'plan-waste-vectors'],
    },
    {
      id: 'plan-mod-transect',
      label: 'Cross-Section + Solar',
      itemIds: ['plan-transect-vertical', 'plan-solar-overlay'],
    },
    {
      id: 'plan-mod-phasing',
      label: 'Phasing & Budgeting',
      itemIds: ['plan-phasing-matrix', 'plan-seasonal-tasks', 'plan-labor-budget'],
    },
    {
      id: 'plan-mod-principles',
      label: 'Principle Verification',
      itemIds: ['plan-holmgren-checklist'],
    },
  ],
  act: [
    {
      id: 'act-mod-implementation',
      label: 'Phased Implementation',
      itemIds: ['act-build-gantt', 'act-budget-actuals', 'act-pilot-plots'],
    },
    {
      id: 'act-mod-maintenance',
      label: 'Maintenance & Operations',
      itemIds: ['act-maintenance-schedule', 'act-irrigation-manager', 'act-waste-routing'],
    },
    {
      id: 'act-mod-monitoring',
      label: 'Monitoring & Yield',
      itemIds: ['act-ongoing-swot', 'act-harvest-log', 'act-succession-tracker'],
    },
    {
      id: 'act-mod-social',
      label: 'Social Permaculture',
      itemIds: ['act-network-crm', 'act-community-events'],
    },
    {
      id: 'act-mod-disaster',
      label: 'Disaster Preparedness',
      itemIds: ['act-hazard-plans', 'act-appropriate-tech'],
    },
  ],
};
