/**
 * openMeteoWindFetch — Server-side Open-Meteo ERA5 hourly wind → 8-bin frequencies.
 *
 * Endpoint: https://archive-api.open-meteo.com/v1/archive
 *   keyless · ERA5 reanalysis hourly
 *   docs: https://open-meteo.com/en/docs/historical-weather-api
 *
 * Window: most-recent complete calendar year. ~8760 hourly samples — enough
 * for a pedagogical rose, light enough for a single fetch.
 *
 * Failure policy mirrors `nasaPowerFetch.ts`: single retry on 5xx, then silent
 * return-null. Callers must not propagate.
 *
 * Returns binned frequencies (~200 B) rather than raw samples (~1 MB) so the
 * web payload stays tiny and the binning policy lives in one place.
 */

import pino from 'pino';

const logger = pino({ name: 'openMeteoWindFetch' });

const ARCHIVE_BASE = 'https://archive-api.open-meteo.com/v1/archive';
const TIMEOUT_MS = 12_000;
const CALM_THRESHOLD_MS = 0.5;

export const OPEN_METEO_SOURCE_LABEL =
  'Open-Meteo ERA5 (hourly, most recent complete year)';

export type CompassCode = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

const ORDER: readonly CompassCode[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export type WindFrequencies = Record<CompassCode, number>;

export interface OpenMeteoWindResult {
  frequencies: WindFrequencies;
  source: string;
  windowYear: number;
  sampleCount: number;
}

interface OpenMeteoResponse {
  hourly?: {
    time?: unknown[];
    wind_direction_10m?: (number | null)[];
    wind_speed_10m?: (number | null)[];
  };
}

export function mostRecentCompleteYear(now: Date = new Date()): {
  year: number;
  start: string;
  end: string;
} {
  const year = now.getUTCFullYear() - 1;
  return { year, start: `${year}-01-01`, end: `${year}-12-31` };
}

function normalizeBearing(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function bearingToCompass(deg: number): CompassCode {
  const norm = normalizeBearing(deg);
  // Shift so N's bin (centered on 0°) becomes [0, 45) instead of [-22.5, 22.5).
  const shifted = (norm + 22.5) % 360;
  const idx = Math.floor(shifted / 45) % 8;
  return ORDER[idx]!;
}

interface HourlySample {
  dirDeg: number;
  speedMs: number;
}

function binHourlyToFrequencies(samples: readonly HourlySample[]): WindFrequencies {
  const counts: WindFrequencies = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
  let total = 0;
  for (const s of samples) {
    if (!Number.isFinite(s.dirDeg) || !Number.isFinite(s.speedMs)) continue;
    if (s.speedMs < CALM_THRESHOLD_MS) continue;
    counts[bearingToCompass(s.dirDeg)] += 1;
    total += 1;
  }
  if (total === 0) return counts;
  const out: WindFrequencies = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
  for (const code of ORDER) out[code] = counts[code] / total;
  return out;
}

async function fetchOnce(url: string): Promise<OpenMeteoResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const err = new Error(`HTTP ${response.status}`) as Error & { status?: number };
      err.status = response.status;
      throw err;
    }
    return (await response.json()) as OpenMeteoResponse;
  } finally {
    clearTimeout(timeout);
  }
}

export interface FetchOpenMeteoWindOptions {
  /** Override the year window (testing). */
  start?: string;
  end?: string;
  /** Override `Date.now()` for `mostRecentCompleteYear`. */
  now?: Date;
}

/**
 * Fetch Open-Meteo ERA5 hourly wind for a single point and return binned frequencies.
 *
 * Returns `null` (silently) on any failure — timeout, network, HTTP error, parse
 * error, or all-calm data. Callers must not propagate these failures.
 */
export async function fetchOpenMeteoWind(
  lat: number,
  lng: number,
  opts: FetchOpenMeteoWindOptions = {},
): Promise<OpenMeteoWindResult | null> {
  const win = opts.start && opts.end
    ? { year: Number(opts.start.slice(0, 4)), start: opts.start, end: opts.end }
    : mostRecentCompleteYear(opts.now);

  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    hourly: 'wind_direction_10m,wind_speed_10m',
    start_date: win.start,
    end_date: win.end,
    wind_speed_unit: 'ms',
    timeformat: 'unixtime',
  });
  const url = `${ARCHIVE_BASE}?${params.toString()}`;

  let json: OpenMeteoResponse;
  try {
    json = await fetchOnce(url);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status !== undefined && status >= 500 && status < 600) {
      try {
        json = await fetchOnce(url);
      } catch (retryErr) {
        logger.warn(
          { lat, lng, err: (retryErr as Error).message },
          'Open-Meteo retry failed — returning null',
        );
        return null;
      }
    } else {
      logger.warn(
        { lat, lng, err: (err as Error).message },
        'Open-Meteo fetch failed — returning null',
      );
      return null;
    }
  }

  const hourly = json.hourly;
  if (
    !hourly ||
    !Array.isArray(hourly.wind_direction_10m) ||
    !Array.isArray(hourly.wind_speed_10m)
  ) {
    return null;
  }

  const dirs = hourly.wind_direction_10m;
  const speeds = hourly.wind_speed_10m;
  const len = Math.min(dirs.length, speeds.length);
  const samples: HourlySample[] = [];
  for (let i = 0; i < len; i++) {
    const d = dirs[i];
    const s = speeds[i];
    if (d === null || s === null) continue;
    if (typeof d !== 'number' || typeof s !== 'number') continue;
    samples.push({ dirDeg: d, speedMs: s });
  }
  if (samples.length === 0) return null;

  const frequencies = binHourlyToFrequencies(samples);
  const sum = (Object.values(frequencies) as number[]).reduce((a, b) => a + b, 0);
  if (sum < 0.99) return null; // every sample was calm or otherwise dropped

  return {
    frequencies,
    source: OPEN_METEO_SOURCE_LABEL,
    windowYear: win.year,
    sampleCount: samples.length,
  };
}
