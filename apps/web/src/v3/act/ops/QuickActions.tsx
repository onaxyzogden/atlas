/**
 * QuickActions — primary "Create Field Task" + secondary "Log Observation"
 * routes to existing Act module surfaces (no new mutation paths). Per
 * plan: primary opens the Maintain module slide-up; secondary opens
 * Review (Ongoing SWOT).
 */

import { Plus, Eye } from 'lucide-react';
import type { ActModule } from '../types.js';
import css from './ActOpsAside.module.css';

interface Props {
  disabled: boolean;
  onSelectModule: (m: ActModule | null) => void;
  onOpenSlideUp: () => void;
}

export default function QuickActions({
  disabled,
  onSelectModule,
  onOpenSlideUp,
}: Props) {
  const handleCreateTask = () => {
    onSelectModule('maintain');
    onOpenSlideUp();
  };

  const handleLogObservation = () => {
    onSelectModule('review');
    onOpenSlideUp();
  };

  return (
    <section className={css.actions} aria-label="Quick actions">
      <button
        type="button"
        className={css.primaryBtn}
        disabled={disabled}
        onClick={handleCreateTask}
      >
        <Plus size={14} strokeWidth={2} />
        Create Field Task
      </button>
      <button
        type="button"
        className={css.secondaryBtn}
        disabled={disabled}
        onClick={handleLogObservation}
      >
        <Eye size={14} strokeWidth={1.8} />
        Log Observation
      </button>
    </section>
  );
}
