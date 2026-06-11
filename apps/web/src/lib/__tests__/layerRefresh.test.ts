/**
 * layerRefresh — debounced layer_complete → refreshProject bridge.
 *
 * Verifies the WS-side contract: a burst of layer_complete events for the
 * connected project coalesces into exactly ONE refreshProject call with the
 * args derived from the project's boundary; unknown/boundary-less projects
 * are skipped without throwing; cancel drops pending refreshes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const refreshProject = vi.fn();
// Mutated per-test; the store mocks read it live via getState().
const projects: Array<Record<string, unknown>> = [];

vi.mock('../../store/projectStore.js', () => ({
  useProjectStore: { getState: () => ({ projects }) },
}));
vi.mock('../../store/siteDataStore.js', () => ({
  useSiteDataStore: { getState: () => ({ refreshProject }) },
}));

import {
  scheduleLayerCompleteRefresh,
  cancelLayerCompleteRefreshes,
} from '../layerRefresh.js';

const boundary = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-78.3, 44.4],
            [-78.1, 44.4],
            [-78.1, 44.6],
            [-78.3, 44.6],
            [-78.3, 44.4],
          ],
        ],
      },
    },
  ],
};

function addProject(overrides?: Record<string, unknown>) {
  projects.push({
    id: 'local-1',
    serverId: 'srv-1',
    country: 'CA',
    parcelBoundaryGeojson: boundary,
    ...overrides,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  refreshProject.mockClear();
  projects.length = 0;
  cancelLayerCompleteRefreshes(); // reset module-level debouncer map
});

afterEach(() => {
  vi.useRealTimers();
});

describe('scheduleLayerCompleteRefresh', () => {
  it('coalesces a burst of events into exactly one refreshProject call', () => {
    addProject();

    for (let i = 0; i < 5; i++) {
      scheduleLayerCompleteRefresh('srv-1');
      vi.advanceTimersByTime(500); // within the 2s trailing window
    }
    expect(refreshProject).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2_000);

    expect(refreshProject).toHaveBeenCalledTimes(1);
    const [projectId, center, country, bbox] = refreshProject.mock.calls[0] as [
      string,
      [number, number],
      string,
      [number, number, number, number],
    ];
    expect(projectId).toBe('local-1');
    expect(country).toBe('CA');
    expect(bbox).toEqual([-78.3, 44.4, -78.1, 44.6]);
    expect(center[0]).toBeCloseTo(-78.2, 1);
    expect(center[1]).toBeCloseTo(44.5, 1);
  });

  it('a later burst after the refresh fires schedules a fresh refresh', () => {
    addProject();

    scheduleLayerCompleteRefresh('srv-1');
    vi.advanceTimersByTime(2_000);
    scheduleLayerCompleteRefresh('srv-1');
    vi.advanceTimersByTime(2_000);

    expect(refreshProject).toHaveBeenCalledTimes(2);
  });

  it('ignores events whose server id has no local project (non-active project)', () => {
    addProject(); // local store only knows srv-1

    scheduleLayerCompleteRefresh('srv-other');
    vi.advanceTimersByTime(2_000);

    expect(refreshProject).not.toHaveBeenCalled();
  });

  it('skips (without throwing) when the project has no boundary', () => {
    addProject({ parcelBoundaryGeojson: null });

    scheduleLayerCompleteRefresh('srv-1');
    expect(() => vi.advanceTimersByTime(2_000)).not.toThrow();

    expect(refreshProject).not.toHaveBeenCalled();
  });

  it('resolves the project at fire time — a project deleted mid-debounce is skipped', () => {
    addProject();

    scheduleLayerCompleteRefresh('srv-1');
    projects.length = 0; // project removed while the debounce is pending
    vi.advanceTimersByTime(2_000);

    expect(refreshProject).not.toHaveBeenCalled();
  });

  it('cancelLayerCompleteRefreshes drops pending refreshes (disconnect/switch)', () => {
    addProject();

    scheduleLayerCompleteRefresh('srv-1');
    cancelLayerCompleteRefreshes();
    vi.advanceTimersByTime(2_000);

    expect(refreshProject).not.toHaveBeenCalled();
  });
});
