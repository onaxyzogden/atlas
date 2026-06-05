// @vitest-environment happy-dom
/**
 * planStratumStore - §10.1 parameter-value slice tests (Phase C2).
 *
 * Covers the parallel `valuesByProject` slice that captures steward-entered
 * operating thresholds (the protocol token source), kept separate from
 * checklist completion so the status engine (`toProgressMap`) is untouched:
 *   - setParameterValue / getParameterValues round-trip (incl. overwrite,
 *     clear-to-empty, project/objective isolation)
 *   - selectParameterValues stable frozen-empty default
 *   - v4 -> v5 migration backfills `valuesByProject: {}` while preserving
 *     existing byProject / celebrated / deferred state
 *   - the completion path (byProject) is unaffected by parameter writes
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  usePlanStratumProgressStore,
  migratePlanStratumProgress,
  selectParameterValues,
} from '../planStratumStore.js';

const PERSIST_KEY = 'ogden-plan-tier-progress';

function reset(): void {
  usePlanStratumProgressStore.setState({
    byProject: {},
    celebratedByProject: {},
    deferredByProject: {},
    valuesByProject: {},
  });
  window.localStorage.clear();
}

describe('planStratumStore - parameter values round-trip', () => {
  beforeEach(() => reset());

  it('sets and reads a single parameter value', () => {
    const s = usePlanStratumProgressStore.getState();
    s.setParameterValue('proj-A', 's6-yield-flows', 'param-cover', '1500');
    expect(
      usePlanStratumProgressStore
        .getState()
        .getParameterValues('proj-A', 's6-yield-flows'),
    ).toEqual({ 'param-cover': '1500' });
  });

  it('merges multiple values for the same objective and overwrites in place', () => {
    const s = usePlanStratumProgressStore.getState();
    s.setParameterValue('proj-A', 's6-yield-flows', 'param-cover', '1500');
    s.setParameterValue('proj-A', 's6-yield-flows', 'param-days', '3');
    s.setParameterValue('proj-A', 's6-yield-flows', 'param-cover', '1600');
    expect(
      usePlanStratumProgressStore
        .getState()
        .getParameterValues('proj-A', 's6-yield-flows'),
    ).toEqual({ 'param-cover': '1600', 'param-days': '3' });
  });

  it('stores an empty string verbatim (clear-to-blank)', () => {
    const s = usePlanStratumProgressStore.getState();
    s.setParameterValue('proj-A', 's6-yield-flows', 'param-cover', '1500');
    s.setParameterValue('proj-A', 's6-yield-flows', 'param-cover', '');
    expect(
      usePlanStratumProgressStore
        .getState()
        .getParameterValues('proj-A', 's6-yield-flows'),
    ).toEqual({ 'param-cover': '' });
  });

  it('isolates values by project and by objective', () => {
    const s = usePlanStratumProgressStore.getState();
    s.setParameterValue('proj-A', 's6-yield-flows', 'param-cover', '1500');
    s.setParameterValue('proj-B', 's6-yield-flows', 'param-cover', '900');
    s.setParameterValue('proj-A', 's5-water-strategy', 'param-x', '7');
    const live = usePlanStratumProgressStore.getState();
    expect(live.getParameterValues('proj-A', 's6-yield-flows')).toEqual({
      'param-cover': '1500',
    });
    expect(live.getParameterValues('proj-B', 's6-yield-flows')).toEqual({
      'param-cover': '900',
    });
    expect(live.getParameterValues('proj-A', 's5-water-strategy')).toEqual({
      'param-x': '7',
    });
  });

  it('returns a stable frozen empty default for an unknown objective', () => {
    const empty = usePlanStratumProgressStore
      .getState()
      .getParameterValues('nope', 'nope');
    expect(empty).toEqual({});
    expect(Object.isFrozen(empty)).toBe(true);
    // selector accessor returns the same stable identity
    const a = selectParameterValues(
      usePlanStratumProgressStore.getState(),
      'nope',
      'nope',
    );
    const b = selectParameterValues(
      usePlanStratumProgressStore.getState(),
      'other',
      'other',
    );
    expect(a).toBe(b);
  });

  it('does not touch checklist completion (byProject) when writing values', () => {
    const s = usePlanStratumProgressStore.getState();
    s.setItemComplete('proj-A', 's6-yield-flows', 's6-yield-flows-c1');
    s.setParameterValue('proj-A', 's6-yield-flows', 'param-cover', '1500');
    const live = usePlanStratumProgressStore.getState();
    expect(live.getCompletedItemIds('proj-A', 's6-yield-flows')).toEqual([
      's6-yield-flows-c1',
    ]);
    expect(live.getParameterValues('proj-A', 's6-yield-flows')).toEqual({
      'param-cover': '1500',
    });
  });
});

describe('migratePlanStratumProgress (v4 -> v5): valuesByProject backfill', () => {
  it('backfills valuesByProject ({}) and preserves prior state', () => {
    const v4 = {
      byProject: { p: { 's1-vision': ['s1-vision-c1'] } },
      celebratedByProject: { p: ['s1-project-foundation'] },
      deferredByProject: { p: ['s2-land-baseline'] },
    };
    const out = migratePlanStratumProgress(v4, 4) as unknown as {
      byProject: Record<string, Record<string, string[]>>;
      celebratedByProject: Record<string, string[]>;
      deferredByProject: Record<string, string[]>;
      valuesByProject: Record<string, unknown>;
    };
    expect(out.valuesByProject).toEqual({});
    expect(out.byProject.p!['s1-vision']).toEqual(['s1-vision-c1']);
    expect(out.celebratedByProject.p).toEqual(['s1-project-foundation']);
    expect(out.deferredByProject.p).toEqual(['s2-land-baseline']);
  });

  it('preserves an already-present valuesByProject on v5+ input', () => {
    const v5 = {
      byProject: {},
      celebratedByProject: {},
      deferredByProject: {},
      valuesByProject: { p: { 's6-yield-flows': { 'param-cover': '1500' } } },
    };
    const out = migratePlanStratumProgress(v5, 5) as unknown as {
      valuesByProject: Record<string, Record<string, Record<string, string>>>;
    };
    expect(out.valuesByProject.p!['s6-yield-flows']).toEqual({
      'param-cover': '1500',
    });
  });
});

describe('planStratumStore persist lifecycle: v4 blob -> rehydrate v5', () => {
  beforeEach(() => reset());

  it('rehydrates a v4 blob, backfilling values while keeping progress', async () => {
    window.localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({
        state: {
          byProject: { 'proj-A': { 's1-vision': ['s1-vision-c1'] } },
          celebratedByProject: { 'proj-A': ['s1-project-foundation'] },
          deferredByProject: {},
        },
        version: 4,
      }),
    );

    await usePlanStratumProgressStore.persist.rehydrate();

    const s = usePlanStratumProgressStore.getState();
    expect(s.getCompletedItemIds('proj-A', 's1-vision')).toEqual([
      's1-vision-c1',
    ]);
    expect(s.getParameterValues('proj-A', 's6-yield-flows')).toEqual({});
    // and the slice is now writable post-rehydrate
    s.setParameterValue('proj-A', 's6-yield-flows', 'param-cover', '1500');
    expect(
      usePlanStratumProgressStore
        .getState()
        .getParameterValues('proj-A', 's6-yield-flows'),
    ).toEqual({ 'param-cover': '1500' });
  });
});
