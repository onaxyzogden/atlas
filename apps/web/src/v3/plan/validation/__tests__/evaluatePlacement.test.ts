/**
 * evaluatePlacement — pure-evaluator tests over synthetic geometries.
 *
 * All shapes are built near (0,0) where 1 degree ≈ 111.32 km, so metre
 * offsets convert linearly and the turf distances stay accurate. Each
 * constraint type gets a passing AND a violating case; the MultiPolygon
 * boundary case pins the all-parts iteration (the geo.ts largest-ring
 * trap this module must not inherit).
 */

import { describe, expect, it } from 'vitest';
import { evaluatePlacement } from '../evaluatePlacement.js';
import type { PlacementContext } from '../placementContext.js';

const M = 1 / 111_320; // degrees per metre at the equator

/** Axis-aligned square centred at (cxM, cyM) with half-side halfM, metres. */
function sq(cxM: number, cyM: number, halfM: number): GeoJSON.Polygon {
  const x0 = (cxM - halfM) * M;
  const x1 = (cxM + halfM) * M;
  const y0 = (cyM - halfM) * M;
  const y1 = (cyM + halfM) * M;
  return {
    type: 'Polygon',
    coordinates: [
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
        [x0, y0],
      ],
    ],
  };
}

function pt(xM: number, yM: number): GeoJSON.Point {
  return { type: 'Point', coordinates: [xM * M, yM * M] };
}

function lineY(yM: number, xFromM: number, xToM: number): GeoJSON.LineString {
  return {
    type: 'LineString',
    coordinates: [
      [xFromM * M, yM * M],
      [xToM * M, yM * M],
    ],
  };
}

function makeCtx(partial?: Partial<PlacementContext>): PlacementContext {
  return {
    projectId: 'p1',
    boundary: null,
    zones: [],
    setbackRings: [],
    features: [],
    siteLayers: { wetland: [], waterway: [] },
    bufferCache: new Map(),
    ...partial,
  };
}

const ruleIds = (violations: { ruleId: string }[]) => violations.map((v) => v.ruleId);

describe('within-boundary', () => {
  it('passes inside, blocks outside, no-ops without a boundary', () => {
    const ctx = makeCtx({ boundary: sq(0, 0, 500) });
    const barn = { kind: 'barn', category: 'structure' };
    expect(ruleIds(evaluatePlacement(sq(0, 0, 10), barn, ctx).blocks)).not.toContain(
      'boundary-containment',
    );
    expect(ruleIds(evaluatePlacement(sq(1000, 0, 10), barn, ctx).blocks)).toContain(
      'boundary-containment',
    );
    expect(
      ruleIds(evaluatePlacement(sq(1000, 0, 10), barn, makeCtx()).blocks),
    ).not.toContain('boundary-containment');
  });

  it('accepts a candidate inside the SECOND part of a MultiPolygon boundary', () => {
    const boundary: GeoJSON.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [sq(0, 0, 200).coordinates, sq(1000, 0, 200).coordinates],
    };
    const ctx = makeCtx({ boundary });
    const result = evaluatePlacement(sq(1000, 0, 10), { kind: 'barn', category: 'structure' }, ctx);
    expect(ruleIds(result.blocks)).not.toContain('boundary-containment');
    // …and straddling the gap between parts still blocks.
    const straddle = evaluatePlacement(sq(500, 0, 10), { kind: 'barn', category: 'structure' }, ctx);
    expect(ruleIds(straddle.blocks)).toContain('boundary-containment');
  });

  it('annotation kinds are never boundary-gated', () => {
    const ctx = makeCtx({ boundary: sq(0, 0, 100) });
    const result = evaluatePlacement(pt(5000, 0), { kind: 'buffer-ring' }, ctx);
    expect(ruleIds(result.blocks)).not.toContain('boundary-containment');
  });
});

describe('min-distance-from (well/septic)', () => {
  const septicCtx = () =>
    makeCtx({
      features: [
        { id: 'sep1', kind: 'septic', category: 'utility', geometry: sq(0, 0, 5) },
      ],
    });

  it('blocks a well 15 m from a septic, passes at 45 m', () => {
    const well = { kind: 'well', category: 'utility' };
    expect(ruleIds(evaluatePlacement(pt(20, 0), well, septicCtx()).blocks)).toContain(
      'well-septic-separation',
    );
    expect(
      ruleIds(evaluatePlacement(pt(50, 0), well, septicCtx()).blocks),
    ).not.toContain('well-septic-separation');
  });

  it('self-excludes the dragged feature by id', () => {
    const ctx = makeCtx({
      features: [
        { id: 'well1', kind: 'well', category: 'utility', geometry: pt(0, 0) },
      ],
    });
    // Re-validating well1 against itself must not trip septic-well logic…
    const result = evaluatePlacement(pt(2, 0), { kind: 'septic', category: 'utility' }, ctx, {
      excludeFeatureId: 'well1',
    });
    expect(ruleIds(result.blocks)).not.toContain('septic-well-separation');
    // …but without the exclusion it does.
    const noExclude = evaluatePlacement(pt(2, 0), { kind: 'septic', category: 'utility' }, ctx);
    expect(ruleIds(noExclude.blocks)).toContain('septic-well-separation');
  });

  it('caches buffered targets per rule on the context', () => {
    const ctx = septicCtx();
    evaluatePlacement(pt(20, 0), { kind: 'well', category: 'utility' }, ctx);
    expect(ctx.bufferCache.has('well-septic-separation')).toBe(true);
    const cached = ctx.bufferCache.get('well-septic-separation');
    evaluatePlacement(pt(50, 0), { kind: 'well', category: 'utility' }, ctx);
    expect(ctx.bufferCache.get('well-septic-separation')).toBe(cached);
  });
});

