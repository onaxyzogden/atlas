// @vitest-environment happy-dom
/**
 * protocolStore - restoreProtocolRecords (bulk undo).
 *
 * Reverses a bulk action by restoring a captured pre-mutation snapshot in one
 * state commit. `affectedTemplateIds` is the FULL set the action applied to;
 * `priorRecords` is the subset that HAD a record before. Every affected id is
 * removed for the project, then `priorRecords` re-appended — reversing all
 * three verbs uniformly:
 *  - activate-of-new  → dropped, not re-added (record deleted).
 *  - activate/suspend → restored to prior status.
 *  - deactivate       → re-inserted with full prior shape.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useProtocolStore } from '../protocolStore.js';
import type { ActivatedProtocolRecord } from '../protocolStore.js';

function reset(): void {
  useProtocolStore.setState({ records: [] });
  window.localStorage.clear();
}

const PROJ = 'proj-R';

describe('protocolStore - restoreProtocolRecords (bulk undo)', () => {
  beforeEach(() => reset());

  it('reverses activate-of-new: deletes records that had no prior snapshot', () => {
    const s = useProtocolStore.getState();
    // Steward bulk-activated two previously-unactivated templates.
    s.activateProtocols(PROJ, ['t-1', 't-2']);
    expect(useProtocolStore.getState().records).toHaveLength(2);
    // Snapshot was empty (neither had a record before) → undo removes both.
    s.restoreProtocolRecords(PROJ, ['t-1', 't-2'], []);
    expect(useProtocolStore.getState().records).toHaveLength(0);
  });

  it('reverses activate-of-suspended: restores the prior suspended status', () => {
    const s = useProtocolStore.getState();
    s.activateProtocols(PROJ, ['t-1']);
    s.suspendProtocols(PROJ, ['t-1']);
    const prior = useProtocolStore
      .getState()
      .records.filter((r) => r.projectId === PROJ && r.templateId === 't-1');
    expect(prior[0]!.status).toBe('suspended');
    // Bulk activate flips it to active...
    s.activateProtocols(PROJ, ['t-1']);
    expect(
      useProtocolStore.getState().records.find((r) => r.templateId === 't-1')
        ?.status,
    ).toBe('active');
    // ...undo restores the prior 'suspended'.
    s.restoreProtocolRecords(PROJ, ['t-1'], prior);
    const recs = useProtocolStore.getState().records;
    expect(recs).toHaveLength(1);
    expect(recs[0]!.status).toBe('suspended');
  });

  it('reverses suspend: restores the prior active status', () => {
    const s = useProtocolStore.getState();
    s.activateProtocols(PROJ, ['t-1', 't-2']);
    const prior = useProtocolStore
      .getState()
      .records.filter((r) => r.projectId === PROJ);
    s.suspendProtocols(PROJ, ['t-1', 't-2']);
    expect(
      useProtocolStore
        .getState()
        .records.every((r) => r.status === 'suspended'),
    ).toBe(true);
    s.restoreProtocolRecords(PROJ, ['t-1', 't-2'], prior);
    const recs = useProtocolStore.getState().records;
    expect(recs).toHaveLength(2);
    expect(recs.every((r) => r.status === 'active')).toBe(true);
  });

  it('reverses deactivate: re-inserts removed records with full shape preserved', () => {
    const full: ActivatedProtocolRecord = {
      templateId: 't-1',
      projectId: PROJ,
      status: 'triggered',
      activatedAt: '2026-01-02T03:04:05.000Z',
      deferredUntil: '2026-02-01T00:00:00.000Z',
      lastLoggedAt: '2026-01-15T12:00:00.000Z',
    };
    useProtocolStore.setState({ records: [full] });
    const s = useProtocolStore.getState();
    const prior = s.records.filter(
      (r) => r.projectId === PROJ && r.templateId === 't-1',
    );
    s.deactivateProtocols(PROJ, ['t-1']);
    expect(useProtocolStore.getState().records).toHaveLength(0);
    s.restoreProtocolRecords(PROJ, ['t-1'], prior);
    const recs = useProtocolStore.getState().records;
    expect(recs).toHaveLength(1);
    expect(recs[0]).toEqual(full); // status + activatedAt + deferredUntil + lastLoggedAt
  });

  it('empty affectedTemplateIds is a no-op', () => {
    const s = useProtocolStore.getState();
    s.activateProtocols(PROJ, ['t-1']);
    s.restoreProtocolRecords(PROJ, [], []);
    expect(useProtocolStore.getState().records).toHaveLength(1);
  });

  it('is project-scoped: never touches another project records', () => {
    const s = useProtocolStore.getState();
    s.activateProtocols(PROJ, ['t-1']);
    s.activateProtocols('proj-OTHER', ['t-1']);
    // Undo the PROJ activate only.
    s.restoreProtocolRecords(PROJ, ['t-1'], []);
    const recs = useProtocolStore.getState().records;
    expect(recs).toHaveLength(1);
    expect(recs[0]!.projectId).toBe('proj-OTHER');
  });

  it('is idempotent when applied twice with the same snapshot', () => {
    const s = useProtocolStore.getState();
    s.activateProtocols(PROJ, ['t-1', 't-2']);
    const prior = useProtocolStore
      .getState()
      .records.filter((r) => r.projectId === PROJ);
    s.suspendProtocols(PROJ, ['t-1', 't-2']);
    s.restoreProtocolRecords(PROJ, ['t-1', 't-2'], prior);
    s.restoreProtocolRecords(PROJ, ['t-1', 't-2'], prior);
    const recs = useProtocolStore.getState().records;
    expect(recs).toHaveLength(2);
    expect(recs.every((r) => r.status === 'active')).toBe(true);
  });
});
