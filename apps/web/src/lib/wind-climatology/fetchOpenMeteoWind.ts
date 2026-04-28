/**
 * fetchOpenMeteoWind — Open-Meteo Archive (ERA5) hourly wind → 8-bin frequencies.
 *
 * Endpoint: https://archive-api.open-meteo.com/v1/archive
 *   keyless · CORS-enabled · ERA5 reanalysis hourly
 *   docs: https://open-meteo.com/en/docs/historical-weather-api
 *
 * Window: most-recent complete calendar year (Jan 1 – Dec 31). One year is
 * ~8760 hourly samples — enough for a pedagogical rose, light enough for a
 * web fetch. Multi-year averaging is a deferred polish item.
 *
 * Failure policy mirrors `apps/api/.../nasaPowerFetch.ts`: single retry on
 * 5xx, then silent return-null. Callers must not propagate.
 */

import { binHourlyToFrequencies, type HourlySample } from "./binHourlyToFrequencies.js";
import type { WindFrequencies } from "./cache.js";

const ARCHIVE_BASE = "https://archive-api.open-meteo.com/v1/archive";
const TIMEOUT_MS = 15_000;

export const OPEN_METEO_SOURCE_LABEL = "Open-Meteo ERA5 (hourly, most recent complete year)";

interface OpenMeteoResponse {
  hourly?: {
    time?: unknown[];
    wind_direction_10m?: (number | null)[];
    wind_speed_10m?: (number | null)[];
  };
}

export interface OpenMeteoWindResult {
  frequencies: WindFrequencies;
  source: string;
  windowYear: number;
  sampleCount: number;
}

/**
 * Returns the most recent complete calendar year as `[start, end]` ISO dates.
 * Open-Meteo's archive is a few days behind real-time, so "most recent
 * complete year" = the year before `today`'s year.
 */
export function mostRecentCompleteYear(now: Date = new Date()): {
  year: number;
  start: string;
  end: string;
} {
  const year = now.getUTCFullYear() - 1;
  return {
    year,
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

interface FetchOnceArgs {
  url: string;
  signal: AbortSignal;
}

async function fetchOnce({ url, signal }: FetchOnceArgs): Promise<OpenMeteoResponse> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const err = new Error(`HTTP ${response.status}`) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }
  return (await response.json()) as OpenMeteoResponse;
}

export interface FetchOpenMeteoOptions {
  /** Override the year window (testing). */
  start?: string;
  end?: string;
  /** Pre-built AbortSignal from the caller. */
  signal?: AbortSignal;
  /** Override `Date.now()` for `mostRecentCompleteYear`. */
  now?: Date;
}

export async function fetchOpenMeteoWind(
  lat: number,
  lng: number,
  opts: FetchOpenMeteoOptions = {},
): Promise<OpenMeteoWindResult | null> {
  const win = opts.start && opts.end
    ? { year: Number(opts.start.slice(0, 4)), start: opts.start, end: opts.end }
    : mostRecentCompleteYear(opts.now);

  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    hourly: "wind_direction_10m,wind_speed_10m",
    start_date: win.start,
    end_date: win.end,
    wind_speed_unit: "ms",
    timeformat: "unixtime",
  });
  const url = `${ARCHIVE_BASE}?${params.toString()}`;

  const internal = new AbortController();
  const timeout = setTimeout(() => internal.abort(), TIMEOUT_MS);
  // If the caller hands us a signal, abort our internal controller when it fires.
  const onParentAbort = () => internal.abort();
  if (opts.signal) {
    if (opts.signal.aborted) internal.abort();
    else opts.signal.addEventListener("abort", onParentAbort, { once: true });
  }

  try {
    let json: OpenMeteoResponse;
    try {
      json = await fetchOnce({ url, signal: internal.signal });
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status !== undefined && status >= 500 && status < 600) {
        json = await fetchOnce({ url, signal: internal.signal });
      } else {
        return null;
      }
    }

    const hourly = json.hourly;
    if (!hourly || !Array.isArray(hourly.wind_direction_10m) || !Array.isArray(hourly.wind_speed_10m)) {
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
      if (typeof d !== "number" || typeof s !== "number") continue;
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
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    if (opts.signal) opts.signal.removeEventListener("abort", onParentAbort);
  }
}
