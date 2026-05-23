/**
 * StageGateOverlay — soft Observe→Plan gate.
 *
 * Rendered over the Plan canvas. When Observe's required objectives are
 * incomplete AND the steward hasn't chosen "Continue anyway", it shows a
 * dismissible card listing the remaining required objectives with a jump back
 * to Observe. It NEVER blocks navigation — routes stay open; this is guidance.
 *
 * Data-derived: completion comes straight from `useObserveProgress`, so the
 * overlay disappears the moment the last required objective is satisfied.
 */

import { useNavigate } from '@tanstack/react-router';
import { useObserveProgress } from '../observe/progress/useObserveProgress.js';
import { useStageGateOverrideStore } from '../../store/stageGateOverrideStore.js';
import css from './StageGateOverlay.module.css';

export default function StageGateOverlay({
  projectId,
}: {
  projectId: string | null;
}) {
  const navigate = useNavigate();
  const progress = useObserveProgress(projectId);
  const overridden = useStageGateOverrideStore((s) =>
    projectId ? s.byProject[projectId]?.['observe-to-plan'] === true : false,
  );
  const setOverride = useStageGateOverrideStore((s) => s.setOverride);

  if (!projectId) return null;
  if (progress.overall.requiredComplete || overridden) return null;

  const remaining = progress.overall.remainingRequired;

  return (
    <div className={css.scrim} role="dialog" aria-label="Observe not yet complete">
      <div className={css.card}>
        <span className={css.title}>
          Observe has {remaining.length} required{' '}
          {remaining.length === 1 ? 'objective' : 'objectives'} left
        </span>
        <p className={css.lede}>
          Finishing these grounds your Plan in real site observation. You can
          continue anyway and return to Observe at any time.
        </p>
        <ul className={css.items}>
          {remaining.map((obj) => (
            <li key={obj.id} className={css.item}>
              <span className={css.dot} />
              {obj.label}
            </li>
          ))}
        </ul>
        <div className={css.actions}>
          <button
            type="button"
            className={css.primary}
            onClick={() =>
              navigate({
                to: '/v3/project/$projectId/observe',
                params: { projectId },
              })
            }
          >
            Go to Observe
          </button>
          <button
            type="button"
            className={css.secondary}
            onClick={() =>
              setOverride(projectId, 'observe-to-plan', true)
            }
          >
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}
