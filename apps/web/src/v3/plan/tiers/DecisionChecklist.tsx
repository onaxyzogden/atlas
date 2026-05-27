// DecisionChecklist — the YOUR DECISIONS section of ObjectiveDetailPanel
// (Plan Navigation Spec v1, Slice 1.7). Renders the objective's checklist
// as a vertical list of checkboxes. Each item that `feedsInto` another
// objective surfaces those targets as small chips so the steward sees the
// causal chain at a glance.
//
// Pure presentational — store wiring lives one level up so the same list
// can drive cyclical-review revisions in Slice 1.11 without a refactor.

import type {
  PlanDecisionChecklistItem,
  PlanTierObjective,
  PlanTierObjectiveStatus,
} from '@ogden/shared';
import { findPlanTierObjective } from '@ogden/shared';
import css from './DecisionChecklist.module.css';

interface Props {
  objective: PlanTierObjective;
  status: PlanTierObjectiveStatus;
  completedItemIds: readonly string[];
  onToggleItem: (itemId: string) => void;
}

export default function DecisionChecklist({
  objective,
  status,
  completedItemIds,
  onToggleItem,
}: Props) {
  const completed = new Set(completedItemIds);
  const items = objective.checklist;
  const requiredCount = items.filter((i) => !i.optional).length;
  const requiredDoneCount = items.filter(
    (i) => !i.optional && completed.has(i.id),
  ).length;

  return (
    <section className={css.section} aria-label="Your decisions">
      <header className={css.header}>
        <p className={css.eyebrow}>Your decisions</p>
        <span className={css.meta} data-status={status}>
          {requiredDoneCount} / {requiredCount} required
        </span>
      </header>

      {items.length === 0 ? (
        <p className={css.empty}>No checklist items for this objective yet.</p>
      ) : (
        <ol className={css.list}>
          {items.map((item) => (
            <li key={item.id} className={css.item}>
              <ChecklistRow
                item={item}
                isComplete={completed.has(item.id)}
                onToggle={() => onToggleItem(item.id)}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

interface RowProps {
  item: PlanDecisionChecklistItem;
  isComplete: boolean;
  onToggle: () => void;
}

function ChecklistRow({ item, isComplete, onToggle }: RowProps) {
  return (
    <label className={css.row} data-complete={isComplete}>
      <input
        type="checkbox"
        className={css.checkbox}
        checked={isComplete}
        onChange={onToggle}
      />
      <div className={css.body}>
        <span className={css.label}>{item.label}</span>
        <div className={css.tags}>
          {item.optional ? (
            <span className={css.optional}>optional</span>
          ) : null}
          {item.feedsInto.map((targetId) => {
            const target = findPlanTierObjective(targetId);
            return (
              <span key={targetId} className={css.feedsInto}>
                feeds {target?.title ?? targetId}
              </span>
            );
          })}
        </div>
      </div>
    </label>
  );
}