describe('zone-exclusion', () => {
  it('blocks a paddock overlapping a spiritual zone; clear placement passes', () => {
    const ctx = makeCtx({
      zones: [{ id: 'z1', category: 'spiritual', geometry: sq(0, 0, 50) }],
    });
    const paddock = { kind: 'paddock', category: 'grazing' };
    expect(ruleIds(evaluatePlacement(sq(40, 0, 20), paddock, ctx).blocks)).toContain(
      'paddock-prohibited-zones',
    );
    expect(
      ruleIds(evaluatePlacement(sq(500, 0, 20), paddock, ctx).blocks),
    ).not.toContain('paddock-prohibited-zones');
  });

  it('buffer zones: blocks a barn, exempts a hedgerow', () => {
    const ctx = makeCtx({
      zones: [{ id: 'z1', category: 'buffer', geometry: sq(0, 0, 50) }],
    });
    expect(
      ruleIds(
        evaluatePlacement(sq(0, 0, 10), { kind: 'barn', category: 'structure' }, ctx).blocks,
      ),
    ).toContain('buffer-zone-exclusion');
    expect(
      ruleIds(
        evaluatePlacement(lineY(0, -40, 40), { kind: 'hedgerow', category: 'vegetation' }, ctx)
          .blocks,
      ),
    ).not.toContain('buffer-zone-exclusion');
  });
});

describe('site-layer distance (waterway / wetland)', () => {
  it('blocks a paddock 20 m from a waterway, passes at 80 m', () => {
    const ctx = () =>
      makeCtx({ siteLayers: { wetland: [], waterway: [lineY(100, -50, 50)] } });
    const paddock = { kind: 'paddock', category: 'grazing' };
    expect(ruleIds(evaluatePlacement(sq(0, 0, 80), paddock, ctx()).blocks)).toContain(
      'livestock-water-protection',
    );
    expect(
      ruleIds(evaluatePlacement(sq(0, 0, 20), paddock, ctx()).blocks),
    ).not.toContain('livestock-water-protection');
  });

  it('warns ground disturbance 40 m from a wetland, passes at 240 m', () => {
    const ctx = () =>
      makeCtx({ siteLayers: { wetland: [sq(0, 0, 50)], waterway: [] } });
    const barn = { kind: 'barn', category: 'structure' };
    expect(ruleIds(evaluatePlacement(sq(100, 0, 10), barn, ctx()).warns)).toContain(
      'wetland-disturbance-buffer',
    );
    expect(
      ruleIds(evaluatePlacement(sq(300, 0, 10), barn, ctx()).warns),
    ).not.toContain('wetland-disturbance-buffer');
  });
});

describe('zone-containment (orchard affinity)', () => {
  const orchard = { kind: 'orchard', category: 'crop-area' };
  const foodZone = { id: 'z1', category: 'food_production', geometry: sq(0, 0, 100) };

  it('no-ops while the project has no zones at all', () => {
    expect(
      ruleIds(evaluatePlacement(sq(0, 0, 50), orchard, makeCtx()).warns),
    ).not.toContain('orchard-guild-zone-affinity');
  });

  it('passes fully inside, warns fully outside', () => {
    const ctx = makeCtx({ zones: [foodZone] });
    expect(ruleIds(evaluatePlacement(sq(0, 0, 50), orchard, ctx).warns)).not.toContain(
      'orchard-guild-zone-affinity',
    );
    expect(ruleIds(evaluatePlacement(sq(500, 0, 50), orchard, ctx).warns)).toContain(
      'orchard-guild-zone-affinity',
    );
  });

  it('warns at 50% coverage (< 60% threshold)', () => {
    const ctx = makeCtx({ zones: [foodZone] });
    // Orchard spans x 50..150; zone ends at 100 → exactly half covered.
    expect(ruleIds(evaluatePlacement(sq(100, 0, 50), orchard, ctx).warns)).toContain(
      'orchard-guild-zone-affinity',
    );
  });

  it('warns when zones exist but none is food_production', () => {
    const ctx = makeCtx({
      zones: [{ id: 'z2', category: 'habitation', geometry: sq(0, 0, 100) }],
    });
    expect(ruleIds(evaluatePlacement(sq(0, 0, 50), orchard, ctx).warns)).toContain(
      'orchard-guild-zone-affinity',
    );
  });
});

