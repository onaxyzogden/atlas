/**
 * layerFetcher — tests for cache management, deduplication, and exported API.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock mockLayerData before importing layerFetcher
vi.mock('../lib/mockLayerData.js', () => ({
  generateMockLayers: vi.fn((country: string) => [
    {
      layerType: 'elevation',
      sourceApi: 'Estimated',
      fetchStatus: 'complete',
      confidence: 'low',
      attribution: 'Estimated from latitude',
      dataDate: '2026-01-01',
      summary: {
        min_elevation_m: 200,
        max_elevation_m: 300,
        mean_elevation_m: 250,
        avg_slope_pct: 5,
        dominant_aspect: 'S',
      },
    },
    {
      layerType: 'soils',
      sourceApi: 'Estimated',
      fetchStatus: 'complete',
      confidence: 'low',
      attribution: 'Estimated from latitude',
      dataDate: '2026-01-01',
      summary: { texture: 'loam', drainage: 'well drained' },
    },
  ]),
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { getCachedLayers, fetchAllLayers } from '../lib/layerFetcher.js';

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();

  // Default: all fetch calls fail (triggers fallback to mock data)
  mockFetch.mockRejectedValue(new Error('Network unavailable'));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Cache Tests ────────────────────────────────────────────────────────────

describe('getCachedLayers', () => {
  it('returns null when no cache exists', () => {
    const result = getCachedLayers([-80.0, 40.0], 'US');
    expect(result).toBeNull();
  });

  it('returns cached data when within TTL', () => {
    const cacheKey = '40.000_-80.000_US';
    const cacheData = {
      [cacheKey]: {
        layers: [{ layerType: 'elevation', summary: { min_elevation_m: 200 } }],
        fetchedAt: Date.now() - 1000, // 1 second ago
        isLive: false,
      },
    };
    localStorage.setItem('ogden-layer-cache', JSON.stringify(cacheData));

    const result = getCachedLayers([-80.0, 40.0], 'US');
    expect(result).not.toBeNull();
    expect(result!.layers).toHaveLength(1);
    expect(result!.isLive).toBe(false);
  });

  it('returns null when cache is expired (>24h)', () => {
    const cacheKey = '40.000_-80.000_US';
    const cacheData = {
      [cacheKey]: {
        layers: [{ layerType: 'elevation' }],
        fetchedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        isLive: false,
      },
    };
    localStorage.setItem('ogden-layer-cache', JSON.stringify(cacheData));

    const result = getCachedLayers([-80.0, 40.0], 'US');
    expect(result).toBeNull();
  });

  it('returns null for corrupted cache data', () => {
    localStorage.setItem('ogden-layer-cache', 'not json');
    const result = getCachedLayers([-80.0, 40.0], 'US');
    expect(result).toBeNull();
  });
});

// ─── fetchAllLayers Tests ───────────────────────────────────────────────────

describe('fetchAllLayers', () => {
  it('returns mock data when all APIs fail', async () => {
    const result = await fetchAllLayers({
      center: [-80.0, 40.0],
      country: 'US',
    });

    expect(result.layers).toBeDefined();
    expect(result.layers.length).toBeGreaterThan(0);
    expect(result.totalCount).toBeGreaterThan(0);
  });

  it('caches results to localStorage', async () => {
    await fetchAllLayers({
      center: [-80.0, 40.0],
      country: 'US',
    });

    const cache = JSON.parse(localStorage.getItem('ogden-layer-cache') || '{}');
    const keys = Object.keys(cache);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('returns cached results on second call', async () => {
    // First call — fetches and caches
    const result1 = await fetchAllLayers({
      center: [-80.0, 40.0],
      country: 'US',
    });

    // Second call — should use cache
    const result2 = await fetchAllLayers({
      center: [-80.0, 40.0],
      country: 'US',
    });

    expect(result2.layers.length).toBe(result1.layers.length);
  });

  it('handles US country correctly', async () => {
    const result = await fetchAllLayers({
      center: [-80.0, 40.0],
      country: 'US',
    });

    expect(result.layers).toBeDefined();
    expect(result.totalCount).toBeGreaterThan(0);
  });

  it('handles CA country correctly', async () => {
    const result = await fetchAllLayers({
      center: [-79.5, 43.7],
      country: 'CA',
    });

    expect(result.layers).toBeDefined();
    expect(result.totalCount).toBeGreaterThan(0);
  }, 15_000); // CA path has more complex fallback logic
});
