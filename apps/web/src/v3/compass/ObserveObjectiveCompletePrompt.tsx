/**
 * ObserveObjectiveCompletePrompt — quiet in-map nudge back to the Stage Compass.
 *
 * When every node of the active module's objective is verified, a small card
 * appears offering a return to the compass (the "reward / next mission" loop).
 * No auto-redirect; dismissible, and re-armed per module so completing the next
 * objective surfaces it again.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Compass, X } from 'lucide-react';
import { useObjectiveProgress } from './useCompassData.js';
import type { ObserveModule } from '../observe/types.js';
import css from './ObserveObjectiveCompletePrompt.module.css';

interface PromptProps {
  projectId: string | null;
  module: ObserveModule | null;
}

export default function ObserveObjectiveCompletePrompt({
  projectId,
  module,
}: PromptProps) {
  const navigate = useNavigate();
  const progress = useObjectiveProgress(projectId ?? '', module);
  const [dismissedFor, setDismissedFor] = useState<ObserveModule | null>(null);

  // Re-arm whenever the active module changes.
  useEffect(() => {
    setDismissedFor(null);
  }, [module]);

  const complete = progress != null && progress.total > 0 && progress.pct === 100;
  if (!projectId || !module || !complete || dismissedFor === module) return null;

  return (
    <div className={css.prompt} role="status">
      <span className={css.icon}>
        <Compass size={18} strokeWidth={1.75} />
      </span>
      <div className={css.body}>
        <p className={css.title}>Objective complete</p>
        <p className={css.text}>
          Every step here is verified. Return to the compass to pick your next
          objective.
        </p>
        <button
          type="button"
          className={css.action}
          onClick={() =>
            navigate({
              to: '/v3/project/$projectId/compass',
              params: { projectId },
            })
          }
        >
          Return to Compass
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
