/**
 * ActWorkPanel — right-rail drill-down for the livestock work schedule.
 *
 * Mirrors ActTierWeatherPanel's back→dashboard shape. Opened via
 * `?panel=work` (deep-linkable from Plan with `&workFilter=…`); the shell
 * owns the URL — this panel only receives `initialFilter` + `onBack`.
 *
 * Sections, top to bottom:
 *   1. Proposed (pinned) — WorkReviewSection over livestockWorkPlanStore.
 *   2. Overdue (pinned, red) — live items past due.
 *   3. Today / This week agenda — day-grouped spine rows (incl. recently
 *      done, so variance stays visible where the work was due).
 *
 * Generation runs on open + on explicit "Refresh" — rolling 90d horizon,
 * no background scheduler (sovereign steward: proposals only, the operator
 * confirms in WorkReviewSection).
 */

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, RefreshCw } from 'lucide-react';
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
import WorkReviewSection from './WorkReviewSection.js';
import styles from './ActWorkPanel.module.css';

type WorkTab = 'today' | 'week';

interface Props {
  projectId: string;
  onBack: () => void;
  /** From `?workFilter=…` — 'week' selects the week tab; anything else
   *  (incl. 'proposed', whose section is pinned regardless) starts on today. */
  initialFilter?: string | undefined;
}

export default function ActWorkPanel({ projectId, onBack, initialFilter }: Props) {
  const [tab, setTab] = useState<WorkTab>(
    initialFilter === 'week' ? 'week' : 'today',
  );
  const items = useWorkItemStore((s) => s.items);

  // Rolling-horizon regeneration on open; explicit button re-runs it.
  useEffect(() => {
    generateAndApplyLivestockWork(projectId);
  }, [projectId]);

  // ±7d auto-fulfilment: link already-logged moves to due livestock work
  // (record-keeping only — see useLivestockFulfillmentSync).
  useLivestockFulfillmentSync(projectId);

  const todayISO = new Date().toISOString().slice(0, 10);

  const { overdue, agenda } = useMemo(() => {
    const weekEnd = addDaysISO(todayISO, 6);
    const overdueRows: WorkItem[] = [];
    const agendaRows: WorkItem[] = [];
    for (const item of items) {
      if (item.projectId !== projectId || !isLivestockWork(item)) continue;
      const status = workDisplayStatus(item, todayISO);
      if (status === 'cancelled') continue;
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
    return { overdue: overdueRows, agenda: agendaRows };
  }, [items, projectId, tab, todayISO]);

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
      </div>

      <div className={styles.body}>
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

        <WorkAgendaList
          items={agenda}
          todayISO={todayISO}
          emptyLabel={
            tab === 'today'
              ? 'Nothing due today.'
              : 'Nothing due this week.'
          }
        />
      </div>
    </div>
  );
}
