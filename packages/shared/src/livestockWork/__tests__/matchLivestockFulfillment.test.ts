import { describe, expect, it } from 'vitest';
import {
  matchLivestockFulfillment,
  type MatchableCheckProof,
  type MatchableMoveEvent,
  type MatchableWorkRow,
} from '../matchLivestockFulfillment.js';

function moveWork(over: Partial<MatchableWorkRow> = {}): MatchableWorkRow {
  return {
    id: 'w-move-1',
    dueDate: '2026-06-15',
    direction: 'move_in',
    species: 'sheep',
    toPaddockId: 'pad-north',
    ...over,
  };
}

function checkWork(over: Partial<MatchableWorkRow> = {}): MatchableWorkRow {
  return {
    id: 'w-check-1',
    dueDate: '2026-06-15',
    kind: 'welfare-check',
    sourceProtocolId: 'hs-small-livestock-welfare',
    ...over,
  };
}

function moveEvent(over: Partial<MatchableMoveEvent> = {}): MatchableMoveEvent {
  return {
    id: 'ev-1',
    date: '2026-06-15',
    species: 'sheep',
    toPaddockId: 'pad-north',
    ...over,
  };
}

function checkProof(
  over: Partial<MatchableCheckProof> = {},
): MatchableCheckProof {
  return {
    id: 'pf-1',
    date: '2026-06-15',
    sourceProtocolId: 'hs-small-livestock-welfare',
    kind: 'welfare-check',
    ...over,
  };
}

describe('move-shaped matching (species + destination + window)', () => {
  it('matches same species + destination inside ±7 days, with signed offset', () => {
    const out = matchLivestockFulfillment({
      work: [moveWork()],
      moveEvents: [moveEvent({ date: '2026-06-17' })],
    });
    expect(out).toEqual([
      { workItemId: 'w-move-1', eventId: 'ev-1', shape: 'move', offsetDays: 2 },
    ]);
  });

  it('window is inclusive at ±7 and rejects ±8', () => {
    const at7 = matchLivestockFulfillment({
      work: [moveWork()],
      moveEvents: [moveEvent({ date: '2026-06-08' })],
    });
    expect(at7[0]?.offsetDays).toBe(-7);
    const at8 = matchLivestockFulfillment({
      work: [moveWork()],
      moveEvents: [moveEvent({ date: '2026-06-07' })],
    });
    expect(at8).toEqual([]);
  });

  it('rejects species and destination mismatches', () => {
    expect(
      matchLivestockFulfillment({
        work: [moveWork()],
        moveEvents: [moveEvent({ species: 'goats' })],
      }),
    ).toEqual([]);
    expect(
      matchLivestockFulfillment({
        work: [moveWork()],
        moveEvents: [moveEvent({ toPaddockId: 'pad-south' })],
      }),
    ).toEqual([]);
  });

  it('matches structure-destination rows against structure events', () => {
    const out = matchLivestockFulfillment({
      work: [
        moveWork({ toPaddockId: undefined, toStructureId: 'barn-1' }),
      ],
      moveEvents: [
        moveEvent({ toPaddockId: undefined, toStructureId: 'barn-1' }),
      ],
    });
    expect(out).toHaveLength(1);
  });

  it('a move row with no destination ref never matches', () => {
    expect(
      matchLivestockFulfillment({
        work: [moveWork({ toPaddockId: undefined })],
        moveEvents: [moveEvent()],
      }),
    ).toEqual([]);
  });

  it('excludes events already carrying a workItemId back-link', () => {
    expect(
      matchLivestockFulfillment({
        work: [moveWork()],
        moveEvents: [moveEvent({ workItemId: 'rs__other' })],
      }),
    ).toEqual([]);
  });

  it('honours a custom windowDays', () => {
    expect(
      matchLivestockFulfillment({
        work: [moveWork()],
        moveEvents: [moveEvent({ date: '2026-06-25' })],
        windowDays: 10,
      }),
    ).toHaveLength(1);
  });
});

