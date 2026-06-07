/**
 * @vitest-environment happy-dom
 *
 * loopDesignScore is pure, but it transitively imports closedLoopStore.ts
 * (via flowStatusModel.ts), which calls rehydrateWithLogging at module scope and
 * needs a DOM. happy-dom (NOT jsdom) per the test-env lesson.
 */
import { describe, it, expect } from "vitest";
import {
  efficiency,
  computeLoopDesignScore,
  LOOP_DESIGN_TIER_CONFIG,
} from "../loopDesignScore.js";
import type { MaterialFlow } from "../../../../store/closedLoopStore.js";

let seq = 0;
function flow(overrides: Partial<MaterialFlow> = {}): MaterialFlow {
  seq += 1;
  return {
    id: "flow-" + seq,
    projectId: "p1",
    label: "Flow " + seq,
    materialKind: "greywater",
    sourceId: null,
    sinkId: null,
    origin: "list",
    createdAt: "2026-06-03T00:00:00.000Z",
    ...overrides,
  };
}

const closed = (over: Partial<MaterialFlow> = {}) =>
  flow({ sourceId: "src", sinkId: "sink", ...over });

describe("efficiency", () => {
  it("returns 0 for an empty flow set", () => {
    expect(efficiency([])).toBe(0);
  });

  it("counts only flows with both endpoints pinned", () => {
    expect(efficiency([closed(), closed(), flow()])).toBe(67);
  });

  it("returns 100 when every flow is closed", () => {
    expect(efficiency([closed(), closed()])).toBe(100);
  });
});

describe("computeLoopDesignScore", () => {
  it("empty -> all zeros, tier none", () => {
    const s = computeLoopDesignScore([], 0);
    expect(s).toMatchObject({
      flowCount: 0,
      closedLoopPct: 0,
      withCadencePct: 0,
      atRiskCount: 0,
      overallScore: 0,
      tier: "none",
    });
  });

  it("all pinned + with cadence + no orphans -> excellent (high score)", () => {
    const flows = [
      closed({ cadence: "weekly" }),
      closed({ cadence: "monthly" }),
      closed({ cadence: "seasonal" }),
    ];
    const s = computeLoopDesignScore(flows, 0);
    expect(s.closedLoopPct).toBe(100);
    expect(s.withCadencePct).toBe(100);
    expect(s.overallScore).toBe(100);
    expect(s.tier).toBe("excellent");
  });

  it("counts at-risk flows via resolved status", () => {
    const flows = [
      closed({ cadence: "weekly", operationalStatus: "at-risk" }),
      closed({ cadence: "weekly" }),
      flow(), // open, no cadence, default active
    ];
    const s = computeLoopDesignScore(flows, 0);
    expect(s.atRiskCount).toBe(1);
    expect(s.closedLoopPct).toBe(67);
    expect(s.withCadencePct).toBe(67);
  });

  it("docks orphan and at-risk penalties (capped) and clamps at 0", () => {
    // 5 open flows, no cadence -> base 0; orphans + at-risk only subtract.
    const flows = [
      flow({ operationalStatus: "at-risk" }),
      flow({ operationalStatus: "at-risk" }),
    ];
    const s = computeLoopDesignScore(flows, 3);
    expect(s.overallScore).toBe(0); // clamped, never negative
    expect(s.orphanCount).toBe(3);
    expect(s.atRiskCount).toBe(2);
    expect(s.tier).toBe("nascent");
  });

  it("normalizes a negative orphanCount to 0", () => {
    const s = computeLoopDesignScore([closed({ cadence: "weekly" })], -4);
    expect(s.orphanCount).toBe(0);
  });

  it("bands a partial loop into a developing/good tier", () => {
    // All closed (100), none with cadence (0): base = 60, no penalties -> good.
    const flows = [closed(), closed()];
    const s = computeLoopDesignScore(flows, 0);
    expect(s.overallScore).toBe(60);
    expect(s.tier).toBe("good");
  });

  it("exposes a tier config label for every tier", () => {
    (["none", "nascent", "developing", "good", "excellent"] as const).forEach(
      (t) => {
        expect(LOOP_DESIGN_TIER_CONFIG[t].label.length).toBeGreaterThan(0);
      },
    );
  });
});
