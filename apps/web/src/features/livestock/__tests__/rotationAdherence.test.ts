// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  computeRotationAdherence,
  type RotationAdherenceInput,
} from '../rotationAdherence.js';
import {
  type RotationCell,
  type RotationPlan,
} from '../rotationSequenceMath.js';
import type { Paddock, LivestockSpecies } from '../../../store/livestockStore.js';
import type { LivestockMoveEvent } from '../../../store/livestockMoveLogStore.js';

/* ---------- factory helpers ---------- */

function paddock(id: string, overrides: Partial<Paddock> = {}): Paddock {
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

function cell(paddockId: string, overrides: Partial<RotationCell> = {}): RotationCell {
  return {
    paddockId,
    cellGroup: 'A',
    sequenceOrder: 0,
    targetGrazeDays: 3,
    targetRestDays: 35,
    ...overrides,
  };
}

function plan(cells: RotationCell[], projectId = 'p1'): RotationPlan {
  return { projectId, cells };
}

let moveSeq = 0;
function move(overrides: Partial<LivestockMoveEvent> = {}): LivestockMoveEvent {
  moveSeq += 1;
  return {
    id: `m${moveSeq}`,
    projectId: 'p1',
    date: '2026-01-01',
    direction: 'move_in',
    species: 'sheep',
    headCount: 10,
    ...overrides,
  };
}

/** A linked in/out pair for a closed occupancy of `paddockId`. */
function pair(
  paddockId: string,
  inDate: string,
  outDate: string,
  idSeed: string,
): [LivestockMoveEvent, LivestockMoveEvent] {
  const inId = `${idSeed}-in`;
  const outId = `${idSeed}-out`;
  return [
    move({
      id: inId,
      date: inDate,
      direction: 'move_in',
      toPaddockId: paddockId,
      linkedEventId: outId,
    }),
    move({
      id: outId,
      date: outDate,
      direction: 'move_out',
      fromPaddockId: paddockId,
      linkedEventId: inId,
    }),
  ];
}

function input(overrides: Partial<RotationAdherenceInput> = {}): RotationAdherenceInput {
  return {
    paddocks: [],
    plan: null,
    moves: [],
    now: '2026-05-19T00:00:00.000Z',
    ...overrides,
  };
}

/* ---------- 1. empties ---------- */

describe('computeRotationAdherence — empties', () => {
  it('empty input → ok light, no recs, zero counts', () => {
    const res = computeRotationAdherence(input());
    expect(res.light).toBe('ok');
    expect(res.recommendations).toEqual([]);
    expect(res.counts).toEqual({
      overgrazed: 0,
      underRestedReentry: 0,
      shortRest: 0,
      earlyMove: 0,
      unplanned: 0,
      paddocksTracked: 0,
    });
  });
});

/* ---------- 2. overgrazed ---------- */

describe('overgrazed — graze days beyond target', () => {
  it('closed occupancy 10 days vs 3-day target → high overgrazed, alert', () => {
    const [pin, pout] = pair('x', '2026-03-01', '2026-03-11', 'a');
    const res = computeRotationAdherence(
      input({
        paddocks: [paddock('x')],
        plan: plan([cell('x', { targetGrazeDays: 3, targetRestDays: 35 })]),
        moves: [pin, pout],
      }),
    );
    expect(res.light).toBe('alert');
    const rec = res.recommendations.find((r) => r.kind === 'overgrazed')!;
    expect(rec.severity).toBe('high');
    expect(rec.id).toBe('overgrazed:x');
    expect(rec.paddockId).toBe('x');
    expect(res.counts.overgrazed).toBe(1);
    expect(res.counts.paddocksTracked).toBe(1);
  });
});

/* ---------- 3. under-rested re-entry ---------- */

describe('under-rested re-entry — gap below required recovery', () => {
  it('gap 5 days < 30 required → high under-rested-reentry', () => {
    // species [] → requiredRestDays = 30. Two short closed occupancies of x.
    const [a1, a2] = pair('x', '2026-03-01', '2026-03-03', 's1'); // 2-day graze
    const [b1, b2] = pair('x', '2026-03-08', '2026-03-10', 's2'); // gap 5 days
    const res = computeRotationAdherence(
      input({
        paddocks: [paddock('x', { species: [] })],
        plan: plan([cell('x', { targetGrazeDays: 5, targetRestDays: 35 })]),
        moves: [a1, a2, b1, b2],
      }),
    );
    expect(res.light).toBe('alert');
    const rec = res.recommendations.find((r) => r.kind === 'under-rested-reentry')!;
    expect(rec.severity).toBe('high');
    expect(rec.id).toBe('under-rested-reentry:x');
    expect(res.counts.underRestedReentry).toBe(1);
  });
});

/* ---------- 4. short-rest ---------- */

describe('short-rest — required <= gap < target rest', () => {
  it('gap 32 days, required 30, targetRest 35 → med short-rest', () => {
    const [a1, a2] = pair('x', '2026-03-01', '2026-03-04', 's1'); // 3-day graze (== target)
    const [b1, b2] = pair('x', '2026-04-05', '2026-04-08', 's2'); // gap 32 days
    const res = computeRotationAdherence(
      input({
        paddocks: [paddock('x', { species: [] })],
        plan: plan([cell('x', { targetGrazeDays: 3, targetRestDays: 35 })]),
        moves: [a1, a2, b1, b2],
      }),
    );
    expect(res.light).toBe('warn');
    const rec = res.recommendations.find((r) => r.kind === 'short-rest')!;
    expect(rec.severity).toBe('med');
    expect(rec.id).toBe('short-rest:x');
    expect(res.counts.shortRest).toBe(1);
    expect(res.counts.underRestedReentry).toBe(0);
  });
});

/* ---------- 5. early-move ---------- */

describe('early-move — closed occupancy under target graze', () => {
  it('closed 1-day occupancy vs 5-day target → med early-move', () => {
    const [pin, pout] = pair('x', '2026-03-01', '2026-03-02', 'e1');
    const res = computeRotationAdherence(
      input({
        paddocks: [paddock('x')],
        plan: plan([cell('x', { targetGrazeDays: 5, targetRestDays: 35 })]),
        moves: [pin, pout],
      }),
    );
    expect(res.light).toBe('warn');
    const rec = res.recommendations.find((r) => r.kind === 'early-move')!;
    expect(rec.severity).toBe('med');
    expect(rec.id).toBe('early-move:x');
    expect(res.counts.earlyMove).toBe(1);
  });
});

/* ---------- 6. unplanned-paddock ---------- */

describe('unplanned-paddock — move into paddock absent from plan', () => {
  it('move into paddock with no cell → low unplanned, warn', () => {
    const [pin, pout] = pair('z', '2026-03-01', '2026-03-02', 'u1');
    const res = computeRotationAdherence(
      input({
        paddocks: [paddock('z')],
        plan: plan([cell('x')]),
        moves: [pin, pout],
      }),
    );
    expect(res.light).toBe('warn');
    const rec = res.recommendations.find((r) => r.kind === 'unplanned-paddock')!;
    expect(rec.severity).toBe('low');
    expect(rec.id).toBe('unplanned-paddock:z');
    expect(res.counts.unplanned).toBe(1);
  });

  it('null plan → every destination paddock is unplanned', () => {
    const [pin, pout] = pair('z', '2026-03-01', '2026-03-02', 'u2');
    const res = computeRotationAdherence(
      input({ paddocks: [paddock('z')], plan: null, moves: [pin, pout] }),
    );
    expect(res.counts.unplanned).toBe(1);
    expect(res.light).toBe('warn');
  });
});

/* ---------- 7. open occupancy ---------- */

describe('open occupancy — move_in with no linked move_out', () => {
  it('open interval running to now well past target → overgrazed', () => {
    const pin = move({
      id: 'open-1',
      date: '2026-03-01',
      direction: 'move_in',
      toPaddockId: 'x',
    });
    const res = computeRotationAdherence(
      input({
        paddocks: [paddock('x')],
        plan: plan([cell('x', { targetGrazeDays: 3, targetRestDays: 35 })]),
        moves: [pin],
        now: '2026-05-19T00:00:00.000Z',
      }),
    );
    expect(res.counts.overgrazed).toBe(1);
    expect(res.light).toBe('alert');
    // open interval is NOT closed → no early-move even if it were short
    expect(res.counts.earlyMove).toBe(0);
  });
});

/* ---------- 8. deterministic ranking ---------- */

describe('deterministic ranking', () => {
  it('orders severity high→med→low, ties by count desc then id asc', () => {
    // x: overgrazed (high). y: overgrazed (high). z1,z2: unplanned (low).
    const [x1, x2] = pair('x', '2026-03-01', '2026-03-20', 'r1'); // long graze
    const [y1, y2] = pair('y', '2026-03-01', '2026-03-20', 'r2'); // long graze
    const [z1, z2] = pair('z', '2026-03-01', '2026-03-02', 'r3'); // unplanned
    const [w1, w2] = pair('w', '2026-03-01', '2026-03-02', 'r4'); // unplanned
    const res = computeRotationAdherence(
      input({
        paddocks: [paddock('x'), paddock('y'), paddock('z'), paddock('w')],
        plan: plan([
          cell('x', { targetGrazeDays: 3, targetRestDays: 35 }),
          cell('y', { targetGrazeDays: 3, targetRestDays: 35 }),
        ]),
        moves: [x1, x2, y1, y2, z1, z2, w1, w2],
      }),
    );
    const kinds = res.recommendations.map((r) => r.kind);
    // all high (overgrazed) before all low (unplanned-paddock)
    const firstLow = kinds.indexOf('unplanned-paddock');
    expect(kinds.slice(0, firstLow).every((k) => k === 'overgrazed')).toBe(true);
    // equal-severity ties: same count (1 each) → id ascending
    const overIds = res.recommendations
      .filter((r) => r.kind === 'overgrazed')
      .map((r) => r.id);
    expect(overIds).toEqual([...overIds].sort());
    const unplannedIds = res.recommendations
      .filter((r) => r.kind === 'unplanned-paddock')
      .map((r) => r.id);
    expect(unplannedIds).toEqual([...unplannedIds].sort());
    expect(res.light).toBe('alert');
  });
});

/* ---------- 9. no input mutation ---------- */

describe('purity — no input mutation', () => {
  it('frozen inputs do not throw and stay unchanged', () => {
    const pad = Object.freeze(paddock('x'));
    const [pin, pout] = pair('x', '2026-03-01', '2026-03-11', 'f1');
    Object.freeze(pin);
    Object.freeze(pout);
    const cells = Object.freeze([
      Object.freeze(cell('x', { targetGrazeDays: 3, targetRestDays: 35 })),
    ]) as RotationCell[];
    const thePlan = Object.freeze({ projectId: 'p1', cells }) as RotationPlan;
    const paddocks = Object.freeze([pad]) as Paddock[];
    const moves = Object.freeze([pin, pout]) as LivestockMoveEvent[];

    const inp: RotationAdherenceInput = {
      paddocks,
      plan: thePlan,
      moves,
      now: '2026-05-19T00:00:00.000Z',
    };

    expect(() => computeRotationAdherence(inp)).not.toThrow();
    expect(inp.paddocks).toBe(paddocks);
    expect(inp.moves).toBe(moves);
    expect(inp.plan).toBe(thePlan);
    expect(inp.plan!.cells).toBe(cells);
    expect(paddocks).toHaveLength(1);
    expect(moves).toHaveLength(2);
  });
});

/* ---------- 10. covenant ---------- */

describe('covenant — no finance lexicon in output', () => {
  it('serialized output never matches finance regex', () => {
    const [x1, x2] = pair('x', '2026-03-01', '2026-03-20', 'c1'); // overgrazed
    const [a1, a2] = pair('x', '2026-03-25', '2026-03-27', 'c2'); // under-rested re-entry
    const [z1, z2] = pair('z', '2026-03-01', '2026-03-02', 'c3'); // unplanned
    const res = computeRotationAdherence(
      input({
        paddocks: [paddock('x', { species: [] }), paddock('z')],
        plan: plan([cell('x', { targetGrazeDays: 3, targetRestDays: 35 })]),
        moves: [x1, x2, a1, a2, z1, z2],
      }),
    );
    expect(JSON.stringify(res)).not.toMatch(
      /interest|riba|invest|equity|capital|financ|loan|yield|return|salam|gharar/i,
    );
  });
});
