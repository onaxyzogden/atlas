import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HALF_LIFE_YEARS,
  TOPIC_TO_LAYERS,
  aggregateByLayer,
  decayWeight,
  levelFromWeight,
} from '../computeFieldVerification.js';
import type { RawObservation } from '../types.js';

const ASOF = '2026-05-23T00:00:00.000Z';
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/** ISO date `years` before ASOF. */
function yearsBefore(years: number): string {
  return new Date(new Date(ASOF).getTime() - years * MS_PER_YEAR).toISOString();
}

describe('decayWeight', () => {
  it('is full weight (1) for a just-now observation', () => {
    expect(decayWeight(ASOF, ASOF)).toBe(1);
  });

  it('halves at exactly one half-life', () => {
    expect(decayWeight(yearsBefore(DEFAULT_HALF_LIFE_YEARS), ASOF)).toBeCloseTo(0.5, 5);
  });

  it('quarters at two half-lives', () => {
    expect(decayWeight(yearsBefore(2 * DEFAULT_HALF_LIFE_YEARS), ASOF)).toBeCloseTo(0.25, 5);
  });

  it('clamps future-dated observations to full weight', () => {
    expect(decayWeight(yearsBefore(-2), ASOF)).toBe(1);
  });

  it('returns 0 for an unparseable date', () => {
    expect(decayWeight('not-a-date', ASOF)).toBe(0);
  });
});

describe('levelFromWeight', () => {
  it('maps the three bands at their boundaries', () => {
    expect(levelFromWeight(0)).toBe('unverified');
    expect(levelFromWeight(0.49)).toBe('unverified');
    expect(levelFromWeight(0.5)).toBe('corroborated');
    expect(levelFromWeight(1.49)).toBe('corroborated');
    expect(levelFromWeight(1.5)).toBe('verified');
    expect(levelFromWeight(10)).toBe('verified');
  });
});

describe('TOPIC_TO_LAYERS', () => {
  it('maps soil topics to the soils layer', () => {
    expect(TOPIC_TO_LAYERS['soil-sample']).toEqual(['soils']);
    expect(TOPIC_TO_LAYERS['soil-health']).toEqual(['soils']);
  });

  it('maps water-quality to both hydrology layers', () => {
    expect(TOPIC_TO_LAYERS['water-quality']).toEqual(['watershed', 'wetlands_flood']);
  });

  it('maps biotic topics to land cover and general to nothing', () => {
    expect(TOPIC_TO_LAYERS.invasives).toEqual(['land_cover']);
    expect(TOPIC_TO_LAYERS.wildlife).toEqual(['land_cover']);
    expect(TOPIC_TO_LAYERS.general).toEqual([]);
  });
});

describe('aggregateByLayer', () => {
  it('lands a single fresh soil sample at corroborated', () => {
    const obs: RawObservation[] = [{ topic: 'soil-sample', observedAt: ASOF }];
    const [soils] = aggregateByLayer(obs, ASOF);
    expect(soils?.layerType).toBe('soils');
    expect(soils?.level).toBe('corroborated');
    expect(soils?.observationCount).toBe(1);
    expect(soils?.weight).toBeCloseTo(1, 5);
  });

  it('promotes three recent samples in one area to verified', () => {
    const obs: RawObservation[] = [
      { topic: 'soil-sample', observedAt: ASOF },
      { topic: 'soil-sample', observedAt: yearsBefore(0.25) },
      { topic: 'soil-health', observedAt: yearsBefore(0.5) },
    ];
    const [soils] = aggregateByLayer(obs, ASOF);
    expect(soils?.level).toBe('verified');
    expect(soils?.observationCount).toBe(3);
    expect(soils?.weight).toBeGreaterThanOrEqual(1.5);
  });

  it('decays a 6-year-old lone sample down to unverified', () => {
    const obs: RawObservation[] = [
      { topic: 'soil-sample', observedAt: yearsBefore(6) },
    ];
    const [soils] = aggregateByLayer(obs, ASOF);
    expect(soils?.weight).toBeCloseTo(0.25, 2);
    expect(soils?.level).toBe('unverified');
  });

  it('maps a water-quality observation to both hydrology layers', () => {
    const obs: RawObservation[] = [{ topic: 'water-quality', observedAt: ASOF }];
    const result = aggregateByLayer(obs, ASOF);
    const layers = result.map((r) => r.layerType).sort();
    expect(layers).toEqual(['watershed', 'wetlands_flood']);
  });

  it('omits layers with no contributing observation', () => {
    const obs: RawObservation[] = [{ topic: 'general', observedAt: ASOF }];
    expect(aggregateByLayer(obs, ASOF)).toEqual([]);
  });

  it('tracks the most-recent contributing date as lastObservedAt', () => {
    const recent = yearsBefore(0.1);
    const obs: RawObservation[] = [
      { topic: 'soil-sample', observedAt: yearsBefore(4) },
      { topic: 'soil-sample', observedAt: recent },
    ];
    const [soils] = aggregateByLayer(obs, ASOF);
    expect(soils?.lastObservedAt).toBe(new Date(recent).toISOString());
  });
});
