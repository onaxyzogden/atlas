// @vitest-environment happy-dom
/**
 * protocolStore - activate / deactivate lifecycle (Phase C2).
 *
 * Covers the new `deactivateProtocol` (the §10.1 confirmation-flow Undo): it
 * removes the matching record entirely and is the inverse of activateProtocol.
 * Existing activate/upsert behaviour is exercised as the precondition.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useProtocolStore } from '../protocolStore.js';

function reset(): void {
  useProtocolStore.setState({ records: [] });
  window.localStorage.clear();
}

describe('protocolStore - activate then deactivate', () => {
  beforeEach(() => reset());

  it('activate adds an active record; deactivate removes it', () => {
    const s = useProtocolStore.getState();
    s.activateProtocol('proj-A', 'tmpl-1');
    expect(useProtocolStore.getState().records).toHaveLength(1);
    expect(useProtocolStore.getState().records[0]).toMatchObject({
      projectId: 'proj-A',
      templateId: 'tmpl-1',
      status: 'active',
    });

    s.deactivateProtocol('proj-A', 'tmpl-1');
    expect(useProtocolStore.getState().records).toEqual([]);
  });

  it('deactivate removes ONLY the matching (projectId, templateId)', () => {
    const s = useProtocolStore.getState();
    s.activateProtocol('proj-A', 'tmpl-1');
    s.activateProtocol('proj-A', 'tmpl-2');
    s.activateProtocol('proj-B', 'tmpl-1');

    s.deactivateProtocol('proj-A', 'tmpl-1');

    const remaining = useProtocolStore.getState().records.map((r) => ({
      projectId: r.projectId,
      templateId: r.templateId,
    }));
    expect(remaining).toEqual([
      { projectId: 'proj-A', templateId: 'tmpl-2' },
      { projectId: 'proj-B', templateId: 'tmpl-1' },
    ]);
  });

  it('deactivate is an idempotent no-op when no record matches', () => {
    const s = useProtocolStore.getState();
    s.activateProtocol('proj-A', 'tmpl-1');
    s.deactivateProtocol('proj-A', 'missing');
    s.deactivateProtocol('proj-Z', 'tmpl-1');
    expect(useProtocolStore.getState().records).toHaveLength(1);
  });

  it('re-activating after deactivate creates a fresh active record', () => {
    const s = useProtocolStore.getState();
    s.activateProtocol('proj-A', 'tmpl-1');
    s.deactivateProtocol('proj-A', 'tmpl-1');
    s.activateProtocol('proj-A', 'tmpl-1');
    const recs = useProtocolStore.getState().records;
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({ status: 'active', templateId: 'tmpl-1' });
  });
});
