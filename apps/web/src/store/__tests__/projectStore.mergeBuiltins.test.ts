/**
 * mergeBuiltins — the pure filter/append core lifted out of
 * applyBuiltinsToStore, now composing dedupeProjectsByIdentity.
 *
 * It (1) drops a stale local copy whose serverId an incoming builtin now
 * carries (server authoritative), (2) drops the legacy serverId-less
 * "351 House" seed, then (3) collapses any same-identity survivors.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi } from 'vitest';

// projectStore pulls in geodataCache at import; stub it so the module loads
// without IndexedDB (mirrors projectStore.batch.test.ts).
vi.mock('../../lib/geodataCache.js', () => ({
  geodataCache: { remove: async () => {}, removeByPrefix: async () => {} },
}));

import { mergeBuiltins } from '../projectStore.js';
import type { LocalProject } from '../projectStore.js';

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

describe('mergeBuiltins', () => {
  it('drops a stale local copy when an incoming builtin shares its serverId', () => {
    const stale = proj({ id: 'local-stale', name: 'Homestead Sample', serverId: 'srv-1', isBuiltin: true });
    const incoming = proj({ id: 'builtin-homestead', name: 'Homestead Sample', serverId: 'srv-1', isBuiltin: true });

    const out = mergeBuiltins([stale], [incoming]);

    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe('builtin-homestead');
  });

  it('drops the legacy serverId-less "351 House" seed on merge', () => {
    const legacy = proj({ id: 'legacy-351', name: '351 House', serverId: undefined, isBuiltin: false });
    const incoming = proj({ id: 'builtin-mtc', name: 'MTC', serverId: 'srv-mtc', isBuiltin: true });

    const out = mergeBuiltins([legacy], [incoming]);

    expect(out.map((p) => p.name)).toEqual(['MTC']);
  });

  it('collapses two same-identity builtins with distinct serverIds via the dedupe pass', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // The old copy's serverId is NOT the incoming one, so the serverId filter
    // misses it; the dedupe pass must still collapse the pair by identity.
    const old = proj({ id: 'old', name: 'Homestead', serverId: 'srv-old', isBuiltin: true, createdAt: '2026-01-01T00:00:00.000Z' });
    const fresh = proj({ id: 'fresh', name: 'Homestead', serverId: 'srv-new', isBuiltin: true, createdAt: '2026-02-01T00:00:00.000Z' });

    const out = mergeBuiltins([old], [fresh]);

    expect(out).toHaveLength(1);
    expect(out[0]!.serverId).toBe('srv-old'); // earliest createdAt survives
    warn.mockRestore();
  });

  it('leaves distinct-identity current rows untouched alongside incoming builtins', () => {
    const mine = proj({ id: 'mine', name: 'My Farm', serverId: 'srv-mine', isBuiltin: false });
    const incoming = proj({ id: 'builtin-mtc', name: 'MTC', serverId: 'srv-mtc', isBuiltin: true });

    const out = mergeBuiltins([mine], [incoming]);

    expect(out.map((p) => p.name).sort()).toEqual(['MTC', 'My Farm']);
  });
});
