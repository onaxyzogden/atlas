import { describe, expect, it } from 'vitest';
import type { Guild } from '../../../store/polycultureStore.js';
import {
  guildSpecies,
  nicheFill,
  functionalCoveragePct,
  nutrientCycling,
  waterBalancePct,
  compatibilityScore,
  resilienceScore,
  guildAnalytics,
} from '../guildAnalyticsMath.js';

function guild(
  anchorSpeciesId: string,
  members: { speciesId: string; layer: Guild['members'][number]['layer'] }[],
): Guild {
  return {
    id: 'g1',
    projectId: 'p1',
    name: 'Test guild',
    anchorSpeciesId,
    members,
    createdAt: new Date(0).toISOString(),
  };
}

// Clean, multi-niche guild (apple anchor + fertility + accumulator).
const CLEAN = guild('apple', [
  { speciesId: 'clover', layer: 'ground_cover' },
  { speciesId: 'comfrey', layer: 'herbaceous' },
  { speciesId: 'blueberry', layer: 'shrub' },
]);

// Antagonistic guild — black_walnut is catalog-incompatible with apple.
const ANTAGONISTIC = guild('black_walnut', [
  { speciesId: 'apple', layer: 'sub_canopy' },
]);

describe('guildSpecies', () => {
  it('resolves anchor + members from the catalog', () => {
    expect(guildSpecies(CLEAN).length).toBe(4);
  });
  it('drops ids the catalog cannot resolve', () => {
    expect(guildSpecies(guild('not_a_real_id', [])).length).toBe(0);
  });
});

describe('nicheFill', () => {
  it('counts distinct layers out of seven', () => {
    const r = nicheFill(guildSpecies(CLEAN));
    expect(r.total).toBe(7);
    expect(r.filled).toBeGreaterThanOrEqual(3);
  });
});

describe('functionalCoveragePct', () => {
  it('is bounded 0..100', () => {
    const v = functionalCoveragePct(guildSpecies(CLEAN));
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThanOrEqual(100);
  });
  it('is 0 for an empty species set', () => {
    expect(functionalCoveragePct([])).toBe(0);
  });
});

describe('nutrientCycling', () => {
  it('detects nitrogen fixers and dynamic accumulators', () => {
    const nc = nutrientCycling(guildSpecies(CLEAN));
    expect(nc.nFixers).toBeGreaterThanOrEqual(1); // clover
    expect(nc.accumulators).toBeGreaterThanOrEqual(1); // comfrey
    expect(nc.pct).toBeGreaterThan(0);
  });
  it('reports zero for a set with no fertility function', () => {
    const nc = nutrientCycling([]);
    expect(nc.pct).toBe(0);
  });
});

describe('waterBalancePct', () => {
  it('is 100 for a single-species guild', () => {
    expect(waterBalancePct(guildSpecies(guild('apple', [])))).toBe(100);
  });
  it('is bounded 0..100 for a mixed guild', () => {
    const v = waterBalancePct(guildSpecies(CLEAN));
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(100);
  });
  it('is 0 when no water needs are known', () => {
    expect(waterBalancePct([])).toBe(0);
  });
});

describe('compatibilityScore', () => {
  it('flags catalog-incompatible pairs and drops the score', () => {
    const r = compatibilityScore(ANTAGONISTIC);
    expect(r.errors).toBeGreaterThanOrEqual(1);
    expect(r.score).toBeLessThan(100);
  });
  it('scores a non-antagonistic guild higher than an antagonistic one', () => {
    expect(compatibilityScore(CLEAN).score).toBeGreaterThan(
      compatibilityScore(ANTAGONISTIC).score,
    );
  });
});

describe('resilienceScore', () => {
  it('is bounded 0..100', () => {
    const v = resilienceScore(CLEAN);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(100);
  });
  it('rewards a clean diverse guild over an antagonistic sparse one', () => {
    expect(resilienceScore(CLEAN)).toBeGreaterThan(resilienceScore(ANTAGONISTIC));
  });
});

describe('guildAnalytics aggregator', () => {
  it('returns a consistent bundle', () => {
    const a = guildAnalytics(CLEAN);
    expect(a.memberCount).toBe(4);
    expect(a.nicheCount).toBe(7);
    expect(a.resilienceScore).toBeGreaterThanOrEqual(0);
    expect(a.resilienceScore).toBeLessThanOrEqual(100);
    expect(a.compatibility.score).toBeGreaterThanOrEqual(0);
  });
});
