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
    for (let cycle = 0; cycle < Math.max(1, cycles); cycle++) {
      for (const c of live) {
        const pad = byId.get(c.paddockId)!;
        const moveInDateISO = cursor;
        const moveOutDateISO = addDaysISO(cursor, c.targetGrazeDays);
        out.push({
          cellGroup,
          paddockId: c.paddockId,
          paddockName: pad.name,
          sequenceOrder: c.sequenceOrder,
          moveInDateISO,
          moveOutDateISO,
          grazeDays: c.targetGrazeDays,
          restDaysUntilNextGraze: totalGraze - c.targetGrazeDays,
        });
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
      const plannedRestDays = totalGraze - c.targetGrazeDays;
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
): RotationSequenceProjection {
  return {
    calendar: computeMoveCalendar(paddocks, plan, startDateISO),
    restCompliance: computeRestCompliance(paddocks, plan),
    restCompliancePct: computeRestCompliancePct(paddocks, plan),
  };
}
