/**
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import {
  beaufortColor,
  computeWindSectors,
  DEFAULT_FREQUENCIES,
  type CompassCode,
} from "../wind.js";

const ANCHOR: [number, number] = [-78.20, 44.50];
const ORDER: CompassCode[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

describe("computeWindSectors", () => {
  it("emits eight wedges in N→NW order", () => {
    const rose = computeWindSectors(ANCHOR);
    expect(rose.wedges).toHaveLength(8);
    expect(rose.wedges.map((w) => w.meta?.direction)).toEqual(ORDER);
  });

  it("each wedge has the kind 'wind-prevailing'", () => {
    const rose = computeWindSectors(ANCHOR);
    for (const w of rose.wedges) expect(w.kind).toBe("wind-prevailing");
  });

  it("wedge bearings are 45°-stepped center ± 22.5°", () => {
    const rose = computeWindSectors(ANCHOR);
    rose.wedges.forEach((w, i) => {
      const center = i * 45;
      const expectedStart = ((center - 22.5) % 360 + 360) % 360;
      const expectedEnd = (center + 22.5) % 360;
      expect(w.startBearingDeg).toBeCloseTo(expectedStart, 5);
      expect(w.endBearingDeg).toBeCloseTo(expectedEnd, 5);
    });
  });

  it("default frequencies sum to ≈ 1", () => {
    const sum = ORDER.reduce((acc, k) => acc + DEFAULT_FREQUENCIES[k], 0);
    expect(sum).toBeCloseTo(1.0, 2);
  });

  it("W is the dominant direction in the default rose", () => {
    const rose = computeWindSectors(ANCHOR);
    const reach = (code: CompassCode) =>
      rose.wedges.find((w) => w.meta?.direction === code)!.reachMeters;
    expect(reach("W")).toBeGreaterThan(reach("N"));
    expect(reach("W")).toBeGreaterThan(reach("E"));
    expect(reach("W")).toBeGreaterThan(reach("S"));
    expect(reach("W")).toBeGreaterThanOrEqual(reach("NW"));
  });

  it("longest petal equals maxReachMeters", () => {
    const rose = computeWindSectors(ANCHOR, { maxReachMeters: 800 });
    const max = Math.max(...rose.wedges.map((w) => w.reachMeters));
    expect(max).toBeCloseTo(800, 5);
  });

  it("custom frequencies override defaults", () => {
    const rose = computeWindSectors(ANCHOR, {
      frequencies: { N: 0.5, S: 0.0 },
    });
    const n = rose.wedges.find((w) => w.meta?.direction === "N")!;
    const s = rose.wedges.find((w) => w.meta?.direction === "S")!;
    expect(n.meta?.frequency).toBe(0.5);
    expect(s.meta?.frequency).toBe(0);
    expect(s.reachMeters).toBe(0);
  });

  it("non-finite or negative custom frequencies fall back to defaults", () => {
    const rose = computeWindSectors(ANCHOR, {
      frequencies: { W: NaN, NW: -1 },
    });
    const w = rose.wedges.find((wd) => wd.meta?.direction === "W")!;
    const nw = rose.wedges.find((wd) => wd.meta?.direction === "NW")!;
    expect(w.meta?.frequency).toBe(DEFAULT_FREQUENCIES.W);
    expect(nw.meta?.frequency).toBe(DEFAULT_FREQUENCIES.NW);
  });

  it("preserves the anchor as centroid", () => {
    const rose = computeWindSectors(ANCHOR);
    expect(rose.centroid).toEqual(ANCHOR);
  });

  it("includes a sources[] entry naming the climatology", () => {
    const rose = computeWindSectors(ANCHOR);
    expect(rose.sources.some((s) => s.kind === "wind")).toBe(true);
  });
});

describe("beaufortColor", () => {
  it("light air / light breeze (< 3.4 m/s) → light teal", () => {
    expect(beaufortColor(0)).toBe("#7aa3b8");
    expect(beaufortColor(3.39)).toBe("#7aa3b8");
  });

  it("gentle breeze (3.4–5.4 m/s) → mid teal", () => {
    expect(beaufortColor(3.4)).toBe("#5b7a8a");
    expect(beaufortColor(5.39)).toBe("#5b7a8a");
  });

  it("moderate breeze (5.4–7.9 m/s) → estate gold", () => {
    expect(beaufortColor(5.4)).toBe("#b08a3a");
    expect(beaufortColor(7.89)).toBe("#b08a3a");
  });

  it("fresh+ breeze (≥ 7.9 m/s) → fired clay", () => {
    expect(beaufortColor(7.9)).toBe("#8a4f3a");
    expect(beaufortColor(20)).toBe("#8a4f3a");
  });

  it("missing or non-finite speed falls back to neutral mid teal", () => {
    expect(beaufortColor(null)).toBe("#5b7a8a");
    expect(beaufortColor(undefined)).toBe("#5b7a8a");
    expect(beaufortColor(Number.NaN)).toBe("#5b7a8a");
  });
});

describe("computeWindSectors — Beaufort shading", () => {
  it("tints each petal by its bin's mean speed", () => {
    const rose = computeWindSectors(ANCHOR, {
      meanSpeedsMs: { W: 4.5, N: 8.2, E: 2.0, S: 6.5 },
    });
    const byDir = (code: CompassCode) =>
      rose.wedges.find((w) => w.meta?.direction === code)!;
    expect(byDir("W").color).toBe("#5b7a8a"); // gentle
    expect(byDir("N").color).toBe("#8a4f3a"); // fresh+
    expect(byDir("E").color).toBe("#7aa3b8"); // light
    expect(byDir("S").color).toBe("#b08a3a"); // moderate
  });

  it("missing meanSpeedsMs entry falls back to neutral color and null meta", () => {
    const rose = computeWindSectors(ANCHOR, {
      meanSpeedsMs: { W: 5 },
    });
    const ne = rose.wedges.find((w) => w.meta?.direction === "NE")!;
    expect(ne.color).toBe("#5b7a8a");
    expect(ne.meta?.meanSpeedMs).toBeNull();
  });

  it("threads meanSpeedMs onto wedge.meta", () => {
    const rose = computeWindSectors(ANCHOR, {
      meanSpeedsMs: { W: 5.5 },
    });
    const w = rose.wedges.find((wd) => wd.meta?.direction === "W")!;
    expect(w.meta?.meanSpeedMs).toBe(5.5);
  });
});
