/**
 * WorkAgendaList — day-grouped agenda of dated spine WorkItems for the Act
 * work panel. Pure presentation over `groupByDueDate`; each row is a
 * self-sufficient WorkItemRow (the rows own their store actions).
 */

import { useMemo } from 'react';
import type { WorkItem } from '@ogden/shared';
import { groupByDueDate } from '../../../../features/work/workSelectors.js';
import WorkItemRow from './WorkItemRow.js';
import styles from './ActWorkPanel.module.css';

function formatDayHeader(dateKey: string, todayISO: string): string {
  if (dateKey === todayISO) return 'Today';
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

interface Props {
  items: readonly WorkItem[];
  todayISO: string;
  emptyLabel: string;
}

export default function WorkAgendaList({ items, todayISO, emptyLabel }: Props) {
  const groups = useMemo(() => groupByDueDate(items), [items]);

  if (groups.length === 0) {
    return <div className={styles.empty}>{emptyLabel}</div>;
  }

  return (
    <>
      {groups.map((group) => (
        <div className={styles.section} key={group.dateKey}>
          <div className={styles.dayHeader}>
            {formatDayHeader(group.dateKey, todayISO)}
          </div>
          {group.items.map((item) => (
            <WorkItemRow key={item.id} item={item} todayISO={todayISO} />
          ))}
        </div>
      ))}
    </>
  );
}
