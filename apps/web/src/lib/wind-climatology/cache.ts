/**
 * cache — TTL'd localStorage cache for wind climatology.
 *
 * Keys are namespaced under `ogden-atlas-wind-clim-v1:` so a future schema
 * change (different binning, multi-year window) can bump the version
 * without colliding with stale entries. SSR-safe: no-ops when `window` is
 * undefined.
 */

import type { CompassCode } from "../sectors/wind.js";

export type WindFrequencies = Record<CompassCode, number>;

const KEY_PREFIX = "ogden-atlas-wind-clim-v1:";
const DEFAULT_TTL_DAYS = 30;

interface CacheEntry {
  frequencies: WindFrequencies;
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
): void {
  const ls = storage();
  if (!ls) return;
  const entry: CacheEntry = {
    frequencies,
    fetchedAt: Date.now(),
    source,
  };
  try {
    ls.setItem(fullKey(key), JSON.stringify(entry));
  } catch {
    // localStorage full or disabled — silently skip.
  }
}
