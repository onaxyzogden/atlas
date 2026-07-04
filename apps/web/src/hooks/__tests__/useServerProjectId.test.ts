/**
 * @vitest-environment happy-dom
 *
 * useServerProjectId / resolveServerProjectId (H4, deep-audit 2026-07-03) —
 * the one seam turning a route-param or store project id into the SERVER
 * project UUID the HTTP APIs address. Local ids are crypto.randomUUID()
 * minted client-side and distinct from serverId by construction, so passing
 * one to an export/publish endpoint 404s. Null means "not yet synced":
 * callers disable their control honestly instead of firing a doomed request.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Minimal zustand stub so this stays a unit test and does not drag
// projectStore's full module graph (persist/idb/seed data) in — same idiom
// as useViewScope.test.ts.
vi.mock('../../store/projectStore.js', async () => {
  const { create } = await import('zustand');
  return {
    useProjectStore: create(() => ({
      projects: [] as Array<{ id: string; serverId?: string | null }>,
    })),
  };
});
import { useProjectStore, type LocalProject } from '../../store/projectStore.js';
import { resolveServerProjectId, useServerProjectId } from '../useServerProjectId.js';

const LOCAL_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SERVER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

// The hook only reads id/serverId; the mock store holds these slim rows.
const setProjects = (rows: Array<{ id: string; serverId?: string | null }>) =>
  useProjectStore.setState({ projects: rows as unknown as LocalProject[] });

describe('resolveServerProjectId', () => {
  beforeEach(() => {
    setProjects([]);
  });

  it('maps a local project id to its serverId', () => {
    setProjects([{ id: LOCAL_ID, serverId: SERVER_ID }]);
    expect(resolveServerProjectId(LOCAL_ID)).toBe(SERVER_ID);
  });

  it('passes a serverId through when the caller already holds one', () => {
    setProjects([{ id: LOCAL_ID, serverId: SERVER_ID }]);
    expect(resolveServerProjectId(SERVER_ID)).toBe(SERVER_ID);
  });

  it('returns null for a local-only (not yet synced) project', () => {
    setProjects([{ id: 'mtc', serverId: null }]);
    expect(resolveServerProjectId('mtc')).toBeNull();
  });

  it('returns null for an unknown id', () => {
    expect(resolveServerProjectId('nope')).toBeNull();
  });

  it('returns null for a missing id', () => {
    expect(resolveServerProjectId(undefined)).toBeNull();
    expect(resolveServerProjectId(null)).toBeNull();
  });
});

describe('useServerProjectId', () => {
  beforeEach(() => {
    setProjects([]);
  });
  afterEach(() => {
    cleanup();
  });

  it('resolves reactively: enables the moment the project finishes syncing', () => {
    setProjects([{ id: LOCAL_ID, serverId: null }]);
    const { result } = renderHook(() => useServerProjectId(LOCAL_ID));
    expect(result.current).toBeNull();

    act(() => {
      setProjects([{ id: LOCAL_ID, serverId: SERVER_ID }]);
    });
    expect(result.current).toBe(SERVER_ID);
  });

  it('returns null for an undefined route param', () => {
    const { result } = renderHook(() => useServerProjectId(undefined));
    expect(result.current).toBeNull();
  });
});
