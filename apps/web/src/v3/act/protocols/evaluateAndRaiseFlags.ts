// evaluateAndRaiseFlags.ts
//
// Orchestration helper (T1.6): on a confirmed activation, count activations
// in the correct temporal window, run the pure deviation policy, and raise
// flags on the primary universal s6 objective (s6-monitoring) PLUS one-hop
// cascade to the universal s7 phasing objective (s7-phase1).
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

// Universal-taxonomy objective ids. Every typed (wizard-created) project
// resolves its Plan objectives from the universal + per-type catalogues, whose
// s6/s7 strata are s6-monitoring (U-S6.1) and s7-phase1 (U-S7.1). The legacy
// static skeleton's s6-yield-flows / s7-phasing render ONLY for null-type
// projects, so flags on those ids could never surface a chip on a real typed
// project. Re-targeted to the universal ids at the T1.10 gate (steward
// decision, 2026-06): the universal slots are present in EVERY typed project's
// resolved set and sit in the same strata as the legacy targets.
const PRIMARY_OBJECTIVE_ID = 's6-monitoring';
const CASCADE_OBJECTIVE_ID = 's7-phase1';

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
  /**
   * ISO YYYY-MM-DD date when land establishment/planting began (from
   * LocalProject.commencementDate). When present and the project is within the
   * first 2 years of establishment (effectiveYear <= 2), the flag reason is
   * prefixed with an establishment-dip annotation so the steward interprets
   * the deviation in context rather than concluding a design failure.
   * Computed at the caller (ActTierExecutionPanel) -- this module is store-free.
   *
   * establishment window: effectiveYear <= 2,
   * per apps/api/.../soilRegeneration.ts stageFor
   */
  commencementDate?: string | null;
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
  const { projectId, templateId, activations, expectedRate, raiseFlag, commencementDate } = args;

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
  // Direct comparison of ISO-8601 UTC strings (all activatedAt values are
  // produced by new Date().toISOString()), so lexicographic order == time order.
  const sorted = [...confirmed].sort((a, b) =>
    a.activatedAt < b.activatedAt ? 1 : a.activatedAt > b.activatedAt ? -1 : 0,
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
    // When the project lacks coordinates, season is undefined on every
    // activation; `undefined === undefined` then windows ALL confirmed firings.
    // That is the intended fallback -- coordinate-less projects should still
    // get deviation detection (all-firings window) rather than silent
    // suppression. Same applies to the cycle branch below.
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
  // Guard: direction and deviationSign are always present when shouldFlag=true;
  // explicit undefined checks narrow both to their non-undefined types.
  if (result.direction === undefined || result.deviationSign === undefined) {
    return;
  }

  const depth = TEMPLATE_DEPTH[templateId] ?? 'threshold';
  const direction = result.direction;
  const deviationSign = result.deviationSign;

  const flagWindow = {
    ...(latestSeason !== undefined ? { season: latestSeason } : {}),
    ...(latestCycle !== undefined ? { cycleNumber: latestCycle } : {}),
  };

  const sourceActivationIds = windowed.map((a) => a.id);
  const rawReason = buildReason({
    templateId,
    deviationSign,
    observedCount: result.observedCount,
    expectedRate,
  });

  // Establishment re-frame (T1.9): if commencementDate is present and the
  // project is within the first 2 years of establishment, prefix the reason
  // with an annotation so the steward interprets the deviation in context.
  // Never suppresses the flag -- the annotation is purely interpretive.
  // establishment window: effectiveYear <= 2, per apps/api/.../soilRegeneration.ts stageFor
  const ESTABLISHMENT_PREFIX =
    "[Establishment - expected; interpret, don't conclude design failure] ";
  let baseReason: string;
  if (commencementDate != null && commencementDate.length > 0) {
    const parsedMs = Date.parse(commencementDate);
    if (!Number.isNaN(parsedMs)) {
      const effectiveYear = Math.floor(
        (Date.now() - parsedMs) / (365.25 * 24 * 3600 * 1000),
      );
      baseReason =
        effectiveYear <= 2
          ? ESTABLISHMENT_PREFIX + rawReason
          : rawReason;
    } else {
      baseReason = rawReason;
    }
  } else {
    baseReason = rawReason;
  }

  const shared = {
    projectId,
    sourceTemplateId: templateId,
    observedCount: result.observedCount,
    deviationSign,
    depth,
    direction,
    window: flagWindow,
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
