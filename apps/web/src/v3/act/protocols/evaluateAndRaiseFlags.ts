// evaluateAndRaiseFlags.ts
//
// Orchestration helper (T1.6): on a confirmed activation, count activations
// in the correct temporal window, run the pure deviation policy, and raise
// flags on the primary s6-yield-flows objective PLUS one-hop cascade to
// s7-phasing.
//
// This module has NO store imports -- it receives the raiseFlag action and
// the activations array as arguments, making it unit-testable without
// React or Zustand.
//
// Tier-1 gate: only S6_BOUND_TEMPLATE_IDS are handled here.
// Tier 2 (non-s6 templates) is handled by T2.2 via FEEDS_TO_OBJECTIVE.

import type { ProtocolActivation, ExpectedRate } from '@ogden/shared';
import {
  evaluateDeviation,
  S6_BOUND_TEMPLATE_IDS,
  TEMPLATE_DEPTH,
} from '@ogden/shared';
import type { RaiseFlagInput } from '../../../store/reviewFlagStore.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIMARY_OBJECTIVE_ID = 's6-yield-flows';
const CASCADE_OBJECTIVE_ID = 's7-phasing';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface EvaluateAndRaiseFlagsArgs {
  projectId: string;
  templateId: string;
  /** ALL activations from the store (any project) -- the helper filters. */
  activations: ProtocolActivation[];
  /** Steward's expected cadence for this (project, template), or undefined. */
  expectedRate?: ExpectedRate;
  /** The reviewFlagStore raiseFlag action (injected for testability). */
  raiseFlag: (input: RaiseFlagInput) => void;
}

// ---------------------------------------------------------------------------
// buildReason (pure, ASCII)
// ---------------------------------------------------------------------------

function buildReason(p: {
  templateId: string;
  deviationSign: 'over' | 'under' | 'existential';
  observedCount: number;
  expectedRate?: ExpectedRate;
}): string {
  if (p.deviationSign === 'existential') {
    return `${p.templateId} fired; a load-bearing design assumption is contradicted`;
  }
  const per = p.expectedRate?.per ?? 'window';
  const expected = p.expectedRate?.count ?? 0;
  return `${p.templateId} fired ${p.observedCount}x vs expected ${expected} this ${per}`;
}

// ---------------------------------------------------------------------------
// evaluateAndRaiseFlags
// ---------------------------------------------------------------------------

export function evaluateAndRaiseFlags(args: EvaluateAndRaiseFlagsArgs): void {
  const { projectId, templateId, activations, expectedRate, raiseFlag } = args;

  // 1. Tier-1 gate: only S6_BOUND_TEMPLATE_IDS are handled here.
  if (!S6_BOUND_TEMPLATE_IDS.has(templateId)) {
    return;
  }

  // 2. Confirmed set: filter to (project, template, confirmed).
  const confirmed = activations.filter(
    (a) =>
      a.projectId === projectId &&
      a.templateId === templateId &&
      a.confirmationStatus === 'confirmed',
  );
  if (confirmed.length === 0) {
    return;
  }

  // 3. Latest confirmed activation (sort descending by activatedAt).
  const sorted = [...confirmed].sort((a, b) =>
    b.activatedAt.localeCompare(a.activatedAt),
  );
  const latest = sorted[0];
  if (latest === undefined) {
    return;
  }
  const latestSeason = latest.season;
  const latestCycle = latest.cycleNumber;

  // 4. Window count: determine the windowed subset based on expectedRate.per.
  let windowed: ProtocolActivation[];
  let count: number;

  if (expectedRate === undefined) {
    // No baseline: use all confirmed (existential path needs count >= 1;
    // non-existential evaluateDeviation will return no-flag with no expectedRate).
    windowed = confirmed;
    count = confirmed.length;
  } else if (expectedRate.per === 'season') {
    windowed = confirmed.filter((a) => a.season === latestSeason);
    count = windowed.length;
  } else {
    // per === 'cycle'
    windowed = confirmed.filter((a) => a.cycleNumber === latestCycle);
    count = windowed.length;
  }

  // 5. Run the pure deviation policy.
  const result = evaluateDeviation({
    templateId,
    activationsInWindow: count,
    expectedRate,
  });
  if (!result.shouldFlag) {
    return;
  }

  // 6. Build and raise two flags (primary + cascade).
  // Guard: direction and deviationSign are always present when shouldFlag=true,
  // but noUncheckedIndexedAccess/strict requires explicit guards.
  if (!result.direction || !result.deviationSign) {
    return;
  }

  const depth = TEMPLATE_DEPTH[templateId] ?? 'threshold';
  const direction = result.direction;
  const deviationSign = result.deviationSign;

  const window = {
    ...(latestSeason !== undefined ? { season: latestSeason } : {}),
    ...(latestCycle !== undefined ? { cycleNumber: latestCycle } : {}),
  };

  const sourceActivationIds = windowed.map((a) => a.id);
  const baseReason = buildReason({
    templateId,
    deviationSign,
    observedCount: result.observedCount,
    expectedRate,
  });

  const shared = {
    projectId,
    sourceTemplateId: templateId,
    observedCount: result.observedCount,
    deviationSign,
    depth,
    direction,
    window,
    sourceActivationIds,
    ...(expectedRate !== undefined ? { expectedRate } : {}),
  } as const;

  // Primary flag
  const primary: RaiseFlagInput = {
    ...shared,
    objectiveId: PRIMARY_OBJECTIVE_ID,
    reason: baseReason,
  };
  raiseFlag(primary);

  // Cascade flag (one hop: s7-phasing)
  const cascade: RaiseFlagInput = {
    ...shared,
    objectiveId: CASCADE_OBJECTIVE_ID,
    reason: `downstream of ${PRIMARY_OBJECTIVE_ID}: ${baseReason}`,
  };
  raiseFlag(cascade);
}
