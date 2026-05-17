import { describe, it, expect } from 'vitest';
import {
  ZONE_GUIDE_RADIUS_M,
  guideRadiusM,
  guideAreaM2,
  zoneSizeStatus,
  zoneGuideLabel,
  type ZLevel,
} from '../zoneSizeGuide.js';

describe('ZONE_GUIDE_RADIUS_M', () => {
  it('maps Z0..Z4 to the Mollison ladder and Z5 to null', () => {
    expect(ZONE_GUIDE_RADIUS_M[0]).toBe(5);
    expect(ZONE_GUIDE_RADIUS_M[1]).toBe(30);
    expect(ZONE_GUIDE_RADIUS_M[2]).toBe(100);
    expect(ZONE_GUIDE_RADIUS_M[3]).toBe(300);
    expect(ZONE_GUIDE_RADIUS_M[4]).toBe(600);
    expect(ZONE_GUIDE_RADIUS_M[5]).toBeNull();
  });
});

describe('guideRadiusM / guideAreaM2', () => {
  it('returns πr² for sized levels and null for Z5', () => {
    expect(guideRadiusM(2)).toBe(100);
    expect(guideAreaM2(2)).toBeCloseTo(Math.PI * 100 * 100, 6);
    expect(guideRadiusM(5)).toBeNull();
    expect(guideAreaM2(5)).toBeNull();
  });
});

describe('zoneSizeStatus', () => {
  const target = (z: ZLevel) => guideAreaM2(z) as number;

  it('flags under / ok / over against the tolerance band', () => {
    // Z2 target ≈ 31,416 m²; band = [0.4×, 2.5×].
    expect(zoneSizeStatus(target(2), 2)).toBe('ok');
    expect(zoneSizeStatus(target(2) * 0.5, 2)).toBe('ok');
    expect(zoneSizeStatus(target(2) * 2, 2)).toBe('ok');
    expect(zoneSizeStatus(target(2) * 0.1, 2)).toBe('under');
    expect(zoneSizeStatus(target(2) * 5, 2)).toBe('over');
  });

  it('returns none for Z5 and for missing / invalid areas', () => {
    expect(zoneSizeStatus(99999, 5)).toBe('none');
    expect(zoneSizeStatus(null, 2)).toBe('none');
    expect(zoneSizeStatus(0, 2)).toBe('none');
    expect(zoneSizeStatus(-10, 2)).toBe('none');
  });

  it('treats the band edges as ok (inclusive)', () => {
    expect(zoneSizeStatus(target(3) * 0.4, 3)).toBe('ok');
    expect(zoneSizeStatus(target(3) * 2.5, 3)).toBe('ok');
  });
});

describe('zoneGuideLabel', () => {
  it('states radius and area for sized levels', () => {
    expect(zoneGuideLabel(1)).toContain('30 m radius');
    expect(zoneGuideLabel(2)).toContain('ha');
    expect(zoneGuideLabel(0)).toContain('m²');
  });

  it('states no target for Z5', () => {
    expect(zoneGuideLabel(5)).toContain('no size target');
  });
});
