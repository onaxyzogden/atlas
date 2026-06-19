// @vitest-environment happy-dom
/**
 * planStratumStore -- Threshold-3 (Act Mandate) NEUTRALITY guard.
 *
 * REGRESSION GUARD, NOT a lock test. planStratumStore mutators deliberately do
 * NOT consult the Act Mandate lock. `planReadOnly` is a SURFACE policy (the Plan
 * design surfaces are read-only after Begin Act; the Act execution surfaces stay
 * writable) and is enforced where the calling surface is known -- the render
 * layer (`useObjectivePlanLock`, Stage 5) and the route loader (Stage 6). This
 * store is SHARED with the Act execution loop: ActTierShell.tsx calls
 * `setItemComplete(projectId, objectiveId, formId)` to mark execution-checklist
 * items as the steward captures field work AFTER Begin Act. A store-layer guard
 * keyed on the mandate could not tell a Plan write from an Act write (identical
 * projectId+objectiveId+itemId) and would freeze the Act execution loop,
 * breaking the "Act stays byte-identical" invariant.
 *
 * These tests pin that the three checklist mutators keep writing while a mandate
 * is armed. If someone re-adds `isObjectivePlanLocked` to these mutators, they
 * fail loudly -- that is the point.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usePlanStratumProgressStore } from '../planStratumStore.js';
import {
  useActMandateStore,
  isObjectivePlanLocked,
} from '../actMandateStore.js';

const PID = 'proj-lock';
const OBJ = 's1-vision';

function reset(): void {
  usePlanStratumProgressStore.setState({
    byProject: {},
    celebratedByProject: {},
    deferredByProject: {},
    valuesByProject: {},
  });
  useActMandateStore.setState({ byProject: {} });
  window.localStorage.clear();
}

const plan = () => usePlanStratumProgressStore.getState();
const mandate = () => useActMandateStore.getState();
const completed = (objectiveId = OBJ) =>
  plan().getCompletedItemIds(PID, objectiveId);

describe('planStratumStore -- mutators stay writable under an armed mandate', () => {
  beforeEach(() => reset());

  it('setItemComplete still records (Act execution loop must keep working)', () => {
    mandate().beginAct(PID);
    plan().setItemComplete(PID, OBJ, 's1-vision-c1');
    expect(completed()).toEqual(['s1-vision-c1']);
  });

  it('toggleItem still toggles under the mandate', () => {
    mandate().beginAct(PID);
    plan().toggleItem(PID, OBJ, 's1-vision-c1');
    expect(completed()).toEqual(['s1-vision-c1']);
    plan().toggleItem(PID, OBJ, 's1-vision-c1');
    expect(completed()).toEqual([]);
  });

  it('clearItemComplete still removes under the mandate', () => {
    plan().setItemComplete(PID, OBJ, 's1-vision-c1');
    mandate().beginAct(PID);
    plan().clearItemComplete(PID, OBJ, 's1-vision-c1');
    expect(completed()).toEqual([]);
  });
});

/**
 * The route loader (routes/index.tsx beforeLoad) reads `isObjectivePlanLocked`
 * to inject `planReadOnly` into Plan-objective route context (additive, no
 * redirect). Pin its objective-level lift awareness so that contract holds.
 */
describe('isObjectivePlanLocked -- route-loader lock read', () => {
  beforeEach(() => reset());

  it('is false with no mandate, true once armed, false again after a lift', () => {
    expect(isObjectivePlanLocked(PID, OBJ)).toBe(false);
    mandate().beginAct(PID);
    expect(isObjectivePlanLocked(PID, OBJ)).toBe(true);
    mandate().liftLock(PID, OBJ);
    expect(isObjectivePlanLocked(PID, OBJ)).toBe(false); // governance lift reopens
    mandate().relock(PID, OBJ);
    expect(isObjectivePlanLocked(PID, OBJ)).toBe(true); // re-frozen
  });

  it('locks a sibling objective while one is lifted (project-global flag)', () => {
    mandate().beginAct(PID);
    mandate().liftLock(PID, OBJ);
    expect(isObjectivePlanLocked(PID, OBJ)).toBe(false);
    expect(isObjectivePlanLocked(PID, 's2-land-baseline')).toBe(true);
  });
});
