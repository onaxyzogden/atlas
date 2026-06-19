// @vitest-environment happy-dom
/**
 * plan3DSelectionHandler — pins the design-element guard added 2026-06-15.
 *
 * Regression: clicking a placed design element (e.g. an Orchard) showed its
 * edit toolbar only while the mouse was held. DesignElementLayers selects on
 * `mousedown`, but this handler's map-level `click` queried ONLY the
 * `plan-data-*` layers, missed the design element on release, and ran
 * `set([])` — clearing the selection. The fix bails early when a `design-el-*`
 * feature is under the pointer.
 *
 * The handler registers a `click` listener on the passed `map` and reads/writes
 * the real `usePlanSelectionStore`, so the test drives a fake map: capture the
 * registered handler, fire it with a synthetic event, assert the store.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import Plan3DSelectionHandler from '../Plan3DSelectionHandler.js';
import { usePlanSelectionStore } from '../../../../store/planSelectionStore.js';

type Feature = { properties?: Record<string, unknown> };

interface FakeMap {
  on: (ev: string, fn: (e: unknown) => void) => void;
  off: () => void;
  getLayer: (id: string) => unknown;
  queryRenderedFeatures: (
    point: unknown,
    opts?: { layers?: string[] },
  ) => Feature[];
  __fire: (e: unknown) => void;
}

function makeMap(opts: {
  layers: string[];
  designHits?: Feature[];
  planHits?: Feature[];
}): FakeMap {
  const layers = new Set(opts.layers);
  let clickHandler: ((e: unknown) => void) | null = null;
  return {
    on: (ev, fn) => {
      if (ev === 'click') clickHandler = fn;
    },
    off: () => {},
    getLayer: (id) => (layers.has(id) ? { id } : undefined),
    queryRenderedFeatures: (_point, qopts) => {
      const ls = qopts?.layers ?? [];
      if (ls.some((l) => l.startsWith('design-el-'))) return opts.designHits ?? [];
      if (ls.some((l) => l.startsWith('plan-data-'))) return opts.planHits ?? [];
      return [];
    },
    __fire: (e) => clickHandler?.(e),
  };
}

const clickEvent = { point: { x: 10, y: 10 }, originalEvent: { shiftKey: false } };

const PLAN_DATA = [
  'plan-data-poly-fill',
  'plan-data-line',
  'plan-data-point',
];
const DESIGN_EL = ['design-el-poly-fill', 'design-el-line', 'design-el-point'];

beforeEach(() => {
  usePlanSelectionStore.getState().set([]);
});
afterEach(cleanup);

describe('Plan3DSelectionHandler design-element guard', () => {
  it('does NOT clear the selection when the click lands on a design element', () => {
    // DesignElementLayers already selected the orchard on mousedown.
    usePlanSelectionStore
      .getState()
      .set([{ kind: 'design-element', id: 'orchard-1', projectId: 'p1' }]);
    const setSpy = vi.spyOn(usePlanSelectionStore.getState(), 'set');

    const map = makeMap({
      layers: [...PLAN_DATA, ...DESIGN_EL],
      designHits: [{ properties: { kind: 'plant-system', id: 'orchard-1' } }],
      planHits: [], // plan-data query would miss the orchard — the old bug path
    });
    render(<Plan3DSelectionHandler map={map as never} />);

    map.__fire(clickEvent);

    expect(setSpy).not.toHaveBeenCalled();
    expect(usePlanSelectionStore.getState().items).toEqual([
      { kind: 'design-element', id: 'orchard-1', projectId: 'p1' },
    ]);
  });

  it('clears the selection on an empty-map click (no design or plan-data hit)', () => {
    usePlanSelectionStore.getState().set([{ kind: 'zone', id: 'z9' }]);

    const map = makeMap({
      layers: [...PLAN_DATA, ...DESIGN_EL],
      designHits: [],
      planHits: [],
    });
    render(<Plan3DSelectionHandler map={map as never} />);

    map.__fire(clickEvent);

    expect(usePlanSelectionStore.getState().items).toEqual([]);
  });

  it('selects a plan-data feature when no design element is under the pointer', () => {
    const map = makeMap({
      layers: [...PLAN_DATA, ...DESIGN_EL],
      designHits: [],
      planHits: [{ properties: { kind: 'zone', id: 'z1' } }],
    });
    render(<Plan3DSelectionHandler map={map as never} />);

    map.__fire(clickEvent);

    expect(usePlanSelectionStore.getState().items).toEqual([
      { kind: 'zone', id: 'z1' },
    ]);
  });
});
