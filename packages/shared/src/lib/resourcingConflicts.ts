/**
 * resourcingConflicts — the pure resourcing-conflict engine (Sub-project D2).
 *
 * No React, no store, no I/O. Input is a project-scoped `WorkItem[]` +
 * `CrewMember[]`; output is a single computed result object. It owns two
 * derived, render-only conflict surfaces:
 *
 *  1. equipment double-booking — two items whose effective equipment share an
 *     id AND whose scheduled spans overlap;
 *  2. assignee over-capacity — a crew member whose summed assigned `laborHrs`
 *     in any ISO week exceeds their soft `weeklyHoursCap`.
 *
 * Hours/quantities only — NEVER cost (cost is D3). Conflicts are derived only
 * and are NEVER written back into `WorkItem.status` (single-writer-spine
 * discipline, consistent with D0.1 / D1). Defensive: items missing the data a
 * check needs are skipped rather than throwing.
 */

import type { WorkItem, MaterialLine } from '../schemas/workItem.schema.js';
import type { CrewMember } from '../schemas/crewMember.schema.js';

/** Effective equipment ids: `equipmentRequired ∪ equipmentRequiredAuto`. */
export function effectiveEquipment(item: WorkItem): string[] {
  const manual = item.equipmentRequired ?? [];
  const auto = item.equipmentRequiredAuto ?? [];
  if (auto.length === 0) return [...new Set(manual)];
  return [...new Set([...manual, ...auto])];
}

export interface BomLine {
  label: string;
  unit: string;
  /** Summed `quantityPerAcre` across contributing items (undefined if none). */
  quantityPerAcre?: number;
  /** True if any contributing line came from `materialsAuto` (Goal Compass). */
  fromAuto: boolean;
  /** True if any contributing line came from manual `materials`. */
  fromManual: boolean;
}

/**
 * Effective bill of materials across the project: manual `materials` merged
 * with `materialsAuto`, keyed by `label + unit`. Quantities summed; provenance
 * surfaced read-only. No cost column — quantities only.
 */
