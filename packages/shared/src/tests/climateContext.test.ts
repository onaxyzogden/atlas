/**
 * Climate-context derivation — hemisphere, latitude band, and hemisphere-aware
 * astronomical season from latitude + date.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveClimateContext,
  type Hemisphere,
  type LatitudeBand,
} from '../climate/climateContext.js';
import { type Season } from '../astronomy/sunPath.js';

/** Build a timezone-stable UTC date for (month 1-12, day). */
function utc(month: number, day: number): Date {
  return new Date(Date.UTC(2026, month - 1, day));
}

describe('deriveClimateContext — hemisphere', () => {
  it.each<[number, Hemisphere]>([
    [45, 'north'],
    [-33.9, 'south'],
    [0, 'north'], // equator → north by convention
  ])('lat %p → %p', (lat, expected) => {
    expect(deriveClimateContext(lat, utc(6, 21)).hemisphere).toBe(expected);
  });
});

describe('deriveClimateContext — latitude band', () => {
  it.each<[number, LatitudeBand]>([
    [0, 'tropical'],
    [23.5, 'tropical'], // on the Tropic → still tropical
    [23.6, 'temperate'],
    [45, 'temperate'],
    [-45, 'temperate'], // negative latitudes classified by magnitude
    [66.5, 'temperate'], // on the Polar Circle → still temperate
    [66.6, 'polar'],
    [80, 'polar'],
    [-80, 'polar'],
  ])('lat %p → %p', (lat, expected) => {
    expect(deriveClimateContext(lat, utc(6, 21)).latitudeBand).toBe(expected);
  });
});

describe('deriveClimateContext — northern season at boundary start dates', () => {
  it.each<[number, number, Season]>([
    [3, 20, 'spring'], // Spring equinox
    [6, 21, 'summer'], // Summer solstice
    [9, 22, 'fall'], //   Fall equinox
    [12, 21, 'winter'], // Winter solstice
  ])('%p/%p → %p (north)', (m, d, expected) => {
    expect(deriveClimateContext(45, utc(m, d)).season).toBe(expected);
  });
});

describe('deriveClimateContext — northern season mid-season + edges', () => {
  it.each<[number, number, Season]>([
    [1, 15, 'winter'], //  top of year, before spring equinox
    [3, 19, 'winter'], //  day before spring equinox
    [5, 1, 'spring'],
    [6, 20, 'spring'], //  day before summer solstice
    [8, 1, 'summer'],
    [9, 21, 'summer'], //  day before fall equinox
    [11, 1, 'fall'],
    [12, 20, 'fall'], //   day before winter solstice
    [12, 31, 'winter'], // year-end wrap
  ])('%p/%p → %p (north)', (m, d, expected) => {
    expect(deriveClimateContext(45, utc(m, d)).season).toBe(expected);
  });
});

describe('deriveClimateContext — southern hemisphere season inversion', () => {
  it.each<[number, number, Season, Season]>([
    [6, 21, 'summer', 'winter'], // N summer solstice → S winter
    [12, 21, 'winter', 'summer'], // N winter solstice → S summer
    [3, 20, 'spring', 'fall'], //   N spring equinox → S fall
    [9, 22, 'fall', 'spring'], //   N fall equinox → S spring
  ])('%p/%p → north=%p, south=%p', (m, d, north, south) => {
    expect(deriveClimateContext(45, utc(m, d)).season).toBe(north);
    expect(deriveClimateContext(-45, utc(m, d)).season).toBe(south);
  });

  it('inverts every season relative to the same northern date', () => {
    const dates: Array<[number, number]> = [
      [2, 10],
      [4, 15],
      [7, 30],
      [10, 5],
    ];
    const opposite: Record<Season, Season> = {
      spring: 'fall',
      summer: 'winter',
      fall: 'spring',
      winter: 'summer',
    };
    for (const [m, d] of dates) {
      const north = deriveClimateContext(40, utc(m, d)).season;
      const south = deriveClimateContext(-40, utc(m, d)).season;
      expect(south).toBe(opposite[north]);
    }
  });
});

describe('deriveClimateContext — full shape', () => {
  it('returns hemisphere + latitudeBand + season (no climateZone)', () => {
    const ctx = deriveClimateContext(-33.9, utc(1, 15));
    expect(ctx).toEqual({ hemisphere: 'south', latitudeBand: 'temperate', season: 'summer' });
    expect(Object.keys(ctx).sort()).toEqual(['hemisphere', 'latitudeBand', 'season']);
  });
});
