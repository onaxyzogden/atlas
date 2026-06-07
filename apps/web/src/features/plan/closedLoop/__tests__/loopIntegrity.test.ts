/**
 * @vitest-environment happy-dom
 *
 * loopIntegrity unit tests. The helper itself is pure (type-only store import),
 * but the directive is kept for parity with the sibling A-slice suites and to
 * guard against any transitive persist-backed rehydrate (A0 test-env lesson).
 */

import { describe, it, expect } from "vitest";
import { loopIntegrityChecks, type LoopIntegrityCheckId } from "../loopIntegrity.js";
import type { MaterialFlow } from "../../../../store/closedLoopStore.js";

/** Look up a check's done flag by id (throws if absent so the type narrows). */
function done(flow: MaterialFlow, id: LoopIntegrityCheckId): boolean {
  const check = loopIntegrityChecks(flow).checks.find((c) => c.id === id);
  if (!check) throw new Error(`missing check: ${id}`);
  return check.done;
}

function flow(overrides: Partial<MaterialFlow> = {}): MaterialFlow {
  return {
    id: "f1",
    projectId: "p1",
    label: "weekly bucket run",
    materialKind: "organic_matter",
    sourceId: null,
    sinkId: null,
    origin: "list",
    createdAt: "2026-06-03T00:00:00.000Z",
    ...overrides,
  };
}

describe("loopIntegrityChecks", () => {
  it("returns five ordered checks", () => {
    const result = loopIntegrityChecks(flow());
    expect(result.totalCount).toBe(5);
    expect(result.checks.map((c) => c.id)).toEqual([
      "sink",
      "cadence",
      "volume",
      "via",
      "activeMonths",
    ]);
    expect(result.checks.every((c) => c.label.length > 0)).toBe(true);
  });

  it("an empty flow has zero complete checks", () => {
    const result = loopIntegrityChecks(flow());
    expect(result.completeCount).toBe(0);
    expect(result.checks.every((c) => !c.done)).toBe(true);
  });

  it("sink check is done only when sinkId is a non-empty id", () => {
    expect(done(flow({ sinkId: "z9" }), "sink")).toBe(true);
    expect(done(flow({ sinkId: "" }), "sink")).toBe(false);
    expect(done(flow({ sinkId: null }), "sink")).toBe(false);
  });

  it("cadence check is done when cadence is set", () => {
    expect(done(flow({ cadence: "weekly" }), "cadence")).toBe(true);
    expect(done(flow(), "cadence")).toBe(false);
  });

  it("volume check counts any positive mass / volume / energy", () => {
    expect(done(flow({ massKgPerMonth: 245 }), "volume")).toBe(true);
    expect(done(flow({ volumeLPerMonth: 1800 }), "volume")).toBe(true);
    expect(done(flow({ energyKwhPerMonth: 95 }), "volume")).toBe(true);
    // zero / negative / non-finite do NOT count
    expect(done(flow({ massKgPerMonth: 0 }), "volume")).toBe(false);
    expect(done(flow({ volumeLPerMonth: -5 }), "volume")).toBe(false);
    expect(done(flow(), "volume")).toBe(false);
  });

  it("nutrient-only quantities do NOT satisfy the throughput check", () => {
    expect(done(flow({ nutrientNKgPerMonth: 1.2 }), "volume")).toBe(false);
  });

  it("via check is done when transformationNodeIds is non-empty", () => {
    expect(done(flow({ transformationNodeIds: ["n1"] }), "via")).toBe(true);
    expect(done(flow({ transformationNodeIds: [] }), "via")).toBe(false);
    expect(done(flow(), "via")).toBe(false);
  });

  it("activeMonths check is done when activeMonths is non-empty", () => {
    expect(done(flow({ activeMonths: [3, 4, 5] }), "activeMonths")).toBe(true);
    expect(done(flow({ activeMonths: [] }), "activeMonths")).toBe(false);
    expect(done(flow(), "activeMonths")).toBe(false);
  });

  it("a fully specified flow has all five checks complete", () => {
    const result = loopIntegrityChecks(
      flow({
        sinkId: "z9",
        cadence: "weekly",
        massKgPerMonth: 245,
        transformationNodeIds: ["n1"],
        activeMonths: [3, 4, 5],
      }),
    );
    expect(result.completeCount).toBe(5);
    expect(result.checks.every((c) => c.done)).toBe(true);
  });
});
