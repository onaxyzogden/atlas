/**
 * @vitest-environment happy-dom
 *
 * SelectionFloater MultiPolygon Move-gate lock.
 *
 * After Fill-remainder, a vegetation / pasture patch's geometry can be
 * `MultiPolygon`. MapboxDraw `direct_select` does not support
 * MultiPolygon — handing one in would corrupt the record or crash the
 * editor. SelectionFloater reads the live geometry via `readPolygon()`
 * and disables Move with an explanatory tooltip when the selection's
 * geometry is `MultiPolygon`.
 *
 * Locks the gate shipped in commit 66ce7a9f:
 *   1. Polygon vegetation → Move enabled, tooltip "Move selected".
 *   2. MultiPolygon vegetation → Move disabled, tooltip mentions
 *      MultiPolygon.
 *   3. Polygon → MultiPolygon flip while selected → Move flips to
 *      disabled on next render (subscription to vegetation patches).
 *   4. MultiPolygon pasture → same gate as vegetation.
 *   5. Non-polygon kind (point) → unaffected by vegetation contents.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as React from 'react';
import { render, cleanup, screen, act } from '@testing-library/react';

// lucide-react ships forwardRef icons whose Icon.mjs spreads
// `[undefined]` into <svg> children when no children are passed. React's
// strict child reconciliation under happy-dom rejects that with
// "Objects are not valid as a React child." Stub every export to a tiny
// deterministic <svg> so the SUT's icon imports (Move/Pencil/Trash2/X)
// render cleanly. Same pattern as V3LifecycleSidebar.test.tsx.
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' &&
        value !== null &&
        '$$typeof' in (value as object)) ||
      typeof value === 'function';
    if (isComponent) {
      const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>(
        function LucideStub(_props, ref) {
          return React.createElement('svg', {
            ref,
            'data-lucide-icon': key,
            'aria-hidden': 'true',
          });
        },
      );
      Stub.displayName = `LucideStub(${key})`;
      stubbed[key] = Stub;
    } else {
      stubbed[key] = value;
    }
  }
  return stubbed;
});

import { useObserveSelectionStore } from '../../../../store/observeSelectionStore.js';
import { useVegetationStore } from '../../../../store/vegetationStore.js';
import { usePastureStore } from '../../../../store/pastureStore.js';
import { useSoilSampleStore } from '../../../../store/soilSampleStore.js';

// Import the SUT after mocks are hoisted.
import SelectionFloater from '../SelectionFloater';

// Hand-authored small geometries — values don't matter, only the .type
// discriminator does, since the gate reads `readPolygon()?.type`.
const POLYGON: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ],
  ],
};

const MULTIPOLYGON: GeoJSON.MultiPolygon = {
  type: 'MultiPolygon',
  coordinates: [
    [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ],
    [
      [
        [2, 2],
        [3, 2],
        [3, 3],
        [2, 3],
        [2, 2],
      ],
    ],
  ],
};

function seedVegetation(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon) {
  useVegetationStore.setState({
    patches: [
      {
        id: 'veg-test',
        projectId: 'mtc',
        geometry,
        successionStage: 'early-successional',
        groundCover: 'mixed',
        createdAt: '2026-05-21T00:00:00Z',
      },
    ],
  });
  useObserveSelectionStore
    .getState()
    .set([{ kind: 'vegetation', id: 'veg-test' }]);
}

function seedPasture(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon) {
  usePastureStore.setState({
    pastures: [
      {
        id: 'past-test',
        projectId: 'mtc',
        geometry,
        kind: 'open-pasture',
        createdAt: '2026-05-21T00:00:00Z',
      },
    ],
  });
  useObserveSelectionStore
    .getState()
    .set([{ kind: 'pasture', id: 'past-test' }]);
}

/** Find the Move button by walking its visible label span. */
function getMoveButton(): HTMLButtonElement {
  // The toolbar portals onto document.body via getFloaterStackRoot.
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[role="toolbar"] button'),
  );
  const move = buttons.find(
    (b) => b.querySelector('span')?.textContent === 'Move',
  );
  if (!move) throw new Error('Move button not found in SelectionFloater toolbar');
  return move;
}

