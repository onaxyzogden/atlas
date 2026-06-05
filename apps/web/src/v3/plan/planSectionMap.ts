/**
 * planSectionMap — single source of truth for the Plan stage's
 * BE-category → module routing and the rail-section-id → module helper.
 *
 * 2026-05-22 — extracted from `PlanTools` / `PlanChecklistAside` (which each
 * carried their own copy) so the main rail, the mini rail, and `PlanLayout`'s
 * shared `effectiveSectionId` reconcile all read one table. The cross-rail
 * single-section highlight depends on every rail agreeing on which module a
 * section id activates.
 */

import type { BuiltEnvironmentCategory } from '@ogden/shared';
import type { PlanModule } from './types.js';

/**
 * 2026-05-14 — BE flatten. Each `BuiltEnvironmentCategory` surfaces as its
 * own top-level rail section; clicking it activates the routed Plan module.
 * Plan has dedicated modules for several BE concerns (machinery,
 * plant-systems, water-management), so the mapping is more specific than
 * Observe's.
 */
export const BE_CATEGORY_TO_PLAN_MODULE: Record<
  BuiltEnvironmentCategory,
  PlanModule
> = {
  building: 'built-infrastructure',
  agricultural: 'built-infrastructure',
  utility: 'built-infrastructure',
  infrastructure: 'built-infrastructure',
  machinery: 'built-infrastructure',
  amenity: 'built-infrastructure',
  vegetation: 'plants-food',
  earthworks: 'hydrology',
};

/**
 * Maps a rail-section id back to the Plan module it activates. Section ids
 * reuse each section's React `key`: BE category sections are `be-<category>`
 * (routed via `BE_CATEGORY_TO_PLAN_MODULE`); every other section's id IS its
 * module. Used to lazily reconcile the picked-section discriminator against
 * the active module (see `effectiveSectionId` in `PlanLayout`) without a
 * race-prone effect — a stale id simply routes to a different module and is
 * ignored.
 */
export function planSectionIdModule(id: string): PlanModule {
  if (id.startsWith('be-')) {
    const category = id.slice(3) as BuiltEnvironmentCategory;
    if (category in BE_CATEGORY_TO_PLAN_MODULE) {
      return BE_CATEGORY_TO_PLAN_MODULE[category];
    }
  }
  return id as PlanModule;
}
