/**
 * @vitest-environment happy-dom
 *
 * useObserveGapObjectives (Plan Nav v1.1 Part E). Contract:
 *  - re-derives the project's persistent observe-gap objectives (shared rule),
 *  - maps each to its primary Observe domain,
 *  - reports a gap as OPEN only while its domain has NO active data point,
 *  - clears the gap once an active data point exists for that domain.
 *
 * The shared gap predicate is unit-tested separately; here we mock the resolved
 * objective set (current catalogues carry no real gap data) so we can exercise
 * THIS hook's own logic: domain mapping, grouping, and the data-cleared filter.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import type { PlanStratumObjective } from '@ogden/shared';

const h = vi.hoisted(() => ({
  objectives: [] as PlanStratumObjective[],
}));

vi.mock('../../../../plan/strata/useProjectObjectives.js', () => ({
  useProjectObjectives: () => ({
    objectives: h.objectives,
    activeTensions: [],
    provenance: null,
    source: 'record' as const,
  }),
}));

import { useObserveGapObjectives } from '../useObserveGapObjectives';
import { useObserveDataPointStore } from '../../../../../store/observeDataPointStore.js';

// Two synthetic gap objectives (observation-record output => always a gap).
// Ids are chosen so getPrimaryDomainForObjective maps them to distinct domains:
//   s2-land-baseline -> 'topography' (override list, first entry)
//   s5-water-strategy -> 'hydrology'
const gapObjective = (
  id: string,
  stratumId: string,
): PlanStratumObjective =>
  ({
    id,
    stratumId,
    title: id,
    focusedQuestion: 'q',
    prerequisiteObjectiveIds: [],
    defaultOverlayBundle: [],
    checklist: [],
    decisionGroups: [],
    outputKind: 'observation-record',
    source: 'universal',
    ref: 'U-X',
    completionGate: 'gate',
    actHandoff: 'handoff',
  }) as unknown as PlanStratumObjective;

const PROJECT = 'proj-e';

function seedDomainPoint(domainId: string, isSuperseded = false): void {
  const existing =
    useObserveDataPointStore.getState().byProject[PROJECT] ?? [];
  useObserveDataPointStore.getState().setProjectPoints(PROJECT, [
    ...existing,
    { domainId, isSuperseded } as never,
  ]);
}

beforeEach(() => {
  h.objectives = [];
  useObserveDataPointStore.getState().clearForProject(PROJECT);
});
afterEach(() => cleanup());

describe('useObserveGapObjectives', () => {
  it('returns empty when there are no gap objectives', () => {
    h.objectives = [];
    const { result } = renderHook(() => useObserveGapObjectives(PROJECT));
    expect(result.current.openObjectiveIds).toEqual([]);
    expect(result.current.domains).toEqual([]);
  });

  it('reports an OPEN gap when the mapped domain has no data', () => {
    h.objectives = [gapObjective('s2-land-baseline', 's2-land-reading')];
    const { result } = renderHook(() => useObserveGapObjectives(PROJECT));
    expect(result.current.openObjectiveIds).toEqual(['s2-land-baseline']);
    expect(result.current.domains).toEqual([
      { domainId: 'topography', objectiveIds: ['s2-land-baseline'] },
    ]);
  });

  it('clears the gap once an active data point exists for the domain', () => {
    h.objectives = [gapObjective('s2-land-baseline', 's2-land-reading')];
    seedDomainPoint('topography');
    const { result } = renderHook(() => useObserveGapObjectives(PROJECT));
    expect(result.current.openObjectiveIds).toEqual([]);
    expect(result.current.domains).toEqual([]);
  });

  it('keeps the gap open when only a SUPERSEDED point exists for the domain', () => {
    h.objectives = [gapObjective('s2-land-baseline', 's2-land-reading')];
    seedDomainPoint('topography', true);
    const { result } = renderHook(() => useObserveGapObjectives(PROJECT));
    expect(result.current.openObjectiveIds).toEqual(['s2-land-baseline']);
  });

  it('groups multiple open gaps by their distinct domains', () => {
    h.objectives = [
      gapObjective('s2-land-baseline', 's2-land-reading'),
      gapObjective('s5-water-strategy', 's5-system-design'),
    ];
    const { result } = renderHook(() => useObserveGapObjectives(PROJECT));
    expect(result.current.openObjectiveIds.sort()).toEqual([
      's2-land-baseline',
      's5-water-strategy',
    ]);
    const domainIds = result.current.domains.map((d) => d.domainId).sort();
    expect(domainIds).toEqual(['hydrology', 'topography']);
  });

  it('clears only the domain that gained data, leaving the other open', () => {
    h.objectives = [
      gapObjective('s2-land-baseline', 's2-land-reading'),
      gapObjective('s5-water-strategy', 's5-system-design'),
    ];
    seedDomainPoint('hydrology');
    const { result } = renderHook(() => useObserveGapObjectives(PROJECT));
    expect(result.current.openObjectiveIds).toEqual(['s2-land-baseline']);
    expect(result.current.domains).toEqual([
      { domainId: 'topography', objectiveIds: ['s2-land-baseline'] },
    ]);
  });
});
