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
 * Ordered category definitions covering every skill across all project types.
 * Used by LabourInventoryCapture to render the flat `skillSuggestions` list
 * with labelled category groups. Skills absent from the resolved list for a
 * given project are simply never displayed; the map acts as a pure display hint.
 * Custom user-added skills (not in any category) render without a header.
 */
export const LABOUR_SKILL_CATEGORIES: readonly {
  label: string;
  skills: readonly string[];
}[] = [
  {
    label: 'Animal care',
    skills: [
      'Animal husbandry',
      'Small-livestock care',
      'Grazing management',
      'Herd health monitoring',
      'Animal rotation',
      'Pasture and forage management',
    ],
  },
  {
    label: 'Land & structures',
    skills: [
      'General land maintenance',
      'Fencing & earthworks',
      'Basic carpentry',
      'Equipment operation',
    ],
  },
  {
    label: 'Water & growing',
    skills: [
      'Water systems & irrigation',
      'Irrigation maintenance',
      'Planting & propagation',
      'Composting',
      'Kitchen-garden management',
      'Food preservation',
      'Cover-crop management',
      'Soil sampling and testing',
      'Intensive bed preparation',
      'Succession planting',
      'Harvest and post-harvest handling',
    ],
  },
  {
    label: 'Trees & woodland',
    skills: ['Tree planting and protection'],
  },
  {
    label: 'Planning & records',
    skills: [
      'Design & survey',
      'Rotational planning',
      'Record keeping',
      'General manual labor',
    ],
  },
];

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
  // -- Shared semantic core ---------------------------------------------------
  // Reusable, type-agnostic vocabularies so the ~215 objective-capture forms
  // compose from a small shared core instead of inventing hundreds of bespoke
  // sets. AUTHORING RULE: prefer a shared set; add a bespoke set only for a
  // genuinely type-specific vocabulary; and when a prompt is sale-, capital-, or
  // revenue-adjacent, prefer a single free-text leaf (or a deliberately
  // conservative enumerated set with no advance-sale framing) over an open
  // dropdown -- never encode a priced/advance-purchase instrument here (Amanah:
  // no riba, no gharar, no bay` ma laysa `indak / CSRA / season-pass framing).
  // All shared-core sets are `_base`-only (no per-type lists) by design.

  // Agreement / sign-off confirmation (e.g. "Confirm ... is agreed by all").
  confirmAgreement: {
    _base: [
      'Yes - agreed by all occupants',
      'Mostly - minor points to resolve',
      'Not yet - further discussion needed',
    ],
  },
  // Feasibility / alignment confirmation (e.g. "Confirm ... is achievable" or
  // "... aligns with our vision"). Role-neutral sibling of confirmAgreement:
  // confirms a STATE of a plan, not that PEOPLE have agreed.
  confirmStatus: {
    _base: [
      'Yes - confirmed',
      'Partially - caveats noted',
      'Not yet - needs further work',
    ],
  },
  // Plain binary answer.
  yesNo: { _base: ['Yes', 'No'] },
  // Household food-production ambition. Amanah-conservative wording: the
  // "Commercial" band names an intent to sell but creates/prices no instrument;
  // any actual sales channel routes to its own guardrailed capture. EXACT-LIST
  // locked by fieldOptions.test.ts.
  foodProductionTarget: {
    _base: [
      'Subsistence (household only)',
      'Supplementary (household + some surplus)',
      'Commercial (primarily for sale)',
    ],
  },
  // Domestic enterprise scope. Amanah-conservative: ascends from own-use to a
  // bare "intended for sale" with NO advance-purchase / CSRA / season-pass
  // surface. EXACT-LIST locked by fieldOptions.test.ts.
  enterpriseScope: {
    _base: [
      'Own use only',
      'Own use with occasional surplus shared',
      'Some produce intended for sale',
    ],
  },
  // Age band for a household member.
  householdAgeBand: {
    _base: [
      'Infant (under 5)',
      'Child (5-12)',
      'Teenager (13-17)',
      'Adult (18-64)',
      'Senior (65+)',
    ],
  },
  // Role of a household member.
  householdRole: {
    _base: [
      'Primary steward',
      'Partner or spouse',
      'Child or dependent',
      'Extended family member',
      'Regular helper or guest',
    ],
  },
  // Accessibility / support requirement (mobility, health, age).
  accessibilityNeed: {
    _base: [
      'Step-free access required',
      'Mobility aid or wheelchair use',
      'Limited lifting or carrying capacity',
      'Visual impairment',
      'Hearing impairment',
      'Chronic health condition',
      'Age-related limitation',
    ],
  },
  // Generic proficiency band for a skill or capability.
  skillLevel: {
    _base: ['No experience', 'Some experience', 'Confident', 'Highly experienced'],
  },
  // Generic small/medium/large sizing band.
  scaleBand: { _base: ['Small', 'Medium', 'Large'] },
  // Generic condition assessment.
  conditionStatus: {
    _base: ['Good', 'Fair', 'Poor', 'Needs attention', 'Not yet assessed'],
  },
  // Generic priority band.
  priorityBand: { _base: ['High', 'Medium', 'Low'] },

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
      'Grazing management',
      'Herd health monitoring',
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
      'Small-livestock care',
      'Grazing management',
      'Herd health monitoring',
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

  // REVIEW: Boundary surface option sets -- content transcribed verbatim from the
  // operator's olos_boundaries_legal_mixed_surface.html mockup; operator to
  // confirm/extend before treating as authoritative.
  boundaryDocStatus: {
    _base: ['Current & verified', 'Pending review', 'Not yet obtained'],
  },
  boundaryZoning: {
    _base: [
      'Rural - General agriculture',
      'Rural - Small lots',
      'Rural - Conservation',
      'Rural - Landscape',
      'Mixed rural / residential',
      'Peri-urban / green belt',
      'Other / unknown - needs investigation',
    ],
  },
  boundaryPermittedUses: {
    _base: [
      'Agriculture & horticulture',
      'Livestock & grazing',
      'Farm stay / agritourism',
      'Educational programs',
    ],
  },
  boundaryZoningReview: {
    _base: ['All clear', 'Permit needed', 'Conditional use', 'Needs legal review'],
  },
  boundaryWaterSources: {
    _base: [
      'Rainwater harvesting (no licence required)',
      'Groundwater bore (licenced)',
      'Surface water - creek or dam',
      'Irrigation scheme / water grid',
    ],
  },
  boundaryWaterUnit: {
    _base: ['ML', 'kL', 'm3'],
  },
  boundaryWaterStatus: {
    _base: ['Confirmed', 'Needs verification', 'Restricted - review needed'],
  },
  boundaryEasementImplications: {
    _base: [
      'Limits building zones',
      'Affects access routes',
      'Requires legal review',
      'No implications',
    ],
  },
  boundaryCovenantTypes: {
    _base: [
      'Conservation covenant',
      'Heritage overlay',
      'None identified',
      'Under investigation',
    ],
  },
  boundaryPermitActivities: {
    _base: [
      'Earthworks (dam, swale, cut >1m)',
      'New building or structure',
      'Water harvesting / dam construction',
      'Vegetation clearing',
      'Agritourism or on-farm events',
    ],
  },

  // REVIEW: Boundary RE-DECOMPOSE option sets (SP1) -- content transcribed
  // verbatim from olos_boundary_legal_survey.html, ASCII-normalised. Operator
  // to confirm/extend before treating as authoritative. The shipped boundary*
  // sets above are retained (used by BoundaryCaptureLegacy).
  boundaryDirection: {
    _base: ['N', 'E', 'S', 'W'],
  },
  boundarySectionType: {
    _base: [
      'Shared / dividing fence',
      'Creek / natural boundary',
      'Council road frontage',
      'Unfenced / in dispute',
    ],
  },
  boundaryRowType: {
    _base: [
      'Utility easement',
      'Access easement',
      'Public right of way',
      'Drainage easement',
    ],
  },
  boundaryRowImpact: {
    _base: ['Restricts', 'Enables', 'Minor impact'],
  },
  boundaryTenancyType: {
    _base: ['Agistment', 'Lease', 'Water license'],
  },
  boundaryTenancyExpiry: {
    _base: ['Near', 'Far', 'Expired'],
  },
  boundaryTenancyFlag: {
    _base: [
      'Must terminate before community occupation',
      'Monitor',
      'No termination required',
    ],
  },
  boundaryTitleState: {
    _base: ['Present', 'Absent', 'Unknown'],
  },
  boundaryHistoryType: {
    _base: ['Agricultural', 'Community', 'Development', 'Industrial'],
  },
  boundaryContamination: {
    _base: [
      'Chemical storage / AST',
      'Asbestos structures',
      'Rubbish dump / landfill',
      'Mining or extraction',
      'None known',
    ],
  },
  boundaryPriorCommunity: {
    _base: ['Yes - detail below', 'No prior community'],
  },

  // REVIEW: Legal-governance option sets (SP1 Group 2) -- content transcribed
  // verbatim from olos_legal_entity_tenure_financial.html, ASCII-normalised
  // (em-dashes -> " - "). Consumed by EvLegalGovernanceCapture (ev-s1-legal-
  // governance, 8 modes). Amanah: the financial sets below describe fund custody
  // and signing authority only -- no interest-bearing instrument (riba) and no
  // speculative sale (gharar).
  legalEntityOptions: {
    _base: [
      'Community land trust (CLT)',
      'Co-operative (housing or multi-stakeholder)',
      'Charitable trust or non-profit corporation',
      'Company (share or guarantee)',
      'Incorporated society',
    ],
  },
  legalJurisdictionCountry: {
    _base: ['Canada', 'Australia', 'New Zealand', 'United Kingdom', 'United States', 'Other'],
  },
  legalJurisdictionProvince: {
    _base: ['Ontario', 'British Columbia', 'Alberta', 'Quebec', 'Nova Scotia', 'Other'],
  },
  legalRegisteredOffice: {
    _base: ['Registered office is on the land', 'Registered office is separate'],
  },
  legalTenureModel: {
    _base: [
      'Collective ownership - no private title',
      'Leasehold - community land, household lease',
      'Equity shares - proportional ownership interest',
      'Hybrid - differentiated tenure by zone or household type',
    ],
  },
  legalDecisionFramework: {
    _base: [
      'Consent (sociocracy)',
      'Full consensus',
      'Modified consensus with fallback vote',
      'Democratic majority vote',
    ],
  },
  legalQuorum: {
    _base: [
      '50% of active members',
      '67% of active members',
      '75% of active members',
      '100% - unanimous attendance',
    ],
  },
  legalBankingStructure: {
    _base: [
      'Community bank account - joint signatories',
      'Separate accounts by function',
      'Trustee-held funds',
    ],
  },
  legalAuthSingle: { _base: ['$250', '$500', '$1,000', '$2,500'] },
  legalAuthDouble: { _base: ['$2,500', '$5,000', '$10,000', '$25,000'] },
  legalAuthVote: { _base: ['$5,000', '$10,000', '$25,000'] },
  legalFinancialYearEnd: { _base: ['31 March', '31 December', '30 June'] },
  legalWrittenAdvice: { _base: ['Yes', 'Pending'] },
  legalMembershipRights: {
    _base: [
      'Right to occupy an allocated dwelling or site',
      'Access to all shared land, infrastructure, and commons areas',
      'Vote in community decisions (subject to the decision-making framework)',
      'Priority consideration for expanded occupancy or additional plots',
      'Share of any surplus income produced by community enterprises',
    ],
  },
  legalMembershipObligations: {
    _base: [
      'Contribute a defined number of hours per month to shared land and infrastructure work',
      'Pay monthly community levy on time as agreed',
      'Participate in scheduled community decision-making meetings',
      'Give the required notice period before initiating exit from the community',
      'Maintain the private dwelling and site in a condition consistent with community standards',
    ],
  },
  legalAdviceScope: {
    _base: [
      'Legal entity type and registration process in the confirmed jurisdiction',
      'Land tenure model - title structure, lease enforceability, resale formula',
      'Financial governance - signing authority, trustee obligations, annual compliance',
      'Membership agreement - rights, obligations, and exit provisions',
      'Any design tensions flagged for this project type combination reviewed',
    ],
  },

  // Stakeholder surface option sets -- reconciled with the operator's
  // olos_stakeholders_mixed_surface.html mockup (Phase C Part 3, sub-project 2).
  // Flat sets resolved via the already-threaded resolveOptions prop. The grouped
  // authority categories and the 5 Indigenous/cultural status cards are richer
  // (label/full-name/category, title/desc/consequence) than a flat string list
  // can express, so they live as co-located constants in StakeholderCapture.tsx.
  // c1 neighbour relationship types (chip-to-row builder).
  stakeholderNeighbourType: {
    _base: [
      'Shares boundary',
      'Shares water access',
      'Shares road access',
      'Downstream',
      'Adjacent dwelling',
    ],
  },
  // c4 community stakeholder types (chip-to-row builder).
  stakeholderCommunityType: {
    _base: [
      'Local farming network',
      'Landcare group',
      'Downstream water user',
      'School / education',
      'Farmers market',
      'Recreation user',
    ],
  },
  // c5 relationship quality (single-select pill per stakeholder), mockup order.
  stakeholderRelationship: {
    _base: ['Conflict', 'Tension', 'Neutral', 'Goodwill', 'Partnership'],
  },
  // c6 preferred communication channels (multi-select pills per stakeholder).
  stakeholderCommsChannel: {
    _base: ['Email', 'Phone', 'SMS', 'Post', 'In-person', 'Community mtg'],
  },
};

