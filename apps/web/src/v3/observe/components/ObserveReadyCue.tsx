/**
 * ObserveReadyCue — soft, non-blocking completion cue (spec §3.4).
 *
 * Surfaces Observe "essentials captured" state and offers a one-click jump to
 * Plan. Completion is data-derived from `useObserveProgress`: the cue lists the
 * required objectives still outstanding (auto-ticking from real store data) and
 * enables "Ready to Plan →" exactly when every required objective is done. It
 * NEVER gates navigation — the user may move between stages freely at any time
 * (the spec explicitly allows returning to Observe). This is a progress hint.
 */

import { useNavigate } from '@tanstack/react-router';
import { useObserveProgress } from '../progress/useObserveProgress.js';
import css from './ObserveReadyCue.module.css';

export default function ObserveReadyCue({
  projectId,
}: {
  projectId: string | null;
}) {
  const navigate = useNavigate();
  const progress = useObserveProgress(projectId);

  if (!projectId) return null;

  const { requiredComplete, remainingRequired, percent } = progress.overall;

  return (
    <div className={css.cue} aria-label="Observe readiness">
      <span className={css.title}>Observe essentials · {percent}%</span>
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
              to: '/v3/project/$projectId/plan',
              params: { projectId },
            })
          }
        >
          Ready to Plan →
        </button>
      ) : (
        <span className={css.hint}>
          Capture the above to unlock a confident Plan — you can keep
          refining Observe anytime.
        </span>
      )}
    </div>
  );
}
