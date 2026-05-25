/**
 * rotationSequenceMath — pure forward-dated move calendar + rest-compliance.
 *
 * B3 of Sub-project B (rotational-grazing sequencer). This module owns no
 * state and reuses the recovery rule established in `livestockAnalysis`'s
 * `computeRecoveryStatus` (max recovery across assigned species, 30 default)
 * so the two never diverge. The net-new logic here is purely:
 *   - a forward-dated paddock move calendar (per-cell-group date cursor), and
 *   - a planned-rest vs required-rest compliance roll-up.
 *
 * The RotationPlan/RotationCell types are OWNED HERE; Task 2's
 * `rotationPlanStore.ts` imports them type-only from this module.
 */

import type { Paddock } from '../../store/livestockStore.js';
import { LIVESTOCK_SPECIES } from './speciesData.js';
import { seasonalRestMultiplier } from './forageSeasonMath.js';

/** Optional seasonal context that lengthens rest during the summer slump. */
export interface SeasonOpts {
  isSouthern?: boolean;
}

/* ================================================================== */
/*  Owned plan types                                                   */
/* ================================================================== */

export interface RotationCell {
  paddockId: string;
  cellGroup: string; // Paddock.grazingCellGroup ?? 'ungrouped'
  sequenceOrder: number; // 0-based, within the cell group
  targetGrazeDays: number;
  targetRestDays: number;
  note?: string;
}

export interface RotationPlan {
  projectId: string;
  cells: RotationCell[];
  /** Optional season/plan anchor; absent ⇒ today (B3.1, back-compatible). */
  startDateISO?: string;
  /** Optional projection horizon, 1..6; absent ⇒ 1 (B3.1). */
  horizonCycles?: number;
}

/* ================================================================== */
/*  Projection result types                                            */
/* ================================================================== */

export interface MoveCalendarEntry {
  cellGroup: string;
  paddockId: string;
  paddockName: string;
  sequenceOrder: number;
  moveInDateISO: string; // yyyy-mm-dd
  moveOutDateISO: string; // moveIn + targetGrazeDays
  grazeDays: number;
  restDaysUntilNextGraze: number;
  /**
   * Rest until next graze after applying the seasonal multiplier for the
   * month this graze ends (regrowth slows in the summer slump). Equals
   * `restDaysUntilNextGraze` when no `seasonOpts` is passed.
   */
  seasonAdjustedRestDays: number;
}

export interface RestComplianceRow {
  paddockId: string;
  paddockName: string;
  requiredRestDays: number;
  plannedRestDays: number;
  compliant: boolean;
}

export interface RotationSequenceProjection {
  calendar: MoveCalendarEntry[];
  restCompliance: RestComplianceRow[];
  restCompliancePct: number; // 0-100
}

/* ================================================================== */
/*  Date helpers (UTC, yyyy-mm-dd)                                     */
/* ================================================================== */

/** Add `days` to a yyyy-mm-dd string using UTC math; returns yyyy-mm-dd. */
function addDaysISO(iso: string, days: number): string {
  const ms = Date.parse(`${iso}T00:00:00.000Z`);
  const next = new Date(ms + days * 86_400_000);
  return next.toISOString().slice(0, 10);
}

