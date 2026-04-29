/**
 * cache — TTL'd localStorage cache for wind climatology.
 *
 * Keys are namespaced under `ogden-atlas-wind-clim-v2:`. v2 was introduced
 * on 2026-04-28 when the adapter window grew from 1 yr to 3 yr — old v1
 * entries hold a noisier 1-year payload and must not be reused. SSR-safe:
 * no-ops when `window` is undefined.
 */

import type { CompassCode } from "../sectors/wind.js";

export type WindFrequencies = Record<CompassCode, number>;
export type WindMeanSpeeds = Record<CompassCode, number | null>;

const KEY_PREFIX = "ogden-atlas-wind-clim-v2:";
const DEFAULT_TTL_DAYS = 30;

interface CacheEntry {
  frequencies: WindFrequencies;
  /** Optional — entries cached before Beaufort shading (2026-04-29) lack this. */
  meanSpeedsMs?: WindMeanSpeeds;
  fetchedAt: number;
  source: string;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function fullKey(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

export function getCached(
  key: string,
  ttlDays: number = DEFAULT_TTL_DAYS,
): CacheEntry | null {
  const ls = storage();
  if (!ls) return null;
  const raw = ls.getItem(fullKey(key));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CacheEntry;
    if (
      !parsed ||
      typeof parsed.fetchedAt !== "number" ||
      !parsed.frequencies ||
      typeof parsed.source !== "string"
    ) {
      return null;
    }
    const ageMs = Date.now() - parsed.fetchedAt;
    const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
    if (ageMs > ttlMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setCached(
  key: string,
  frequencies: WindFrequencies,
  source: string,
  meanSpeedsMs?: WindMeanSpeeds,
): void {
  const ls = storage();
  if (!ls) return;
  const entry: CacheEntry = {
    frequencies,
    meanSpeedsMs,
    fetchedAt: Date.now(),
    source,
  };
  try {
    ls.setItem(fullKey(key), JSON.stringify(entry));
  } catch {
    // localStorage full or disabled — silently skip.
  }
}
