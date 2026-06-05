// @vitest-environment happy-dom
/**
 * reviewFlagStore -- auto-dormancy + dismissed-but-worsening (T1.9).
 *
 * Sub-feature 2: Auto-dormancy computed on read.
 *   - isFlagDormantByWindow pure helper exported from reviewFlagStore.
 *   - useReviewFlagsForObjective excludes dormant flags.
 *   - useReviewFlagCountsByObjective excludes dormant flags from counts.
 *   - A re-raise (dedup bump + window refresh) makes a dormant flag live again.
 *   - Missing bucket data => NOT dormant.
 *
 * Sub-feature 3: Dismissed-but-worsening re-surface.
 *   - raiseFlag on a dismissed flag whose new cumulative observedCount > dismissedAtCount
 *     re-opens it (clears dismissedAt) and bumps depth one step.
 *   - raiseFlag on a dismissed flag that does NOT exceed dismissedAtCount leaves it dismissed.
 *   - Depth clamps at 'structural'.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useReviewFlagStore,
  useReviewFlagsForObjective,
  useReviewFlagCountsByObjective,
  isFlagDormantByWindow,
} from '../reviewFlagStore.js';
import type { ObjectiveReviewFlag } from '@ogden/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FLAG_DEFAULTS: Omit<ObjectiveReviewFlag, 'id' | 'raisedAt'> = {
  projectId: 'proj-dormancy',
  objectiveId: 'obj-A',
  sourceTemplateId: 'tmpl-X',
  sourceActivationIds: ['act-1'],
  observedCount: 3,
  deviationSign: 'under',
  depth: 'threshold',
  direction: 'tighten',
  reason: 'test flag',
  window: { season: 'summer', cycleNumber: 1 },
  expectedRate: { count: 5, per: 'season' },
};

function reset(): void {
  useReviewFlagStore.setState({ byProject: {} });
  window.localStorage.clear();
}

// ---------------------------------------------------------------------------
// Suite: isFlagDormantByWindow pure helper
// ---------------------------------------------------------------------------

describe('isFlagDormantByWindow -- pure helper', () => {
  it('per=cycle: NOT dormant when currentBucket.cycleNumber <= flagWindow.cycleNumber + 1', () => {
    const flag: ObjectiveReviewFlag = {
      ...FLAG_DEFAULTS,
      id: 'f1',
      raisedAt: '2026-01-01T00:00:00Z',
      window: { season: 'summer', cycleNumber: 2 },
    };
    // Same cycle as flag: not dormant
    expect(isFlagDormantByWindow(flag, { cycleNumber: 2 }, 'cycle')).toBe(false);
    // One cycle ahead: still not dormant (adjacent window -- pattern may still be live)
    expect(isFlagDormantByWindow(flag, { cycleNumber: 3 }, 'cycle')).toBe(false);
  });

  it('per=cycle: dormant when currentBucket.cycleNumber > flagWindow.cycleNumber + 1', () => {
    const flag: ObjectiveReviewFlag = {
      ...FLAG_DEFAULTS,
      id: 'f2',
      raisedAt: '2026-01-01T00:00:00Z',
      window: { season: 'summer', cycleNumber: 1 },
    };
    // Two cycles ahead: dormant
    expect(isFlagDormantByWindow(flag, { cycleNumber: 3 }, 'cycle')).toBe(true);
    // Three cycles ahead: still dormant
    expect(isFlagDormantByWindow(flag, { cycleNumber: 5 }, 'cycle')).toBe(true);
  });

  it('per=cycle: NOT dormant when cycleNumber is missing from either bucket', () => {
    const flag: ObjectiveReviewFlag = {
      ...FLAG_DEFAULTS,
      id: 'f3',
      raisedAt: '2026-01-01T00:00:00Z',
      window: {}, // no cycleNumber
    };
    expect(isFlagDormantByWindow(flag, { cycleNumber: 5 }, 'cycle')).toBe(false);

    const flag2: ObjectiveReviewFlag = {
      ...FLAG_DEFAULTS,
      id: 'f4',
      raisedAt: '2026-01-01T00:00:00Z',
      window: { cycleNumber: 1 },
    };
    // Missing cycleNumber in current bucket
    expect(isFlagDormantByWindow(flag2, {}, 'cycle')).toBe(false);
  });

  it('per=season: NOT dormant when season + cycleNumber are the same', () => {
    const flag: ObjectiveReviewFlag = {
      ...FLAG_DEFAULTS,
      id: 'f5',
      raisedAt: '2026-01-01T00:00:00Z',
      window: { season: 'summer', cycleNumber: 1 },
    };
    expect(
      isFlagDormantByWindow(flag, { season: 'summer', cycleNumber: 1 }, 'season'),
    ).toBe(false);
  });

  it('per=season: dormant when cycleNumber is more than 1 ahead (cross-cycle)', () => {
    const flag: ObjectiveReviewFlag = {
      ...FLAG_DEFAULTS,
      id: 'f6',
      raisedAt: '2026-01-01T00:00:00Z',
      window: { season: 'summer', cycleNumber: 1 },
    };
    // Two cycles later: dormant
    expect(
      isFlagDormantByWindow(flag, { season: 'summer', cycleNumber: 3 }, 'season'),
    ).toBe(true);
  });

  it('per=season: NOT dormant when bucket data is entirely missing', () => {
    const flag: ObjectiveReviewFlag = {
      ...FLAG_DEFAULTS,
      id: 'f7',
      raisedAt: '2026-01-01T00:00:00Z',
      window: { season: 'summer', cycleNumber: 1 },
    };
    expect(isFlagDormantByWindow(flag, {}, 'season')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite: useReviewFlagsForObjective + useReviewFlagCountsByObjective with dormancy
// ---------------------------------------------------------------------------

describe('reviewFlagStore -- dormancy read hooks', () => {
  beforeEach(() => reset());

  it('useReviewFlagsForObjective excludes dormant-by-window flags', () => {
    const { raiseFlag } = useReviewFlagStore.getState();
    // Flag with old window (cycleNumber=1)
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'old-flag',
      raisedAt: '2026-01-01T00:00:00Z',
      window: { season: 'summer', cycleNumber: 1 },
      expectedRate: { count: 5, per: 'cycle' },
    });
    // Flag with current window (cycleNumber=5 -> same as current bucket below)
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'current-flag',
      raisedAt: '2026-06-01T00:00:00Z',
      window: { season: 'summer', cycleNumber: 5 },
      direction: 'loosen', // different triple to avoid dedup
      expectedRate: { count: 5, per: 'cycle' },
    });

    // Hook: currentBucket has cycleNumber=5 (old flag has cycleNumber=1, 5 > 1+1 -> dormant)
    const { result } = renderHook(() =>
      useReviewFlagsForObjective('proj-dormancy', 'obj-A', { cycleNumber: 5 }),
    );

    const ids = result.current.map((f) => f.id);
    expect(ids).not.toContain('old-flag');
    expect(ids).toContain('current-flag');
  });

  it('useReviewFlagCountsByObjective excludes dormant-by-window flags from count', () => {
    const { raiseFlag } = useReviewFlagStore.getState();
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'old-flag-2',
      raisedAt: '2026-01-01T00:00:00Z',
      window: { season: 'summer', cycleNumber: 1 },
      expectedRate: { count: 5, per: 'cycle' },
    });

    // With currentBucket cycleNumber=5, the old flag is dormant -> count = 0
    const { result } = renderHook(() =>
      useReviewFlagCountsByObjective('proj-dormancy', { cycleNumber: 5 }),
    );
    expect(result.current['obj-A'] ?? 0).toBe(0);
  });

  it('missing bucket data: flag is NOT dormant (never hide without data)', () => {
    const { raiseFlag } = useReviewFlagStore.getState();
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'flag-no-bucket',
      raisedAt: '2026-01-01T00:00:00Z',
      window: { season: 'summer', cycleNumber: 1 },
      expectedRate: { count: 5, per: 'cycle' },
    });

    // No currentBucket provided (undefined) -> flag should still appear
    const { result } = renderHook(() =>
      useReviewFlagsForObjective('proj-dormancy', 'obj-A', undefined),
    );
    expect(result.current.map((f) => f.id)).toContain('flag-no-bucket');
  });

  it('re-raise (dedup bump + window refresh) makes a previously-dormant flag live again', () => {
    const { raiseFlag } = useReviewFlagStore.getState();
    // Raise with old window
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'revive-flag',
      raisedAt: '2026-01-01T00:00:00Z',
      window: { season: 'summer', cycleNumber: 1 },
      expectedRate: { count: 5, per: 'cycle' },
    });

    // With currentBucket cycleNumber=5, the flag is dormant
    const { result: r1 } = renderHook(() =>
      useReviewFlagsForObjective('proj-dormancy', 'obj-A', { cycleNumber: 5 }),
    );
    expect(r1.current.map((f) => f.id)).not.toContain('revive-flag');

    // Re-raise same triple with new window (cycleNumber=5)
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'revive-flag-2',
      raisedAt: '2026-06-01T00:00:00Z',
      window: { season: 'summer', cycleNumber: 5 },
      observedCount: 1,
      expectedRate: { count: 5, per: 'cycle' },
    });

    // Flag window is now refreshed to cycleNumber=5 -> NOT dormant with currentBucket=5
    const { result: r2 } = renderHook(() =>
      useReviewFlagsForObjective('proj-dormancy', 'obj-A', { cycleNumber: 5 }),
    );
    // The dedup'd flag should now appear (window refreshed)
    expect(r2.current).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Suite: dismissed-but-worsening re-surface
// ---------------------------------------------------------------------------

describe('reviewFlagStore -- dismissed-but-worsening re-surface', () => {
  beforeEach(() => reset());

  it('re-opens a dismissed flag when new cumulative observedCount > dismissedAtCount', () => {
    const { raiseFlag, dismissFlag } = useReviewFlagStore.getState();
    // Raise flag at count=3
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'worsen-flag',
      projectId: 'proj-dormancy',
      raisedAt: '2026-01-01T00:00:00Z',
      observedCount: 3,
    });
    // Dismiss it (dismissedAtCount = 3)
    dismissFlag('proj-dormancy', 'worsen-flag');

    let flag = useReviewFlagStore.getState().byProject['proj-dormancy']?.[0];
    expect(flag?.dismissedAt).toBeDefined();
    expect(flag?.dismissedAtCount).toBe(3);

    // Raise again: cumulative (3 + 2) = 5 > dismissedAtCount=3 -> re-open
    raiseFlag({
      ...FLAG_DEFAULTS,
      projectId: 'proj-dormancy',
      id: 'new-id',
      raisedAt: '2026-06-01T00:00:00Z',
      observedCount: 2,
      window: { season: 'autumn', cycleNumber: 2 },
    });

    const flags = useReviewFlagStore.getState().byProject['proj-dormancy'];
    // Should still be ONE flag (re-open, not a new row)
    expect(flags).toHaveLength(1);
    flag = flags?.[0];
    expect(flag?.dismissedAt).toBeUndefined();
    // depth bumped: threshold -> soil
    expect(flag?.depth).toBe('soil');
    // observedCount = 3 + 2 = 5
    expect(flag?.observedCount).toBe(5);
  });

  it('leaves a dismissed flag dismissed when new cumulative count does NOT exceed dismissedAtCount', () => {
    const { raiseFlag, dismissFlag } = useReviewFlagStore.getState();
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'no-worsen-flag',
      projectId: 'proj-dormancy',
      raisedAt: '2026-01-01T00:00:00Z',
      observedCount: 5,
    });
    dismissFlag('proj-dormancy', 'no-worsen-flag');

    // Raise again: cumulative (5 + 1) = 6 but wait... 5 is dismissedAtCount.
    // Actually this WOULD exceed. Let me use count=0 (add nothing: 5+0=5, not > 5)
    // vitest note: observedCount=0 is valid (nonnegative), 5+0=5 is NOT > 5
    raiseFlag({
      ...FLAG_DEFAULTS,
      projectId: 'proj-dormancy',
      id: 'no-worsen-flag-2',
      raisedAt: '2026-06-01T00:00:00Z',
      observedCount: 0,
      window: { season: 'autumn', cycleNumber: 2 },
    });

    const flags = useReviewFlagStore.getState().byProject['proj-dormancy'];
    expect(flags).toHaveLength(1);
    const flag = flags?.[0];
    expect(flag?.dismissedAt).toBeDefined(); // still dismissed
    expect(flag?.depth).toBe('threshold'); // depth unchanged
  });

  it('clamps depth at structural when bumping from structural', () => {
    const { raiseFlag, dismissFlag } = useReviewFlagStore.getState();
    raiseFlag({
      ...FLAG_DEFAULTS,
      id: 'structural-flag',
      projectId: 'proj-dormancy',
      depth: 'structural', // already at max depth
      raisedAt: '2026-01-01T00:00:00Z',
      observedCount: 2,
    });
    dismissFlag('proj-dormancy', 'structural-flag');

    // Re-raise: 2+5=7 > 2 -> re-open, bump depth (clamp at structural)
    raiseFlag({
      ...FLAG_DEFAULTS,
      projectId: 'proj-dormancy',
      depth: 'structural',
      id: 'structural-flag-2',
      raisedAt: '2026-06-01T00:00:00Z',
      observedCount: 5,
      window: { season: 'autumn', cycleNumber: 2 },
    });

    const flag = useReviewFlagStore.getState().byProject['proj-dormancy']?.[0];
    expect(flag?.depth).toBe('structural'); // clamped
    expect(flag?.dismissedAt).toBeUndefined(); // re-opened
  });
});
