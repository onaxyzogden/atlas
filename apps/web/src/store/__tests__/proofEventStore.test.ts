// @vitest-environment happy-dom
/**
 * proofEventStore — projectId-tagged generic-proof CRUD (Sub-project D4).
 * Steward/field-authored only; no Goal-Compass preservation contract.
 * Add/remove are project-isolated; orphans are retained by design.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useProofEventStore } from '../proofEventStore.js';
import type { ProofEvent } from '@ogden/shared';

function pe(partial: Partial<ProofEvent> & { id: string; workItemId: string }): ProofEvent {
  return {
    projectId: 'p1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

const reset = () => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  useProofEventStore.setState({ events: [] });
};

describe('proofEventStore', () => {
  beforeEach(reset);

  it('adds, updates, and removes a proof event', () => {
    const s = useProofEventStore.getState();
    s.addProofEvent(pe({ id: 'pf1', workItemId: 'w1' }));
    expect(useProofEventStore.getState().events).toHaveLength(1);

    useProofEventStore.getState().updateProofEvent('pf1', { notes: 'done by hand' });
    expect(useProofEventStore.getState().events[0]!.notes).toBe('done by hand');

    useProofEventStore.getState().removeProofEvent('pf1');
    expect(useProofEventStore.getState().events).toHaveLength(0);
  });

  it('scopes getProjectProofEvents to a single project', () => {
    useProofEventStore.setState({
      events: [
        pe({ id: 'a', workItemId: 'w1', projectId: 'p1' }),
        pe({ id: 'b', workItemId: 'w2', projectId: 'p1' }),
        pe({ id: 'c', workItemId: 'w3', projectId: 'p2' }),
      ],
    });
    expect(
      useProofEventStore.getState().getProjectProofEvents('p1').map((e) => e.id),
    ).toEqual(['a', 'b']);
    expect(
      useProofEventStore.getState().getProjectProofEvents('p2').map((e) => e.id),
    ).toEqual(['c']);
  });

  it('retains orphan events (no cascade) when its WorkItem is gone', () => {
    useProofEventStore.setState({ events: [pe({ id: 'orph', workItemId: 'gone' })] });
    // Nothing cascades — the audit row stays until explicitly removed.
    expect(useProofEventStore.getState().getProjectProofEvents('p1')).toHaveLength(1);
  });
});
