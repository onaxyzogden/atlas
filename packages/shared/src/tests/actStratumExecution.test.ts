import { describe, it, expect } from 'vitest';
import {
  computeActStratumExecution,
  actStratumStateFromCounts,
  computeAllActStratumStates,
} from '../relationships/actStratumExecution.js';
import type { FieldActionStatus } from '../schemas/fieldAction/fieldAction.schema.js';

const mk = (stratumId: string | null, status: FieldActionStatus) => ({
  stratumId,
  status,
});

describe('computeActStratumExecution', () => {
  it('tallies counts per stratum in one pass', () => {
    const counts = computeActStratumExecution([
      mk('s2-land-reading', 'verified'),
      mk('s2-land-reading', 'in_progress'),
      mk('s2-land-reading', 'not_started'),
      mk('s3-systems-reading', 'submitted'),
    ]);
    expect(counts['s2-land-reading']).toEqual({
      total: 3,
      verified: 1,
      inFlight: 1,
      notStarted: 1,
    });
    expect(counts['s3-systems-reading']).toEqual({
      total: 1,
      verified: 0,
      inFlight: 1,
      notStarted: 0,
    });
  });

  it('skips actions with no stratumId', () => {
    const counts = computeActStratumExecution([
      mk(null, 'verified'),
      mk(undefined as unknown as null, 'verified'),
    ]);
    expect(Object.keys(counts)).toHaveLength(0);
  });
});

describe('actStratumStateFromCounts', () => {
  it('empty stratum is available, never locked', () => {
    expect(actStratumStateFromCounts(undefined)).toBe('available');
    expect(
      actStratumStateFromCounts({ total: 0, verified: 0, inFlight: 0, notStarted: 0 }),
    ).toBe('available');
  });

  it('all verified (total>0) is complete', () => {
    expect(
      actStratumStateFromCounts({ total: 2, verified: 2, inFlight: 0, notStarted: 0 }),
    ).toBe('complete');
  });

  it('any in-flight work is active', () => {
    expect(
      actStratumStateFromCounts({ total: 3, verified: 1, inFlight: 1, notStarted: 1 }),
    ).toBe('active');
  });

  it('only not_started work is available (not complete, not active)', () => {
    expect(
      actStratumStateFromCounts({ total: 2, verified: 0, inFlight: 0, notStarted: 2 }),
    ).toBe('available');
  });

  it('partial verification with no in-flight is available', () => {
    expect(
      actStratumStateFromCounts({ total: 3, verified: 2, inFlight: 0, notStarted: 1 }),
    ).toBe('available');
  });
});

describe('computeAllActStratumStates', () => {
  it('returns a state for every requested stratum, defaulting empty to available', () => {
    const states = computeAllActStratumStates(
      ['s1-project-foundation', 's2-land-reading', 's3-systems-reading'],
      [
        mk('s2-land-reading', 'verified'),
        mk('s2-land-reading', 'verified'),
        mk('s3-systems-reading', 'in_progress'),
      ],
    );
    expect(states).toEqual({
      's1-project-foundation': 'available',
      's2-land-reading': 'complete',
      's3-systems-reading': 'active',
    });
  });

  it('never returns locked', () => {
    const states = computeAllActStratumStates(['s1-project-foundation'], []);
    expect(states['s1-project-foundation']).not.toBe('locked');
  });
});
