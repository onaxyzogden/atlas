/**
 * compassGating — pure functions for the Stage Compass node-unlock model.
 *
 * The "Real Outcome Rule": a node (= one checklist item) unlocks only when the
 * previous node is verified, and progress reflects *verified* outcomes, not
 * clicks. A node counts as verified if the compass store marks it verified OR
 * the steward already checked that step in the map (observeHowChecksStore) —
 * so real fieldwork flows back into the compass.
 *
 * Kept free of React/zustand so the gating is unit-testable in isolation.
 */

export type NodeEvidence = 'evidence-in' | 'verified';
export type NodeState = 'locked' | 'open' | 'evidence-in' | 'verified';

/** Per-node evidence state for one objective, keyed by node index. */
export type RawEvidenceMap = Partial<Record<number, NodeEvidence>>;

export interface ObjectiveProgress {
  verified: number;
  total: number;
  pct: number;
}

export function isVerified(
  raw: RawEvidenceMap,
  checked: readonly number[],
  index: number,
): boolean {
  return raw[index] === 'verified' || checked.includes(index);
}

/**
 * Resolve every node's display state for one objective. Sequential gating:
 * node 0 is always at least `open`; a later node is `locked` until its
 * predecessor is verified. A verified node always reads `verified` regardless
 * of order (a checked step can land out of sequence).
 */
export function resolveNodeStates(
  nodeCount: number,
  raw: RawEvidenceMap,
  checked: readonly number[],
): NodeState[] {
  const states: NodeState[] = [];
  for (let i = 0; i < nodeCount; i++) {
    if (isVerified(raw, checked, i)) {
      states.push('verified');
      continue;
    }
    const prevVerified = i === 0 || isVerified(raw, checked, i - 1);
    if (!prevVerified) {
      states.push('locked');
      continue;
    }
    states.push(raw[i] === 'evidence-in' ? 'evidence-in' : 'open');
  }
  return states;
}

export function objectiveProgress(
  nodeCount: number,
  raw: RawEvidenceMap,
  checked: readonly number[],
): ObjectiveProgress {
  let verified = 0;
  for (let i = 0; i < nodeCount; i++) {
    if (isVerified(raw, checked, i)) verified += 1;
  }
  const pct = nodeCount === 0 ? 0 : Math.round((verified / nodeCount) * 100);
  return { verified, total: nodeCount, pct };
}

/** Aggregate several objectives into a single stage-level progress figure. */
export function aggregateProgress(
  parts: readonly ObjectiveProgress[],
): ObjectiveProgress {
  const verified = parts.reduce((sum, p) => sum + p.verified, 0);
  const total = parts.reduce((sum, p) => sum + p.total, 0);
  const pct = total === 0 ? 0 : Math.round((verified / total) * 100);
  return { verified, total, pct };
}
