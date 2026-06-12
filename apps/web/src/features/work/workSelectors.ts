/**
 * workSelectors — pure display derivations over spine WorkItems for the Act
 * work surface (ActWorkPanel / WorkAgendaList / ActWorkSummaryCard).
 *
 * Pure functions only (todayISO injected) — call them inside `useMemo` over a
 * raw `useWorkItemStore((s) => s.items)` subscription, NEVER inside a Zustand
 * selector (wiki/decisions/2026-04-26-zustand-selector-stability.md).
 */

import type { WorkItem } from '@ogden/shared';

/**
 * The spine sources the livestock work surface aggregates. Confirmed plan
 * work, rotation moves (owned by rotationSequenceSpineSync — read-only
 * here), and legacy scheduled moves. Deliberately NOT all sources: field
 * tasks / nursery / phase work keep their own surfaces.
 */
export const LIVESTOCK_WORK_SOURCES: readonly string[] = [
  'livestock-plan',
  'rotation-sequence',
  'scheduled-livestock-move',
];

export function isLivestockWork(item: WorkItem): boolean {
  return LIVESTOCK_WORK_SOURCES.includes(item.source);
}

/**
 * Display status collapses the spine lifecycle + the schedule into the pill
 * the agenda shows. 'proposed' is NOT here — proposals live in
 * livestockWorkPlanStore, not on the spine (WorkReviewSection reads them).
 */
export type WorkDisplayStatus =
  | 'done'
  | 'cancelled'
  | 'in-progress'
  | 'blocked'
  | 'overdue'
  | 'due-today'
  | 'upcoming';

/** Due anchor: the end of the scheduled window, falling back to its start. */
export function workDueDate(item: WorkItem): string | null {
  return item.scheduledEnd ?? item.scheduledStart ?? null;
}

export function workDisplayStatus(
  item: WorkItem,
  todayISO: string,
): WorkDisplayStatus {
  if (item.status === 'done') return 'done';
  if (item.status === 'cancelled') return 'cancelled';
  if (item.status === 'in-progress') return 'in-progress';
  if (item.status === 'blocked') return 'blocked';
  const due = workDueDate(item);
  if (due && due < todayISO) return 'overdue';
  // "Due today" opens at the window START so seasonal/window work surfaces
  // as actionable from its first day, not only on its last.
  const start = item.scheduledStart ?? due;
  if (start && start <= todayISO) return 'due-today';
  return 'upcoming';
}

/** Whole-day difference between two YYYY-MM-DD dates (b - a). */
function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(`${aISO.slice(0, 10)}T00:00:00Z`).getTime();
  const b = new Date(`${bISO.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Schedule variance in days for a completed item: completion date minus the
 * due anchor (positive = late, negative = early, 0 = on time). Completion
 * date = `actualEnd` when captured, else the `doneAt` stamp's date. Returns
 * null for items that are not done or carry no due date.
 */
export function varianceDays(item: WorkItem): number | null {
  if (item.status !== 'done') return null;
  const due = workDueDate(item);
  if (!due) return null;
  const completed = item.actualEnd ?? item.doneAt ?? null;
  if (!completed) return null;
  return daysBetween(due, completed);
}

/** "✓ on time" / "✓ +2d late" / "✓ 3d early" — agenda variance caption. */
export function varianceLabel(item: WorkItem): string | null {
  const v = varianceDays(item);
  if (v === null) return null;
  if (v === 0) return '✓ on time';
  return v > 0 ? `✓ +${v}d late` : `✓ ${-v}d early`;
}

/** Live (not done/cancelled) work — what the agenda and counts consider. */
export function isLiveWork(item: WorkItem): boolean {
  return item.status !== 'done' && item.status !== 'cancelled';
}

/**
 * Group dated items by due day, ascending. Undated items are excluded —
 * an agenda can only place dated work (mirrors useEventAggregator's stance).
 */
export function groupByDueDate(
  items: readonly WorkItem[],
): Array<{ dateKey: string; items: WorkItem[] }> {
  const byDate = new Map<string, WorkItem[]>();
  for (const item of items) {
    const due = workDueDate(item);
    if (!due) continue;
    const key = due.slice(0, 10);
    const list = byDate.get(key);
    if (list) list.push(item);
    else byDate.set(key, [item]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([dateKey, list]) => ({ dateKey, items: list }));
}

/** YYYY-MM-DD addition without timezone drift. */
export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
