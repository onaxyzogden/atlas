/**
 * ActReadyCue — soft, non-blocking completion cue for the Act stage.
 *
 * Mirrors `PlanReadyCue`: surfaces Act "execution underway" state and offers a
 * one-click jump to the Report. Completion is data-derived from
 * `useActProgress` — the cue lists the required objective(s) still outstanding
 * (auto-ticking from real store data) and enables "Ready to Report →" exactly
 * when every required objective is done. It NEVER gates navigation — the steward
 * may move between stages freely at any time. This is a progress hint.
 */

import { useNavigate } from '@tanstack/react-router';
import { useActProgress } from '../progress/useActProgress.js';
import css from './ActReadyCue.module.css';

export default function ActReadyCue({
  projectId,
}: {
  projectId: string | null;
}) {
  const navigate = useNavigate();
  const progress = useActProgress(projectId);

  if (!projectId) return null;

  const { requiredComplete, remainingRequired, percent } = progress.overall;

  return (
    <div className={css.cue} aria-label="Act readiness">
      <span className={css.title}>Act essentials · {percent}%</span>
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
              to: '/v3/project/$projectId/report',
              params: { projectId },
            })
          }
        >
          Ready to Report →
        </button>
      ) : (
        <span className={css.hint}>
          Log real execution progress to ground your report — you can keep
          working the Act stage anytime.
        </span>
      )}
    </div>
  );
}
