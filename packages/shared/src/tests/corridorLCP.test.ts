/**
 * Biodiversity corridor LCP — algorithm correctness tests.
 */

import { describe, it, expect } from 'vitest';
import {
  COVER_IMPEDANCE,
  computeCorridor,
  dijkstraLCP,
  frictionForCell,
  frictionForIntervention,
  gridDims,
  normalizeCoverClass,
  pickCorridorAnchors,
  zoneCentroid,
  type ZoneInput,
} from '../ecology/corridorLCP.js';

const BBOX: [number, number, number, number] = [-80, 43, -79, 44];

describe('frictionForIntervention', () => {
  it('ranks interventions by connectivity value', () => {
    expect(frictionForIntervention('food_forest_candidate')).toBeLessThan(
      frictionForIntervention('cover_crop_candidate'),
    );
    expect(frictionForIntervention('cover_crop_candidate')).toBeLessThan(
      frictionForIntervention('mulching_priority'),
    );
    expect(frictionForIntervention(null)).toBeGreaterThan(
      frictionForIntervention('mulching_priority'),
    );
  });
});

describe('gridDims + zoneCentroid', () => {
  it('reconstructs 3x3 grid layout from 9 zones', () => {
    const { cols, rows } = gridDims(9);
    expect(cols).toBe(3);
    expect(rows).toBe(3);
  });

  it('matches processor centroid formula for zone 0 and last zone', () => {
    const first = zoneCentroid(0, 9, BBOX);
    const last = zoneCentroid(8, 9, BBOX);
    // (0,0) → top-left cell in lat sense (maxLat minus half a row)
    expect(first[0]).toBeCloseTo(-80 + (0.5 / 3) * 1, 5);
    expect(first[1]).toBeCloseTo(44 - (0.5 / 3) * 1, 5);
    // (2,2) → bottom-right cell
    expect(last[0]).toBeCloseTo(-80 + (2.5 / 3) * 1, 5);
    expect(last[1]).toBeCloseTo(44 - (2.5 / 3) * 1, 5);
  });
});

describe('dijkstraLCP', () => {
  const uniformFriction = (n: number, v = 1) => {
    const m = new Map<number, number>();
    for (let i = 0; i < n; i++) m.set(i, v);
    return m;
  };

  it('finds direct path across a uniform grid (3x3, 0 → 2)', () => {
    const res = dijkstraLCP(9, 0, 2, uniformFriction(9));
    expect(res).not.toBeNull();
    expect(res!.pathZoneIds[0]).toBe(0);
    expect(res!.pathZoneIds[res!.pathZoneIds.length - 1]).toBe(2);
    expect(res!.totalCost).toBeCloseTo(2, 5);
  });

  it('prefers the diagonal when cheaper (3x3, 0 → 8)', () => {
    const res = dijkstraLCP(9, 0, 8, uniformFriction(9));
    expect(res).not.toBeNull();
    // 0 → 4 → 8 is two diagonal steps = 2√2 ≈ 2.828, cheaper than 4 cardinal steps
    expect(res!.pathZoneIds).toEqual([0, 4, 8]);
    expect(res!.totalCost).toBeCloseTo(2 * Math.SQRT2, 5);
  });

  it('routes around an obstacle row (3x3, 1 → 7 with cell 4 walled off)', () => {
    const friction = uniformFriction(9, 1);
    friction.set(4, 10_000);
    const res = dijkstraLCP(9, 1, 7, friction);
    expect(res).not.toBeNull();
    expect(res!.pathZoneIds).not.toContain(4);
    // Must still cost well under the blocked-cell cost
    expect(res!.totalCost).toBeLessThan(100);
  });

  it('returns non-null short circuit when source === sink', () => {
    const res = dijkstraLCP(9, 5, 5, uniformFriction(9));
    expect(res).not.toBeNull();
    expect(res!.pathZoneIds).toEqual([5]);
    expect(res!.totalCost).toBe(0);
  });
});

