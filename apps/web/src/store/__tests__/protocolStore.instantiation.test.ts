// @vitest-environment happy-dom
/**
 * protocolStore - instantiatedObjectiveIds slice (persist v4 / §10.1 trigger).
 *
 * The marker gives the objective-approval → protocol-instantiation trigger
 * exactly-once-per-objective semantics: once a gating objective's approval
 * overlay has been auto-surfaced, the marker is stamped so subsequent
 * completions/re-renders never re-open it. `clearObjectiveInstantiation` resets
 * it for an explicit manual re-instantiate.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useProtocolStore,
  selectObjectiveInstantiated,
} from '../protocolStore.js';

function reset(): void {
  useProtocolStore.setState({
    records: [],
    activations: [],
    expectationsByProject: {},
    instantiatedObjectiveIds: {},
  });
  window.localStorage.clear();
}

describe('protocolStore - markObjectiveInstantiated / selectObjectiveInstantiated', () => {
  beforeEach(() => reset());

  it('marks an objective and reads it back via the selector', () => {
    const { markObjectiveInstantiated } = useProtocolStore.getState();
    markObjectiveInstantiated('p1', 'obj-A');

    const s = useProtocolStore.getState();
    expect(selectObjectiveInstantiated(s, 'p1', 'obj-A')).toBe(true);
    // Unmarked objective / project is false.
    expect(selectObjectiveInstantiated(s, 'p1', 'obj-B')).toBe(false);
    expect(selectObjectiveInstantiated(s, 'p2', 'obj-A')).toBe(false);
  });

  it('is idempotent — marking the same pair twice does not duplicate', () => {
    const { markObjectiveInstantiated } = useProtocolStore.getState();
    markObjectiveInstantiated('p1', 'obj-A');
    markObjectiveInstantiated('p1', 'obj-A');

    const ids = useProtocolStore.getState().instantiatedObjectiveIds['p1'];
    expect(ids).toEqual(['obj-A']);
  });

  it('marking p1/obj-A does not disturb p1/obj-B or p2/obj-A', () => {
    const { markObjectiveInstantiated } = useProtocolStore.getState();
    markObjectiveInstantiated('p1', 'obj-A');
    markObjectiveInstantiated('p1', 'obj-B');
    markObjectiveInstantiated('p2', 'obj-A');

    const s = useProtocolStore.getState();
    expect(selectObjectiveInstantiated(s, 'p1', 'obj-A')).toBe(true);
    expect(selectObjectiveInstantiated(s, 'p1', 'obj-B')).toBe(true);
    expect(selectObjectiveInstantiated(s, 'p2', 'obj-A')).toBe(true);
  });

  it('clearObjectiveInstantiation removes only the named marker (manual re-instantiate)', () => {
    const { markObjectiveInstantiated, clearObjectiveInstantiation } =
      useProtocolStore.getState();
    markObjectiveInstantiated('p1', 'obj-A');
    markObjectiveInstantiated('p1', 'obj-B');

    clearObjectiveInstantiation('p1', 'obj-A');

    const s = useProtocolStore.getState();
    expect(selectObjectiveInstantiated(s, 'p1', 'obj-A')).toBe(false);
    // Sibling marker survives.
    expect(selectObjectiveInstantiated(s, 'p1', 'obj-B')).toBe(true);
  });

  it('clearObjectiveInstantiation is a no-op for an unmarked objective', () => {
    const { clearObjectiveInstantiation } = useProtocolStore.getState();
    // No throw, no state change.
    clearObjectiveInstantiation('p1', 'never-marked');
    const s = useProtocolStore.getState();
    expect(s.instantiatedObjectiveIds['p1']).toBeUndefined();
  });

  it('deactivating a protocol does NOT clear the instantiation marker (no re-fire)', () => {
    // Models the covenant guarantee: a steward who reviews the surfaced overlay,
    // activates a protocol, then later deactivates it must NOT be re-nagged.
    const { markObjectiveInstantiated, activateProtocol, deactivateProtocol } =
      useProtocolStore.getState();
    markObjectiveInstantiated('p1', 'obj-A');
    activateProtocol('p1', 'tmpl-1');
    deactivateProtocol('p1', 'tmpl-1');

    const s = useProtocolStore.getState();
    // Record gone…
    expect(s.records.find((r) => r.templateId === 'tmpl-1')).toBeUndefined();
    // …but the marker persists, so the trigger will not re-surface.
    expect(selectObjectiveInstantiated(s, 'p1', 'obj-A')).toBe(true);
  });
});

describe('protocolStore - persist v4 migration', () => {
  it('migrates a v3 blob: preserves records/activations/expectations, adds instantiatedObjectiveIds: {}', () => {
    const migrate = useProtocolStore.persist.getOptions().migrate;
    if (!migrate) throw new Error('migrate fn not found on persist options');

    const v3Blob = {
      records: [
        {
          templateId: 'tmpl-1',
          projectId: 'proj-A',
          status: 'active',
          activatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      activations: [],
      expectationsByProject: { 'proj-A': { 'tmpl-1': { count: 2, per: 'season' } } },
    };

    const result = migrate(v3Blob, 3) as Record<string, unknown>;

    expect((result['records'] as unknown[]).length).toBe(1);
    expect(result['activations']).toEqual([]);
    // Prior expectations preserved (not blown away).
    expect(result['expectationsByProject']).toEqual({
      'proj-A': { 'tmpl-1': { count: 2, per: 'season' } },
    });
    // New slice initialized empty.
    expect(result['instantiatedObjectiveIds']).toEqual({});
  });

  it('migrates a v1 blob through to v4: every newer slice is initialized', () => {
    const migrate = useProtocolStore.persist.getOptions().migrate;
    if (!migrate) throw new Error('migrate fn not found on persist options');

    const v1Blob = {
      records: [
        {
          templateId: 'tmpl-1',
          projectId: 'proj-A',
          status: 'active',
          activatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const result = migrate(v1Blob, 1) as Record<string, unknown>;

    expect((result['records'] as unknown[]).length).toBe(1);
    expect(result['activations']).toEqual([]);
    expect(result['expectationsByProject']).toEqual({});
    expect(result['instantiatedObjectiveIds']).toEqual({});
  });
});
