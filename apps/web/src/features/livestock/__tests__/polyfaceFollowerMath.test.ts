/**
 * polyfaceFollowerMath — follower-tier grouping + lagged follower moves.
 *
 * Covers single-tier (no follower), the textbook cattle→sheep→poultry stack
 * (+3d/+6d), specialist exclusion, lag math, and the calendar-wide rollup.
 */

import { describe, it, expect } from 'vitest';
import {
  FOLLOWER_LAG_DAYS,
  computeFollowerTiers,
  computeFollowerMoves,
  computeAllFollowerMoves,
} from '../polyfaceFollowerMath.js';
import type { MoveCalendarEntry } from '../rotationSequenceMath.js';
import type { LivestockSpecies } from '../../../store/livestockStore.js';

function lead(over: Partial<MoveCalendarEntry> = {}): MoveCalendarEntry {
  return {
    cellGroup: 'A',
    paddockId: 'pa',
    paddockName: 'Paddock A',
    sequenceOrder: 0,
    moveInDateISO: '2026-06-01',
    moveOutDateISO: '2026-06-04',
    grazeDays: 3,
    restDaysUntilNextGraze: 9,
    seasonAdjustedRestDays: 9,
    ...over,
  };
}

describe('computeFollowerTiers', () => {
  it('single niche ⇒ one tier (no follower stack)', () => {
    expect(computeFollowerTiers(['cattle'])).toEqual([['cattle']]);
    // two grazers still collapse to a single tier
    expect(computeFollowerTiers(['cattle', 'horses'])).toEqual([
      ['cattle', 'horses'],
    ]);
  });

  it('cattle + sheep + poultry ⇒ 3 ordered tiers (grazer → mixed → mobile)', () => {
    expect(
      computeFollowerTiers(['poultry', 'cattle', 'sheep']),
    ).toEqual([['cattle'], ['sheep'], ['poultry']]);
  });

  it('excludes specialists (bees, rabbits) from the stack', () => {
    expect(computeFollowerTiers(['cattle', 'bees'])).toEqual([['cattle']]);
    expect(computeFollowerTiers(['bees', 'rabbits'])).toEqual([]);
  });

  it('groups goats (browser) between mixed and mobile', () => {
    expect(
      computeFollowerTiers(['poultry', 'goats', 'sheep', 'cattle']),
    ).toEqual([['cattle'], ['sheep'], ['goats'], ['poultry']]);
  });
});

describe('computeFollowerMoves', () => {
  it('returns no followers for a single-tier paddock', () => {
    expect(computeFollowerMoves(lead(), computeFollowerTiers(['cattle']))).toEqual(
      [],
    );
  });

  it('cattle→sheep→poultry ⇒ followers at +3d and +6d', () => {
    const tiers = computeFollowerTiers(['cattle', 'sheep', 'poultry']);
    const moves = computeFollowerMoves(lead(), tiers);
    expect(moves).toHaveLength(2);

    expect(moves[0]!.tierIndex).toBe(1);
    expect(moves[0]!.species).toEqual(['sheep']);
    expect(moves[0]!.lagDays).toBe(FOLLOWER_LAG_DAYS); // +3
    expect(moves[0]!.moveInDateISO).toBe('2026-06-04'); // 06-01 + 3
    expect(moves[0]!.moveOutDateISO).toBe('2026-06-07'); // + grazeDays 3

    expect(moves[1]!.tierIndex).toBe(2);
    expect(moves[1]!.species).toEqual(['poultry']);
    expect(moves[1]!.lagDays).toBe(2 * FOLLOWER_LAG_DAYS); // +6
    expect(moves[1]!.moveInDateISO).toBe('2026-06-07'); // 06-01 + 6
    expect(moves[1]!.moveOutDateISO).toBe('2026-06-10');
  });

  it('carries the lead identity + graze duration through', () => {
    const tiers = computeFollowerTiers(['cattle', 'poultry']);
    const moves = computeFollowerMoves(
      lead({ paddockName: 'North', grazeDays: 5 }),
      tiers,
    );
    expect(moves).toHaveLength(1);
    expect(moves[0]!.leadPaddockName).toBe('North');
    expect(moves[0]!.grazeDays).toBe(5);
    expect(moves[0]!.moveOutDateISO).toBe('2026-06-09'); // 06-04 + 5
  });
});

describe('computeAllFollowerMoves', () => {
  it('derives followers per calendar entry from the species lookup', () => {
    const calendar = [
      lead({ paddockId: 'pa', moveInDateISO: '2026-06-01' }),
      lead({ paddockId: 'pb', moveInDateISO: '2026-06-04', paddockName: 'Paddock B' }),
    ];
    const speciesByPaddockId = new Map<string, LivestockSpecies[]>([
      ['pa', ['cattle', 'sheep', 'poultry']], // 3 tiers → 2 followers
      ['pb', ['cattle']], // single tier → 0 followers
    ]);
    const moves = computeAllFollowerMoves(calendar, speciesByPaddockId);
    expect(moves).toHaveLength(2);
    expect(moves.every((m) => m.leadPaddockId === 'pa')).toBe(true);
  });

  it('returns [] when no paddock has a follower stack', () => {
    const calendar = [lead({ paddockId: 'pa' })];
    const speciesByPaddockId = new Map<string, LivestockSpecies[]>([
      ['pa', ['cattle']],
    ]);
    expect(computeAllFollowerMoves(calendar, speciesByPaddockId)).toEqual([]);
  });
});