/** Whole-day UTC difference `b - a` for two yyyy-mm-dd strings. */
function daysBetweenISO(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b}T00:00:00.000Z`) - Date.parse(`${a}T00:00:00.000Z`)) /
      86_400_000,
  );
}

/** 0-based UTC calendar month (Jan=0 … Dec=11) of a yyyy-mm-dd string. */
function monthOfISO(iso: string): number {
  return new Date(Date.parse(`${iso}T00:00:00.000Z`)).getUTCMonth();
}

/* ================================================================== */
/*  Honored rest (B3.1 — the dead-field fix)                          */
/* ================================================================== */

/**
 * Rest honored before a cell's NEXT graze: the natural cycle gap (Σ the
 * OTHER same-group cells' graze days) raised to the steward's explicit
 * `targetRestDays` floor. B3 stored/edited `targetRestDays` but never read
 * it — this is the single point that makes the editable input load-bearing.
 */
function honoredRestDays(cell: RotationCell, siblingGrazeSum: number): number {
  return Math.max(siblingGrazeSum, cell.targetRestDays);
}

/* ================================================================== */
/*  Required rest (identical rule to computeRecoveryStatus)            */
/* ================================================================== */

/**
 * Required rest = max recovery across assigned species, or 30 when no
 * species. Kept byte-for-byte identical to `computeRecoveryStatus`'s
 * `requiredDays` so rotation-sequence compliance never diverges from the
 * recovery dashboard.
 */
export function requiredRestDays(paddock: Paddock): number {
  return paddock.species.length > 0
    ? Math.max(
        ...paddock.species.map((sp) => LIVESTOCK_SPECIES[sp]?.recoveryDays ?? 30),
      )
    : 30;
}

/* ================================================================== */
/*  Grouping                                                           */
/* ================================================================== */

/** Cells of a plan bucketed by cellGroup, each list sorted by sequenceOrder. */
function groupedCells(plan: RotationPlan): Map<string, RotationCell[]> {
  const groups = new Map<string, RotationCell[]>();
  for (const c of plan.cells) {
    const list = groups.get(c.cellGroup) ?? [];
    list.push(c);
    groups.set(c.cellGroup, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  }
  return groups;
}

/* ================================================================== */
/*  Move calendar                                                      */
/* ================================================================== */

export function computeMoveCalendar(
  paddocks: Paddock[],
  plan: RotationPlan | null,
  startDateISO: string,
  cycles = 1,
  seasonOpts?: SeasonOpts,
): MoveCalendarEntry[] {
  if (!plan || plan.cells.length === 0) return [];

  const byId = new Map<string, Paddock>();
  for (const p of paddocks) byId.set(p.id, p);

  const groups = groupedCells(plan);
  const out: MoveCalendarEntry[] = [];

  for (const [cellGroup, cells] of groups) {
    // Only cells whose paddock exists participate.
    const live = cells.filter((c) => byId.has(c.paddockId));
    if (live.length === 0) continue;

    // One-cycle rest = Σ the OTHER cells' grazeDays in this group.
    const totalGraze = live.reduce((s, c) => s + c.targetGrazeDays, 0);

    let cursor = startDateISO; // independent per group
    // Per-paddock last moveOut so we can honor an explicit rest floor by
    // inserting an idle gap when sibling-graze alone is too short.
    const lastMoveOut = new Map<string, string>();
    // Per-paddock season-adjusted rest owed since its last graze. Defaults to
    // the unadjusted floor, so with no seasonOpts the gap logic is unchanged.
    const restOwed = new Map<string, number>();
    for (let cycle = 0; cycle < Math.max(1, cycles); cycle++) {
      for (const c of live) {
        const pad = byId.get(c.paddockId)!;
        const honored = honoredRestDays(c, totalGraze - c.targetGrazeDays);
        const prevOut = lastMoveOut.get(c.paddockId);
        if (prevOut) {
          const requiredGap = restOwed.get(c.paddockId) ?? honored;
          const gap = daysBetweenISO(prevOut, cursor);
          if (gap < requiredGap) cursor = addDaysISO(cursor, requiredGap - gap);
        }
        const moveInDateISO = cursor;
        const moveOutDateISO = addDaysISO(cursor, c.targetGrazeDays);
        // Rest begins when this graze ends — key the seasonal multiplier on
        // the move-out month (regrowth slows in the summer slump).
        const multiplier = seasonOpts
          ? seasonalRestMultiplier(monthOfISO(moveOutDateISO), seasonOpts)
          : 1;
        const seasonAdjustedRestDays = Math.round(honored * multiplier);
        out.push({
          cellGroup,
          paddockId: c.paddockId,
          paddockName: pad.name,
          sequenceOrder: c.sequenceOrder,
          moveInDateISO,
          moveOutDateISO,
          grazeDays: c.targetGrazeDays,
          restDaysUntilNextGraze: honored,
          seasonAdjustedRestDays,
        });
        lastMoveOut.set(c.paddockId, moveOutDateISO);
        restOwed.set(c.paddockId, seasonAdjustedRestDays);
        cursor = moveOutDateISO;
      }
    }
  }

  return out;
}

/* ================================================================== */
/*  Rest compliance                                                    */
/* ================================================================== */

export function computeRestCompliance(
  paddocks: Paddock[],
  plan: RotationPlan | null,
): RestComplianceRow[] {
  if (!plan) return [];

  const byId = new Map<string, Paddock>();
  for (const p of paddocks) byId.set(p.id, p);

  const groups = groupedCells(plan);
  const rows: RestComplianceRow[] = [];

  for (const cells of groups.values()) {
    const totalGraze = cells.reduce((s, c) => s + c.targetGrazeDays, 0);
    for (const c of cells) {
      const pad = byId.get(c.paddockId);
      if (!pad) continue; // paddock must exist to be a row
      const plannedRestDays = honoredRestDays(c, totalGraze - c.targetGrazeDays);
      const required = requiredRestDays(pad);
      rows.push({
        paddockId: pad.id,
        paddockName: pad.name,
        requiredRestDays: required,
        plannedRestDays,
        compliant: plannedRestDays >= required,
      });
    }
  }

  return rows;
}

export function computeRestCompliancePct(
  paddocks: Paddock[],
  plan: RotationPlan | null,
): number {
  const rows = computeRestCompliance(paddocks, plan);
  const total = rows.length;
  if (total === 0) return 100;
  const compliant = rows.filter((r) => r.compliant).length;
  return Math.round((100 * compliant) / total);
}

/* ================================================================== */
/*  Combined projection                                                */
/* ================================================================== */

export function projectRotationSequence(
  paddocks: Paddock[],
  plan: RotationPlan | null,
  startDateISO: string,
  cycles = 1,
  seasonOpts?: SeasonOpts,
): RotationSequenceProjection {
  return {
    calendar: computeMoveCalendar(paddocks, plan, startDateISO, cycles, seasonOpts),
    restCompliance: computeRestCompliance(paddocks, plan),
    restCompliancePct: computeRestCompliancePct(paddocks, plan),
  };
}
