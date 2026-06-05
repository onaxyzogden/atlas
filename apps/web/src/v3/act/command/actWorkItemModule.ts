/**
 * actWorkItemModule — maps a WorkItem to one of the 8 Act modules, so the Act
 * Command Centre can scope the open-work-items tray, tile dot/label, and launch
 * target by the active-module lens. WorkItem (unlike PlanDecision) carries no
 * `affectedModule`, so this derives the module from its provenance `source`,
 * mirroring `ActDataLayers`' `SOURCEKIND_MODULE` idea.
 *
 * Mapping (steward-confirmed in the Act Command Centre plan; rekeyed to
 * UniversalDomain in slice 3b+3c):
 *   - maintenance                                   → built-infrastructure (← maintain)
 *   - scheduled-livestock-move | rotation-sequence  → animals-livestock (← livestock)
 *   - nursery-batch | cover-crop | tree-planting
 *     | agroforestry | habitat-feature              → built-infrastructure (← build)
 *   - everything else (goal-compass | field-task
 *     | manual)                                     → monitoring-records (← tracker)
 *
 * Pure + unit-testable; no store reads, no side effects.
 */

import type { WorkItem } from '@ogden/shared';
import type { ActModule } from '../types.js';

export function actWorkItemModule(item: WorkItem): ActModule {
  switch (item.source) {
    case 'maintenance':
      return 'built-infrastructure';
    case 'scheduled-livestock-move':
    case 'rotation-sequence':
      return 'animals-livestock';
    case 'nursery-batch':
    case 'cover-crop':
    case 'tree-planting':
    case 'agroforestry':
    case 'habitat-feature':
      return 'built-infrastructure';
    case 'goal-compass':
    case 'field-task':
    case 'manual':
    default:
      return 'monitoring-records';
  }
}
