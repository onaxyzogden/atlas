import { describe, it, expect } from 'vitest';
import type { WorkItem } from '@ogden/shared';
import type { DesignElement } from '../../../store/designElementsStore.js';
import { collectStewardshipCitations } from '../stewardshipCitations.js';

const NOW = '2026-05-21T00:00:00.000Z';

function el(over: Partial<DesignElement> & { id: string; kind: string }): DesignElement {
  return {
    category: 'habitat',
    geometry: { type: 'Point', coordinates: [0, 0] },
    phase: 'trees',
    createdAt: NOW,
    ...over,
  } as DesignElement;
}

function workItem(over: Partial<WorkItem> & { id: string }): WorkItem {
  return {
    projectId: 'p1',
    source: 'manual',
    overridden: false,
    createdAt: NOW,
    updatedAt: NOW,
    title: 'wi',
    phaseId: null,
    status: 'todo',
    doneAt: null,
    dependsOn: [],
    dependsOnAuto: [],
    precedesAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    ...over,
  };
}

// Minimal injected catalogs (only the fields the collector reads).
const habitatCatalog = [
  {
    kind: 'owl-box',
    sources: [
      { kind: 'extension', org: 'cornell-nestwatch', ref: 'Cornell NestWatch ref' },
      { kind: 'nrcs-practice', code: 'CP649', ref: 'NRCS CPS 649' },
    ],
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any;

const agroforestryCatalog = [
  {
    kind: 'hedgerow',
    sources: [{ kind: 'nrcs-practice', code: 'CP422', ref: 'NRCS CPS 422' }],
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any;

describe('collectStewardshipCitations', () => {
  it('normalizes nrcs-practice (label=code) and extension (label=org) sources', () => {
    const result = collectStewardshipCitations({
      projectId: 'p1',
      items: [
        workItem({ id: 'hf__a', source: 'habitat-feature', generatedFromHabitatElement: 'el-a' }),
      ],
      designElements: [el({ id: 'el-a', kind: 'owl-box' })],
      habitatCatalog,
    });
    expect(result).toEqual([
      { kind: 'extension', label: 'cornell-nestwatch', ref: 'Cornell NestWatch ref' },
      { kind: 'nrcs-practice', label: 'CP649', ref: 'NRCS CPS 649' },
    ]);
  });

  it('dedupes citations across repeated kinds (by kind + ref)', () => {
    const result = collectStewardshipCitations({
      projectId: 'p1',
      items: [
        workItem({ id: 'hf__a', source: 'habitat-feature', generatedFromHabitatElement: 'el-a' }),
        workItem({ id: 'hf__b', source: 'habitat-feature', generatedFromHabitatElement: 'el-b' }),
      ],
      designElements: [
        el({ id: 'el-a', kind: 'owl-box' }),
        el({ id: 'el-b', kind: 'owl-box' }),
      ],
      habitatCatalog,
    });
    // Two owl-boxes share the same two sources → deduped to two citations.
    expect(result).toHaveLength(2);
  });

  it('cites only the programs that actually placed an element', () => {
    const result = collectStewardshipCitations({
      projectId: 'p1',
      items: [
        workItem({ id: 'hf__a', source: 'habitat-feature', generatedFromHabitatElement: 'el-a' }),
      ],
      designElements: [el({ id: 'el-a', kind: 'owl-box' })],
      habitatCatalog,
      agroforestryCatalog, // present in args, but no agroforestry items placed
    });
    // No agroforestry item → no agroforestry citation.
    expect(result.some((c) => c.ref === 'NRCS CPS 422')).toBe(false);
    expect(result).toHaveLength(2);
  });

  it('ignores cross-project, wrong-source, and orphan items', () => {
    const result = collectStewardshipCitations({
      projectId: 'p1',
      items: [
        workItem({ id: 'm1', source: 'manual' }),
        workItem({
          id: 'hf__other',
          projectId: 'p-other',
          source: 'habitat-feature',
          generatedFromHabitatElement: 'el-a',
        }),
        workItem({ id: 'hf__nada', source: 'habitat-feature' }),
        workItem({
          id: 'hf__ghost',
          source: 'habitat-feature',
          generatedFromHabitatElement: 'el-missing',
        }),
      ],
      designElements: [el({ id: 'el-a', kind: 'owl-box' })],
      habitatCatalog,
    });
    expect(result).toEqual([]);
  });
});
