/**
 * useEventAggregator — collapses dated entries from five stores into a
 * single map keyed by `YYYY-MM-DD` for the EventCalendarCard / WeatherStrip /
 * UpcomingEvents-broadened panel.
 *
 * Sources (priority order — what shows first when a day has multiple
 * entries):
 *   1. community  — communityEventStore
 *   2. task       — fieldTaskStore (uses dueAt, ignores status='done' for
 *                   the *upcoming* helper but still surfaces them on the
 *                   calendar grid for retrospective context)
 *   3. livestock  — livestockMoveLogStore
 *   4. harvest    — harvestLogStore
 *   5. nursery    — nurseryStore (sowDate AND expectedReadyDate emit
 *                   separate entries)
 *
 * Phase milestones are intentionally excluded — `BuildPhase` carries
 * `timeframe` strings ("Year 0-1") not specific calendar dates, so they
 * can't be placed on a month grid without fabrication.
 */

import { useMemo } from 'react';
import { useCommunityEventStore } from '../../store/communityEventStore.js';
import { useFieldTaskStore } from '../../store/fieldTaskStore.js';
import { useLivestockMoveLogStore } from '../../store/livestockMoveLogStore.js';
import { useHarvestLogStore } from '../../store/harvestLogStore.js';
import { useNurseryStore } from '../../store/nurseryStore.js';

export type CalendarSource =
  | 'community'
  | 'task'
  | 'livestock'
  | 'harvest'
  | 'nursery';

export const CALENDAR_SOURCES: readonly CalendarSource[] = [
  'community',
  'task',
  'livestock',
  'harvest',
  'nursery',
] as const;

export const CALENDAR_SOURCE_LABEL: Record<CalendarSource, string> = {
  community: 'Community',
  task: 'Tasks',
  livestock: 'Livestock',
  harvest: 'Harvest',
  nursery: 'Nursery',
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

const SOURCE_ORDER: Record<CalendarSource, number> = {
  community: 0,
  task: 1,
  livestock: 2,
  harvest: 3,
  nursery: 4,
};

export function useEventAggregator(projectId: string): UseEventAggregatorResult {
  const communityEvents = useCommunityEventStore((s) => s.events);
  const tasks = useFieldTaskStore((s) => s.tasks);
  const livestockMoves = useLivestockMoveLogStore((s) => s.events);
  const harvests = useHarvestLogStore((s) => s.entries);
  const nurseryBatches = useNurseryStore((s) => s.batches);
  const stockTransfers = useNurseryStore((s) => s.transfers);

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

    for (const t of tasks) {
      if (t.projectId !== projectId) continue;
      const key = toDateKey(t.dueAt);
      if (!key) continue;
      all.push({
        id: `task:${t.id}`,
        source: 'task',
        dateKey: key,
        iso: t.dueAt,
        title: t.title,
        meta: `${t.category} · ${t.status}`,
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

    for (const b of nurseryBatches) {
      if (b.projectId !== projectId) continue;
      const sowKey = toDateKey(b.sowDate);
      if (sowKey) {
        all.push({
          id: `nursery-sow:${b.id}`,
          source: 'nursery',
          dateKey: sowKey,
          iso: b.sowDate,
          title: `Sow ${b.species}`,
          meta: `${b.quantity} · ${b.method}`,
        });
      }
      const readyKey = toDateKey(b.expectedReadyDate);
      if (readyKey && readyKey !== sowKey) {
        all.push({
          id: `nursery-ready:${b.id}`,
          source: 'nursery',
          dateKey: readyKey,
          iso: b.expectedReadyDate,
          title: `Ready: ${b.species}`,
          meta: `${b.quantity} · ${b.stage}`,
        });
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
    tasks,
    livestockMoves,
    harvests,
    nurseryBatches,
    stockTransfers,
  ]);
}
