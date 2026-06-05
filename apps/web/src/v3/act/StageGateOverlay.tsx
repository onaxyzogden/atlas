/**
 * StageGateOverlay — soft Plan→Act gate.
 *
 * Rendered over the Act canvas. When Plan's required objectives (the four
 * core-design-essentials modules) are incomplete AND the steward hasn't chosen
 * "Continue anyway", it shows a dismissible card listing the remaining required
 * objectives with a jump back to Plan. It NEVER blocks navigation — routes stay
 * open; this is guidance.
 *
 * Data-derived: completion comes straight from `usePlanProgress`, so the
 * overlay disappears the moment the last required objective is satisfied. The
 * "Continue anyway" choice is persisted per-project under the `plan-to-act`
 * key of the shared `stageGateOverrideStore`.
 */

import { useNavigate } from '@tanstack/react-router';
import { usePlanProgress } from '../plan/progress/usePlanProgress.js';
import { useStageGateOverrideStore } from '../../store/stageGateOverrideStore.js';
import css from '../plan/StageGateOverlay.module.css';

export default function StageGateOverlay({
  projectId,
}: {
  projectId: string | null;
}) {
  const navigate = useNavigate();
  const progress = usePlanProgress(projectId);
  const overridden = useStageGateOverrideStore((s) =>
    projectId ? s.byProject[projectId]?.['plan-to-act'] === true : false,
  );
  const setOverride = useStageGateOverrideStore((s) => s.setOverride);

  if (!projectId) return null;
  if (progress.overall.requiredComplete || overridden) return null;

  const remaining = progress.overall.remainingRequired;

  return (
    <div className={css.scrim} role="dialog" aria-label="Plan not yet complete">
      <div className={css.card}>
        <span className={css.title}>
          Plan has {remaining.length} required{' '}
          {remaining.length === 1 ? 'objective' : 'objectives'} left
        </span>
        <p className={css.lede}>
          Finishing the core design essentials grounds your build in a coherent
          plan. You can continue anyway and return to Plan at any time.
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
                to: '/v3/project/$projectId/plan',
                params: { projectId },
              })
            }
          >
            Go to Plan
          </button>
          <button
            type="button"
            className={css.secondary}
            onClick={() => setOverride(projectId, 'plan-to-act', true)}
          >
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}
