/**
 * ActOpsHubTaskList — the status-filtered work list that replaces the
 * "Work by area" grid while a metric tile is selected.
 *
 * Each metric tile in `ActOpsHubMetricStrip` maps to one of the status buckets
 * `useFieldActions` already computes (the very counts the tiles display), so
 * this component is pure wiring: it reads the same buckets and renders the
 * matching field-action section component — no new list UI. A thin header
 * echoes the bucket label and offers a "Clear filter" affordance (parity with
 * the grid's own clear button).
 *
 * Tapping a task does NOT navigate to the field-action shell; it calls
 * `onOpenObjective(planObjectiveId)` so the Operations Hub opens its own guided
 * walkthrough drawer (`act/ops/$objectiveId`) and the steward stays in the hub.
 */

import { useFieldActions } from '../field-action/useFieldActions.js';
import ReadyToStartSection from '../field-action/ReadyToStartSection.js';
import ActiveTasksSection from '../field-action/ActiveTasksSection.js';
import BlockedDivergedSection from '../field-action/BlockedDivergedSection.js';
import CompletedTodaySection from '../field-action/CompletedTodaySection.js';
import type { SectionRoleScope } from '../../roles/viewScope.js';
import css from './ActOpsHubTaskList.module.css';

/** The tile keys the metric strip emits. */
export type MetricKey = 'todo' | 'active' | 'blocked' | 'done';

const HEADING: Record<MetricKey, string> = {
  todo: 'Ready to start',
  active: 'In progress',
  blocked: 'Needs attention',
  done: 'Done today',
};

interface Props {
  projectId: string;
  statusKey: MetricKey;
  /** Return to the "Work by area" grid. */
  onClear: () => void;
  /** Open the hub's guided walkthrough for the tapped task's objective. */
  onOpenObjective: (planObjectiveId: string) => void;
  /**
   * Operational Role Layer scope (additive). Present ⇒ each section orders
   * out-of-role objective groups last and de-emphasizes them (never hidden);
   * absent ⇒ the sections render exactly as before.
   */
  roleScope?: SectionRoleScope;
}

export default function ActOpsHubTaskList({
  projectId,
  statusKey,
  onClear,
  onOpenObjective,
  roleScope,
}: Props) {
  const { readyToStart, active, blockedDiverged, completedToday } =
    useFieldActions(projectId);

  const handleOpen = (action: { planObjectiveId: string }) =>
    onOpenObjective(action.planObjectiveId);

  // Forward the role scope only when present so each section keeps its exact
  // prior rendering under the layer-off path (exactOptionalPropertyTypes).
  const scopeProp = roleScope ? { roleScope } : {};

  return (
    <section className={css.wrap} aria-label={`${HEADING[statusKey]} tasks`}>
      <div className={css.head}>
        <h2 className={css.title}>{HEADING[statusKey]}</h2>
        <button type="button" className={css.clear} onClick={onClear}>
          Clear filter
        </button>
      </div>
      {statusKey === 'todo' && (
        <ReadyToStartSection
          projectId={projectId}
          groups={readyToStart}
          onOpen={handleOpen}
          {...scopeProp}
        />
      )}
      {statusKey === 'active' && (
        <ActiveTasksSection
          projectId={projectId}
          groups={active}
          onOpen={handleOpen}
          {...scopeProp}
        />
      )}
      {statusKey === 'blocked' && (
        <BlockedDivergedSection
          projectId={projectId}
          tasks={blockedDiverged}
          onOpen={handleOpen}
          {...scopeProp}
        />
      )}
      {statusKey === 'done' && (
        <CompletedTodaySection
          projectId={projectId}
          tasks={completedToday}
          onOpen={handleOpen}
          {...scopeProp}
        />
      )}
    </section>
  );
}
