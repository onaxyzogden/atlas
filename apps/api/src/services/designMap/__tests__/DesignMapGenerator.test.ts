import { describe, it, expect } from 'vitest';
import {
  generateDesignMap,
  emptySummary,
  DEFAULT_ENTERPRISES,
} from '../DesignMapGenerator.js';
import type { Ring } from '../geometry.js';
import { metresPerDegLat, metresPerDegLon } from '../geometry.js';

const ANCHOR_LAT = 43;
const ANCHOR_LON = -79;

function squareParcel(sideM: number): Ring {
  const half = sideM / 2;
  const mLat = metresPerDegLat();
  const mLon = metresPerDegLon(ANCHOR_LAT);
  const w = ANCHOR_LON - half / mLon;
  const e = ANCHOR_LON + half / mLon;
  const s = ANCHOR_LAT - half / mLat;
  const n = ANCHOR_LAT + half / mLat;
  return [
    [w, s],
    [e, s],
    [e, n],
    [w, n],
    [w, s],
  ];
}

describe('generateDesignMap — orchestrator (B.1 skeleton)', () => {
  it('returns the empty summary + a "no algorithms registered" warning until B.2 lands', () => {
    const out = generateDesignMap({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
    });
    expect(out.features).toEqual([]);
    expect(out.summary).toEqual(emptySummary());
    expect(out.warnings).toContain('no algorithms registered');
  });

  it('rejects a parcel with fewer than 3 boundary vertices', () => {
    const out = generateDesignMap({
      parcel: { boundary: [[0, 0], [1, 1]] },
      acres: 10,
    });
    expect(out.features).toEqual([]);
    expect(out.warnings).toContain('parcel boundary missing or invalid');
  });

  it('rejects non-positive acreage', () => {
    const out = generateDesignMap({
      parcel: { boundary: squareParcel(900) },
      acres: 0,
    });
    expect(out.warnings).toContain('parcel acres must be positive');
  });

  it('exposes a default enterprise mix of orchard + livestock', () => {
    expect(DEFAULT_ENTERPRISES).toContain('orchard');
    expect(DEFAULT_ENTERPRISES).toContain('livestock');
  });
});
