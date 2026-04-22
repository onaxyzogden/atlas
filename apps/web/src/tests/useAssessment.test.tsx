/**
 * @vitest-environment happy-dom
 *
 * Audit #14 — `useAssessment` hook coverage.
 *
 * Verifies the two server-authored states callers need to distinguish:
 *   1. `NOT_READY` (Tier-3 writer hasn't fired) → `isNotReady: true`, `data: null`.
 *   2. `200` with row payload                   → `data` populated with snake_case fields.
 *
 * The hook is the bridge wired by bundle #15 (ADR
 * 2026-04-22-site-assessment-panel-server-wiring): it replaces
 * client-side recomputation in `SiteAssessmentPanel` with the persisted
 * Tier-3 score. Parity with the scorer was proven at |Δ|=0.000 in
 * bundle #12, so the server value is the source of truth.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAssessment } from '../hooks/useProjectQueries.js';

// Mock the api client — we test the hook's contract, not network wiring.
vi.mock('../lib/apiClient.js', () => ({
  api: {
    projects: {
      assessment: vi.fn(),
    },
  },
}));

import { api } from '../lib/apiClient.js';

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useAssessment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns isNotReady=true when the server signals NOT_READY', async () => {
    // ApiError carries `code` property — hook catches it specifically.
    class FakeApiError extends Error {
      code = 'NOT_READY';
    }
    vi.mocked(api.projects.assessment).mockRejectedValueOnce(new FakeApiError('Assessment not yet computed'));

    const { result } = renderHook(() => useAssessment('proj-1'), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isNotReady).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('returns data populated when the server returns a current site_assessments row', async () => {
    const row = {
      id: '00000000-0000-0000-0000-000000000001',
      project_id: '00000000-0000-0000-0000-000000000aaa',
      version: 3,
      is_current: true,
      confidence: 'high' as const,
      suitability_score: 78.0,
      buildability_score: 72.5,
      water_resilience_score: 81.0,
      ag_potential_score: 85.3,
      overall_score: 78.0,
      score_breakdown: { suitability: { slope: 80 } },
      flags: [],
      needs_site_visit: false,
      data_sources_used: ['elevation', 'soils', 'climate'],
      computed_at: '2026-04-22T01:08:00.000Z',
      terrainAnalysis: null,
    };
    vi.mocked(api.projects.assessment).mockResolvedValueOnce({
      data: row,
      error: null,
    });

    const { result } = renderHook(() => useAssessment('proj-1'), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isNotReady).toBe(false);
    expect(result.current.data).toEqual(row);
    expect(result.current.data?.overall_score).toBe(78.0);
  });

  it('does not fire when projectId is empty', () => {
    renderHook(() => useAssessment(''), { wrapper: wrapper() });
    expect(vi.mocked(api.projects.assessment)).not.toHaveBeenCalled();
  });
});
