import { describe, it, expect } from 'vitest';
import { resolveActStratumId } from '../resolveActStratumId.js';

const VALID = [
  's1-project-foundation',
  's2-land-reading',
  's3-systems-reading',
  's4-foundation-decisions',
  's5-system-design',
  's6-integration-design',
  's7-phasing-resourcing',
] as const;

const S1 = 's1-project-foundation';

describe('resolveActStratumId', () => {
  it('prefers a valid explicit stratum param (Plan→Act preservation)', () => {
    expect(
      resolveActStratumId({
        paramStratumId: 's5-system-design',
        validStratumIds: VALID,
        objectiveStratumId: 's4-foundation-decisions',
        fallbackStratumId: S1,
      }),
    ).toBe('s5-system-design');
  });

  it('falls back to S1 on cold entry (no param, no objective)', () => {
    expect(
      resolveActStratumId({
        paramStratumId: undefined,
        validStratumIds: VALID,
        objectiveStratumId: null,
        fallbackStratumId: S1,
      }),
    ).toBe(S1);
  });

  it("ignores a stale/garbage param and falls back (not the empty shell)", () => {
    expect(
      resolveActStratumId({
        paramStratumId: 'not-a-real-stratum',
        validStratumIds: VALID,
        objectiveStratumId: null,
        fallbackStratumId: S1,
      }),
    ).toBe(S1);
  });

  it("derives the stratum from the selected objective when there is no param (objective deep-link)", () => {
    expect(
      resolveActStratumId({
        paramStratumId: null,
        validStratumIds: VALID,
        objectiveStratumId: 's5-system-design',
        fallbackStratumId: S1,
      }),
    ).toBe('s5-system-design');
  });

  it('param wins over the objective when both are present', () => {
    expect(
      resolveActStratumId({
        paramStratumId: 's6-integration-design',
        validStratumIds: VALID,
        objectiveStratumId: 's4-foundation-decisions',
        fallbackStratumId: S1,
      }),
    ).toBe('s6-integration-design');
  });

  it('a garbage param falls through to the objective, not S1', () => {
    expect(
      resolveActStratumId({
        paramStratumId: 'garbage',
        validStratumIds: VALID,
        objectiveStratumId: 's3-systems-reading',
        fallbackStratumId: S1,
      }),
    ).toBe('s3-systems-reading');
  });
});
