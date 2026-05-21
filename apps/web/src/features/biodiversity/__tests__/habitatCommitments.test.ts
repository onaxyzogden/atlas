/**
 * habitatCommitments.test — exercises the pure selectors that group
 * habitat-relevant DesignElements back into the tally shape used by
 * the A2 inventory panel and A3 biodiversity monitor.
 *
 * Covers:
 *   - empty input returns all 10 zero-rows in canonical order
 *   - point kinds increment `placed`, never `totalLengthM` / `totalAreaM2`
 *   - line kinds sum `totalLengthM` via turf, leave `totalAreaM2` at 0
 *   - polygon kinds sum `totalAreaM2` via turf, leave `totalLengthM` at 0
 *   - unknown kinds are ignored (no throw, no row)
 *   - `selectPlacedHabitatCommitments` filters zero-rows
 */

import { describe, expect, it } from 'vitest';
import {
  HABITAT_COMMITMENT_KINDS,
  selectHabitatCommitments,
  selectPlacedHabitatCommitments,
} from '../habitatCommitments.js';
import type { DesignElement } from '../../../store/designElementsStore.js';

let elementCounter = 0;
function nextId(): string {
  elementCounter += 1;
  return `el-${elementCounter}`;
}

function pointElement(kind: string, coords: [number, number] = [0, 0]): DesignElement {
  return {
    id: nextId(),
    kind,
    category: 'habitat',
    phase: 'trees',
    geometry: { type: 'Point', coordinates: coords },
    createdAt: new Date().toISOString(),
  } as unknown as DesignElement;
}

function lineElement(kind: string, coords: [number, number][]): DesignElement {
  return {
    id: nextId(),
    kind,
    category: 'habitat',
    phase: 'soil',
    geometry: { type: 'LineString', coordinates: coords },
    createdAt: new Date().toISOString(),
  } as unknown as DesignElement;
}

function polygonElement(kind: string, ring: [number, number][]): DesignElement {
  return {
    id: nextId(),
    kind,
    category: 'habitat',
    phase: 'water',
    geometry: { type: 'Polygon', coordinates: [ring] },
    createdAt: new Date().toISOString(),
  } as unknown as DesignElement;
}

describe('selectHabitatCommitments', () => {
  it('returns one zero-row per known kind for empty input', () => {
    const rows = selectHabitatCommitments([]);
    expect(rows.length).toBe(HABITAT_COMMITMENT_KINDS.length);
    for (const r of rows) {
      expect(r.placed).toBe(0);
      expect(r.totalLengthM).toBe(0);
      expect(r.totalAreaM2).toBe(0);
    }
  });

  it('emits rows in the canonical kind order', () => {
    const rows = selectHabitatCommitments([]);
    expect(rows.map((r) => r.kind)).toEqual(HABITAT_COMMITMENT_KINDS);
  });

  it('counts a single owl-box placement', () => {
    const rows = selectHabitatCommitments([pointElement('owl-box')]);
    const owl = rows.find((r) => r.kind === 'owl-box')!;
    expect(owl.placed).toBe(1);
    expect(owl.totalLengthM).toBe(0);
    expect(owl.totalAreaM2).toBe(0);
  });

  it('sums line length for insectary-strip via turf', () => {
    // ~111 km between (0,0) and (1,0) at the equator.
    const rows = selectHabitatCommitments([
      lineElement('insectary-strip', [
        [0, 0],
        [1, 0],
      ]),
    ]);
    const strip = rows.find((r) => r.kind === 'insectary-strip')!;
    expect(strip.placed).toBe(1);
    expect(strip.totalLengthM).toBeGreaterThan(110_000);
    expect(strip.totalLengthM).toBeLessThan(112_000);
    expect(strip.totalAreaM2).toBe(0);
  });

  it('sums polygon area for wetland-edge via turf', () => {
    const rows = selectHabitatCommitments([
      polygonElement('wetland-edge', [
        [0, 0],
        [0.001, 0],
        [0.001, 0.001],
        [0, 0.001],
        [0, 0],
      ]),
    ]);
    const wetland = rows.find((r) => r.kind === 'wetland-edge')!;
    expect(wetland.placed).toBe(1);
    expect(wetland.totalAreaM2).toBeGreaterThan(0);
    expect(wetland.totalLengthM).toBe(0);
  });

  it('aggregates multiple placements of the same kind', () => {
    const rows = selectHabitatCommitments([
      pointElement('brush-pile'),
      pointElement('brush-pile'),
      pointElement('brush-pile'),
    ]);
    const brush = rows.find((r) => r.kind === 'brush-pile')!;
    expect(brush.placed).toBe(3);
  });

  it('ignores unknown / non-habitat kinds', () => {
    const rows = selectHabitatCommitments([
      pointElement('road'),
      pointElement('not-a-kind'),
    ]);
    for (const r of rows) {
      expect(r.placed).toBe(0);
    }
  });

  it('groups hedgerow/pond/shrub alongside the 7 new kinds', () => {
    const rows = selectHabitatCommitments([
      pointElement('shrub'),
      lineElement('hedgerow', [
        [0, 0],
        [0.01, 0],
      ]),
      polygonElement('pond', [
        [0, 0],
        [0.001, 0],
        [0.001, 0.001],
        [0, 0.001],
        [0, 0],
      ]),
      pointElement('owl-box'),
    ]);
    expect(rows.find((r) => r.kind === 'shrub')!.placed).toBe(1);
    expect(rows.find((r) => r.kind === 'hedgerow')!.placed).toBe(1);
    expect(rows.find((r) => r.kind === 'hedgerow')!.totalLengthM).toBeGreaterThan(0);
    expect(rows.find((r) => r.kind === 'pond')!.placed).toBe(1);
    expect(rows.find((r) => r.kind === 'pond')!.totalAreaM2).toBeGreaterThan(0);
    expect(rows.find((r) => r.kind === 'owl-box')!.placed).toBe(1);
  });
});

describe('selectPlacedHabitatCommitments', () => {
  it('returns only the non-zero rows', () => {
    const rows = selectPlacedHabitatCommitments([
      pointElement('snag'),
      pointElement('nest-box'),
    ]);
    expect(rows.length).toBe(2);
    expect(rows.map((r) => r.kind).sort()).toEqual(['nest-box', 'snag']);
  });

  it('returns empty array when nothing is placed', () => {
    expect(selectPlacedHabitatCommitments([])).toEqual([]);
  });
});
