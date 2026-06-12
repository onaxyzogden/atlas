/**
 * ActWorkPanel — right-rail drill-down for the livestock work schedule.
 *
 * Mirrors ActTierWeatherPanel's back→dashboard shape. Opened via
 * `?panel=work` (deep-linkable from Plan with `&workFilter=…`); the shell
 * owns the URL — this panel only receives `initialFilter` + `onBack`.
 *
 * Sections, top to bottom:
 *   1. Carer strip — per-carer workload counts (WorkCarerSummary), doubling
 *      as a filter over the Overdue section and every tab below it.
 *   2. Needs your decision (pinned) — WorkConflictSection over the
 *      per-record sync conflicts for `ogden-work-items` (ADR 2026-06-12);
 *      renders nothing when there are none.
 *   3. Proposed (pinned) — WorkReviewSection over livestockWorkPlanStore
 *      (proposals aren't spine rows — the carer filter doesn't apply).
 *   4. Overdue (pinned, red) — live items past due.
 *   5. Today / This week agenda — day-grouped spine rows (incl. recently
 *      done, so variance stays visible where the work was due) — or, on the
 *      Season tab, the WorkMonthGrid month calendar (no horizon clamp).
 *
 * Generation runs on open + on explicit "Refresh" — rolling 90d horizon,
 * no background scheduler (sovereign steward: proposals only, the operator
 * confirms in WorkReviewSection).
 */

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Maximize2, RefreshCw } from 'lucide-react';
import type { WorkItem } from '@ogden/shared';
import { useWorkItemStore } from '../../../../store/workItemStore.js';
import { generateAndApplyLivestockWork } from '../../../../features/livestock/livestockWorkInputs.js';
import { useLivestockFulfillmentSync } from '../../../../features/livestock/useLivestockFulfillmentSync.js';
import {
  addDaysISO,
  isLivestockWork,
  workDisplayStatus,
  workDueDate,
} from '../../../../features/work/workSelectors.js';
import WorkAgendaList from './WorkAgendaList.js';
import WorkCarerSummary from './WorkCarerSummary.js';
import WorkConflictSection from './WorkConflictSection.js';
import WorkMonthGrid from './WorkMonthGrid.js';
import WorkReviewSection from './WorkReviewSection.js';
import styles from './ActWorkPanel.module.css';

type WorkTab = 'today' | 'week' | 'season';

interface Props {
  projectId: string;
  onBack: () => void;
  /** From `?workFilter=…` — 'week'/'season' select those tabs; anything else
   *  (incl. 'proposed', whose section is pinned regardless) starts on today. */
  initialFilter?: string | undefined;
  /** Shell callback opening the wide-calendar canvas takeover
   *  (?workView=calendar). Omitted where no canvas exists to take over. */
  onOpenCalendar?: (() => void) | undefined;
}

export default function ActWorkPanel({
  projectId,
  onBack,
  initialFilter,
  onOpenCalendar,
}: Props) {
  const [tab, setTab] = useState<WorkTab>(
    initialFilter === 'week' || initialFilter === 'season'
      ? initialFilter
      : 'today',
  );
  const items = useWorkItemStore((s) => s.items);
  // Carer filter from the workload strip ('' = unassigned, null = everyone).
  const [carerFilter, setCarerFilter] = useState<string | null>(null);

  // Rolling-horizon regeneration on open; explicit button re-runs it.
  useEffect(() => {
    generateAndApplyLivestockWork(projectId);
  }, [projectId]);

  // ±7d auto-fulfilment: link already-logged moves to due livestock work
  // (record-keeping only — see useLivestockFulfillmentSync).
  useLivestockFulfillmentSync(projectId);

  const todayISO = new Date().toISOString().slice(0, 10);

  const { overdue, agenda, season, all } = useMemo(() => {
    const weekEnd = addDaysISO(todayISO, 6);
    const overdueRows: WorkItem[] = [];
    const agendaRows: WorkItem[] = [];
    // Season feed: every non-cancelled dated row (incl. overdue + done) so
    // the month grid can place the full horizon — it windows by month itself.
    const seasonRows: WorkItem[] = [];
    // Unfiltered feed for the carer strip — every carer's counts stay
    // visible while one is selected.
    const allRows: WorkItem[] = [];
    for (const item of items) {
      if (item.projectId !== projectId || !isLivestockWork(item)) continue;
      const status = workDisplayStatus(item, todayISO);
      if (status === 'cancelled') continue;
      allRows.push(item);
      if (carerFilter != null && (item.who ?? '').trim() !== carerFilter) {
        continue;
      }
      seasonRows.push(item);
      if (status === 'overdue') {
        overdueRows.push(item);
        continue;
      }
      const dueKey = workDueDate(item)?.slice(0, 10);
      if (!dueKey) continue;
      if (tab === 'today') {
        if (dueKey === todayISO) agendaRows.push(item);
      } else if (dueKey >= todayISO && dueKey <= weekEnd) {
        agendaRows.push(item);
      }
    }
    overdueRows.sort((a, b) =>
      (workDueDate(a) ?? '') < (workDueDate(b) ?? '') ? -1 : 1,
    );
    return {
      overdue: overdueRows,
      agenda: agendaRows,
      season: seasonRows,
      all: allRows,
    };
  }, [items, projectId, tab, todayISO, carerFilter]);

  return (
    <div className={styles.panel} data-testid="act-work-panel">
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          <ChevronLeft size={14} />
          Operations
        </button>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={() => generateAndApplyLivestockWork(projectId)}
          title="Re-derive proposals from current Plan decisions"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Work horizon">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'today'}
          className={styles.tabBtn}
          data-active={tab === 'today' || undefined}
          onClick={() => setTab('today')}
        >
          Today
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'week'}
          className={styles.tabBtn}
          data-active={tab === 'week' || undefined}
          onClick={() => setTab('week')}
        >
          This week
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'season'}
          className={styles.tabBtn}
          data-active={tab === 'season' || undefined}
          onClick={() => setTab('season')}
        >
          Season
        </button>
      </div>

      <WorkCarerSummary
        items={all}
        todayISO={todayISO}
        selected={carerFilter}
        onSelect={setCarerFilter}
      />

      <div className={styles.body}>
        <WorkConflictSection />

        <WorkReviewSection projectId={projectId} />

        {overdue.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle} data-tone="danger">
              Overdue ({overdue.length})
            </div>
            <WorkAgendaList
              items={overdue}
              todayISO={todayISO}
              emptyLabel=""
            />
          </div>
        )}

        {tab === 'season' ? (
          <>
            {onOpenCalendar && (
              <button
                type="button"
                className={styles.wideCalBtn}
                onClick={onOpenCalendar}
                data-testid="open-wide-calendar"
                title="Open the month calendar across the full canvas"
              >
                <Maximize2 size={11} />
                Wide calendar
              </button>
            )}
            <WorkMonthGrid projectId={projectId} items={season} todayISO={todayISO} />
          </>
        ) : (
          <WorkAgendaList
            items={agenda}
            todayISO={todayISO}
            emptyLabel={
              tab === 'today'
                ? 'Nothing due today.'
                : 'Nothing due this week.'
            }
          />
        )}
      </div>
    </div>
  );
}
