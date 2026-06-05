/**
 * rotationEngine — Phase C.7 rotation calendar + parasite-break sequencer.
 *
 * Apricot Lane Validation Protocol Phase C closes the rotation→revenue
 * pipeline. The existing `rotationSequenceMath.ts` + `rotationCapacityMath.ts`
 * own the canonical move calendar + AU-day arithmetic when the steward has
 * authored an explicit `RotationPlan`. This engine answers a *different*
 * question: given only a paddock list + a herd size + two policy knobs
 * (graze days per paddock, parasite-break days), what does the implied
 * one-mob-rotation calendar look like, and does it satisfy the parasite-break
 * floor?
 *
 * Inputs are deliberately minimal so the engine can run before the steward
 * has authored a `RotationPlan` (B3) — the Phase-C protocol needs the
 * calendar to seed the financial stream (`livestockRevenue.ts`) regardless
 * of whether a plan exists.
 *
 * Math notes (no new AU model — wraps `computeRotationCarryingCapacity`):
 *   - cycleDays      = grazeDaysPerPaddock × paddocks.length
 *   - recoveryDays   = cycleDays − grazeDaysPerPaddock (per paddock)
 *   - parasiteBreakWindow = recoveryDays ≥ parasiteBreakDays
 *   - annualAuDays   = herdSize × 365   (full-year mob occupancy)
 *   - utilizationPct = (auDemandDays / auSupplyDays) × 100
 *
 * Reuses `computeRotationCarryingCapacity` by synthesising a `RotationPlan`
 * where every paddock occupies the same cellGroup with `targetGrazeDays =
 * grazeDaysPerPaddock` and the herd is mob-grazed (per-paddock stocking
 * density = herdSize / areaHa). This is a coarse planning heuristic — same
 * honesty posture as `rotationCapacityMath` ("not a forage-budget model").
 */

import type { Paddock } from '../../../store/livestockStore.js';
import type { RotationCell, RotationPlan } from '../rotationSequenceMath.js';
import { computeRotationCarryingCapacity } from '../rotationCapacityMath.js';

/* ================================================================== */
/*  Public types                                                       */
/* ================================================================== */

export interface RotationCalendarEntry {
  paddockId: string;
  paddockName: string;
  sequenceOrder: number;
  /** 0-indexed day-of-cycle when the herd moves in. */
  startDay: number;
  /** Exclusive — herd moves out on this day to the next paddock. */
  endDay: number;
  /** Rest before this paddock next sees the herd (= cycleDays − grazeDaysPerPaddock). */
  recoveryDays: number;
  /** True iff `recoveryDays ≥ parasiteBreakDays`. */
  parasiteBreakWindow: boolean;
}

export interface RotationCalendar {
  entries: RotationCalendarEntry[];
  /** grazeDaysPerPaddock × paddocks.length (one full mob cycle). */
  cycleDays: number;
  /** floor(365 / cycleDays); 0 if cycleDays is 0. */
  cyclesPerYear: number;
  /** herdSize × 365 — annual mob-occupancy in AU-days. */
  annualAuDays: number;
  /** True iff every entry's parasite-break window holds. */
  parasiteBreakCompliant: boolean;
  /** (auDemandDays / auSupplyDays) × 100, from `computeRotationCarryingCapacity`. */
  utilizationPct: number;
  /** Rolled-up status across all groups: 'over' beats 'tight' beats 'ok'. */
  status: 'ok' | 'tight' | 'over';
  /** Knobs echoed for downstream observability. */
  inputs: {
    paddockCount: number;
    herdSize: number;
    parasiteBreakDays: number;
    grazeDaysPerPaddock: number;
  };
}

export interface ComputeRotationCalendarInput {
  paddocks: Paddock[];
  /** Mob size in animal units (AU). */
  herdSize: number;
  /**
   * Annual AU-months reserved for revenue scaling in `livestockRevenue.ts`.
   * Not consumed by the calendar math today (annual AU-days is herdSize × 365);
   * carried on the input so the financial layer has the policy figure in one
   * place without re-passing it around.
   */
  animalUnitMonths?: number;
  /** Days of rest required before a paddock returns to the herd. Default 60. */
  parasiteBreakDays?: number;
  /** Days the mob spends on a single paddock per cycle. Default 3. */
  grazeDaysPerPaddock?: number;
}

/* ================================================================== */
/*  Implementation                                                     */
/* ================================================================== */

