import { describe, it, expect } from 'vitest';
import {
  computeFreshness,
  computeDomainFreshness,
} from '../observeFreshness.js';
import type { ObserveDataPoint } from '../../schemas/observe/dataPoint.schema.js';

const T = {
  currentMaxDays: 30,
  ageingMaxDays: 90,
};

const NOW = new Date('2026-05-28T12:00:00.000Z');
const NOW_MS = NOW.getTime();
const DAY_MS = 86_400_000;

function daysAgo(d: number): string {
  return new Date(NOW_MS - d * DAY_MS).toISOString();
}

function fixture(
  id: string,
  overrides: Partial<ObserveDataPoint> = {},
): ObserveDataPoint {
  return {
    id,
    projectId: 'p1',
    domainId: 'soil',
    sourceType: 'manual_observation',
    sourceActionId: null,
    sourceFeedEntryId: null,
    sourceObjectiveId: null,
    locationGeometry: null,
    cycleId: 0,
    isSuperseded: false,
    supersededBy: null,
    statusOutput: 'clear',
    measurementValue: null,
    proofItems: [],
    capturedAt: daysAgo(5),
    capturedBy: 'user-1',
    ...overrides,
  };
}

describe('computeFreshness', () => {
  it('classifies null point as missing', () => {
    expect(computeFreshness(null, NOW, T)).toBe('missing');
  });

  it('classifies undefined point as missing', () => {
    expect(computeFreshness(undefined, NOW, T)).toBe('missing');
  });

  it('classifies a non-parseable capturedAt as missing', () => {
    expect(
      computeFreshness({ capturedAt: 'xxxxxxx-not-a-date' }, NOW, T),
    ).toBe('missing');
  });

  it('classifies a 5-day-old capture as current', () => {
    expect(
      computeFreshness({ capturedAt: daysAgo(5) }, NOW, T),
    ).toBe('current');
  });

  it('classifies exactly currentMaxDays as current (inclusive boundary)', () => {
    expect(
      computeFreshness({ capturedAt: daysAgo(30) }, NOW, T),
    ).toBe('current');
  });

  it('classifies just past currentMaxDays as ageing', () => {
    expect(
      computeFreshness({ capturedAt: daysAgo(31) }, NOW, T),
    ).toBe('ageing');
  });

  it('classifies exactly ageingMaxDays as ageing (inclusive boundary)', () => {
    expect(
      computeFreshness({ capturedAt: daysAgo(90) }, NOW, T),
    ).toBe('ageing');
  });

  it('classifies past ageingMaxDays as stale', () => {
    expect(
      computeFreshness({ capturedAt: daysAgo(91) }, NOW, T),
    ).toBe('stale');
  });

  it('accepts numeric now (epoch ms)', () => {
    expect(
      computeFreshness({ capturedAt: daysAgo(5) }, NOW_MS, T),
    ).toBe('current');
  });
});

describe('computeDomainFreshness', () => {
  it('returns missing for an empty point set', () => {
    expect(computeDomainFreshness([], NOW, T)).toBe('missing');
  });

  it('picks the most recent active point', () => {
    const older = fixture('older', { capturedAt: daysAgo(60) }); // ageing
    const newer = fixture('newer', { capturedAt: daysAgo(5) }); // current
    expect(computeDomainFreshness([older, newer], NOW, T)).toBe('current');
  });

  it('skips superseded points even if they are more recent', () => {
    const newerSuperseded = fixture('newer', {
      capturedAt: daysAgo(5),
      isSuperseded: true,
      supersededBy: 'x',
    });
    const olderActive = fixture('older', { capturedAt: daysAgo(60) });
    expect(
      computeDomainFreshness([newerSuperseded, olderActive], NOW, T),
    ).toBe('ageing');
  });

  it('returns missing when every point is superseded', () => {
    const a = fixture('a', { isSuperseded: true, supersededBy: 'x' });
    const b = fixture('b', { isSuperseded: true, supersededBy: 'y' });
    expect(computeDomainFreshness([a, b], NOW, T)).toBe('missing');
  });

  it('returns missing when every point has a non-parseable capturedAt', () => {
    const a = fixture('a', { capturedAt: 'xxxxxxx-not-a-date' });
    const b = fixture('b', { capturedAt: 'yyyyyy-also-not-a-date' });
    expect(computeDomainFreshness([a, b], NOW, T)).toBe('missing');
  });
});
