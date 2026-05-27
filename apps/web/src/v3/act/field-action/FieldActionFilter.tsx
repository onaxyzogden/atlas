/**
 * FieldActionFilter — multi-axis filter chips for View B per spec §4.2.
 *
 * Three axes user-controllable in this slice: status, parent objective,
 * tier. (Assignee axis lands once role-scoped accounts ship in Phase 5;
 * the filter shape already carries it so the addition is non-breaking.)
 * Filter state is session-scoped, lives in `useFieldActions`, and a
 * Clear filters affordance appears when any axis is active.
 */

import { useMemo } from 'react';
import { X } from 'lucide-react';
import type { FieldAction, FieldActionStatus } from '@ogden/shared';
import type { FieldActionFilter as FilterShape } from './useFieldActions.js';
import { getObjectiveTitle, getTierTitle } from './objectiveLookup.js';
import css from './FieldActionFilter.module.css';

interface Props {
  /** Unfiltered set so chips reflect the full universe, not the filtered slice. */
  allTasks: ReadonlyArray<FieldAction>;
  filter: FilterShape;
  onChange: (next: FilterShape) => void;
  onClear: () => void;
  hasFilter: boolean;
}

const STATUS_OPTIONS: ReadonlyArray<{ value: FieldActionStatus; label: string }> = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'verified', label: 'Verified' },
  { value: 'diverged', label: 'Diverged' },
  { value: 'blocked', label: 'Blocked' },
];

function toggle<T>(arr: ReadonlyArray<T>, v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export default function FieldActionFilter({
  allTasks,
  filter,
  onChange,
  onClear,
  hasFilter,
}: Props) {
  const objectiveOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const t of allTasks) {
      if (!map.has(t.planObjectiveId)) {
        map.set(t.planObjectiveId, {
          id: t.planObjectiveId,
          label: getObjectiveTitle(t.planObjectiveId) ?? t.planObjectiveId,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [allTasks]);

  const tierOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const t of allTasks) {
      if (!map.has(t.tierId)) {
        map.set(t.tierId, {
          id: t.tierId,
          label: getTierTitle(t.tierId) ?? t.tierId,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [allTasks]);

  return (
    <div className={css.wrap}>
      <div className={css.row}>
        <span className={css.axisLabel}>Status</span>
        <div className={css.chipRow}>
          {STATUS_OPTIONS.map((opt) => {
            const isActive = filter.statuses.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                className={css.chip}
                data-active={isActive}
                onClick={() =>
                  onChange({ ...filter, statuses: toggle(filter.statuses, opt.value) })
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
      {tierOptions.length > 1 && (
        <div className={css.row}>
          <span className={css.axisLabel}>Tier</span>
          <div className={css.chipRow}>
            {tierOptions.map((opt) => {
              const isActive = filter.tierIds.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={css.chip}
                  data-active={isActive}
                  onClick={() =>
                    onChange({ ...filter, tierIds: toggle(filter.tierIds, opt.id) })
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {objectiveOptions.length > 1 && (
        <div className={css.row}>
          <span className={css.axisLabel}>Objective</span>
          <div className={css.chipRow}>
            {objectiveOptions.map((opt) => {
              const isActive = filter.objectiveIds.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={css.chip}
                  data-active={isActive}
                  onClick={() =>
                    onChange({
                      ...filter,
                      objectiveIds: toggle(filter.objectiveIds, opt.id),
                    })
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {hasFilter && (
        <button type="button" className={css.clearBtn} onClick={onClear}>
          <X size={12} strokeWidth={2} aria-hidden="true" />
          <span>Clear filters</span>
        </button>
      )}
    </div>
  );
}
