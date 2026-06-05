// projectEnterprises.test.ts
//
// Verifies the project-type -> active enterprise mapping (Protocol Layer Spec
// 4.3 input) that drives which standard protocol templates surface on the Plan
// strata page. Headline rule: livestock-implying types yield ['sheep_beef'];
// everything else yields []; poultry is never inferred from type alone (v1).

import { describe, it, expect } from 'vitest';
import { enterprisesForProjectTypes } from '../projectEnterprises.js';
import { templatesForEnterprises } from '../standardTemplates.js';

describe('enterprisesForProjectTypes', () => {
  it('maps silvopasture to sheep_beef', () => {
    expect(enterprisesForProjectTypes('silvopasture')).toEqual(['sheep_beef']);
  });

  it('maps regenerative_farm and homestead to sheep_beef', () => {
    expect(enterprisesForProjectTypes('regenerative_farm')).toEqual(['sheep_beef']);
    expect(enterprisesForProjectTypes('homestead')).toEqual(['sheep_beef']);
  });

  it('returns [] for non-livestock primary types', () => {
    expect(enterprisesForProjectTypes('market_garden')).toEqual([]);
    expect(enterprisesForProjectTypes('orchard_food_forest')).toEqual([]);
    expect(enterprisesForProjectTypes('conservation')).toEqual([]);
  });

  it('infers sheep_beef from a livestock SECONDARY layer', () => {
    expect(enterprisesForProjectTypes('market_garden', ['silvopasture'])).toEqual([
      'sheep_beef',
    ]);
  });

  it('returns [] when neither primary nor any secondary implies livestock', () => {
    expect(
      enterprisesForProjectTypes('market_garden', ['orchard_food_forest', 'nursery']),
    ).toEqual([]);
  });

  it('never infers poultry from project type alone (v1)', () => {
    // No project type implies poultry; the result must never contain it.
    for (const result of [
      enterprisesForProjectTypes('silvopasture'),
      enterprisesForProjectTypes('homestead', ['silvopasture']),
      enterprisesForProjectTypes('regenerative_farm'),
    ]) {
      expect(result).not.toContain('poultry');
    }
  });

  it('defaults secondaryTypeIds to an empty list', () => {
    expect(enterprisesForProjectTypes('silvopasture')).toEqual(['sheep_beef']);
  });

  it('feeds templatesForEnterprises: a livestock project sees the 9 sheep_beef templates, poultry-only hidden', () => {
    const enterprises = enterprisesForProjectTypes('silvopasture');
    const templates = templatesForEnterprises(enterprises);
    expect(templates).toHaveLength(9);
    expect(templates.map((t) => t.id)).not.toContain('silvopasture-pest-diversion');
  });

  it('feeds templatesForEnterprises: a non-livestock project sees no templates', () => {
    const enterprises = enterprisesForProjectTypes('market_garden');
    expect(templatesForEnterprises(enterprises)).toHaveLength(0);
  });
});
