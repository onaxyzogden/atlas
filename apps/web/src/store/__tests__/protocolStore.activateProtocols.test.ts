// @vitest-environment happy-dom
/**
 * protocolStore - activateProtocols (bulk activate).
 *
 * The batch variant of activateProtocol: activates many templates for one
 * project in a single state commit, with the same idempotent / reset semantics
 * as the singular action. Used by the Act tier-shell bulk-activation toolbar.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useProtocolStore } from '../protocolStore.js';

function reset(): void {
  useProtocolStore.setState({ records: [] });
  window.localStorage.clear();
}

describe('protocolStore - activateProtocols (bulk)', () => {
  beforeEach(() => reset());

  it('activates every id in one call as active records', () => {
    const s = useProtocolStore.getState();
    s.activateProtocols('proj-A', ['tmpl-1', 'tmpl-2', 'tmpl-3']);
    const recs = useProtocolStore.getState().records;
    expect(recs).toHaveLength(3);
    expect(recs.map((r) => r.templateId).sort()).toEqual([
      'tmpl-1',
      'tmpl-2',
      'tmpl-3',
    ]);
    expect(recs.every((r) => r.status === 'active')).toBe(true);
    expect(recs.every((r) => r.projectId === 'proj-A')).toBe(true);
  });

  it('resets suspended / triggered records to active (idempotent upsert)', () => {
    const s = useProtocolStore.getState();
    s.activateProtocol('proj-A', 'tmpl-1');
    s.suspendProtocol('proj-A', 'tmpl-1');
    s.markTriggered('proj-A', 'tmpl-2');

    s.activateProtocols('proj-A', ['tmpl-1', 'tmpl-2']);

    const recs = useProtocolStore.getState().records;
    expect(recs).toHaveLength(2); // no duplicates created
    expect(recs.every((r) => r.status === 'active')).toBe(true);
  });

  it('leaves already-active records active and creates no duplicates', () => {
    const s = useProtocolStore.getState();
    s.activateProtocol('proj-A', 'tmpl-1');
    s.activateProtocols('proj-A', ['tmpl-1', 'tmpl-2']);
    const recs = useProtocolStore.getState().records;
    expect(recs).toHaveLength(2);
    expect(
      recs.find((r) => r.templateId === 'tmpl-1')?.status,
    ).toBe('active');
  });

  it('is a no-op for an empty id list', () => {
    const s = useProtocolStore.getState();
    s.activateProtocol('proj-A', 'tmpl-1');
    s.activateProtocols('proj-A', []);
    expect(useProtocolStore.getState().records).toHaveLength(1);
  });

  it('scopes activation to the given project only', () => {
    const s = useProtocolStore.getState();
    s.activateProtocols('proj-A', ['tmpl-1']);
    s.activateProtocols('proj-B', ['tmpl-1', 'tmpl-2']);
    const recs = useProtocolStore.getState().records;
    expect(recs.filter((r) => r.projectId === 'proj-A')).toHaveLength(1);
    expect(recs.filter((r) => r.projectId === 'proj-B')).toHaveLength(2);
  });
});
