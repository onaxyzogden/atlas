/**
 * loopApprovalGate - pure, render-free approval verdict for a project's
 * closed-loop design (Slice A4 of the Plan->Act closed-loop workflow).
 *
 * Mirrors the project-header design-status gate pattern + the
 * `getAllowOrphanOutputs(project)` escape hatch (projectStore.ts, from the
 * 2026-04-28 Needs & Yields ADR): the steward must close every flow to real
 * features before a loop can be approved for handoff to Act, but orphan OUTPUTS
 * (a fertility node producing an output with no upstream feedstock) can be
 * waved through deliberately when the per-project `allowOrphanOutputs` flag is
 * set.
 *
 * Pure: no store import, no React. The caller passes the project-scoped slices
 * already derived by `useClosedLoopValidation`. Type-only import of MaterialFlow
 * (erased at runtime) keeps this module store-free.
 */

import type { MaterialFlow } from '../../../store/closedLoopStore.js';

export interface LoopApprovalCounts {
  /** Total project-scoped material flows. */
  flows: number;
  /** Flows with an unpinned (null) source or sink endpoint. */
  danglingEndpoints: number;
  /** Fertility nodes producing an output with no incoming feedstock. */
  orphanOutputs: number;
  /** Fertility nodes with no flow in or out at all. */
  orphanFertility: number;
}

export interface LoopApprovalVerdict {
  ok: boolean;
  counts: LoopApprovalCounts;
  reason: string;
}

/**
 * Minimal structural slice of `useClosedLoopValidation`'s return value the gate
 * needs. The full `ClosedLoopValidation` is assignable to this.
 */
export interface LoopApprovalInput {
  vectors: ReadonlyArray<Pick<MaterialFlow, 'sourceId' | 'sinkId'>>;
  fertilityWithoutFeedstock: ReadonlyArray<unknown>;
  orphanFertility: ReadonlyArray<unknown>;
}

/**
 * Decide whether a project's closed-loop design can be approved for Act handoff.
 *
 * Blocking order (first failure wins the reason): no flows -> dangling
 * endpoints -> orphan fertility -> orphan outputs (unless allowed). `counts` is
 * always populated so callers can render the full diagnostic regardless of `ok`.
 *
 * @param validation         project-scoped validation slices
 * @param allowOrphanOutputs the per-project escape hatch (getAllowOrphanOutputs)
 */
export function canApproveLoop(
  validation: LoopApprovalInput,
  allowOrphanOutputs: boolean,
): LoopApprovalVerdict {
  const flows = validation.vectors.length;
  const danglingEndpoints = validation.vectors.filter(
    (v) => !v.sourceId || !v.sinkId,
  ).length;
  const orphanOutputs = validation.fertilityWithoutFeedstock.length;
  const orphanFertility = validation.orphanFertility.length;

  const counts: LoopApprovalCounts = {
    flows,
    danglingEndpoints,
    orphanOutputs,
    orphanFertility,
  };

  if (flows === 0) {
    return { ok: false, counts, reason: 'No material flows to approve yet.' };
  }
  if (danglingEndpoints > 0) {
    const plural = danglingEndpoints === 1;
    return {
      ok: false,
      counts,
      reason: `${danglingEndpoints} ${plural ? 'flow has' : 'flows have'} an unpinned endpoint. Pin both ends to a mapped feature before approving.`,
    };
  }
  if (orphanFertility > 0) {
    const plural = orphanFertility === 1;
    return {
      ok: false,
      counts,
      reason: `${orphanFertility} fertility ${plural ? 'node has' : 'nodes have'} no flow in or out. Connect or remove ${plural ? 'it' : 'them'} before approving.`,
    };
  }
  if (orphanOutputs > 0 && !allowOrphanOutputs) {
    const plural = orphanOutputs === 1;
    return {
      ok: false,
      counts,
      reason: `${orphanOutputs} fertility ${plural ? 'node produces' : 'nodes produce'} an output with no feedstock. Add a feedstock flow, or enable allow-orphan-outputs to approve anyway.`,
    };
  }
  return { ok: true, counts, reason: 'Loop ready to approve.' };
}
