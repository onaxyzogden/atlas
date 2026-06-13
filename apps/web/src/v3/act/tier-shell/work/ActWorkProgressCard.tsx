/**
 * ActWorkProgressCard — per-objective done/due/overdue progress bars over the
 * confirmed livestock-plan spine rows (Phase 4 tracking surface).
 *
 * One bar per generating Plan objective (the enterprise-decision surface:
 * husbandry framework, grazing design, water access, …) labelled via the
 * project's resolved objective set, plus an "all livestock work" total line
 * in the header. Click → opens the ActWorkPanel drill-down (same convention
 * as ActWorkSummaryCard's onOpen).
 *
 * Reads ONLY source 'livestock-plan' rows: rotation moves stay owned (and
 * reported) by their own surfaces, and this card answers "how is the work my
 * Plan decisions generated tracking?" — not "all work ever". Cancelled rows
 * are excluded (operator chose to retire them). Counts derive in useMemo over
 * a RAW store subscription (zustand-selector-stability ADR).
 */

import { useMemo } from 'react';
import { ListChecks } from 'lucide-react';
import { useWorkItemStore } from '../../../../store/workItemStore.js';
import { useProjectObjectives } from '../../../plan/strata/useProjectObjectives.js';
import {
  workDisplayStatus,
  GENERATED_PLAN_SOURCES,
} from '../../../../features/work/workSelectors.js';
import styles from './ActWorkPanel.module.css';

interface Props {
  projectId: string | null;
  /** Open the work panel. Mounts without a rail target omit it and the card
   *  renders inert (same convention as ActWorkSummaryCard). */
  onOpen?: () => void;
}

interface ObjectiveBucket {
  objectiveId: string;
  label: string;
  done: number;
  open: number;
  overdue: number;
  total: number;
}

/** Fallback label from the rule key's sourceKind segment
 *  (`lvp__<sourceKind>__…`) when the objective id resolves to no title. */
function sourceKindLabel(generatedFrom: string | undefined): string {
  const kind = generatedFrom?.split('__')[1];
  if (!kind) return 'Livestock work';
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

export default function ActWorkProgressCard({ projectId, onOpen }: Props) {
  const items = useWorkItemStore((s) => s.items);
  const { objectives } = useProjectObjectives(projectId ?? '');

  const buckets = useMemo(() => {
    const todayISO = new Date().toISOString().slice(0, 10);
    const titleById = new Map(objectives.map((o) => [o.id, o.title]));
    const byObjective = new Map<string, ObjectiveBucket>();
    for (const item of items) {
      if (
        item.projectId !== projectId ||
        !GENERATED_PLAN_SOURCES.includes(item.source)
      ) {
        continue;
      }
      const status = workDisplayStatus(item, todayISO);
      if (status === 'cancelled') continue;
      const objectiveId = item.sourceObjectiveId ?? '';
      let bucket = byObjective.get(objectiveId);
      if (!bucket) {
        bucket = {
          objectiveId,
          label:
            titleById.get(objectiveId) ??
            sourceKindLabel(item.generatedFromLivestockPlan),
          done: 0,
          open: 0,
          overdue: 0,
          total: 0,
        };
        byObjective.set(objectiveId, bucket);
      }
      bucket.total += 1;
      if (status === 'done') bucket.done += 1;
      else if (status === 'overdue') bucket.overdue += 1;
      else bucket.open += 1;
    }
    return Array.from(byObjective.values()).sort((a, b) =>
      a.label < b.label ? -1 : 1,
    );
  }, [items, objectives, projectId]);

  const totals = useMemo(
    () =>
      buckets.reduce(
        (acc, b) => ({
          done: acc.done + b.done,
          overdue: acc.overdue + b.overdue,
          total: acc.total + b.total,
        }),
        { done: 0, overdue: 0, total: 0 },
      ),
    [buckets],
  );

  // Nothing confirmed yet — the summary card above already covers proposals,
  // so an empty progress card would only repeat "no work".
  if (buckets.length === 0) return null;

  return (
    <button
      type="button"
      className={styles.progressCard}
      onClick={onOpen}
      disabled={!onOpen}
      aria-label="Open livestock work schedule"
      data-testid="act-work-progress-card"
    >
      <span className={styles.progressHeader}>
        <span className={styles.summaryIcon} aria-hidden="true">
          <ListChecks size={16} />
        </span>
        <span className={styles.summaryBody}>
          <span className={styles.summaryLine}>
            {totals.done} of {totals.total} done
            {totals.overdue > 0 ? ` · ${totals.overdue} overdue` : ''}
          </span>
          <span className={styles.summaryLabel}>Generated work · progress</span>
        </span>
      </span>
      {buckets.map((b) => (
        <span
          key={b.objectiveId}
          className={styles.progressRow}
          data-testid="act-work-progress-row"
        >
          <span className={styles.progressRowTop}>
            <span className={styles.progressLabel} title={b.label}>
              {b.label}
            </span>
            <span className={styles.progressCount}>
              {b.done}/{b.total}
              {b.overdue > 0 ? ` · ${b.overdue} overdue` : ''}
            </span>
          </span>
          <span className={styles.progressBar} aria-hidden="true">
            {b.done > 0 && (
              <span
                className={styles.progressSeg}
                data-kind="done"
                style={{ flexGrow: b.done }}
              />
            )}
            {b.open > 0 && (
              <span
                className={styles.progressSeg}
                data-kind="open"
                style={{ flexGrow: b.open }}
              />
            )}
            {b.overdue > 0 && (
              <span
                className={styles.progressSeg}
                data-kind="overdue"
                style={{ flexGrow: b.overdue }}
              />
            )}
          </span>
        </span>
      ))}
    </button>
  );
}
