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
