/**
 * QuickActions — primary "Create Field Task" + secondary "Log Observation"
 * fire callbacks owned by the parent (`ActOpsAside`), which mounts the
 * dialogs directly. No more bouncing through module selection or the
 * slide-up.
 */

import { Plus, Eye } from 'lucide-react';
import css from './ActOpsAside.module.css';

interface Props {
  disabled: boolean;
  onCreateTask: () => void;
  onLogObservation: () => void;
}

export default function QuickActions({
  disabled,
  onCreateTask,
  onLogObservation,
}: Props) {
  return (
    <section className={css.actions} aria-label="Quick actions">
      <button
        type="button"
        className={css.primaryBtn}
        disabled={disabled}
        onClick={onCreateTask}
      >
        <Plus size={14} strokeWidth={2} />
        Create Field Task
      </button>
      <button
        type="button"
        className={css.secondaryBtn}
        disabled={disabled}
        onClick={onLogObservation}
      >
        <Eye size={14} strokeWidth={1.8} />
        Log Observation
      </button>
    </section>
  );
}
