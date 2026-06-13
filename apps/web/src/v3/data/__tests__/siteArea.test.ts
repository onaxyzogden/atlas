/**
 * resolveSiteAcres -- the parcel-area denominator for drawn-survey "% of site"
 * math. These tests pin the Bug #1 root cause: the slope/veg surveys read
 * `project.location.acreage`, which is a DISPLAY-unit value (hectares for
 * metric) and is zeroed by `adaptLocalProjectToV3` whenever the stored acreage
 * is untrustworthy -- even though a drawable boundary polygon still exists. That
 * fed `siteAcres = 0` into the selector, so every class rendered 0%.
 *
 * The fix prefers the turf-measured boundary (acres, matching the drawn
 * polygons) and only falls back to the display acreage (converted to acres).
 */

import { describe, it, expect } from 'vitest';
import type { ProjectLocation } from '../../types.js';
import { resolveSiteAcres } from '../siteArea.js';

// ~100 m x 100 m square near the equator ~= 1 hectare ~= 2.471 acres.
// (Same fixture the canonical parcelAcres test uses.)
const SIDE = 0.0008993;
const oneHectareSquare: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [SIDE, 0],
      [SIDE, SIDE],
      [0, SIDE],
      [0, 0],
    ],
  ],
};

function loc(over: Partial<ProjectLocation>): ProjectLocation {
  return {
    region: 'Test',
    country: 'Test',
    acreage: 0,
    acreageUnit: 'ha',
    ...over,
  };
}

describe('resolveSiteAcres', () => {
  it('returns the boundary area in ACRES (~2.47 for a ~1-ha parcel)', () => {
    const acres = resolveSiteAcres(loc({ boundary: oneHectareSquare }));
    expect(acres).toBeGreaterThan(2.3);
    expect(acres).toBeLessThan(2.6);
  });

  it('regression: a boundary parcel with acreage=0 still yields acres (NOT 0)', () => {
    // The exact Bug #1 shape: boundary drawn, but the display acreage field is
    // unset/zero (areaKnown=false). Old code read acreage -> 0 -> every pct=0.
    const acres = resolveSiteAcres(
      loc({ boundary: oneHectareSquare, acreage: 0, areaKnown: false }),
    );
    expect(acres).toBeGreaterThan(0);
    expect(acres).toBeGreaterThan(2.3);
  });

  it('prefers the boundary even when a (stale) acreage is present', () => {
    const acres = resolveSiteAcres(
      loc({ boundary: oneHectareSquare, acreage: 999, acreageUnit: 'ha' }),
    );
    // Boundary (~2.47 ac) wins over the 999-ha field, so numerator and
    // denominator share one spatial reference.
    expect(acres).toBeLessThan(3);
  });

  it('no boundary, metric: converts the hectares field to acres', () => {
    // 100 ha / 0.404686 ha-per-acre ~= 247.1 acres.
    const acres = resolveSiteAcres(loc({ acreage: 100, acreageUnit: 'ha' }));
    expect(acres).toBeGreaterThan(246);
    expect(acres).toBeLessThan(248);
  });

  it('no boundary, imperial: returns the acres field unchanged', () => {
    expect(resolveSiteAcres(loc({ acreage: 40, acreageUnit: 'ac' }))).toBe(40);
  });

  it('returns 0 for null / undefined location', () => {
    expect(resolveSiteAcres(null)).toBe(0);
    expect(resolveSiteAcres(undefined)).toBe(0);
  });

  it('returns 0 when neither a boundary nor a positive acreage exists', () => {
    expect(resolveSiteAcres(loc({ acreage: 0 }))).toBe(0);
    expect(resolveSiteAcres(loc({ acreage: -5, acreageUnit: 'ac' }))).toBe(0);
  });
});