describe('pickCorridorAnchors', () => {
  it('returns null when fewer than 2 high-band zones exist', () => {
    const zones: ZoneInput[] = [
      { zoneId: 0, primaryIntervention: 'food_forest_candidate' },
      { zoneId: 1, primaryIntervention: 'cover_crop_candidate' },
      { zoneId: 2, primaryIntervention: 'cover_crop_candidate' },
      { zoneId: 3, primaryIntervention: 'cover_crop_candidate' },
    ];
    expect(pickCorridorAnchors(zones, 4, 1)).toBeNull();
  });

  it('picks the farthest pair among high-band zones', () => {
    const zones: ZoneInput[] = [
      { zoneId: 0, primaryIntervention: 'food_forest_candidate' }, // (0,0)
      { zoneId: 2, primaryIntervention: 'silvopasture_candidate' }, // (0,2)
      { zoneId: 8, primaryIntervention: 'food_forest_candidate' }, // (2,2) — corner
      { zoneId: 4, primaryIntervention: 'cover_crop_candidate' },
    ];
    const pair = pickCorridorAnchors(zones, 9, 1);
    expect(pair).not.toBeNull();
    const ids = [pair!.source.zoneId, pair!.sink.zoneId].sort();
    expect(ids).toEqual([0, 8]); // diagonal corners
  });
});

describe('normalizeCoverClass', () => {
  it('maps NLCD / AAFC / WorldCover synonyms to canonical classes', () => {
    expect(normalizeCoverClass('Deciduous Forest')).toBe('forest');
    expect(normalizeCoverClass('Evergreen Forest')).toBe('forest');
    expect(normalizeCoverClass('Mixed Forest')).toBe('forest');
    expect(normalizeCoverClass('Cultivated Crops')).toBe('cropland');
    expect(normalizeCoverClass('Cereals')).toBe('cropland');
    expect(normalizeCoverClass('Annual Crops')).toBe('cropland');
    expect(normalizeCoverClass('Pasture/Hay')).toBe('pasture');
    expect(normalizeCoverClass('Grassland/Herbaceous')).toBe('grassland');
    expect(normalizeCoverClass('Shrub/Scrub')).toBe('shrubland');
    expect(normalizeCoverClass('Woody Wetlands')).toBe('wetland');
    expect(normalizeCoverClass('Open Water')).toBe('water');
    expect(normalizeCoverClass('Developed, Medium Intensity')).toBe('urban');
    expect(normalizeCoverClass('Barren Land')).toBe('barren');
    expect(normalizeCoverClass(null)).toBe('unknown');
    expect(normalizeCoverClass('')).toBe('unknown');
    expect(normalizeCoverClass('XYZ')).toBe('unknown');
  });
});

describe('frictionForCell', () => {
  it('uses cover impedance as the dominant axis', () => {
    const forestMulch = frictionForCell({
      intervention: 'mulching_priority',
      coverClass: 'Deciduous Forest',
    });
    const urbanFoodForest = frictionForCell({
      intervention: 'food_forest_candidate',
      coverClass: 'Developed, High Intensity',
    });
    // A mulched forest cell should still be more permeable than a
    // food-forest-planned parking lot — matrix matters.
    expect(forestMulch).toBeLessThan(urbanFoodForest);
  });

  it('applies intervention discount on moderate-impedance cells', () => {
    // Grassland base=3 leaves headroom above the clamp floor so the
    // silvopasture×0.7 discount is visible.
    const grassSilvopasture = frictionForCell({
      intervention: 'silvopasture_candidate',
      coverClass: 'Grassland/Herbaceous',
    });
    const grassMulch = frictionForCell({
      intervention: 'mulching_priority',
      coverClass: 'Grassland/Herbaceous',
    });
    expect(grassSilvopasture).toBeLessThan(grassMulch);
  });

  it('scales friction with disturbance level', () => {
    const pristine = frictionForCell({
      intervention: 'cover_crop_candidate',
      coverClass: 'Grassland/Herbaceous',
      disturbanceLevel: 0,
    });
    const disturbed = frictionForCell({
      intervention: 'cover_crop_candidate',
      coverClass: 'Grassland/Herbaceous',
      disturbanceLevel: 1,
    });
    expect(disturbed).toBeGreaterThan(pristine);
  });

  it('falls back to intervention-only friction when coverClass is missing', () => {
    const cellFallback = frictionForCell({
      intervention: 'silvopasture_candidate',
      coverClass: null,
    });
    expect(cellFallback).toBe(frictionForIntervention('silvopasture_candidate'));
  });

  it('clamps into [1, 20]', () => {
    const urbanDisturbed = frictionForCell({
      intervention: 'mulching_priority',
      coverClass: 'Developed, High Intensity',
      disturbanceLevel: 1,
    });
    expect(urbanDisturbed).toBeLessThanOrEqual(20);
    const forestSilvo = frictionForCell({
      intervention: 'food_forest_candidate',
      coverClass: 'Deciduous Forest',
      disturbanceLevel: 0,
    });
    expect(forestSilvo).toBeGreaterThanOrEqual(1);
  });

  it('reference impedance sanity: forest <= cropland < water < urban', () => {
    expect(COVER_IMPEDANCE.forest).toBeLessThanOrEqual(COVER_IMPEDANCE.cropland);
    expect(COVER_IMPEDANCE.cropland).toBeLessThan(COVER_IMPEDANCE.water);
    expect(COVER_IMPEDANCE.water).toBeLessThan(COVER_IMPEDANCE.urban);
  });
});

