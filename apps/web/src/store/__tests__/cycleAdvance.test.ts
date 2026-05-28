// @vitest-environment happy-dom
/**
 * cycleAdvance — Phase 4 Slice 4.5 helper that bridges Plan tier objective
 * acknowledgements to per-domain cycle advances in `observeCycleStore`.
 *
 * Locks down:
 *   - Multi-domain objectives advance every domain in
 *     `resolveAllDomainsForObjective(...)`.
 *   - Single-domain objectives advance exactly the override domain.
 *   - Unknown objective ids are tolerated silently.
 *   - The supplied `advancedAt` timestamp is propagated to every domain
 *     advance so a single review is timestamp-consistent across the chart.
 *   - `planObjectiveId` is recorded on every advance for cycle annotations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { cycleAdvance } from '../cycleAdvance.js';
import { useObserveCycleStore } from '../observeCycleStore.js';

function reset(): void {
  useObserveCycleStore.setState({ byProject: {} });
}

describe('cycleAdvance', () => {
  beforeEach(reset);

  it('advances exactly one domain for a single-domain objective (t0-vision)', () => {
    const result = cycleAdvance('p1', 't0-vision', 'plan_revision_confirmed', {
      advancedAt: '2026-05-28T10:00:00.000Z',
    });
    expect(result).toEqual([{ domainId: 'vision-intent', cycleId: 1 }]);
    expect(
      useObserveCycleStore
        .getState()
        .getCurrentCycle('p1', 'vision-intent'),
    ).toBe(1);
  });

  it('advances every domain for a multi-domain objective (t1-land-baseline)', () => {
    const result = cycleAdvance(
      'p1',
      't1-land-baseline',
      'plan_revision_revised',
      { advancedAt: '2026-05-28T10:00:00.000Z' },
    );
    expect(result.map((r) => r.domainId).sort()).toEqual(
      ['climate', 'ecology', 'hydrology', 'land-base', 'soil', 'topography'],
    );
    for (const { domainId, cycleId } of result) {
      expect(cycleId).toBe(1);
      expect(
        useObserveCycleStore.getState().getCurrentCycle('p1', domainId),
      ).toBe(1);
    }
  });

  it('returns an empty array for an unknown objective id (no advance)', () => {
    const result = cycleAdvance(
      'p1',
      'unknown-objective-id',
      'plan_revision_confirmed',
      { advancedAt: '2026-05-28T10:00:00.000Z' },
    );
    expect(result).toEqual([]);
    expect(useObserveCycleStore.getState().byProject).toEqual({});
  });

  it('threads advancedAt into each per-domain history entry', () => {
    const advancedAt = '2026-05-28T10:00:00.000Z';
    cycleAdvance('p1', 't1-land-baseline', 'plan_revision_confirmed', {
      advancedAt,
    });
    const soilHist = useObserveCycleStore.getState().getHistory('p1', 'soil');
    const hydroHist = useObserveCycleStore
      .getState()
      .getHistory('p1', 'hydrology');
    expect(soilHist[0]?.advancedAt).toBe(advancedAt);
    expect(hydroHist[0]?.advancedAt).toBe(advancedAt);
  });

  it('records planObjectiveId on every advance for cycle annotations', () => {
    cycleAdvance('p1', 't1-land-baseline', 'plan_revision_confirmed', {
      advancedAt: '2026-05-28T10:00:00.000Z',
    });
    const soilHist = useObserveCycleStore.getState().getHistory('p1', 'soil');
    expect(soilHist[0]).toMatchObject({
      planObjectiveId: 't1-land-baseline',
      reason: 'plan_revision_confirmed',
    });
  });

  it('repeated calls produce monotonically increasing cycleIds per domain', () => {
    const first = cycleAdvance(
      'p1',
      't0-vision',
      'plan_revision_confirmed',
      { advancedAt: '2026-05-28T10:00:00.000Z' },
    );
    const second = cycleAdvance(
      'p1',
      't0-vision',
      'plan_revision_revised',
      { advancedAt: '2026-05-28T11:00:00.000Z' },
    );
    expect(first[0]?.cycleId).toBe(1);
    expect(second[0]?.cycleId).toBe(2);
  });
});
