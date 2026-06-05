// coOccurrence.test.ts
//
// Specs for the pure co-occurrence cluster detector (T1).

import { describe, it, expect } from 'vitest';
import type { SeasonName } from '../../../schemas/protocol/protocol.schema.js';
import type {
  ObjectiveReviewFlag,
  FlagDepth,
} from '../../../schemas/protocol/reviewFlag.schema.js';
import {
  detectCoOccurrenceClusters,
  DEPTH_RANK,
  DEPTH_THEME,
} from '../coOccurrence.js';

// ---------------------------------------------------------------------------
// Fixture factory: a minimal valid ObjectiveReviewFlag.
// ---------------------------------------------------------------------------

interface FlagOverrides {
  id?: string;
  objectiveId?: string;
  sourceTemplateId?: string;
  deviationSign?: 'over' | 'under' | 'existential';
  depth?: FlagDepth;
  season?: SeasonName | undefined;
  cycleNumber?: number | undefined;
}

let seq = 0;

function makeFlag(overrides: FlagOverrides = {}): ObjectiveReviewFlag {
  seq += 1;
  const {
    id = `flag-${seq}`,
    objectiveId = 'obj-a',
    sourceTemplateId = 'tmpl-a',
    deviationSign = 'over',
    depth = 'threshold',
  } = overrides;
  // season/cycleNumber must be able to flow through as explicit undefined, so
  // read them via "in" rather than destructuring defaults (which coerce
  // undefined to the default).
  const season: SeasonName | undefined = 'season' in overrides
    ? overrides.season
    : 'spring';
  const cycleNumber: number | undefined = 'cycleNumber' in overrides
    ? overrides.cycleNumber
    : 0;
  return {
    id,
    projectId: 'proj-1',
    objectiveId,
    sourceTemplateId,
    sourceActivationIds: [],
    observedCount: 1,
    window: { season, cycleNumber },
    deviationSign,
    depth,
    direction: 'tighten',
    reason: 'test fixture',
    raisedAt: '2026-06-01T00:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// Specs
// ---------------------------------------------------------------------------

describe('detectCoOccurrenceClusters', () => {
  it('clusters two distinct templates in the same cycle and season', () => {
    const clusters = detectCoOccurrenceClusters([
      makeFlag({ sourceTemplateId: 'tmpl-a', cycleNumber: 1, season: 'spring' }),
      makeFlag({ sourceTemplateId: 'tmpl-b', cycleNumber: 1, season: 'spring' }),
    ]);
    expect(clusters).toHaveLength(1);
    const cluster = clusters[0]!;
    expect(cluster.templateIds.length).toBe(2);
    expect(cluster.templateIds).toContain('tmpl-a');
    expect(cluster.templateIds).toContain('tmpl-b');
  });

  it('does not cluster two flags from the same template', () => {
    const clusters = detectCoOccurrenceClusters([
      makeFlag({ id: 'f1', sourceTemplateId: 'tmpl-a', cycleNumber: 1 }),
      makeFlag({ id: 'f2', sourceTemplateId: 'tmpl-a', cycleNumber: 1 }),
    ]);
    expect(clusters).toEqual([]);
  });

  it('does not cluster distinct templates in different cycles', () => {
    const clusters = detectCoOccurrenceClusters([
      makeFlag({ sourceTemplateId: 'tmpl-a', cycleNumber: 1 }),
      makeFlag({ sourceTemplateId: 'tmpl-b', cycleNumber: 2 }),
    ]);
    expect(clusters).toEqual([]);
  });

  it('excludes flags with undefined cycleNumber even when season matches', () => {
    const clusters = detectCoOccurrenceClusters([
      makeFlag({
        sourceTemplateId: 'tmpl-a',
        cycleNumber: undefined,
        season: undefined,
      }),
      makeFlag({
        sourceTemplateId: 'tmpl-b',
        cycleNumber: undefined,
        season: undefined,
      }),
    ]);
    expect(clusters).toEqual([]);
  });

  it('picks the deepest depth as dominantDepth', () => {
    const clusters = detectCoOccurrenceClusters([
      makeFlag({ sourceTemplateId: 'tmpl-a', depth: 'threshold', cycleNumber: 1 }),
      makeFlag({ sourceTemplateId: 'tmpl-b', depth: 'water', cycleNumber: 1 }),
    ]);
    expect(clusters).toHaveLength(1);
    const cluster = clusters[0]!;
    expect(cluster.dominantDepth).toBe('water');
    expect(cluster.theme).toBe(DEPTH_THEME.water);
    expect(cluster.theme).toBe('Water strategy');
  });

  it('flags existential clusters and sorts them first', () => {
    const clusters = detectCoOccurrenceClusters([
      // Non-existential cluster in cycle 2.
      makeFlag({ sourceTemplateId: 'tmpl-c', depth: 'soil', cycleNumber: 2 }),
      makeFlag({ sourceTemplateId: 'tmpl-d', depth: 'soil', cycleNumber: 2 }),
      // Existential cluster in cycle 1.
      makeFlag({
        sourceTemplateId: 'tmpl-a',
        deviationSign: 'existential',
        depth: 'threshold',
        cycleNumber: 1,
      }),
      makeFlag({ sourceTemplateId: 'tmpl-b', depth: 'threshold', cycleNumber: 1 }),
    ]);
    expect(clusters).toHaveLength(2);
    const first = clusters[0]!;
    expect(first.containsExistential).toBe(true);
    expect(first.summary.startsWith(
      'Animal welfare implicated (ihsan): a carrying-capacity assumption may have cost stock. '
    )).toBe(true);
    expect(clusters[1]!.containsExistential).toBe(false);
    expect(first.weight).toBeGreaterThan(clusters[1]!.weight);
  });

  it('returns [] for empty input', () => {
    expect(detectCoOccurrenceClusters([])).toEqual([]);
  });

  it('returns [] for a single-flag input', () => {
    expect(
      detectCoOccurrenceClusters([makeFlag({ cycleNumber: 1 })])
    ).toEqual([]);
  });

  it('exposes DEPTH_RANK ordering threshold..structural', () => {
    const ranks: FlagDepth[] = ['threshold', 'soil', 'water', 'zones', 'structural'];
    ranks.forEach((depth, idx) => {
      expect(DEPTH_RANK[depth]).toBe(idx);
    });
  });
});
