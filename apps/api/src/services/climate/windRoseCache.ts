/**
 * windRoseCache — Redis cache for the Open-Meteo wind-rose adapter.
 *
 * Key shape: `wind-rose:v2:${qLat}:${qLng}` where (qLat, qLng) are the anchor
 * quantized to 0.1° (~11 km), matching the web-side localStorage policy. TTL
 * is 30 days — climatology shifts on decadal scales, so anything fresher
 * wastes upstream calls.
 *
 * Version bumped to v2 on 2026-04-28 when the adapter window grew from 1 yr
 * to 3 yr — old v1 entries hold a different (noisier) frequency payload and
 * must not be served to v2 callers.
 *
 * Best-effort: every Redis call is wrapped in a 200 ms timeout + try/catch and
 * returns null/void on any failure. Callers must tolerate a `get` returning
 * null and a `set` silently no-op'ing — Redis being unavailable should never
 * fail the request, since the adapter itself is the source of truth.
 *
 * Versioned prefix lets us invalidate-by-redeploy if the binning logic
 * (calm-filter threshold, 8-bin mapping) ever changes.
 */

import type { Redis } from 'ioredis';
import type { OpenMeteoWindResult } from './openMeteoWindFetch.js';

const KEY_PREFIX = 'wind-rose:v2';
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const QUANTUM_DEG = 0.1;
const TIMEOUT_MS = 200;

function quantize(value: number): string {
  // Snap to the QUANTUM_DEG grid and format with one decimal place so the key
  // is canonical (e.g., 44.5 not 44.49999999).
  const snapped = Math.round(value / QUANTUM_DEG) * QUANTUM_DEG;
  return snapped.toFixed(1);
}

export function windRoseCacheKey(lat: number, lng: number): string {
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

export async function getCachedWindRose(
  redis: Redis,
  lat: number,
  lng: number,
): Promise<OpenMeteoWindResult | null> {
  const key = windRoseCacheKey(lat, lng);
  try {
    const raw = await withTimeout(redis.get(key));
    if (!raw) return null;
    return JSON.parse(raw) as OpenMeteoWindResult;
  } catch {
    return null;
  }
}

export async function setCachedWindRose(
  redis: Redis,
  lat: number,
  lng: number,
  value: OpenMeteoWindResult,
): Promise<void> {
  const key = windRoseCacheKey(lat, lng);
  try {
    await withTimeout(redis.setex(key, TTL_SECONDS, JSON.stringify(value)));
  } catch {
    /* silent — cache write failures must not surface to callers */
  }
}
