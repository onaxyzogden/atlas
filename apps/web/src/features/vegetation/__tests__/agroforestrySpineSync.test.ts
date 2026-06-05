/**
 * @vitest-environment happy-dom
 *
 * agroforestrySpineSync — Slice 8-C end-to-end seeder tests.
 *
 * Covers:
 *   1. One WorkItem per hedgerow / orchard / silvopasture with stable
 *      `agf__<id>`, correct verb-led title, designLayer 'vegetation'.
 *   2. Cost band + labor scale with geometry (line-length / area).
 *   3. Geometry-type guard: hedgerow polygon ignored; orchard line
 *      ignored.
 *   4. Non-agroforestry kinds ignored (oak-tree point, owl-box habitat).
 *   5. Cross-source preservation under push.
 *   6. Override preservation under re-push.
 *   7. Removed DesignElement clears its WorkItem on next push.
 *   8. Idempotent re-run.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { WorkItem } from '@ogden/shared';
import type { DesignElement } from '../../../store/designElementsStore.js';
import { useLandDesignStore } from '../../../store/landDesignStore.js';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import {
  AGROFORESTRY_KINDS,
  agroforestryProvenanceId,
  pushAgroforestryToSpine,
  seedAgroforestryWorkItems,
} from '../agroforestrySpineSync.js';
import { AGROFORESTRY_CATALOG } from '../agroforestryCatalog.js';

// Approx 1° longitude at the equator ≈ 111,319.49 m. Two points
// 0.0010 ° apart give a polyline length close to 111.32 m.
function hedgerowLine(over: { id: string; lengthDeg?: number }): DesignElement {
  const len = over.lengthDeg ?? 0.001;
  return {
    id: over.id,
    category: 'vegetation',
    kind: 'hedgerow',
    geometry: {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [len, 0],
      ],
    },
    phase: 'trees',
    createdAt: '2026-05-21T00:00:00.000Z',
  } as DesignElement;
}

// A ~tiny square polygon. Coordinates in degrees; area projects via
// safePolygonAreaM2 → ~m² scale.
function polygonElement(over: {
  id: string;
  kind: 'orchard' | 'silvopasture';
  sideDeg?: number;
}): DesignElement {
  const s = over.sideDeg ?? 0.0001;
  return {
    id: over.id,
    category: 'grazing',
    kind: over.kind,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [s, 0],
          [s, s],
          [0, s],
          [0, 0],
        ],
      ],
    },
    phase: 'trees',
    createdAt: '2026-05-21T00:00:00.000Z',
  } as DesignElement;
}

function treePoint(over: { id: string; kind: string }): DesignElement {
  return {
    id: over.id,
    category: 'vegetation',
    kind: over.kind,
    geometry: { type: 'Point', coordinates: [0, 0] },
    phase: 'trees',
    createdAt: '2026-05-21T00:00:00.000Z',
  } as DesignElement;
}

function manualWorkItem(over: Partial<WorkItem> & { id: string }): WorkItem {
  return {
    projectId: 'p1',
    source: 'manual',
    overridden: false,
    createdAt: '2026-05-21T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
    title: 'manual',
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

beforeEach(() => {
  localStorage.clear();
  useLandDesignStore.setState({ byProject: {} });
  useWorkItemStore.setState({ items: [] });
});

describe('seedAgroforestryWorkItems (pure)', () => {
  it('emits one WorkItem per agroforestry kind with stable ids + titles', () => {
    const elements: DesignElement[] = [
      hedgerowLine({ id: 'h1' }),
      polygonElement({ id: 'o1', kind: 'orchard' }),
      polygonElement({ id: 's1', kind: 'silvopasture' }),
    ];
    const result = seedAgroforestryWorkItems({
      projectId: 'p1',
      designElements: elements,
      now: () => '2026-05-21T00:00:00.000Z',
    });
    expect(result.length).toBe(AGROFORESTRY_KINDS.length);
    for (const it of result) {
      expect(it.source).toBe('agroforestry');
      expect(it.id.startsWith('agf__')).toBe(true);
      expect(it.designLayer).toBe('vegetation');
      expect(it.phaseId).toBeNull();
      expect(it.overridden).toBe(false);
    }
    expect(
      result.find((i) => i.id === agroforestryProvenanceId('h1'))!.title,
    ).toBe('Plant hedgerow');
    expect(
      result.find((i) => i.id === agroforestryProvenanceId('o1'))!.title,
    ).toBe('Establish orchard');
    expect(
      result.find((i) => i.id === agroforestryProvenanceId('s1'))!.title,
    ).toBe('Establish silvopasture');
  });

  it('hedgerow cost + labor scale with line length', () => {
    const el = hedgerowLine({ id: 'h1', lengthDeg: 0.001 });
    const [it] = seedAgroforestryWorkItems({
      projectId: 'p1',
      designElements: [el],
    });
    expect(it).toBeDefined();
    expect(it!.materialsAuto.length).toBe(1);
    expect(it!.costRangeAuto).toBeDefined();
    const hedgerow = AGROFORESTRY_CATALOG.find((e) => e.kind === 'hedgerow')!;
    // length ≈ 111 m → cost.mid ≈ 444 (per-meter mid 4.0 × 111).
    expect(it!.costRangeAuto!.mid).toBeGreaterThan(100);
    expect(it!.laborHrs).toBeGreaterThan(0);
    // Per-meter rate × computed length should match cost band shape.
    expect(it!.costRangeAuto!.low).toBeLessThanOrEqual(it!.costRangeAuto!.mid);
    expect(it!.costRangeAuto!.mid).toBeLessThanOrEqual(it!.costRangeAuto!.high);
    // Sanity: catalog low/mid/high preserved as ratios.
    const ratioLowMid = it!.costRangeAuto!.low / it!.costRangeAuto!.mid;
    const refRatio = hedgerow.costUSD.low / hedgerow.costUSD.mid;
    expect(ratioLowMid).toBeCloseTo(refRatio, 5);
  });

  it('ignores hedgerow drawn as polygon + orchard drawn as line (geometry guard)', () => {
    const badHedgerow: DesignElement = {
      ...polygonElement({ id: 'bh', kind: 'orchard' }),
      kind: 'hedgerow',
    } as DesignElement;
    const badOrchard: DesignElement = {
      ...hedgerowLine({ id: 'bo' }),
      kind: 'orchard',
      category: 'grazing',
    } as DesignElement;
    const result = seedAgroforestryWorkItems({
      projectId: 'p1',
      designElements: [badHedgerow, badOrchard],
    });
    expect(result.length).toBe(0);
  });

  it('ignores non-agroforestry kinds (oak-tree, owl-box)', () => {
    const elements: DesignElement[] = [
      treePoint({ id: 'oak1', kind: 'oak-tree' }),
      {
        id: 'owl1',
        category: 'habitat',
        kind: 'owl-box',
        geometry: { type: 'Point', coordinates: [0, 0] },
        phase: 'trees',
        createdAt: '2026-05-21T00:00:00.000Z',
      } as DesignElement,
      hedgerowLine({ id: 'h1' }),
    ];
    const result = seedAgroforestryWorkItems({
      projectId: 'p1',
      designElements: elements,
    });
    expect(result.length).toBe(1);
    expect(result[0]!.id).toBe(agroforestryProvenanceId('h1'));
  });

  it('is idempotent under repeated calls', () => {
    const elements = [hedgerowLine({ id: 'h1' })];
    const a = seedAgroforestryWorkItems({
      projectId: 'p1',
      designElements: elements,
      now: () => '2026-05-21T00:00:00.000Z',
    });
    const b = seedAgroforestryWorkItems({
      projectId: 'p1',
      designElements: elements,
      now: () => '2026-05-21T00:00:00.000Z',
    });
    expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
  });
});

describe('pushAgroforestryToSpine (side-effecting)', () => {
  it('writes agroforestry rows + preserves cross-source rows', () => {
    useLandDesignStore.setState({
      byProject: {
        p1: [hedgerowLine({ id: 'h1' })],
      },
    });
    useWorkItemStore.setState({
      items: [
        manualWorkItem({ id: 'm1' }),
        manualWorkItem({ id: 'hf__keep', source: 'habitat-feature' }),
        manualWorkItem({ id: 'tree__keep', source: 'tree-planting' }),
        manualWorkItem({ id: 'cc__keep', source: 'cover-crop' }),
      ],
    });
    pushAgroforestryToSpine('p1');
    const items = useWorkItemStore.getState().items;
    expect(items.find((i) => i.id === 'm1')).toBeDefined();
    expect(items.find((i) => i.id === 'hf__keep')).toBeDefined();
    expect(items.find((i) => i.id === 'tree__keep')).toBeDefined();
    expect(items.find((i) => i.id === 'cc__keep')).toBeDefined();
    expect(items.find((i) => i.id === agroforestryProvenanceId('h1'))).toBeDefined();
  });

  it('removing the source DesignElement clears its WorkItem on next push', () => {
    useLandDesignStore.setState({
      byProject: {
        p1: [hedgerowLine({ id: 'a' }), polygonElement({ id: 'b', kind: 'orchard' })],
      },
    });
    pushAgroforestryToSpine('p1');
    expect(useWorkItemStore.getState().items.length).toBe(2);
    useLandDesignStore.setState({
      byProject: {
        p1: [hedgerowLine({ id: 'a' })],
      },
    });
    pushAgroforestryToSpine('p1');
    const items = useWorkItemStore.getState().items;
    expect(items.length).toBe(1);
    expect(items[0]!.id).toBe(agroforestryProvenanceId('a'));
  });

  it('preserves steward-overridden agroforestry rows under re-push', () => {
    useLandDesignStore.setState({
      byProject: {
        p1: [hedgerowLine({ id: 'a' })],
      },
    });
    pushAgroforestryToSpine('p1');
    useWorkItemStore.setState({
      items: useWorkItemStore.getState().items.map((it) =>
        it.id === agroforestryProvenanceId('a')
          ? { ...it, overridden: true, title: 'Living mixed-shrub windbreak' }
          : it,
      ),
    });
    pushAgroforestryToSpine('p1');
    const items = useWorkItemStore.getState().items;
    const overridden = items.find((i) => i.id === agroforestryProvenanceId('a'));
    expect(overridden?.overridden).toBe(true);
    expect(overridden?.title).toBe('Living mixed-shrub windbreak');
  });
});
