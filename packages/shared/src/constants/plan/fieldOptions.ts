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

/**
 * Resolve the ordered, deduplicated labour-skill suggestion list for a
 * project's chosen type(s). A thin, type-aware named wrapper over
 * `resolveFieldOptions('laborSkillsByType', ...)` so the labour capture UI has
 * a single, discoverable source of truth for skill suggestions. Returns
 * exactly the same array as the underlying resolver (string parity by
 * construction).
 *
 * Order: `_base`, then `primary` (if present), then each `secondary` in array
 * order. Duplicates removed first-seen. Unknown/missing entries contribute
 * nothing. `secondaries` defaults to `[]`.
 */
export function resolveLabourSkills(
  primary: ProjectTypeId | undefined,
  secondaries: readonly ProjectTypeId[] = [],
): string[] {
  return resolveFieldOptions('laborSkillsByType', primary, secondaries);
}

/**
 * Triple-bottom-line domain tag for a success criterion. Used by the Act
 * tier-0 success-criteria capture UI to balance ecological, economic, and
 * stewardship outcomes when an operator selects/curates criteria.
 */
export type CriterionDomain = 'ecological' | 'economic' | 'stewardship';

/**
 * A single domain-tagged success-criterion option. `text` is the display string
 * (and the legacy dedup key); `domain` is its triple-bottom-line classification.
 */
export interface CriterionOption {
  text: string;
  domain: CriterionDomain;
}

// REVIEW: operator to confirm/extend -- BOTH the domain assignments AND the
// content below are non-authoritative drafts. Domain tags follow a triple-
// bottom-line heuristic (budget/margin/cost/volume/turnover/losses -> economic;
// soil/water/cover-crop/tree/forage/browse/stocking/animal-health/paddock-rest
// -> ecological; documentation/sign-off/safety/chore-rhythm/timeline ->
// stewardship). Per-type lists are authored only for a few representative types
// (homestead, regenerative_farm, market_garden, silvopasture,
// livestock_operation); all other types resolve to `_base` only.
export const SUCCESS_CRITERIA_OPTIONS: Partial<
  Record<ProjectTypeId | '_base', readonly CriterionOption[]>
> = {
  _base: [
    { text: 'Objective documented and shared with the team', domain: 'stewardship' },
    { text: 'Baseline conditions recorded', domain: 'stewardship' },
    { text: 'Steward sign-off obtained', domain: 'stewardship' },
    { text: 'Budget within approved range', domain: 'economic' },
    { text: 'Timeline milestone met', domain: 'stewardship' },
    { text: 'No outstanding safety concerns', domain: 'stewardship' },
  ],
  homestead: [
    { text: 'Household food needs met for target months', domain: 'economic' },
    { text: 'Water catchment covers dry-season demand', domain: 'ecological' },
    { text: 'Family chore rhythm sustainable', domain: 'stewardship' },
  ],
  regenerative_farm: [
    { text: 'Soil organic matter trending upward', domain: 'ecological' },
    { text: 'Cover-crop establishment confirmed', domain: 'ecological' },
    { text: 'Field operating margin positive', domain: 'economic' },
  ],
  market_garden: [
    { text: 'Weekly harvest volume meets demand', domain: 'economic' },
    { text: 'Bed turnover schedule on track', domain: 'economic' },
    { text: 'Post-harvest losses below target', domain: 'economic' },
  ],
  silvopasture: [
    { text: 'Tree survival rate above threshold', domain: 'ecological' },
    { text: 'Forage available across rotation', domain: 'ecological' },
    { text: 'Animal browse damage within limits', domain: 'ecological' },
  ],
  livestock_operation: [
    { text: 'Stocking rate matches carrying capacity', domain: 'ecological' },
    { text: 'Animal health indicators stable', domain: 'ecological' },
    { text: 'Paddock rest periods honored', domain: 'ecological' },
  ],
};

/**
 * Resolve the ordered, deduplicated list of domain-tagged success-criterion
 * options given a project's chosen type(s). Mirrors `resolveFieldOptions`
 * ordering/dedup semantics exactly, but operates on `CriterionOption` objects
 * and dedups by `.text` (case-sensitive exact match), keeping first-seen.
 *
 * Order: `_base`, then `primary` (if present), then each `secondary` in array
 * order. Unknown/missing entries contribute nothing.
 */
export function resolveSuccessCriteriaOptions(
  primary: ProjectTypeId | undefined,
  secondaries: readonly ProjectTypeId[] = [],
): CriterionOption[] {
  const ordered: readonly (readonly CriterionOption[])[] = [
    SUCCESS_CRITERIA_OPTIONS._base ?? [],
    primary ? (SUCCESS_CRITERIA_OPTIONS[primary] ?? []) : [],
    ...secondaries.map((id) => SUCCESS_CRITERIA_OPTIONS[id] ?? []),
  ];

  const seen = new Set<string>();
  const result: CriterionOption[] = [];
  for (const list of ordered) {
    for (const option of list) {
      if (!seen.has(option.text)) {
        seen.add(option.text);
        result.push(option);
      }
    }
  }
  return result;
}

// Derive the legacy plain-string success-criteria list from the single
// domain-tagged source of truth above, so `resolveFieldOptions(
// 'successCriteriaByType', ...)` returns exactly
// `resolveSuccessCriteriaOptions(...).map(o => o.text)`.
const successCriteriaByTypeStrings: FieldOptionSet = Object.fromEntries(
  (
    Object.entries(SUCCESS_CRITERIA_OPTIONS) as [
      ProjectTypeId | '_base',
      readonly CriterionOption[],
    ][]
  ).map(([key, options]) => [key, options.map((o) => o.text)]),
) as FieldOptionSet;

// REVIEW: Draft starter option lists - operator to confirm/extend before these
// are treated as authoritative. Per-type lists are authored only for a few
// representative types (homestead, regenerative_farm, market_garden,
// silvopasture, livestock_operation); all other types resolve to `_base` only.
export const FIELD_OPTION_SETS: Record<string, FieldOptionSet> = {
  successCriteriaByType: successCriteriaByTypeStrings,

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

  // REVIEW: `_base` reconciled with the labour-inventory mockup's general
  // skills (General land maintenance, Fencing & earthworks, Planting &
  // propagation, Animal husbandry, Water systems & irrigation, Design &
  // survey, Equipment operation). Pre-existing generic entries are preserved;
  // mockup skills not already present were folded in, deduped first-seen.
  // Operator to confirm/extend before treating as authoritative.
  laborSkillsByType: {
    _base: [
      'General land maintenance',
      'Fencing & earthworks',
      'Planting & propagation',
      'Animal husbandry',
      'Water systems & irrigation',
      'Design & survey',
      'Equipment operation',
      'General manual labor',
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
