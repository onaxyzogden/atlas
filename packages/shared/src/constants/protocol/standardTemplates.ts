// standardTemplates.ts
//
// The standard protocol catalogue — Animals, Livestock & Wildlife (Protocol
// Layer Spec 4.2), with the enterprise-filtering rule (4.3) as a pure
// function. Mirrors the static-catalogue style of
// constants/plan/catalogues/* (a typed `as const`-style frozen array plus a
// pure resolver fanned out here and nowhere else).
//
// Provenance per template: name/type/condition/response transcribed VERBATIM
// from spec table 4.2; enterpriseScope encodes table 4.3 (Pest Diversion is
// the only poultry-scoped template); rationale + feeds authored for this slice
// (the spec table provides neither column).

import {
  StandardProtocolTemplateSchema,
  type EnterpriseId,
  type StandardProtocolTemplate,
} from '../../schemas/protocol/protocol.schema.js';

/**
 * The 10 standard animal/livestock protocol templates (spec 4.2). Nine are
 * scoped to general livestock (`sheep_beef`); only Silvopasture Pest Diversion
 * is scoped to `poultry`, implementing the 4.3 gate that hides it on a
 * property without poultry.
 */
export const STANDARD_PROTOCOL_TEMPLATES: readonly StandardProtocolTemplate[] = [
  {
    id: 'paddock-rotation-cover-trigger',
    name: 'Paddock Rotation — Cover Trigger',
    type: 'threshold',
    tierAuthored: 'Stratum 6 — Integration',
    enterpriseScope: ['sheep_beef'],
    condition: 'IF pasture cover < [approved threshold] kg DM/ha',
    response: 'Move livestock to next paddock in rotation sequence',
    rationale:
      'Moves stock before pasture is grazed below its recovery floor, protecting regrowth and root reserves.',
    feeds: ['Pasture & Forage'],
  },
  {
    id: 'paddock-rotation-grazing-day-limit',
    name: 'Paddock Rotation — Grazing Day Limit',
    type: 'threshold',
    tierAuthored: 'Stratum 6 — Integration',
    enterpriseScope: ['sheep_beef'],
    condition: 'IF grazing days elapsed ≥ [approved day limit]',
    response: 'Move livestock regardless of visible cover',
    rationale:
      'Caps time-in-paddock so animals do not re-graze fresh regrowth even when standing cover still looks adequate.',
    feeds: ['Pasture & Forage'],
  },
  {
    id: 'rest-period-re-entry-gate',
    name: 'Rest Period — Re-entry Gate',
    type: 'threshold',
    tierAuthored: 'Stratum 6 — Integration',
    enterpriseScope: ['sheep_beef'],
    condition: 'IF pasture cover ≥ [approved recovery target] kg DM/ha',
    response: 'Paddock available for re-entry, confirm visually',
    rationale:
      'Holds a paddock out of rotation until it has recovered to the target cover, guarding the rest period.',
    feeds: ['Pasture & Forage'],
  },
  {
    id: 'livestock-health-check-prompt',
    name: 'Livestock Health Check Prompt',
    type: 'judgment',
    tierAuthored: 'Stratum 6 — Integration',
    enterpriseScope: ['sheep_beef'],
    condition: 'IF no body condition score observation in [configured window]',
    response: 'Conduct BCS assessment and welfare check',
    rationale:
      'Ensures animal welfare is assessed on a cadence rather than only when a problem is already visible.',
    feeds: ['Livestock & Animal Health'],
  },
  {
    id: 'silvopasture-pest-diversion',
    name: 'Silvopasture Pest Diversion',
    type: 'judgment',
    tierAuthored: 'Stratum 6 — Integration',
    enterpriseScope: ['poultry'],
    condition: 'IF pest pressure signal in orchard/silvopasture zone',
    response: 'Assess and route poultry to Zone 3 if warranted',
    rationale:
      'Uses poultry as a biological pest control, routing them to affected zones when pest pressure is detected.',
    feeds: ['Pasture & Forage', 'Livestock & Animal Health'],
  },
  {
    id: 'pre-rotation-paddock-assessment',
    name: 'Pre-Rotation Paddock Assessment',
    type: 'cyclical',
    tierAuthored: 'Stratum 6 — Integration',
    enterpriseScope: ['sheep_beef'],
    condition: 'IF rotation entry event',
    response: 'Assess fence, water, cover, and hazards before opening gate',
    rationale:
      'Catches infrastructure and safety issues before stock enter, preventing escapes and welfare incidents.',
    feeds: ['Pasture & Forage', 'Water & Hydrology'],
  },
  {
    id: 'post-rotation-impact-assessment',
    name: 'Post-Rotation Impact Assessment',
    type: 'cyclical',
    tierAuthored: 'Stratum 6 — Integration',
    enterpriseScope: ['sheep_beef'],
    condition: 'IF rotation exit event',
    response: 'Record cover, bare soil, compaction, species composition',
    rationale:
      'Builds a record of grazing impact per paddock so rotation length and stocking can be tuned over time.',
    feeds: ['Soil', 'Pasture & Forage'],
  },
  {
    id: 'seasonal-stocking-rate-review',
    name: 'Seasonal Stocking Rate Review',
    type: 'cyclical',
    tierAuthored: 'Stratum 6 — Integration',
    enterpriseScope: ['sheep_beef'],
    condition: 'IF season change (Autumn/Winter)',
    response: 'Review stocking rate against seasonal targets',
    rationale:
      'Re-balances stock numbers against falling seasonal growth so the land is not over-grazed into the cold months.',
    feeds: ['Pasture & Forage', 'Livestock & Animal Health'],
  },
  {
    id: 'emergency-destocking',
    name: 'Emergency Destocking',
    type: 'threshold',
    tierAuthored: 'Stratum 6 — Integration',
    enterpriseScope: ['sheep_beef'],
    condition:
      'IF pasture cover < [emergency threshold] kg DM/ha across all paddocks',
    response: 'Initiate destocking protocol',
    rationale:
      'Last-resort trigger that protects the land and the herd when feed has failed system-wide (e.g. drought).',
    feeds: ['Pasture & Forage'],
  },
  {
    id: 'water-trough-inspection',
    name: 'Water Trough Inspection',
    type: 'cyclical',
    tierAuthored: 'Stratum 6 — Integration',
    enterpriseScope: ['sheep_beef'],
    condition: 'IF rotation entry event',
    response: 'Check trough level, float valve, contamination before livestock entry',
    rationale:
      'Guarantees clean, sufficient stock water is confirmed before animals depend on a paddock supply.',
    feeds: ['Water & Hydrology'],
  },
];

// Dev-time conformance: validate the catalogue against the schema once at
// module load (mirrors how the plan catalogues are exercised by their tests).
if (process.env.NODE_ENV !== 'production') {
  for (const t of STANDARD_PROTOCOL_TEMPLATES) {
    StandardProtocolTemplateSchema.parse(t);
  }
}

/**
 * Filter the standard catalogue to the templates surfaced for a project's
 * active enterprise set (spec 4.3). A template surfaces when any id in its
 * `enterpriseScope` is present in `activeEnterprises`. Pure and order-stable
 * (preserves catalogue order).
 *
 * - `['sheep_beef']`            → 9 templates (Pest Diversion hidden)
 * - `['sheep_beef','poultry']` → all 10 (Pest Diversion shown)
 * - `[]`                        → none (no livestock)
 */
export function templatesForEnterprises(
  activeEnterprises: readonly EnterpriseId[],
): readonly StandardProtocolTemplate[] {
  const active = new Set(activeEnterprises);
  if (active.size === 0) return [];
  return STANDARD_PROTOCOL_TEMPLATES.filter((t) =>
    (t.enterpriseScope ?? []).some((e) => active.has(e)),
  );
}
