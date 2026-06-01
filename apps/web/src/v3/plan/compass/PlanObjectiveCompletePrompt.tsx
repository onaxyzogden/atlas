/**
 * PlanObjectiveCompletePrompt — quiet in-map nudge back to the Plan Compass.
 *
 * Plan-stage mirror of ObserveObjectiveCompletePrompt (Goal 6): when every node
 * of the active module's objective is verified, a small card appears offering a
 * return to the Plan compass (the "reward / next mission" loop). No
 * auto-redirect; dismissible, and re-armed per module so completing the next
 * objective surfaces it again. Reuses the shared prompt CSS.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Compass, X } from 'lucide-react';
import { usePlanObjectiveProgress } from './usePlanCompassData.js';
import type { PlanModule } from '../types.js';
import css from '../../compass/ObserveObjectiveCompletePrompt.module.css';

interface PromptProps {
  projectId: string | null;
  module: PlanModule | null;
}

export default function PlanObjectiveCompletePrompt({
  projectId,
  module,
}: PromptProps) {
  const navigate = useNavigate();
  const progress = usePlanObjectiveProgress(projectId ?? '', module);
  const [dismissedFor, setDismissedFor] = useState<PlanModule | null>(null);

  // Re-arm whenever the active module changes.
  useEffect(() => {
    setDismissedFor(null);
  }, [module]);

  const complete =
    progress != null && progress.total > 0 && progress.pct === 100;
  if (!projectId || !module || !complete || dismissedFor === module) return null;

  return (
    <div className={css.prompt} role="status">
      <span className={css.icon}>
        <Compass size={18} strokeWidth={1.75} />
      </span>
      <div className={css.body}>
        <p className={css.title}>Objective complete</p>
        <p className={css.text}>
          Every step here is verified. Open the Plan Command Centre to run the
          stage and pick your next objective.
        </p>
        <button
          type="button"
          className={css.action}
          onClick={() =>
            navigate({
              to: '/v3/project/$projectId/plan/command-centre',
              params: { projectId },
            })
          }
        >
          Open the Plan Command Centre
        </button>
      </div>
      <button
        type="button"
        className={css.dismiss}
        aria-label="Dismiss"
        onClick={() => setDismissedFor(module)}
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
