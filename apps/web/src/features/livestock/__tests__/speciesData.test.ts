/**
 * speciesData — `paddockMeanAuFactor` helper (S1 multi-species AU rollup).
 *
 * The mean AU factor across a paddock's assigned species is the even-split AU
 * convention `MultiSpeciesPlannerCard` already uses, shared so the rotation AU
 * math cannot diverge from it.
 */

import { describe, it, expect } from 'vitest';
import { AU_FACTORS, paddockMeanAuFactor } from '../speciesData.js';

describe('paddockMeanAuFactor', () => {
  it('returns 0 for an empty species list', () => {
    expect(paddockMeanAuFactor([])).toBe(0);
  });

  it('returns the species own factor for a single species', () => {
    expect(paddockMeanAuFactor(['cattle'])).toBeCloseTo(AU_FACTORS.cattle, 6);
    expect(paddockMeanAuFactor(['sheep'])).toBeCloseTo(AU_FACTORS.sheep, 6);
  });

  it('returns the arithmetic mean across multiple species', () => {
    // (1.250 + 0.200) / 2 = 0.725
    expect(paddockMeanAuFactor(['cattle', 'sheep'])).toBeCloseTo(0.725, 6);
    // (1.250 + 0.200 + 0.0050) / 3
    expect(paddockMeanAuFactor(['cattle', 'sheep', 'poultry'])).toBeCloseTo(
      (1.25 + 0.2 + 0.005) / 3,
      6,
    );
  });

  it('counts a zero-factor species (bees) into the mean', () => {
    // (1.250 + 0) / 2 = 0.625
    expect(paddockMeanAuFactor(['cattle', 'bees'])).toBeCloseTo(0.625, 6);
  });
});
