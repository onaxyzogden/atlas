/**
 * Regeneration readiness gate — the single pure source of truth for whether
 * a troubled zone under a steward-authored regeneration plan is ready to
 * carry livestock.
 *
 * The decisive rule is deliberately simple and steward-sovereign:
 *
 *     ready === !!stewardConfirmedAt
 *
 * Observed thresholds and the projected timeline are *advisory only*. They
 * inform the steward ("the land looks recovered", "earliest expected date is
 * ~2031") but they never open or hold the gate themselves. Recovery is a
 * judgement the steward makes on the ground, not something the system infers
 * — this mirrors the Needs & Yields status gate pattern (recorded escape
 * hatch, no silent automation) and the covenant framing of reviving troubled
 * land (iḥyāʾ al-mawāt) under stewardship.
 *
 * Pure module: no React, no store imports, plain inputs only. Mirrors
 * relationships/statusGate.ts.
 *
 * Silvopasture canopy is advisory-only by covenant: when a canopy config is
 * supplied the result carries a `canopyAdvisory` (current vs. target crown
 * diameter); it is computed strictly outside the decisive path and never
 * touches `ready`, `met`, `unmet`, or `thresholdsObservedMet`. The caller
 * passes the *already-computed* canopy age so this module stays pure and
 * deterministic (no Date.now()).
 */

import { canopyAtAge } from '../succession/growthCurves.js';

export interface RegenReadinessThresholds {
  /** Target ground cover (categorical — matched by exact equality). */
  groundCover: string;
  /** Minimum successional stage on the ordinal scale below. */
  minSuccessionStage: string;
}

export interface RegenReadinessObserved {
  groundCover: string | null;
  successionStage: string | null;
}

export interface RegenReadinessInput {
  thresholds: RegenReadinessThresholds;
  observed: RegenReadinessObserved;
  /**
   * Critical-path years to productive use from the plan's pathway
   * (e.g. buildRegenerationPathway().timelineToProductiveYears). Plain
   * number — the shared package does not import the apps/web pathway data.
   */
  pathwayDurationYears: number;
  /** ISO timestamp the pathway was started; anchors the projection. */
  startedAt: string | null;
  /** ISO timestamp the steward confirmed observed readiness. The gate. */
  stewardConfirmedAt: string | null;
  /**
   * Optional silvopasture canopy state. Advisory-only: present iff the plan
   * targets silvopasture with a canopy config. `canopyAgeYears` is computed
   * by the caller (startedAt + plantingYearOffset vs. today) so this module
   * stays pure.
   */
  silvopastureCanopy?: {
    speciesId: string;
    targetCanopyM: number;
    canopyAgeYears: number;
  };
}

export interface RegenReadinessResult {
  /** Decisive: true iff the steward has confirmed. Everything else advises. */
  ready: boolean;
  /** Threshold axes the observed state satisfies. Advisory. */
  met: string[];
  /** Threshold axes the observed state does not satisfy. Advisory. */
  unmet: string[];
  /** True iff every threshold axis is observed-met. Advisory, never gates. */
  thresholdsObservedMet: boolean;
  /**
   * startedAt + pathwayDurationYears, ISO. Guidance for "earliest expected"
   * — never gates. Null until the pathway is started.
   */
  projectedReadyDate: string | null;
  /**
   * Silvopasture canopy progress. Present iff a canopy config was supplied.
   * Advisory-only — by covenant it never enters the decisive path.
   * `percentToTarget` is clamped to [0, 100]; 0 for a non-positive target.
   */
  canopyAdvisory?: {
    currentCanopyM: number;
    targetCanopyM: number;
    percentToTarget: number;
  };
}

/** Ordinal succession scale: disturbed < pioneer < mid < late < climax. */
const SUCCESSION_ORDER: Record<string, number> = {
  disturbed: 0,
  pioneer: 1,
  mid: 2,
  late: 3,
  climax: 4,
};

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function successionMeets(observed: string | null, minimum: string): boolean {
  if (observed == null) return false;
  const o = SUCCESSION_ORDER[observed];
  const m = SUCCESSION_ORDER[minimum];
  if (o == null || m == null) return false;
  return o >= m;
}

export function evaluateRegenerationReadiness(
  input: RegenReadinessInput,
): RegenReadinessResult {
  const {
    thresholds,
    observed,
    pathwayDurationYears,
    startedAt,
    stewardConfirmedAt,
  } = input;

  const met: string[] = [];
  const unmet: string[] = [];

  if (
    observed.groundCover != null &&
    observed.groundCover === thresholds.groundCover
  ) {
    met.push('groundCover');
  } else {
    unmet.push('groundCover');
  }

  if (successionMeets(observed.successionStage, thresholds.minSuccessionStage)) {
    met.push('successionStage');
  } else {
    unmet.push('successionStage');
  }

  const thresholdsObservedMet = unmet.length === 0;

  const projectedReadyDate =
    startedAt == null
      ? null
      : new Date(
          Date.parse(startedAt) + pathwayDurationYears * MS_PER_YEAR,
        ).toISOString();

  // The one rule that gates. Observation and projection only advise.
  const ready = !!stewardConfirmedAt;

  const result: RegenReadinessResult = {
    ready,
    met,
    unmet,
    thresholdsObservedMet,
    projectedReadyDate,
  };

  // Canopy advisory is computed strictly after the decisive rule and is
  // never read back into it — covenant: silvopasture canopy never gates.
  const canopy = input.silvopastureCanopy;
  if (canopy) {
    const currentCanopyM = canopyAtAge(
      canopy.speciesId,
      canopy.canopyAgeYears,
    ).canopyM;
    const percentToTarget =
      canopy.targetCanopyM > 0
        ? Math.max(
            0,
            Math.min(100, (currentCanopyM / canopy.targetCanopyM) * 100),
          )
        : 0;
    result.canopyAdvisory = {
      currentCanopyM,
      targetCanopyM: canopy.targetCanopyM,
      percentToTarget,
    };
  }

  return result;
}
