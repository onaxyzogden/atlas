// @vitest-environment happy-dom
/**
 * fieldProofActions — the thin D4 orchestrator. Composes proof-event
 * creation (typed D0 stamp OR generic fallback) with the spine-only
 * fulfilWorkItem, structurally like RotationScheduleCard's
 * updateItem(...) + updateEvent(...) pair. Single completion writer stays
 * exactly one action.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import { useProofEventStore } from '../../../store/proofEventStore.js';
import { fulfilWithGenericProof, confirmTypedProofMatch } from '../fieldProofActions.js';
import { useMaintenanceLogStore } from '../../../store/maintenanceLogStore.js';
import type { WorkItem } from '@ogden/shared';

function wi(p: Partial<WorkItem> & { id: string }): WorkItem {
  return {
    projectId: 'p1', source: 'manual', overridden: false, createdAt: 'c',
    updatedAt: 'u', title: p.id, phaseId: null, status: 'todo',
    dependsOn: [], dependsOnAuto: [], materialsAuto: [],
    equipmentRequiredAuto: [], ...p,
  } as WorkItem;
}

const reset = () => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  useWorkItemStore.setState({ items: [wi({ id: 'w1' })], migratedSources: [] });
  useProofEventStore.setState({ events: [] });
  useMaintenanceLogStore.setState({ events: [] });
};

describe('fieldProofActions', () => {
  beforeEach(reset);

  it('fulfilWithGenericProof writes a ProofEvent AND fulfils the spine', () => {
    fulfilWithGenericProof('w1', 'p1', {
      who: 'Yousef', actualStart: '2026-05-10', actualEnd: '2026-05-11',
      notes: 'by hand',
    });
    const ev = useProofEventStore.getState().getProjectProofEvents('p1');
    expect(ev).toHaveLength(1);
    expect(ev[0]!.workItemId).toBe('w1');
    expect(ev[0]!.notes).toBe('by hand');
    expect(useWorkItemStore.getState().items[0]!.status).toBe('done');
  });

  it('confirmTypedProofMatch stamps the existing typed event and fulfils the spine, no generic event', () => {
    useMaintenanceLogStore.setState({
      events: [
        {
          id: 'm-ev', projectId: 'p1', sourceKind: 'earthwork',
          sourceId: 's1', date: '2026-05-10', action: 'clear',
        },
      ],
    });
    confirmTypedProofMatch('w1', { store: 'maintenance', eventId: 'm-ev' });
    expect(
      useMaintenanceLogStore.getState().events[0]!.workItemId,
    ).toBe('w1');
    expect(useProofEventStore.getState().events).toHaveLength(0); // no fallback
    expect(useWorkItemStore.getState().items[0]!.status).toBe('done');
  });
});
