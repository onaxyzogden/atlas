// universalDomain.ts
//
// Ordered list, UI labels, and one-line core-purpose strings for the 16
// universal domains defined in ../schemas/universalDomain.schema.ts.
//
// Pattern mirrors STRUCTURE_WATER_GAL_PER_DAY (demand/) and OUTPUTS_BY_TYPE
// (relationships/catalog.ts): a typed lookup table keyed by the canonical
// enum so the compiler enforces completeness.
//
// Source of truth for label + purpose text:
// wiki/concepts/olos-universal-domains.md (parent MILOS wiki).

import type { UniversalDomain } from '../schemas/universalDomain.schema.js';

/**
 * Canonical ordering of the 16 universal domains, matching the ADR table
 * (2026-05-25-atlas-universal-domains). Iterate this when rendering domain
 * lists; do not reorder ad-hoc.
 */
export const UNIVERSAL_DOMAINS: readonly UniversalDomain[] = [
  'vision-intent',
  'land-base',
  'climate',
  'topography',
  'hydrology',
  'soil',
  'ecology',
  'plants-food',
  'animals-livestock',
  'built-infrastructure',
  'access-circulation',
  'energy-resources',
  'people-governance',
  'economics-capacity',
  'risk-compliance',
  'monitoring-records',
] as const;

/**
 * Human-readable UI labels for each universal domain. Use these in tab bars,
 * compass headers, and any user-facing surface — do not display the kebab-case
 * id directly.
 */
export const UNIVERSAL_DOMAIN_LABELS: Record<UniversalDomain, string> = {
  'vision-intent': 'Vision & Project Intent',
  'land-base': 'Land Base & Boundaries',
  'climate': 'Climate & Microclimate',
  'topography': 'Topography & Landform',
  'hydrology': 'Hydrology & Water',
  'soil': 'Soil & Subsurface',
  'ecology': 'Ecology & Biodiversity',
  'plants-food': 'Plants, Crops & Food Systems',
  'animals-livestock': 'Animals, Livestock & Wildlife',
  'built-infrastructure': 'Built Infrastructure',
  'access-circulation': 'Access, Circulation & Logistics',
  'energy-resources': 'Energy, Materials & Resource Flows',
  'people-governance': 'People, Roles & Governance',
  'economics-capacity': 'Economics & Capacity',
  'risk-compliance': 'Risk, Compliance & Suitability',
  'monitoring-records': 'Monitoring, Records & Feedback',
};

/**
 * One-line core-purpose strings for each universal domain. Useful for
 * tooltip / subtitle surfaces and onboarding copy.
 */
export const UNIVERSAL_DOMAIN_PURPOSE: Record<UniversalDomain, string> = {
  'vision-intent': 'Define what the land is meant to become',
  'land-base': 'Understand the physical and legal container',
  'climate': 'Understand atmospheric conditions',
  'topography': 'Understand the shape of the land',
  'hydrology': 'Understand and manage water',
  'soil': 'Understand the living foundation',
  'ecology': 'Understand existing life systems',
  'plants-food': 'Design and manage plant production',
  'animals-livestock': 'Design and manage animal relationships',
  'built-infrastructure': 'Manage structures and physical assets',
  'access-circulation': 'Manage movement across the site',
  'energy-resources': 'Manage inputs, outputs, and cycles',
  'people-governance': 'Manage human coordination',
  'economics-capacity': 'Manage financial and operational feasibility',
  'risk-compliance': 'Identify constraints and red flags',
  'monitoring-records': 'Track change, learning, and proof',
};
