/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchOpenMeteoWind, mostRecentCompleteYear } from "../fetchOpenMeteoWind.js";

function makeResponse(payload: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => payload,
  } as unknown as Response;
}

const SYNTHETIC_HOURLY = (() => {
  // 240 samples: 120 from W (270°), 60 from NW (315°), 60 from N (0°), all 5 m/s.
  const dir: number[] = [];
  const spd: number[] = [];
  for (let i = 0; i < 120; i++) { dir.push(270); spd.push(5); }
  for (let i = 0; i < 60; i++) { dir.push(315); spd.push(5); }
  for (let i = 0; i < 60; i++) { dir.push(0); spd.push(5); }
  return { wind_direction_10m: dir, wind_speed_10m: spd };
})();

describe("mostRecentCompleteYear", () => {
  it("returns prior calendar year as start/end", () => {
    const w = mostRecentCompleteYear(new Date("2026-04-28T00:00:00Z"));
    expect(w.year).toBe(2025);
    expect(w.start).toBe("2025-01-01");
    expect(w.end).toBe("2025-12-31");
  });
});

describe("fetchOpenMeteoWind", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("bins a canned hourly payload and returns a frequency map summing to 1", async () => {
    fetchSpy.mockResolvedValueOnce(makeResponse({ hourly: SYNTHETIC_HOURLY }));
    const result = await fetchOpenMeteoWind(44.5, -78.2, { now: new Date("2026-04-28T00:00:00Z") });
    expect(result).not.toBeNull();
    expect(result!.windowYear).toBe(2025);
    expect(result!.sampleCount).toBe(240);
    expect(result!.frequencies.W).toBeCloseTo(0.5, 5);
    expect(result!.frequencies.NW).toBeCloseTo(0.25, 5);
    expect(result!.frequencies.N).toBeCloseTo(0.25, 5);
    const sum = Object.values(result!.frequencies).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("returns null on network error", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("ECONNRESET"));
    const result = await fetchOpenMeteoWind(0, 0);
    expect(result).toBeNull();
  });

  it("retries once on 5xx, then succeeds", async () => {
    fetchSpy
      .mockResolvedValueOnce(makeResponse({}, { ok: false, status: 503 }))
      .mockResolvedValueOnce(makeResponse({ hourly: SYNTHETIC_HOURLY }));
    const result = await fetchOpenMeteoWind(0, 0, { now: new Date("2026-04-28T00:00:00Z") });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result).not.toBeNull();
  });

  it("does not retry on 4xx", async () => {
    fetchSpy.mockResolvedValueOnce(makeResponse({}, { ok: false, status: 400 }));
    const result = await fetchOpenMeteoWind(0, 0);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  it("returns null when payload has no hourly arrays", async () => {
    fetchSpy.mockResolvedValueOnce(makeResponse({}));
    const result = await fetchOpenMeteoWind(0, 0);
    expect(result).toBeNull();
  });

  it("returns null when every sample is calm (sum drops below 1)", async () => {
    const allCalm = {
      wind_direction_10m: Array.from({ length: 100 }, () => 0),
      wind_speed_10m: Array.from({ length: 100 }, () => 0.1),
    };
    fetchSpy.mockResolvedValueOnce(makeResponse({ hourly: allCalm }));
    const result = await fetchOpenMeteoWind(0, 0);
    expect(result).toBeNull();
  });

  it("encodes lat/lng + window into the URL", async () => {
    fetchSpy.mockResolvedValueOnce(makeResponse({ hourly: SYNTHETIC_HOURLY }));
    await fetchOpenMeteoWind(44.5, -78.2, {
      start: "2024-01-01",
      end: "2024-12-31",
    });
    const calledUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(calledUrl).toContain("latitude=44.5000");
    expect(calledUrl).toContain("longitude=-78.2000");
    expect(calledUrl).toContain("start_date=2024-01-01");
    expect(calledUrl).toContain("end_date=2024-12-31");
    expect(calledUrl).toContain("wind_direction_10m");
    expect(calledUrl).toContain("wind_speed_10m");
  });
});
