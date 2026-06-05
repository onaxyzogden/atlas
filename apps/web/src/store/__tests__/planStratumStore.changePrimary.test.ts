// @vitest-environment happy-dom
//
// Progress-store helpers backing the mid-project primary-type change:
//   - cloneForProject(source, target) deep-copies all FOUR per-project slices
//     (byProject, celebratedByProject, deferredByProject, valuesByProject) so an
//     opt-in backup clone preserves the steward's checklist work. (The project
//     duplicateProject only copies design-intent entities, not stratum progress
//     — confirmed gap this bridges.)
//   - discardObjectivesProgress(project, ids) clears the THREE per-objective
//     slices (byProject item lists, valuesByProject parameter values, and
//     deferredByProject membership) for the orphaned objectives, while leaving
//     celebratedByProject (a stratum-unlock log, not per-objective) untouched.

import { describe, expect, it, beforeEach } from 'vitest';
import { usePlanStratumProgressStore } from '../planStratumStore.js';

const SRC = 'project-source';
const TGT = 'project-target';

function reset(): void {
  usePlanStratumProgressStore.setState({
    byProject: {},
    celebratedByProject: {},
    deferredByProject: {},
    valuesByProject: {},
  });
}

describe('planStratumStore.cloneForProject', () => {
  beforeEach(reset);

  it('deep-copies all four per-project slices under the target id', () => {
    usePlanStratumProgressStore.setState({
      byProject: { [SRC]: { 'obj-a': ['item-1', 'item-2'] } },
      celebratedByProject: { [SRC]: ['s1-project-foundation'] },
      deferredByProject: { [SRC]: ['obj-b'] },
      valuesByProject: { [SRC]: { 'obj-c': { paramX: 'value' } } },
    });

    usePlanStratumProgressStore.getState().cloneForProject(SRC, TGT);

    const s = usePlanStratumProgressStore.getState();
    expect(s.byProject[TGT]).toEqual({ 'obj-a': ['item-1', 'item-2'] });
    expect(s.celebratedByProject[TGT]).toEqual(['s1-project-foundation']);
    expect(s.deferredByProject[TGT]).toEqual(['obj-b']);
    expect(s.valuesByProject[TGT]).toEqual({ 'obj-c': { paramX: 'value' } });
  });

  it('produces independent copies (mutating the source does not bleed into the clone)', () => {
    usePlanStratumProgressStore.setState({
      byProject: { [SRC]: { 'obj-a': ['item-1'] } },
      valuesByProject: { [SRC]: { 'obj-c': { paramX: 'value' } } },
    });

    usePlanStratumProgressStore.getState().cloneForProject(SRC, TGT);
    // Add new progress to the SOURCE after the clone.
    usePlanStratumProgressStore.getState().toggleItem(SRC, 'obj-a', 'item-2');

    const s = usePlanStratumProgressStore.getState();
    expect(s.byProject[SRC]?.['obj-a']).toEqual(['item-1', 'item-2']);
    // The clone keeps only what existed at clone time.
    expect(s.byProject[TGT]?.['obj-a']).toEqual(['item-1']);
  });

  it('is a no-op when the source has no progress', () => {
    usePlanStratumProgressStore.getState().cloneForProject(SRC, TGT);
    const s = usePlanStratumProgressStore.getState();
    expect(s.byProject[TGT]).toBeUndefined();
    expect(s.deferredByProject[TGT]).toBeUndefined();
  });
});

describe('planStratumStore.discardObjectivesProgress', () => {
  beforeEach(reset);

  it('clears item lists, values, and deferred membership for the given objectives', () => {
    usePlanStratumProgressStore.setState({
      byProject: { [SRC]: { keep: ['k1'], drop1: ['d1'], drop2: ['d2'] } },
      valuesByProject: { [SRC]: { keep: { p: 'v' }, drop1: { p: 'v' } } },
      deferredByProject: { [SRC]: ['drop2', 'keepDeferred'] },
      celebratedByProject: { [SRC]: ['s1-project-foundation'] },
    });

    usePlanStratumProgressStore
      .getState()
      .discardObjectivesProgress(SRC, ['drop1', 'drop2']);

    const s = usePlanStratumProgressStore.getState();
    expect(s.byProject[SRC]).toEqual({ keep: ['k1'] });
    expect(s.valuesByProject[SRC]).toEqual({ keep: { p: 'v' } });
    expect(s.deferredByProject[SRC]).toEqual(['keepDeferred']);
    // celebrated (stratum-unlock log) is left untouched.
    expect(s.celebratedByProject[SRC]).toEqual(['s1-project-foundation']);
  });

  it('is a no-op when the id list is empty', () => {
    const before = {
      byProject: { [SRC]: { keep: ['k1'] } },
      deferredByProject: { [SRC]: ['x'] },
    };
    usePlanStratumProgressStore.setState(before);
    usePlanStratumProgressStore.getState().discardObjectivesProgress(SRC, []);
    const s = usePlanStratumProgressStore.getState();
    expect(s.byProject[SRC]).toEqual({ keep: ['k1'] });
    expect(s.deferredByProject[SRC]).toEqual(['x']);
  });

  it('only touches the named project, never sibling projects', () => {
    usePlanStratumProgressStore.setState({
      byProject: { [SRC]: { drop1: ['d1'] }, [TGT]: { drop1: ['t1'] } },
    });
    usePlanStratumProgressStore.getState().discardObjectivesProgress(SRC, ['drop1']);
    const s = usePlanStratumProgressStore.getState();
    expect(s.byProject[SRC]).toEqual({});
    expect(s.byProject[TGT]).toEqual({ drop1: ['t1'] });
  });
});
