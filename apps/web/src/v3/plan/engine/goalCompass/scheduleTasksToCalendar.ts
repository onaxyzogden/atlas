/**
 * scheduleTasksToCalendar — maps Goal-Compass-generated PhaseTasks onto
 * concrete calendar dates so the Act calendar can surface them.
 *
 * Strategy:
 *   - Each BuildPhase carries `order` (Y1, Y2…); each PhaseTask carries
 *     `season` (winter/spring/summer/fall).
 *   - Compute the season window in the calendar year `startYear +
 *     (phase.order - 1)`:
 *       spring = Mar 1 – May 31 (≈92d)
 *       summer = Jun 1 – Aug 31 (≈92d)
 *       fall   = Sep 1 – Nov 30 (≈91d)
 *       winter = Dec 1 – Feb 28 (≈90d)
 *   - The synthetic maintenance phase carries a sentinel `order: 99` and is
 *     post-establishment, so it anchors to `startYear + maxDesignOrder`
 *     (the year after the last design phase), not `order - 1`.
 *   - Distribute tasks in the same (phaseId, season) bucket evenly
 *     across the window so the calendar isn't lumpy.
 *   - Each task's end = start + ceil(laborHrs / 8) workdays, min 1.
 *   - Every task receives `roleAccess: ['owner','designer','reviewer',
 *     'viewer']` — forward-compat for role-gated views.
 */

import type { BuildPhase, PhaseTask } from '../../../../store/phaseStore.js';
import type { ProjectRole } from '@ogden/shared';

type Season = NonNullable<PhaseTask['season']>;

const ALL_ROLES: ProjectRole[] = ['owner', 'designer', 'reviewer', 'viewer'];

// The synthetic maintenance phase carries a sentinel `order: 99` so it sorts
// last in the phasing matrix. That ordinal must NOT be treated as a calendar
// year offset (it would throw upkeep ~98 years out). Detect it by its
// deterministic id prefix instead.
function isMaintenancePhaseId(id: string): boolean {
  return id.startsWith('maint-phase-');
}

interface SeasonWindow {
  startMonth: number; // 0-indexed
  startDay: number;
  endMonth: number;
  endDay: number;
}

const SEASON_WINDOWS: Record<Season, SeasonWindow> = {
  spring: { startMonth: 2, startDay: 1, endMonth: 4, endDay: 31 },
  summer: { startMonth: 5, startDay: 1, endMonth: 7, endDay: 31 },
  fall:   { startMonth: 8, startDay: 1, endMonth: 10, endDay: 30 },
  winter: { startMonth: 11, startDay: 1, endMonth: 13, endDay: 28 }, // wraps
};

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function seasonWindowDates(season: Season, year: number): { start: Date; end: Date } {
  const w = SEASON_WINDOWS[season];
  const start = new Date(year, w.startMonth, w.startDay);
  // Winter spans into next year; endMonth=13 means Feb of next year.
  const endYear = year + (w.endMonth > 11 ? 1 : 0);
  const endMonth = w.endMonth > 11 ? w.endMonth - 12 : w.endMonth;
  const end = new Date(endYear, endMonth, w.endDay);
  return { start, end };
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export interface ScheduledTaskOutput {
  phaseId: string;
  task: PhaseTask;
}

export function scheduleTasksToCalendar(
  phases: BuildPhase[],
  tasks: { phaseId: string; task: PhaseTask }[],
  projectStartDate: string | null | undefined,
): ScheduledTaskOutput[] {
  // Anchor year — derived from the steward's start date, or fallback to
  // first day of current month.
  const anchor = projectStartDate
    ? new Date(`${projectStartDate}T00:00:00`)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const startYear = anchor.getFullYear();

  // Establishment span = the largest real (non-maintenance) phase order.
  // Maintenance is post-establishment upkeep, so it anchors to the first
  // full year *after* the last design year.
  const maxDesignOrder = Math.max(
    0,
    ...phases.filter((p) => !isMaintenancePhaseId(p.id)).map((p) => p.order),
  );

  // Bucket tasks by (phaseId, season) for even distribution. Keying by
  // phase identity (not the shared `order` ordinal) keeps the intended
  // same-year placement — year is still derived from `order` below — while
  // stopping unrelated phases that share an ordinal from interleaving their
  // task distributions, and removing the zero-task placeholder collision.
  const phaseById = new Map(phases.map((p) => [p.id, p]));
  const buckets = new Map<string, { phaseId: string; task: PhaseTask }[]>();
  for (const entry of tasks) {
    const phase = phaseById.get(entry.phaseId);
    if (!phase) continue;
    const key = `${phase.id}|${entry.task.season}`;
    const list = buckets.get(key) ?? [];
    list.push(entry);
    buckets.set(key, list);
  }

  const result: ScheduledTaskOutput[] = [];
  for (const [key, bucket] of buckets) {
    const sep = key.lastIndexOf('|');
    const phaseId = key.slice(0, sep);
    const season = key.slice(sep + 1) as Season;
    const phase = phaseById.get(phaseId)!;
    const year = isMaintenancePhaseId(phaseId)
      ? startYear + maxDesignOrder
      : startYear + (phase.order - 1);
    const { start, end } = seasonWindowDates(season, year);
    const windowLen = Math.max(1, diffDays(start, end));
    const count = bucket.length;
    for (let i = 0; i < count; i++) {
      const offset = Math.floor((i * windowLen) / Math.max(count, 1));
      const taskStart = addDays(start, offset);
      const entry = bucket[i]!;
      const workdays = Math.max(1, Math.ceil(entry.task.laborHrs / 8));
      const taskEnd = addDays(taskStart, workdays - 1);
      result.push({
        phaseId: entry.phaseId,
        task: {
          ...entry.task,
          scheduledStart: isoDate(taskStart),
          scheduledEnd: isoDate(taskEnd),
          roleAccess: [...ALL_ROLES],
        },
      });
    }
  }

  // Preserve any unbucketed tasks (defensive — shouldn't happen).
  const scheduledIds = new Set(result.map((r) => r.task.id));
  for (const entry of tasks) {
    if (scheduledIds.has(entry.task.id)) continue;
    result.push({
      phaseId: entry.phaseId,
      task: { ...entry.task, roleAccess: [...ALL_ROLES] },
    });
  }
  return result;
}
