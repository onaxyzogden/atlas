/**
 * PlanReadyCue — soft, non-blocking completion cue for the Plan stage.
 *
 * Mirrors `ObserveReadyCue`: surfaces Plan "core design essentials captured"
 * state and offers a one-click jump to Act. Completion is data-derived from
 * `usePlanProgress` — the cue lists the required objectives still outstanding
 * (auto-ticking from real store data) and enables "Ready to Act →" exactly when
 * every required objective is done. It NEVER gates navigation — the steward may
 * move between stages freely at any time. This is a progress hint.
 */

import { useNavigate } from '@tanstack/react-router';
import { usePlanProgress } from '../progress/usePlanProgress.js';
import css from './PlanReadyCue.module.css';

export default function PlanReadyCue({
  projectId,
}: {
  projectId: string | null;
}) {
  const navigate = useNavigate();
  const progress = usePlanProgress(projectId);

  if (!projectId) return null;

  const { requiredComplete, remainingRequired, percent } = progress.overall;

  return (
    <div className={css.cue} aria-label="Plan readiness">
      <span className={css.title}>Plan essentials · {percent}%</span>
      {requiredComplete ? (
        <ul className={css.items}>
          <li className={`${css.item} ${css.itemDone}`}>
            <span className={`${css.dot} ${css.dotDone}`} />
            All required objectives captured
          </li>
        </ul>
      ) : (
        <ul className={css.items}>
          {remainingRequired.map((obj) => (
            <li key={obj.id} className={css.item}>
              <span className={css.dot} />
              {obj.label}
            </li>
          ))}
        </ul>
      )}
      {requiredComplete ? (
        <button
          type="button"
          className={css.proceed}
          onClick={() =>
            navigate({
              to: '/v3/project/$projectId/act',
              params: { projectId },
            })
          }
        >
          Ready to Act →
        </button>
      ) : (
        <span className={css.hint}>
          Capture the above to unlock a confident build — you can keep
          refining the Plan anytime.
        </span>
      )}
    </div>
  );
}
