/**
 * placementGate — the single entry point draw tools call BEFORE creating a
 * skeleton record (and drag handlers call on mouseup).
 *
 *   blocks → rejected immediately: a `plan:tree-rejected` CustomEvent
 *            carries the rule message to the already-mounted
 *            PlanStampToast; no record, no dialog.
 *   warns  → PlacementConflictDialog opens at the anchor; the steward
 *            either cancels (rejected) or confirms with a ≥3-char
 *            acknowledgment, returned as `acknowledgments` for the caller
 *            to persist on the record (`placementAcknowledgments`).
 *   clean  → resolves ok with no acknowledgments.
 *
 * Plain async function, not a hook — tools call it inside event handlers
 * where the singleton stores are reachable via getState(). Context is
 * built fresh per gate call unless the caller passes one (the live-cursor
 * path in useDesignElementDrawTool manages its own pre-buffered context).
 *
 * Per the 2026-06-11 placement plan, Phases 3.2–3.3.
 */

import { usePlacementConflictStore } from '../draw/placementConflictStore.js';
import {
  evaluatePlacement,
  type PlacementViolation,
} from './evaluatePlacement.js';
import {
  buildPlacementContext,
  type PlacementContext,
  type PlacementGeometry,
} from './placementContext.js';
import type {
  PlacementAcknowledgment,
  PlacementCandidate,
} from '@ogden/shared/placementRules';

/** Re-exported so callers persist acks without a second import path. */
export type { PlacementAcknowledgment };

export interface PlacementGateResult {
  ok: boolean;
  /** Present (non-empty) only when warns were acknowledged. */
  acknowledgments?: PlacementAcknowledgment[];
}

export interface PlacementGateOptions {
  projectId: string;
  /** [lng, lat] the warn dialog anchors to — the click point or centroid. */
  anchor: [number, number];
  boundary?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  /** Reuse a pre-built (pre-buffered) context instead of snapshotting. */
  ctx?: PlacementContext;
  /** Self-exclusion for drag re-validation. */
  excludeFeatureId?: string;
}

function rejectWithToast(blocks: PlacementViolation[]): void {
  window.dispatchEvent(
    new CustomEvent('plan:tree-rejected', {
      detail: { reason: blocks[0]?.message ?? 'Placement not allowed here' },
    }),
  );
}

export async function gatePlacement(
  geometry: PlacementGeometry,
  candidate: PlacementCandidate,
  opts: PlacementGateOptions,
): Promise<PlacementGateResult> {
  const ctx =
    opts.ctx ??
    buildPlacementContext(opts.projectId, { boundary: opts.boundary ?? null });
  const evalOpts =
    opts.excludeFeatureId !== undefined
      ? { excludeFeatureId: opts.excludeFeatureId }
      : undefined;
  const result = evaluatePlacement(geometry, candidate, ctx, evalOpts);

  if (result.blocks.length > 0) {
    rejectWithToast(result.blocks);
    return { ok: false };
  }
  if (result.warns.length === 0) return { ok: true };

  return new Promise<PlacementGateResult>((resolve) => {
    usePlacementConflictStore.getState().open({
      violations: result.warns,
      anchor: opts.anchor,
      onConfirm: (acknowledgment) => {
        const acknowledgedAt = new Date().toISOString();
        resolve({
          ok: true,
          acknowledgments: result.warns.map((w) => ({
            ruleId: w.ruleId,
            message: w.message,
            acknowledgment,
            acknowledgedAt,
          })),
        });
      },
      onCancel: () => resolve({ ok: false }),
    });
  });
}
