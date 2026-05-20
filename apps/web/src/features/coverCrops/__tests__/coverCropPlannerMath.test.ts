/**
 * coverCropPlannerMath — pure helper tests (B5.2.x Part 1).
 */

import { describe, it, expect } from 'vitest';
import {
  addWindow,
  removeWindow,
  updateWindow,
  windowsEqual,
  defaultWindowFor,
  formatMonthRange,
  isValidMonth,
} from '../coverCropPlannerMath.js';
import { coverCropEntryFor } from '../coverCropCatalog.js';
import type { CropCoverWindow } from '../../../store/cropStore.js';

const W = (over: Partial<CropCoverWindow> = {}): CropCoverWindow => ({
  speciesId: 'winter_rye',
  startMonth: 9,
  endMonth: 3,
  role: 'winter_cover',
  ...over,
});

describe('isValidMonth', () => {
  it('accepts integers 1..12', () => {
    expect(isValidMonth(1)).toBe(true);
    expect(isValidMonth(12)).toBe(true);
    expect(isValidMonth(6)).toBe(true);
  });
  it('rejects 0, 13, NaN, non-integers', () => {
    expect(isValidMonth(0)).toBe(false);
    expect(isValidMonth(13)).toBe(false);
    expect(isValidMonth(NaN)).toBe(false);
    expect(isValidMonth(1.5)).toBe(false);
  });
});

describe('addWindow / removeWindow / updateWindow', () => {
  it('addWindow appends and returns a new array', () => {
    const a: CropCoverWindow[] = [];
    const b = addWindow(a, W());
    expect(b).not.toBe(a);
    expect(b).toHaveLength(1);
    expect(b[0]!.speciesId).toBe('winter_rye');
  });

  it('removeWindow drops the right index and returns a new array', () => {
    const a = [W({ speciesId: 'a' }), W({ speciesId: 'b' }), W({ speciesId: 'c' })];
    const b = removeWindow(a, 1);
    expect(b).not.toBe(a);
    expect(b.map((w) => w.speciesId)).toEqual(['a', 'c']);
  });

  it('removeWindow ignores out-of-range index but still returns a fresh array', () => {
    const a = [W({ speciesId: 'a' })];
    const b = removeWindow(a, 7);
    expect(b).not.toBe(a);
    expect(b).toEqual(a);
  });

  it('updateWindow merges the patch into the right index', () => {
    const a = [W({ speciesId: 'a' }), W({ speciesId: 'b' })];
    const b = updateWindow(a, 1, { startMonth: 4, endMonth: 6 });
    expect(b[0]!.startMonth).toBe(9);
    expect(b[1]!.speciesId).toBe('b');
    expect(b[1]!.startMonth).toBe(4);
    expect(b[1]!.endMonth).toBe(6);
  });

  it('updateWindow ignores out-of-range index', () => {
    const a = [W()];
    const b = updateWindow(a, 5, { startMonth: 1 });
    expect(b).toEqual(a);
  });
});

describe('windowsEqual', () => {
  it('treats undefined and [] as equal', () => {
    expect(windowsEqual(undefined, [])).toBe(true);
    expect(windowsEqual([], undefined)).toBe(true);
  });
  it('returns true for equal contents', () => {
    expect(windowsEqual([W()], [W()])).toBe(true);
  });
  it('detects a single-field difference', () => {
    expect(windowsEqual([W()], [W({ role: 'smother' })])).toBe(false);
    expect(windowsEqual([W()], [W({ startMonth: 8 })])).toBe(false);
    expect(windowsEqual([W()], [W({ endMonth: 4 })])).toBe(false);
    expect(windowsEqual([W()], [W({ speciesId: 'oats' })])).toBe(false);
  });
  it('detects length mismatch', () => {
    expect(windowsEqual([W()], [W(), W()])).toBe(false);
  });
});

describe('defaultWindowFor', () => {
  it('extends the planting window through the catalog entry living-roots tail', () => {
    const entry = coverCropEntryFor('winter_rye')!;
    // plantingMonthWindow [9, 10]; livingRootSeasons fall, winter, spring → tail = spring → 5
    const w = defaultWindowFor(entry);
    expect(w.startMonth).toBe(9);
    expect(w.endMonth).toBe(5);
  });
  it('summer-only entry resolves to summer tail', () => {
    const entry = coverCropEntryFor('buckwheat')!;
    // plantingMonthWindow [5, 7]; livingRootSeasons summer → tail = 8
    const w = defaultWindowFor(entry);
    expect(w.startMonth).toBe(5);
    expect(w.endMonth).toBe(8);
  });
  it('fall-only entry resolves to fall tail', () => {
    const entry = coverCropEntryFor('tillage_radish')!;
    // plantingMonthWindow [8, 9]; livingRootSeasons fall → tail = 11
    const w = defaultWindowFor(entry);
    expect(w.startMonth).toBe(8);
    expect(w.endMonth).toBe(11);
  });
});

describe('formatMonthRange', () => {
  it('formats a single month', () => {
    expect(formatMonthRange(6, 6)).toBe('Jun');
  });
  it('formats a normal range', () => {
    expect(formatMonthRange(3, 7)).toBe('Mar–Jul');
  });
  it('formats a year-wrap range', () => {
    expect(formatMonthRange(10, 3)).toBe('Oct–Mar');
  });
  it('returns em-dash for invalid input', () => {
    expect(formatMonthRange(0, 5)).toBe('—');
    expect(formatMonthRange(5, 13)).toBe('—');
    expect(formatMonthRange(NaN, 1)).toBe('—');
  });
});
