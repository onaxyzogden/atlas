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
 *   - Distribute tasks in the same (phaseOrder, season) bucket evenly
 *     across the window so the calendar isn't lumpy.
 *   - Each task's end = start + ceil(laborHrs / 8) workdays, min 1.
 *   - Every task receives `roleAccess: ['owner','designer','reviewer',
 *     'viewer']` — forward-compat for role-gated views.
 */

import type { BuildPhase, PhaseTask } from '../../../../store/phaseStore.js';
import type { ProjectRole } from '@ogden/shared';

type Season = NonNullable<PhaseTask['season']>;

const ALL_ROLES: ProjectRole[] = ['owner', 'designer', 'reviewer', 'viewer'];

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

  // Bucket tasks by (phaseOrder, season) for even distribution.
  const phaseById = new Map(phases.map((p) => [p.id, p]));
  const buckets = new Map<string, { phaseId: string; task: PhaseTask }[]>();
  for (const entry of tasks) {
    const phase = phaseById.get(entry.phaseId);
    if (!phase) continue;
    const key = `${phase.order}|${entry.task.season}`;
    const list = buckets.get(key) ?? [];
    list.push(entry);
    buckets.set(key, list);
  }

  const result: ScheduledTaskOutput[] = [];
  for (const [key, bucket] of buckets) {
    const [orderStr, season] = key.split('|') as [string, Season];
    const order = Number(orderStr);
    const year = startYear + (order - 1);
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
