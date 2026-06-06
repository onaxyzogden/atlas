// @vitest-environment happy-dom
/**
 * actEvidenceStore -- structured vision form-value slice (SF3).
 *
 * Covers the additive `visionFormData` map and the `saveVisionFormData`
 * action, which persists a structured FormValue AND mirrors a human-readable
 * summary string into the legacy `visionForms` map (back-compat with the
 * existing "captured dot" / text readers). Also verifies a v1 persisted blob
 * (no `visionFormData`) rehydrates without error and yields {}.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useActEvidenceStore } from '../actEvidenceStore.js';
import type { FormValue } from '../../v3/act/tier-shell/actToolCatalog.js';

const PERSIST_KEY = 'ogden-act-evidence';

function reset(): void {
  useActEvidenceStore.setState({
    byProject: {},
    visionForms: {},
    visionFormData: {},
    decisionRationale: {},
    deferredDecisions: {},
  });
  window.localStorage.clear();
}

describe('actEvidenceStore.saveVisionFormData', () => {
  beforeEach(() => reset());

  it('writes the structured value under visionFormData[projectId][formId]', () => {
    const value: FormValue = {
      hoursPerWeek: '20',
      skills: ['fencing', 'irrigation'],
    };
    useActEvidenceStore
      .getState()
      .saveVisionFormData('proj-A', 's1-vision-labour', value, 'summary');

    const s = useActEvidenceStore.getState();
    expect(s.visionFormData['proj-A']!['s1-vision-labour']).toEqual(value);
  });

  it('mirrors summaryText into visionForms[projectId][formId]', () => {
    const value: FormValue = { purpose: 'Grow food' };
    useActEvidenceStore
      .getState()
      .saveVisionFormData('proj-A', 's1-vision-c1', value, 'Grow food for the household.');

    const s = useActEvidenceStore.getState();
    expect(s.visionForms['proj-A']!['s1-vision-c1']).toBe(
      'Grow food for the household.',
    );
  });

  it('a second formId under the same project does not clobber the first', () => {
    const st = useActEvidenceStore.getState();
    const v1: FormValue = { purpose: 'First' };
    const v2: FormValue = { criteria: ['a', 'b', 'c'] };
    st.saveVisionFormData('proj-A', 's1-vision-c1', v1, 'first summary');
    useActEvidenceStore
      .getState()
      .saveVisionFormData('proj-A', 's1-vision-c2', v2, 'second summary');

    const s = useActEvidenceStore.getState();
    expect(s.visionFormData['proj-A']!['s1-vision-c1']).toEqual(v1);
    expect(s.visionFormData['proj-A']!['s1-vision-c2']).toEqual(v2);
    expect(s.visionForms['proj-A']!['s1-vision-c1']).toBe('first summary');
    expect(s.visionForms['proj-A']!['s1-vision-c2']).toBe('second summary');
  });
});

describe('actEvidenceStore back-compat: saveVisionForm string path', () => {
  beforeEach(() => reset());

  it('still works and does NOT create a visionFormData entry', () => {
    useActEvidenceStore
      .getState()
      .saveVisionForm('proj-A', 's1-vision-c1', 'plain text');

    const s = useActEvidenceStore.getState();
    expect(s.visionForms['proj-A']!['s1-vision-c1']).toBe('plain text');
    expect(s.visionFormData['proj-A']).toBeUndefined();
  });
});

describe('actEvidenceStore.saveDecisionRationale', () => {
  beforeEach(() => reset());

  it('writes and reads back rationale text for (projectId, itemId)', () => {
    useActEvidenceStore
      .getState()
      .saveDecisionRationale('proj-A', 'item-1', 'because soil is wet');

    const s = useActEvidenceStore.getState();
    expect(s.decisionRationale['proj-A']!['item-1']).toBe('because soil is wet');
  });

  it('overwrites the rationale on a second call for the same item', () => {
    const st = useActEvidenceStore.getState();
    st.saveDecisionRationale('proj-A', 'item-1', 'first');
    useActEvidenceStore
      .getState()
      .saveDecisionRationale('proj-A', 'item-1', 'second');

    const s = useActEvidenceStore.getState();
    expect(s.decisionRationale['proj-A']!['item-1']).toBe('second');
  });

  it('keeps two itemIds under the same project coexisting', () => {
    const st = useActEvidenceStore.getState();
    st.saveDecisionRationale('proj-A', 'item-1', 'one');
    useActEvidenceStore
      .getState()
      .saveDecisionRationale('proj-A', 'item-2', 'two');

    const s = useActEvidenceStore.getState();
    expect(s.decisionRationale['proj-A']!['item-1']).toBe('one');
    expect(s.decisionRationale['proj-A']!['item-2']).toBe('two');
  });

  it('isolates rationale between two projects', () => {
    const st = useActEvidenceStore.getState();
    st.saveDecisionRationale('proj-A', 'item-1', 'A text');
    useActEvidenceStore
      .getState()
      .saveDecisionRationale('proj-B', 'item-1', 'B text');

    const s = useActEvidenceStore.getState();
    expect(s.decisionRationale['proj-A']!['item-1']).toBe('A text');
    expect(s.decisionRationale['proj-B']!['item-1']).toBe('B text');
  });

  it('does not disturb an existing visionForms value', () => {
    const st = useActEvidenceStore.getState();
    st.saveVisionForm('proj-A', 's1-vision-c1', 'plain text');
    useActEvidenceStore
      .getState()
      .saveDecisionRationale('proj-A', 'item-1', 'rationale');

    const s = useActEvidenceStore.getState();
    expect(s.visionForms['proj-A']!['s1-vision-c1']).toBe('plain text');
    expect(s.decisionRationale['proj-A']!['item-1']).toBe('rationale');
  });
});

describe('actEvidenceStore.setDecisionDeferred', () => {
  beforeEach(() => reset());

  it('sets the defer flag to true', () => {
    useActEvidenceStore.getState().setDecisionDeferred('proj-A', 'item-1', true);

    const s = useActEvidenceStore.getState();
    expect(s.deferredDecisions['proj-A']!['item-1']).toBe(true);
  });

  it('removes the key when set to false after true', () => {
    const st = useActEvidenceStore.getState();
    st.setDecisionDeferred('proj-A', 'item-1', true);
    useActEvidenceStore
      .getState()
      .setDecisionDeferred('proj-A', 'item-1', false);

    const s = useActEvidenceStore.getState();
    expect(s.deferredDecisions['proj-A']?.['item-1']).toBeUndefined();
  });

  it('does not throw when set to false on an absent key', () => {
    expect(() =>
      useActEvidenceStore
        .getState()
        .setDecisionDeferred('proj-A', 'never-set', false),
    ).not.toThrow();
    const s = useActEvidenceStore.getState();
    expect(s.deferredDecisions['proj-A']?.['never-set']).toBeUndefined();
  });
});

describe('actEvidenceStore persist lifecycle: v1 blob -> rehydrate', () => {
  beforeEach(() => reset());

  it('rehydrates a v1 blob (no visionFormData) without error, yielding {}', async () => {
    window.localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({
        state: {
          byProject: {
            'proj-A': {
              'obj-1': {
                photos: { 'd-1': 2 },
                confirms: {},
                notes: {},
                notesSaved: {},
              },
            },
          },
          visionForms: { 'proj-A': { 's1-vision-c1': 'legacy text' } },
        },
        version: 1,
      }),
    );

    await useActEvidenceStore.persist.rehydrate();

    const s = useActEvidenceStore.getState();
    expect(s.visionFormData).toEqual({});
    expect(typeof s.visionFormData).toBe('object');
    // Legacy fields survive rehydration unchanged.
    expect(s.visionForms['proj-A']!['s1-vision-c1']).toBe('legacy text');
    expect(s.byProject['proj-A']!['obj-1']!.photos['d-1']).toBe(2);
  });
});

describe('actEvidenceStore persist lifecycle: v2 blob -> rehydrate', () => {
  beforeEach(() => reset());

  it('rehydrates a v2 blob (no new fields) yielding {} for both new maps', async () => {
    window.localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({
        state: {
          byProject: {},
          visionForms: { 'proj-A': { 's1-vision-c1': 'legacy text' } },
          visionFormData: { 'proj-A': { 's1-vision-c1': { purpose: 'x' } } },
        },
        version: 2,
      }),
    );

    await useActEvidenceStore.persist.rehydrate();

    const s = useActEvidenceStore.getState();
    expect(s.decisionRationale).toEqual({});
    expect(s.deferredDecisions).toEqual({});
    // Pre-existing v2 fields survive rehydration unchanged.
    expect(s.visionForms['proj-A']!['s1-vision-c1']).toBe('legacy text');
    expect(s.visionFormData['proj-A']!['s1-vision-c1']).toEqual({
      purpose: 'x',
    });
  });
});
