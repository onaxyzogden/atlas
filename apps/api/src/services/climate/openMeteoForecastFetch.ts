/**
 * openMeteoForecastFetch — Server-side Open-Meteo 7-day forecast adapter.
 *
 * Endpoint: https://api.open-meteo.com/v1/forecast
 *   keyless · current + hourly + daily up to 16 days
 *   docs: https://open-meteo.com/en/docs
 *
 * Window: current conditions, 7 days × 24 h hourly, 7 days daily. Forecast
 * data is regenerated upstream every hour, so the cache TTL is short (1 h).
 *
 * Failure policy mirrors `openMeteoWindFetch.ts`: single retry on 5xx, then
 * silent return-null. Callers must not propagate.
 *
 * Returns parsed row-arrays rather than the wide column-arrays Open-Meteo
 * emits, so consumers can iterate one record at a time.
 */
import pino from 'pino';

const logger = pino({ name: 'openMeteoForecastFetch' });

const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 12_000;
const FORECAST_DAYS = 7;

export const OPEN_METEO_FORECAST_SOURCE_LABEL =
  'Open-Meteo (current + hourly + 7-day forecast)';

export interface ForecastCurrent {
  time: string;
  temperatureC: number | null;
  apparentC: number | null;
  isDay: boolean;
  precipitationMm: number | null;
  weatherCode: number | null;
  windSpeedMs: number | null;
  windDirectionDeg: number | null;
  humidity: number | null;
}

export interface ForecastHour {
  time: string;
  temperatureC: number | null;
  apparentC: number | null;
  precipitationMm: number | null;
  precipitationProbability: number | null;
  weatherCode: number | null;
  windSpeedMs: number | null;
  windDirectionDeg: number | null;
  humidity: number | null;
}

export interface ForecastDay {
  date: string;
  tempMaxC: number | null;
  tempMinC: number | null;
  precipitationSumMm: number | null;
  precipitationProbMax: number | null;
  weatherCode: number | null;
  windSpeedMaxMs: number | null;
  sunrise: string | null;
  sunset: string | null;
}

export interface OpenMeteoForecastResult {
  current: ForecastCurrent | null;
  hourly: ForecastHour[];
  daily: ForecastDay[];
  timezone: string;
  source: string;
  fetchedAt: string;
  coordinates: { lat: number; lng: number };
}

interface OpenMeteoForecastResponse {
  timezone?: string;
  current?: {
    time?: string;
    temperature_2m?: number | null;
    apparent_temperature?: number | null;
    is_day?: number | null;
    precipitation?: number | null;
    weather_code?: number | null;
    wind_speed_10m?: number | null;
    wind_direction_10m?: number | null;
    relative_humidity_2m?: number | null;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: (number | null)[];
    apparent_temperature?: (number | null)[];
    precipitation?: (number | null)[];
    precipitation_probability?: (number | null)[];
    weather_code?: (number | null)[];
    wind_speed_10m?: (number | null)[];
    wind_direction_10m?: (number | null)[];
    relative_humidity_2m?: (number | null)[];
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    precipitation_sum?: (number | null)[];
    precipitation_probability_max?: (number | null)[];
    weather_code?: (number | null)[];
    wind_speed_10m_max?: (number | null)[];
    sunrise?: (string | null)[];
    sunset?: (string | null)[];
  };
}

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

async function fetchOnce(url: string): Promise<OpenMeteoForecastResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const err = new Error(`HTTP ${response.status}`) as Error & { status?: number };
      err.status = response.status;
      throw err;
    }
    return (await response.json()) as OpenMeteoForecastResponse;
  } finally {
    clearTimeout(timeout);
  }
}

function parseCurrent(c: OpenMeteoForecastResponse['current']): ForecastCurrent | null {
  if (!c || typeof c.time !== 'string') return null;
  return {
    time: c.time,
    temperatureC: numOrNull(c.temperature_2m),
    apparentC: numOrNull(c.apparent_temperature),
    isDay: (c.is_day ?? 1) === 1,
    precipitationMm: numOrNull(c.precipitation),
    weatherCode: numOrNull(c.weather_code),
    windSpeedMs: numOrNull(c.wind_speed_10m),
    windDirectionDeg: numOrNull(c.wind_direction_10m),
    humidity: numOrNull(c.relative_humidity_2m),
  };
}

function parseHourly(h: OpenMeteoForecastResponse['hourly']): ForecastHour[] {
  if (!h || !Array.isArray(h.time)) return [];
  const len = h.time.length;
  const rows: ForecastHour[] = [];
  for (let i = 0; i < len; i++) {
    const time = h.time[i];
    if (typeof time !== 'string') continue;
    rows.push({
      time,
      temperatureC: numOrNull(h.temperature_2m?.[i]),
      apparentC: numOrNull(h.apparent_temperature?.[i]),
      precipitationMm: numOrNull(h.precipitation?.[i]),
      precipitationProbability: numOrNull(h.precipitation_probability?.[i]),
      weatherCode: numOrNull(h.weather_code?.[i]),
      windSpeedMs: numOrNull(h.wind_speed_10m?.[i]),
      windDirectionDeg: numOrNull(h.wind_direction_10m?.[i]),
      humidity: numOrNull(h.relative_humidity_2m?.[i]),
    });
  }
  return rows;
}

function parseDaily(d: OpenMeteoForecastResponse['daily']): ForecastDay[] {
  if (!d || !Array.isArray(d.time)) return [];
  const len = d.time.length;
  const rows: ForecastDay[] = [];
  for (let i = 0; i < len; i++) {
    const date = d.time[i];
    if (typeof date !== 'string') continue;
    rows.push({
      date,
      tempMaxC: numOrNull(d.temperature_2m_max?.[i]),
      tempMinC: numOrNull(d.temperature_2m_min?.[i]),
      precipitationSumMm: numOrNull(d.precipitation_sum?.[i]),
      precipitationProbMax: numOrNull(d.precipitation_probability_max?.[i]),
      weatherCode: numOrNull(d.weather_code?.[i]),
      windSpeedMaxMs: numOrNull(d.wind_speed_10m_max?.[i]),
      sunrise: strOrNull(d.sunrise?.[i]),
      sunset: strOrNull(d.sunset?.[i]),
    });
  }
  return rows;
}

/**
 * Fetch Open-Meteo 7-day forecast for a single point.
 *
 * Returns `null` (silently) on any failure — timeout, network, HTTP error,
 * parse error, or empty hourly/daily payload. Callers must not propagate.
 */
export async function fetchOpenMeteoForecast(
  lat: number,
  lng: number,
): Promise<OpenMeteoForecastResult | null> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    current:
      'temperature_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m',
    hourly:
      'temperature_2m,apparent_temperature,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m',
    daily:
      'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max,sunrise,sunset',
    wind_speed_unit: 'ms',
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
  });
  const url = `${FORECAST_BASE}?${params.toString()}`;

  let json: OpenMeteoForecastResponse;
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
          'Open-Meteo forecast retry failed - returning null',
        );
        return null;
      }
    } else {
      logger.warn(
        { lat, lng, err: (err as Error).message },
        'Open-Meteo forecast fetch failed - returning null',
      );
      return null;
    }
  }

  const hourly = parseHourly(json.hourly);
  const daily = parseDaily(json.daily);
  if (hourly.length === 0 || daily.length === 0) return null;

  return {
    current: parseCurrent(json.current),
    hourly,
    daily,
    timezone: json.timezone ?? 'UTC',
    source: OPEN_METEO_FORECAST_SOURCE_LABEL,
    fetchedAt: new Date().toISOString(),
    coordinates: { lat, lng },
  };
}
