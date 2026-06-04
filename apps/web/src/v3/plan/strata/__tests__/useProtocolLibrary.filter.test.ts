/**
 * @vitest-environment happy-dom
 *
 * filterProtocolGroups — the pure stratum-scope helper behind Protocol Mode's
 * "show only the open stratum" behaviour. Protocol Mode is navigated by stratum,
 * so the center list filters the full S1→S7 grouping down to the open one.
 *   1. A matching activeStratumId returns only that group.
 *   2. A null activeStratumId returns all groups (Act-rail / no open stratum).
 *   3. A non-matching id returns no groups.
 *   4. The result is a fresh array (never the same reference) so callers can't
 *      accidentally mutate the source.
 */

import { describe, it, expect } from 'vitest';
import {
  filterProtocolGroups,
  type ProtocolTierGroup,
} from '../useProtocolLibrary.js';

const GROUPS: ProtocolTierGroup[] = [
  { tier: 'S1 · Project Foundation', stratumId: 's1-project-foundation', items: [] },
  { tier: 'S6 · Integration Design', stratumId: 's6-integration-design', items: [] },
  // Defensive fallback bucket (e.g. a legacy template with no stratumId).
  { tier: 'Standing protocols', stratumId: undefined, items: [] },
];

describe('filterProtocolGroups', () => {
  it('returns only the group matching the open stratum', () => {
    const result = filterProtocolGroups(GROUPS, 's6-integration-design');
    expect(result).toHaveLength(1);
    expect(result[0]!.stratumId).toBe('s6-integration-design');
  });

  it('returns all groups when activeStratumId is null', () => {
    const result = filterProtocolGroups(GROUPS, null);
    expect(result).toHaveLength(GROUPS.length);
    // Fresh array, not the source reference.
    expect(result).not.toBe(GROUPS);
  });

  it('returns no groups for a stratum id absent from the set', () => {
    expect(filterProtocolGroups(GROUPS, 's3-systems-reading')).toHaveLength(0);
  });

  it('never matches the undefined fallback bucket via a real stratum id', () => {
    const result = filterProtocolGroups(GROUPS, 's1-project-foundation');
    expect(result).toHaveLength(1);
    expect(result[0]!.tier).toBe('S1 · Project Foundation');
  });
});
