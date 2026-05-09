import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Redis } from 'ioredis';
import {
  forecastCacheKey,
  getCachedForecast,
  setCachedForecast,
} from '../services/climate/forecastCache.js';
import type { OpenMeteoForecastResult } from '../services/climate/openMeteoForecastFetch.js';

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

const SAMPLE: OpenMeteoForecastResult = {
  current: {
    time: '2026-05-09T14:00',
    temperatureC: 18.5,
    apparentC: 17.2,
    isDay: true,
    precipitationMm: 0,
    weatherCode: 1,
    windSpeedMs: 4.2,
    windDirectionDeg: 220,
    humidity: 55,
  },
  hourly: [
    {
      time: '2026-05-09T00:00',
      temperatureC: 12,
      apparentC: 10.5,
      precipitationMm: 0,
      precipitationProbability: 10,
      weatherCode: 0,
      windSpeedMs: 3.2,
      windDirectionDeg: 200,
      humidity: 70,
    },
  ],
  daily: [
    {
      date: '2026-05-09',
      tempMaxC: 22,
      tempMinC: 10,
      precipitationSumMm: 0.1,
      precipitationProbMax: 35,
      weatherCode: 51,
      windSpeedMaxMs: 5.5,
      sunrise: '2026-05-09T05:51',
      sunset: '2026-05-09T20:21',
    },
  ],
  timezone: 'America/Toronto',
  source: 'Open-Meteo (current + hourly + 7-day forecast)',
  fetchedAt: '2026-05-09T14:00:00.000Z',
  coordinates: { lat: 44.5, lng: -78.2 },
};

describe('forecastCacheKey', () => {
  it('quantizes to 0.1° and produces a versioned canonical key', () => {
    expect(forecastCacheKey(44.567, -78.234)).toBe('forecast:v1:44.6:-78.2');
    expect(forecastCacheKey(44.5, -78.2)).toBe('forecast:v1:44.5:-78.2');
  });

  it('rounds floating-point noise to a stable string', () => {
    expect(forecastCacheKey(44.49999999, -78.20000001)).toBe('forecast:v1:44.5:-78.2');
  });

  it('handles negative bands and the prime meridian', () => {
    expect(forecastCacheKey(-33.86, 151.21)).toBe('forecast:v1:-33.9:151.2');
    expect(forecastCacheKey(0, 0)).toBe('forecast:v1:0.0:0.0');
  });
});

describe('getCachedForecast / setCachedForecast', () => {
  let stub: ReturnType<typeof makeStubRedis>;

  beforeEach(() => {
    stub = makeStubRedis();
  });

  it('round-trips a value through set → get with 1h TTL', async () => {
    await setCachedForecast(stub.redis, 44.5, -78.2, SAMPLE);
    expect(stub.setexMock).toHaveBeenCalledWith(
      'forecast:v1:44.5:-78.2',
      60 * 60,
      JSON.stringify(SAMPLE),
    );
    const got = await getCachedForecast(stub.redis, 44.5, -78.2);
    expect(got).toEqual(SAMPLE);
  });

  it('returns null on cache miss', async () => {
    const got = await getCachedForecast(stub.redis, 44.5, -78.2);
    expect(got).toBeNull();
  });

  it('quantizes both reads and writes — sub-quantum drag still hits the same key', async () => {
    await setCachedForecast(stub.redis, 44.5, -78.2, SAMPLE);
    const got = await getCachedForecast(stub.redis, 44.504, -78.198);
    expect(got).toEqual(SAMPLE);
  });

  it('returns null silently when redis.get throws (Redis down)', async () => {
    const broken = {
      get: vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
      setex: vi.fn(async () => 'OK'),
    } as unknown as Redis;
    const got = await getCachedForecast(broken, 44.5, -78.2);
    expect(got).toBeNull();
  });

  it('does not throw when redis.setex rejects (cache write best-effort)', async () => {
    const broken = {
      get: vi.fn(async () => null),
      setex: vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    } as unknown as Redis;
    await expect(setCachedForecast(broken, 44.5, -78.2, SAMPLE)).resolves.toBeUndefined();
  });

  it('returns null on malformed JSON in the cache', async () => {
    stub.store.set('forecast:v1:44.5:-78.2', '{not json');
    const got = await getCachedForecast(stub.redis, 44.5, -78.2);
    expect(got).toBeNull();
  });
});
