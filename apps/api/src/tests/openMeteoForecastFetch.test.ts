import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchOpenMeteoForecast,
  OPEN_METEO_FORECAST_SOURCE_LABEL,
} from '../services/climate/openMeteoForecastFetch.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => mockFetch.mockReset());

function buildForecastPayload() {
  return {
    timezone: 'America/Toronto',
    current: {
      time: '2026-05-09T14:00',
      temperature_2m: 18.5,
      apparent_temperature: 17.2,
      is_day: 1,
      precipitation: 0,
      weather_code: 1,
      wind_speed_10m: 4.2,
      wind_direction_10m: 220,
      relative_humidity_2m: 55,
    },
    hourly: {
      time: ['2026-05-09T00:00', '2026-05-09T01:00', '2026-05-09T02:00'],
      temperature_2m: [12.0, 11.5, 10.8],
      apparent_temperature: [10.5, 10.0, 9.2],
      precipitation: [0, 0, 0.1],
      precipitation_probability: [10, 20, 35],
      weather_code: [0, 1, 51],
      wind_speed_10m: [3.2, 3.5, 4.0],
      wind_direction_10m: [200, 210, 220],
      relative_humidity_2m: [70, 72, 75],
    },
    daily: {
      time: ['2026-05-09', '2026-05-10', '2026-05-11'],
      temperature_2m_max: [22.0, 19.5, 16.0],
      temperature_2m_min: [10.0, 8.0, 5.0],
      precipitation_sum: [0.1, 4.2, 12.5],
      precipitation_probability_max: [35, 70, 90],
      weather_code: [51, 61, 65],
      wind_speed_10m_max: [5.5, 7.0, 9.5],
      sunrise: ['2026-05-09T05:51', '2026-05-10T05:50', '2026-05-11T05:48'],
      sunset: ['2026-05-09T20:21', '2026-05-10T20:22', '2026-05-11T20:23'],
    },
  };
}

describe('fetchOpenMeteoForecast', () => {
  it('happy path: parses current + hourly + daily and labels source', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => buildForecastPayload(),
    });
    const result = await fetchOpenMeteoForecast(44.5, -78.2);
    expect(result).not.toBeNull();
    expect(result!.source).toBe(OPEN_METEO_FORECAST_SOURCE_LABEL);
    expect(result!.timezone).toBe('America/Toronto');
    expect(result!.current?.temperatureC).toBe(18.5);
    expect(result!.current?.isDay).toBe(true);
    expect(result!.hourly).toHaveLength(3);
    expect(result!.hourly[0]!.temperatureC).toBe(12.0);
    expect(result!.daily).toHaveLength(3);
    expect(result!.daily[2]!.tempMaxC).toBe(16.0);
    expect(result!.daily[2]!.precipitationSumMm).toBe(12.5);
    expect(result!.coordinates).toEqual({ lat: 44.5, lng: -78.2 });
  });

  it('preserves null for missing per-row fields rather than coercing to 0', async () => {
    const base = buildForecastPayload();
    const payload = {
      ...base,
      hourly: {
        ...base.hourly,
        temperature_2m: [null, 11.5, 10.8] as (number | null)[],
      },
      daily: {
        ...base.daily,
        precipitation_sum: [null, 4.2, 12.5] as (number | null)[],
      },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
    });
    const result = await fetchOpenMeteoForecast(44.5, -78.2);
    expect(result!.hourly[0]!.temperatureC).toBeNull();
    expect(result!.hourly[1]!.temperatureC).toBe(11.5);
    expect(result!.daily[0]!.precipitationSumMm).toBeNull();
  });

  it('retries once on 5xx then succeeds', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: async () => buildForecastPayload() });
    const result = await fetchOpenMeteoForecast(44.5, -78.2);
    expect(result).not.toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns null silently on repeated 5xx', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: false, status: 503 });
    const result = await fetchOpenMeteoForecast(44.5, -78.2);
    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns null when hourly arrays are empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        timezone: 'UTC',
        current: { time: '2026-05-09T14:00', temperature_2m: 18 },
        hourly: { time: [] },
        daily: { time: ['2026-05-09'] },
      }),
    });
    const result = await fetchOpenMeteoForecast(44.5, -78.2);
    expect(result).toBeNull();
  });

  it('returns null when daily arrays are empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        timezone: 'UTC',
        hourly: { time: ['2026-05-09T00:00'] },
        daily: { time: [] },
      }),
    });
    const result = await fetchOpenMeteoForecast(44.5, -78.2);
    expect(result).toBeNull();
  });

  it('sends expected query params (lat/lng to 4dp, m/s units, 7-day window, timezone=auto)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => buildForecastPayload(),
    });
    await fetchOpenMeteoForecast(44.5, -78.2);
    const url = mockFetch.mock.calls[0]?.[0] as string;
    expect(url).toContain('latitude=44.5000');
    expect(url).toContain('longitude=-78.2000');
    expect(url).toContain('wind_speed_unit=ms');
    expect(url).toContain('timezone=auto');
    expect(url).toContain('forecast_days=7');
    expect(url).toContain('temperature_2m');
    expect(url).toContain('weather_code');
    expect(url).toContain('precipitation_probability');
  });

  it('isDay is false when current.is_day is 0', async () => {
    const payload = buildForecastPayload();
    payload.current.is_day = 0;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
    });
    const result = await fetchOpenMeteoForecast(44.5, -78.2);
    expect(result!.current?.isDay).toBe(false);
  });
});
