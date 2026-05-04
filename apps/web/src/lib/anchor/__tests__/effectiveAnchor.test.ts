/**
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import { getEffectiveAnchor, polygonCentroid } from "../effectiveAnchor.js";

const FALLBACK: [number, number] = [-78.20, 44.50];

const SQUARE: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [[
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ]],
};

describe("polygonCentroid", () => {
  it("computes the mean of distinct ring vertices (closing dup excluded)", () => {
    const c = polygonCentroid(SQUARE);
    expect(c).toEqual([5, 5]);
  });

  it("returns null for an empty ring", () => {
    expect(polygonCentroid({ type: "Polygon", coordinates: [[]] })).toBeNull();
  });
});

describe("getEffectiveAnchor", () => {
  it("prefers an explicit homestead over boundary and fallback", () => {
    const a = getEffectiveAnchor([1, 2], SQUARE, FALLBACK);
    expect(a).toEqual([1, 2]);
  });

  it("falls back to boundary centroid when no homestead", () => {
    const a = getEffectiveAnchor(undefined, SQUARE, FALLBACK);
    expect(a).toEqual([5, 5]);
  });

  it("falls back to fallback when neither homestead nor boundary present", () => {
    const a = getEffectiveAnchor(undefined, undefined, FALLBACK);
    expect(a).toEqual(FALLBACK);
  });

  it("falls back to fallback when boundary ring is empty", () => {
    const a = getEffectiveAnchor(
      undefined,
      { type: "Polygon", coordinates: [[]] },
      FALLBACK,
    );
    expect(a).toEqual(FALLBACK);
  });
});
