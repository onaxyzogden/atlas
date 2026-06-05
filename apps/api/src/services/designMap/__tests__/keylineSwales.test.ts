import { describe, it, expect } from 'vitest';
import {
  generateKeylineSwales,
  type KeylineSwalesInput,
} from '../algorithms/keylineSwales.js';
import type { SwaleCandidateInput } from '../DesignMapGenerator.js';
import {
  metresPerDegLat,
  metresPerDegLon,
  type LonLat,
  type Ring,
} from '../geometry.js';

const ANCHOR_LAT = 43;
const ANCHOR_LON = -79;
const M_LAT = metresPerDegLat();
const M_LON = metresPerDegLon(ANCHOR_LAT);

function squareParcel(sideM: number): Ring {
  const half = sideM / 2;
  const w = ANCHOR_LON - half / M_LON;
  const e = ANCHOR_LON + half / M_LON;
  const s = ANCHOR_LAT - half / M_LAT;
  const n = ANCHOR_LAT + half / M_LAT;
  return [
    [w, s],
    [e, s],
    [e, n],
    [w, n],
    [w, s],
  ];
}

function pointAt(eastingM: number, northingM: number): LonLat {
  return [ANCHOR_LON + eastingM / M_LON, ANCHOR_LAT + northingM / M_LAT];
}

function swale(
  startE: number,
  startN: number,
  endE: number,
  endN: number,
  overrides: Partial<SwaleCandidateInput> = {},
): SwaleCandidateInput {
  return {
    start: pointAt(startE, startN),
    end: pointAt(endE, endN),
    lengthCells: 10,
    meanSlope: 6,
    elevation: 100,
    suitabilityScore: 0.8,
    ...overrides,
  };
}

describe('generateKeylineSwales', () => {
  const parcel = { parcel: { boundary: squareParcel(900) } };

  it('emits a warning when no candidates are supplied', () => {
    const out = generateKeylineSwales({ ...parcel, candidates: [] });
    expect(out.features).toEqual([]);
    expect(out.warnings[0]).toMatch(/no swale candidates provided/);
  });

  it('promotes every suitable candidate to a path feature', () => {
    const input: KeylineSwalesInput = {
      ...parcel,
      candidates: [
        swale(-300, -100, 300, -100),
        swale(-300, 0, 300, 0),
        swale(-300, 100, 300, 100),
      ],
    };
    const out = generateKeylineSwales(input);
    expect(out.swaleCount).toBe(3);
    for (const f of out.features) {
      expect(f.featureType).toBe('path');
      expect(f.subtype).toBe('farm_lane');
      expect(f.phaseTag).toBe('water');
      expect((f.properties as { generator: string }).generator).toBe(
        'keylineSwales',
      );
    }
  });

  it('drops candidates below minSuitability', () => {
    const input: KeylineSwalesInput = {
      ...parcel,
      candidates: [
        swale(-300, 0, 300, 0, { suitabilityScore: 0.3 }),
        swale(-300, 100, 300, 100, { suitabilityScore: 0.7 }),
      ],
    };
    const out = generateKeylineSwales(input);
    expect(out.swaleCount).toBe(1);
  });

  it('drops candidates above maxSlopePct', () => {
    const input: KeylineSwalesInput = {
      ...parcel,
      candidates: [
        swale(-300, 0, 300, 0, { meanSlope: 8 }),
        swale(-300, 100, 300, 100, { meanSlope: 20 }),
      ],
      options: { maxSlopePct: 15 },
    };
    const out = generateKeylineSwales(input);
    expect(out.swaleCount).toBe(1);
  });

  it('drops candidates shorter than minLengthM', () => {
    const input: KeylineSwalesInput = {
      ...parcel,
      candidates: [
        swale(-5, 0, 5, 0), // ~10 m
        swale(-300, 100, 300, 100), // ~600 m
      ],
    };
    const out = generateKeylineSwales(input);
    expect(out.swaleCount).toBe(1);
  });

  it('drops candidates whose midpoint sits outside the parcel', () => {
    const input: KeylineSwalesInput = {
      ...parcel,
      candidates: [
        // Midpoint at (1500, 0) — well outside the 900 m square.
        swale(1200, 0, 1800, 0),
        swale(-200, 0, 200, 0),
      ],
    };
    const out = generateKeylineSwales(input);
    expect(out.swaleCount).toBe(1);
  });

  it('sponge capacity follows depth × width × fillFactor × length', () => {
    const input: KeylineSwalesInput = {
      ...parcel,
      candidates: [swale(-300, 0, 300, 0)], // ~600 m
      options: { depthM: 0.5, widthM: 1.2, fillFactor: 0.7 },
    };
    const out = generateKeylineSwales(input);
    // 600 m × 0.5 × 1.2 × 0.7 = 252 m³
    expect(out.totalSpongeCapacityM3).toBeGreaterThan(240);
    expect(out.totalSpongeCapacityM3).toBeLessThan(265);
  });

  it('emits "no swales generated" when every candidate is filtered out', () => {
    const input: KeylineSwalesInput = {
      ...parcel,
      candidates: [swale(-300, 0, 300, 0, { suitabilityScore: 0.1 })],
    };
    const out = generateKeylineSwales(input);
    expect(out.swaleCount).toBe(0);
    expect(out.warnings).toContain('no swales generated');
  });
});
