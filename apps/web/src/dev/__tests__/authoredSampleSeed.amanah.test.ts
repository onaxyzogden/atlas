/**
 * AUTHORED_SAMPLE_SEED — standing Amanah scan (deep-audit 2026-07-03, A4).
 *
 * captureSampleSeed() throws on covenant-banned wording at CAPTURE time, but once
 * a snapshot is transcribed into authoredSampleSeed.ts it ships as a plain
 * constant — and until now NOTHING re-checked it. The file's own handoff doc
 * claimed the promoted seed would be "visible to the Amanah lint"; this test IS
 * that lint. It scans the shipped constant against the shared covenant union
 * (`@ogden/shared`), the same set the capture gate uses, so a hand-edited or
 * drifted snapshot can never ship dirty.
 *
 * While AUTHORED_SAMPLE_SEED is null (dormant) the first test is a no-op that
 * passes — so the second test proves the scan is NOT vacuous: the same walker +
 * detector DO flag a violation when one is planted.
 */
import { describe, it, expect } from 'vitest';
import { matchCovenantBannedTerms } from '@ogden/shared';
import { AUTHORED_SAMPLE_SEED } from '../content/authoredSampleSeed.js';

/** Every string leaf reachable in an arbitrary value (null / undefined safe). */
function collectStringLeaves(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStringLeaves);
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectStringLeaves);
  }
  return [];
}

describe('AUTHORED_SAMPLE_SEED Amanah standing scan (A4)', () => {
  it('the shipped authored sample carries no covenant-banned term', () => {
    const hits = collectStringLeaves(AUTHORED_SAMPLE_SEED).flatMap((s) =>
      matchCovenantBannedTerms(s),
    );
    expect(hits, `banned terms in the authored sample: ${hits.join(', ')}`).toEqual([]);
  });

  it('the scan is not vacuous — it flags a planted violation', () => {
    // A dormant (null) constant would make the guard above pass no matter what;
    // this pins that the walker + shared detector actually catch a hit.
    const dirty = {
      vision: { statement: 'Fund the farm through advance-purchase from investors.' },
      notes: ['a weekly CSA subscription box'],
    };
    const hits = collectStringLeaves(dirty).flatMap((s) => matchCovenantBannedTerms(s));
    expect(hits).toEqual(
      expect.arrayContaining(['advance-purchase', 'investor', 'CSA', 'subscription']),
    );
  });
});
