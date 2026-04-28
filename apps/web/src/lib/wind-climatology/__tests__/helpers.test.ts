/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  binHourlyToFrequencies,
  bearingToCompass,
  type HourlySample,
} from "../binHourlyToFrequencies.js";
import { quantizeAnchor, anchorCacheKey } from "../quantizeAnchor.js";
import { getCached, setCached } from "../cache.js";
import type { CompassCode } from "../../sectors/wind.js";

const ALL: CompassCode[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

describe("bearingToCompass", () => {
  it("maps each cardinal/inter-cardinal exactly", () => {
    expect(bearingToCompass(0)).toBe("N");
    expect(bearingToCompass(45)).toBe("NE");
    expect(bearingToCompass(90)).toBe("E");
    expect(bearingToCompass(135)).toBe("SE");
    expect(bearingToCompass(180)).toBe("S");
    expect(bearingToCompass(225)).toBe("SW");
    expect(bearingToCompass(270)).toBe("W");
    expect(bearingToCompass(315)).toBe("NW");
  });

  it("wraps around 360° back into N", () => {
    expect(bearingToCompass(357)).toBe("N");
    expect(bearingToCompass(359.9)).toBe("N");
    expect(bearingToCompass(360)).toBe("N");
    expect(bearingToCompass(720)).toBe("N");
  });

  it("normalizes negative bearings", () => {
    expect(bearingToCompass(-1)).toBe("N");
    expect(bearingToCompass(-45)).toBe("NW");
  });
});

describe("binHourlyToFrequencies", () => {
  it("bins eight uniform samples evenly", () => {
    const samples: HourlySample[] = ALL.map((_, i) => ({
      dirDeg: i * 45,
      speedMs: 5,
    }));
    const f = binHourlyToFrequencies(samples);
    for (const code of ALL) {
      expect(f[code]).toBeCloseTo(1 / 8, 5);
    }
  });

  it("filters out calm hours below 0.5 m/s", () => {
    const samples: HourlySample[] = [
      { dirDeg: 0, speedMs: 5 }, // counted
      { dirDeg: 0, speedMs: 0.3 }, // dropped (calm)
      { dirDeg: 0, speedMs: 0.49 }, // dropped (calm)
      { dirDeg: 90, speedMs: 5 }, // counted
    ];
    const f = binHourlyToFrequencies(samples);
    expect(f.N).toBeCloseTo(0.5, 5);
    expect(f.E).toBeCloseTo(0.5, 5);
    expect(f.S).toBe(0);
  });

  it("handles 360° wraparound (357° lands in N)", () => {
    const samples: HourlySample[] = [
      { dirDeg: 357, speedMs: 5 },
      { dirDeg: 3, speedMs: 5 },
    ];
    const f = binHourlyToFrequencies(samples);
    expect(f.N).toBe(1);
  });

  it("normalizes to sum 1 on mixed input", () => {
    const samples: HourlySample[] = [
      { dirDeg: 270, speedMs: 7 },
      { dirDeg: 270, speedMs: 9 },
      { dirDeg: 90, speedMs: 4 },
    ];
    const f = binHourlyToFrequencies(samples);
    const sum = ALL.reduce((acc, c) => acc + f[c], 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("skips non-finite samples", () => {
    const samples: HourlySample[] = [
      { dirDeg: NaN, speedMs: 5 },
      { dirDeg: 90, speedMs: Infinity },
      { dirDeg: 90, speedMs: 5 },
    ];
    const f = binHourlyToFrequencies(samples);
    expect(f.E).toBe(1);
  });

  it("returns all-zero map when input is empty or all calm", () => {
    expect(binHourlyToFrequencies([]).N).toBe(0);
    const allCalm: HourlySample[] = [
      { dirDeg: 0, speedMs: 0.1 },
      { dirDeg: 90, speedMs: 0.2 },
    ];
    const f = binHourlyToFrequencies(allCalm);
    for (const code of ALL) expect(f[code]).toBe(0);
  });
});

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
    const raw = window.localStorage.getItem("ogden-atlas-wind-clim-v1:aged")!;
    const parsed = JSON.parse(raw);
    parsed.fetchedAt = Date.now() - 1000 * 60 * 60 * 24 * 60; // 60 days old
    window.localStorage.setItem("ogden-atlas-wind-clim-v1:aged", JSON.stringify(parsed));
    expect(getCached("aged", 30)).toBeNull();
  });

  it("returns null on malformed JSON", () => {
    window.localStorage.setItem("ogden-atlas-wind-clim-v1:bad", "{not json");
    expect(getCached("bad")).toBeNull();
  });
});
