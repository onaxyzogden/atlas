/**
 * loopDesignScore - pure, render-free scoring for a project's closed-loop
 * design (Slice A1 of the Plan->Act closed-loop workflow).
 *
 * Single source of truth for the whole-surface "Loop Design Score" shown in
 * WasteVectorTool and for the dashboard's loop-efficiency badge. The
 * `efficiency()` helper was extracted out of WasteVectorDashboardView and is
 * re-imported there so the two surfaces can never disagree.
 *
 * Pure: no store import, no React. Callers pass the project-scoped flows plus
 * the orphan count already derived from `useClosedLoopValidation`.
 */

import { resolveOperationalStatus } from "./flowStatusModel.js";
import type { MaterialFlow } from "../../../store/closedLoopStore.js";

export type LoopDesignTier =
  | "none"
  | "nascent"
  | "developing"
  | "good"
  | "excellent";

export interface LoopDesignScore {
  /** Total project-scoped material flows. */
  flowCount: number;
  /** Share of flows with BOTH endpoints pinned (closed-loop credit), 0-100. */
  closedLoopPct: number;
  /** Features with no flow in or out (orphan fertility + isolated features). */
  orphanCount: number;
  /** Share of flows carrying an explicit cadence, 0-100. */
  withCadencePct: number;
  /** Flows whose resolved operational status is "at-risk". */
  atRiskCount: number;
  /** Composite design quality, 0-100. */
  overallScore: number;
  /** Banded tier derived from overallScore (and emptiness). */
  tier: LoopDesignTier;
}

export interface LoopDesignTierMeta {
  label: string;
  tone: "neutral" | "info" | "warn" | "positive";
}

export const LOOP_DESIGN_TIER_CONFIG: Record<LoopDesignTier, LoopDesignTierMeta> = {
  none: { label: "No flows yet", tone: "neutral" },
  nascent: { label: "Nascent", tone: "warn" },
  developing: { label: "Developing", tone: "info" },
  good: { label: "Good", tone: "info" },
  excellent: { label: "Excellent", tone: "positive" },
};

/** Loop efficiency = share of flows with both endpoints pinned, as a 0-100 %. */
export function efficiency(fs: MaterialFlow[]): number {
  if (fs.length === 0) return 0;
  const closed = fs.filter((f) => f.sourceId && f.sinkId).length;
  return Math.round((closed / fs.length) * 100);
}

/** Clamp n into the inclusive [lo, hi] range. */
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function tierFor(flowCount: number, overallScore: number): LoopDesignTier {
  if (flowCount === 0) return "none";
  if (overallScore >= 80) return "excellent";
  if (overallScore >= 60) return "good";
  if (overallScore >= 35) return "developing";
  return "nascent";
}

/**
 * Compute the composite loop design score.
 *
 * @param flows       project-scoped MaterialFlow records
 * @param orphanCount features with no flow in or out (from validation:
 *                    orphanFertility.length + isolatedFeatures.length)
 */
export function computeLoopDesignScore(
  flows: MaterialFlow[],
  orphanCount: number,
): LoopDesignScore {
  const flowCount = flows.length;
  const safeOrphans = Math.max(0, Math.round(orphanCount));

  if (flowCount === 0) {
    return {
      flowCount: 0,
      closedLoopPct: 0,
      orphanCount: safeOrphans,
      withCadencePct: 0,
      atRiskCount: 0,
      overallScore: 0,
      tier: "none",
    };
  }

  const closedLoopPct = efficiency(flows);
  const withCadence = flows.filter((f) => f.cadence != null).length;
  const withCadencePct = Math.round((withCadence / flowCount) * 100);
  const atRiskCount = flows.filter(
    (f) => resolveOperationalStatus(f) === "at-risk",
  ).length;

  // Weighted base rewards closed loops (primary) + cadence coverage; penalties
  // dock orphaned nodes and at-risk flows, each capped so one metric cannot
  // sink the whole score.
  const base = 0.6 * closedLoopPct + 0.4 * withCadencePct;
  const orphanPenalty = Math.min(safeOrphans, 5) * 5; // cap 25
  const atRiskPenalty = Math.min(atRiskCount, 5) * 4; // cap 20
  const overallScore = clamp(Math.round(base - orphanPenalty - atRiskPenalty), 0, 100);

  return {
    flowCount,
    closedLoopPct,
    orphanCount: safeOrphans,
    withCadencePct,
    atRiskCount,
    overallScore,
    tier: tierFor(flowCount, overallScore),
  };
}
