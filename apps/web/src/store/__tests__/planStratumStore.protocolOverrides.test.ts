// @vitest-environment happy-dom
/**
 * planStratumStore - Act-stage protocol token override slice tests.
 *
 * Covers the `protocolTokenOverridesByProject` slice that captures per-protocol
 * threshold token overrides (the Act-stage override source merged on top of the
 * legacy `buildProtocolOutputs` outputs per template):
 *   - setProtocolTokenOverride / clearProtocolTokenOverrides round-trip
 *   - per-(project, template, token) isolation (a shared token name holds a
 *     different value on each protocol)
 *   - empty-string stored verbatim; clear is a no-op when nothing is set
 *   - selectProjectProtocolOverrides stable frozen-empty default
 *   - v5 -> v6 migration backfills `protocolTokenOverridesByProject: {}` while
 *     preserving existing byProject / celebrated / deferred / values state
 *   - cloneForProject deep-copies the override slice
 *   - other slices are unaffected by override writes
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  usePlanStratumProgressStore,
  migratePlanStratumProgress,
  selectProjectProtocolOverrides,
} from '../planStratumStore.js';

const PERSIST_KEY = 'ogden-plan-tier-progress';

function reset(): void {
  usePlanStratumProgressStore.setState({
    byProject: {},
    celebratedByProject: {},
    deferredByProject: {},
    valuesByProject: {},
    protocolTokenOverridesByProject: {},
  });
  window.localStorage.clear();
}

describe('planStratumStore - protocol token overrides round-trip', () => {
  beforeEach(() => reset());

  it('sets and reads a single token override', () => {
    const s = usePlanStratumProgressStore.getState();
    s.setProtocolTokenOverride('proj-A', 'u-s5-water-store-low', 'reserve threshold', '20%');
    expect(
      selectProjectProtocolOverrides(
        usePlanStratumProgressStore.getState(),
        'proj-A',
      ),
    ).toEqual({ 'u-s5-water-store-low': { 'reserve threshold': '20%' } });
  });

  it('merges multiple tokens for the same template and overwrites in place', () => {
    const s = usePlanStratumProgressStore.getState();
    s.setProtocolTokenOverride('proj-A', 'tmpl-1', 'reserve threshold', '20%');
    s.setProtocolTokenOverride('proj-A', 'tmpl-1', 'review window', '14d');
    s.setProtocolTokenOverride('proj-A', 'tmpl-1', 'reserve threshold', '25%');
    expect(
      selectProjectProtocolOverrides(
        usePlanStratumProgressStore.getState(),
        'proj-A',
      )['tmpl-1'],
    ).toEqual({ 'reserve threshold': '25%', 'review window': '14d' });
  });

  it('stores an empty string verbatim (clear-to-blank)', () => {
    const s = usePlanStratumProgressStore.getState();
    s.setProtocolTokenOverride('proj-A', 'tmpl-1', 'reserve threshold', '20%');
    s.setProtocolTokenOverride('proj-A', 'tmpl-1', 'reserve threshold', '');
    expect(
      selectProjectProtocolOverrides(
        usePlanStratumProgressStore.getState(),
        'proj-A',
      )['tmpl-1'],
    ).toEqual({ 'reserve threshold': '' });
  });

  it('isolates the same token name per (project, template)', () => {
    const s = usePlanStratumProgressStore.getState();
    // same token string "threshold" on two templates + two projects
    s.setProtocolTokenOverride('proj-A', 'tmpl-1', 'threshold', '10');
    s.setProtocolTokenOverride('proj-A', 'tmpl-2', 'threshold', '99');
    s.setProtocolTokenOverride('proj-B', 'tmpl-1', 'threshold', '500');
    const live = usePlanStratumProgressStore.getState();
    expect(selectProjectProtocolOverrides(live, 'proj-A')).toEqual({
      'tmpl-1': { threshold: '10' },
      'tmpl-2': { threshold: '99' },
    });
    expect(selectProjectProtocolOverrides(live, 'proj-B')).toEqual({
      'tmpl-1': { threshold: '500' },
    });
  });

  it('clears all overrides for one template only', () => {
    const s = usePlanStratumProgressStore.getState();
    s.setProtocolTokenOverride('proj-A', 'tmpl-1', 'threshold', '10');
    s.setProtocolTokenOverride('proj-A', 'tmpl-1', 'window', '7d');
    s.setProtocolTokenOverride('proj-A', 'tmpl-2', 'threshold', '99');
    s.clearProtocolTokenOverrides('proj-A', 'tmpl-1');
    expect(
      selectProjectProtocolOverrides(
        usePlanStratumProgressStore.getState(),
        'proj-A',
      ),
    ).toEqual({ 'tmpl-2': { threshold: '99' } });
  });

  it('clear is a stable no-op when the template has no overrides', () => {
    const s = usePlanStratumProgressStore.getState();
    const before = usePlanStratumProgressStore.getState()
      .protocolTokenOverridesByProject;
    s.clearProtocolTokenOverrides('proj-A', 'tmpl-1');
    expect(
      usePlanStratumProgressStore.getState().protocolTokenOverridesByProject,
    ).toBe(before);
  });

  it('returns a stable frozen empty default for an unknown project', () => {
    const empty = selectProjectProtocolOverrides(
      usePlanStratumProgressStore.getState(),
      'nope',
    );
    expect(empty).toEqual({});
    expect(Object.isFrozen(empty)).toBe(true);
    const a = selectProjectProtocolOverrides(
      usePlanStratumProgressStore.getState(),
      'nope',
    );
    const b = selectProjectProtocolOverrides(
      usePlanStratumProgressStore.getState(),
      'other',
    );
    expect(a).toBe(b);
  });

  it('does not touch other slices when writing an override', () => {
    const s = usePlanStratumProgressStore.getState();
    s.setItemComplete('proj-A', 's6-yield-flows', 's6-yield-flows-c1');
    s.setParameterValue('proj-A', 's6-yield-flows', 'param-cover', '1500');
    s.setProtocolTokenOverride('proj-A', 'tmpl-1', 'threshold', '10');
    const live = usePlanStratumProgressStore.getState();
    expect(live.getCompletedItemIds('proj-A', 's6-yield-flows')).toEqual([
      's6-yield-flows-c1',
    ]);
    expect(live.getParameterValues('proj-A', 's6-yield-flows')).toEqual({
      'param-cover': '1500',
    });
  });

  it('cloneForProject deep-copies the override slice independently', () => {
    const s = usePlanStratumProgressStore.getState();
    s.setProtocolTokenOverride('src', 'tmpl-1', 'threshold', '10');
    s.cloneForProject('src', 'dst');
    // mutate source after clone -> dst must not change
    usePlanStratumProgressStore
      .getState()
      .setProtocolTokenOverride('src', 'tmpl-1', 'threshold', '999');
    const live = usePlanStratumProgressStore.getState();
    expect(selectProjectProtocolOverrides(live, 'dst')).toEqual({
      'tmpl-1': { threshold: '10' },
    });
    expect(selectProjectProtocolOverrides(live, 'src')).toEqual({
      'tmpl-1': { threshold: '999' },
    });
  });
});

describe('migratePlanStratumProgress (v5 -> v6): protocolTokenOverridesByProject backfill', () => {
  it('backfills protocolTokenOverridesByProject ({}) and preserves prior state', () => {
    const v5 = {
      byProject: { p: { 's1-vision': ['s1-vision-c1'] } },
      celebratedByProject: { p: ['s1-project-foundation'] },
      deferredByProject: { p: ['s2-land-baseline'] },
      valuesByProject: { p: { 's6-yield-flows': { 'param-cover': '1500' } } },
    };
    const out = migratePlanStratumProgress(v5, 5) as unknown as {
      byProject: Record<string, Record<string, string[]>>;
      celebratedByProject: Record<string, string[]>;
      deferredByProject: Record<string, string[]>;
      valuesByProject: Record<string, Record<string, Record<string, string>>>;
      protocolTokenOverridesByProject: Record<string, unknown>;
    };
    expect(out.protocolTokenOverridesByProject).toEqual({});
    expect(out.byProject.p!['s1-vision']).toEqual(['s1-vision-c1']);
    expect(out.celebratedByProject.p).toEqual(['s1-project-foundation']);
    expect(out.deferredByProject.p).toEqual(['s2-land-baseline']);
    expect(out.valuesByProject.p!['s6-yield-flows']).toEqual({
      'param-cover': '1500',
    });
  });

  it('preserves an already-present protocolTokenOverridesByProject on v6+ input', () => {
    const v6 = {
      byProject: {},
      celebratedByProject: {},
      deferredByProject: {},
      valuesByProject: {},
      protocolTokenOverridesByProject: {
        p: { 'tmpl-1': { 'reserve threshold': '20%' } },
      },
    };
    const out = migratePlanStratumProgress(v6, 6) as unknown as {
      protocolTokenOverridesByProject: Record<
        string,
        Record<string, Record<string, string>>
      >;
    };
    expect(out.protocolTokenOverridesByProject.p!['tmpl-1']).toEqual({
      'reserve threshold': '20%',
    });
  });
});

describe('planStratumStore persist lifecycle: v5 blob -> rehydrate v6', () => {
  beforeEach(() => reset());

  it('rehydrates a v5 blob, backfilling overrides while keeping progress', async () => {
    window.localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({
        state: {
          byProject: { 'proj-A': { 's1-vision': ['s1-vision-c1'] } },
          celebratedByProject: { 'proj-A': ['s1-project-foundation'] },
          deferredByProject: {},
          valuesByProject: {},
        },
        version: 5,
      }),
    );

    await usePlanStratumProgressStore.persist.rehydrate();

    const s = usePlanStratumProgressStore.getState();
    expect(s.getCompletedItemIds('proj-A', 's1-vision')).toEqual([
      's1-vision-c1',
    ]);
    expect(
      selectProjectProtocolOverrides(
        usePlanStratumProgressStore.getState(),
        'proj-A',
      ),
    ).toEqual({});
    // and the slice is now writable post-rehydrate
    s.setProtocolTokenOverride('proj-A', 'tmpl-1', 'reserve threshold', '20%');
    expect(
      selectProjectProtocolOverrides(
        usePlanStratumProgressStore.getState(),
        'proj-A',
      ),
    ).toEqual({ 'tmpl-1': { 'reserve threshold': '20%' } });
  });
});