export function rollUpBom(items: WorkItem[]): BomLine[] {
  const byKey = new Map<string, BomLine>();
  const add = (m: MaterialLine, auto: boolean) => {
    const key = `${m.label}__${m.unit}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, {
        label: m.label,
        unit: m.unit,
        quantityPerAcre: m.quantityPerAcre,
        fromAuto: auto,
        fromManual: !auto,
      });
      return;
    }
    if (typeof m.quantityPerAcre === 'number') {
      prev.quantityPerAcre = (prev.quantityPerAcre ?? 0) + m.quantityPerAcre;
    }
    prev.fromAuto = prev.fromAuto || auto;
    prev.fromManual = prev.fromManual || !auto;
  };
  for (const it of items) {
    for (const m of it.materials ?? []) add(m, false);
    for (const m of it.materialsAuto ?? []) add(m, true);
  }
  return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export interface EquipmentConflict {
  equipmentId: string;
  itemIdA: string;
  itemIdB: string;
  /** ISO timestamps of the overlapping window. */
  overlapStart: string;
  overlapEnd: string;
}

interface Span {
  id: string;
  start: number;
  end: number;
}

/**
 * Equipment double-booking: for each equipment id, any pair of items that
 * both claim it and whose `[scheduledStart, scheduledEnd]` spans overlap.
 * Items lacking either scheduled date make no booking claim and are skipped.
 */
export function equipmentConflicts(items: WorkItem[]): EquipmentConflict[] {
  const spansByEquip = new Map<string, Span[]>();
  for (const it of items) {
    const s = it.scheduledStart ? Date.parse(it.scheduledStart) : NaN;
    const e = it.scheduledEnd ? Date.parse(it.scheduledEnd) : NaN;
    if (Number.isNaN(s) || Number.isNaN(e)) continue;
    for (const eq of effectiveEquipment(it)) {
      const bucket = spansByEquip.get(eq);
      const span: Span = { id: it.id, start: s, end: e };
      if (bucket) bucket.push(span);
      else spansByEquip.set(eq, [span]);
    }
  }
  const out: EquipmentConflict[] = [];
  for (const [equipmentId, spans] of spansByEquip) {
    for (let i = 0; i < spans.length; i++) {
      for (let j = i + 1; j < spans.length; j++) {
        const a = spans[i]!;
        const b = spans[j]!;
        const start = Math.max(a.start, b.start);
        const end = Math.min(a.end, b.end);
        if (start < end) {
          out.push({
            equipmentId,
            itemIdA: a.id,
            itemIdB: b.id,
            overlapStart: new Date(start).toISOString(),
            overlapEnd: new Date(end).toISOString(),
          });
        }
      }
    }
  }
  return out;
}

/** ISO-8601 week key `YYYY-Www` for a timestamp. */
export function isoWeekKey(ms: number): string {
  const d = new Date(ms);
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export interface WorkloadConflict {
  memberId: string;
  week: string;
  hours: number;
  cap: number;
}

/**
 * Assignee over-capacity: bucket each assigned item's `laborHrs` into the ISO
 * week of its `scheduledStart` (fallback `scheduledEnd`); per crew member, any
 * week whose summed hours exceeds their soft `weeklyHoursCap` is a conflict.
 * Items with no `assigneeId` / `laborHrs` / schedulable date are ignored.
 * Hours only — never cost.
 */
export function assigneeWeeklyLoad(
  items: WorkItem[],
  crew: CrewMember[],
): WorkloadConflict[] {
  const capById = new Map(crew.map((m) => [m.id, m.weeklyHoursCap]));
  const hoursByMemberWeek = new Map<string, number>();
  for (const it of items) {
    if (!it.assigneeId) continue;
    if (typeof it.laborHrs !== 'number' || it.laborHrs <= 0) continue;
    const dateStr = it.scheduledStart ?? it.scheduledEnd;
    if (!dateStr) continue;
    const ms = Date.parse(dateStr);
    if (Number.isNaN(ms)) continue;
    const key = `${it.assigneeId}__${isoWeekKey(ms)}`;
    hoursByMemberWeek.set(key, (hoursByMemberWeek.get(key) ?? 0) + it.laborHrs);
  }
  const out: WorkloadConflict[] = [];
  for (const [key, hours] of hoursByMemberWeek) {
    const sep = key.lastIndexOf('__');
    const memberId = key.slice(0, sep);
    const week = key.slice(sep + 2);
    const cap = capById.get(memberId);
    if (typeof cap === 'number' && hours > cap) {
      out.push({ memberId, week, hours, cap });
    }
  }
  return out;
}

export interface ResourcingConflictResult {
  equipment: EquipmentConflict[];
  workload: WorkloadConflict[];
  /** Per-item flags for render-time badging. */
  byItemId: Map<string, { equipmentConflict: boolean; overCapacity: boolean }>;
}

/** Full analysis: equipment double-booking + assignee over-capacity. */
export function analyzeResourcing(
  items: WorkItem[],
  crew: CrewMember[],
): ResourcingConflictResult {
  const equipment = equipmentConflicts(items);
  const workload = assigneeWeeklyLoad(items, crew);
  const byItemId = new Map<
    string,
    { equipmentConflict: boolean; overCapacity: boolean }
  >();
  const ensure = (id: string) => {
    let v = byItemId.get(id);
    if (!v) {
      v = { equipmentConflict: false, overCapacity: false };
      byItemId.set(id, v);
    }
    return v;
  };
  for (const c of equipment) {
    ensure(c.itemIdA).equipmentConflict = true;
    ensure(c.itemIdB).equipmentConflict = true;
  }
  const overloadedMembers = new Set(workload.map((w) => w.memberId));
  for (const it of items) {
    if (it.assigneeId && overloadedMembers.has(it.assigneeId)) {
      ensure(it.id).overCapacity = true;
    }
  }
  return { equipment, workload, byItemId };
}
