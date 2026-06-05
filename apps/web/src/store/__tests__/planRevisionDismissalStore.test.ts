// @vitest-environment happy-dom
/**
 * planRevisionDismissalStore — Phase 4 Slice 4.4 substrate.
 *
 * Covers: per-project isolation, dismiss timestamp shape, reset
 * behaviour, idempotent reset on never-dismissed projects.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usePlanRevisionDismissalStore } from '../planRevisionDismissalStore.js';

function reset(): void {
  usePlanRevisionDismissalStore.setState({ byProject: {} });
}

const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('planRevisionDismissalStore', () => {
  beforeEach(reset);

  it('getLastDismissedAt defaults to null for an untouched project', () => {
    expect(
      usePlanRevisionDismissalStore.getState().getLastDismissedAt('p1'),
    ).toBeNull();
  });

  it('dismiss stamps an ISO timestamp readable by getLastDismissedAt', () => {
    usePlanRevisionDismissalStore.getState().dismiss('p1');
    const value = usePlanRevisionDismissalStore
      .getState()
      .getLastDismissedAt('p1');
    expect(value).not.toBeNull();
    expect(value).toMatch(ISO_REGEX);
  });

  it('dismiss is per-project — touching p1 does not affect p2', () => {
    usePlanRevisionDismissalStore.getState().dismiss('p1');
    expect(
      usePlanRevisionDismissalStore.getState().getLastDismissedAt('p2'),
    ).toBeNull();
  });

  it('a second dismiss overwrites the prior cursor', async () => {
    usePlanRevisionDismissalStore.getState().dismiss('p1');
    const first = usePlanRevisionDismissalStore
      .getState()
      .getLastDismissedAt('p1');
    // tick the clock so the second timestamp is strictly later
    await new Promise((resolve) => setTimeout(resolve, 5));
    usePlanRevisionDismissalStore.getState().dismiss('p1');
    const second = usePlanRevisionDismissalStore
      .getState()
      .getLastDismissedAt('p1');
    expect(second).not.toBeNull();
    expect(Date.parse(second!)).toBeGreaterThanOrEqual(Date.parse(first!));
  });

  it('reset clears the cursor and getLastDismissedAt returns null', () => {
    usePlanRevisionDismissalStore.getState().dismiss('p1');
    usePlanRevisionDismissalStore.getState().reset('p1');
    expect(
      usePlanRevisionDismissalStore.getState().getLastDismissedAt('p1'),
    ).toBeNull();
  });

  it('reset on a never-dismissed project is a no-op (does not insert key)', () => {
    usePlanRevisionDismissalStore.getState().reset('never-dismissed');
    expect(usePlanRevisionDismissalStore.getState().byProject).toEqual({});
  });

  it('reset only clears the targeted project — siblings retained', () => {
    usePlanRevisionDismissalStore.getState().dismiss('p1');
    usePlanRevisionDismissalStore.getState().dismiss('p2');
    usePlanRevisionDismissalStore.getState().reset('p1');
    const state = usePlanRevisionDismissalStore.getState();
    expect(state.getLastDismissedAt('p1')).toBeNull();
    expect(state.getLastDismissedAt('p2')).not.toBeNull();
  });
});
