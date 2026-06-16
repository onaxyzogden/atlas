/**
 * Steward domains -- the responsibility areas a steward team divides work and
 * authority across. Introduced with the Tier-0 / Stratum-1 Steward/Team Object
 * (2026-06-16). These enumerate the columns of the by-domain captures:
 *   - s1-steward-c3 "Assign decision rights by domain"
 *   - s1-steward-c4 "Inventory capabilities by domain"
 *
 * Lightweight tuple + union (zoneCategories.ts convention) -- a UI option list
 * for an all-optional structured field, so no zod schema is needed.
 */
export const STEWARD_DOMAINS = [
  'water',
  'food',
  'infrastructure',
  'energy',
  'governance',
  'ecology',
  'finance',
] as const;

export type StewardDomain = (typeof STEWARD_DOMAINS)[number];

/** Human-readable labels per steward domain (compiler-enforced completeness). */
export const STEWARD_DOMAIN_LABELS: Record<StewardDomain, string> = {
  water: 'Water',
  food: 'Food & growing',
  infrastructure: 'Infrastructure',
  energy: 'Energy',
  governance: 'Governance',
  ecology: 'Ecology & land',
  finance: 'Finance',
};
