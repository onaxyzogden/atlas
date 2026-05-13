/**
 * @ogden/shared/relationships — design-status gate.
 *
 * Pure validator behind the `draft` → `ready-for-review` transition
 * surfaced by NeedsYieldsAuditCard, the project header chip, and any
 * future bookmarklet/CLI hook. Returns `ok: true` immediately when the
 * project's `allowOrphanOutputs` escape hatch is set, per the
 * 2026-04-28 ADR ("override allowed via per-project allowOrphanOutputs
 * flag, surfaced prominently so it's a deliberate choice").
 */

import { orphanOutputs, unmetInputs } from './cycle.js';
import type { Edge, PlacedEntity } from './types.js';

export interface StatusGateResult {
  ok: boolean;
  orphanCount: number;
  unmetCount: number;
  reason?: string;
}

export function canAdvanceToReadyForReview(
  edges: ReadonlyArray<Edge>,
  entities: ReadonlyArray<PlacedEntity>,
  allowOrphanOutputs: boolean,
): StatusGateResult {
  const orphans = orphanOutputs(entities, edges);
  const unmet = unmetInputs(entities, edges);
  const orphanCount = orphans.length;
  const unmetCount = unmet.length;

  if (allowOrphanOutputs) {
    return { ok: true, orphanCount, unmetCount };
  }
  if (orphanCount === 0) {
    return { ok: true, orphanCount, unmetCount };
  }
  return {
    ok: false,
    orphanCount,
    unmetCount,
    reason: `${orphanCount} unrouted output${orphanCount === 1 ? '' : 's'}`,
  };
}
