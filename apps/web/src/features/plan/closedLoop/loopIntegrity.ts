/**
 * loopIntegrity - pure, render-free per-flow design-completeness checklist
 * (Slice A2 of the Plan->Act closed-loop workflow).
 *
 * Given one MaterialFlow, report which design-intent slots a steward has filled
 * in so FlowDetailPanel can render an ordered checklist + a "N / M" progress
 * readout. Single source of truth: the same predicates drive the checklist UI
 * and any future gate that asks "is this flow fully specified?".
 *
 * Pure: no store import beyond the MaterialFlow type, no React.
 */

import type { MaterialFlow } from "../../../store/closedLoopStore.js";

export type LoopIntegrityCheckId =
  | "sink"
  | "cadence"
  | "volume"
  | "via"
  | "activeMonths";

export interface LoopIntegrityCheck {
  id: LoopIntegrityCheckId;
  /** Short imperative label for the checklist row. */
  label: string;
  /** Whether the steward has supplied this design-intent slot. */
  done: boolean;
}

export interface LoopIntegrityResult {
  /** Ordered checks (stable order; safe to render directly). */
  checks: LoopIntegrityCheck[];
  /** How many checks are done. */
  completeCount: number;
  /** Total number of checks (length of `checks`). */
  totalCount: number;
}

/** A throughput quantity counts when ANY of mass / volume / energy is a
 *  positive finite number (the nutrient sub-fields are detail, not the
 *  headline "is a quantity recorded?" signal). */
function hasVolume(flow: MaterialFlow): boolean {
  const candidates = [
    flow.massKgPerMonth,
    flow.volumeLPerMonth,
    flow.energyKwhPerMonth,
  ];
  return candidates.some((n) => typeof n === "number" && Number.isFinite(n) && n > 0);
}

/**
 * Compute the per-flow loop-integrity checklist.
 *
 * Order is deliberate (loop-closure first, then recurrence, then magnitude,
 * then routing, then seasonality) and stable for rendering.
 */
export function loopIntegrityChecks(flow: MaterialFlow): LoopIntegrityResult {
  const checks: LoopIntegrityCheck[] = [
    {
      id: "sink",
      label: "Sink pinned",
      done: flow.sinkId != null && flow.sinkId !== "",
    },
    {
      id: "cadence",
      label: "Cadence set",
      done: flow.cadence != null,
    },
    {
      id: "volume",
      label: "Throughput recorded",
      done: hasVolume(flow),
    },
    {
      id: "via",
      label: "Via node mapped",
      done: Array.isArray(flow.transformationNodeIds) && flow.transformationNodeIds.length > 0,
    },
    {
      id: "activeMonths",
      label: "Active months set",
      done: Array.isArray(flow.activeMonths) && flow.activeMonths.length > 0,
    },
  ];

  return {
    checks,
    completeCount: checks.filter((c) => c.done).length,
    totalCount: checks.length,
  };
}
