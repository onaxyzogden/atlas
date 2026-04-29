/**
 * @vitest-environment happy-dom
 *
 * Binning helpers (`bearingToCompass`, `binHourlyToFrequencies`) moved to
 * `apps/api/src/services/climate/openMeteoWindFetch.ts` when the proxy adapter
 * shipped — the browser only quantizes the anchor + caches the API response.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { quantizeAnchor, anchorCacheKey } from "../quantizeAnchor.js";
import { getCached, setCached } from "../cache.js";

describe("quantizeAnchor", () => {
  it("snaps to the 0.1° grid by default", () => {
    expect(quantizeAnchor([-78.234, 44.567])).toEqual([-78.2, 44.6]);
    expect(quantizeAnchor([-78.26, 44.54])).toEqual([-78.3, 44.5]);
  });

  it("rounds floating-point noise out", () => {
    const [lng, lat] = quantizeAnchor([-78.20000001, 44.49999999]);
    expect(lng).toBeCloseTo(-78.2, 5);
    expect(lat).toBeCloseTo(44.5, 5);
  });

  it("supports custom step", () => {
    expect(quantizeAnchor([-78.234, 44.567], 1)).toEqual([-78, 45]);
  });

  it("rejects non-positive step", () => {
    expect(() => quantizeAnchor([0, 0], 0)).toThrow();
    expect(() => quantizeAnchor([0, 0], -1)).toThrow();
  });
});

describe("anchorCacheKey", () => {
  it("produces stable, two-decimal key strings", () => {
    expect(anchorCacheKey([-78.234, 44.567])).toBe("-78.20:44.60");
  });
});

describe("cache (localStorage)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips a frequency entry", () => {
    const freq = { N: 0.1, NE: 0.1, E: 0.1, SE: 0.1, S: 0.1, SW: 0.1, W: 0.3, NW: 0.1 };
    setCached("-78.20:44.50", freq, "Open-Meteo ERA5");
    const got = getCached("-78.20:44.50");
    expect(got).not.toBeNull();
    expect(got!.frequencies.W).toBeCloseTo(0.3, 5);
    expect(got!.source).toBe("Open-Meteo ERA5");
  });

  it("returns null for missing keys", () => {
    expect(getCached("nope")).toBeNull();
  });

  it("returns null for entries past TTL", () => {
    const freq = { N: 0.5, NE: 0.0, E: 0.0, SE: 0.0, S: 0.5, SW: 0.0, W: 0.0, NW: 0.0 };
    setCached("aged", freq, "test");
    // Manually rewrite the entry with an expired timestamp.
    const raw = window.localStorage.getItem("ogden-atlas-wind-clim-v2:aged")!;
    const parsed = JSON.parse(raw);
    parsed.fetchedAt = Date.now() - 1000 * 60 * 60 * 24 * 60; // 60 days old
    window.localStorage.setItem("ogden-atlas-wind-clim-v2:aged", JSON.stringify(parsed));
    expect(getCached("aged", 30)).toBeNull();
  });

  it("returns null on malformed JSON", () => {
    window.localStorage.setItem("ogden-atlas-wind-clim-v2:bad", "{not json");
    expect(getCached("bad")).toBeNull();
  });
});
