import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchOpenMeteoWind,
  mostRecentCompleteYear,
  OPEN_METEO_SOURCE_LABEL,
} from '../services/climate/openMeteoWindFetch.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => mockFetch.mockReset());

/**
 * Build a synthetic hourly payload skewed to a single compass bin so we can
 * assert frequencies are normalized and binning works end-to-end.
 *
 * 90% of samples are W winds (dir=270°, speed=5 m/s) — should land in W bin.
 * 10% are calm (speed=0.1 m/s) — should be filtered out of the rose.
 */
function buildHourlyPayload(hours = 1000) {
  const time: number[] = [];
  const dirs: number[] = [];
  const speeds: number[] = [];
  for (let i = 0; i < hours; i++) {
    time.push(i * 3600);
    if (i % 10 === 0) {
      dirs.push(270);
      speeds.push(0.1); // calm — filtered
    } else {
      dirs.push(270);
      speeds.push(5);
    }
  }
  return {
    hourly: {
      time,
      wind_direction_10m: dirs,
      wind_speed_10m: speeds,
    },
  };
}

describe('mostRecentCompleteYear', () => {
  it('returns last calendar year as ISO bounds', () => {
    const win = mostRecentCompleteYear(new Date('2026-04-28T00:00:00Z'));
    expect(win.year).toBe(2025);
    expect(win.start).toBe('2025-01-01');
    expect(win.end).toBe('2025-12-31');
  });
});

describe('fetchOpenMeteoWind', () => {
  it('happy path: returns binned frequencies summing to ~1.0 with W-prevailing payload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => buildHourlyPayload(1000),
    });
    const result = await fetchOpenMeteoWind(44.5, -78.2);
    expect(result).not.toBeNull();
    const sum = Object.values(result!.frequencies).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
    // 100% of non-calm samples blow toward W (270°)
    expect(result!.frequencies.W).toBeCloseTo(1.0, 5);
    expect(result!.frequencies.N).toBe(0);
    expect(result!.source).toBe(OPEN_METEO_SOURCE_LABEL);
    expect(result!.sampleCount).toBe(1000); // calm filtering happens inside binning, not before
  });

  it('retries once on 5xx then succeeds', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: async () => buildHourlyPayload(100) });
    const result = await fetchOpenMeteoWind(44.5, -78.2);
    expect(result).not.toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns null silently on repeated 5xx', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: false, status: 503 });
    const result = await fetchOpenMeteoWind(44.5, -78.2);
    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns null when every sample is calm (sum < 0.99)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        hourly: {
          time: [0, 3600, 7200],
          wind_direction_10m: [270, 90, 180],
          wind_speed_10m: [0.1, 0.2, 0.3],
        },
      }),
    });
    const result = await fetchOpenMeteoWind(44.5, -78.2);
    expect(result).toBeNull();
  });

  it('sends expected query params (lat/lng to 4dp, hourly fields, m/s units)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => buildHourlyPayload(100),
    });
    await fetchOpenMeteoWind(44.5, -78.2, {
      start: '2024-01-01',
      end: '2024-12-31',
    });
    const url = mockFetch.mock.calls[0]?.[0] as string;
    expect(url).toContain('latitude=44.5000');
    expect(url).toContain('longitude=-78.2000');
    expect(url).toContain('hourly=wind_direction_10m%2Cwind_speed_10m');
    expect(url).toContain('wind_speed_unit=ms');
    expect(url).toContain('start_date=2024-01-01');
    expect(url).toContain('end_date=2024-12-31');
  });
});
