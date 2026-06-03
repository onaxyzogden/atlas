/**
 * @vitest-environment happy-dom
 *
 * flowMapGeometry unit tests. The helpers are pure (type-only store import); the
 * directive is kept for parity with the sibling A-slice suites.
 */

import { describe, it, expect } from "vitest";
import {
  flowMagnitude,
  edgeWidth,
  flowPolylinePoints,
  polylinePointsAttr,
  MIN_EDGE_WIDTH,
  MAX_EDGE_WIDTH,
  type FlowPoint,
} from "../flowMapGeometry.js";

describe("flowMagnitude", () => {
  it("returns the largest positive finite of mass / volume / energy", () => {
    expect(
      flowMagnitude({ massKgPerMonth: 245, volumeLPerMonth: 1800, energyKwhPerMonth: 95 }),
    ).toBe(1800);
    expect(flowMagnitude({ massKgPerMonth: 245 })).toBe(245);
  });

  it("is 0 when no throughput is set or all are non-positive / non-finite", () => {
    expect(flowMagnitude({})).toBe(0);
    expect(flowMagnitude({ massKgPerMonth: 0, volumeLPerMonth: -5 })).toBe(0);
    expect(flowMagnitude({ energyKwhPerMonth: Number.NaN })).toBe(0);
  });
});

describe("edgeWidth", () => {
  it("ramps linearly from min to max by volume / maxVolume", () => {
    expect(edgeWidth(0, 100)).toBe(MIN_EDGE_WIDTH); // 0 volume -> min
    expect(edgeWidth(100, 100)).toBe(MAX_EDGE_WIDTH); // full -> max
    const mid = edgeWidth(50, 100);
    expect(mid).toBeCloseTo(MIN_EDGE_WIDTH + 0.5 * (MAX_EDGE_WIDTH - MIN_EDGE_WIDTH), 6);
  });

  it("clamps volume above maxVolume to max width", () => {
    expect(edgeWidth(500, 100)).toBe(MAX_EDGE_WIDTH);
  });

  it("returns min for degenerate inputs", () => {
    expect(edgeWidth(-5, 100)).toBe(MIN_EDGE_WIDTH);
    expect(edgeWidth(50, 0)).toBe(MIN_EDGE_WIDTH);
    expect(edgeWidth(Number.NaN, 100)).toBe(MIN_EDGE_WIDTH);
    expect(edgeWidth(50, Number.NaN)).toBe(MIN_EDGE_WIDTH);
  });

  it("honours custom min / max", () => {
    expect(edgeWidth(100, 100, { min: 2, max: 10 })).toBe(10);
    expect(edgeWidth(0, 100, { min: 2, max: 10 })).toBe(2);
  });
});

describe("flowPolylinePoints", () => {
  const s: FlowPoint = { x: 0, y: 0 };
  const v1: FlowPoint = { x: 5, y: 5 };
  const v2: FlowPoint = { x: 10, y: 0 };
  const k: FlowPoint = { x: 15, y: 15 };

  it("orders source -> via... -> sink", () => {
    expect(flowPolylinePoints(s, [v1, v2], k)).toEqual([s, v1, v2, k]);
  });

  it("skips via entries without a centroid (null/undefined)", () => {
    expect(flowPolylinePoints(s, [null, v1, undefined], k)).toEqual([s, v1, k]);
  });

  it("degrades to a straight source->sink segment when all via are missing", () => {
    expect(flowPolylinePoints(s, [null, undefined], k)).toEqual([s, k]);
  });

  it("omits a null/undefined source or sink", () => {
    expect(flowPolylinePoints(null, [v1], k)).toEqual([v1, k]);
    expect(flowPolylinePoints(s, [v1], undefined)).toEqual([s, v1]);
    expect(flowPolylinePoints(null, [], undefined)).toEqual([]);
  });
});

describe("polylinePointsAttr", () => {
  it("formats an SVG points string", () => {
    expect(
      polylinePointsAttr([
        { x: 0, y: 0 },
        { x: 5, y: 10 },
        { x: 15, y: 3 },
      ]),
    ).toBe("0,0 5,10 15,3");
  });

  it("is empty for no points", () => {
    expect(polylinePointsAttr([])).toBe("");
  });
});
