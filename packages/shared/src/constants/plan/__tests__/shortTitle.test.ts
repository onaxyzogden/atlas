import { describe, it, expect } from 'vitest';
import type { PlanStratumObjective } from '../../../schemas/plan/planStratumObjective.schema.js';
import { PLAN_STRATUM_OBJECTIVES } from '../stratumObjectives.js';
import {
  UNIVERSAL_PLAN_OBJECTIVES,
  REGEN_FARM_PRIMARY_OBJECTIVES,
  ECOVILLAGE_PRIMARY_OBJECTIVES,
  AGRITOURISM_PRIMARY_OBJECTIVES,
  RESIDENTIAL_ADDITIVE_OBJECTIVES,
  WELLNESS_PRIMARY_OBJECTIVES,
  WELLNESS_SECONDARY_OBJECTIVES,
  SILVOPASTURE_PRIMARY_OBJECTIVES,
  SILVOPASTURE_SECONDARY_OBJECTIVES,
  ORCHARD_PRIMARY_OBJECTIVES,
  ORCHARD_SECONDARY_OBJECTIVES,
  NURSERY_SECONDARY_OBJECTIVES,
  HOMESTEAD_PRIMARY_OBJECTIVES,
  EDUCATION_PRIMARY_OBJECTIVES,
  CONSERVATION_PRIMARY_OBJECTIVES,
  MARKET_GARDEN_PRIMARY_OBJECTIVES,
  OFF_GRID_PRIMARY_OBJECTIVES,
} from '../catalogues/index.js';

// Every authored objective across the universal skeleton + all secondary
// catalogues. `shortTitle` is an OPTIONAL card-tile label derived by stripping
// the leading framing phrase / imperative verb from `title`. These guards catch
// accidental no-op or mangled derivations: a defined shortTitle must be a real
// simplification (non-empty, differs from the title) and must not still carry a
// stripped article / imperative-verb lead-in.
const ALL_AUTHORED: readonly PlanStratumObjective[] = [
  ...PLAN_STRATUM_OBJECTIVES,
  ...UNIVERSAL_PLAN_OBJECTIVES,
  ...REGEN_FARM_PRIMARY_OBJECTIVES,
  ...ECOVILLAGE_PRIMARY_OBJECTIVES,
  ...AGRITOURISM_PRIMARY_OBJECTIVES,
  ...RESIDENTIAL_ADDITIVE_OBJECTIVES,
  ...WELLNESS_PRIMARY_OBJECTIVES,
  ...WELLNESS_SECONDARY_OBJECTIVES,
  ...NURSERY_SECONDARY_OBJECTIVES,
  ...SILVOPASTURE_PRIMARY_OBJECTIVES,
  ...SILVOPASTURE_SECONDARY_OBJECTIVES,
  ...ORCHARD_PRIMARY_OBJECTIVES,
  ...ORCHARD_SECONDARY_OBJECTIVES,
  ...HOMESTEAD_PRIMARY_OBJECTIVES,
  ...EDUCATION_PRIMARY_OBJECTIVES,
  ...CONSERVATION_PRIMARY_OBJECTIVES,
  ...MARKET_GARDEN_PRIMARY_OBJECTIVES,
  ...OFF_GRID_PRIMARY_OBJECTIVES,
];

// Lightweight guard: a derived shortTitle should no longer open with a leading
// article or one of the imperative framing verbs the strip rule removes.
const LEADING_ARTICLE = /^(a|an|the)\s/i;
const LEADING_VERB =
  /^(Define|Identify|Read|Set|Integrate|Build|Establish|Map|Settle|Design|Develop|Assess|Select|Choose|Determine|Confirm|Document|Create|Plan)\s/;

describe('objective shortTitle derivation', () => {
  it('every defined shortTitle is non-empty and differs from its title', () => {
    for (const o of ALL_AUTHORED) {
      if (o.shortTitle === undefined) continue;
      expect(o.shortTitle.length, o.id).toBeGreaterThan(0);
      expect(o.shortTitle, o.id).not.toBe(o.title);
    }
  });

  it('no defined shortTitle still leads with a stripped article or verb', () => {
    for (const o of ALL_AUTHORED) {
      if (o.shortTitle === undefined) continue;
      expect(LEADING_ARTICLE.test(o.shortTitle), `${o.id}: "${o.shortTitle}"`).toBe(
        false,
      );
      expect(LEADING_VERB.test(o.shortTitle), `${o.id}: "${o.shortTitle}"`).toBe(
        false,
      );
    }
  });

  it('the derivation populated shortTitle across the catalogues', () => {
    const withShort = ALL_AUTHORED.filter((o) => o.shortTitle !== undefined);
    // Sanity floor: the strip rule applies to the vast majority of authored
    // titles. If this collapses, the catalogue derivation has regressed.
    expect(withShort.length).toBeGreaterThan(150);
  });
});
