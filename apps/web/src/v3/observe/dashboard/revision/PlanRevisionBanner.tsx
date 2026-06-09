/**
 * PlanRevisionBanner — Observe Dashboard surface header (Dashboard Spec
 * §4.2). Surfaces ranked Plan-revision events to the steward at the top
 * of both the Unified Land State surface and each Domain Detail surface.
 *
 * Behaviour:
 *   • Reads the per-project, post-dismissal event window via
 *     `useRevisionEvents`.
 *   • Renders nothing when `priority === null` (silent default — the
 *     banner is opt-in by data, not a permanent chrome element).
 *   • Priority badge: Critical = red, High = amber, Informational = blue
 *     (per Dashboard Spec §4.2 colour ramp).
 *   • Deep-link CTA "Review impacted objectives" navigates to the first
 *     impacted Plan tier objective when one exists, otherwise to the
 *     first impacted Domain Detail surface (data-point events name
 *     domains, not objectives).
 *   • Dismiss button stamps `planRevisionDismissalStore` and the banner
 *     stays hidden until a NEW event arrives that is strictly newer than
 *     the dismissal timestamp.
 */

import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { findObjectiveGlobally } from '../../../plan/objectiveCatalog.js';
import { revisionHeadline, revisionSupporting } from '../../../copy/index.js';
import { useRevisionEvents } from './useRevisionEvents.js';
import { usePlanRevisionDismissalStore } from '../../../../store/planRevisionDismissalStore.js';
import css from './PlanRevisionBanner.module.css';

interface Props {
  projectId: string;
}

const PRIORITY_LABEL = {
  critical: 'Critical',
  high: 'High',
  informational: 'Informational',
} as const;

export default function PlanRevisionBanner({ projectId }: Props) {
  const summary = useRevisionEvents(projectId);
  const dismiss = usePlanRevisionDismissalStore((s) => s.dismiss);
  const navigate = useNavigate();

  const target = useMemo(() => {
    const objectiveId = summary.impactedObjectiveIds[0];
    if (objectiveId) {
      const obj = findObjectiveGlobally(objectiveId);
      if (obj) {
        return {
          kind: 'objective' as const,
          objectiveId: obj.id,
          stratumId: obj.stratumId,
        };
      }
    }
    const domainId = summary.impactedDomains[0];
    if (domainId) {
      return { kind: 'domain' as const, domainId };
    }
    return null;
  }, [summary.impactedObjectiveIds, summary.impactedDomains]);

  if (summary.priority === null) return null;

  const handleReview = () => {
    if (!target) return;
    if (target.kind === 'objective') {
      navigate({
        to: '/v3/project/$projectId/plan/stratum/$stratumId/objective/$objectiveId',
        params: {
          projectId,
          stratumId: target.stratumId,
          objectiveId: target.objectiveId,
        },
      });
      return;
    }
    navigate({
      to: '/v3/project/$projectId/observe/dashboard/domain/$domainId',
      params: { projectId, domainId: target.domainId },
    });
  };

  const handleDismiss = () => {
    dismiss(projectId);
  };

  const priority = summary.priority;

  return (
    <section
      className={css.banner}
      data-priority={priority}
      role="status"
      aria-live="polite"
    >
      <span className={css.badge} data-priority={priority}>
        {PRIORITY_LABEL[priority]}
      </span>
      <div className={css.body}>
        {/* Suggestion 9 -- ecological reframe of the headline. Suggestion 10
            (cycle-name echo) passes null here: the active cycle title is not
            in scope at the banner boundary, so the copy no-ops gracefully
            rather than reach across surfaces for it. */}
        <p className={css.headline}>{revisionHeadline(priority, null)}</p>
        <p className={css.supporting}>
          {revisionSupporting({
            eventCount: summary.eventCount,
            domains: summary.impactedDomains,
            cycleTitle: null,
          })}
        </p>
      </div>
      <div className={css.actions}>
        {target !== null && (
          <button
            type="button"
            className={css.reviewBtn}
            onClick={handleReview}
            data-priority={priority}
          >
            Review impacted objectives
          </button>
        )}
        <button
          type="button"
          className={css.dismissBtn}
          onClick={handleDismiss}
          aria-label="Dismiss revision banner"
          title="Dismiss until next observation"
        >
          Dismiss
        </button>
      </div>
    </section>
  );
}
