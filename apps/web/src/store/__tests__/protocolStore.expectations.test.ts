// @vitest-environment happy-dom
/**
 * protocolStore - expectationsByProject slice (persist v3 / T1.3).
 *
 * expectedRate is template-keyed (projectId, templateId) metadata read by the
 * deviation engine alongside activations. Co-located in protocolStore because
 * both live there, NOT in planStratumStore (which is objective-keyed).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useProtocolStore,
  selectExpectation,
} from '../protocolStore.js';

function reset(): void {
  useProtocolStore.setState({
    records: [],
    activations: [],
    expectationsByProject: {},
  });
  window.localStorage.clear();
}

describe('protocolStore - setExpectation / selectExpectation', () => {
  beforeEach(() => reset());

  it('stores and retrieves a rate via selectExpectation', () => {
    const { setExpectation } = useProtocolStore.getState();
    setExpectation('p1', 'emergency-destocking', { count: 2, per: 'season' });

    const state = useProtocolStore.getState();
    const result = selectExpectation(state, 'p1', 'emergency-destocking');
    expect(result).toEqual({ count: 2, per: 'season' });
  });

  it('setting p1/templateA does not disturb p1/templateB or p2/templateA', () => {
    const { setExpectation } = useProtocolStore.getState();
    setExpectation('p1', 'template-A', { count: 3, per: 'cycle' });
    setExpectation('p1', 'template-B', { count: 1, per: 'season' });
    setExpectation('p2', 'template-A', { count: 5, per: 'cycle' });

    // now overwrite p1/template-A
    setExpectation('p1', 'template-A', { count: 99, per: 'season' });

    const s = useProtocolStore.getState();
    expect(selectExpectation(s, 'p1', 'template-A')).toEqual({ count: 99, per: 'season' });
    // p1/template-B unchanged
    expect(selectExpectation(s, 'p1', 'template-B')).toEqual({ count: 1, per: 'season' });
    // p2/template-A unchanged
    expect(selectExpectation(s, 'p2', 'template-A')).toEqual({ count: 5, per: 'cycle' });
  });

  it('returns undefined for an unknown (projectId, templateId) pair', () => {
    const s = useProtocolStore.getState();
    expect(selectExpectation(s, 'no-such-project', 'no-such-template')).toBeUndefined();
  });
});

describe('protocolStore - persist v3 migration', () => {
  it('migrates v2 blob: preserves records + activations, adds expectationsByProject: {}', () => {
    // Access the internal migrate function by checking the persist config.
    // Zustand persist exposes the options via useStore.persist?.getOptions?.() or
    // we can reach it by accessing the middleware internals. The canonical pattern
    // used in this codebase is to call useStore.persist.clearStorage / getOptions.
    // If that path is unavailable, we call the action through a store reset.
    //
    // Zustand 5 persist middleware exposes .persist.getOptions() on the store.
    // Cast through unknown to avoid TS errors on internal API.
    const options = (useProtocolStore as unknown as {
      persist: { getOptions: () => { migrate?: (persisted: unknown, fromVersion: number) => unknown };
    };
    }).persist.getOptions();

    const migrate = options.migrate;
    if (!migrate) throw new Error('migrate fn not found on persist options');

    const v2Blob = {
      records: [
        {
          templateId: 'tmpl-1',
          projectId: 'proj-A',
          status: 'active',
          activatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      activations: [
        {
          id: 'act-1',
          projectId: 'proj-A',
          templateId: 'tmpl-1',
          severityTier: 'respond',
          confirmationStatus: 'confirmed',
          recipeSnapshot: { name: 'x', condition: 'y', response: 'z' },
          activatedAt: '2026-01-01T00:00:00.000Z',
          triggerContext: 'act_proof_capture',
        },
      ],
    };

    const result = migrate(v2Blob, 2) as Record<string, unknown>;

    // Must preserve existing slices
    expect(Array.isArray(result['records'])).toBe(true);
    expect((result['records'] as unknown[]).length).toBe(1);
    expect(Array.isArray(result['activations'])).toBe(true);
    expect((result['activations'] as unknown[]).length).toBe(1);
    // Must gain the new slice initialized to empty object
    expect(result['expectationsByProject']).toEqual({});
  });
});
