import { describe, expect, it } from 'vitest';
import {
  PERMACULTURE_ZONE_LABEL,
  zoneDisplayLabel,
} from '../permacultureLabels.js';

type Z = Parameters<typeof zoneDisplayLabel>[0];

describe('zoneDisplayLabel', () => {
  it('replaces legacy "(seeded)" names with the canonical label', () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      const z: Z = { name: `Z${level} (seeded)`, permacultureZone: level };
      expect(zoneDisplayLabel(z)).toBe(PERMACULTURE_ZONE_LABEL[level]);
    }
  });

  it('falls back to the canonical label for empty/whitespace names', () => {
    expect(zoneDisplayLabel({ name: '', permacultureZone: 2 })).toBe(
      PERMACULTURE_ZONE_LABEL[2],
    );
    expect(zoneDisplayLabel({ name: '   ', permacultureZone: 4 })).toBe(
      PERMACULTURE_ZONE_LABEL[4],
    );
  });

  it('preserves custom (user-given) names', () => {
    expect(
      zoneDisplayLabel({ name: 'North paddock', permacultureZone: 3 }),
    ).toBe('North paddock');
    // "Home centre" is the generator's Z0 name — not a seeded pattern, kept as-is.
    expect(zoneDisplayLabel({ name: 'Home centre', permacultureZone: 0 })).toBe(
      'Home centre',
    );
  });

  it('returns the stored name when no permaculture level is set', () => {
    expect(
      zoneDisplayLabel({ name: 'Z2 (seeded)', permacultureZone: undefined }),
    ).toBe('Z2 (seeded)');
  });
});
