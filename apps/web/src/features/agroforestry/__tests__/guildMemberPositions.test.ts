/**
 * guildMemberPositions.test — pure-math coverage for the ring positioner
 * and the flat-earth metric offset. Canopy-union integration is exercised
 * in guildLivestockMath.test; this file is the unit-level shield.
 */

import { describe, expect, it } from 'vitest';
import type { GuildMember } from '../../../store/polycultureStore.js';
import {
  assignRingPositions,
  lonLatToMetresOffset,
  metresToLonLatOffset,
  ringRadiusForLayer,
} from '../guildMemberPositions.js';

const m = (layer: GuildMember['layer'], speciesId = 'x'): GuildMember => ({
  speciesId,
  layer,
});

describe('ringRadiusForLayer', () => {
  it('puts canopy at the origin and lower layers strictly outside', () => {
    expect(ringRadiusForLayer('canopy')).toBe(0);
    expect(ringRadiusForLayer('sub_canopy')).toBeGreaterThan(0);
    expect(ringRadiusForLayer('shrub')).toBeGreaterThan(0);
    expect(ringRadiusForLayer('herbaceous')).toBeGreaterThan(0);
    expect(ringRadiusForLayer('ground_cover')).toBeGreaterThan(0);
    expect(ringRadiusForLayer('vine')).toBeGreaterThan(0);
    expect(ringRadiusForLayer('root')).toBeGreaterThan(0);
  });
});

describe('assignRingPositions', () => {
  it('is deterministic — identical inputs yield identical outputs', () => {
    const members = [m('canopy'), m('sub_canopy'), m('sub_canopy'), m('shrub')];
    const a = assignRingPositions(members);
    const b = assignRingPositions(members);
    expect(a).toEqual(b);
  });

  it('distributes same-layer members evenly around their ring', () => {
    const members = [m('sub_canopy'), m('sub_canopy'), m('sub_canopy')];
    const positions = assignRingPositions(members);
    const r = ringRadiusForLayer('sub_canopy');
    for (const [east, north] of positions) {
      expect(Math.hypot(east, north)).toBeCloseTo(r, 6);
    }
    // 3 members evenly distributed → 120° apart.
    const angles = positions.map(([e, n]) => Math.atan2(n, e));
    // Sort then check successive gaps ≈ 2π/3.
    angles.sort((p, q) => p - q);
    const gap = (2 * Math.PI) / 3;
    expect(angles[1]! - angles[0]!).toBeCloseTo(gap, 6);
    expect(angles[2]! - angles[1]!).toBeCloseTo(gap, 6);
  });

  it('drops the lone canopy member at the origin', () => {
    const positions = assignRingPositions([m('canopy')]);
    expect(positions).toEqual([[0, 0]]);
  });

  it('passes explicit positions through unchanged', () => {
    const positioned: GuildMember = {
      speciesId: 'x',
      layer: 'shrub',
      position: [12.3, -4.5],
    };
    const positions = assignRingPositions([positioned]);
    expect(positions).toEqual([[12.3, -4.5]]);
  });

  it('mixes explicit and auto-derived positions without cross-contamination', () => {
    const members: GuildMember[] = [
      { speciesId: 'a', layer: 'canopy' },
      { speciesId: 'b', layer: 'shrub', position: [10, 0] },
      { speciesId: 'c', layer: 'shrub' },
    ];
    const positions = assignRingPositions(members);
    expect(positions[0]).toEqual([0, 0]);
    expect(positions[1]).toEqual([10, 0]);
    // The auto-positioned shrub uses ring radius for its layer; its
    // angular slot is index 0 of *one* remaining shrub on the ring.
    expect(Math.hypot(positions[2]![0], positions[2]![1])).toBeCloseTo(
      ringRadiusForLayer('shrub'),
      6,
    );
  });
});

describe('metresToLonLatOffset', () => {
  it('returns [0, 0] for the origin', () => {
    expect(metresToLonLatOffset(0, 0, 0)).toEqual([0, 0]);
    expect(metresToLonLatOffset(0, 0, 45)).toEqual([0, 0]);
    expect(metresToLonLatOffset(0, 0, -23.5)).toEqual([0, 0]);
  });

  it('approximates 1° of longitude at the equator at ~111.32 km east', () => {
    const [dLon, dLat] = metresToLonLatOffset(111_320, 0, 0);
    expect(dLon).toBeCloseTo(1, 4);
    expect(dLat).toBe(0);
  });

  it('approximates 1° of latitude at ~110.54 km north (any longitude)', () => {
    const [dLon, dLat] = metresToLonLatOffset(0, 110_540, 30);
    expect(dLon).toBe(0);
    expect(dLat).toBeCloseTo(1, 4);
  });

  it('shrinks longitude by cos(lat) — 1° at lat 60° takes half the metres', () => {
    const [dLon] = metresToLonLatOffset(111_320 / 2, 0, 60);
    expect(dLon).toBeCloseTo(1, 3);
  });
});

describe('lonLatToMetresOffset', () => {
  it('returns [0, 0] for the origin', () => {
    expect(lonLatToMetresOffset(0, 0, 0)).toEqual([0, 0]);
    expect(lonLatToMetresOffset(0, 0, 60)).toEqual([0, 0]);
  });

  it('round-trips with metresToLonLatOffset at the equator', () => {
    const east = 3;
    const north = 4;
    const [dLon, dLat] = metresToLonLatOffset(east, north, 0);
    const [e2, n2] = lonLatToMetresOffset(dLon, dLat, 0);
    expect(e2).toBeCloseTo(east, 9);
    expect(n2).toBeCloseTo(north, 9);
  });

  it('round-trips at lat 60°', () => {
    const east = -2;
    const north = 6;
    const [dLon, dLat] = metresToLonLatOffset(east, north, 60);
    const [e2, n2] = lonLatToMetresOffset(dLon, dLat, 60);
    expect(e2).toBeCloseTo(east, 9);
    expect(n2).toBeCloseTo(north, 9);
  });

  it('round-trips at lat -45°', () => {
    const east = 0;
    const north = 0.5;
    const [dLon, dLat] = metresToLonLatOffset(east, north, -45);
    const [e2, n2] = lonLatToMetresOffset(dLon, dLat, -45);
    expect(e2).toBeCloseTo(east, 9);
    expect(n2).toBeCloseTo(north, 9);
  });
});