describe('max-distance-from (nursery water proximity)', () => {
  const nursery = { kind: 'nursery', category: 'crop-area' };
  const wellAt = (xM: number) =>
    makeCtx({
      features: [{ id: 'w1', kind: 'well', category: 'utility', geometry: pt(xM, 0) }],
    });

  it('passes with a well 80 m away, warns at 280 m, no-ops with no water at all', () => {
    expect(
      ruleIds(evaluatePlacement(sq(0, 0, 20), nursery, wellAt(100)).warns),
    ).not.toContain('nursery-water-proximity');
    expect(ruleIds(evaluatePlacement(sq(0, 0, 20), nursery, wellAt(300)).warns)).toContain(
      'nursery-water-proximity',
    );
    expect(
      ruleIds(evaluatePlacement(sq(0, 0, 20), nursery, makeCtx()).warns),
    ).not.toContain('nursery-water-proximity');
  });
});

describe('no-overlap-same-kind', () => {
  it('warns on paddock overlap, passes clear, self-excludes on drag', () => {
    const ctx = () =>
      makeCtx({
        features: [
          { id: 'pad1', kind: 'paddock', category: 'grazing', geometry: sq(0, 0, 30) },
        ],
      });
    const paddock = { kind: 'paddock', category: 'grazing' };
    expect(ruleIds(evaluatePlacement(sq(20, 0, 30), paddock, ctx()).warns)).toContain(
      'paddock-no-self-overlap',
    );
    expect(
      ruleIds(evaluatePlacement(sq(200, 0, 30), paddock, ctx()).warns),
    ).not.toContain('paddock-no-self-overlap');
    expect(
      ruleIds(
        evaluatePlacement(sq(20, 0, 30), paddock, ctx(), { excludeFeatureId: 'pad1' }).warns,
      ),
    ).not.toContain('paddock-no-self-overlap');
  });
});

describe('steward-setback-respect (distanceM 0)', () => {
  it('warns when intersecting a drawn ring, passes clear', () => {
    const ctx = () =>
      makeCtx({ setbackRings: [{ id: 'r1', geometry: sq(0, 0, 30) }] });
    const barn = { kind: 'barn', category: 'structure' };
    expect(ruleIds(evaluatePlacement(sq(20, 0, 10), barn, ctx()).warns)).toContain(
      'steward-setback-respect',
    );
    expect(
      ruleIds(evaluatePlacement(sq(100, 0, 10), barn, ctx()).warns),
    ).not.toContain('steward-setback-respect');
  });
});

describe('permaculture-ring-range (guild Z1–Z3)', () => {
  const guild = { kind: 'guild', category: 'vegetation' };
  const zoneWithZ = (z: number) =>
    makeCtx({
      zones: [
        { id: 'z1', category: 'food_production', permacultureZone: z, geometry: sq(0, 0, 100) },
      ],
    });

  it('warns in Z4, passes in Z2, no-ops when rings are unmapped', () => {
    expect(ruleIds(evaluatePlacement(sq(0, 0, 20), guild, zoneWithZ(4)).warns)).toContain(
      'guild-permaculture-ring',
    );
    expect(
      ruleIds(evaluatePlacement(sq(0, 0, 20), guild, zoneWithZ(2)).warns),
    ).not.toContain('guild-permaculture-ring');
    const unmapped = makeCtx({
      zones: [{ id: 'z1', category: 'food_production', geometry: sq(0, 0, 100) }],
    });
    expect(
      ruleIds(evaluatePlacement(sq(0, 0, 20), guild, unmapped).warns),
    ).not.toContain('guild-permaculture-ring');
  });

  it('is indeterminate (no warn) outside every mapped ring', () => {
    expect(
      ruleIds(evaluatePlacement(sq(1000, 0, 20), guild, zoneWithZ(4)).warns),
    ).not.toContain('guild-permaculture-ring');
  });
});

describe('tiering + result shape', () => {
  it('separates blocks from warns and carries amanahNote through', () => {
    const ctx = makeCtx({
      zones: [{ id: 'z1', category: 'spiritual', geometry: sq(0, 0, 50) }],
      features: [
        { id: 'pad1', kind: 'paddock', category: 'grazing', geometry: sq(60, 0, 20) },
      ],
    });
    // Overlaps the spiritual zone (block), within 50 m of it (warn), and
    // overlaps pad1 (warn).
    const result = evaluatePlacement(sq(45, 0, 20), { kind: 'paddock', category: 'grazing' }, ctx);
    expect(result.ok).toBe(false);
    expect(ruleIds(result.blocks)).toContain('paddock-prohibited-zones');
    expect(ruleIds(result.warns)).toEqual(
      expect.arrayContaining(['livestock-spiritual-buffer', 'paddock-no-self-overlap']),
    );
    const blockNote = result.blocks.find((v) => v.ruleId === 'paddock-prohibited-zones');
    expect(blockNote?.amanahNote).toContain('tahara');
  });

  it('returns ok with empty arrays for a clean placement', () => {
    const result = evaluatePlacement(
      sq(0, 0, 10),
      { kind: 'barn', category: 'structure' },
      makeCtx({ boundary: sq(0, 0, 500) }),
    );
    expect(result).toEqual({ ok: true, blocks: [], warns: [] });
  });
});
