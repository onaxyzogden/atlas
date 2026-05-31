// @vitest-environment happy-dom
//
// planStratumStore - Deferred objective state (Part C, OLOS Plan Navigation
// Spec section 8.3). Deferred is the "mark as Deferred instead" alternative to
// a blocked secondary removal: the objective is shelved (progress preserved)
// and the status engine renders it `deferred`. This state is genuinely new
// persisted data, isolated in planStratumStore (its own v3 -> v4 persist bump),
// NOT in projectStore (which stays v7).
//
// Covers: the deferObjective / undeferObjective actions (idempotent,
// append-only / remove), the selectDeferredObjectives + toDeferredSet
// accessors, a persist rehydrate round-trip proving deferred ids survive a
// reload, and the v3 -> v4 migration that backfills `deferredByProject: {}`
// while leaving existing byProject / celebratedByProject untouched.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  usePlanStratumProgressStore,
  migratePlanStratumProgress,
  selectDeferredObjectives,
  toDeferredSet,
} from '../planStratumStore.js';

const PERSIST_KEY = 'ogden-plan-tier-progress';

interface LoosePlanState {
  byProject: Record<string, Record<string, string[]>>;
  celebratedByProject: Record<string, string[]>;
  deferredByProject: Record<string, string[]>;
}

function reset(): void {
  usePlanStratumProgressStore.setState({
    byProject: {},
    celebratedByProject: {},
    deferredByProject: {},
  });
  window.localStorage.clear();
}

describe('deferObjective / undeferObjective actions', () => {
  beforeEach(() => reset());

  it('defers an objective (append-only) and reads it back via the selector', () => {
    const store = usePlanStratumProgressStore.getState();
    store.deferObjective('proj-A', 'res-s1-household-needs');

    const ids = selectDeferredObjectives(
      usePlanStratumProgressStore.getState(),
      'proj-A',
    );
    expect(ids).toEqual(['res-s1-household-needs']);
    expect(toDeferredSet(ids).has('res-s1-household-needs')).toBe(true);
  });

  it('is idempotent on a repeat defer (no duplicate id)', () => {
    const store = usePlanStratumProgressStore.getState();
    store.deferObjective('proj-A', 'res-s1-household-needs');
    store.deferObjective('proj-A', 'res-s1-household-needs');

    expect(
      selectDeferredObjectives(
        usePlanStratumProgressStore.getState(),
        'proj-A',
      ),
    ).toEqual(['res-s1-household-needs']);
  });

  it('undeferObjective (Restore) removes exactly one id and is idempotent when absent', () => {
    const store = usePlanStratumProgressStore.getState();
    store.deferObjective('proj-A', 'res-s1-household-needs');
    store.deferObjective('proj-A', 'res-s4-living-zone');

    store.undeferObjective('proj-A', 'res-s1-household-needs');
    expect(
      selectDeferredObjectives(
        usePlanStratumProgressStore.getState(),
        'proj-A',
      ),
    ).toEqual(['res-s4-living-zone']);

    // Restoring an id that is not deferred is a no-op.
    store.undeferObjective('proj-A', 'res-s1-household-needs');
    expect(
      selectDeferredObjectives(
        usePlanStratumProgressStore.getState(),
        'proj-A',
      ),
    ).toEqual(['res-s4-living-zone']);
  });

  it('keeps deferred sets isolated per project', () => {
    const store = usePlanStratumProgressStore.getState();
    store.deferObjective('proj-A', 'res-s1-household-needs');
    store.deferObjective('proj-B', 'res-s4-living-zone');

    const live = usePlanStratumProgressStore.getState();
    expect(selectDeferredObjectives(live, 'proj-A')).toEqual([
      'res-s1-household-needs',
    ]);
    expect(selectDeferredObjectives(live, 'proj-B')).toEqual([
      'res-s4-living-zone',
    ]);
  });

  it('returns a stable empty array for a project with nothing deferred', () => {
    expect(
      selectDeferredObjectives(
        usePlanStratumProgressStore.getState(),
        'unknown',
      ),
    ).toEqual([]);
  });
});

describe('migratePlanStratumProgress (v3 -> v4): deferredByProject backfill', () => {
  it('backfills deferredByProject ({}) on v3 input and leaves byProject untouched', () => {
    const v3 = {
      byProject: { p: { 's1-vision': ['s1-vision-c1'] } },
      celebratedByProject: { p: ['s1-project-foundation'] },
    };
    const out = migratePlanStratumProgress(v3, 3) as unknown as LoosePlanState;
    expect(out.deferredByProject).toEqual({});
    // byProject + celebrated pass through unchanged (no slug remap at v3+).
    expect(out.byProject.p!['s1-vision']).toEqual(['s1-vision-c1']);
    expect(out.celebratedByProject.p).toEqual(['s1-project-foundation']);
  });

  it('preserves an already-present deferredByProject (v4 passthrough)', () => {
    const v4 = {
      byProject: {},
      celebratedByProject: {},
      deferredByProject: { p: ['res-s1-household-needs'] },
    };
    const out = migratePlanStratumProgress(v4, 4) as unknown as LoosePlanState;
    expect(out.deferredByProject).toEqual({ p: ['res-s1-household-needs'] });
  });

  it('backfills deferredByProject even from a pre-v3 blob (composite migration)', () => {
    const v2 = {
      byProject: { p: { 't0-vision': ['t0-vision-c1'] } },
      celebratedByProject: {},
    };
    const out = migratePlanStratumProgress(v2, 2) as unknown as LoosePlanState;
    expect(out.deferredByProject).toEqual({});
    // The v2 -> v3 slug remap still runs.
    expect(out.byProject.p!['s1-vision']).toEqual(['s1-vision-c1']);
  });
});

describe('planStratumStore persist lifecycle: deferred ids survive rehydrate', () => {
  beforeEach(() => reset());

  it('rehydrates a persisted v4 blob so deferred objectives survive a reload', async () => {
    window.localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({
        state: {
          byProject: {},
          celebratedByProject: {},
          deferredByProject: { 'proj-A': ['res-s1-household-needs'] },
        },
        version: 4,
      }),
    );

    await usePlanStratumProgressStore.persist.rehydrate();

    const ids = selectDeferredObjectives(
      usePlanStratumProgressStore.getState(),
      'proj-A',
    );
    expect(ids).toEqual(['res-s1-household-needs']);
  });

  it('rehydrates a v3 blob and backfills deferredByProject to empty', async () => {
    window.localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({
        state: {
          byProject: { 'proj-A': { 's1-vision': ['s1-vision-c1'] } },
          celebratedByProject: {},
        },
        version: 3,
      }),
    );

    await usePlanStratumProgressStore.persist.rehydrate();

    const s = usePlanStratumProgressStore.getState();
    expect(s.deferredByProject).toEqual({});
    // Pre-existing progress is preserved across the bump.
    expect(s.getCompletedItemIds('proj-A', 's1-vision')).toEqual([
      's1-vision-c1',
    ]);
  });
});
