/**
 * @vitest-environment happy-dom
 *
 * buildHabitatFeatureEditSchema — Slice 8-E. Verifies the inline-editor
 * schema that exposes `habitatMetadata.hostTreeFeatureId` to the steward:
 *
 *   1. owl-box + two oak-tree points → host select lists both candidates.
 *   2. owl-box + no veg points → readonly select with the helper copy.
 *   3. brush-pile → host field absent (only mount-on-tree kinds carry it).
 *   4. save writes `hostTreeFeatureId` through; empty clears.
 *   5. snag exposes `approxHeightM` + `cavityCount` alongside the host.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { DesignElement } from '../../../../store/designElementsStore.js';
import { useLandDesignStore } from '../../../../store/landDesignStore.js';
import { updateDesignElement } from '../../../../store/builtEnvironmentSelectors.js';
import {
  buildHabitatFeatureEditSchema,
  habitatKindAcceptsHost,
  listHabitatHostCandidates,
} from '../inlineEditSchemas.js';

function treePoint(over: Partial<DesignElement> & { id: string; kind: string }): DesignElement {
  return {
    category: 'vegetation',
    geometry: { type: 'Point', coordinates: [0, 0] },
    phase: 'trees',
    createdAt: '2026-05-21T00:00:00.000Z',
    ...over,
  } as DesignElement;
}

function habitatPoint(
  over: Partial<DesignElement> & { id: string; kind: string },
): DesignElement {
  return {
    category: 'habitat',
    geometry: { type: 'Point', coordinates: [0, 0] },
    phase: 'trees',
    createdAt: '2026-05-21T00:00:00.000Z',
    ...over,
  } as DesignElement;
}

beforeEach(() => {
  localStorage.clear();
  useLandDesignStore.setState({ byProject: {} });
});

describe('habitatKindAcceptsHost', () => {
  it('returns true for the four mount-on-tree kinds', () => {
    expect(habitatKindAcceptsHost('owl-box')).toBe(true);
    expect(habitatKindAcceptsHost('raptor-perch')).toBe(true);
    expect(habitatKindAcceptsHost('nest-box')).toBe(true);
    expect(habitatKindAcceptsHost('snag')).toBe(true);
  });

  it('returns false for ground / line / polygon habitat kinds', () => {
    expect(habitatKindAcceptsHost('brush-pile')).toBe(false);
    expect(habitatKindAcceptsHost('insectary-strip')).toBe(false);
    expect(habitatKindAcceptsHost('wetland-edge')).toBe(false);
  });
});

describe('listHabitatHostCandidates', () => {
  it('returns only vegetation-category tree-planting points', () => {
    const list = listHabitatHostCandidates([
      treePoint({ id: 'oak1', kind: 'oak-tree', label: 'North oak' }),
      treePoint({ id: 'pine1', kind: 'pine-tree' }),
      treePoint({ id: 'hr1', kind: 'hedgerow', geometry: {
        type: 'LineString', coordinates: [[0, 0], [0, 0.001]],
      } }),
      {
        id: 'pond1',
        category: 'water',
        kind: 'pond',
        geometry: { type: 'Point', coordinates: [0, 0] },
        phase: 'water',
        createdAt: '2026-05-21T00:00:00.000Z',
      } as DesignElement,
    ]);
    expect(list.map((o) => o.value)).toEqual(['oak1', 'pine1']);
    expect(list[0]!.label).toBe('Oak — North oak');
    expect(list[1]!.label).toBe('Pine');
  });
});

describe('buildHabitatFeatureEditSchema (owl-box)', () => {
  it('lists host candidates as select options when veg points exist', () => {
    const owl = habitatPoint({ id: 'owl1', kind: 'owl-box' });
    const schema = buildHabitatFeatureEditSchema(
      owl,
      'p1',
      updateDesignElement,
      [
        treePoint({ id: 'oak1', kind: 'oak-tree' }),
        treePoint({ id: 'pine1', kind: 'pine-tree' }),
        owl,
      ],
    );
    const hostField = schema.fields.find((f) => f.key === 'hostTreeFeatureId');
    expect(hostField).toBeDefined();
    expect(hostField?.readonly).not.toBe(true);
    const values = hostField!.options!.map((o) => o.value);
    expect(values).toContain('');
    expect(values).toContain('oak1');
    expect(values).toContain('pine1');
  });

  it('renders readonly helper option when no veg points exist', () => {
    const owl = habitatPoint({ id: 'owl1', kind: 'owl-box' });
    const schema = buildHabitatFeatureEditSchema(
      owl,
      'p1',
      updateDesignElement,
      [owl],
    );
    const hostField = schema.fields.find((f) => f.key === 'hostTreeFeatureId');
    expect(hostField).toBeDefined();
    expect(hostField?.readonly).toBe(true);
    expect(hostField!.options).toEqual([
      {
        value: '',
        label: 'Place an oak / pine / apple / shrub point first.',
      },
    ]);
  });
});

describe('buildHabitatFeatureEditSchema (brush-pile)', () => {
  it('does not surface the host field for non-mount-on-tree kinds', () => {
    const bp = habitatPoint({ id: 'bp1', kind: 'brush-pile' });
    const schema = buildHabitatFeatureEditSchema(
      bp,
      'p1',
      updateDesignElement,
      [treePoint({ id: 'oak1', kind: 'oak-tree' }), bp],
    );
    expect(schema.fields.find((f) => f.key === 'hostTreeFeatureId')).toBeUndefined();
  });
});

describe('buildHabitatFeatureEditSchema (snag)', () => {
  it('exposes approxHeightM + cavityCount alongside host picker', () => {
    const snag = habitatPoint({ id: 'snag1', kind: 'snag' });
    const schema = buildHabitatFeatureEditSchema(
      snag,
      'p1',
      updateDesignElement,
      [treePoint({ id: 'oak1', kind: 'oak-tree' }), snag],
    );
    const keys = schema.fields.map((f) => f.key);
    expect(keys).toContain('approxHeightM');
    expect(keys).toContain('cavityCount');
    expect(keys).toContain('hostTreeFeatureId');
  });
});

describe('buildHabitatFeatureEditSchema onSave', () => {
  it('writes hostTreeFeatureId through; empty string clears it', () => {
    const oak = treePoint({ id: 'oak1', kind: 'oak-tree' });
    const owl = habitatPoint({ id: 'owl1', kind: 'owl-box' });
    useLandDesignStore.setState({ byProject: { p1: [oak, owl] } });
    const designElements = useLandDesignStore.getState().byProject.p1!;

    // Set the host.
    const schema = buildHabitatFeatureEditSchema(
      owl,
      'p1',
      updateDesignElement,
      designElements,
    );
    schema.onSave({ ...schema.initial, hostTreeFeatureId: 'oak1' });
    let stored = useLandDesignStore
      .getState()
      .byProject.p1!.find((e) => e.id === 'owl1')!;
    expect(stored.habitatMetadata?.hostTreeFeatureId).toBe('oak1');

    // Clear the host.
    const schema2 = buildHabitatFeatureEditSchema(
      stored,
      'p1',
      updateDesignElement,
      designElements,
    );
    schema2.onSave({ ...schema2.initial, hostTreeFeatureId: '' });
    stored = useLandDesignStore
      .getState()
      .byProject.p1!.find((e) => e.id === 'owl1')!;
    expect(stored.habitatMetadata?.hostTreeFeatureId).toBeUndefined();
  });
});