describe('computeCorridor — cover-aware routing', () => {
  it('prefers a forest corridor over cropland when interventions are uniform', () => {
    // 5x5 grid: source at (0,0)=zone 0 (food_forest), sink at (4,4)=zone 24 (food_forest),
    // middle column (col 2 → zones 2,7,12,17,22) is forest; everything else cropland.
    // With uniform "cover_crop" intervention, forest column should pull the path.
    const total = 25;
    const zones: ZoneInput[] = Array.from({ length: total }, (_, i) => ({
      zoneId: i,
      primaryIntervention: 'cover_crop_candidate',
      coverClass: 'Cultivated Crops',
    }));
    // Anchors — must be high-band for pickCorridorAnchors to pick them
    zones[0] = { zoneId: 0, primaryIntervention: 'food_forest_candidate', coverClass: 'Deciduous Forest' };
    zones[24] = { zoneId: 24, primaryIntervention: 'food_forest_candidate', coverClass: 'Deciduous Forest' };
    // Forest column
    for (const z of [2, 7, 12, 17, 22]) {
      zones[z] = { zoneId: z, primaryIntervention: 'cover_crop_candidate', coverClass: 'Mixed Forest' };
    }
    const result = computeCorridor({
      totalZones: total,
      bbox: [-80, 43, -79, 44],
      zones,
    });
    expect(result).not.toBeNull();
    // Path should detour through the forest column rather than punch through cropland
    const passesThroughForestCol = result!.pathZoneIds.some((id) => [2, 7, 12, 17, 22].includes(id));
    expect(passesThroughForestCol).toBe(true);
  });
});

describe('computeCorridor', () => {
  it('returns null when no high-band anchors', () => {
    const zones: ZoneInput[] = Array.from({ length: 9 }, (_, i) => ({
      zoneId: i,
      primaryIntervention: 'cover_crop_candidate',
    }));
    expect(computeCorridor({ totalZones: 9, bbox: BBOX, zones })).toBeNull();
  });

  it('emits a coordinate path when viable anchors exist', () => {
    const zones: ZoneInput[] = Array.from({ length: 9 }, (_, i) => ({
      zoneId: i,
      primaryIntervention: 'cover_crop_candidate' as const,
    }));
    zones[0] = { zoneId: 0, primaryIntervention: 'food_forest_candidate' };
    zones[8] = { zoneId: 8, primaryIntervention: 'silvopasture_candidate' };
    const result = computeCorridor({ totalZones: 9, bbox: BBOX, zones });
    expect(result).not.toBeNull();
    expect(result!.sourceZoneId).toBe(0);
    expect(result!.sinkZoneId).toBe(8);
    expect(result!.pathCoordinates.length).toBeGreaterThanOrEqual(2);
    expect(result!.pathCoordinates[0]).toEqual(zoneCentroid(0, 9, BBOX));
    expect(result!.pathCoordinates[result!.pathCoordinates.length - 1]).toEqual(
      zoneCentroid(8, 9, BBOX),
    );
  });

  it('returns null when totalZones is below the minimum useful size', () => {
    const zones: ZoneInput[] = [
      { zoneId: 0, primaryIntervention: 'food_forest_candidate' },
      { zoneId: 1, primaryIntervention: 'silvopasture_candidate' },
    ];
    expect(computeCorridor({ totalZones: 2, bbox: BBOX, zones })).toBeNull();
  });
});
