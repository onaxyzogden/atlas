/**
 * @vitest-environment happy-dom
 *
 * buildLineFeatureEditSchema — inline-editor schema for the plain line
 * DesignElement kinds (hedgerow / path / road). Verifies:
 *
 *   1. The schema exposes a `widthM` (number, suffix m) field + a `label`
 *      field, and the placeholder reflects the kind's catalog `defaultWidthM`.
 *   2. Title is the catalog label for the kind.
 *   3. onSave round-trips a positive `widthM` into the DesignElement.
 *   4. Blank / zero / negative `widthM` saves `undefined` (clears the override
 *      → catalog default).
 *   5. Label persists; blank label clears it.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { DesignElement } from '../../../../store/designElementsStore.js';
import { useLandDesignStore } from '../../../../store/landDesignStore.js';
import { updateDesignElement } from '../../../../store/builtEnvironmentSelectors.js';
import { buildLineFeatureEditSchema } from '../inlineEditSchemas.js';

function lineEl(
  over: Partial<DesignElement> & { id: string; kind: string; category: DesignElement['category'] },
): DesignElement {
  return {
    geometry: { type: 'LineString', coordinates: [[0, 0], [0, 0.001]] },
    phase: 'access',
    createdAt: '2026-05-21T00:00:00.000Z',
    ...over,
  } as DesignElement;
}

beforeEach(() => {
  localStorage.clear();
  useLandDesignStore.setState({ byProject: {} });
});

describe('buildLineFeatureEditSchema (fields)', () => {
  it('exposes widthM + label fields with catalog default placeholder', () => {
    const hr = lineEl({ id: 'hr1', kind: 'hedgerow', category: 'vegetation' });
    const schema = buildLineFeatureEditSchema(hr, 'p1', updateDesignElement);
    const keys = schema.fields.map((f) => f.key);
    expect(keys).toEqual(['widthM', 'label']);
    const widthField = schema.fields.find((f) => f.key === 'widthM')!;
    expect(widthField.kind).toBe('number');
    expect(widthField.suffix).toBe('m');
    expect(widthField.placeholder).toBe('2'); // hedgerow defaultWidthM 2.0
    expect(schema.title).toBe('Edit Hedgerow');
  });

  it('reflects path / road catalog defaults in the placeholder + title', () => {
    const path = buildLineFeatureEditSchema(
      lineEl({ id: 'pa1', kind: 'path', category: 'access' }),
      'p1',
      updateDesignElement,
    );
    expect(path.fields.find((f) => f.key === 'widthM')!.placeholder).toBe('0.8');
    expect(path.title).toBe('Edit Path');

    const road = buildLineFeatureEditSchema(
      lineEl({ id: 'ro1', kind: 'road', category: 'access' }),
      'p1',
      updateDesignElement,
    );
    expect(road.fields.find((f) => f.key === 'widthM')!.placeholder).toBe('4');
    expect(road.title).toBe('Edit Road');
  });

  it('seeds initial values from the element', () => {
    const hr = lineEl({
      id: 'hr1',
      kind: 'hedgerow',
      category: 'vegetation',
      widthM: 3.5,
      label: 'North hedge',
    });
    const schema = buildLineFeatureEditSchema(hr, 'p1', updateDesignElement);
    expect(schema.initial.widthM).toBe(3.5);
    expect(schema.initial.label).toBe('North hedge');
  });
});

describe('buildLineFeatureEditSchema onSave', () => {
  it('round-trips a positive widthM into the DesignElement', () => {
    const hr = lineEl({ id: 'hr1', kind: 'hedgerow', category: 'vegetation' });
    useLandDesignStore.setState({ byProject: { p1: [hr] } });
    const schema = buildLineFeatureEditSchema(hr, 'p1', updateDesignElement);
    schema.onSave({ ...schema.initial, widthM: 4, label: 'Windbreak' });
    const stored = useLandDesignStore
      .getState()
      .byProject.p1!.find((e) => e.id === 'hr1')!;
    expect(stored.widthM).toBe(4);
    expect(stored.label).toBe('Windbreak');
  });

  it('clears widthM when blank / zero / negative', () => {
    const hr = lineEl({
      id: 'hr1',
      kind: 'hedgerow',
      category: 'vegetation',
      widthM: 2,
    });
    useLandDesignStore.setState({ byProject: { p1: [hr] } });

    for (const bad of ['', 0, -1]) {
      const stored0 = useLandDesignStore
        .getState()
        .byProject.p1!.find((e) => e.id === 'hr1')!;
      const schema = buildLineFeatureEditSchema(stored0, 'p1', updateDesignElement);
      schema.onSave({ ...schema.initial, widthM: bad });
      const stored = useLandDesignStore
        .getState()
        .byProject.p1!.find((e) => e.id === 'hr1')!;
      expect(stored.widthM).toBeUndefined();
    }
  });

  it('clears the label when blank', () => {
    const hr = lineEl({
      id: 'hr1',
      kind: 'hedgerow',
      category: 'vegetation',
      label: 'Old name',
    });
    useLandDesignStore.setState({ byProject: { p1: [hr] } });
    const schema = buildLineFeatureEditSchema(hr, 'p1', updateDesignElement);
    schema.onSave({ ...schema.initial, label: '   ' });
    const stored = useLandDesignStore
      .getState()
      .byProject.p1!.find((e) => e.id === 'hr1')!;
    expect(stored.label).toBeUndefined();
  });
});
