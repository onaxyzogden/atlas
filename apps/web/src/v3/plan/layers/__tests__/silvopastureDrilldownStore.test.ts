/**
 * @vitest-environment happy-dom
 *
 * silvopastureDrilldownStore — bus state-transition tests. Slice M.
 *
 * Covers the contract `PlanLayout` + `HostUnionDrilldownCard` rely on:
 *   - requestOpenAudit populates targetHostId + pendingOpenModule
 *   - consumePendingOpen returns the request and clears the pending
 *     slot so a remount doesn't re-fire the slide-up open
 *   - clearTarget resets targetHostId (called on slide-up close)
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useSilvopastureDrilldownStore } from '../silvopastureDrilldownStore.js';

describe('silvopastureDrilldownStore', () => {
  beforeEach(() => {
    useSilvopastureDrilldownStore.setState({
      targetHostId: null,
      pendingOpenModule: null,
    });
  });

  it('requestOpenAudit populates targetHostId + pendingOpenModule', () => {
    useSilvopastureDrilldownStore.getState().requestOpenAudit('host-42');
    const s = useSilvopastureDrilldownStore.getState();
    expect(s.targetHostId).toBe('host-42');
    expect(s.pendingOpenModule).toEqual({
      module: 'livestock',
      sectionId: 'plan-silvopasture-integration',
      targetHostId: 'host-42',
    });
  });

  it('consumePendingOpen returns the request and clears pendingOpenModule', () => {
    useSilvopastureDrilldownStore.getState().requestOpenAudit('host-7');
    const consumed = useSilvopastureDrilldownStore
      .getState()
      .consumePendingOpen();
    expect(consumed?.targetHostId).toBe('host-7');
    expect(
      useSilvopastureDrilldownStore.getState().pendingOpenModule,
    ).toBeNull();
    // targetHostId persists past consumption — it's the
    // SilvopastureIntegrationCard's read source for the
    // scroll + highlight. Only clearTarget should reset it.
    expect(useSilvopastureDrilldownStore.getState().targetHostId).toBe(
      'host-7',
    );
  });

  it('clearTarget resets targetHostId', () => {
    useSilvopastureDrilldownStore.getState().requestOpenAudit('host-9');
    useSilvopastureDrilldownStore.getState().clearTarget();
    expect(useSilvopastureDrilldownStore.getState().targetHostId).toBeNull();
  });

  it('moduleHint + sectionId overrides flow through the pending payload', () => {
    useSilvopastureDrilldownStore
      .getState()
      .requestOpenAudit('host-3', 'plant-systems', 'custom-section');
    expect(useSilvopastureDrilldownStore.getState().pendingOpenModule).toEqual(
      {
        module: 'plant-systems',
        sectionId: 'custom-section',
        targetHostId: 'host-3',
      },
    );
  });
});
