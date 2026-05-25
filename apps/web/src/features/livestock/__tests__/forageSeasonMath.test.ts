/**
 * forageSeasonMath — seasonal rest multiplier + hemisphere helpers.
 *
 * Covers the flush→1.0 / slump→>1.0 shape, the clamp bounds, the
 * southern-hemisphere 6-month flip, and the centroid-latitude hemisphere
 * derivation (missing/garbage boundary ⇒ northern default).
 */

import { describe, it, expect } from 'vitest';
import {
  NH_PROTEIN,
  MAX_SEASONAL_REST_MULTIPLIER,
  shiftSouthern,
  seasonalRestMultiplier,
  isSouthernHemisphere,
} from '../forageSeasonMath.js';

describe('seasonalRestMultiplier (northern hemisphere)', () => {
  it('is 1.0 at the protein peak (May = index 4)', () => {
    // May is the curve max (20) ⇒ peak/month = 1.
    expect(seasonalRestMultiplier(4)).toBe(1);
  });

  it('exceeds 1.0 in the summer slump (Jul/Aug) and stays within the clamp', () => {
    const jul = seasonalRestMultiplier(6); // protein 11 → 20/11=1.82 → clamp 1.6
    const aug = seasonalRestMultiplier(7); // protein 9 → 20/9=2.22 → clamp 1.6
    expect(jul).toBeGreaterThan(1);
    expect(aug).toBeGreaterThan(1);
    expect(jul).toBeLessThanOrEqual(MAX_SEASONAL_REST_MULTIPLIER);
    expect(aug).toBeLessThanOrEqual(MAX_SEASONAL_REST_MULTIPLIER);
  });

  it('a milder shoulder month rests less than the deepest slump', () => {
    // Oct protein 13 → 20/13=1.54 (<1.6) sits below the clamped Aug 1.6.
    const oct = seasonalRestMultiplier(9);
    const aug = seasonalRestMultiplier(7);
    expect(oct).toBeLessThan(aug);
    expect(oct).toBeGreaterThan(1);
  });

  it('clamps the deepest slump to MAX (20/9 ≈ 2.22 → 1.6)', () => {
    // Aug protein 9, peak 20 ⇒ raw 2.22, clamped to 1.6.
    expect(seasonalRestMultiplier(7)).toBe(MAX_SEASONAL_REST_MULTIPLIER);
  });

  it('rounds to 2 decimal places', () => {
    // Mar protein 11, peak 20 ⇒ 20/11 = 1.818..., clamped 1.6.
    // Use Sep (protein 14): 20/14 = 1.4285... → 1.43.
    expect(seasonalRestMultiplier(8)).toBe(1.43);
  });

  it('normalises out-of-range and negative month indices', () => {
    expect(seasonalRestMultiplier(16)).toBe(seasonalRestMultiplier(4));
    expect(seasonalRestMultiplier(-8)).toBe(seasonalRestMultiplier(4));
  });
});

describe('shiftSouthern + southern hemisphere multiplier', () => {
  it('flips the curve by 6 months', () => {
    const sh = shiftSouthern(NH_PROTEIN);
    expect(sh[0]).toBe(NH_PROTEIN[6]);
    expect(sh[4]).toBe(NH_PROTEIN[10]);
  });

  it('shifts the slump by 6 months — January (SH summer) now stretches rest', () => {
    // NH Jan (index 0) is a dormant trough but SH Jan = NH Jul slump.
    const jan = seasonalRestMultiplier(0, { isSouthern: true });
    expect(jan).toBeGreaterThan(1);
    // The SH peak lands ~November (NH May), so SH May is mild.
    expect(seasonalRestMultiplier(10, { isSouthern: true })).toBe(1);
  });
});

describe('isSouthernHemisphere', () => {
  const fc = (lat: number): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, lat],
              [1, lat],
              [1, lat + 1],
              [0, lat + 1],
              [0, lat],
            ],
          ],
        },
      },
    ],
  });

  it('returns false for a missing boundary', () => {
    expect(isSouthernHemisphere(null)).toBe(false);
    expect(isSouthernHemisphere(undefined)).toBe(false);
  });

  it('returns false for a northern-latitude centroid', () => {
    expect(isSouthernHemisphere(fc(40))).toBe(false);
  });

  it('returns true for a southern-latitude centroid', () => {
    expect(isSouthernHemisphere(fc(-34))).toBe(true);
  });
});
