import { describe, expect, it } from 'vitest';
import {
  computeOpportunities,
  intersectionId,
  type SocialElementPt,
  type SocialPath,
  type SocialZone,
} from '../socialNodesMath.js';

// A ~220 m square centred on the origin, tagged Z1. Two paths cross at its
// centre — the canonical "net in the flow" opportunity.
const Z1: SocialZone = {
  permacultureZone: 1,
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-0.001, -0.001],
        [0.001, -0.001],
        [0.001, 0.001],
        [-0.001, 0.001],
        [-0.001, -0.001],
      ],
    ],
  },
};

const pathH: SocialPath = {
  id: 'path-h',
  coords: [
    [-0.0008, 0],
    [0.0008, 0],
  ],
};
const pathV: SocialPath = {
  id: 'path-v',
  coords: [
    [0, -0.0008],
    [0, 0.0008],
  ],
};

describe('computeOpportunities', () => {
  it('finds a single intersection inside a Z1 zone, uncovered', () => {
    const opps = computeOpportunities([pathH, pathV], [Z1], []);
    expect(opps).toHaveLength(1);
    expect(opps[0]!.zoneLevel).toBe(1);
    expect(opps[0]!.cover).toBeNull();
    expect(opps[0]!.pt.lat).toBeCloseTo(0, 6);
    expect(opps[0]!.pt.lng).toBeCloseTo(0, 6);
  });

  it('marks the intersection covered when a social element sits within radius', () => {
    const bench: SocialElementPt = {
      id: 'bench-1',
      kind: 'bench',
      label: 'Bench',
      pt: { lng: 0, lat: 0 }, // exactly on the intersection (0 m)
    };
    const opps = computeOpportunities([pathH, pathV], [Z1], [bench]);
    expect(opps).toHaveLength(1);
    expect(opps[0]!.cover).not.toBeNull();
    expect(opps[0]!.cover!.kind).toBe('bench');
    expect(opps[0]!.cover!.distanceM).toBeLessThan(1);
  });

  it('does NOT count a far-away social element as coverage', () => {
    const farBench: SocialElementPt = {
      id: 'bench-far',
      kind: 'bench',
      label: 'Bench',
      pt: { lng: 0.0009, lat: 0.0009 }, // ~140 m away, well past COVERED_RADIUS_M
    };
    const opps = computeOpportunities([pathH, pathV], [Z1], [farBench]);
    expect(opps[0]!.cover).toBeNull();
  });

  it('drops intersections outside any Z1/Z2 zone', () => {
    const farZone: SocialZone = {
      permacultureZone: 1,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [1, 1],
            [1.001, 1],
            [1.001, 1.001],
            [1, 1.001],
            [1, 1],
          ],
        ],
      },
    };
    const opps = computeOpportunities([pathH, pathV], [farZone], []);
    expect(opps).toHaveLength(0);
  });

  it('filters out dismissed opportunities', () => {
    const id = intersectionId('path-h', 'path-v', { lng: 0, lat: 0 });
    const opps = computeOpportunities(
      [pathH, pathV],
      [Z1],
      [],
      new Set([id]),
    );
    expect(opps).toHaveLength(0);
  });

  it('returns empty when fewer than two paths are present', () => {
    expect(computeOpportunities([pathH], [Z1], [])).toHaveLength(0);
    expect(computeOpportunities([], [Z1], [])).toHaveLength(0);
  });

  it('sorts uncovered before covered, then Z1 before Z2', () => {
    // Second crossing pair inside a Z2 zone, covered.
    const Z2: SocialZone = {
      permacultureZone: 2,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0.0095, 0.0095],
            [0.0105, 0.0095],
            [0.0105, 0.0105],
            [0.0095, 0.0105],
            [0.0095, 0.0095],
          ],
        ],
      },
    };
    const pathH2: SocialPath = {
      id: 'path-h2',
      coords: [
        [0.0097, 0.01],
        [0.0103, 0.01],
      ],
    };
    const pathV2: SocialPath = {
      id: 'path-v2',
      coords: [
        [0.01, 0.0097],
        [0.01, 0.0103],
      ],
    };
    const cover: SocialElementPt = {
      id: 'pav',
      kind: 'gathering-pavilion',
      label: 'Gathering pavilion',
      pt: { lng: 0.01, lat: 0.01 },
    };

    const opps = computeOpportunities(
      [pathH, pathV, pathH2, pathV2],
      [Z1, Z2],
      [cover],
    );
    expect(opps).toHaveLength(2);
    // Uncovered Z1 opportunity sorts first; covered Z2 last.
    expect(opps[0]!.cover).toBeNull();
    expect(opps[0]!.zoneLevel).toBe(1);
    expect(opps[1]!.cover).not.toBeNull();
    expect(opps[1]!.zoneLevel).toBe(2);
  });
});
