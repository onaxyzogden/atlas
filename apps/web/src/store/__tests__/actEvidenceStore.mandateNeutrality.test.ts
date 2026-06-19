// @vitest-environment happy-dom
/**
 * actEvidenceStore -- Threshold-3 (Act Mandate) NEUTRALITY guard.
 *
 * REGRESSION GUARD, NOT a lock test. The capture mutators deliberately do NOT
 * consult the Act Mandate lock. `planReadOnly` is a SURFACE policy enforced at
 * the render + route layers (which know the calling surface), never at this
 * shared store. The Act execution loop writes these maps AFTER Begin Act:
 * ActTierShell.tsx calls `saveVisionForm` / `saveVisionFormData` as the steward
 * fills tool popups in Act, and the shared decision workbench (rendered by both
 * shells) drives `updateNote` / `saveNote` / `saveDecisionRationale` /
 * `setDecisionDeferred`. A mutator-level mandate guard could not tell a Plan
 * write from an Act write and would freeze Act execution -- breaking the "Act
 * stays byte-identical" invariant.
 *
 * These tests pin that all six mutators keep writing while a mandate is armed.
 * Re-adding `isObjectivePlanLocked` to any of them fails here on purpose.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useActEvidenceStore } from '../actEvidenceStore.js';
import { useActMandateStore } from '../actMandateStore.js';
import type { FormValue } from '../../v3/act/tier-shell/actToolCatalog.js';

const PID = 'proj-lock';
const OBJ = 's1-vision';
const DESC = 'site-note';
const FORM = 's1-vision-c3';
const ITEM = 's7-capital';

function reset(): void {
  useActEvidenceStore.setState({
    byProject: {},
    visionForms: {},
    visionFormData: {},
    decisionRationale: {},
    deferredDecisions: {},
  });
  useActMandateStore.setState({ byProject: {} });
  window.localStorage.clear();
}

const ev = () => useActEvidenceStore.getState();
const mandate = () => useActMandateStore.getState();

describe('actEvidenceStore -- captures stay writable under an armed mandate', () => {
  beforeEach(() => reset());

  it('updateNote + saveNote still write (shared decision workbench in Act)', () => {
    mandate().beginAct(PID);
    ev().updateNote(PID, OBJ, DESC, 'a note');
    expect(ev().byProject[PID]?.[OBJ]?.notes[DESC]).toBe('a note');
    ev().saveNote(PID, OBJ, DESC);
    expect(ev().byProject[PID]?.[OBJ]?.notesSaved[DESC]).toBe(true);
  });

  it('saveVisionForm still writes (ActTierShell tool-popup capture)', () => {
    mandate().beginAct(PID);
    ev().saveVisionForm(PID, FORM, 'vision text');
    expect(ev().visionForms[PID]?.[FORM]).toBe('vision text');
  });

  it('saveVisionFormData still writes structured value + summary mirror', () => {
    mandate().beginAct(PID);
    const value: FormValue = { skills: ['fencing'] };
    ev().saveVisionFormData(PID, FORM, value, 'summary');
    expect(ev().visionFormData[PID]?.[FORM]).toEqual(value);
    expect(ev().visionForms[PID]?.[FORM]).toBe('summary');
  });

  it('saveDecisionRationale + setDecisionDeferred still write', () => {
    mandate().beginAct(PID);
    ev().saveDecisionRationale(PID, ITEM, 'because');
    expect(ev().decisionRationale[PID]?.[ITEM]).toBe('because');
    ev().setDecisionDeferred(PID, ITEM, true);
    expect(ev().deferredDecisions[PID]?.[ITEM]).toBe(true);
  });
});
