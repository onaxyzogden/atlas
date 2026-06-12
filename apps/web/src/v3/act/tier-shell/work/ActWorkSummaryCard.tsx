/**
 * ActWorkSummaryCard — compact one-row livestock work rollup for the Act ops
 * rail ("This week: N due · N overdue · N proposed"). Click → opens the
 * ActWorkPanel drill-down. Mirrors WeatherStrip's button-card shape.
 *
 * Counts derive in useMemo over RAW store subscriptions (zustand-selector-
 * stability ADR — never call freshly-allocating getters in a selector).
 */

import { useMemo } from 'react';
import { ClipboardList } from 'lucide-react';
import { useWorkItemStore } from '../../../../store/workItemStore.js';
import { useLivestockWorkPlanStore } from '../../../../store/livestockWorkPlanStore.js';
import {
  addDaysISO,
  isLiveWork,
  isLivestockWork,
  workDisplayStatus,
  workDueDate,
} from '../../../../features/work/workSelectors.js';
import styles from './ActWorkPanel.module.css';

interface Props {
  projectId: string | null;
  /** Open the work panel. Mounts without a rail target omit it and the card
   *  renders inert (same convention as WeatherStrip's onOpen). */
  onOpen?: () => void;
}

export default function ActWorkSummaryCard({ projectId, onOpen }: Props) {
  const items = useWorkItemStore((s) => s.items);
  const proposals = useLivestockWorkPlanStore((s) => s.proposals);

  const counts = useMemo(() => {
    const todayISO = new Date().toISOString().slice(0, 10);
    const weekEnd = addDaysISO(todayISO, 6);
    let due = 0;
    let overdue = 0;
    for (const item of items) {
      if (item.projectId !== projectId) continue;
      if (!isLivestockWork(item) || !isLiveWork(item)) continue;
      const status = workDisplayStatus(item, todayISO);
      if (status === 'overdue') {
        overdue += 1;
        continue;
      }
      const dueKey = workDueDate(item)?.slice(0, 10);
      if (status === 'due-today' || (dueKey && dueKey <= weekEnd)) due += 1;
    }
    const proposed = proposals.filter(
      (p) => p.projectId === projectId && p.status === 'proposed',
    ).length;
    return { due, overdue, proposed };
  }, [items, proposals, projectId]);

  const line =
    counts.due + counts.overdue + counts.proposed === 0
      ? 'No livestock work due'
      : [
          `${counts.due} due`,
          counts.overdue > 0 ? `${counts.overdue} overdue` : null,
          counts.proposed > 0 ? `${counts.proposed} proposed` : null,
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <button
      type="button"
      className={styles.summaryCard}
      onClick={onOpen}
      disabled={!onOpen}
      aria-label="Open livestock work schedule"
    >
      <span className={styles.summaryIcon} aria-hidden="true">
        <ClipboardList size={16} />
      </span>
      <span className={styles.summaryBody}>
        <span className={styles.summaryLine}>{line}</span>
        <span className={styles.summaryLabel}>Livestock work · this week</span>
      </span>
      {counts.overdue > 0 ? (
        <span className={styles.summaryBadge} data-tone="danger">
          {counts.overdue} overdue
        </span>
      ) : counts.proposed > 0 ? (
        <span className={styles.summaryBadge}>{counts.proposed} to review</span>
      ) : null}
    </button>
  );
}
