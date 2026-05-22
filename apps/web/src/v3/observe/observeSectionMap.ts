/**
 * observeSectionMap — single source of truth for the Observe stage's
 * BE-category → module routing and the rail-section-id → module helper.
 *
 * 2026-05-22 — extracted from `ObserveTools` / `ObserveChecklistAside` (which
 * each carried their own copy, with a standing "the two tables must agree"
 * warning) so the main rail, the mini rail, and `ObserveLayout`'s shared
 * `effectiveSectionId` reconcile all read one table.
 */

import type { BuiltEnvironmentCategory } from '@ogden/shared';
import type { ObserveModule } from './types.js';

/**
 * 2026-05-14 — BE flatten. Observe has fewer modules than Plan, so most BE
 * categories fall back to `built-environment`; vegetation / earthworks route
 * to ecology / topography respectively.
 */
export const BE_CATEGORY_TO_OBSERVE_MODULE: Record<
  BuiltEnvironmentCategory,
  ObserveModule
> = {
  building: 'built-environment',
  agricultural: 'built-environment',
  utility: 'built-environment',
  infrastructure: 'built-environment',
  machinery: 'built-environment',
  amenity: 'built-environment',
  vegetation: 'earth-water-ecology',
  earthworks: 'topography',
};

/**
 * Maps a rail-section id back to the Observe module it activates. Section ids
 * reuse each section's React `key`: BE category sections are `be-<category>`
 * (routed via `BE_CATEGORY_TO_OBSERVE_MODULE`), the leading adopt meta-section
 * is `be-from-map`, and every other section's id IS its module. Used to
 * lazily reconcile the picked-section discriminator against the active module
 * (see `effectiveSectionId` in `ObserveLayout`).
 */
export function observeSectionIdModule(id: string): ObserveModule {
  // `be-from-map` is the adopt-from-map meta-section, routed to
  // `built-environment`. Checked before the `be-<category>` slice because
  // `from-map` is not a BuiltEnvironmentCategory.
  if (id === 'be-from-map') return 'built-environment';
  if (id.startsWith('be-')) {
    const category = id.slice(3) as BuiltEnvironmentCategory;
    if (category in BE_CATEGORY_TO_OBSERVE_MODULE) {
      return BE_CATEGORY_TO_OBSERVE_MODULE[category];
    }
  }
  return id as ObserveModule;
}
