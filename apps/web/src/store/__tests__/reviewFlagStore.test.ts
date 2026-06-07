// @vitest-environment happy-dom
/**
 * reviewFlagStore - immutable-append + dedup + lifecycle (T1.4).
 *
 * Tests are written first (TDD). The store does NOT exist yet; this file
 * should fail with "module not found" or "actions undefined" initially.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useReviewFlagStore,
  useReviewFlagsForObjective,
  useReviewFlagCountsByObjective,
} from '../reviewFlagStore.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FLAG_DEFAULTS = {
  projectId: 'proj-1',
  objectiveId: 'obj-A',
  sourceTemplateId: 'tmpl-X',
  sourceActivationIds: ['act-1'],
  observedCount: 3,
  deviationSign: 'under' as const,
  depth: 'threshold' as const,
  direction: 'tighten' as const,
  reason: 'observed fewer than expected',
  window: { season: 'summer' as const, cycleNumber: 1 },
};

function reset(): void {
  useReviewFlagStore.setState({ byProject: {} });
  window.localStorage.clear();
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('reviewFlagStore - raiseFlag append', () => {
  beforeEach(() => reset());

  it('appends a new flag to the right project bucket', () => {
    const { raiseFlag } = useReviewFlagStore.getState();
    raiseFlag({ ...FLAG_DEFAULTS, id: 'flag-1', raisedAt: '2026-06-01T00:00:00.000Z' });

    const state = useReviewFlagStore.getState();
    const flags = state.byProject['proj-1'];
    expect(flags).toHaveLength(1);
    expect(flags?.[0]?.id).toBe('flag-1');
    expect(flags?.[0]?.projectId).toBe('proj-1');
    expect(flags?.[0]?.objectiveId).toBe('obj-A');
    expect(flags?.[0]?.observedCount).toBe(3);
  });

  it('defaults id via crypto.randomUUID when not supplied', () => {
    const { raiseFlag } = useReviewFlagStore.getState();
    raiseFlag({ ...FLAG_DEFAULTS });

    const flags = useReviewFlagStore.getState().byProject['proj-1'];
    expect(typeof flags?.[0]?.id).toBe('string');
    expect(flags?.[0]?.id.length).toBeGreaterThan(0);
  });

  it('defaults raisedAt to ISO string when not supplied', () => {
    const { raiseFlag } = useReviewFlagStore.getState();
    raiseFlag({ ...FLAG_DEFAULTS });

    const flags = useReviewFlagStore.getState().byProject['proj-1'];
    expect(typeof flags?.[0]?.raisedAt).toBe('string');
    expect(flags?.[0]?.raisedAt.length).toBeGreaterThan(0);
  });
});

describe('reviewFlagStore - dedup (same objectiveId + sourceTemplateId + direction)', () => {
  beforeEach(() => reset());

  it('increments observedCount and appends sourceActivationIds on duplicate open flag', () => {
    const { raiseFlag } = useReviewFlagStore.getState();
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'flag-1',
      raisedAt: '2026-06-01T00:00:00.000Z',
      observedCount: 2,
      sourceActivationIds: ['act-1'],
      window: { season: 'summer' as const, cycleNumber: 1 },
    });
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'flag-2',
      raisedAt: '2026-06-02T00:00:00.000Z',
      observedCount: 1,
      sourceActivationIds: ['act-2'],
      window: { season: 'autumn' as const, cycleNumber: 2 },
    });

    const flags = useReviewFlagStore.getState().byProject['proj-1'];
    // Must NOT add a new row
    expect(flags).toHaveLength(1);
    // observedCount incremented
    expect(flags?.[0]?.observedCount).toBe(3);
    // sourceActivationIds: existing first, then new
    expect(flags?.[0]?.sourceActivationIds).toEqual(['act-1', 'act-2']);
    // window refreshed to the second input's window
    expect(flags?.[0]?.window).toEqual({ season: 'autumn', cycleNumber: 2 });
    // id preserved (original row)
    expect(flags?.[0]?.id).toBe('flag-1');
  });

  it('adds a NEW row when direction differs', () => {
    const { raiseFlag } = useReviewFlagStore.getState();
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'flag-1',
      raisedAt: '2026-06-01T00:00:00.000Z',
      direction: 'tighten',
    });
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'flag-2',
      raisedAt: '2026-06-02T00:00:00.000Z',
      direction: 'loosen',
    });

    const flags = useReviewFlagStore.getState().byProject['proj-1'];
    expect(flags).toHaveLength(2);
  });

  it('adds a NEW row when the matching flag is already resolved (not open)', () => {
    const { raiseFlag, resolveFlag } = useReviewFlagStore.getState();
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'flag-1',
      raisedAt: '2026-06-01T00:00:00.000Z',
    });
    resolveFlag('proj-1', 'flag-1');

    // Now raise again with same triple
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'flag-2',
      raisedAt: '2026-06-02T00:00:00.000Z',
    });

    const flags = useReviewFlagStore.getState().byProject['proj-1'];
    expect(flags).toHaveLength(2);
    expect(flags?.[1]?.id).toBe('flag-2');
  });

  it('re-opens a dismissed flag (worsening) when new cumulative count > dismissedAtCount', () => {
    // T1.9: dismissed-but-worsening replaces the old "adds a NEW row" behavior.
    // FLAG_DEFAULTS.observedCount = 3; dismiss at 3; re-raise with count 3
    // => cumulative 6 > 3 => re-open (1 flag, depth bumped), NOT a new row.
    const { raiseFlag, dismissFlag } = useReviewFlagStore.getState();
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'flag-1',
      raisedAt: '2026-06-01T00:00:00.000Z',
    });
    dismissFlag('proj-1', 'flag-1');

    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'flag-2',
      raisedAt: '2026-06-02T00:00:00.000Z',
    });

    const flags = useReviewFlagStore.getState().byProject['proj-1'];
    // Re-opened in-place (not a new row) because cumulative (3+3=6) > dismissedAtCount (3).
    expect(flags).toHaveLength(1);
    expect(flags?.[0]?.dismissedAt).toBeUndefined();
  });

  it('adds a NEW row when the matching flag is dormant (not open)', () => {
    const { raiseFlag } = useReviewFlagStore.getState();
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'flag-1',
      raisedAt: '2026-06-01T00:00:00.000Z',
      dormantSince: '2026-05-01T00:00:00.000Z',
    });

    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'flag-2',
      raisedAt: '2026-06-02T00:00:00.000Z',
    });

    const flags = useReviewFlagStore.getState().byProject['proj-1'];
    expect(flags).toHaveLength(2);
  });
});

describe('reviewFlagStore - lifecycle stamps', () => {
  beforeEach(() => reset());

  it('resolveFlag stamps resolvedAt', () => {
    const { raiseFlag, resolveFlag } = useReviewFlagStore.getState();
    raiseFlag({ ...FLAG_DEFAULTS, id: 'flag-1', raisedAt: '2026-06-01T00:00:00.000Z' });
    resolveFlag('proj-1', 'flag-1');

    const flag = useReviewFlagStore.getState().byProject['proj-1']?.[0];
    expect(flag?.resolvedAt).toBeDefined();
    expect(typeof flag?.resolvedAt).toBe('string');
  });

  it('resolveFlag with parameterDelta sets resolutionParameterDelta', () => {
    const { raiseFlag, resolveFlag } = useReviewFlagStore.getState();
    raiseFlag({ ...FLAG_DEFAULTS, id: 'flag-1', raisedAt: '2026-06-01T00:00:00.000Z' });
    resolveFlag('proj-1', 'flag-1', { itemId: 'param-1', from: '5', to: '3' });

    const flag = useReviewFlagStore.getState().byProject['proj-1']?.[0];
    expect(flag?.resolutionParameterDelta).toEqual({ itemId: 'param-1', from: '5', to: '3' });
  });

  it('dismissFlag stamps dismissedAt AND dismissedAtCount = flag.observedCount', () => {
    const { raiseFlag, dismissFlag } = useReviewFlagStore.getState();
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'flag-1',
      raisedAt: '2026-06-01T00:00:00.000Z',
      observedCount: 7,
    });
    dismissFlag('proj-1', 'flag-1');

    const flag = useReviewFlagStore.getState().byProject['proj-1']?.[0];
    expect(flag?.dismissedAt).toBeDefined();
    expect(typeof flag?.dismissedAt).toBe('string');
    // dismissedAtCount MUST equal the flag's observedCount at dismissal
    expect(flag?.dismissedAtCount).toBe(7);
  });

  it('acknowledgeFlag stamps acknowledgedAt', () => {
    const { raiseFlag, acknowledgeFlag } = useReviewFlagStore.getState();
    raiseFlag({ ...FLAG_DEFAULTS, id: 'flag-1', raisedAt: '2026-06-01T00:00:00.000Z' });
    acknowledgeFlag('proj-1', 'flag-1');

    const flag = useReviewFlagStore.getState().byProject['proj-1']?.[0];
    expect(flag?.acknowledgedAt).toBeDefined();
    expect(typeof flag?.acknowledgedAt).toBe('string');
  });

  it('lifecycle stamps do NOT mutate the original flag object', () => {
    const { raiseFlag, acknowledgeFlag } = useReviewFlagStore.getState();
    raiseFlag({ ...FLAG_DEFAULTS, id: 'flag-1', raisedAt: '2026-06-01T00:00:00.000Z' });

    const before = useReviewFlagStore.getState().byProject['proj-1']?.[0];
    acknowledgeFlag('proj-1', 'flag-1');
    const after = useReviewFlagStore.getState().byProject['proj-1']?.[0];

    // Should be different objects (immutable update)
    expect(after).not.toBe(before);
    // before object should not have been mutated
    expect(before?.acknowledgedAt).toBeUndefined();
    expect(after?.acknowledgedAt).toBeDefined();
  });
});

describe('reviewFlagStore - hooks', () => {
  beforeEach(() => reset());

  it('useReviewFlagsForObjective returns only flags for that objectiveId', () => {
    const { raiseFlag } = useReviewFlagStore.getState();
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'flag-obj-A',
      raisedAt: '2026-06-01T00:00:00.000Z',
      objectiveId: 'obj-A',
    });
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'flag-obj-B',
      raisedAt: '2026-06-01T00:00:00.000Z',
      objectiveId: 'obj-B',
      direction: 'loosen', // different triple to avoid dedup with obj-A flag
    });

    const { result } = renderHook(() =>
      useReviewFlagsForObjective('proj-1', 'obj-A'),
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0]?.id).toBe('flag-obj-A');
  });

  it('useReviewFlagsForObjective returns stable empty array when projectId is null', () => {
    const { result: r1 } = renderHook(() => useReviewFlagsForObjective(null, 'obj-A'));
    const { result: r2 } = renderHook(() => useReviewFlagsForObjective(null, 'obj-A'));
    expect(r1.current).toHaveLength(0);
    // Same stable reference (module-level EMPTY constant)
    expect(r1.current).toBe(r2.current);
  });

  it('useReviewFlagCountsByObjective counts only OPEN flags', () => {
    const { raiseFlag, resolveFlag } = useReviewFlagStore.getState();
    // Open flag for obj-A
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'flag-open',
      raisedAt: '2026-06-01T00:00:00.000Z',
      objectiveId: 'obj-A',
      direction: 'tighten',
    });
    // Resolved flag for obj-A (should NOT count)
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'flag-resolved',
      raisedAt: '2026-06-01T00:00:00.000Z',
      objectiveId: 'obj-A',
      direction: 'loosen', // different direction = new row
    });
    resolveFlag('proj-1', 'flag-resolved');

    const { result } = renderHook(() =>
      useReviewFlagCountsByObjective('proj-1'),
    );

    expect(result.current['obj-A']).toBe(1);
  });

  it('useReviewFlagCountsByObjective excludes dismissed flags from count', () => {
    const { raiseFlag, dismissFlag } = useReviewFlagStore.getState();
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'flag-dismissed',
      raisedAt: '2026-06-01T00:00:00.000Z',
      objectiveId: 'obj-A',
    });
    dismissFlag('proj-1', 'flag-dismissed');

    const { result } = renderHook(() =>
      useReviewFlagCountsByObjective('proj-1'),
    );

    expect(result.current['obj-A'] ?? 0).toBe(0);
  });

  it('useReviewFlagCountsByObjective returns stable empty object when projectId is null', () => {
    const { result: r1 } = renderHook(() => useReviewFlagCountsByObjective(null));
    const { result: r2 } = renderHook(() => useReviewFlagCountsByObjective(null));
    expect(r1.current).toBe(r2.current);
  });
});
