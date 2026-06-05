/**
 * ReportStageGateOverlay — soft Act→Report gate.
 *
 * Rendered over the Report page. When Act's required objective (at least one
 * planned work item completed) is incomplete AND the steward hasn't chosen
 * "Continue anyway", it shows a dismissible card with a jump back to Act. It
 * NEVER blocks navigation — routes stay open; this is guidance.
 *
 * Data-derived: completion comes straight from `useActProgress`, so the overlay
 * disappears the moment the required objective is satisfied. The "Continue
 * anyway" choice is persisted per-project under the `act-to-report` key of the
 * shared `stageGateOverrideStore`.
 */

import { useNavigate } from '@tanstack/react-router';
import { useActProgress } from '../act/progress/useActProgress.js';
import { useStageGateOverrideStore } from '../../store/stageGateOverrideStore.js';
import css from '../plan/StageGateOverlay.module.css';

export default function ReportStageGateOverlay({
  projectId,
}: {
  projectId: string | null;
}) {
  const navigate = useNavigate();
  const progress = useActProgress(projectId);
  const overridden = useStageGateOverrideStore((s) =>
    projectId ? s.byProject[projectId]?.['act-to-report'] === true : false,
  );
  const setOverride = useStageGateOverrideStore((s) => s.setOverride);

  if (!projectId) return null;
  if (progress.overall.requiredComplete || overridden) return null;

  const remaining = progress.overall.remainingRequired;

  return (
    <div className={css.scrim} role="dialog" aria-label="Act not yet complete">
      <div className={css.card}>
        <span className={css.title}>
          Act has {remaining.length} required{' '}
          {remaining.length === 1 ? 'objective' : 'objectives'} left
        </span>
        <p className={css.lede}>
          Logging real execution progress grounds your report in what actually
          happened on the land. You can continue anyway and return to Act at any
          time.
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
                to: '/v3/project/$projectId/act',
                params: { projectId },
              })
            }
          >
            Go to Act
          </button>
          <button
            type="button"
            className={css.secondary}
            onClick={() => setOverride(projectId, 'act-to-report', true)}
          >
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}
