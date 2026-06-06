// fieldOptions.ts
//
// Pure, shared resolver + starter content for the predetermined dropdown
// options that drive structured objective-capture forms in the Act tier-shell.
// Each "option set" is keyed by a stable id (e.g. `successCriteriaByType`) and
// carries a generic `_base` list plus optional per-ProjectTypeId lists. The
// resolver unions `_base`, the chosen primary type list, and each secondary
// type list, in that order, deduplicating first-seen so a field can offer the
// right blend of generic + type-specific suggestions alongside free-form entry.
//
// This module is pure data + one pure function: no React, no app imports, no
// side effects. Consumed later by the web UI (a separate task).
//
// REVIEW: Draft starter option lists - operator to confirm/extend before these
// are treated as authoritative.

import type { ProjectTypeId } from '../../schemas/plan/projectTypeTaxonomy.schema.js';

/**
 * A single option set: an optional generic `_base` list plus optional per-type
 * lists. All lists are readonly; absent keys simply contribute nothing.
 */
export type FieldOptionSet = Partial<
  Record<ProjectTypeId | '_base', readonly string[]>
>;

/**
 * Resolve the ordered, deduplicated list of dropdown options for one option set
 * given a project's chosen type(s).
 *
 * Order: the set's `_base` list, then the `primaryTypeId` list (if present),
 * then each `secondaryTypeIds` list in array order. Duplicates (case-sensitive
 * exact-string match) are removed, keeping the first-seen occurrence.
 *
 * Unknown `optionSetId` -> `[]`. A missing primary/secondary entry contributes
 * nothing. `secondaryTypeIds` defaults to `[]`.
 */
export function resolveFieldOptions(
  optionSetId: string,
  primaryTypeId: ProjectTypeId | undefined,
  secondaryTypeIds: readonly ProjectTypeId[] = [],
): string[] {
  const set = FIELD_OPTION_SETS[optionSetId];
  if (!set) return [];

  const ordered: readonly (readonly string[])[] = [
    set._base ?? [],
    primaryTypeId ? (set[primaryTypeId] ?? []) : [],
    ...secondaryTypeIds.map((id) => set[id] ?? []),
  ];

  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of ordered) {
    for (const value of list) {
      if (!seen.has(value)) {
        seen.add(value);
        result.push(value);
      }
    }
  }
  return result;
}

// REVIEW: Draft starter option lists - operator to confirm/extend before these
// are treated as authoritative. Per-type lists are authored only for a few
// representative types (homestead, regenerative_farm, market_garden,
// silvopasture, livestock_operation); all other types resolve to `_base` only.
export const FIELD_OPTION_SETS: Record<string, FieldOptionSet> = {
  successCriteriaByType: {
    _base: [
      'Objective documented and shared with the team',
      'Baseline conditions recorded',
      'Steward sign-off obtained',
      'Budget within approved range',
      'Timeline milestone met',
      'No outstanding safety concerns',
    ],
    homestead: [
      'Household food needs met for target months',
      'Water catchment covers dry-season demand',
      'Family chore rhythm sustainable',
    ],
    regenerative_farm: [
      'Soil organic matter trending upward',
      'Cover-crop establishment confirmed',
      'Field operating margin positive',
    ],
    market_garden: [
      'Weekly harvest volume meets demand',
      'Bed turnover schedule on track',
      'Post-harvest losses below target',
    ],
    silvopasture: [
      'Tree survival rate above threshold',
      'Forage available across rotation',
      'Animal browse damage within limits',
    ],
    livestock_operation: [
      'Stocking rate matches carrying capacity',
      'Animal health indicators stable',
      'Paddock rest periods honored',
    ],
  },

  constraintsByType: {
    _base: [
      'Limited budget',
      'Seasonal weather window',
      'Labor availability',
      'Equipment access',
      'Regulatory or permit requirement',
      'Water availability',
    ],
    homestead: [
      'Single-household labor capacity',
      'Off-farm income obligations',
      'Limited storage and processing space',
    ],
    regenerative_farm: [
      'Transition-period yield dip',
      'Soil compaction from prior use',
      'Market access for new crops',
    ],
    market_garden: [
      'Tight planting succession windows',
      'Cold-storage capacity',
      'Perishable delivery logistics',
    ],
    silvopasture: [
      'Tree establishment lead time',
      'Browse pressure on young trees',
      'Fencing and rotation infrastructure',
    ],
    livestock_operation: [
      'Forage carrying capacity',
      'Water points per paddock',
      'Predator and biosecurity risk',
    ],
  },

  laborSkillsByType: {
    _base: [
      'General manual labor',
      'Equipment operation',
      'Record keeping',
      'Composting',
      'Basic carpentry',
      'Irrigation maintenance',
    ],
    homestead: [
      'Food preservation',
      'Small-livestock care',
      'Kitchen-garden management',
    ],
    regenerative_farm: [
      'Cover-crop management',
      'Soil sampling and testing',
      'Rotational planning',
    ],
    market_garden: [
      'Intensive bed preparation',
      'Succession planting',
      'Harvest and post-harvest handling',
    ],
    silvopasture: [
      'Tree planting and protection',
      'Pasture and forage management',
      'Animal rotation',
    ],
    livestock_operation: [
      'Animal husbandry',
      'Grazing management',
      'Herd health monitoring',
    ],
  },

  laborSeasonality: {
    _base: [
      'Year-round / consistent',
      'Seasonal -- summer peak',
      'Seasonal -- winter peak',
      'Variable / weather-dependent',
    ],
  },
};
