/**
 * useEventAggregator — collapses dated entries into a single map keyed by
 * `YYYY-MM-DD` for the EventCalendarCard / WeatherStrip / broadened
 * UpcomingEvents panel.
 *
 * D0 spine cut-over: the four *planned* categories (field tasks, scheduled
 * livestock moves, nursery batches, Goal-Compass phase tasks) now read the
 * canonical `workItemStore` instead of their five legacy stores. The
 * append-only *event-logs* stay their own stores (a logged move / harvest /
 * transfer is a record that something happened, not planned work). Output
 * is byte-identical to the pre-cut-over aggregator — same ids, titles,
 * meta, source split, and the recurring-maintenance forward projection.
 *
 * Sources (priority order — what shows first when a day has multiple
 * entries):
 *   1. community  — communityEventStore (event log)
 *   2. task       — workItemStore `source:'field-task'`
 *   3. livestock  — livestockMoveLogStore (logged moves, event log) +
 *                   workItemStore `source:'scheduled-livestock-move'`
 *                   (unfulfilled forward plans → "Planned:" prefix)
 *   4. harvest    — harvestLogStore (event log)
 *   5. nursery    — workItemStore `source:'nursery-batch'` (sow + ready
 *                   emit separate entries) + nurseryStore transfers
 *                   (executed-transfer event log)
 *   6/7. phaseTask / plantingCalendar — workItemStore phase rows
 *                   (`phaseId != null`); phaseStore is read only to resolve
 *                   the phase name shown in `meta`.
 *
 * Phase milestones are intentionally excluded — `BuildPhase` carries
 * `timeframe` strings ("Year 0-1") not specific calendar dates, so they
 * can't be placed on a month grid without fabrication.
 */

import { useMemo } from 'react';
import { useCommunityEventStore } from '../../store/communityEventStore.js';
import { useLivestockMoveLogStore } from '../../store/livestockMoveLogStore.js';
import { useHarvestLogStore } from '../../store/harvestLogStore.js';
import { useNurseryStore } from '../../store/nurseryStore.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useWorkItemStore } from '../../store/workItemStore.js';
import type { WorkItemRecurrence } from '@ogden/shared';

export type CalendarSource =
  | 'community'
  | 'task'
  | 'livestock'
  | 'harvest'
  | 'nursery'
  | 'phaseTask'
  | 'plantingCalendar';

export const CALENDAR_SOURCES: readonly CalendarSource[] = [
  'community',
  'task',
  'livestock',
  'harvest',
  'nursery',
  'phaseTask',
  'plantingCalendar',
] as const;

export const CALENDAR_SOURCE_LABEL: Record<CalendarSource, string> = {
  community: 'Community',
  task: 'Tasks',
  livestock: 'Livestock',
  harvest: 'Harvest',
  nursery: 'Nursery',
  phaseTask: 'Plan tasks',
  plantingCalendar: 'Planting calendar',
};

export interface CalendarEntry {
  id: string;
  source: CalendarSource;
  /** YYYY-MM-DD — local-day bucket. */
  dateKey: string;
  /** Original ISO datetime when one exists; otherwise the dateKey. Use
   *  for in-day sorting. */
  iso: string;
  title: string;
  meta?: string;
}

/**
 * Coerce an ISO date or datetime string to its `YYYY-MM-DD` bucket.
 * Returns null if the value can't be parsed.
 */
function toDateKey(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 10) return null;
  // Fast path — already a YYYY-MM-DD prefix.
  const prefix = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(prefix)) return prefix;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export interface UseEventAggregatorResult {
  /** All entries sorted by iso ascending (chronological). */
  all: CalendarEntry[];
  /** Map keyed by `YYYY-MM-DD` with the entries on that day, source-ordered. */
  byDate: Map<string, CalendarEntry[]>;
}

// Recurring maintenance tasks persist as ONE canonical PhaseTask; the
// calendar expands that single row into virtual occurrences so the steward
// sees the cadence without bloating the store. The projection is bounded:
// a fixed forward horizon plus a hard occurrence cap so a monthly task can
// never run away.
const MAINTENANCE_VIEW_HORIZON_YEARS = 5;
const MAINTENANCE_MAX_OCCURRENCES = 240;
// Phase tasks only ever carry the five Goal-Compass maintenance
// frequencies; `daily`/`weekly` (legal on the spine recurrence union, used
// by maintenance-source rows which never enter the phase loop) map to
// undefined → treated as non-recurring, exactly as the legacy
// `Record<MaintenanceFrequency, number>` lookup behaved.
const RECURRENCE_STEP_MONTHS: Partial<Record<WorkItemRecurrence, number>> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
  biennial: 24,
  'every-3-years': 36,
};

