import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Redis } from 'ioredis';
import {
  windRoseCacheKey,
  getCachedWindRose,
  setCachedWindRose,
} from '../services/climate/windRoseCache.js';
import type { OpenMeteoWindResult } from '../services/climate/openMeteoWindFetch.js';

/**
 * Minimal in-memory ioredis stub — only the methods this module uses.
 * Tests pass it via `as unknown as Redis` since we don't need full type compat.
 */
function makeStubRedis() {
  const store = new Map<string, string>();
  const getMock = vi.fn(async (key: string) => store.get(key) ?? null);
  const setexMock = vi.fn(async (key: string, _ttl: number, value: string) => {
    store.set(key, value);
    return 'OK' as const;
  });
  return {
    redis: { get: getMock, setex: setexMock } as unknown as Redis,
    store,
    getMock,
    setexMock,
  };
}

const SAMPLE: OpenMeteoWindResult = {
  frequencies: { N: 0.1, NE: 0.1, E: 0.1, SE: 0.1, S: 0.1, SW: 0.1, W: 0.3, NW: 0.1 },
  source: 'Open-Meteo ERA5 (hourly, most recent complete year)',
  windowYear: 2025,
  sampleCount: 8760,
};

describe('windRoseCacheKey', () => {
  it('quantizes to 0.1° and produces a versioned canonical key', () => {
    expect(windRoseCacheKey(44.567, -78.234)).toBe('wind-rose:v1:44.6:-78.2');
    expect(windRoseCacheKey(44.5, -78.2)).toBe('wind-rose:v1:44.5:-78.2');
  });

  it('rounds floating-point noise to a stable string', () => {
    expect(windRoseCacheKey(44.49999999, -78.20000001)).toBe('wind-rose:v1:44.5:-78.2');
  });

  it('handles negative bands and the prime meridian', () => {
    expect(windRoseCacheKey(-33.86, 151.21)).toBe('wind-rose:v1:-33.9:151.2');
    expect(windRoseCacheKey(0, 0)).toBe('wind-rose:v1:0.0:0.0');
  });
});

describe('getCachedWindRose / setCachedWindRose', () => {
  let stub: ReturnType<typeof makeStubRedis>;

  beforeEach(() => {
    stub = makeStubRedis();
  });

  it('round-trips a value through set → get', async () => {
    await setCachedWindRose(stub.redis, 44.5, -78.2, SAMPLE);
    expect(stub.setexMock).toHaveBeenCalledWith(
      'wind-rose:v1:44.5:-78.2',
      60 * 60 * 24 * 30,
      JSON.stringify(SAMPLE),
    );
    const got = await getCachedWindRose(stub.redis, 44.5, -78.2);
    expect(got).toEqual(SAMPLE);
  });

  it('returns null on cache miss', async () => {
    const got = await getCachedWindRose(stub.redis, 44.5, -78.2);
    expect(got).toBeNull();
  });

  it('quantizes both reads and writes — sub-quantum drag still hits the same key', async () => {
    await setCachedWindRose(stub.redis, 44.5, -78.2, SAMPLE);
    // Same 0.1° cell, drifted by ~50 m
    const got = await getCachedWindRose(stub.redis, 44.504, -78.198);
    expect(got).toEqual(SAMPLE);
  });

  it('returns null silently when redis.get throws (Redis down)', async () => {
    const broken = {
      get: vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
      setex: vi.fn(async () => 'OK'),
    } as unknown as Redis;
    const got = await getCachedWindRose(broken, 44.5, -78.2);
    expect(got).toBeNull();
  });

  it('does not throw when redis.setex rejects (cache write best-effort)', async () => {
    const broken = {
      get: vi.fn(async () => null),
      setex: vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    } as unknown as Redis;
    await expect(setCachedWindRose(broken, 44.5, -78.2, SAMPLE)).resolves.toBeUndefined();
  });

  it('returns null on malformed JSON in the cache', async () => {
    stub.store.set('wind-rose:v1:44.5:-78.2', '{not json');
    const got = await getCachedWindRose(stub.redis, 44.5, -78.2);
    expect(got).toBeNull();
  });
});