// REVIEW: starter vision-element suggestions, operator to confirm/extend.
// Plain strings (not domain-tagged) -- a vision element is classified
// committed-vs-aspirational by the steward, not pre-bucketed here.
export const VISION_CLASSIFY_OPTIONS: FieldOptionSet = {
  _base: [
    'Grow food for our household',
    'Restore degraded soil',
    'Create habitat for wildlife',
    'Build long-term financial resilience',
    'Leave the land in better condition than we found it',
    'Share surplus with the wider community',
  ],
  homestead: [
    'Become largely self-sufficient in food',
    'Keep small livestock',
    'Establish a home orchard',
  ],
  regenerative_farm: [
    'Reach commercial production volumes',
    'Build diverse income streams',
    'Sequester carbon in pasture and trees',
  ],
};

/**
 * Resolve the vision-element suggestions for a project's type(s): union of
 * `_base` + primary + each secondary, dedup by string (first-seen),
 * order-stable. Unknown / missing type ids contribute nothing.
 *
 * Order: `_base`, then `primary` (if present), then each `secondary` in array
 * order. `secondaries` defaults to `[]`.
 */
export function resolveVisionClassifyOptions(
  primary: ProjectTypeId | undefined,
  secondaries: readonly ProjectTypeId[] = [],
): string[] {
  const ordered: readonly (readonly string[])[] = [
    VISION_CLASSIFY_OPTIONS._base ?? [],
    primary ? (VISION_CLASSIFY_OPTIONS[primary] ?? []) : [],
    ...secondaries.map((id) => VISION_CLASSIFY_OPTIONS[id] ?? []),
  ];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of ordered) {
    for (const entry of list) {
      if (!seen.has(entry)) {
        seen.add(entry);
        result.push(entry);
      }
    }
  }
  return result;
}