const SOURCE_ORDER: Record<CalendarSource, number> = {
  community: 0,
  task: 1,
  livestock: 2,
  harvest: 3,
  nursery: 4,
  phaseTask: 5,
  plantingCalendar: 6,
};

export function useEventAggregator(projectId: string): UseEventAggregatorResult {
  const communityEvents = useCommunityEventStore((s) => s.events);
  const livestockMoves = useLivestockMoveLogStore((s) => s.events);
  const harvests = useHarvestLogStore((s) => s.entries);
  const stockTransfers = useNurseryStore((s) => s.transfers);
  const phases = usePhaseStore((s) => s.phases);
  const workItems = useWorkItemStore((s) => s.items);

  return useMemo(() => {
    const all: CalendarEntry[] = [];

    for (const e of communityEvents) {
      if (e.projectId !== projectId) continue;
      const key = toDateKey(e.date);
      if (!key) continue;
      all.push({
        id: `community:${e.id}`,
        source: 'community',
        dateKey: key,
        iso: e.date,
        title: e.title,
        meta: e.type.replace('_', ' '),
      });
    }

    const projectWorkItems = workItems.filter((w) => w.projectId === projectId);

    for (const w of projectWorkItems) {
      if (w.source !== 'field-task') continue;
      const due = w.scheduledEnd ?? null;
      const key = toDateKey(due);
      if (!key || !due) continue;
      all.push({
        id: `task:${w.id}`,
        source: 'task',
        dateKey: key,
        iso: due,
        title: w.title,
        meta: `${w.category} · ${w.status}`,
      });
    }

    for (const m of livestockMoves) {
      if (m.projectId !== projectId) continue;
      const key = toDateKey(m.date);
      if (!key) continue;
      const head = m.headCount != null ? `${m.headCount} head` : 'move';
      all.push({
        id: `livestock:${m.id}`,
        source: 'livestock',
        dateKey: key,
        iso: m.date,
        title: `${head} · ${m.species}`,
        meta: m.direction.replace('_', ' '),
      });
    }

    for (const w of projectWorkItems) {
      if (w.source !== 'scheduled-livestock-move') continue;
      // A fulfilled plan migrated with status:'done' (the legacy
      // `fulfilledByEventId` skip) — unfulfilled plans stay 'todo'.
      if (w.status === 'done') continue;
      const planned = w.scheduledEnd ?? null;
      const key = toDateKey(planned);
      if (!key || !planned) continue;
      const head = w.headCount != null ? `${w.headCount} head` : 'move';
      all.push({
        id: `scheduled-livestock:${w.id}`,
        source: 'livestock',
        dateKey: key,
        iso: planned,
        title: `Planned: ${head} · ${w.species}`,
        meta: `planned · ${(w.direction ?? '').replace('_', ' ')}`,
      });
    }

    for (const h of harvests) {
      if (h.projectId !== projectId) continue;
      const key = toDateKey(h.date);
      if (!key) continue;
      all.push({
        id: `harvest:${h.id}`,
        source: 'harvest',
        dateKey: key,
        iso: h.date,
        title: `${h.quantity} ${h.unit}`,
        meta: h.sourceKind === 'crop' ? 'crop yield' : 'livestock yield',
      });
    }

    for (const w of projectWorkItems) {
      if (w.source !== 'nursery-batch') continue;
      const batchSource: CalendarSource = w.generatedFromPlantingCalendar
        ? 'plantingCalendar'
        : 'nursery';
      const sowDate = w.scheduledStart ?? null;
      const sowKey = toDateKey(sowDate);
      if (sowKey && sowDate) {
        all.push({
          id: `nursery-sow:${w.id}`,
          source: batchSource,
          dateKey: sowKey,
          iso: sowDate,
          title: `Sow ${w.species}`,
          meta: `${w.quantity} · ${w.propagationMethod}`,
        });
      }
      const readyDate = w.scheduledEnd ?? null;
      const readyKey = toDateKey(readyDate);
      if (readyKey && readyDate && readyKey !== sowKey) {
        all.push({
          id: `nursery-ready:${w.id}`,
          source: batchSource,
          dateKey: readyKey,
          iso: readyDate,
          title: `Ready: ${w.species}`,
          meta: `${w.quantity} · ${w.growthStage}`,
        });
      }
    }

    // Phase rows now live on the spine (phaseId != null uniquely
    // identifies a phaseStore-originated WorkItem — field-task /
    // maintenance / scheduled-move / nursery rows all carry phaseId:null).
    // phaseStore is read solely to resolve the phase *name* shown in meta,
    // and to keep the legacy `phase.projectId` gate exact.
    const phaseById = new Map(phases.map((p) => [p.id, p]));

    for (const w of projectWorkItems) {
      if (w.phaseId == null) continue;
      const phase = phaseById.get(w.phaseId);
      if (!phase || phase.projectId !== projectId) continue;
      if (!w.scheduledStart) continue;
      const firstKey = toDateKey(w.scheduledStart);
      if (!firstKey) continue;
      const laborMeta = w.laborHrs ? `${w.laborHrs}h` : '';
      const roleMeta = w.roleAccess && w.roleAccess.length > 0
        ? w.roleAccess.join('/')
        : '';
      const src: CalendarSource = w.generatedFromPlantingCalendar
        ? 'plantingCalendar'
        : 'phaseTask';

      const recurStep =
        w.isRecurring && w.recurrenceFrequency
          ? RECURRENCE_STEP_MONTHS[w.recurrenceFrequency] ?? null
          : null;

      if (recurStep == null) {
        const meta = [phase.name, laborMeta, roleMeta]
          .filter(Boolean)
          .join(' · ');
        all.push({
          id: `phase-task:${w.id}`,
          source: src,
          dateKey: firstKey,
          iso: `${firstKey}T09:00:00`,
          title: w.title,
          meta,
        });
        continue;
      }

      // Recurring maintenance: project bounded virtual occurrences from
      // the first scheduled date forward by the cadence.
      const meta = [phase.name, laborMeta, roleMeta, `recurring ${w.recurrenceFrequency}`]
        .filter(Boolean)
        .join(' · ');
      const [y0, m0, d0] = firstKey.split('-').map(Number) as [number, number, number];
      const horizonEnd = new Date(y0 + MAINTENANCE_VIEW_HORIZON_YEARS, m0 - 1, d0);
      let occ = new Date(y0, m0 - 1, d0);
      for (
        let n = 0;
        n < MAINTENANCE_MAX_OCCURRENCES && occ.getTime() <= horizonEnd.getTime();
        n++
      ) {
        const dk = `${occ.getFullYear()}-${String(occ.getMonth() + 1).padStart(2, '0')}-${String(occ.getDate()).padStart(2, '0')}`;
        all.push({
          id: `phase-task:${w.id}@${dk}`,
          source: src,
          dateKey: dk,
          iso: `${dk}T09:00:00`,
          title: w.title,
          meta,
        });
        occ = new Date(y0, m0 - 1 + recurStep * (n + 1), d0);
      }
    }

    for (const tr of stockTransfers) {
      if (tr.projectId !== projectId) continue;
      const key = toDateKey(tr.transferDate);
      if (!key) continue;
      all.push({
        id: `nursery-transfer:${tr.id}`,
        source: 'nursery',
        dateKey: key,
        iso: tr.transferDate,
        title: `Transfer ${tr.quantity}`,
        meta: 'stock transfer',
      });
    }

    all.sort((a, b) => {
      if (a.iso !== b.iso) return a.iso < b.iso ? -1 : 1;
      return SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source];
    });

    const byDate = new Map<string, CalendarEntry[]>();
    for (const entry of all) {
      const list = byDate.get(entry.dateKey);
      if (list) list.push(entry);
      else byDate.set(entry.dateKey, [entry]);
    }

    return { all, byDate };
  }, [
    projectId,
    communityEvents,
    livestockMoves,
    harvests,
    stockTransfers,
    phases,
    workItems,
  ]);
}