describe('check-shaped matching (provenance + window)', () => {
  it('matches on sourceProtocolId when both sides carry one', () => {
    const out = matchLivestockFulfillment({
      work: [checkWork()],
      checkProofs: [checkProof({ date: '2026-06-13', kind: undefined })],
    });
    expect(out).toEqual([
      {
        workItemId: 'w-check-1',
        eventId: 'pf-1',
        shape: 'check',
        offsetDays: -2,
      },
    ]);
  });

  it('protocol identity wins over kind: same kind but different protocol is rejected', () => {
    expect(
      matchLivestockFulfillment({
        work: [checkWork()],
        checkProofs: [
          checkProof({ sourceProtocolId: 'lvo-herd-health-surveillance' }),
        ],
      }),
    ).toEqual([]);
  });

  it('falls back to kind equality when a protocol id is missing on either side', () => {
    const out = matchLivestockFulfillment({
      work: [checkWork({ sourceProtocolId: undefined })],
      checkProofs: [checkProof({ sourceProtocolId: undefined })],
    });
    expect(out).toHaveLength(1);
  });

  it('date proximity alone is NOT evidence — no shared axis, no match', () => {
    expect(
      matchLivestockFulfillment({
        work: [checkWork({ sourceProtocolId: undefined, kind: undefined })],
        checkProofs: [checkProof()],
      }),
    ).toEqual([]);
    expect(
      matchLivestockFulfillment({
        work: [checkWork()],
        checkProofs: [
          checkProof({ sourceProtocolId: undefined, kind: undefined }),
        ],
      }),
    ).toEqual([]);
  });

  it('rejects proofs outside the window', () => {
    expect(
      matchLivestockFulfillment({
        work: [checkWork()],
        checkProofs: [checkProof({ date: '2026-06-30' })],
      }),
    ).toEqual([]);
  });
});

describe('pool discipline', () => {
  it('one event proves at most one row: earliest-unfulfilled wins it', () => {
    const out = matchLivestockFulfillment({
      work: [
        moveWork({ id: 'w-late', dueDate: '2026-06-18' }),
        moveWork({ id: 'w-early', dueDate: '2026-06-12' }),
      ],
      moveEvents: [moveEvent({ date: '2026-06-15' })],
    });
    expect(out).toEqual([
      { workItemId: 'w-early', eventId: 'ev-1', shape: 'move', offsetDays: 3 },
    ]);
  });

  it('first-match-wins scans candidates in event-date order', () => {
    const out = matchLivestockFulfillment({
      work: [moveWork()],
      moveEvents: [
        moveEvent({ id: 'ev-later', date: '2026-06-16' }),
        moveEvent({ id: 'ev-earlier', date: '2026-06-14' }),
      ],
    });
    expect(out[0]?.eventId).toBe('ev-earlier');
  });

  it('move events never prove check rows and proofs never prove move rows', () => {
    const out = matchLivestockFulfillment({
      work: [checkWork(), moveWork()],
      moveEvents: [moveEvent()],
      checkProofs: [checkProof()],
    });
    expect(out).toHaveLength(2);
    expect(out.find((m) => m.workItemId === 'w-check-1')?.shape).toBe('check');
    expect(out.find((m) => m.workItemId === 'w-move-1')?.shape).toBe('move');
  });

  it('is deterministic regardless of input ordering', () => {
    const work = [
      moveWork({ id: 'w-b', dueDate: '2026-06-15' }),
      moveWork({ id: 'w-a', dueDate: '2026-06-15' }),
    ];
    const events = [
      moveEvent({ id: 'ev-2', date: '2026-06-15' }),
      moveEvent({ id: 'ev-1', date: '2026-06-15' }),
    ];
    const forward = matchLivestockFulfillment({ work, moveEvents: events });
    const reversed = matchLivestockFulfillment({
      work: [...work].reverse(),
      moveEvents: [...events].reverse(),
    });
    expect(forward).toEqual(reversed);
    // id tiebreak on equal dates: w-a takes ev-1, w-b takes ev-2.
    expect(forward).toEqual([
      { workItemId: 'w-a', eventId: 'ev-1', shape: 'move', offsetDays: 0 },
      { workItemId: 'w-b', eventId: 'ev-2', shape: 'move', offsetDays: 0 },
    ]);
  });

  it('returns [] for empty inputs', () => {
    expect(matchLivestockFulfillment({ work: [] })).toEqual([]);
    expect(matchLivestockFulfillment({ work: [moveWork()] })).toEqual([]);
  });
});
