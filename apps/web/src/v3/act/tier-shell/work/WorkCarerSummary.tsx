/**
 * WorkCarerSummary — per-carer workload strip for the Act work panel.
 *
 * Derives counts from the live spine rows it is handed (overdue + due within
 * the coming week per carer, an "Unassigned" bucket for rows without `who`)
 * and doubles as a filter: tapping a carer narrows every tab (Today / This
 * week / Season) plus the pinned Overdue section to that carer's work;
 * tapping the active chip clears the filter.
 *
 * Counts come from the rows, not the intent-capture roster, so the strip
 * always reflects actual scheduled workload — a rostered carer with no work
 * simply doesn't appear, and the strip renders nothing until at least one
 * live row carries a carer (an all-unassigned schedule has nothing to
 * summarize). Pure read — rendering writes no store.
 */

import { useMemo } from 'react';
import type { WorkItem } from '@ogden/shared';
import {
  addDaysISO,
  workDisplayStatus,
  workDueDate,
} from '../../../../features/work/workSelectors.js';
import styles from './ActWorkPanel.module.css';

interface CarerStats {
  /** Trimmed `who`; '' is the Unassigned bucket. */
  key: string;
  overdue: number;
  /** Live rows due today..+6 (overdue counted separately, not here). */
  week: number;
}

interface Props {
  /** Full non-cancelled project livestock feed — NOT carer-filtered, the
   *  strip must keep every carer's counts visible while one is selected. */
  items: readonly WorkItem[];
  todayISO: string;
  /** Active carer filter ('' = unassigned, null = no filter). */
  selected: string | null;
  onSelect: (carer: string | null) => void;
}

export default function WorkCarerSummary({
  items,
  todayISO,
  selected,
  onSelect,
}: Props) {
  const carers = useMemo(() => {
    const weekEnd = addDaysISO(todayISO, 6);
    const map = new Map<string, CarerStats>();
    for (const item of items) {
      const status = workDisplayStatus(item, todayISO);
      if (status === 'done' || status === 'cancelled') continue;
      const key = (item.who ?? '').trim();
      let stats = map.get(key);
      if (!stats) {
        stats = { key, overdue: 0, week: 0 };
        map.set(key, stats);
      }
      if (status === 'overdue') {
        stats.overdue += 1;
        continue;
      }
      const due = workDueDate(item)?.slice(0, 10);
      if (due && due >= todayISO && due <= weekEnd) stats.week += 1;
    }
    return [...map.values()].sort((a, b) => {
      // Unassigned last; otherwise heaviest workload first, then by name.
      if ((a.key === '') !== (b.key === '')) return a.key === '' ? 1 : -1;
      if (a.overdue !== b.overdue) return b.overdue - a.overdue;
      if (a.week !== b.week) return b.week - a.week;
      return a.key.localeCompare(b.key);
    });
  }, [items, todayISO]);

  if (!carers.some((c) => c.key !== '')) return null;

  return (
    <div className={styles.carerStrip} data-testid="work-carer-summary">
      {carers.map((c) => {
        const active = selected === c.key;
        return (
          <button
            type="button"
            key={c.key === '' ? '__unassigned' : c.key}
            className={styles.carerChip}
            data-testid="work-carer-chip"
            data-carer={c.key}
            data-active={active || undefined}
            aria-pressed={active}
            onClick={() => onSelect(active ? null : c.key)}
            title={`${c.overdue} overdue · ${c.week} due this week — tap to ${
              active ? 'clear the filter' : 'show only this carer'
            }`}
          >
            {c.key === '' ? 'Unassigned' : c.key}
            {c.overdue > 0 && (
              <span className={styles.carerCount} data-tone="overdue">
                {c.overdue}
              </span>
            )}
            <span className={styles.carerCount} data-tone="week">
              {c.week} wk
            </span>
          </button>
        );
      })}
    </div>
  );
}
