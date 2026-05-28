/**
 * Phase 4 Slice 4.5 — locks the resolveShare discrimination behind the
 * public Observe share viewer route.
 *
 * Covers the three branches the viewer renders from:
 *   - unknown token   → unavailable (reason: 'unknown')
 *   - expired token   → unavailable (reason: 'expired') vs now
 *   - permanent share → ready (regardless of clock)
 *   - active share    → ready
 */

import { describe, it, expect } from 'vitest';
import type { PresentationShare } from '@ogden/shared';
import {
  resolveShare,
  type ResolveTokenFn,
} from '../observeShareResolution.js';

function share(
  overrides: Partial<PresentationShare> = {},
): PresentationShare {
  return {
    token: 'tok-fixture',
    projectId: 'proj-1',
    createdAt: '2026-05-01T00:00:00.000Z',
    expiresAt: '2026-06-01T00:00:00.000Z',
    expiry: '30d',
    sections: [],
    ...overrides,
  };
}

function makeResolver(hits: Record<string, PresentationShare>): ResolveTokenFn {
  return (token) => {
    const found = hits[token];
    if (!found) return null;
    return { projectId: found.projectId, share: found };
  };
}

describe('resolveShare', () => {
  it('returns unavailable/unknown when the token does not exist', () => {
    const result = resolveShare(
      'missing',
      makeResolver({}),
      Date.parse('2026-05-28T00:00:00.000Z'),
    );
    expect(result).toEqual({ kind: 'unavailable', reason: 'unknown' });
  });

  it('returns ready for an unexpired token', () => {
    const fixture = share({ token: 'live' });
    const result = resolveShare(
      'live',
      makeResolver({ live: fixture }),
      Date.parse('2026-05-15T00:00:00.000Z'),
    );
    expect(result).toEqual({
      kind: 'ready',
      projectId: 'proj-1',
      share: fixture,
    });
  });

  it('returns unavailable/expired when expiresAt has passed', () => {
    const fixture = share({
      token: 'old',
      expiresAt: '2026-05-01T00:00:00.000Z',
    });
    const result = resolveShare(
      'old',
      makeResolver({ old: fixture }),
      Date.parse('2026-05-28T00:00:00.000Z'),
    );
    expect(result).toEqual({ kind: 'unavailable', reason: 'expired' });
  });

  it('returns ready for permanent shares regardless of clock', () => {
    const fixture = share({
      token: 'forever',
      expiry: 'permanent',
      expiresAt: null,
    });
    const result = resolveShare(
      'forever',
      makeResolver({ forever: fixture }),
      Date.parse('2099-01-01T00:00:00.000Z'),
    );
    expect(result).toEqual({
      kind: 'ready',
      projectId: 'proj-1',
      share: fixture,
    });
  });

  it('treats a non-parseable expiresAt as non-expired (so the viewer renders rather than silently 404s)', () => {
    const fixture = share({
      token: 'odd',
      expiresAt: 'not-a-date' as unknown as string,
    });
    const result = resolveShare(
      'odd',
      makeResolver({ odd: fixture }),
      Date.parse('2026-05-28T00:00:00.000Z'),
    );
    expect(result.kind).toBe('ready');
  });
});
