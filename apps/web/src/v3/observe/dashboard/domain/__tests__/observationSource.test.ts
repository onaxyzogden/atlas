/**
 * Conformance guard for the Observe Domain Detail source classifier.
 *
 * `classifyObservationSource` splits the union view into an Act-vs-baseline
 * provenance taxonomy backing the "All / From Act / Baseline" filter:
 *   - virtual field-log projection (id `feed:...`)              -> 'act'
 *   - direct Act recording (real id + non-null sourceObjectiveId) -> 'act'
 *   - seed/baseline (real id + null sourceObjectiveId)          -> 'baseline'
 * These invariants guard the partition and the filter predicate.
 */

import { describe, expect, it } from 'vitest';
import type { ObserveDataPoint } from '@ogden/shared';
import {
  classifyObservationSource,
  isVirtual,
  matchesSourceFilter,
} from '../observationSource.js';

function makePoint(overrides: Partial<ObserveDataPoint> = {}): ObserveDataPoint {
  return {
    id: 'dp-1',
    projectId: 'proj-1',
    domainId: 'soil',
    sourceType: 'manual_observation',
    sourceActionId: null,
    sourceFeedEntryId: null,
    sourceObjectiveId: null,
    sourceFeatureRef: null,
    locationGeometry: null,
    cycleId: 0,
    isSuperseded: false,
    supersededBy: null,
    statusOutput: 'clear',
    measurementValue: null,
    proofItems: [],
    capturedAt: '2026-05-31T10:00:00.000Z',
    capturedBy: 'tester',
    ...overrides,
  };
}

describe('classifyObservationSource', () => {
  it('classifies a virtual field-log projection as act (regardless of objective id)', () => {
    expect(isVirtual(makePoint({ id: 'feed:fe-1' }))).toBe(true);
    expect(classifyObservationSource(makePoint({ id: 'feed:fe-1' }))).toBe('act');
    expect(
      classifyObservationSource(makePoint({ id: 'feed:fe-1', sourceObjectiveId: null })),
    ).toBe('act');
  });

  it('classifies a direct Act recording (non-null sourceObjectiveId) as act', () => {
    expect(
      classifyObservationSource(makePoint({ sourceObjectiveId: 's2-terrain' })),
    ).toBe('act');
  });

  it('classifies a seed/baseline point (real id, null objective) as baseline', () => {
    expect(classifyObservationSource(makePoint())).toBe('baseline');
  });
});

describe('matchesSourceFilter', () => {
  const mixed: ObserveDataPoint[] = [
    makePoint({ id: 'feed:a' }), // act (virtual)
    makePoint({ id: 'b', sourceObjectiveId: 's2-terrain' }), // act (direct)
    makePoint({ id: 'c' }), // baseline
    makePoint({ id: 'd' }), // baseline
  ];

  it('admits everything under the all filter', () => {
    expect(mixed.every((p) => matchesSourceFilter(p, 'all'))).toBe(true);
  });

  it('partitions act and baseline exactly (each point matches exactly one)', () => {
    for (const p of mixed) {
      const act = matchesSourceFilter(p, 'act');
      const baseline = matchesSourceFilter(p, 'baseline');
      expect(act).not.toBe(baseline);
    }
  });

  it('counts derived over the mixed fixture sum to the total', () => {
    const act = mixed.filter((p) => classifyObservationSource(p) === 'act').length;
    const baseline = mixed.length - act;
    expect(act).toBe(2);
    expect(baseline).toBe(2);
    expect(act + baseline).toBe(mixed.length);
  });
});
