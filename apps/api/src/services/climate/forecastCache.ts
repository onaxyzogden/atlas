/**
 * forecastCache — Redis cache for the Open-Meteo 7-day forecast adapter.
 *
 * Key shape: `forecast:v1:${qLat}:${qLng}` where (qLat, qLng) are the anchor
 * quantized to 0.1° (~11 km), matching the wind-rose cache policy. TTL is
 * 1 h — Open-Meteo regenerates forecast runs hourly, so anything fresher
 * just wastes upstream calls and anything staler shows yesterday's weather.
 *
 * Best-effort: every Redis call is wrapped in a 200 ms timeout + try/catch and
 * returns null/void on any failure. Callers must tolerate a `get` returning
 * null and a `set` silently no-op'ing.
 */
import type { Redis } from 'ioredis';
import type { OpenMeteoForecastResult } from './openMeteoForecastFetch.js';

const KEY_PREFIX = 'forecast:v1';
const TTL_SECONDS = 60 * 60; // 1 h
const QUANTUM_DEG = 0.1;
const TIMEOUT_MS = 200;

function quantize(value: number): string {
  const snapped = Math.round(value / QUANTUM_DEG) * QUANTUM_DEG;
  return snapped.toFixed(1);
}

export function forecastCacheKey(lat: number, lng: number): string {
  return `${KEY_PREFIX}:${quantize(lat)}:${quantize(lng)}`;
}

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('redis-timeout')), TIMEOUT_MS),
    ),
  ]);
}

export async function getCachedForecast(
  redis: Redis,
  lat: number,
  lng: number,
): Promise<OpenMeteoForecastResult | null> {
  const key = forecastCacheKey(lat, lng);
  try {
    const raw = await withTimeout(redis.get(key));
    if (!raw) return null;
    return JSON.parse(raw) as OpenMeteoForecastResult;
  } catch {
    return null;
  }
}

export async function setCachedForecast(
  redis: Redis,
  lat: number,
  lng: number,
  value: OpenMeteoForecastResult,
): Promise<void> {
  const key = forecastCacheKey(lat, lng);
  try {
    await withTimeout(redis.setex(key, TTL_SECONDS, JSON.stringify(value)));
  } catch {
    /* silent — cache write failures must not surface to callers */
  }
}