/** Read the tooltip text wrapping a given button. The DelayedTooltip
 *  renders the label into a `<span role="tooltip">` sibling that
 *  exists in the DOM regardless of hover state. */
function getTooltipFor(btn: HTMLButtonElement): string {
  const wrapper = btn.parentElement; // span.wrapper from Tooltip
  const tip = wrapper?.querySelector('[role="tooltip"]');
  return tip?.textContent ?? '';
}

beforeEach(() => {
  // Reset the three stores the gate reads from before every case.
  useObserveSelectionStore.getState().clear();
  useVegetationStore.setState({ patches: [], migratedFromEcology: true });
  usePastureStore.setState({ pastures: [] });
  useSoilSampleStore.setState({ samples: [] });
});

afterEach(() => {
  cleanup();
  // Strip the portal container the floater appended to document.body so
  // the next case starts from a clean slate.
  document
    .querySelectorAll('[data-floater-stack]')
    .forEach((n) => n.remove());
});

describe('SelectionFloater — MultiPolygon Move-gate', () => {
  it('enables Move when a Polygon vegetation patch is selected', () => {
    seedVegetation(POLYGON);
    render(<SelectionFloater projectId="mtc" />);
    const move = getMoveButton();
    expect(move.disabled).toBe(false);
    expect(getTooltipFor(move)).toBe('Move selected');
  });

  it('disables Move with an MP-specific tooltip on a MultiPolygon vegetation patch', () => {
    seedVegetation(MULTIPOLYGON);
    render(<SelectionFloater projectId="mtc" />);
    const move = getMoveButton();
    expect(move.disabled).toBe(true);
    expect(getTooltipFor(move)).toContain('MultiPolygon');
    expect(getTooltipFor(move)).toContain('delete and redraw');
  });

  it('flips Move from enabled → disabled when geometry is mutated Polygon → MultiPolygon while selected', () => {
    seedVegetation(POLYGON);
    const { rerender } = render(<SelectionFloater projectId="mtc" />);
    expect(getMoveButton().disabled).toBe(false);

    // Simulate a Fill-remainder write that flips the live geometry under
    // an active selection. The subscription on lines 62-63 of
    // SelectionFloater.tsx must observe this and re-evaluate moveEnabled.
    act(() => {
      useVegetationStore
        .getState()
        .updatePatch('veg-test', { geometry: MULTIPOLYGON });
    });
    rerender(<SelectionFloater projectId="mtc" />);

    const move = getMoveButton();
    expect(move.disabled).toBe(true);
    expect(getTooltipFor(move)).toContain('MultiPolygon');
  });

  it('disables Move with an MP tooltip on a MultiPolygon pasture', () => {
    seedPasture(MULTIPOLYGON);
    render(<SelectionFloater projectId="mtc" />);
    const move = getMoveButton();
    expect(move.disabled).toBe(true);
    expect(getTooltipFor(move)).toContain('MultiPolygon');
  });

  it('leaves non-polygon kinds (point) unaffected regardless of vegetation contents', () => {
    // Seed a MultiPolygon vegetation record into the store but select a
    // soilSample point instead — the point's Move gate must not care
    // about vegetation geometry.
    useVegetationStore.setState({
      patches: [
        {
          id: 'background-mp',
          projectId: 'mtc',
          geometry: MULTIPOLYGON,
          successionStage: 'early-successional',
          groundCover: 'mixed',
          createdAt: '2026-05-21T00:00:00Z',
        },
      ],
      migratedFromEcology: true,
    });
    useSoilSampleStore.setState({
      samples: [
        {
          id: 'sample-test',
          projectId: 'mtc',
          location: [0, 0],
          label: 'test sample',
          createdAt: '2026-05-21T00:00:00Z',
        },
      ],
    });
    useObserveSelectionStore
      .getState()
      .set([{ kind: 'soilSample', id: 'sample-test' }]);

    render(<SelectionFloater projectId="mtc" />);
    const move = getMoveButton();
    expect(move.disabled).toBe(false);
    expect(getTooltipFor(move)).toBe('Move selected');
  });

  // Silence the unused-import warning if @testing-library/react's screen
  // helper goes unused in a future refactor of these cases.
  void screen;
});