const DEFAULT_PARASITE_BREAK_DAYS = 60;
const DEFAULT_GRAZE_DAYS_PER_PADDOCK = 3;
const SYNTHETIC_CELL_GROUP = 'engine';

function rollupStatus(
  rows: ReadonlyArray<{ status: 'ok' | 'tight' | 'over' }>,
): 'ok' | 'tight' | 'over' {
  if (rows.some((r) => r.status === 'over')) return 'over';
  if (rows.some((r) => r.status === 'tight')) return 'tight';
  return 'ok';
}

/**
 * Build a synthetic mob-rotation plan that places every paddock in a single
 * cell group with uniform graze/rest knobs. Used as input to the canonical
 * `computeRotationCarryingCapacity` so the engine never forks the AU math.
 */
function syntheticPlan(
  paddocks: Paddock[],
  grazeDaysPerPaddock: number,
  parasiteBreakDays: number,
): RotationPlan {
  const cells: RotationCell[] = paddocks.map((p, i) => ({
    paddockId: p.id,
    cellGroup: SYNTHETIC_CELL_GROUP,
    sequenceOrder: i,
    targetGrazeDays: grazeDaysPerPaddock,
    targetRestDays: parasiteBreakDays,
  }));
  return { projectId: paddocks[0]?.projectId ?? 'engine', cells };
}

/**
 * Distribute a single-mob herd across each paddock as if it were the only
 * occupant during its graze window. Each paddock's effective stocking density
 * is `herdSize / areaHa` so that `computeRotationCarryingCapacity` returns
 * `auDemandDays = herdSize × grazeDaysPerPaddock` per paddock (for cattle).
 */
function mobGrazedPaddocks(paddocks: Paddock[], herdSize: number): Paddock[] {
  return paddocks.map((p) => {
    const areaHa = p.areaM2 / 10_000;
    const headPerHa = areaHa > 0 ? herdSize / areaHa : 0;
    return { ...p, stockingDensity: headPerHa };
  });
}

export function computeRotationCalendar(
  input: ComputeRotationCalendarInput,
): RotationCalendar {
  const parasiteBreakDays = input.parasiteBreakDays ?? DEFAULT_PARASITE_BREAK_DAYS;
  const grazeDaysPerPaddock = input.grazeDaysPerPaddock ?? DEFAULT_GRAZE_DAYS_PER_PADDOCK;
  const paddocks = input.paddocks;
  const herdSize = Math.max(0, input.herdSize);

  // Degenerate input → empty, but well-formed calendar.
  if (paddocks.length === 0 || grazeDaysPerPaddock <= 0) {
    return {
      entries: [],
      cycleDays: 0,
      cyclesPerYear: 0,
      annualAuDays: herdSize * 365,
      parasiteBreakCompliant: true,
      utilizationPct: 0,
      status: 'ok',
      inputs: {
        paddockCount: paddocks.length,
        herdSize,
        parasiteBreakDays,
        grazeDaysPerPaddock,
      },
    };
  }

  const cycleDays = grazeDaysPerPaddock * paddocks.length;
  const recoveryDays = cycleDays - grazeDaysPerPaddock;
  const parasiteBreakWindow = recoveryDays >= parasiteBreakDays;

  const entries: RotationCalendarEntry[] = paddocks.map((p, i) => ({
    paddockId: p.id,
    paddockName: p.name,
    sequenceOrder: i,
    startDay: i * grazeDaysPerPaddock,
    endDay: i * grazeDaysPerPaddock + grazeDaysPerPaddock,
    recoveryDays,
    parasiteBreakWindow,
  }));

  // Wrap canonical AU math — never fork it.
  const capacityRows = computeRotationCarryingCapacity(
    mobGrazedPaddocks(paddocks, herdSize),
    syntheticPlan(paddocks, grazeDaysPerPaddock, parasiteBreakDays),
  );
  const utilizationPct = capacityRows[0]?.utilizationPct ?? 0;
  const status = rollupStatus(capacityRows);

  return {
    entries,
    cycleDays,
    cyclesPerYear: Math.floor(365 / cycleDays),
    annualAuDays: herdSize * 365,
    parasiteBreakCompliant: entries.every((e) => e.parasiteBreakWindow),
    utilizationPct,
    status,
    inputs: {
      paddockCount: paddocks.length,
      herdSize,
      parasiteBreakDays,
      grazeDaysPerPaddock,
    },
  };
}
