/**
 * H6 (deep-audit 2026-07-03): clicking a locked objective in the Operations Hub
 * navigated into `act/ops/$objectiveId`, whose beforeLoad bounced it straight
 * back to the bare hub — a silent dead-click. `selectObjective` resolves the
 * click BEFORE navigating so a locked (or unknown) objective is blocked with
 * feedback instead. The "unknown id => locked" default mirrors the route guard
 * exactly, so the hub and the route can never disagree about what is openable.
 */
import { describe, expect, it, vi } from 'vitest';
import type { PlanStratumObjectiveStatusMap } from '@ogden/shared';
import { isObjectiveLocked, selectObjective } from '../objectiveSelection.js';

const STATUSES: PlanStratumObjectiveStatusMap = {
  'obj-open': 'available',
  'obj-active': 'active',
  'obj-done': 'complete',
  'obj-locked': 'locked',
  'obj-deferred': 'deferred',
};

describe('isObjectiveLocked (H6)', () => {
  it('is true for a locked objective', () => {
    expect(isObjectiveLocked(STATUSES, 'obj-locked')).toBe(true);
  });

  it('defaults an unknown objective id to locked (route-guard parity)', () => {
    expect(isObjectiveLocked(STATUSES, 'not-in-the-map')).toBe(true);
  });

  it('is false for available / active / complete objectives', () => {
    expect(isObjectiveLocked(STATUSES, 'obj-open')).toBe(false);
    expect(isObjectiveLocked(STATUSES, 'obj-active')).toBe(false);
    expect(isObjectiveLocked(STATUSES, 'obj-done')).toBe(false);
  });

  it('is false for a deferred objective — the route guard only blocks locked', () => {
    expect(isObjectiveLocked(STATUSES, 'obj-deferred')).toBe(false);
  });
});

describe('selectObjective (H6)', () => {
  it('opens an available objective and does not signal locked', () => {
    const open = vi.fn();
    const locked = vi.fn();
    selectObjective('obj-open', 'proj-1', STATUSES, { open, locked });
    expect(open).toHaveBeenCalledWith('proj-1', 'obj-open');
    expect(locked).not.toHaveBeenCalled();
  });

  it('blocks a locked objective with feedback and never navigates', () => {
    const open = vi.fn();
    const locked = vi.fn();
    selectObjective('obj-locked', 'proj-1', STATUSES, { open, locked });
    expect(locked).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
  });

  it('treats an unknown objective id as locked (no dead navigation)', () => {
    const open = vi.fn();
    const locked = vi.fn();
    selectObjective('ghost', 'proj-1', STATUSES, { open, locked });
    expect(locked).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
  });

  it('no-ops without a project id — neither opens nor signals locked', () => {
    const open = vi.fn();
    const locked = vi.fn();
    selectObjective('obj-open', undefined, STATUSES, { open, locked });
    expect(open).not.toHaveBeenCalled();
    expect(locked).not.toHaveBeenCalled();
  });
});
