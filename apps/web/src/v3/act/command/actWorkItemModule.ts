/**
 * actWorkItemModule — maps a WorkItem to one of the 8 Act modules, so the Act
 * Command Centre can scope the open-work-items tray, tile dot/label, and launch
 * target by the active-module lens. WorkItem (unlike PlanDecision) carries no
 * `affectedModule`, so this derives the module from its provenance `source`,
 * mirroring `ActDataLayers`' `SOURCEKIND_MODULE` idea.
 *
 * Mapping (steward-confirmed in the Act Command Centre plan):
 *   - maintenance                                   → maintain
 *   - scheduled-livestock-move | rotation-sequence  → livestock
 *   - nursery-batch | cover-crop | tree-planting
 *     | agroforestry | habitat-feature              → build
 *   - everything else (goal-compass | field-task
 *     | manual)                                     → tracker (the cross-module
 *                                                     execution spine)
 *
 * Pure + unit-testable; no store reads, no side effects.
 */

import type { WorkItem } from '@ogden/shared';
import type { ActModule } from '../types.js';

export function actWorkItemModule(item: WorkItem): ActModule {
  switch (item.source) {
    case 'maintenance':
      return 'maintain';
    case 'scheduled-livestock-move':
    case 'rotation-sequence':
      return 'livestock';
    case 'nursery-batch':
    case 'cover-crop':
    case 'tree-planting':
    case 'agroforestry':
    case 'habitat-feature':
      return 'build';
    case 'goal-compass':
    case 'field-task':
    case 'manual':
    default:
      return 'tracker';
  }
}
