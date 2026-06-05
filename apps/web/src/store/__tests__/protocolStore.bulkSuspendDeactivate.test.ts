// @vitest-environment happy-dom
/**
 * protocolStore - suspendProtocols / deactivateProtocols (bulk).
 *
 * Batch variants of suspendProtocol / deactivateProtocol: mutate many templates
 * for one project in a single state commit. Used by the Act tier-shell bulk
 * toolbar's Suspend / Deactivate verbs.
 *  - suspendProtocols  : maps EXISTING matching records to status 'suspended'.
 *                        Never creates a record (suspending an unactivated
 *                        protocol is a no-op, same as the singular action).
 *  - deactivateProtocols: removes every matching record (batch of the
 *                        record-removing deactivateProtocol).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useProtocolStore } from '../protocolStore.js';

function reset(): void {
  useProtocolStore.setState({ records: [] });
  window.localStorage.clear();
}

describe('protocolStore - suspendProtocols (bulk)', () => {
  beforeEach(() => reset());

  it('flips every existing matching record to suspended in one call', () => {
    const s = useProtocolStore.getState();
    s.activateProtocols('proj-A', ['tmpl-1', 'tmpl-2', 'tmpl-3']);
    s.suspendProtocols('proj-A', ['tmpl-1', 'tmpl-2']);
    const recs = useProtocolStore.getState().records;
    expect(recs).toHaveLength(3);
    expect(recs.find((r) => r.templateId === 'tmpl-1')?.status).toBe(
      'suspended',
    );
    expect(recs.find((r) => r.templateId === 'tmpl-2')?.status).toBe(
      'suspended',
    );
    expect(recs.find((r) => r.templateId === 'tmpl-3')?.status).toBe('active');
  });

  it('does not create a record for an unactivated id (no-op)', () => {
    const s = useProtocolStore.getState();
    s.suspendProtocols('proj-A', ['tmpl-1', 'tmpl-2']);
    expect(useProtocolStore.getState().records).toHaveLength(0);
  });

  it('is a no-op for an empty id list', () => {
    const s = useProtocolStore.getState();
    s.activateProtocol('proj-A', 'tmpl-1');
    s.suspendProtocols('proj-A', []);
    const recs = useProtocolStore.getState().records;
    expect(recs).toHaveLength(1);
    expect(recs[0]!.status).toBe('active');
  });

  it('scopes suspension to the given project only', () => {
    const s = useProtocolStore.getState();
    s.activateProtocols('proj-A', ['tmpl-1']);
    s.activateProtocols('proj-B', ['tmpl-1']);
    s.suspendProtocols('proj-A', ['tmpl-1']);
    const recs = useProtocolStore.getState().records;
    expect(
      recs.find((r) => r.projectId === 'proj-A')?.status,
    ).toBe('suspended');
    expect(recs.find((r) => r.projectId === 'proj-B')?.status).toBe('active');
  });
});

describe('protocolStore - deactivateProtocols (bulk)', () => {
  beforeEach(() => reset());

  it('removes every matching record in one call', () => {
    const s = useProtocolStore.getState();
    s.activateProtocols('proj-A', ['tmpl-1', 'tmpl-2', 'tmpl-3']);
    s.deactivateProtocols('proj-A', ['tmpl-1', 'tmpl-2']);
    const recs = useProtocolStore.getState().records;
    expect(recs).toHaveLength(1);
    expect(recs[0]!.templateId).toBe('tmpl-3');
  });

  it('removes suspended/triggered records too (any existing record)', () => {
    const s = useProtocolStore.getState();
    s.activateProtocol('proj-A', 'tmpl-1');
    s.suspendProtocol('proj-A', 'tmpl-1');
    s.markTriggered('proj-A', 'tmpl-2');
    s.deactivateProtocols('proj-A', ['tmpl-1', 'tmpl-2']);
    expect(useProtocolStore.getState().records).toHaveLength(0);
  });

  it('is a no-op for an empty id list', () => {
    const s = useProtocolStore.getState();
    s.activateProtocol('proj-A', 'tmpl-1');
    s.deactivateProtocols('proj-A', []);
    expect(useProtocolStore.getState().records).toHaveLength(1);
  });

  it('ignores ids with no record (no throw, leaves others intact)', () => {
    const s = useProtocolStore.getState();
    s.activateProtocol('proj-A', 'tmpl-1');
    s.deactivateProtocols('proj-A', ['tmpl-1', 'tmpl-nonexistent']);
    expect(useProtocolStore.getState().records).toHaveLength(0);
  });

  it('scopes deactivation to the given project only', () => {
    const s = useProtocolStore.getState();
    s.activateProtocols('proj-A', ['tmpl-1']);
    s.activateProtocols('proj-B', ['tmpl-1']);
    s.deactivateProtocols('proj-A', ['tmpl-1']);
    const recs = useProtocolStore.getState().records;
    expect(recs).toHaveLength(1);
    expect(recs[0]!.projectId).toBe('proj-B');
  });
});
