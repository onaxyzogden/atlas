/**
 * ActTaskList — sequenced list of field actions for the active objective
 * per spec §5.2. Each row is a click-target that selects the task; the
 * currently selected task renders its `ActTaskDetail` inline below the
 * row (mobile-friendly accordion pattern). On a fresh load the highest-
 * priority task is auto-selected upstream via `ViewAObjectiveExecution`.
 *
 * Ordering: dependency order is not yet modeled on the FieldAction
 * schema; until that lands we order by createdAt ascending so demo
 * + future authored tasks render in insertion order.
 */

import type { FieldAction, FieldActionStatus } from '@ogden/shared';
import ActTaskDetail from './ActTaskDetail.js';
import css from './ActTaskList.module.css';

interface Props {
  projectId: string;
  tasks: ReadonlyArray<FieldAction>;
  activeTaskId: string | null;
  onSelectTask: (id: string) => void;
}

const STATUS_LABEL: Record<FieldActionStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  submitted: 'Submitted',
  verified: 'Verified',
  diverged: 'Diverged',
  blocked: 'Blocked',
};

export default function ActTaskList({
  projectId,
  tasks,
  activeTaskId,
  onSelectTask,
}: Props) {
  if (tasks.length === 0) {
    return (
      <div className={css.empty}>
        No field actions are scoped to this objective yet.
      </div>
    );
  }
  return (
    <div className={css.list}>
      {tasks.map((task) => {
        const isActive = task.id === activeTaskId;
        return (
          <div key={task.id} className={css.row}>
            <button
              type="button"
              className={css.taskBtn}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => onSelectTask(task.id)}
            >
              <span className={css.taskTitle}>{task.title}</span>
              <span className={css.taskStatus} data-status={task.status}>
                {STATUS_LABEL[task.status]}
              </span>
            </button>
            {isActive && <ActTaskDetail projectId={projectId} action={task} />}
          </div>
        );
      })}
    </div>
  );
}
