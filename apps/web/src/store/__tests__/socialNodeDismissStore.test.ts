import { beforeEach, describe, expect, it } from 'vitest';
import { useSocialNodeDismissStore } from '../socialNodeDismissStore.js';

const P = 'proj-1';

describe('socialNodeDismissStore', () => {
  beforeEach(() => {
    useSocialNodeDismissStore.setState({ byProject: {} });
  });

  it('records a dismissal, idempotently', () => {
    const { dismiss } = useSocialNodeDismissStore.getState();
    dismiss(P, 'opp-a');
    dismiss(P, 'opp-a'); // duplicate — no double entry
    expect(useSocialNodeDismissStore.getState().byProject[P]).toEqual(['opp-a']);
  });

  it('restores a single dismissal', () => {
    const { dismiss, restore } = useSocialNodeDismissStore.getState();
    dismiss(P, 'opp-a');
    dismiss(P, 'opp-b');
    restore(P, 'opp-a');
    expect(useSocialNodeDismissStore.getState().byProject[P]).toEqual(['opp-b']);
  });

  it('clears all dismissals for a project', () => {
    const { dismiss, clear } = useSocialNodeDismissStore.getState();
    dismiss(P, 'opp-a');
    dismiss(P, 'opp-b');
    clear(P);
    expect(useSocialNodeDismissStore.getState().byProject[P]).toBeUndefined();
  });

  it('keeps dismissals scoped per project', () => {
    const { dismiss } = useSocialNodeDismissStore.getState();
    dismiss(P, 'opp-a');
    dismiss('proj-2', 'opp-z');
    const state = useSocialNodeDismissStore.getState();
    expect(state.byProject[P]).toEqual(['opp-a']);
    expect(state.byProject['proj-2']).toEqual(['opp-z']);
  });
});
