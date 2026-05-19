import { describe, expect, it } from 'vitest';
import {
  COMPOST_METHOD_SPEC,
  type CompostMethodSpec,
} from '../compostMethodSpec.js';
import type { CompostMethod } from '../../../../../store/compostCycleStore.js';

const ALL_METHODS: CompostMethod[] = [
  'hot',
  'cold',
  'vermicompost',
  'compost_tea',
];

describe('COMPOST_METHOD_SPEC', () => {
  it('has an entry for every CompostMethod (exhaustive)', () => {
    for (const m of ALL_METHODS) {
      expect(COMPOST_METHOD_SPEC[m]).toBeDefined();
    }
    expect(Object.keys(COMPOST_METHOD_SPEC).sort()).toEqual(
      [...ALL_METHODS].sort(),
    );
  });

  it('orders every low/high band (low <= high)', () => {
    for (const m of ALL_METHODS) {
      const s = COMPOST_METHOD_SPEC[m];
      expect(s.cnTargetLow).toBeLessThanOrEqual(s.cnTargetHigh);
      expect(s.cureWeeksLow).toBeLessThanOrEqual(s.cureWeeksHigh);
      if (s.tempCLow != null && s.tempCHigh != null) {
        expect(s.tempCLow).toBeLessThanOrEqual(s.tempCHigh);
      }
    }
  });

  it('keeps volumeRetention a documented fraction in (0, 1]', () => {
    for (const m of ALL_METHODS) {
      const r = COMPOST_METHOD_SPEC[m].volumeRetention;
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });

  it('uses null (not 0) to mean "no turning" for cold/vermicompost', () => {
    expect(COMPOST_METHOD_SPEC.cold.turnEveryDays).toBeNull();
    expect(COMPOST_METHOD_SPEC.vermicompost.turnEveryDays).toBeNull();
    expect(COMPOST_METHOD_SPEC.hot.turnEveryDays).toBeGreaterThan(0);
  });

  it('gives every method a non-empty heuristic note', () => {
    for (const m of ALL_METHODS) {
      const s: CompostMethodSpec = COMPOST_METHOD_SPEC[m];
      expect(s.note.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('COMPOST_METHOD_SPEC — covenant (compost volume, not finance)', () => {
  it('carries no financing / capital lexicon in notes', () => {
    const blob = ALL_METHODS.map((m) => COMPOST_METHOD_SPEC[m].note)
      .join(' ')
      .toLowerCase();
    expect(blob).not.toMatch(
      /\b(riba|gharar|csra|salam|investor|financing|cost of capital|equity|return on)\b/,
    );
  });
});
