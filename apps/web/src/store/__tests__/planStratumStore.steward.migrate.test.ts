// @vitest-environment happy-dom
/**
 * planStratumStore - v6 -> v7 steward-tick copy-forward migration tests
 * (2026-06-16 Tier-0 restructure). The labour roster and capital band moved off
 * `s1-vision` onto the new universal `s1-steward` objective:
 *   - `s1-vision-labour` -> `s1-steward-c5`
 *   - `s1-vision-c3`     -> `s1-steward-c6`
 *
 * The migration is NON-DESTRUCTIVE (old ticks stay) and copies any completed old
 * item id forward to its new id under `s1-steward`. Item ids are globally unique,
 * so the host-objective KEY the old tick was stored under is irrelevant - the
 * migration scans each project's full completed set. Also covers idempotency,
 * the version gate, the composite v2 -> v7 path (ancient slug renumber first),
 * and a full persist.rehydrate round-trip.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  usePlanStratumProgressStore,
  migratePlanStratumProgress,
} from '../planStratumStore.js';

const PERSIST_KEY = 'ogden-plan-tier-progress';

type ByObjective = Record<string, string[]>;
interface LoosePlanState {
  byProject: Record<string, ByObjective>;
  celebratedByProject: Record<string, string[]>;
}

function reset(): void {
  usePlanStratumProgressStore.setState({
    byProject: {},
    celebratedByProject: {},
  });
  window.localStorage.clear();
}

describe('migratePlanStratumProgress (v6 -> v7): steward-tick copy-forward', () => {
  it('copies a completed labour + capital tick forward onto s1-steward', () => {
    const v6 = {
      byProject: {
        'proj-A': {
          // Old ticks live under the legacy s1-vision host objective.
          's1-vision': ['s1-vision-c1', 's1-vision-labour', 's1-vision-c3'],
        },
      },
      celebratedByProject: {},
    };
    const out = migratePlanStratumProgress(v6, 6) as unknown as LoosePlanState;
    const a = out.byProject['proj-A']!;
    expect(a['s1-steward']).toEqual(['s1-steward-c5', 's1-steward-c6']);
    // Non-destructive: the old ticks remain on s1-vision.
    expect(a['s1-vision']).toEqual([
      's1-vision-c1',
      's1-vision-labour',
      's1-vision-c3',
    ]);
  });

  it('finds the old tick regardless of which objective key it was stored under', () => {
    // Globally-unique item ids: a labour tick mis-keyed under some other
    // objective must still copy forward.
    const v6 = {
      byProject: {
        'proj-A': {
          's2-land-baseline': ['s2-land-baseline-c1', 's1-vision-labour'],
        },
      },
      celebratedByProject: {},
    };
    const out = migratePlanStratumProgress(v6, 6) as unknown as LoosePlanState;
    expect(out.byProject['proj-A']!['s1-steward']).toEqual(['s1-steward-c5']);
  });

  it('does not duplicate a new id already present on s1-steward (idempotent)', () => {
    const v6 = {
      byProject: {
        'proj-A': {
          's1-vision': ['s1-vision-labour'],
          's1-steward': ['s1-steward-c5'], // already migrated
        },
      },
      celebratedByProject: {},
    };
    const out = migratePlanStratumProgress(v6, 6) as unknown as LoosePlanState;
    expect(out.byProject['proj-A']!['s1-steward']).toEqual(['s1-steward-c5']);
  });

  it('passes v7 input through untouched (version gate skips copy-forward)', () => {
    const v7 = {
      byProject: { p: { 's1-vision': ['s1-vision-labour'] } },
      celebratedByProject: {},
    };
    const out = migratePlanStratumProgress(v7, 7) as unknown as LoosePlanState;
    // No s1-steward injected: the v<7 arm did not run.
    expect(out.byProject.p!['s1-steward']).toBeUndefined();
  });

  it('leaves a project with no labour/capital ticks structurally unchanged', () => {
    const v6 = {
      byProject: { p: { 's1-vision': ['s1-vision-c1', 's1-vision-c2'] } },
      celebratedByProject: {},
    };
    const out = migratePlanStratumProgress(v6, 6) as unknown as LoosePlanState;
    expect(out.byProject.p!['s1-steward']).toBeUndefined();
    expect(out.byProject.p!['s1-vision']).toEqual([
      's1-vision-c1',
      's1-vision-c2',
    ]);
  });

  it('composes v2 -> v7: ancient t0 labour slug is renumbered then copied forward', () => {
    // v<3 remap turns t0-vision-labour -> s1-vision-labour; then the v<7 arm
    // copies it forward to s1-steward-c5 in the same migrate pass.
    const v2 = {
      byProject: { p: { 't0-vision': ['t0-vision-c1', 't0-vision-labour'] } },
      celebratedByProject: { p: ['t0-project-foundation'] },
    };
    const out = migratePlanStratumProgress(v2, 2) as unknown as LoosePlanState;
    expect(out.byProject.p!['s1-vision']).toEqual([
      's1-vision-c1',
      's1-vision-labour',
    ]);
    expect(out.byProject.p!['s1-steward']).toEqual(['s1-steward-c5']);
  });

  it('tolerates null + empty persisted state', () => {
    const fromNull = migratePlanStratumProgress(
      null,
      6,
    ) as unknown as LoosePlanState;
    expect(fromNull.byProject).toEqual({});
    const fromEmpty = migratePlanStratumProgress(
      {},
      6,
    ) as unknown as LoosePlanState;
    expect(fromEmpty.byProject).toEqual({});
  });
});

describe('planStratumStore persist lifecycle: v6 blob -> rehydrate', () => {
  beforeEach(() => reset());

  it('rehydrates a v6 blob so the labour/capital ticks count on s1-steward', async () => {
    window.localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({
        state: {
          byProject: {
            'proj-A': {
              's1-vision': [
                's1-vision-c1',
                's1-vision-labour',
                's1-vision-c3',
              ],
            },
          },
          celebratedByProject: {},
        },
        version: 6,
      }),
    );

    await usePlanStratumProgressStore.persist.rehydrate();

    const s = usePlanStratumProgressStore.getState();
    expect(s.isCompleted('proj-A', 's1-steward', 's1-steward-c5')).toBe(true);
    expect(s.isCompleted('proj-A', 's1-steward', 's1-steward-c6')).toBe(true);
    // Old vision ticks survive (non-destructive).
    expect(s.getCompletedItemIds('proj-A', 's1-vision')).toEqual([
      's1-vision-c1',
      's1-vision-labour',
      's1-vision-c3',
    ]);
  });
});
