/**
 * dedupeProjectsByIdentity — collapse same-identity duplicate projects.
 *
 * The observed bug: one browser's portfolio showed two identical
 * "Homestead — Atlas Sample" rows, both "Synced" (distinct serverIds), both
 * "Setup". This helper heals that at server-reconciliation moments by keeping
 * the earliest-createdAt row per identity and warning the orphan serverId.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi } from 'vitest';
import { dedupeProjectsByIdentity } from '../dedupeProjects.js';
import type { LocalProject } from '../projectStore.js';

// Only id/name/projectType/country/isBuiltin/createdAt/serverId are read by the
// helper; a loose override bag + cast keeps fixtures minimal.
function proj(overrides: Record<string, unknown> = {}): LocalProject {
  return {
    id: 'local-1',
    name: 'Homestead',
    projectType: 'homestead',
    country: 'US',
    isBuiltin: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as unknown as LocalProject;
}

describe('dedupeProjectsByIdentity', () => {
  it('collapses two same-identity non-builtin rows, keeping the earliest createdAt (the observed bug)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const earlier = proj({ id: 'a', serverId: 'srv-early', createdAt: '2026-01-01T00:00:00.000Z' });
    const later = proj({ id: 'b', serverId: 'srv-late', createdAt: '2026-02-01T00:00:00.000Z' });

    // Input in later-first order to prove the winner is chosen by createdAt,
    // not by position.
    const out = dedupeProjectsByIdentity([later, earlier]);

    expect(out).toHaveLength(1);
    expect(out[0]!.serverId).toBe('srv-early');
    // Orphan warning names the dropped loser's serverId so it stays diagnosable.
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('srv-late'));
    warn.mockRestore();
  });

  it('keeps a builtin and a same-name non-builtin as SEPARATE rows (class split)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const builtin = proj({ id: 'sample', isBuiltin: true, serverId: 'srv-sample' });
    const clone = proj({ id: 'clone', isBuiltin: false, serverId: 'srv-clone' });

    const out = dedupeProjectsByIdentity([builtin, clone]);

    // A system "Sample" and its non-builtin demo clone render differently and
    // serve different purposes — they are keyed into separate groups.
    expect(out).toHaveLength(2);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('returns the input array by reference when nothing is duplicated (selector-stable)', () => {
    const a = proj({ id: 'a', name: 'Homestead' });
    const b = proj({ id: 'b', name: 'Orchard' });
    const input = [a, b];

    const out = dedupeProjectsByIdentity(input);

    expect(out).toBe(input);
  });

  it('drops a row with missing/invalid createdAt in favor of one with a real timestamp', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const real = proj({ id: 'real', serverId: 'srv-real', createdAt: '2026-03-01T00:00:00.000Z' });
    const missing = proj({ id: 'missing', serverId: 'srv-missing', createdAt: '' });

    const out = dedupeProjectsByIdentity([missing, real]);

    expect(out).toHaveLength(1);
    expect(out[0]!.serverId).toBe('srv-real');
    warn.mockRestore();
  });

  it('on an exact createdAt tie, prefers the row that already has a serverId', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const noServer = proj({ id: 'nos', serverId: undefined, createdAt: '2026-01-01T00:00:00.000Z' });
    const hasServer = proj({ id: 'has', serverId: 'srv-x', createdAt: '2026-01-01T00:00:00.000Z' });

    const out = dedupeProjectsByIdentity([noServer, hasServer]);

    // Keeping a serverId-less winner would re-mint a fresh server row on the
    // next push (its clientLocalId differs), so the serverId row wins the tie.
    expect(out).toHaveLength(1);
    expect(out[0]!.serverId).toBe('srv-x');
    warn.mockRestore();
  });

  it('treats identity case- and whitespace-insensitively', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const a = proj({ id: 'a', name: 'Homestead', serverId: 'srv-a', createdAt: '2026-01-01T00:00:00.000Z' });
    const b = proj({ id: 'b', name: '  homestead  ', serverId: 'srv-b', createdAt: '2026-02-01T00:00:00.000Z' });

    const out = dedupeProjectsByIdentity([a, b]);

    expect(out).toHaveLength(1);
    expect(out[0]!.serverId).toBe('srv-a');
    warn.mockRestore();
  });

  it('does NOT collapse rows that only look equal under a naive space join (NUL-separator guard)', () => {
    // Field-boundary collision: name "a" + type "b c" and name "a b" + type "c"
    // both flatten to "a b c" under a space join. The NUL separator keeps them
    // distinct — a regression guard for exactly that class of false merge.
    const a = proj({ id: 'a', name: 'a', projectType: 'b c', country: 'x', serverId: 'srv-a' });
    const b = proj({ id: 'b', name: 'a b', projectType: 'c', country: 'x', serverId: 'srv-b' });

    const out = dedupeProjectsByIdentity([a, b]);

    expect(out).toHaveLength(2);
  });
});
