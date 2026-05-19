import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { computeRotationCarryingCapacity } from '../rotationCapacityMath.js';
import { computePaddockRecommendedStocking } from '../livestockAnalysis.js';
import { AU_FACTORS } from '../speciesData.js';
import type { RotationCell, RotationPlan } from '../rotationSequenceMath.js';
import type { Paddock, LivestockSpecies } from '../../../store/livestockStore.js';

/* ---------- factory helpers (mirror rotationSequenceMath.test) ---------- */

function paddock(id: string, overrides: Partial<Paddock> = {}): Paddock {
  return {
    id,
    projectId: 'p1',
    name: `Paddock ${id}`,
    color: '#000',
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] },
    areaM2: 10_000, // 1 ha
    grazingCellGroup: 'A',
    species: ['cattle'] as LivestockSpecies[],
    stockingDensity: null,
    fencing: 'electric',
    guestSafeBuffer: false,
    waterPointNote: '',
    shelterNote: '',
    phase: 'plan',
    notes: '',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

function cell(paddockId: string, overrides: Partial<RotationCell> = {}): RotationCell {
  return {
    paddockId,
    cellGroup: 'A',
    sequenceOrder: 0,
    targetGrazeDays: 3,
    targetRestDays: 0,
    ...overrides,
  };
}

function plan(cells: RotationCell[], projectId = 'p1'): RotationPlan {
  return { projectId, cells };
}

/* ---------- 1. empties ---------- */

describe('computeRotationCarryingCapacity — empties', () => {
  it('null plan → []', () => {
    expect(computeRotationCarryingCapacity([], null)).toEqual([]);
  });
  it('plan with no cells → []', () => {
    expect(computeRotationCarryingCapacity([paddock('a')], plan([]))).toEqual([]);
  });
  it('cells with no live paddock → group omitted', () => {
    expect(computeRotationCarryingCapacity([], plan([cell('ghost')]))).toEqual([]);
  });
});

/* ---------- 2. no div-by-zero when supply 0 ---------- */

describe('supply 0 → utilizationPct 0 (no div-by-zero)', () => {
  it('bees AU factor 0 ⇒ supply 0, util 0, status ok', () => {
    const pads = [
      paddock('h', { species: ['bees'], stockingDensity: 5 }),
    ];
    const rows = computeRotationCarryingCapacity(pads, plan([cell('h')]));
    expect(rows).toHaveLength(1);
    expect(AU_FACTORS.bees).toBe(0);
    expect(rows[0]!.auSupplyDays).toBe(0);
    expect(rows[0]!.utilizationPct).toBe(0);
    expect(rows[0]!.status).toBe('ok');
  });
});

/* ---------- 3. demand > supply ⇒ over ---------- */

describe('demand vs supply bands', () => {
  it('planned far above recommended ⇒ status over (>110%)', () => {
    const recommended = computePaddockRecommendedStocking(
      paddock('a', { species: ['cattle'] }),
    );
    const pads = [
      paddock('a', { species: ['cattle'], stockingDensity: recommended * 2 }),
    ];
    const rows = computeRotationCarryingCapacity(pads, plan([cell('a')]));
    expect(rows[0]!.utilizationPct).toBe(200);
    expect(rows[0]!.status).toBe('over');
  });

  it('planned == recommended ⇒ ~100% tight', () => {
    const recommended = computePaddockRecommendedStocking(
      paddock('a', { species: ['cattle'] }),
    );
    const pads = [
      paddock('a', { species: ['cattle'], stockingDensity: recommended }),
    ];
    const rows = computeRotationCarryingCapacity(pads, plan([cell('a')]));
    expect(rows[0]!.utilizationPct).toBe(100);
    expect(rows[0]!.status).toBe('tight');
  });

  it('planned well below recommended ⇒ status ok', () => {
    const recommended = computePaddockRecommendedStocking(
      paddock('a', { species: ['cattle'] }),
    );
    const pads = [
      paddock('a', { species: ['cattle'], stockingDensity: recommended * 0.5 }),
    ];
    const rows = computeRotationCarryingCapacity(pads, plan([cell('a')]));
    expect(rows[0]!.utilizationPct).toBe(50);
    expect(rows[0]!.status).toBe('ok');
  });
});

/* ---------- 4. monotone in planned stockingDensity ---------- */

describe('utilization is monotone in planned stockingDensity', () => {
  it('higher planned density ⇒ strictly higher utilizationPct', () => {
    const mk = (density: number) =>
      computeRotationCarryingCapacity(
        [paddock('a', { species: ['cattle'], stockingDensity: density })],
        plan([cell('a')]),
      )[0]!.utilizationPct;
    expect(mk(1)).toBeLessThan(mk(3));
    expect(mk(3)).toBeLessThan(mk(6));
  });
});

/* ---------- 5. cycleDays honors rest floor ---------- */

describe('cycleDays', () => {
  it('= Σ graze when no rest floor exceeds it', () => {
    const pads = [paddock('a'), paddock('b')];
    const p = plan([
      cell('a', { sequenceOrder: 0, targetGrazeDays: 3 }),
      cell('b', { sequenceOrder: 1, targetGrazeDays: 4 }),
    ]);
    expect(computeRotationCarryingCapacity(pads, p)[0]!.cycleDays).toBe(7);
  });
  it('raised when a cell needs grazeDays + targetRestDays > Σ graze', () => {
    const pads = [paddock('a'), paddock('b')];
    const p = plan([
      cell('a', { sequenceOrder: 0, targetGrazeDays: 3, targetRestDays: 30 }),
      cell('b', { sequenceOrder: 1, targetGrazeDays: 4 }),
    ]);
    // max(Σ=7, 3+30) = 33
    expect(computeRotationCarryingCapacity(pads, p)[0]!.cycleDays).toBe(33);
  });
});

/* ---------- 6. covenant lock (B2.1 mirror — B non-covenant) ---------- */

describe('covenant — no financing lexicon in the module', () => {
  it('source has no riba/gharar/csra/salam/investor/financing/cost-of-capital', () => {
    const src = readFileSync(
      fileURLToPath(new URL('../rotationCapacityMath.ts', import.meta.url)),
      'utf8',
    );
    expect(src).not.toMatch(
      /\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i,
    );
  });
});
