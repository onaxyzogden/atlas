/**
 * @vitest-environment node
 *
 * Concentric zones — six rings, ascending radii, Zone 5 unbounded.
 */

import { describe, it, expect } from "vitest";
import { computeConcentricZones } from "../concentric.js";

const MTC: [number, number] = [-78.20, 44.50];

describe("computeConcentricZones", () => {
  it("returns six rings indexed 0..5", () => {
    const zones = computeConcentricZones(MTC);
    expect(zones.rings.map((r) => r.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("uses the default radii ladder", () => {
    const zones = computeConcentricZones(MTC);
    const outer = zones.rings.map((r) => r.outerRadiusMeters);
    expect(outer).toEqual([5, 30, 100, 300, 600, undefined]);
  });

  it("each ring's inner radius matches the previous ring's outer", () => {
    const zones = computeConcentricZones(MTC);
    for (let i = 1; i < zones.rings.length; i++) {
      expect(zones.rings[i]!.innerRadiusMeters).toBe(
        zones.rings[i - 1]!.outerRadiusMeters,
      );
    }
  });

  it("Zone 0 starts at the centroid (innerRadius 0)", () => {
    const zones = computeConcentricZones(MTC);
    expect(zones.rings[0]!.innerRadiusMeters).toBe(0);
  });

  it("Zone 5 has no outer radius (extends to parcel boundary)", () => {
    const zones = computeConcentricZones(MTC);
    expect(zones.rings[5]!.outerRadiusMeters).toBeUndefined();
  });

  it("respects a custom radii ladder", () => {
    const zones = computeConcentricZones(MTC, {
      outerRadii: [10, 50, 150, 400, 800],
    });
    expect(zones.rings.map((r) => r.outerRadiusMeters)).toEqual(
      [10, 50, 150, 400, 800, undefined],
    );
  });

  it("falls back to defaults when custom radii are non-ascending", () => {
    const zones = computeConcentricZones(MTC, {
      outerRadii: [100, 50, 200, 300, 400],
    });
    expect(zones.rings[1]!.outerRadiusMeters).toBe(30);
  });

  it("each ring carries a label that names its index", () => {
    const zones = computeConcentricZones(MTC);
    for (const r of zones.rings) {
      expect(r.label).toContain(`Zone ${r.index}`);
    }
  });

  it("each ring carries a distinct color", () => {
    const zones = computeConcentricZones(MTC);
    const colors = new Set(zones.rings.map((r) => r.color));
    expect(colors.size).toBe(6);
  });

  it("includes a sources[] entry naming Mollison", () => {
    const zones = computeConcentricZones(MTC);
    expect(zones.sources.some((s) => s.provenance.includes("Mollison"))).toBe(true);
  });

  it("preserves the centroid input", () => {
    const zones = computeConcentricZones(MTC);
    expect(zones.centroid).toEqual(MTC);
  });
});
