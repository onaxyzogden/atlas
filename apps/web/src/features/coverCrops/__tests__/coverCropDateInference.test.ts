/**
 * inferCoverCropDates / resolveProjectStartYear — pure unit tests (B5.2.x.c).
 */

import { describe, it, expect } from 'vitest';
import {
  inferCoverCropDates,
  resolveProjectStartYear,
} from '../coverCropDateInference.js';

describe('inferCoverCropDates', () => {
  it('emits day-01 start + day-28 end inside a single year (Sep–Nov)', () => {
    expect(inferCoverCropDates({ startMonth: 9, endMonth: 11 }, 2026)).toEqual({
      start: '2026-09-01',
      end: '2026-11-28',
    });
  });

  it('wraps year boundary when endMonth < startMonth (Oct–Mar)', () => {
    expect(inferCoverCropDates({ startMonth: 10, endMonth: 3 }, 2026)).toEqual({
      start: '2026-10-01',
      end: '2027-03-28',
    });
  });

  it('treats endMonth === startMonth as a single-month window (no wrap)', () => {
    expect(inferCoverCropDates({ startMonth: 5, endMonth: 5 }, 2026)).toEqual({
      start: '2026-05-01',
      end: '2026-05-28',
    });
  });

  it('pads single-digit months to MM', () => {
    expect(inferCoverCropDates({ startMonth: 1, endMonth: 2 }, 2026)).toEqual({
      start: '2026-01-01',
      end: '2026-02-28',
    });
  });

  it('clamps invalid months into 1..12', () => {
    expect(inferCoverCropDates({ startMonth: 0, endMonth: 13 }, 2026)).toEqual({
      start: '2026-01-01',
      end: '2026-12-28',
    });
  });
});

describe('resolveProjectStartYear', () => {
  it('uses startDate year when parseable', () => {
    expect(resolveProjectStartYear('2026-04-15')).toBe(2026);
  });

  it('falls back to current year when null', () => {
    const now = () => new Date('2030-06-01T00:00:00Z');
    expect(resolveProjectStartYear(null, now)).toBe(2030);
  });

  it('falls back to current year when unparseable', () => {
    const now = () => new Date('2030-06-01T00:00:00Z');
    expect(resolveProjectStartYear('not-a-date', now)).toBe(2030);
  });

  it('falls back to current year on empty string', () => {
    const now = () => new Date('2030-06-01T00:00:00Z');
    expect(resolveProjectStartYear('', now)).toBe(2030);
  });
});
