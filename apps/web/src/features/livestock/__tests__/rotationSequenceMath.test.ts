import { describe, expect, it } from 'vitest';
import {
  requiredRestDays,
  computeMoveCalendar,
  computeRestCompliance,
  computeRestCompliancePct,
  projectRotationSequence,
  type RotationCell,
  type RotationPlan,
} from '../rotationSequenceMath.js';
import type { Paddock, LivestockSpecies } from '../../../store/livestockStore.js';

/* ---------- factory helpers ---------- */

function paddock(
  id: string,
  overrides: Partial<Paddock> = {},
): Paddock {
  return {
    id,
    projectId: 'p1',
    name: `Paddock ${id}`,
    color: '#000',
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] },
    areaM2: 10_000,
    grazingCellGroup: 'A',
    species: [] as LivestockSpecies[],
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

function cell(
  paddockId: string,
  overrides: Partial<RotationCell> = {},
): RotationCell {
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

describe('rotationSequenceMath — empties', () => {
  it('null plan + empty paddocks → 100% compliance, empty calendar, shape', () => {
    expect(computeRestCompliancePct([], null)).toBe(100);
    expect(computeMoveCalendar([], null, '2026-06-01')).toEqual([]);
    expect(computeRestCompliance([], null)).toEqual([]);
    const proj = projectRotationSequence([], null, '2026-06-01');
    expect(proj).toEqual({
      calendar: [],
      restCompliance: [],
      restCompliancePct: 100,
      followerMoves: [],
    });
  });

  it('plan with no cells → empty calendar', () => {
    expect(computeMoveCalendar([paddock('x')], plan([]), '2026-06-01')).toEqual([]);
  });
});

/* ---------- 2. single group date walk ---------- */

describe('computeMoveCalendar — single group cursor walk', () => {
  it('walks the cursor across 3 paddocks grazeDays [3,4,5]', () => {
    const pads = [paddock('a'), paddock('b'), paddock('c')];
    const p = plan([
      cell('a', { sequenceOrder: 0, targetGrazeDays: 3 }),
      cell('b', { sequenceOrder: 1, targetGrazeDays: 4 }),
      cell('c', { sequenceOrder: 2, targetGrazeDays: 5 }),
    ]);
    const cal = computeMoveCalendar(pads, p, '2026-06-01');
    expect(cal).toHaveLength(3);

    expect(cal[0]!.paddockId).toBe('a');
    expect(cal[0]!.moveInDateISO).toBe('2026-06-01');
    expect(cal[0]!.moveOutDateISO).toBe('2026-06-04'); // +3
    expect(cal[0]!.grazeDays).toBe(3);
    expect(cal[0]!.restDaysUntilNextGraze).toBe(4 + 5);

    expect(cal[1]!.paddockId).toBe('b');
    expect(cal[1]!.moveInDateISO).toBe('2026-06-04');
    expect(cal[1]!.moveOutDateISO).toBe('2026-06-08'); // +4
    expect(cal[1]!.restDaysUntilNextGraze).toBe(3 + 5);

    expect(cal[2]!.paddockId).toBe('c');
    expect(cal[2]!.moveInDateISO).toBe('2026-06-08');
    expect(cal[2]!.moveOutDateISO).toBe('2026-06-13'); // +5
    expect(cal[2]!.restDaysUntilNextGraze).toBe(3 + 4);
  });

  it('honors cycles for multiple passes', () => {
    const pads = [paddock('a'), paddock('b')];
    const p = plan([
      cell('a', { sequenceOrder: 0, targetGrazeDays: 2 }),
      cell('b', { sequenceOrder: 1, targetGrazeDays: 3 }),
    ]);
    const cal = computeMoveCalendar(pads, p, '2026-06-01', 2);
    expect(cal).toHaveLength(4);
    expect(cal.map((e) => e.moveInDateISO)).toEqual([
      '2026-06-01',
      '2026-06-03',
      '2026-06-06',
      '2026-06-08',
    ]);
  });
});

/* ---------- 3. rest = Σ siblings ---------- */

describe('computeRestCompliance — planned rest is Σ siblings graze days', () => {
  it('plannedRestDays equals sum of other same-group cells', () => {
    const pads = [paddock('a'), paddock('b'), paddock('c')];
    const p = plan([
      cell('a', { sequenceOrder: 0, targetGrazeDays: 3 }),
      cell('b', { sequenceOrder: 1, targetGrazeDays: 4 }),
      cell('c', { sequenceOrder: 2, targetGrazeDays: 5 }),
    ]);
    const rows = computeRestCompliance(pads, p);
    const rowA = rows.find((r) => r.paddockId === 'a')!;
    expect(rowA.plannedRestDays).toBe(4 + 5);
    const rowB = rows.find((r) => r.paddockId === 'b')!;
    expect(rowB.plannedRestDays).toBe(3 + 5);
  });

  it('paddocks with no plan cell are not rows', () => {
    const pads = [paddock('a'), paddock('b')];
    const p = plan([cell('a')]);
    const rows = computeRestCompliance(pads, p);
    expect(rows.map((r) => r.paddockId)).toEqual(['a']);
  });
});

/* ---------- 4. compliance boundary ---------- */

describe('compliance boundary — sheep recoveryDays 30', () => {
  it('plannedRestDays exactly 30 → compliant; 29 → not', () => {
    const sheepPad = paddock('s', { species: ['sheep'] });
    // sibling graze days must total exactly 30
    const compliantPlan = plan([
      cell('s', { sequenceOrder: 0, targetGrazeDays: 1 }),
      cell('x', { sequenceOrder: 1, targetGrazeDays: 30 }),
    ]);
    const rowsOk = computeRestCompliance([sheepPad, paddock('x')], compliantPlan);
    const rOk = rowsOk.find((r) => r.paddockId === 's')!;
    expect(rOk.requiredRestDays).toBe(30);
    expect(rOk.plannedRestDays).toBe(30);
    expect(rOk.compliant).toBe(true);

    const shortPlan = plan([
      cell('s', { sequenceOrder: 0, targetGrazeDays: 1 }),
      cell('x', { sequenceOrder: 1, targetGrazeDays: 29 }),
    ]);
    const rowsBad = computeRestCompliance([sheepPad, paddock('x')], shortPlan);
    const rBad = rowsBad.find((r) => r.paddockId === 's')!;
    expect(rBad.plannedRestDays).toBe(29);
    expect(rBad.compliant).toBe(false);
  });

  it('requiredRestDays: empty species → 30; max across species', () => {
    expect(requiredRestDays(paddock('a', { species: [] }))).toBe(30);
    expect(requiredRestDays(paddock('a', { species: ['poultry'] }))).toBe(14);
    // cattle 45, sheep 30 → max 45
    expect(requiredRestDays(paddock('a', { species: ['sheep', 'cattle'] }))).toBe(45);
  });
});

/* ---------- 5. multi-group isolation ---------- */

describe('multi-group isolation — independent cursors', () => {
  it('two groups each start at startDate; cross-group days do not interact', () => {
    const pads = [
      paddock('a1', { grazingCellGroup: 'A' }),
      paddock('a2', { grazingCellGroup: 'A' }),
      paddock('b1', { grazingCellGroup: 'B' }),
      paddock('b2', { grazingCellGroup: 'B' }),
    ];
    const p = plan([
      cell('a1', { cellGroup: 'A', sequenceOrder: 0, targetGrazeDays: 2 }),
      cell('a2', { cellGroup: 'A', sequenceOrder: 1, targetGrazeDays: 7 }),
      cell('b1', { cellGroup: 'B', sequenceOrder: 0, targetGrazeDays: 3 }),
      cell('b2', { cellGroup: 'B', sequenceOrder: 1, targetGrazeDays: 4 }),
    ]);
    const cal = computeMoveCalendar(pads, p, '2026-06-01');
    const a1 = cal.find((e) => e.paddockId === 'a1')!;
    const b1 = cal.find((e) => e.paddockId === 'b1')!;
    expect(a1.moveInDateISO).toBe('2026-06-01');
    expect(b1.moveInDateISO).toBe('2026-06-01'); // independent cursor
    const a2 = cal.find((e) => e.paddockId === 'a2')!;
    expect(a2.moveInDateISO).toBe('2026-06-03'); // a1 +2 only

    const rows = computeRestCompliance(pads, p);
    expect(rows.find((r) => r.paddockId === 'a1')!.plannedRestDays).toBe(7);
    expect(rows.find((r) => r.paddockId === 'b1')!.plannedRestDays).toBe(4);
  });
});

/* ---------- 6. ungrouped bucket ---------- */

describe('ungrouped bucket', () => {
  it('null grazingCellGroup with cellGroup "ungrouped" participates', () => {
    const pads = [
      paddock('u1', { grazingCellGroup: null }),
      paddock('u2', { grazingCellGroup: null }),
    ];
    const p = plan([
      cell('u1', { cellGroup: 'ungrouped', sequenceOrder: 0, targetGrazeDays: 2 }),
      cell('u2', { cellGroup: 'ungrouped', sequenceOrder: 1, targetGrazeDays: 3 }),
    ]);
    const cal = computeMoveCalendar(pads, p, '2026-06-01');
    expect(cal).toHaveLength(2);
    expect(cal[0]!.cellGroup).toBe('ungrouped');
    expect(cal[1]!.moveInDateISO).toBe('2026-06-03');
    const rows = computeRestCompliance(pads, p);
    expect(rows.find((r) => r.paddockId === 'u1')!.plannedRestDays).toBe(3);
  });
});

/* ---------- 7. B3.1 — honored targetRestDays ---------- */

describe('B3.1 — targetRestDays floor (the dead-field fix)', () => {
  it('targetRestDays:0 default ⇒ identical to pre-B3.1 (regression lock)', () => {
    // All factory cells default targetRestDays:0; honored = Σ-sibling-graze.
    const pads = [paddock('a'), paddock('b'), paddock('c')];
    const p = plan([
      cell('a', { sequenceOrder: 0, targetGrazeDays: 3 }),
      cell('b', { sequenceOrder: 1, targetGrazeDays: 4 }),
      cell('c', { sequenceOrder: 2, targetGrazeDays: 5 }),
    ]);
    const cal = computeMoveCalendar(pads, p, '2026-06-01', 2);
    // No idle gaps inserted; pure sibling-graze cadence preserved.
    expect(cal.map((e) => e.moveInDateISO)).toEqual([
      '2026-06-01',
      '2026-06-04',
      '2026-06-08',
      '2026-06-13', // cycle 2 a: prevOut 06-04, gap = 9 = honored(9), no gap
      '2026-06-16',
      '2026-06-20',
    ]);
    expect(cal[0]!.restDaysUntilNextGraze).toBe(9);
    const rows = computeRestCompliance(pads, p);
    expect(rows.find((r) => r.paddockId === 'a')!.plannedRestDays).toBe(9);
  });

  it('targetRestDays floor raises plannedRest and flips Short → Compliant', () => {
    // 2 paddocks × 3d graze: sibling-graze rest for sheep = 3 (Short vs 30).
    const sheepPad = paddock('s', { species: ['sheep'] });
    const other = paddock('o');
    const short = plan([
      cell('s', { sequenceOrder: 0, targetGrazeDays: 3, targetRestDays: 0 }),
      cell('o', { sequenceOrder: 1, targetGrazeDays: 3, targetRestDays: 0 }),
    ]);
    const rShort = computeRestCompliance([sheepPad, other], short).find(
      (r) => r.paddockId === 's',
    )!;
    expect(rShort.plannedRestDays).toBe(3);
    expect(rShort.compliant).toBe(false);

    const floored = plan([
      cell('s', { sequenceOrder: 0, targetGrazeDays: 3, targetRestDays: 30 }),
      cell('o', { sequenceOrder: 1, targetGrazeDays: 3, targetRestDays: 0 }),
    ]);
    const rOk = computeRestCompliance([sheepPad, other], floored).find(
      (r) => r.paddockId === 's',
    )!;
    expect(rOk.plannedRestDays).toBe(30); // max(3, 30)
    expect(rOk.compliant).toBe(true);
  });

  it('calendar inserts an idle gap when targetRestDays > Σ-sibling-graze', () => {
    const pads = [paddock('a'), paddock('b')];
    const p = plan([
      cell('a', { sequenceOrder: 0, targetGrazeDays: 3, targetRestDays: 10 }),
      cell('b', { sequenceOrder: 1, targetGrazeDays: 3, targetRestDays: 0 }),
    ]);
    const cal = computeMoveCalendar(pads, p, '2026-06-01', 2);
    // a: in 06-01, out 06-04. b: in 06-04, out 06-07.
    // a cycle2: prevOut 06-04, cursor 06-07, gap 3 < honored 10 →
    //   advance by 7 → moveIn 06-14.
    expect(cal[0]!.moveInDateISO).toBe('2026-06-01');
    expect(cal[0]!.restDaysUntilNextGraze).toBe(10); // max(3, 10)
    expect(cal[1]!.moveInDateISO).toBe('2026-06-04');
    expect(cal[2]!.paddockId).toBe('a');
    expect(cal[2]!.moveInDateISO).toBe('2026-06-14'); // idle gap honored
  });
});

/* ---------- 7b. S2 — season-aware rest (calendar-level) ---------- */

describe('S2 — season-aware rest', () => {
  it('without seasonOpts, seasonAdjustedRestDays === restDaysUntilNextGraze (legacy lock)', () => {
    const pads = [paddock('a'), paddock('b'), paddock('c')];
    const p = plan([
      cell('a', { sequenceOrder: 0, targetGrazeDays: 3 }),
      cell('b', { sequenceOrder: 1, targetGrazeDays: 4 }),
      cell('c', { sequenceOrder: 2, targetGrazeDays: 5 }),
    ]);
    const cal = computeMoveCalendar(pads, p, '2026-08-01', 2);
    for (const e of cal) {
      expect(e.seasonAdjustedRestDays).toBe(e.restDaysUntilNextGraze);
    }
  });

  it('a summer-slump move stretches the next graze later than the unadjusted cadence', () => {
    const pads = [paddock('a'), paddock('b')];
    const p = plan([
      cell('a', { sequenceOrder: 0, targetGrazeDays: 3 }),
      cell('b', { sequenceOrder: 1, targetGrazeDays: 3 }),
    ]);
    // Grazes end in August (NH slump, multiplier 1.6): honored 3 → adjusted 5.
    const base = computeMoveCalendar(pads, p, '2026-08-01', 2);
    const seasoned = computeMoveCalendar(pads, p, '2026-08-01', 2, {});

    // a's first graze ends 08-04 (Aug, index 7) → seasonAdjusted round(3*1.6)=5.
    expect(seasoned[0]!.seasonAdjustedRestDays).toBe(5);
    expect(seasoned[0]!.restDaysUntilNextGraze).toBe(3); // floor unchanged

    // a's SECOND graze (cycle 1) is pushed later than the unadjusted cadence:
    // base: gap 3 == honored 3 → moveIn 08-07; seasoned: requiredGap 5 → 08-09.
    const baseA2 = base.filter((e) => e.paddockId === 'a')[1]!;
    const seasonedA2 = seasoned.filter((e) => e.paddockId === 'a')[1]!;
    expect(baseA2.moveInDateISO).toBe('2026-08-07');
    expect(seasonedA2.moveInDateISO).toBe('2026-08-09');
    expect(
      Date.parse(seasonedA2.moveInDateISO),
    ).toBeGreaterThan(Date.parse(baseA2.moveInDateISO));
  });

  it('a peak-month (May) move applies no stretch (multiplier 1.0)', () => {
    const pads = [paddock('a'), paddock('b')];
    const p = plan([
      cell('a', { sequenceOrder: 0, targetGrazeDays: 3 }),
      cell('b', { sequenceOrder: 1, targetGrazeDays: 3 }),
    ]);
    // Graze ends mid-May (index 4, peak protein) → multiplier 1.0.
    const seasoned = computeMoveCalendar(pads, p, '2026-05-10', 2, {});
    expect(seasoned[0]!.seasonAdjustedRestDays).toBe(
      seasoned[0]!.restDaysUntilNextGraze,
    );
  });

  it('projectRotationSequence threads seasonOpts into the calendar', () => {
    const pads = [paddock('a'), paddock('b')];
    const p = plan([
      cell('a', { sequenceOrder: 0, targetGrazeDays: 3 }),
      cell('b', { sequenceOrder: 1, targetGrazeDays: 3 }),
    ]);
    const proj = projectRotationSequence(pads, p, '2026-08-01', 2, {});
    expect(proj.calendar[0]!.seasonAdjustedRestDays).toBe(5);
  });
});

/* ---------- 8. B3.1 — projectRotationSequence cycles arg ---------- */

describe('B3.1 — projectRotationSequence honors cycles / startDate', () => {
  it('default cycles=1 ⇒ one pass (pre-B3.1 behaviour)', () => {
    const pads = [paddock('a'), paddock('b')];
    const p = plan([
      cell('a', { sequenceOrder: 0, targetGrazeDays: 2 }),
      cell('b', { sequenceOrder: 1, targetGrazeDays: 3 }),
    ]);
    const proj = projectRotationSequence(pads, p, '2026-06-01');
    expect(proj.calendar).toHaveLength(2);
  });

  it('explicit cycles + startDate thread into the calendar', () => {
    const pads = [paddock('a'), paddock('b')];
    const p = plan([
      cell('a', { sequenceOrder: 0, targetGrazeDays: 2 }),
      cell('b', { sequenceOrder: 1, targetGrazeDays: 3 }),
    ]);
    const proj = projectRotationSequence(pads, p, '2026-07-15', 3);
    expect(proj.calendar).toHaveLength(6);
    expect(proj.calendar[0]!.moveInDateISO).toBe('2026-07-15');
  });
});
