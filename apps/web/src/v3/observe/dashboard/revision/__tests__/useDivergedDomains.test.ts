/**
 * @vitest-environment happy-dom
 *
 * useDivergedDomains — the single source of the Observe "diverged domains"
 * signal, extracted from usePlanRevisionFlagSync so the same derivation can
 * feed both the cyclical-review trigger (original consumer) and the
 * Operational Role Layer's always-surface engine (Phase 4 shared-resource
 * divergence channel).
 *
 * Contract under test:
 *  - a domain is "diverged" when it has ≥1 ACTIVE diverged ObserveDataPoint
 *    (`!isSuperseded` AND statusOutput ∈ {needs_investigation,
 *    major_constraint, potential_disqualifier}),
 *  - OR ≥1 diverged ObserveFeedEntry (`sourceType === 'diverged'`) whose
 *    feedKey (objective id) projects to a domain,
 *  - superseded points, non-divergent statuses, and verified feed entries
 *    are ignored,
 *  - the two sources union and dedup,
 *  - an undefined projectId yields an empty result.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';

import { useDivergedDomains } from '../useDivergedDomains';
import { useObserveDataPointStore } from '../../../../../store/observeDataPointStore.js';
import { useObserveFeedStore } from '../../../../../store/observeFeedStore.js';

const PROJECT = 'proj-divergence';

// feedKey -> domain mappings used below (resolved via resolveDomainByObjectiveId):
//   s5-water-strategy -> 'hydrology'
//   s2-land-baseline  -> 'topography'

function seedPoints(
  points: Array<{
    domainId: string;
    isSuperseded?: boolean;
    statusOutput: string;
  }>,
): void {
  useObserveDataPointStore.getState().setProjectPoints(
    PROJECT,
    points.map((p) => ({ isSuperseded: false, ...p }) as never),
  );
}

function seedFeed(
  entries: Array<{ feedKey: string; sourceType: 'verified' | 'diverged' }>,
): void {
  entries.forEach((entry, i) => {
    useObserveFeedStore.getState().appendObservation({
      id: `feed-${i}`,
      projectId: PROJECT,
      feedKey: entry.feedKey,
      sourceType: entry.sourceType,
      sourceActionId: `action-${i}`,
      sourceActionTitle: 'seed',
      proofItems: [],
      capturedAt: '2026-06-24T00:00:00.000Z',
    } as never);
  });
}

beforeEach(() => {
  useObserveDataPointStore.getState().clearForProject(PROJECT);
  useObserveFeedStore.getState().clearForProject(PROJECT);
});
afterEach(() => cleanup());

describe('useDivergedDomains', () => {
  it('returns empty when the project has no observe data', () => {
    const { result } = renderHook(() => useDivergedDomains(PROJECT));
    expect(result.current).toEqual([]);
  });

  it('surfaces a domain with an active diverged data point', () => {
    seedPoints([{ domainId: 'soil', statusOutput: 'major_constraint' }]);
    const { result } = renderHook(() => useDivergedDomains(PROJECT));
    expect(result.current).toEqual(['soil']);
  });

  it('ignores a superseded diverged data point', () => {
    seedPoints([
      { domainId: 'soil', isSuperseded: true, statusOutput: 'major_constraint' },
    ]);
    const { result } = renderHook(() => useDivergedDomains(PROJECT));
    expect(result.current).toEqual([]);
  });

  it('ignores a data point whose status is not divergent', () => {
    seedPoints([{ domainId: 'soil', statusOutput: 'clear' }]);
    const { result } = renderHook(() => useDivergedDomains(PROJECT));
    expect(result.current).toEqual([]);
  });

  it('surfaces a domain from a diverged feed entry', () => {
    seedFeed([{ feedKey: 's5-water-strategy', sourceType: 'diverged' }]);
    const { result } = renderHook(() => useDivergedDomains(PROJECT));
    expect(result.current).toEqual(['hydrology']);
  });

  it('ignores a verified feed entry', () => {
    seedFeed([{ feedKey: 's5-water-strategy', sourceType: 'verified' }]);
    const { result } = renderHook(() => useDivergedDomains(PROJECT));
    expect(result.current).toEqual([]);
  });

  it('unions distinct domains from both sources', () => {
    seedPoints([{ domainId: 'soil', statusOutput: 'needs_investigation' }]);
    seedFeed([{ feedKey: 's2-land-baseline', sourceType: 'diverged' }]);
    const { result } = renderHook(() => useDivergedDomains(PROJECT));
    expect([...result.current].sort()).toEqual(['soil', 'topography']);
  });

  it('dedups a domain reported by both a data point and a feed entry', () => {
    seedPoints([{ domainId: 'hydrology', statusOutput: 'major_constraint' }]);
    seedFeed([{ feedKey: 's5-water-strategy', sourceType: 'diverged' }]);
    const { result } = renderHook(() => useDivergedDomains(PROJECT));
    expect(result.current).toEqual(['hydrology']);
  });

  it('returns empty for an undefined projectId', () => {
    const { result } = renderHook(() => useDivergedDomains(undefined));
    expect(result.current).toEqual([]);
  });
});
